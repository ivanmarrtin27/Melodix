import { resolveVideoId, peekCachedMediaId, rememberMediaId } from '../../services/musicApi'
import { pickProviderMediaId } from '../../utils/mediaId'

/** Precarga mediaId de las próximas pistas de la cola. */
export async function prefetchNextMetadata(get, set, count = 5) {
  const { queue, queueIndex } = get()
  const upcoming = queue.slice(queueIndex + 1, queueIndex + 1 + count)
  if (!upcoming.length) return

  await Promise.allSettled(
    upcoming.map(async (next, offset) => {
      if (pickProviderMediaId(next) || peekCachedMediaId(next)) {
        const mediaId = pickProviderMediaId(next) || peekCachedMediaId(next)
        if (!mediaId) return
        const idx = queueIndex + 1 + offset
        set((state) => {
          if (idx >= state.queue.length) return state
          if (state.queue[idx]?.id !== next.id) return state
          if (pickProviderMediaId(state.queue[idx])) return state
          const newQueue = [...state.queue]
          const newOriginal = [...state.originalQueue]
          const patch = { ...newQueue[idx], mediaId, videoId: mediaId }
          newQueue[idx] = patch
          const origIdx = newOriginal.findIndex((t) => t.id === next.id)
          if (origIdx >= 0) {
            newOriginal[origIdx] = { ...newOriginal[origIdx], mediaId, videoId: mediaId }
          }
          return { queue: newQueue, originalQueue: newOriginal }
        })
        return
      }
      try {
        const mediaId = await resolveVideoId(next)
        if (!mediaId) return
        rememberMediaId(next, mediaId)
        const idx = queueIndex + 1 + offset
        set((state) => {
          if (idx >= state.queue.length) return state
          if (state.queue[idx]?.id !== next.id) return state
          const newQueue = [...state.queue]
          const newOriginal = [...state.originalQueue]
          const patch = { ...newQueue[idx], mediaId, videoId: mediaId }
          newQueue[idx] = patch
          const origIdx = newOriginal.findIndex((t) => t.id === next.id)
          if (origIdx >= 0) {
            newOriginal[origIdx] = { ...newOriginal[origIdx], mediaId, videoId: mediaId }
          }
          return { queue: newQueue, originalQueue: newOriginal }
        })
        const cover = next.albumCover || next.thumbnail || next.cover
        if (cover && typeof Image !== 'undefined') {
          const img = new Image()
          img.src = cover
        }
      } catch {
        /* silencioso */
      }
    })
  )
}

export async function enrichPlayingTrackCredits(track, isStale, get, set) {
  try {
    const { enrichTrackWithCredits } = await import('../../services/deezerApi')
    const enriched = await enrichTrackWithCredits(track)
    if (isStale?.()) return
    if (!enriched || get().currentTrack?.id !== enriched.id) return
    const current = get().currentTrack
    set({
      currentTrack: {
        ...current,
        contributors: enriched.contributors,
        featuredArtists: enriched.featuredArtists,
        title: enriched.title || current.title,
        artist: enriched.artist || current.artist,
        artistDeezerId: enriched.artistDeezerId || current.artistDeezerId,
      },
    })
  } catch {
    /* ignore */
  }
}
