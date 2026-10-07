import { create } from 'zustand'
import { Capacitor } from '@capacitor/core'
import {
  resolveMediaCandidates,
  resolveVideoId,
  peekCachedMediaId,
  rememberMediaId,
  prefetchPlaybackBatch,
} from '../services/musicApi'
import { getNextPlaybackMode } from '../utils/playbackMode'
import { iframePlayer } from '../audio/iframePlayer'
import { streamFallbackPlayer } from '../audio/streamFallbackPlayer'
import { enrichTrackCover } from '../utils/coverArt'
import { serializeRect, getMiniPlayerTargetRect, measureMorphSource } from '../utils/playerMorph'
import { lsRemove, STORAGE_KEYS } from '../utils/storage'
import {
  applyQueueContext,
  attachMediaIdToQueue,
  buildActiveQueue,
  hydrateTrackMediaId,
} from './player/queueHelpers'
import {
  setupMediaSession,
  syncMediaSessionPlaybackState,
} from './player/mediaSessionApi'
import {
  pauseStatsTracking,
  resumeStatsTracking,
  stopStatsTracking,
} from './player/statsTracking'
import {
  enrichPlayingTrackCredits,
  prefetchNextMetadata,
} from './player/resolvePrefetch'
import {
  applyEqFromSettings,
  bumpPlayRequestId,
  enginePause,
  engineResume,
  engineSeek,
  engineStop,
  engineVolume,
  getPlayRequestId,
  invalidatePlaybackSession,
  isEqualizerEnabled,
  preferStreamPlayback,
  markProgressEmitNow,
  playViaStreamFallback,
  resetProgressThrottle,
  setActiveCandidateIndex,
  setActiveEngine,
  setActiveMediaCandidates,
  setActivePlayRequestId,
  setExpectedMediaId,
  syncEqualizerToStream,
  wireEmbedListeners,
} from './player/playbackEngine'

/**
 * PlayerStore estilo Demus:
 * - Un solo embed IFrame (iframePlayer)
 * - Solo resuelve mediaId (metadatos), NUNCA descarga audio
 * - Cambio de pista = loadVideoById
 *
 * Lógica de motor/sesión/EQ → stores/player/playbackEngine.js
 * Cola / MediaSession / stats / resolve → módulos hermanos.
 */

export const usePlayerStore = create((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  originalQueue: [],
  isPlaying: false,
  isLoading: false,
  isExpanded: false,
  playerScreen: 'mini',
  morphRect: null,
  progress: 0,
  duration: 0,
  volume: 0.8,
  shuffle: false,
  repeat: 'off',
  error: null,
  isPreview: false,
  isScrubbing: false,
  playerState: 'idle',
  sleepTimerEndAt: null,
  sleepTimerMinutes: 0,
  _sleepTimerHandle: null,

  /** Arranca el embed único (llamar una vez desde AppLayout). */
  initEmbedPlayer: async () => {
    wireEmbedListeners(get, set)
    await iframePlayer.init()
  },

  startScrubbing: () => set({ isScrubbing: true }),
  endScrubbing: () => set({ isScrubbing: false }),

  playTrack: async (track, queue = null) => {
    const requestId = bumpPlayRequestId()
    const isStale = () => requestId !== getPlayRequestId()
    const safeSet = (patch) => {
      if (!isStale()) set(patch)
    }

    wireEmbedListeners(get, set)
    track = hydrateTrackMediaId(applyQueueContext(track, queue, get, set))

    setExpectedMediaId(null)
    setActiveMediaCandidates([])
    setActiveCandidateIndex(0)
    resetProgressThrottle()

    set({
      isLoading: true,
      error: null,
      currentTrack: track,
      isPreview: false,
      progress: 0,
      duration: track.duration || 0,
      isPlaying: false,
      playerState: 'loading',
    })

    void enrichPlayingTrackCredits(track, isStale, get, set)

    try {
      setActivePlayRequestId(requestId)
      streamFallbackPlayer.stop()

      const cachedId = peekCachedMediaId(track)
      applyEqFromSettings()

      const beginMedia = (mediaId) => {
        setExpectedMediaId(mediaId)
      }

      // EQ necesita stream (Web Audio). En Capacitor el embed YT suele fallar → stream primero.
      if (preferStreamPlayback()) {
        const mediaId = cachedId || (await resolveVideoId(track))
        if (isStale()) return
        if (mediaId) {
          rememberMediaId(track, mediaId)
          beginMedia(mediaId)
          setActiveMediaCandidates([mediaId])
          setActiveCandidateIndex(0)

          const playbackTrack = { ...track, mediaId, videoId: mediaId }
          safeSet({ currentTrack: playbackTrack, duration: track.duration || 0, error: null })

          const { queue: q, originalQueue: oq } = get()
          set({
            queue: attachMediaIdToQueue(q, track.id, mediaId),
            originalQueue: attachMediaIdToQueue(oq, track.id, mediaId),
          })
          setupMediaSession(playbackTrack, { getState: get })

          try {
            await playViaStreamFallback(mediaId, get, set, {
              timeoutMs: Capacitor.isNativePlatform() ? 20000 : 12000,
            })
            if (isStale()) return
            void enrichTrackCover(playbackTrack).then((enriched) => {
              if (isStale()) return
              if (get().currentTrack?.id !== enriched.id) return
              set({ currentTrack: enriched })
              setupMediaSession(enriched, { getState: get })
            })
            void prefetchNextMetadata(get, set, 5)
            return
          } catch {
            streamFallbackPlayer.stop()
            // En nativo el embed YT casi nunca funciona (origin localhost) → error claro
            if (Capacitor.isNativePlatform()) {
              safeSet({
                error: 'No se pudo reproducir esta pista (stream)',
                isLoading: false,
                isPlaying: false,
                playerState: 'error',
              })
              return
            }
            setActiveEngine('embed')
          }
        }
      }

      setActiveEngine('embed')
      const ready = iframePlayer.isReady()

      // Ruta instantánea: mediaId en caché + embed ya listo
      if (cachedId && ready) {
        rememberMediaId(track, cachedId)
        beginMedia(cachedId)
        setActiveMediaCandidates([cachedId])
        setActiveCandidateIndex(0)

        const playbackTrack = { ...track, mediaId: cachedId, videoId: cachedId }
        void iframePlayer.play(cachedId, { volume: get().volume })
        safeSet({ currentTrack: playbackTrack, duration: track.duration || 0, error: null })

        const { queue: q, originalQueue: oq } = get()
        set({
          queue: attachMediaIdToQueue(q, track.id, cachedId),
          originalQueue: attachMediaIdToQueue(oq, track.id, cachedId),
        })
        setupMediaSession(playbackTrack, { getState: get })

        void enrichTrackCover(playbackTrack).then((enriched) => {
          if (isStale()) return
          if (get().currentTrack?.id !== enriched.id) return
          set({ currentTrack: enriched })
          setupMediaSession(enriched, { getState: get })
        })
        void prefetchNextMetadata(get, set, 5)
        void resolveMediaCandidates(playbackTrack).then((list) => {
          if (requestId !== getPlayRequestId()) return
          if (list?.length) setActiveMediaCandidates([...new Set([cachedId, ...list])])
        })
        return
      }

      void iframePlayer.init()
      const mediaId = cachedId || (await resolveVideoId(track))
      if (isStale()) return
      if (!mediaId) throw new Error('No se encontró mediaId para esta pista')

      rememberMediaId(track, mediaId)
      if (!iframePlayer.isReady()) await iframePlayer.init()
      if (isStale()) return

      beginMedia(mediaId)
      setActiveMediaCandidates([mediaId])
      setActiveCandidateIndex(0)
      void resolveMediaCandidates(track).then((list) => {
        if (requestId !== getPlayRequestId()) return
        if (list?.length) setActiveMediaCandidates([...new Set([mediaId, ...list])])
      })

      const playbackTrack = {
        ...track,
        mediaId,
        videoId: mediaId,
      }

      void iframePlayer.play(mediaId, { volume: get().volume })
      safeSet({
        currentTrack: playbackTrack,
        duration: track.duration || 0,
        error: null,
      })

      void enrichTrackCover(playbackTrack).then((enriched) => {
        if (isStale()) return
        if (get().currentTrack?.id !== enriched.id) return
        set({ currentTrack: enriched })
        setupMediaSession(enriched, { getState: get })
      })

      const { queue: q, originalQueue: oq } = get()
      set({
        queue: attachMediaIdToQueue(q, track.id, mediaId),
        originalQueue: attachMediaIdToQueue(oq, track.id, mediaId),
      })

      setupMediaSession(playbackTrack, { getState: get })
      void prefetchNextMetadata(get, set, 5)
    } catch (err) {
      if (isStale()) return
      if (!track._playbackRetried) {
        return get().playTrack({ ...track, _playbackRetried: true }, queue)
      }
      safeSet({
        error: err.message || 'No se pudo reproducir',
        isLoading: false,
        isPlaying: false,
        playerState: 'error',
      })
      syncMediaSessionPlaybackState(false)
    }
  },

  playQueue: (tracks, startIndex = 0) => {
    if (!tracks.length) return
    const hydrated = tracks.map(hydrateTrackMediaId)
    prefetchPlaybackBatch(hydrated.slice(startIndex), 6)
    void get().playTrack(hydrated[startIndex], hydrated)
  },

  addTrackToQueue: (track) => {
    if (!track) return
    const hydrated = hydrateTrackMediaId(track)
    const { queue, originalQueue } = get()
    if (queue.some((t) => t.id === hydrated.id)) return
    set({
      queue: [...queue, hydrated],
      originalQueue: [...originalQueue, hydrated],
    })
    prefetchPlaybackBatch([hydrated], 1)
  },

  togglePlay: () => {
    const { isLoading, isPlaying, currentTrack } = get()

    if (isLoading && !isPlaying) {
      engineStop()
      invalidatePlaybackSession()
      set({ isLoading: false, isPlaying: false, playerState: 'idle' })
      return
    }

    if (isPlaying) {
      enginePause()
      pauseStatsTracking()
      set({ isPlaying: false })
      syncMediaSessionPlaybackState(false)
      return
    }

    if (currentTrack) {
      engineResume()
      resumeStatsTracking()
      set({ isPlaying: true })
      syncMediaSessionPlaybackState(true)
    }
  },

  seek: (time) => {
    const { duration } = get()
    const max = duration > 0 ? duration : time
    const t = Math.max(0, Math.min(time, max))
    engineSeek(t)
    set({ progress: t })
    markProgressEmitNow()
  },

  setVolume: (vol) => {
    const v = Math.max(0, Math.min(1, vol))
    engineVolume(v)
    set({ volume: v })
  },

  next: async (auto = false) => {
    const isAutoAdvance = auto === true
    const { queue, queueIndex, repeat } = get()

    if (repeat === 'one' && isAutoAdvance) {
      get().seek(0)
      engineResume()
      return
    }

    invalidatePlaybackSession()
    set({ isLoading: false, progress: 0, error: null })

    let nextIndex = queueIndex + 1
    if (nextIndex >= queue.length) {
      if (repeat === 'all') nextIndex = 0
      else {
        set({ isPlaying: false, isLoading: false, playerState: 'ended' })
        syncMediaSessionPlaybackState(false)
        return
      }
    }

    const nextTrack = hydrateTrackMediaId(queue[nextIndex])
    if (!nextTrack) return

    set({ queueIndex: nextIndex, progress: 0, error: null, isPlaying: false })
    void get().playTrack(nextTrack)
  },

  previous: async () => {
    const { queue, queueIndex, progress } = get()

    if (progress > 3) {
      get().seek(0)
      return
    }

    invalidatePlaybackSession()
    set({ isLoading: false, progress: 0, error: null })

    const prevIndex = queueIndex - 1
    if (prevIndex >= 0) {
      const prevTrack = hydrateTrackMediaId(queue[prevIndex])
      if (!prevTrack) return
      set({ queueIndex: prevIndex, progress: 0, error: null, isPlaying: false })
      void get().playTrack(prevTrack)
    } else {
      get().seek(0)
    }
  },

  toggleShuffle: () => {
    get().cyclePlaybackMode()
  },

  cyclePlaybackMode: () => {
    const state = get()
    const next = getNextPlaybackMode(state)
    const baseQueue = state.originalQueue.length
      ? state.originalQueue.map((t) => ({ ...t }))
      : state.queue.map((t) => ({ ...t }))
    const { currentTrack } = state

    const { queue: targetQueue, index: newIndex } = buildActiveQueue(
      baseQueue,
      currentTrack || baseQueue[state.queueIndex] || baseQueue[0],
      next.shuffle
    )

    set({
      shuffle: next.shuffle,
      repeat: next.repeat,
      originalQueue: baseQueue,
      queue: targetQueue,
      queueIndex:
        currentTrack && newIndex >= 0
          ? newIndex
          : Math.min(state.queueIndex, Math.max(0, targetQueue.length - 1)),
    })
  },

  toggleRepeat: () => {
    get().cyclePlaybackMode()
  },

  expand: (sourceEl) => {
    const { playerScreen } = get()
    if (playerScreen !== 'mini') return

    const el =
      sourceEl ||
      (typeof document !== 'undefined'
        ? document.querySelector('[data-player-morph-source]')
        : null)
    const rect = el
      ? serializeRect(el.getBoundingClientRect())
      : measureMorphSource()

    set({
      playerScreen: 'opening',
      morphRect: rect,
      isExpanded: true,
    })
  },

  requestCollapse: () => {
    const { playerScreen } = get()
    if (playerScreen !== 'open') return

    set({
      playerScreen: 'closing',
      morphRect: serializeRect(getMiniPlayerTargetRect()),
    })
  },

  completeOpen: () => set({ playerScreen: 'open', isExpanded: true }),

  completeClose: () =>
    set({
      playerScreen: 'mini',
      morphRect: null,
      isExpanded: false,
    }),

  collapse: () => get().requestCollapse(),
  clearError: () => set({ error: null }),

  /** Aplica EQ en vivo (bandas). No fuerza cambio de motor. */
  applyEqualizerLive: () => {
    applyEqFromSettings()
  },

  /** Activa EQ: intenta stream; si falla, mantiene embed (la música no se corta). */
  syncEqualizerPlayback: async () => {
    await syncEqualizerToStream(get, set)
  },

  setSleepTimer: (minutes) => {
    const mins = Math.max(0, Math.round(Number(minutes) || 0))
    const prev = get()._sleepTimerHandle
    if (prev) clearTimeout(prev)

    if (!mins) {
      set({ _sleepTimerHandle: null, sleepTimerEndAt: null, sleepTimerMinutes: 0 })
      return
    }

    const endAt = Date.now() + mins * 60 * 1000
    const handle = setTimeout(() => {
      if (get().isPlaying) void get().togglePlay()
      set({ _sleepTimerHandle: null, sleepTimerEndAt: null, sleepTimerMinutes: 0 })
    }, mins * 60 * 1000)

    set({
      _sleepTimerHandle: handle,
      sleepTimerEndAt: endAt,
      sleepTimerMinutes: mins,
    })
  },

  stop: () => {
    engineStop()
    stopStatsTracking()
    lsRemove(STORAGE_KEYS.PLAYER_SESSION)
    set({
      isPlaying: false,
      progress: 0,
      duration: 0,
      currentTrack: null,
      isPreview: false,
      playerState: 'idle',
    })
  },
}))

export const playerStore = usePlayerStore
