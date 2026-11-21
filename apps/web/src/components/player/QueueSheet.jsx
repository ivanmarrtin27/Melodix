import { Modal } from '../ui/Modal'
import { usePlayerStore } from '../../stores/playerStore'
import { TrackCover } from '../ui/TrackCover'
import { formatTrackArtists } from '../../utils/formatArtist'
import { formatDuration } from '../../utils/helpers'
import { primePlaybackIntent } from '../../utils/playIntent'

export function QueueSheet({ open, onClose }) {
  const queue = usePlayerStore((s) => s.queue)
  const queueIndex = usePlayerStore((s) => s.queueIndex)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const playTrack = usePlayerStore((s) => s.playTrack)

  return (
    <Modal open={open} onClose={onClose} title="Cola de reproducción">
      {queue.length === 0 ? (
        <p className="text-sm opacity-60 text-center py-6">La cola está vacía</p>
      ) : (
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {queue.map((track, i) => {
            const active = track.id === currentTrack?.id || i === queueIndex
            return (
              <button
                key={`${track.id}-${i}`}
                type="button"
                onPointerDown={() => primePlaybackIntent()}
                onClick={() => {
                  primePlaybackIntent()
                  playTrack(track, queue)
                  onClose()
                }}
                className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-colors ${
                  active ? 'bg-white/15' : 'hover:bg-white/8'
                }`}
              >
                <TrackCover track={track} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${active ? 'text-white' : ''}`}>
                    {track.title}
                  </p>
                  <p className="text-xs opacity-50 truncate">{formatTrackArtists(track)}</p>
                </div>
                <span className="text-xs opacity-40 tabular-nums shrink-0">
                  {formatDuration(track.duration)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
