import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { TrackCover } from '../ui/TrackCover'
import { getRecommendations } from '../../services/musicApi'
import { formatTrackArtists } from '../../utils/formatArtist'
import { isLastfmConfigured } from '../../services/recommendationsService'
import { usePlayerStore } from '../../stores/playerStore'
import { primePlaybackIntent } from '../../utils/playIntent'
import { prefetchPlayback } from '../../services/musicApi'

export function SimilarTracksSheet({ open, onClose, track }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const playQueue = usePlayerStore((s) => s.playQueue)

  useEffect(() => {
    if (!open || !track) return
    let cancelled = false
    setLoading(true)
    setItems([])
    setError(null)

    getRecommendations(track, 16)
      .then((list) => {
        if (cancelled) return
        const clean = (list || []).filter((t) => t?.id && t.id !== track.id).slice(0, 16)
        setItems(clean)
        if (!clean.length) setError('No encontramos similares ahora. Prueba otra canción.')
      })
      .catch(() => {
        if (!cancelled) {
          setItems([])
          setError('No se pudieron cargar las recomendaciones.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, track])

  const subtitle = isLastfmConfigured()
    ? 'Basado en el artista, el álbum y Last.fm'
    : 'Basado en el artista, el álbum y relacionados'

  return (
    <Modal open={open} onClose={onClose} title="Canciones similares" subtitle={subtitle}>
      {loading ? (
        <p className="text-sm opacity-60 text-center py-8">Buscando recomendaciones…</p>
      ) : error ? (
        <p className="text-sm opacity-60 text-center py-8">{error}</p>
      ) : (
        <div className="space-y-1 max-h-[55vh] overflow-y-auto">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onPointerDown={() => {
                primePlaybackIntent()
                prefetchPlayback(item)
              }}
              onClick={() => {
                primePlaybackIntent()
                playQueue(items, index)
                onClose()
              }}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-left hover:bg-white/8 transition-colors"
            >
              <TrackCover track={item} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs opacity-50 truncate">{formatTrackArtists(item)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
