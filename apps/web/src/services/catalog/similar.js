import { formatMainArtistName } from '../../utils/formatArtist'
import cacheService from '../cacheService'
import { fetchArtistTopTracks, fetchRelatedArtists } from './artist'
import { deezerFetch } from './client'
import { normalizeDeezerAlbum, normalizeDeezerTrack } from './normalize'
import { searchDeezerAll } from './search'

/**
 * Canciones similares reproducibles (Deezer).
 * Mezcla: mismo artista · álbum · artistas relacionados · Last.fm (si hay key).
 */
export async function fetchSimilarTracks(seedTrack, limit = 12) {
  if (!seedTrack?.title && !seedTrack?.artist) return []

  const cacheKey = `similar:v1:${seedTrack.deezerId || seedTrack.id || ''}:${seedTrack.title}:${seedTrack.artist}`
    .toLowerCase()
    .slice(0, 180)
  const cached = cacheService.getAny(cacheKey)
  if (cached?.length) return cached.slice(0, limit)

  const mainArtist = formatMainArtistName(seedTrack) || String(seedTrack.artist || '').trim()
  const excludeIds = new Set(
    [seedTrack.id, seedTrack.deezerId, `deezer-${seedTrack.deezerId}`]
      .filter(Boolean)
      .map(String)
  )
  const excludeKeys = new Set()
  const normKey = (t) =>
    `${String(t?.title || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '')}|${String(t?.artist || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '')}`

  excludeKeys.add(normKey(seedTrack))

  const out = []
  const pushMany = (list, weight = 0) => {
    for (const track of list || []) {
      if (!track?.id || !track?.title) continue
      const id = String(track.id)
      const dz = track.deezerId != null ? String(track.deezerId) : ''
      if (excludeIds.has(id) || (dz && excludeIds.has(dz)) || excludeIds.has(`deezer-${dz}`)) {
        continue
      }
      const key = normKey(track)
      if (!key || excludeKeys.has(key)) continue
      excludeIds.add(id)
      if (dz) excludeIds.add(dz)
      excludeKeys.add(key)
      out.push({ ...track, _similarWeight: weight + (Number(track.rank) || 0) / 1e9 })
      if (out.length >= limit * 2) break
    }
  }

  let artistId = seedTrack.artistDeezerId || seedTrack.artistId || null
  if (!artistId && mainArtist) {
    try {
      const { artists } = await searchDeezerAll(mainArtist, {
        artists: 3,
        albums: 0,
        tracks: 0,
      })
      const hit =
        artists.find(
          (a) =>
            String(a.name || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/\p{M}/gu, '') ===
            mainArtist
              .toLowerCase()
              .normalize('NFD')
              .replace(/\p{M}/gu, '')
        ) || artists[0]
      artistId = hit?.deezerId || hit?.id || null
    } catch {
      /* skip */
    }
  }

  const albumId = seedTrack.albumDeezerId || seedTrack.albumId || null

  const tasks = []

  // 1) Top del mismo artista
  if (artistId) {
    tasks.push(
      fetchArtistTopTracks(artistId, 20).then((list) => pushMany(list, 80)).catch(() => {})
    )
  }

  // 2) Otras pistas del álbum
  if (albumId) {
    tasks.push(
      (async () => {
        try {
          const data = await deezerFetch(`/album/${albumId}`)
          const album = normalizeDeezerAlbum(data)
          const tracks = (data?.tracks?.data || [])
            .map((raw) => normalizeDeezerTrack(raw, album))
            .filter(Boolean)
          pushMany(tracks, 70)
        } catch {
          /* skip */
        }
      })()
    )
  }

  // 3) Last.fm → Deezer (si hay API key) — paralelo acotado, sin N+1 serial
  tasks.push(
    (async () => {
      try {
        const lastfmApi = (await import('../lastfmApi')).default
        const { enrichLooseTracksToDeezer } = await import('../catalogEnrich')
        const similar = await lastfmApi.getSimilarTracks(
          seedTrack.title,
          mainArtist,
          Math.min(8, limit + 2)
        )
        if (!similar.length) return
        const mapped = await enrichLooseTracksToDeezer(similar.slice(0, 6), {
          concurrency: 3,
          official: true,
        })
        pushMany(
          mapped.map((t, i) => ({
            ...t,
            _lfmMatch: similar[i]?.match || 0,
          })),
          90
        )
      } catch {
        /* sin lastfm */
      }
    })()
  )

  // 4) Artistas relacionados → sus tops
  if (artistId) {
    tasks.push(
      (async () => {
        try {
          const related = await fetchRelatedArtists(artistId, 5)
          const tops = await Promise.all(
            related.slice(0, 4).map((a) =>
              fetchArtistTopTracks(a.deezerId || a.id, 4).catch(() => [])
            )
          )
          pushMany(tops.flat(), 55)
        } catch {
          /* skip */
        }
      })()
    )
  }

  // 5) Búsqueda por artista / género si aún faltan
  tasks.push(
    (async () => {
      try {
        const q = mainArtist || seedTrack.title
        const { tracks } = await searchDeezerAll(q, {
          artists: 0,
          albums: 0,
          tracks: 15,
        })
        pushMany(tracks, 40)
      } catch {
        /* skip */
      }
    })()
  )

  await Promise.all(tasks)

  const ranked = out
    .sort(
      (a, b) =>
        (b._similarWeight || 0) - (a._similarWeight || 0) ||
        (Number(b.rank) || 0) - (Number(a.rank) || 0)
    )
    .map(({ _similarWeight, _lfmMatch, ...track }) => track)
    .slice(0, limit)

  if (ranked.length) cacheService.setAll(cacheKey, ranked, 1800, 86400)
  return ranked
}
