import { Play, Pause, ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { ProgressBar } from '../player/ProgressBar'
import { formatTrackArtists } from '../../utils/formatArtist'
import { primePlaybackIntent } from '../../utils/playIntent'
import { TrackCover } from '../ui/TrackCover'
import { useT } from '../../i18n'

export function MiniPlayer({ dockReveal = false, underPlayer = false }) {
  const t = useT()
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const isLoading = usePlayerStore((s) => s.isLoading)
  const playerScreen = usePlayerStore((s) => s.playerScreen)
  const error = usePlayerStore((s) => s.error)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const expand = usePlayerStore((s) => s.expand)
  const seek = usePlayerStore((s) => s.seek)
  const clearError = usePlayerStore((s) => s.clearError)

  const cardRef = useRef(null)

  const showLoadingSpinner = isLoading
  const interactive = !underPlayer && playerScreen === 'mini'

  const handleExpand = useCallback(() => {
    if (playerScreen !== 'mini') return
    expand(cardRef.current)
  }, [expand, playerScreen])

  const prevTrackId = useRef(null)
  const [trackSwap, setTrackSwap] = useState(false)

  useEffect(() => {
    if (!currentTrack) {
      prevTrackId.current = null
      return
    }

    if (prevTrackId.current && prevTrackId.current !== currentTrack.id) {
      setTrackSwap(true)
      const timer = setTimeout(() => setTrackSwap(false), 380)
      prevTrackId.current = currentTrack.id
      return () => clearTimeout(timer)
    }

    prevTrackId.current = currentTrack.id
  }, [currentTrack])

  if (!currentTrack) return null

  return (
    <>
      {error && (
        <div
          className="fixed left-4 right-4 z-50 p-3 rounded-xl text-xs shadow-lg animate-fade-in max-w-md mx-auto"
          style={{
            bottom:
              'calc(var(--dock-nav-block) + var(--dock-mini-block) + var(--dock-gap) + 1rem + env(safe-area-inset-bottom, 0px))',
            background: '#ef4444',
            color: '#fff',
          }}
        >
          <div className="flex justify-between gap-2">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="font-bold">
              ✕
            </button>
          </div>
        </div>
      )}

      <div
        className={[
          'mini-player-dock',
          dockReveal && 'mini-player-dock--enter',
          underPlayer && 'mini-player-dock--under-player',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Reproduciendo ahora"
        aria-hidden={underPlayer || undefined}
      >
        <div
          ref={cardRef}
          data-player-morph-source
          className={`mini-player-card${trackSwap && interactive ? ' mini-player-card--swap' : ''}`}
        >
          <div className="mini-player-card__progress">
            <ProgressBar showTimes={false} onSeek={seek} />
          </div>

          <div
            className="mini-player-card__body"
            role="button"
            tabIndex={interactive ? 0 : -1}
            onClick={handleExpand}
            onKeyDown={(e) => {
              if (!interactive) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleExpand()
              }
            }}
            aria-label={t('player.open')}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 text-left pointer-events-none">
              <TrackCover
                key={currentTrack.id}
                track={currentTrack}
                size="mini"
                className="mini-player-card__cover"
              />
              <div className="mini-player-card__meta">
                <p className="mini-player-card__title truncate">{currentTrack.title}</p>
                <p className="mini-player-card__artist truncate">
                  {formatTrackArtists(currentTrack)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation()
                if (!interactive) return
                primePlaybackIntent()
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (!interactive) return
                togglePlay()
              }}
              disabled={showLoadingSpinner || !interactive}
              tabIndex={interactive ? 0 : -1}
              className="mini-player-card__play"
              style={{ background: 'var(--accent-color)' }}
              aria-label={
                showLoadingSpinner
                  ? t('player.loading')
                  : isPlaying
                    ? t('player.pause')
                    : t('player.play')
              }
            >
              {showLoadingSpinner ? (
                <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={15} fill="black" />
              ) : (
                <Play size={15} fill="black" className="ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (!interactive) return
                handleExpand()
              }}
              tabIndex={interactive ? 0 : -1}
              className="mini-player-card__expand"
              aria-label={t('player.open')}
            >
              <ChevronUp size={17} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
