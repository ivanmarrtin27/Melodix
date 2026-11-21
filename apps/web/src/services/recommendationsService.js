import lastfmApi from './lastfmApi'
import cacheService from './cacheService'
import {
  searchDeezerAll,
  fetchChartTopTracks,
  fetchPanoramaTopTracks,
  fetchArtistTopTracks,
  fetchRelatedArtists,
  fetchNovedadesAlbums,
} from './deezerApi'
import { enrichLooseTracksToDeezer, mapPool } from './catalogEnrich'

const HAS_LASTFM = Boolean(import.meta.env.VITE_LASTFM_KEY)

function dedupeTracks(list) {
  const seen = new Set()
  return list.filter((t) => {
    if (!t?.title) return false
    const id = t.id || `${t.title}|${t.artist}`.toLowerCase()
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function trackKey(t) {
  return String(t?.id || `${t?.title}|${t?.artist}`.toLowerCase())
}

async function enrichWithDeezer(tracks) {
  return dedupeTracks(await enrichLooseTracksToDeezer(tracks, { concurrency: 4 }))
}

/** stats.artists es `{ [name]: secondsNumber }` */
function topArtistsFromStats(stats, limit = 5) {
  return Object.entries(stats?.artists || {})
    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
    .slice(0, limit)
    .map(([name, seconds]) => ({ name, seconds: Number(seconds) || 0 }))
}

function topGenresFromStats(stats, limit = 3) {
  return Object.entries(stats?.genres || {})
    .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
    .slice(0, limit)
    .map(([name]) => name)
}

function collectExcludeKeys({ favorites = [], recent = [] }) {
  const keys = new Set()
  for (const t of [...favorites, ...recent]) {
    if (!t) continue
    keys.add(trackKey(t))
  }
  return keys
}

/**
 * Semillas de artistas a partir de historial, follows y stats.
 * @returns {Promise<Array<{ id: string|number, name: string, weight: number }>>}
 */
async function resolveSeedArtists({
  favorites = [],
  recent = [],
  followedArtists = [],
  stats = null,
}) {
  const byId = new Map()

  const bump = (id, name, weight) => {
    if (!id && !name) return
    const key = id ? String(id) : `name:${String(name).toLowerCase()}`
    const prev = byId.get(key)
    if (prev) {
      prev.weight += weight
      if (!prev.id && id) prev.id = id
      if (name && (!prev.name || name.length < prev.name.length)) prev.name = name
      return
    }
    byId.set(key, { id: id || null, name: name || '', weight })
  }

  for (const a of followedArtists.slice(0, 8)) {
    bump(a.deezerId || a.id, a.name, 12)
  }

  for (const t of [...favorites.slice(0, 12), ...recent.slice(0, 12)]) {
    bump(t.artistDeezerId, t.artist, 6)
  }

  for (const row of topArtistsFromStats(stats, 6)) {
    bump(null, row.name, 8 + Math.min(10, Math.floor(row.seconds / 120)))
  }

  // Resolver nombres sin id vía Deezer search
  const unresolved = [...byId.values()].filter((a) => !a.id && a.name)
  await Promise.all(
    unresolved.slice(0, 6).map(async (a) => {
      try {
        const { artists } = await searchDeezerAll(a.name, {
          artists: 2,
          albums: 0,
          tracks: 0,
        })
        const hit =
          artists.find((x) => x.name?.toLowerCase() === a.name.toLowerCase()) ||
          artists[0]
        if (hit?.deezerId) {
          a.id = hit.deezerId
          a.name = hit.name || a.name
        }
      } catch {
        /* skip */
      }
    })
  )

  return [...byId.values()]
    .filter((a) => a.id || a.name)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
}

function diversifyByArtist(tracks, limit = 12, maxPerArtist = 2) {
  const counts = new Map()
  const out = []
  for (const t of tracks) {
    const artist = (t.artist || '').toLowerCase()
    const n = counts.get(artist) || 0
    if (n >= maxPerArtist) continue
    counts.set(artist, n + 1)
    out.push(t)
    if (out.length >= limit) break
  }
  if (out.length < limit) {
    for (const t of tracks) {
      if (out.includes(t)) continue
      out.push(t)
      if (out.length >= limit) break
    }
  }
  return out
}

/**
 * Recomendaciones personalizadas: artistas escuchados + relacionados + estilo.
 */
export async function getPersonalizedHomeRecommendations({
  favorites = [],
  recent = [],
  followedArtists = [],
  stats = null,
  force = false,
} = {}) {
  const topStatNames = topArtistsFromStats(stats, 4)
    .map((a) => a.name)
    .join(',')
  const genreNames = topGenresFromStats(stats, 3).join(',')
  const followIds = followedArtists
    .slice(0, 4)
    .map((a) => a.deezerId || a.id)
    .join(',')

  const fingerprint = [
    favorites.slice(0, 4).map((t) => t.id).join(','),
    recent.slice(0, 4).map((t) => t.id).join(','),
    followIds,
    topStatNames,
    genreNames,
    stats?.todayDate || '',
    'v2',
  ].join('|')

  const cacheKey = `reco:personal:${fingerprint}`
  if (!force) {
    const cached = cacheService.getAny(cacheKey)
    if (cached) return cached
  }

  const exclude = collectExcludeKeys({ favorites, recent })
  const seedArtists = await resolveSeedArtists({
    favorites,
    recent,
    followedArtists,
    stats,
  })

  if (!seedArtists.length) {
    const chart = await fetchPanoramaTopTracks(12).catch(() => fetchChartTopTracks(12))
    const result = {
      tracks: chart,
      source: 'chart',
      subtitle: 'Tendencias del panorama para empezar',
    }
    cacheService.setAll(cacheKey, result, 1800, 7200)
    return result
  }

  const pool = []
  const jobs = []

  // Tops de tus artistas (máx 4) + 1 relacionado por los 3 top — evita cascada N×M
  for (const artist of seedArtists.slice(0, 4)) {
    if (!artist.id) continue
    jobs.push(
      fetchArtistTopTracks(artist.id, 6).then((tracks) =>
        tracks.map((t) => ({ ...t, _w: artist.weight }))
      )
    )
  }

  for (const artist of seedArtists.slice(0, 3)) {
    if (!artist.id) continue
    jobs.push(
      fetchRelatedArtists(artist.id, 3).then(async (related) => {
        const pick = related[0]
        if (!pick?.deezerId) return []
        const tracks = await fetchArtistTopTracks(pick.deezerId, 4)
        return tracks.map((t) => ({ ...t, _w: artist.weight * 0.7 }))
      })
    )
  }

  // Estilo / géneros escuchados → búsqueda Deezer
  for (const genre of topGenresFromStats(stats, 2)) {
    jobs.push(
      searchDeezerAll(`${genre}`, { artists: 0, albums: 0, tracks: 8 }).then((r) =>
        (r.tracks || []).map((t) => ({ ...t, _w: 4 }))
      )
    )
  }

  // Last.fm: similares a canciones / artistas (si hay clave) — acotado
  if (HAS_LASTFM) {
    for (const artist of seedArtists.slice(0, 2)) {
      if (!artist.name) continue
      jobs.push(
        lastfmApi.getSimilarArtists(artist.name, 2).then(async (artists) => {
          const pick = artists[0]?.name
          if (!pick) return []
          const top = await lastfmApi.getArtistTopTracks(pick, 3)
          return top.map((t) => ({
            title: t.title,
            artist: t.artist || pick,
            _w: artist.weight * 0.8,
            _needsEnrich: true,
          }))
        })
      )
    }
    for (const track of dedupeTracks([...favorites, ...recent]).slice(0, 2)) {
      jobs.push(
        lastfmApi.getSimilarTracks(track.title, track.artist, 3).then((tracks) =>
          tracks.map((t) => ({
            title: t.title,
            artist: t.artist,
            _w: 5,
            _needsEnrich: true,
          }))
        )
      )
    }
  }

  const settled = await Promise.allSettled(jobs)
  for (const r of settled) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) pool.push(...r.value)
  }

  const needEnrich = pool.filter((t) => t._needsEnrich && !t.id)
  const already = pool.filter((t) => t.id && !t._needsEnrich)
  const enriched = needEnrich.length ? await enrichWithDeezer(needEnrich) : []

  const merged = dedupeTracks([...already, ...enriched])
    .filter((t) => !exclude.has(trackKey(t)))
    .sort((a, b) => (b._w || 0) - (a._w || 0))

  let tracks = diversifyByArtist(merged, 12, 2)

  // Si faltan, completa con panorama (sin repetir)
  if (tracks.length < 8) {
    const fill = await fetchPanoramaTopTracks(12).catch(() => [])
    tracks = diversifyByArtist(
      dedupeTracks([...tracks, ...fill.filter((t) => !exclude.has(trackKey(t)))]),
      12,
      2
    )
  }

  const artistLabel = seedArtists
    .slice(0, 2)
    .map((a) => a.name)
    .filter(Boolean)
    .join(', ')

  const genreLabel = topGenresFromStats(stats, 1)[0]
  const subtitleParts = []
  if (artistLabel) subtitleParts.push(`como ${artistLabel}`)
  if (genreLabel) subtitleParts.push(genreLabel)
  if (followedArtists.length) subtitleParts.push('tus artistas seguidos')

  const result = {
    tracks: tracks.map(({ _w, _needsEnrich, ...t }) => t),
    source: HAS_LASTFM ? 'lastfm' : 'listening',
    subtitle: subtitleParts.length
      ? `Según lo que escuchas · ${subtitleParts.join(' · ')}`
      : 'Basado en tu historial y artistas que sigues',
  }

  cacheService.setAll(cacheKey, result, 1200, 5400)
  return result
}

/** Artistas similares (Last.fm → Deezer) para ficha de artista. */
export async function getSimilarArtistsForUi(artistName) {
  if (!HAS_LASTFM || !artistName?.trim()) return []

  const cacheKey = `reco:simart:${artistName.toLowerCase()}`
  const cached = cacheService.getAny(cacheKey)
  if (cached) return cached

  const similar = await lastfmApi.getSimilarArtists(artistName, 6)
  const enriched = (
    await mapPool(similar.slice(0, 6), 3, async (a) => {
      try {
        const { artists } = await searchDeezerAll(a.name, {
          artists: 2,
          albums: 0,
          tracks: 0,
        })
        const hit =
          artists.find((x) => x.name?.toLowerCase() === a.name.toLowerCase()) ||
          artists[0]
        if (hit) return { ...hit, match: a.match }
        return {
          id: `lfm-${a.name}`,
          deezerId: null,
          name: a.name,
          image: a.image,
          match: a.match,
        }
      } catch {
        return {
          id: `lfm-${a.name}`,
          name: a.name,
          image: a.image,
          match: a.match,
        }
      }
    })
  ).filter((a) => a?.name)

  cacheService.setAll(cacheKey, enriched, 3600, 86400)
  return enriched
}

export function isLastfmConfigured() {
  return HAS_LASTFM
}

/**
 * Novedades: comercial al inicio; se personaliza según historial / follows / géneros.
 */
export async function getPersonalizedNovedades({
  favorites = [],
  recent = [],
  followedArtists = [],
  stats = null,
  force = false,
  limit = 24,
} = {}) {
  const topStatNames = topArtistsFromStats(stats, 4)
    .map((a) => a.name)
    .join(',')
  const genreNames = topGenresFromStats(stats, 3).join(',')
  const followIds = followedArtists
    .slice(0, 4)
    .map((a) => a.deezerId || a.id)
    .join(',')

  const fingerprint = [
    favorites.slice(0, 4).map((t) => t.id).join(','),
    recent.slice(0, 4).map((t) => t.id).join(','),
    followIds,
    topStatNames,
    genreNames,
    'novedades-v3',
  ].join('|')

  const cacheKey = `novedades:personal:${fingerprint}`
  if (!force) {
    const cached = cacheService.getAny(cacheKey)
    if (cached) return cached
  }

  const seeds = await resolveSeedArtists({
    favorites,
    recent,
    followedArtists,
    stats,
  })

  const result = await fetchNovedadesAlbums(limit, {
    tasteArtistIds: seeds.filter((s) => s.id).map((s) => s.id),
    tasteArtistNames: seeds.filter((s) => s.id).map((s) => s.name),
    tasteGenres: topGenresFromStats(stats, 3),
  })

  cacheService.setAll(cacheKey, result, 900, 3600)
  return result
}
