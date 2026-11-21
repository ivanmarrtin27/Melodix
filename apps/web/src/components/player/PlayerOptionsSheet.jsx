import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Album,
  Clock,
  Disc3,
  Heart,
  ListMusic,
  ListOrdered,
  ListPlus,
  Mic2,
  Share2,
  Radio,
  Repeat,
  Repeat1,
  Shuffle,
  UserRound,
  Volume2,
} from 'lucide-react'
import { formatTrackArtists } from '../../utils/formatArtist'
import { getPlaybackMode } from '../../utils/playbackMode'
import { useLibraryStore } from '../../stores/libraryStore'
import { usePlayerStore } from '../../stores/playerStore'
import { useSheetSlideDismiss } from '../../hooks/useSheetSlideDismiss'

const SLEEP_OPTIONS = [
  { minutes: 0, label: 'Desactivado' },
  { minutes: 5, label: '5 min' },
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 h' },
]

const PLAYBACK_MODE_ICONS = {
  ordered: ListOrdered,
  shuffle: Shuffle,
  'repeat-all': Repeat,
  'repeat-one': Repeat1,
}

function OptionRow({ icon: Icon, label, hint, onClick, trailing }) {
  return (
    <button type="button" className="player-options-row" onClick={onClick}>
      <span className="player-options-row__icon">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="player-options-row__copy">
        <span className="player-options-row__label">{label}</span>
        {hint ? <span className="player-options-row__hint">{hint}</span> : null}
      </span>
      {trailing ? <span className="player-options-row__trailing">{trailing}</span> : null}
    </button>
  )
}

export function PlayerOptionsSheet({
  open,
  onClose,
  track,
  onOpenPlaylist,
  onOpenLyrics,
  onOpenSimilar,
}) {
  const navigate = useNavigate()
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const cyclePlaybackMode = usePlayerStore((s) => s.cyclePlaybackMode)
  const addTrackToQueue = usePlayerStore((s) => s.addTrackToQueue)
  const requestCollapse = usePlayerStore((s) => s.requestCollapse)
  const sleepTimerEndAt = usePlayerStore((s) => s.sleepTimerEndAt)
  const sleepTimerMinutes = usePlayerStore((s) => s.sleepTimerMinutes)
  const setSleepTimer = usePlayerStore((s) => s.setSleepTimer)
  const { toggleFavorite, isFavorite } = useLibraryStore()

  const { sheetRef, backdropRef, closing, dragging, handlers, dismiss } = useSheetSlideDismiss({
    onClose,
    enabled: open && Boolean(track),
  })

  const playbackMode = useMemo(() => getPlaybackMode({ shuffle, repeat }), [shuffle, repeat])

  const sleepLabel = useMemo(() => {
    if (!sleepTimerEndAt) return 'Desactivado'
    const left = Math.max(0, Math.ceil((sleepTimerEndAt - Date.now()) / 60000))
    return left <= 1 ? 'Menos de 1 min' : `${left} min restantes`
  }, [sleepTimerEndAt, open])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, dismiss])

  if (!open || !track) return null

  const artUrl = track.albumCover || track.thumbnail
  const fav = isFavorite(track.id)
  const albumId = track.albumDeezerId || track.albumId
  const artistId = track.artistDeezerId || track.artistId

  const shareTrack = async () => {
    const text = `${track.title} — ${formatTrackArtists(track)}`
    try {
      if (navigator.share) {
        await navigator.share({
          title: track.title,
          text,
          url: artUrl || window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(text)
      }
    } catch {
      /* cancelado */
    }
    dismiss()
  }

  const goToAlbum = () => {
    if (!albumId) return
    dismiss()
    requestCollapse()
    navigate(`/album/${albumId}`)
  }

  const goToArtist = () => {
    if (!artistId) return
    dismiss()
    requestCollapse()
    navigate(`/artist/${artistId}`)
  }

  return createPortal(
    <div
      className={`player-options-overlay${closing ? ' player-options-overlay--closing' : ''}`}
    >
      <button
        ref={backdropRef}
        type="button"
        className="player-options-overlay__backdrop"
        aria-label="Cerrar"
        onClick={dismiss}
        disabled={closing}
      />
      <div
        ref={sheetRef}
        className={`player-options-sheet${dragging ? ' player-options-sheet--dragging' : ''}${
          closing ? ' player-options-sheet--closing' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Opciones"
      >
        <div
          className={`player-options-sheet__handle-hit${
            dragging ? ' player-options-sheet__handle-hit--dragging' : ''
          }`}
          {...handlers}
          role="button"
          tabIndex={closing ? -1 : 0}
          aria-label="Desliza hacia abajo para cerrar"
          aria-disabled={closing}
          onKeyDown={(e) => {
            if (closing) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              dismiss()
            }
          }}
        >
          <div className="player-options-sheet__handle" aria-hidden />
        </div>

        <header className="player-options-sheet__hero">
          {artUrl ? (
            <img src={artUrl} alt="" className="player-options-sheet__cover" />
          ) : (
            <div
              className="player-options-sheet__cover player-options-sheet__cover--fallback"
              style={{ background: 'var(--accent-color)' }}
            >
              <Disc3 size={22} className="text-black/70" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="player-options-sheet__track-title truncate">{track.title}</p>
            <p className="player-options-sheet__track-artist truncate">
              {formatTrackArtists(track)}
            </p>
          </div>
        </header>

        <div className="player-options-sheet__body">
          <section className="player-options-section">
            <p className="player-options-section__title">Canción</p>
            <div className="player-options-card">
              <OptionRow
                icon={Heart}
                label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                onClick={() => toggleFavorite(track)}
              />
              <OptionRow
                icon={ListPlus}
                label="Añadir a playlist"
                onClick={() => {
                  dismiss()
                  onOpenPlaylist?.()
                }}
              />
              <OptionRow
                icon={ListMusic}
                label="Añadir a la cola"
                onClick={() => {
                  addTrackToQueue(track)
                  dismiss()
                }}
              />
              <OptionRow icon={Mic2} label="Ver letra" onClick={() => onOpenLyrics?.()} />
              <OptionRow
                icon={Radio}
                label="Canciones similares"
                hint="Recomendadas"
                onClick={() => {
                  dismiss()
                  onOpenSimilar?.()
                }}
              />
              {albumId ? (
                <OptionRow icon={Album} label="Ir al álbum" onClick={goToAlbum} />
              ) : null}
              {artistId ? (
                <OptionRow icon={UserRound} label="Ir al artista" onClick={goToArtist} />
              ) : null}
              <OptionRow icon={Share2} label="Compartir" onClick={shareTrack} />
            </div>
          </section>

          <section className="player-options-section">
            <p className="player-options-section__title">Reproducción</p>
            <div className="player-options-card">
              <div className="player-options-volume">
                <span className="player-options-row__icon">
                  <Volume2 size={18} />
                </span>
                <div className="player-options-volume__slider">
                  <span className="player-options-row__label">Volumen</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="player-options-volume__range"
                  />
                </div>
                <span className="player-options-row__trailing">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              <OptionRow
                icon={PLAYBACK_MODE_ICONS[playbackMode.id] || ListOrdered}
                label="Modo de reproducción"
                hint={playbackMode.label}
                onClick={cyclePlaybackMode}
              />

              <div className="player-options-segment">
                <span className="player-options-segment__label">
                  <Clock size={14} className="inline mr-1.5 opacity-70" />
                  Timer de sueño
                </span>
                <p className="player-options-segment__hint">{sleepLabel}</p>
                <div className="player-options-segment__pills player-options-segment__pills--wrap">
                  {SLEEP_OPTIONS.map(({ minutes, label }) => (
                    <button
                      key={label}
                      type="button"
                      className={`player-options-pill${
                        (minutes === 0 && !sleepTimerMinutes) ||
                        sleepTimerMinutes === minutes
                          ? ' player-options-pill--active'
                          : ''
                      }`}
                      onClick={() => setSleepTimer(minutes)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  )
}
