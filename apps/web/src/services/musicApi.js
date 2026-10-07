/**
 * Fachada de música: catálogo Deezer vía server proxy + resolve vía server.
 * No hay scoring YouTube en el cliente.
 */
import deezerApi from './deezerApi'
import lyricsApi from './lyricsApi'
import lastfmApi from './lastfmApi'
import { pickProviderMediaId } from '../utils/mediaId'
import { searchDeezerAll, fetchSimilarTracks } from './deezerApi'
import {
  resolveVideoId,
  resolveMediaCandidates,
  peekCachedMediaId,
  rememberMediaId,
  clearResolveInflight,
} from './resolveClient'

export {
  resolveVideoId,
  resolveMediaCandidates,
  peekCachedMediaId,
  rememberMediaId,
} from './resolveClient'

const albumPrepareCache = new Map()

function applyMediaId(track, mediaId) {
  rememberMediaId(track, mediaId)
  return { ...track, mediaId, videoId: mediaId }
}

function prefetchAlbumTracks(tracks, startIndex = 0, count = 2) {
  tracks.slice(startIndex + 1, startIndex + 1 + count).forEach((track, i) => {
    if (!pickProviderMediaId(track) && !track?.title) return
    setTimeout(() => prefetchPlayback(track), i * 120)
  })
}

async function enrichAlbumTracks(album, priorityTrackId) {
  const enriched = (album.tracks || []).map((t) => ({ ...t }))
  const priorityIndex = enriched.findIndex((t) => t.id === priorityTrackId)
  const idx = priorityIndex >= 0 ? priorityIndex : 0
  const priorityTrack = enriched[idx]

  if (priorityTrack && !pickProviderMediaId(priorityTrack)) {
    const mediaId = await resolveVideoId(priorityTrack)
    if (mediaId) enriched[idx] = applyMediaId(priorityTrack, mediaId)
  }

  prefetchAlbumTracks(enriched, idx)

  void Promise.allSettled(
    enriched
      .map((t, i) => ({ t, i }))
      .filter(({ t, i }) => i !== idx && !pickProviderMediaId(t))
      .slice(0, 8)
      .map(async ({ t, i }) => {
        const mediaId = await resolveVideoId(t)
        if (mediaId) enriched[i] = applyMediaId(t, mediaId)
      })
  )

  return { enriched, meta: { resolver: 'server' } }
}

export async function prepareAlbumPlayback(album, priorityTrackId = null) {
  const key = String(album.deezerId || album.id)
  const cached = albumPrepareCache.get(key)
  if (cached?.enriched) return cached
  if (cached instanceof Promise) return cached

  const priorityId = priorityTrackId || album.tracks?.[0]?.id || null

  const job = enrichAlbumTracks(album, priorityId).then((result) => {
    albumPrepareCache.set(key, result)
    return result
  })

  albumPrepareCache.set(key, job)
  return job
}

export function warmAlbumPlayback(tracks, count = 2) {
  if (!tracks?.length) return
  prefetchAlbumTracks(tracks, -1, Math.min(count, 2))
}

export function prefetchPlayback(track) {
  if (!track) return
  if (peekCachedMediaId(track)) return
  resolveVideoId(track).catch(() => {})
}

/** Prefetch en paralelo de varias pistas (cola / home). */
export function prefetchPlaybackBatch(tracks, limit = 6) {
  if (!tracks?.length) return
  tracks
    .slice(0, limit)
    .filter((t) => t && !peekCachedMediaId(t))
    .forEach((track, i) => {
      const delay = i < 3 ? 0 : (i - 2) * 40
      if (delay === 0) prefetchPlayback(track)
      else setTimeout(() => prefetchPlayback(track), delay)
    })
}

export function invalidatePlaybackCache() {
  albumPrepareCache.clear()
  clearResolveInflight()
}

export async function searchForCoverImage(query) {
  if (!query?.trim()) return null
  try {
    const { albums } = await searchDeezerAll(query, { artists: 0, albums: 1, tracks: 0 })
    return albums[0]?.cover || null
  } catch {
    return null
  }
}

async function prefetchNext(track) {
  await resolveVideoId(track).catch(() => {})
}

export async function getRecommendations(track, limit = 12) {
  if (!track) return []
  try {
    return await fetchSimilarTracks(track, limit)
  } catch {
    return []
  }
}

export async function getSimilarArtists(artistName) {
  return lastfmApi.getSimilarArtists(artistName, 6)
}

export async function getLyrics(track) {
  return lyricsApi.getLyrics(track.title, track.artist, track.duration)
}

export const parseLRC = lyricsApi.parseLRC
export const getActiveLyricLine = lyricsApi.getActiveLine

const musicApi = {
  search: async (query, limit = 15) =>
    searchDeezerAll(query, { artists: 0, albums: 0, tracks: limit }),
  resolveVideoId,
  prefetchNext,
  getRecommendations,
  getSimilarArtists,
  getLyrics,
  parseLRC: lyricsApi.parseLRC,
  getActiveLyricLine: lyricsApi.getActiveLine,
  getAlbum: (id) => deezerApi.getAlbum(id),
  searchAlbums: (q) => deezerApi.searchAlbums(q),
  getArtistTop: (artistId) => deezerApi.getArtistTop(artistId),
  getChart: () => deezerApi.getChart(20),
  getArtistInfo: (name) => lastfmApi.getArtistInfo(name),
}

export default musicApi
