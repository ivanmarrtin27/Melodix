import { useEffect, useRef, useState } from 'react'
import {
  EllipsisVertical,
  ListPlus,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { useLibraryStore } from '../../stores/libraryStore'

export function TrackActionsMenu({
  track,
  onVolumeToggle,
  showVolume,
  volume,
  onVolumeChange,
  iconClassName = '',
}) {
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)
  const addTrackToQueue = usePlayerStore((s) => s.addTrackToQueue)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const shareTrack = async () => {
    setOpen(false)
    const text = `${track.title} — ${track.artist}`
    const url = track.thumbnail || window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text, url })
      } else {
        await navigator.clipboard.writeText(text)
      }
    } catch {
      /* cancelado */
    }
  }

  const items = [
    {
      id: 'queue',
      label: 'Añadir a la cola',
      icon: ListPlus,
      onClick: () => {
        addTrackToQueue(track)
        setOpen(false)
      },
    },
    {
      id: 'share',
      label: 'Compartir',
      icon: Share2,
      onClick: shareTrack,
    },
  ]

  if (onVolumeToggle) {
    items.push({
      id: 'volume',
      label: showVolume ? 'Ocultar volumen' : 'Volumen',
      icon: volume === 0 ? VolumeX : Volume2,
      onClick: () => {
        onVolumeToggle()
        setOpen(false)
      },
    })
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full h-full flex items-center justify-center"
          aria-label="Más opciones"
        >
          <EllipsisVertical size={20} className={iconClassName} />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 min-w-[210px] py-1.5 rounded-xl shadow-xl border z-50 animate-fade-in"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
          >
            {items.map(({ id, label, icon: Icon, onClick }) => (
              <button
                key={id}
                type="button"
                onClick={onClick}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors duration-200"
              >
                <Icon size={18} className="opacity-70 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showVolume && onVolumeChange && (
        <div
          className="fixed bottom-28 right-4 p-3 rounded-xl shadow-lg z-[110] border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-28 accent-[var(--accent-color)]"
          />
        </div>
      )}
    </>
  )
}
