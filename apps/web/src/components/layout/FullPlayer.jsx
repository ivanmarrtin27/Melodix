import { Ellipsis, Heart, ListMusic, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { useLibraryStore } from '../../stores/libraryStore'
import { NowPlayingProgress } from '../player/NowPlayingProgress'
import { PlaybackControls } from '../player/PlaybackControls'
import { QueueSheet } from '../player/QueueSheet'
import { AddToPlaylistSheet } from '../player/AddToPlaylistSheet'
import { PlayerOptionsSheet } from '../player/PlayerOptionsSheet'
import { PlaybackModeButton } from '../player/PlaybackModeButton'
import { SimilarTracksSheet } from '../player/SimilarTracksSheet'
import { PlayerTrackCredits } from '../player/PlayerTrackCredits'
import { PlayerLyricsPanel } from '../player/PlayerLyricsPanel'
import { formatTrackArtists } from '../../utils/formatArtist'
import { primePlaybackIntent } from '../../utils/playIntent'

const glassBtn =
  'w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.12] backdrop-blur-xl border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.18)] transition-[background,transform] duration-200 hover:bg-white/[0.2] active:scale-[0.94]'

const actionBtn =
  'p-3 text-white/50 hover:text-white transition-colors rounded-full active:scale-95'

const MORPH_MS = 820
const MORPH_EASE = 'cubic-bezier(0.33, 1, 0.28, 1)'
const ART_RADIUS_FULL = '30px'
const ART_RADIUS_MINI = '12px'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function FullPlayerContent() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const isLoading = usePlayerStore((s) => s.isLoading)
  const playerScreen = usePlayerStore((s) => s.playerScreen)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const seek = usePlayerStore((s) => s.seek)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)

  const { toggleFavorite, isFavorite } = useLibraryStore()

  const [showQueue, setShowQueue] = useState(false)
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [lyricsMode, setLyricsMode] = useState(false)
  const [showSimilar, setShowSimilar] = useState(false)
  const [morphing, setMorphing] = useState(false)

  const artRef = useRef(null)
  const infoRef = useRef(null)
  const pendingFlipRef = useRef(null)
  const morphTimerRef = useRef(0)

  const captureFlip = useCallback((nextLyrics) => {
    pendingFlipRef.current = {
      toLyrics: nextLyrics,
      art: artRef.current?.getBoundingClientRect() ?? null,
      info: infoRef.current?.getBoundingClientRect() ?? null,
    }
  }, [])

  const setLyricsModeAnimated = useCallback(
    (next) => {
      const value = typeof next === 'function' ? next(lyricsMode) : next
      if (value === lyricsMode) return
      captureFlip(value)
      setLyricsMode(value)
    },
    [captureFlip, lyricsMode]
  )

  const toggleLyrics = useCallback(() => {
    setLyricsModeAnimated(!lyricsMode)
  }, [lyricsMode, setLyricsModeAnimated])

  // Al cambiar de pista, salir del modo letra sin morph residual
  useEffect(() => {
    pendingFlipRef.current = null
    window.clearTimeout(morphTimerRef.current)
    setMorphing(false)
    setLyricsMode(false)
    artRef.current?.getAnimations?.().forEach((a) => a.cancel())
    infoRef.current?.getAnimations?.().forEach((a) => a.cancel())
    if (artRef.current) artRef.current.style.transform = ''
    if (infoRef.current) infoRef.current.style.transform = ''
  }, [currentTrack?.id])

  useLayoutEffect(() => {
    const pending = pendingFlipRef.current
    if (!pending) return
    pendingFlipRef.current = null

    if (prefersReducedMotion()) return

    const art = artRef.current
    const info = infoRef.current
    setMorphing(true)
    window.clearTimeout(morphTimerRef.current)
    morphTimerRef.current = window.setTimeout(() => setMorphing(false), MORPH_MS + 40)

    if (pending.art && art) {
      art.getAnimations?.().forEach((a) => a.cancel())
      const last = art.getBoundingClientRect()
      const first = pending.art
      if (last.width > 0 && first.width > 0) {
        const dx = first.left - last.left
        const dy = first.top - last.top
        const sx = first.width / last.width
        const sy = first.height / last.height
        art.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
              borderRadius: pending.toLyrics ? ART_RADIUS_FULL : ART_RADIUS_MINI,
            },
            {
              transform: 'none',
              borderRadius: pending.toLyrics ? ART_RADIUS_MINI : ART_RADIUS_FULL,
            },
          ],
          { duration: MORPH_MS, easing: MORPH_EASE, fill: 'both' }
        )
      }
    }

    if (pending.info && info) {
      info.getAnimations?.().forEach((a) => a.cancel())
      const last = info.getBoundingClientRect()
      const first = pending.info
      if (last.width > 0 && first.width > 0) {
        const dx = first.left - last.left
        const dy = first.top - last.top
        // Título + botones se deslizan a la derecha del mini art (y al revés al cerrar)
        info.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px)`,
              opacity: 0.4,
            },
            {
              transform: 'none',
              opacity: 1,
            },
          ],
          { duration: MORPH_MS - 40, easing: MORPH_EASE, delay: 35, fill: 'both' }
        )
      }
    }

    return () => {
      window.clearTimeout(morphTimerRef.current)
    }
  }, [lyricsMode])

  if (!currentTrack) return null

  const fav = isFavorite(currentTrack.id)
  const artUrl = currentTrack.albumCover || currentTrack.thumbnail
  const interactive = playerScreen === 'open'
  const artists = formatTrackArtists(currentTrack)

  return (
    <>
      <div
        className={[
          'full-player relative z-10 flex flex-col flex-1 min-h-0 max-w-md mx-auto w-full safe-bottom text-white',
          lyricsMode ? 'full-player--lyrics' : '',
          morphing ? 'full-player--morphing' : '',
          interactive ? '' : 'pointer-events-none',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="full-player__stage flex-1 flex flex-col min-h-0 px-5 sm:px-6">
          <div className="full-player__main">
            <div className="full-player__header">
              <button
                ref={artRef}
                type="button"
                className="full-player__art player-morph-art"
                onClick={toggleLyrics}
                aria-label={lyricsMode ? 'Cerrar letra' : 'Ver letra'}
                aria-pressed={lyricsMode}
              >
                {artUrl ? (
                  <img
                    key={currentTrack.id}
                    src={artUrl}
                    alt=""
                    className="full-player__art-img"
                    draggable={false}
                  />
                ) : (
                  <div
                    className="full-player__art-img full-player__art-img--fallback"
                    style={{ background: 'var(--accent-color)' }}
                  >
                    <span className="full-player__art-fallback-note">♫</span>
                  </div>
                )}
              </button>

              <div ref={infoRef} className="full-player__info">
                <div className="full-player__meta min-w-0">
                  <div
                    className={`full-player__lyrics-meta min-w-0${lyricsMode ? ' is-shown' : ''}`}
                    aria-hidden={!lyricsMode}
                  >
                    <h2 className="full-player__lyrics-title truncate">{currentTrack.title}</h2>
                    <p className="full-player__lyrics-artist truncate">{artists}</p>
                  </div>
                  <div
                    className={`full-player__credits-meta${lyricsMode ? '' : ' is-shown'}`}
                    aria-hidden={lyricsMode}
                  >
                    <PlayerTrackCredits track={currentTrack} />
                  </div>
                </div>

                <div className="full-player__actions shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(currentTrack)}
                    className={`${glassBtn} ${fav ? 'text-white' : 'text-white/85'}`}
                    aria-label="Favoritos"
                  >
                    <Heart size={20} fill={fav ? 'currentColor' : 'none'} strokeWidth={1.9} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOptions(true)}
                    className={glassBtn}
                    aria-label="Más opciones"
                  >
                    <Ellipsis size={22} strokeWidth={2.2} className="text-white" />
                  </button>
                </div>
              </div>
            </div>

            <PlayerLyricsPanel track={currentTrack} active={lyricsMode} />
          </div>

          <div className="full-player__dock w-full mx-auto flex flex-col items-center">
            <NowPlayingProgress onSeek={seek} />

            <PlaybackControls
              variant="full"
              isPlaying={isPlaying}
              isLoading={isLoading}
              onPrimePlay={() => primePlaybackIntent()}
              onTogglePlay={() => togglePlay()}
              onPrevious={() => previous()}
              onNext={() => next()}
            />

            <div className="full-player__dock-actions">
              <button
                type="button"
                onClick={toggleLyrics}
                className={`${actionBtn}${lyricsMode ? ' text-white' : ''}`}
                aria-label={lyricsMode ? 'Cerrar letra' : 'Letra'}
                aria-pressed={lyricsMode}
              >
                <MessageCircle size={23} strokeWidth={1.65} />
              </button>
              <button
                type="button"
                onClick={() => setShowQueue(true)}
                className={actionBtn}
                aria-label="Cola"
              >
                <ListMusic size={23} strokeWidth={1.65} />
              </button>
              <PlaybackModeButton className={actionBtn} />
            </div>
          </div>
        </div>
      </div>

      <QueueSheet open={showQueue} onClose={() => setShowQueue(false)} />
      <AddToPlaylistSheet
        open={showPlaylistSheet}
        onClose={() => setShowPlaylistSheet(false)}
        track={currentTrack}
      />
      <PlayerOptionsSheet
        open={showOptions}
        onClose={() => setShowOptions(false)}
        track={currentTrack}
        onOpenPlaylist={() => setShowPlaylistSheet(true)}
        onOpenLyrics={() => {
          setShowOptions(false)
          setLyricsModeAnimated(true)
        }}
        onOpenSimilar={() => {
          setShowOptions(false)
          setShowSimilar(true)
        }}
      />
      <SimilarTracksSheet
        open={showSimilar}
        onClose={() => setShowSimilar(false)}
        track={currentTrack}
      />
    </>
  )
}
