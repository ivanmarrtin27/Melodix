import { filterCredibleSearchArtists, filterOfficialSearchTracks, rankAlbumsByQuery, rankArtistsByQuery } from '../../utils/searchRank'
import cacheService from '../cacheService'
import { deezerFetch } from './client'
import {
  normalizeDeezerAlbum,
  normalizeDeezerArtist,
  normalizeDeezerPlaylist,
  normalizeDeezerTrack,
} from './normalize'

const searchCache = new Map()
const searchInflight = new Map()
const SEARCH_CACHE_MS = 8 * 60 * 1000

function searchCacheKey(query, limits) {
  return JSON.stringify({
    q: query.trim().toLowerCase(),
    a: limits.artists ?? 8,
    al: limits.albums ?? 10,
    t: limits.tracks ?? 15,
    p: limits.playlists ?? 10,
    r: 6,
  })
}

/** Búsqueda por secciones: artistas, álbumes, canciones y playlists (Deezer). */
export async function searchDeezerAll(
  query,
  { artists = 12, albums = 10, tracks = 6, playlists = 10 } = {}
) {
  const q = query?.trim()
  if (!q) return { artists: [], albums: [], tracks: [], playlists: [] }

  const key = searchCacheKey(q, { artists, albums, tracks, playlists })
  const cacheKey = `deezer:all:${key}`
  const persisted = cacheService.getAny(cacheKey)
  if (persisted) {
    return {
      artists: persisted.artists || [],
      albums: persisted.albums || [],
      tracks: persisted.tracks || [],
      playlists: persisted.playlists || [],
    }
  }

  const cached = searchCache.get(key)
  if (cached && Date.now() - cached.ts < SEARCH_CACHE_MS) {
    return cached.data
  }

  if (searchInflight.has(key)) {
    return searchInflight.get(key)
  }

  const job = (async () => {
    // Pedimos más de lo que mostramos para filtrar oficiales / relevancia
    const artistFetch = artists <= 0 ? 0 : Math.min(40, Math.max(artists * 3, 20))
    const albumFetch = albums <= 0 ? 0 : Math.min(30, Math.max(albums * 2, 16))
    const trackFetch = tracks <= 0 ? 0 : Math.min(40, Math.max(tracks * 2, 24))
    const playlistFetch = playlists <= 0 ? 0 : Math.min(24, Math.max(playlists * 2, 12))

    const [artistRes, albumRes, trackRes, playlistRes] = await Promise.all([
      artistFetch
        ? deezerFetch(`/search/artist?q=${encodeURIComponent(q)}&limit=${artistFetch}`)
        : Promise.resolve({ data: [] }),
      albumFetch
        ? deezerFetch(`/search/album?q=${encodeURIComponent(q)}&limit=${albumFetch}`)
        : Promise.resolve({ data: [] }),
      trackFetch
        ? deezerFetch(`/search/track?q=${encodeURIComponent(q)}&limit=${trackFetch}`)
        : Promise.resolve({ data: [] }),
      playlistFetch
        ? deezerFetch(`/search/playlist?q=${encodeURIComponent(q)}&limit=${playlistFetch}`).catch(
            () => ({ data: [] })
          )
        : Promise.resolve({ data: [] }),
    ])

    const rawTracks = (trackRes.data || [])
      .map((raw) => {
        const album = raw.album ? normalizeDeezerAlbum(raw.album) : null
        return normalizeDeezerTrack(raw, album)
      })
      .filter(Boolean)

    const tracksList = filterOfficialSearchTracks(rawTracks, q, tracks)

    const artistsFromTracks = []
    const seenTrackArtists = new Set()
    for (const raw of trackRes.data || []) {
      const artist = raw?.artist
      if (!artist?.id || !artist?.name) continue
      const id = String(artist.id)
      if (seenTrackArtists.has(id)) continue
      seenTrackArtists.add(id)
      artistsFromTracks.push({
        id,
        deezerId: artist.id,
        name: artist.name,
        fans: artist.nb_fan || 0,
        albumCount: artist.nb_album || 0,
        image: artist.picture_medium || artist.picture || '',
      })
    }

    const rawArtists = (artistRes.data || []).map(normalizeDeezerArtist).filter(Boolean)
    for (const extra of artistsFromTracks) {
      if ((extra.fans || 0) <= 0) continue
      if (rawArtists.some((a) => String(a.deezerId) === String(extra.deezerId))) continue
      rawArtists.push(extra)
    }

    const credibleArtists = filterCredibleSearchArtists(rawArtists, q, {
      fromTracks: artistsFromTracks,
    })

    const artistsList = rankArtistsByQuery(credibleArtists, q).slice(0, artists)

    const albumsList = rankAlbumsByQuery(
      (albumRes.data || []).map(normalizeDeezerAlbum).filter(Boolean),
      q
    ).slice(0, albums)

    const playlistsList = (playlistRes.data || [])
      .map(normalizeDeezerPlaylist)
      .filter(Boolean)
      .slice(0, playlists)

    const data = {
      artists: artistsList,
      albums: albumsList,
      tracks: tracksList,
      playlists: playlistsList,
    }
    searchCache.set(key, { data, ts: Date.now() })
    cacheService.setAll(cacheKey, data, 300, 1800)
    return data
  })().finally(() => {
    searchInflight.delete(key)
  })

  searchInflight.set(key, job)
  return job
}
