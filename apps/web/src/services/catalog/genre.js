import { GENRE_PLAYLIST_QUERIES } from '../../utils/helpers'
import { deezerFetch } from './client'
import {
  normalizeDeezerAlbum,
  normalizeDeezerArtist,
  normalizeDeezerPlaylist,
  normalizeDeezerTrack,
} from './normalize'

function scoreOfficialPlaylist(playlist, genreName = '') {
  const title = String(playlist?.title || '').toLowerCase()
  const user = String(playlist?.owner || playlist?.user || '').toLowerCase()
  let score = Number(playlist?.fans) || 0

  if (/deezer|filtr|topsify|udiscover|spotify|magic records|digster|radio swiss/.test(user)) {
    score += 80_000
  }
  if (/^deezer\b/.test(user)) score += 40_000
  if (/official|oficial|essentials|hits|top\b|chart|best of|lo mejor|playlist oficial/.test(title)) {
    score += 12_000
  }
  if (genreName && title.includes(genreName.toLowerCase())) score += 18_000
  if (playlist?.trackCount >= 25 && playlist?.trackCount <= 150) score += 3_000
  if (playlist?.trackCount > 0 && playlist?.trackCount < 8) score -= 5_000
  return score
}

export { scoreOfficialPlaylist }

/**
 * Catálogo por género: chart oficial Deezer + listas editoriales.
 * No es una búsqueda de texto del nombre del género.
 */
export async function fetchGenreCatalog(
  genre,
  { tracks = 40, albums = 18, playlists = 12 } = {}
) {
  const genreId = genre?.id || genre
  const deezerId = genre?.deezerId ?? null
  const name = genre?.name || String(genreId || '')
  const queries = GENRE_PLAYLIST_QUERIES[genreId] || [name]

  const empty = { tracks: [], albums: [], playlists: [], artists: [] }

  const [chartTracksRes, chartAlbumsRes, chartPlaylistsRes, artistsRes, playlistPages] =
    await Promise.all([
      deezerId
        ? deezerFetch(`/chart/${deezerId}/tracks?limit=${Math.min(50, Math.max(tracks, 30))}`).catch(
            () => ({ data: [] })
          )
        : Promise.resolve({ data: [] }),
      deezerId
        ? deezerFetch(`/chart/${deezerId}/albums?limit=${Math.min(40, Math.max(albums, 16))}`).catch(
            () => ({ data: [] })
          )
        : Promise.resolve({ data: [] }),
      deezerId
        ? deezerFetch(`/chart/${deezerId}/playlists?limit=16`).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      deezerId
        ? deezerFetch(`/genre/${deezerId}/artists?limit=24`).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      Promise.all(
        queries.slice(0, 4).map((q) =>
          deezerFetch(`/search/playlist?q=${encodeURIComponent(q)}&limit=14`).catch(() => ({
            data: [],
          }))
        )
      ),
    ])

  // Sin chart Deezer (ej. Flamenco): canciones/álbumes desde búsquedas curadas
  let fallbackTracks = []
  let fallbackAlbums = []
  if (!deezerId) {
    const q = queries[0] || name
    const [tr, al] = await Promise.all([
      deezerFetch(`/search/track?q=${encodeURIComponent(q)}&limit=${tracks}`).catch(() => ({
        data: [],
      })),
      deezerFetch(`/search/album?q=${encodeURIComponent(q)}&limit=${albums}`).catch(() => ({
        data: [],
      })),
    ])
    fallbackTracks = tr.data || []
    fallbackAlbums = al.data || []
  }

  const trackRows = (chartTracksRes.data?.length ? chartTracksRes.data : fallbackTracks) || []
  const albumRows = (chartAlbumsRes.data?.length ? chartAlbumsRes.data : fallbackAlbums) || []

  const catalogTracks = trackRows
    .map((raw) => {
      const album = raw.album ? normalizeDeezerAlbum(raw.album) : null
      return normalizeDeezerTrack(raw, album)
    })
    .filter(Boolean)
    .slice(0, tracks)

  const catalogAlbums = albumRows
    .map(normalizeDeezerAlbum)
    .filter(Boolean)
    .slice(0, albums)

  // Artistas del chart del género (más fieles que /genre/{id}/artists)
  const artistsFromTracks = []
  const seenArtists = new Set()
  for (const track of catalogTracks) {
    const key = String(track.artistDeezerId || track.artist || '')
    if (!key || seenArtists.has(key)) continue
    seenArtists.add(key)
    if (track.artistDeezerId) {
      artistsFromTracks.push({
        id: String(track.artistDeezerId),
        deezerId: track.artistDeezerId,
        name: track.artist,
        image: '',
        fans: 0,
      })
    }
  }

  const apiArtists = (artistsRes.data || [])
    .map(normalizeDeezerArtist)
    .filter((a) => a && (a.fans || 0) >= 15000)
    .slice(0, 20)

  const apiById = new Map(apiArtists.map((a) => [String(a.deezerId), a]))
  const hydratedFromTracks = artistsFromTracks.map((a) => {
    const hit = apiById.get(String(a.deezerId))
    return hit
      ? { ...a, image: hit.image || a.image, fans: hit.fans || a.fans, name: hit.name || a.name }
      : a
  })

  const artists =
    hydratedFromTracks.length >= 5
      ? hydratedFromTracks.slice(0, 18)
      : apiArtists.length
        ? apiArtists
        : hydratedFromTracks

  const playlistPool = []
  const seenPl = new Set()

  for (const raw of chartPlaylistsRes.data || []) {
    const pl = normalizeDeezerPlaylist(raw)
    if (!pl || seenPl.has(pl.id)) continue
    seenPl.add(pl.id)
    playlistPool.push({ ...pl, _chartBoost: 100_000 })
  }

  for (const page of playlistPages) {
    for (const raw of page.data || []) {
      const pl = normalizeDeezerPlaylist(raw)
      if (!pl || seenPl.has(pl.id)) continue
      seenPl.add(pl.id)
      playlistPool.push({ ...pl, _chartBoost: 0 })
    }
  }

  const catalogPlaylists = playlistPool
    .map((pl) => ({
      ...pl,
      _score: scoreOfficialPlaylist(pl, name) + (pl._chartBoost || 0),
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, playlists)
    .map(({ _score, _chartBoost, ...pl }) => {
      void _score
      void _chartBoost
      return pl
    })

  if (!catalogTracks.length && !catalogAlbums.length && !catalogPlaylists.length) {
    return empty
  }

  return {
    tracks: catalogTracks,
    albums: catalogAlbums,
    playlists: catalogPlaylists,
    artists,
  }
}

/** Pistas de una playlist Deezer (listas oficiales de género). */
export async function fetchPlaylistTracks(playlistId, limit = 40) {
  if (!playlistId) return []
  const res = await deezerFetch(
    `/playlist/${playlistId}/tracks?limit=${Math.min(100, Math.max(limit, 20))}`
  )
  return (res.data || [])
    .map((raw) => {
      const album = raw.album ? normalizeDeezerAlbum(raw.album) : null
      return normalizeDeezerTrack(raw, album)
    })
    .filter(Boolean)
    .slice(0, limit)
}
