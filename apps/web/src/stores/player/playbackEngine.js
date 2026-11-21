import { Capacitor } from '@capacitor/core'
import { iframePlayer } from '../../audio/iframePlayer'
import { streamFallbackPlayer } from '../../audio/streamFallbackPlayer'
import { peekCachedMediaId } from '../../services/musicApi'
import { useUserStore } from '../userStore'
import { pickProviderMediaId } from '../../utils/mediaId'
import {
  flushStatsTick,
  getStatsTrack,
  isStatsPlaying,
  pauseStatsTracking,
  resumeStatsTracking,
  startStatsTracking,
  stopStatsTracking,
} from './statsTracking'
import { syncMediaSessionPlaybackState } from './mediaSessionApi'

/**
 * Runtime de reproducción compartido:
 * sesión (requestId / media esperado), motor embed|stream, EQ y listeners.
 */

let playRequestId = 0
let lastProgressEmit = 0
const PROGRESS_EMIT_MS = 400

let embedWired = false
let streamWired = false
/** @type {'embed'|'stream'} */
let activeEngine = 'embed'
/** @type {string[]} */
let activeMediaCandidates = []
let activeCandidateIndex = 0
let activePlayRequestId = 0
/** mediaId que esperamos del motor actual (ignora eventos de la pista anterior). */
let expectedMediaId = null

export function getPlayRequestId() {
  return playRequestId
}

export function bumpPlayRequestId() {
  playRequestId += 1
  return playRequestId
}

export function getActivePlayRequestId() {
  return activePlayRequestId
}

export function setActivePlayRequestId(id) {
  activePlayRequestId = id
}

export function getActiveEngine() {
  return activeEngine
}

export function setActiveEngine(engine) {
  activeEngine = engine
}

export function getActiveMediaCandidates() {
  return activeMediaCandidates
}

export function setActiveMediaCandidates(list) {
  activeMediaCandidates = list
}

export function getActiveCandidateIndex() {
  return activeCandidateIndex
}

export function setActiveCandidateIndex(index) {
  activeCandidateIndex = index
}

export function setExpectedMediaId(id) {
  expectedMediaId = id ? String(id) : null
}

export function resetProgressThrottle() {
  lastProgressEmit = 0
}

export function markProgressEmitNow() {
  lastProgressEmit = performance.now()
}

function mediaMatchesExpected(meta) {
  if (expectedMediaId == null) return false
  const id = meta?.mediaId != null ? String(meta.mediaId) : ''
  if (!id) return activePlayRequestId === playRequestId
  return id === String(expectedMediaId)
}

export function invalidatePlaybackSession() {
  playRequestId += 1
  activePlayRequestId = playRequestId
  expectedMediaId = null
}

export function isEqualizerEnabled() {
  return Boolean(useUserStore.getState().settings?.equalizer?.enabled)
}

/** En Capacitor el embed de YouTube suele fallar (150/153) por origin https://localhost. */
export function preferStreamPlayback() {
  if (isEqualizerEnabled()) return true
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export function applyEqFromSettings() {
  const eq = useUserStore.getState().settings?.equalizer
  if (eq) streamFallbackPlayer.applyEqualizer(eq)
}

export function enginePause() {
  if (activeEngine === 'stream') streamFallbackPlayer.pause()
  else iframePlayer.pause()
}

export function engineResume() {
  if (activeEngine === 'stream') streamFallbackPlayer.resume()
  else iframePlayer.resume()
}

export function engineStop() {
  iframePlayer.stop()
  streamFallbackPlayer.stop()
  activeEngine = 'embed'
}

export function engineSeek(t) {
  if (activeEngine === 'stream') streamFallbackPlayer.seek(t)
  else iframePlayer.seek(t)
}

export function engineVolume(v) {
  iframePlayer.setVolume(v)
  streamFallbackPlayer.setVolume(v)
}

function emitProgress(time, get, set) {
  if (get().isScrubbing) return
  const now = performance.now()
  if (now - lastProgressEmit < PROGRESS_EMIT_MS) return
  lastProgressEmit = now
  set({ progress: time })
  flushStatsTick()
}

export async function playViaStreamFallback(mediaId, get, set, opts = {}) {
  activeEngine = 'stream'
  expectedMediaId = mediaId ? String(mediaId) : null
  iframePlayer.stop()
  applyEqFromSettings()
  if (!streamWired) {
    streamWired = true
    streamFallbackPlayer.setListeners({
      onState: (state, meta = {}) => {
        if (activePlayRequestId !== playRequestId) return
        if (!mediaMatchesExpected(meta)) return
        const track = get().currentTrack
        if (!track) return
        if (state === 'playing') {
          set({ isPlaying: true, isLoading: false, error: null, playerState: state })
          syncMediaSessionPlaybackState(true)
          if (!isStatsPlaying()) {
            if (getStatsTrack()?.id === track.id) resumeStatsTracking()
            else startStatsTracking(track)
          }
        } else if (state === 'paused') {
          set({ isPlaying: false, isLoading: false, playerState: state })
          syncMediaSessionPlaybackState(false)
          pauseStatsTracking()
        } else if (state === 'buffering' || state === 'loading') {
          set({ isLoading: true, playerState: state })
        } else if (state === 'ended') {
          set({ isPlaying: false, playerState: state })
          pauseStatsTracking()
          void get().next(true)
        } else if (state === 'error') {
          set({ isPlaying: false, isLoading: false, playerState: state })
        }
      },
      onProgress: (pos, dur, meta = {}) => {
        if (activePlayRequestId !== playRequestId) return
        if (!mediaMatchesExpected(meta)) return
        emitProgress(pos, get, set)
        if (dur > 0 && Math.abs((get().duration || 0) - dur) > 0.5) {
          set({ duration: dur })
        }
      },
      onError: () => {
        if (activePlayRequestId !== playRequestId) return
        set({
          error: 'No se pudo reproducir esta pista',
          isLoading: false,
          isPlaying: false,
          playerState: 'error',
        })
      },
    })
  }
  await streamFallbackPlayer.play(mediaId, {
    volume: get().volume,
    timeoutMs: opts.timeoutMs ?? 6500,
  })
}

export function wireEmbedListeners(get, set) {
  if (embedWired) return
  embedWired = true

  iframePlayer.setListeners({
    onState: (state, meta = {}) => {
      if (activePlayRequestId !== playRequestId) return
      if (!mediaMatchesExpected(meta)) return
      const track = get().currentTrack
      if (!track) return

      if (state === 'playing') {
        set({ isPlaying: true, isLoading: false, error: null, playerState: state })
        syncMediaSessionPlaybackState(true)
        if (!isStatsPlaying()) {
          if (getStatsTrack()?.id === track.id) resumeStatsTracking()
          else startStatsTracking(track)
        }
      } else if (state === 'paused') {
        set({ isPlaying: false, isLoading: false, playerState: state })
        syncMediaSessionPlaybackState(false)
        pauseStatsTracking()
      } else if (state === 'buffering' || state === 'loading') {
        set({ isLoading: true, playerState: state })
      } else if (state === 'ended') {
        set({ isPlaying: false, playerState: state })
        pauseStatsTracking()
        void get().next(true)
      } else if (state === 'error') {
        set({
          isPlaying: false,
          isLoading: false,
          playerState: state,
        })
        syncMediaSessionPlaybackState(false)
        stopStatsTracking()
      } else {
        set({ playerState: state })
      }
    },
    onProgress: (pos, dur, meta = {}) => {
      if (activePlayRequestId !== playRequestId) return
      if (!mediaMatchesExpected(meta)) return
      emitProgress(pos, get, set)
      if (dur > 0 && Math.abs((get().duration || 0) - dur) > 0.5) {
        set({ duration: dur })
      }
    },
    onError: (code, meta = {}) => {
      if (activePlayRequestId !== playRequestId) return
      if (!mediaMatchesExpected(meta)) return
      const embedBlocked = code === 101 || code === 150 || code === 100 || code === 153
      if (
        embedBlocked &&
        activeCandidateIndex < activeMediaCandidates.length - 1 &&
        activePlayRequestId === playRequestId
      ) {
        activeCandidateIndex += 1
        const nextId = activeMediaCandidates[activeCandidateIndex]
        const track = get().currentTrack
        if (nextId && track) {
          expectedMediaId = String(nextId)
          set({
            isLoading: true,
            error: null,
            currentTrack: { ...track, mediaId: nextId, videoId: nextId },
            playerState: 'loading',
          })
          void iframePlayer.play(nextId, { volume: get().volume })
          return
        }
      }

      const fallbackId =
        activeMediaCandidates[activeCandidateIndex] ||
        activeMediaCandidates[0] ||
        pickProviderMediaId(get().currentTrack)
      if (embedBlocked && fallbackId && activePlayRequestId === playRequestId) {
        set({ isLoading: true, error: null, playerState: 'loading' })
        void playViaStreamFallback(fallbackId, get, set).catch(() => {
          if (activePlayRequestId !== playRequestId) return
          set({
            error: 'No se pudo reproducir esta pista',
            isLoading: false,
            isPlaying: false,
            playerState: 'error',
          })
        })
        return
      }

      const hints = {
        2: 'mediaId inválido',
        5: 'Error del reproductor HTML5',
        100: 'Vídeo no disponible',
        101: 'Esta versión no permite embed — prueba otra pista',
        150: 'Esta versión no permite embed — prueba otra pista',
        153: 'Error de configuración del embed (Referer). Recarga la página.',
      }
      set({
        error: hints[code] || `No se pudo reproducir (código ${code})`,
        isLoading: false,
        isPlaying: false,
        playerState: 'error',
      })
    },
  })
}

export async function syncEqualizerToStream(get, set) {
  applyEqFromSettings()
  const eqOn = isEqualizerEnabled()
  const track = get().currentTrack
  if (!track || !eqOn) return

  const mediaId = track.mediaId || peekCachedMediaId(track)
  if (!mediaId) return
  if (activeEngine === 'stream') {
    applyEqFromSettings()
    return
  }

  const wasPlaying = get().isPlaying
  const pos = get().progress || 0
  try {
    iframePlayer.setVolume(0)
    iframePlayer.pause()
    iframePlayer.stop()
    await playViaStreamFallback(mediaId, get, set)
    if (pos > 1) engineSeek(pos)
    if (!wasPlaying) {
      enginePause()
      set({ isPlaying: false })
    }
  } catch {
    activeEngine = 'embed'
    streamFallbackPlayer.stop()
    iframePlayer.setVolume(get().volume)
  }
}
