export {
  COVER_SIZE,
  COVER_SIZE_LARGE,
  isYoutubeVideoThumb,
  isSquareCoverUrl,
  upscaleCoverUrl,
  pickThumbnailFromList,
  getTrackCoverUrl,
  getTrackCoverFallback,
} from '@melodix/shared/coverArt'

import {
  COVER_SIZE_LARGE,
  getTrackCoverFallback,
  getTrackCoverUrl,
  isSquareCoverUrl,
  isYoutubeVideoThumb,
  upscaleCoverUrl,
} from '@melodix/shared/coverArt'

const deezerCoverCache = new Map()

export async function fetchDeezerTrackCover(artist, title) {
  const query = `${artist || ''} ${title || ''}`.trim()
  if (!query) return null

  const key = query.toLowerCase()
  if (deezerCoverCache.has(key)) return deezerCoverCache.get(key)

  try {
    const res = await fetch(
      `/api/catalog/search/track?q=${encodeURIComponent(query)}&limit=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const album = data.data?.[0]?.album
    const cover =
      album?.cover_xl || album?.cover_big || album?.cover_medium || null
    deezerCoverCache.set(key, cover)
    return cover
  } catch {
    deezerCoverCache.set(key, null)
    return null
  }
}

export async function enrichTrackCover(track) {
  const current = getTrackCoverUrl(track, COVER_SIZE_LARGE)
  if (current && isSquareCoverUrl(current)) {
    return {
      ...track,
      thumbnail: current,
      albumCover: current,
    }
  }

  if (track.thumbnail && !isYoutubeVideoThumb(track.thumbnail)) {
    const thumb = upscaleCoverUrl(track.thumbnail, COVER_SIZE_LARGE)
    return {
      ...track,
      thumbnail: thumb,
      albumCover: track.albumCover || thumb,
    }
  }

  if (track.artist && track.title) {
    const deezer = await fetchDeezerTrackCover(track.artist, track.title)
    if (deezer) {
      return { ...track, thumbnail: deezer, albumCover: deezer }
    }
  }

  const fallback = getTrackCoverUrl(track) || getTrackCoverFallback(track)
  return fallback
    ? { ...track, thumbnail: fallback, albumCover: track.albumCover || fallback }
    : track
}

export async function enrichTrackCovers(tracks, limit = 8) {
  const slice = tracks.slice(0, limit)
  const enriched = await Promise.all(slice.map(enrichTrackCover))
  return [...enriched, ...tracks.slice(limit)]
}
