import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'

export function PlaybackControls({
  isPlaying,
  isLoading,
  onTogglePlay,
  onPrimePlay,
  onPrevious,
  onNext,
  variant = 'default',
}) {
  const isFull = variant === 'full'
  const sideSize = isFull ? 30 : 20
  const playSize = isFull ? 38 : 22

  return (
    <div className={`playback-controls${isFull ? ' playback-controls--full' : ''}`}>
      <button
        type="button"
        onClick={onPrevious}
        className="playback-controls__side"
        aria-label="Anterior"
      >
        <SkipBack size={sideSize} strokeWidth={1.7} fill="currentColor" />
      </button>

      <button
        type="button"
        onPointerDown={onPrimePlay}
        onClick={onTogglePlay}
        disabled={isLoading}
        className={`playback-controls__play${isPlaying ? ' playback-controls__play--active' : ''}`}
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isLoading ? (
          <span className="playback-controls__spinner" aria-hidden />
        ) : isPlaying ? (
          <Pause size={playSize} strokeWidth={1.85} fill="currentColor" />
        ) : (
          <Play size={playSize} strokeWidth={1.85} fill="currentColor" className="playback-controls__play-icon" />
        )}
      </button>

      <button type="button" onClick={onNext} className="playback-controls__side" aria-label="Siguiente">
        <SkipForward size={sideSize} strokeWidth={1.7} fill="currentColor" />
      </button>
    </div>
  )
}
