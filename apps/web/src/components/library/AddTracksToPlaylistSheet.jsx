import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'
import { searchDeezerAll } from '../../services/deezerApi'
import { Modal } from '../ui/Modal'
import { RippleCard } from '../ui/RippleCard'
import { TrackCover } from '../ui/TrackCover'
import { formatDuration } from '../../utils/helpers'
import { SkeletonList } from '../ui/Skeleton'

export function AddTracksToPlaylistSheet({
  open,
  onClose,
  playlistName,
  onAddTrack,
  existingTrackIds = [],
}) {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(false)
  const [sessionAddedIds, setSessionAddedIds] = useState(() => new Set())
  const debouncedQuery = useDebounce(query, 400)

  const existingSet = useMemo(
    () => new Set(existingTrackIds.map(String)),
    [existingTrackIds]
  )

  useEffect(() => {
    if (!open) {
      setQuery('')
      setTracks([])
      setSessionAddedIds(new Set())
    }
  }, [open])

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setTracks([])
      return
    }

    let cancelled = false
    setLoading(true)
    searchDeezerAll(debouncedQuery, { artists: 0, albums: 0, tracks: 18 })
      .then((data) => {
        if (!cancelled) setTracks(data.tracks)
      })
      .catch(() => {
        if (!cancelled) setTracks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const isInPlaylist = (trackId) => {
    const id = String(trackId)
    return existingSet.has(id) || sessionAddedIds.has(id)
  }

  const handleAdd = (track) => {
    if (isInPlaylist(track.id)) return
    onAddTrack(track)
    setSessionAddedIds((prev) => {
      const next = new Set(prev)
      next.add(String(track.id))
      return next
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Añadir canciones" placement="top">
      <p className="text-sm opacity-50 mb-4">
        Busca y añade temas a «{playlistName}».
      </p>

      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
        style={{ background: 'var(--bg-primary)' }}
      >
        <Search size={18} className="opacity-40 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artista o canción..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-40"
          autoFocus
        />
      </div>

      {loading && <SkeletonList count={4} />}

      {!loading && debouncedQuery && tracks.length === 0 && (
        <p className="text-sm opacity-40 text-center py-6">Sin resultados</p>
      )}

      <div className="space-y-1 max-h-[45vh] overflow-y-auto">
        {tracks.map((track) => {
          const added = isInPlaylist(track.id)
          return (
            <RippleCard
              key={track.id}
              onClick={added ? undefined : () => handleAdd(track)}
              aria-disabled={added || undefined}
              className={`flex items-center gap-3 p-2.5 rounded-xl ${
                added
                  ? 'opacity-55 cursor-default pointer-events-none'
                  : 'hover:bg-white/5 cursor-pointer'
              }`}
            >
              <TrackCover track={track} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{track.title}</p>
                <p className="text-xs opacity-60 truncate">{track.artist}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide ${
                  added ? 'bg-white/[0.08] text-white/70' : ''
                }`}
                style={
                  added
                    ? undefined
                    : {
                        background:
                          'color-mix(in srgb, var(--accent-color) 18%, transparent)',
                        color: 'var(--accent-color)',
                      }
                }
              >
                {added ? (
                  <>
                    <Check size={12} strokeWidth={2.5} aria-hidden />
                    Añadido
                  </>
                ) : (
                  <>
                    <Plus size={12} strokeWidth={2.5} aria-hidden />
                    Añadir
                  </>
                )}
              </span>
              <span className="text-xs opacity-40 tabular-nums shrink-0 w-8 text-right">
                {formatDuration(track.duration)}
              </span>
            </RippleCard>
          )
        })}
      </div>
    </Modal>
  )
}
