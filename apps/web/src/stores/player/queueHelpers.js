import { shuffleArray } from '../../utils/helpers'
import { peekCachedMediaId } from '../../services/musicApi'

export function attachMediaIdToQueue(queue, trackId, mediaId) {
  return queue.map((t) =>
    t.id === trackId ? { ...t, mediaId, videoId: mediaId } : t
  )
}

export function mergeTrackFromQueue(track, get) {
  if (!track?.id) return track
  const idx = get().queue.findIndex((t) => t.id === track.id)
  if (idx < 0) return track
  return { ...track, ...get().queue[idx] }
}

export function buildActiveQueue(baseQueue, track, shuffle) {
  const list = baseQueue.map((t) => ({ ...t }))
  if (!list.length) return { queue: [], index: 0 }

  const idx = track?.id ? list.findIndex((t) => t.id === track.id) : 0
  const safeIdx = idx >= 0 ? idx : 0

  if (!shuffle) {
    return { queue: list, index: safeIdx }
  }

  const current = list[safeIdx]
  const rest = list.filter((t) => t.id !== current.id)
  return { queue: [current, ...shuffleArray(rest)], index: 0 }
}

export function applyQueueContext(track, queue, get, set) {
  if (queue?.length) {
    const { shuffle } = get()
    const { queue: activeQueue, index } = buildActiveQueue(queue, track, shuffle)
    set({
      queue: activeQueue,
      originalQueue: queue.map((t) => ({ ...t })),
      queueIndex: index,
    })
    return mergeTrackFromQueue(track, get)
  }

  const idx = get().queue.findIndex((t) => t.id === track.id)
  if (idx >= 0) {
    set({ queueIndex: idx })
    return mergeTrackFromQueue(track, get)
  }

  if (get().queue.length <= 1) {
    set({ queue: [track], originalQueue: [track], queueIndex: 0 })
  }
  return track
}

export function hydrateTrackMediaId(track) {
  const mediaId = peekCachedMediaId(track)
  if (!mediaId) return track
  return { ...track, mediaId, videoId: mediaId }
}
