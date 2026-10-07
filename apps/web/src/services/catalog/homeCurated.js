import { FEATURED_SEED_ARTISTS, PANORAMA_ARTISTS } from './constants'
import { deezerFetch } from './client'
import {
  invalidateChartCache,
  invalidatePanoramaTopCache,
  loadChartBundle,
  resolvePanoramaTopTracks,
} from './charts'
import {
  artistMatchesPanorama,
  isBlockedHomeArtist,
  isOffBrandHomeAlbum,
  isOnBrandHomeAlbum,
  normalizeArtistKey,
  ON_BRAND_HOME_HINT,
} from './homeBrand'
import {
  normalizeChartArtist,
  normalizeDeezerAlbum,
} from './normalize'

let panoramaArtistIdCache = null
let panoramaArtistsCache = null
let panoramaArtistsCacheTime = 0
let panoramaArtistsCacheVer = 0
const PANORAMA_ARTISTS_CACHE_VER = 3
const PANORAMA_LIST_TTL_MS = 10 * 60 * 1000

const PANORAMA_ALBUMS_DEFAULT_LIMIT = 24

const URBAN_ALBUM_SEARCHES = [
  `reggaeton ${new Date().getFullYear()}`,
  'urbano latino hits',
  'trap español',
  'música urbana españa',
  'latin hits',
]

let panoramaCache = null
let panoramaCacheTime = 0
const PANORAMA_ALBUMS_CACHE_VER = 9
const PANORAMA_ALBUMS_TTL_MS = 10 * 60 * 1000

export function invalidatePanoramaCache() {
  panoramaCache = null
  panoramaCacheTime = 0
  invalidatePanoramaTopCache()
  panoramaArtistsCache = null
  panoramaArtistsCacheTime = 0
  panoramaArtistsCacheVer = 0
  invalidateChartCache()
}

export function invalidatePanoramaArtistsCache() {
  panoramaArtistsCache = null
  panoramaArtistsCacheTime = 0
  panoramaArtistsCacheVer = 0
}

async function resolvePanoramaArtistId(name) {
  if (!panoramaArtistIdCache) panoramaArtistIdCache = new Map()
  if (panoramaArtistIdCache.has(name)) return panoramaArtistIdCache.get(name)

  const search = await deezerFetch(`/search/artist?q=${encodeURIComponent(name)}&limit=1`)
  const id = search.data?.[0]?.id ?? null
  panoramaArtistIdCache.set(name, id)
  return id
}

function scoreHotArtist(artist, chartRank = 999) {
  let score = 0
  if (chartRank < 999) score += Math.max(0, 55 - chartRank)
  if (artistMatchesPanorama(artist.name)) score += 30
  const fans = Number(artist.fans) || 0
  if (fans > 0) score += Math.min(25, Math.log10(fans + 10) * 5)
  return score
}

/** Artistas — chart global + panorama actual, ordenados por lo que más suena. */
async function resolvePanoramaArtists(limit = 12, preloadedChart = null) {
  if (
    panoramaArtistsCache &&
    panoramaArtistsCacheVer === PANORAMA_ARTISTS_CACHE_VER &&
    Date.now() - panoramaArtistsCacheTime < PANORAMA_LIST_TTL_MS
  ) {
    return panoramaArtistsCache.slice(0, limit)
  }

  const chart = preloadedChart || (await loadChartBundle())
  const chartArtists = chart.artists || []
  const scored = []
  const seen = new Set()

  chartArtists.forEach((artist, index) => {
    if (!artist?.deezerId || seen.has(artist.deezerId)) return
    if (isBlockedHomeArtist(artist.name)) return
    seen.add(artist.deezerId)
    scored.push({ artist, score: scoreHotArtist(artist, index) })
  })

  const seedNames = [
    ...FEATURED_SEED_ARTISTS,
    ...PANORAMA_ARTISTS.filter((n) => !FEATURED_SEED_ARTISTS.includes(n)).slice(0, 12),
  ]

  await Promise.all(
    seedNames.slice(0, 16).map(async (name) => {
      try {
        const search = await deezerFetch(
          `/search/artist?q=${encodeURIComponent(name)}&limit=1`
        )
        const item = search.data?.[0]
        if (!item?.id) return
        const artist = {
          ...normalizeChartArtist(item),
          fans: item.nb_fan || 0,
        }
        if (!artist?.deezerId) return
        if (isBlockedHomeArtist(artist.name)) return
        if (seen.has(artist.deezerId)) {
          const existing = scored.find((r) => r.artist.deezerId === artist.deezerId)
          if (existing) existing.score += 18
          return
        }
        seen.add(artist.deezerId)
        scored.push({
          artist,
          score: scoreHotArtist(artist, 999) + 15,
        })
      } catch {
        /* skip */
      }
    })
  )

  const sceneQueries = ['urbano españa', 'reggaeton', 'trap latino', 'latin urban']
  await Promise.all(
    sceneQueries.map(async (q) => {
      try {
        const res = await deezerFetch(
          `/search/artist?q=${encodeURIComponent(q)}&limit=6`
        )
        for (const item of res.data || []) {
          const artist = {
            ...normalizeChartArtist(item),
            fans: item.nb_fan || 0,
          }
          if (!artist?.deezerId || seen.has(artist.deezerId)) continue
          if (isBlockedHomeArtist(artist.name)) continue
          if (!artistMatchesPanorama(artist.name) && (artist.fans || 0) < 500_000) continue
          seen.add(artist.deezerId)
          scored.push({
            artist,
            score: scoreHotArtist(artist, 999) + 8,
          })
        }
      } catch {
        /* skip */
      }
    })
  )

  panoramaArtistsCache = scored
    .sort((a, b) => b.score - a.score)
    .map((row) => {
      const { fans, ...artist } = row.artist
      void fans
      return artist
    })
  panoramaArtistsCacheTime = Date.now()
  panoramaArtistsCacheVer = PANORAMA_ARTISTS_CACHE_VER
  return panoramaArtistsCache.slice(0, limit)
}

export async function fetchPanoramaArtists(limit = 12) {
  return resolvePanoramaArtists(limit)
}

/** Carga Home en una sola pasada — un chart compartido + álbumes en paralelo. */
export async function fetchPanoramaHomeData({
  albumLimit = 24,
  artistLimit = 12,
  trackLimit = 50,
  refresh = false,
} = {}) {
  if (refresh) invalidatePanoramaCache()

  const [chart, albums] = await Promise.all([
    loadChartBundle(),
    fetchPanoramaAlbums(albumLimit),
  ])

  const [artists, tracks] = await Promise.all([
    resolvePanoramaArtists(artistLimit, chart),
    resolvePanoramaTopTracks(trackLimit, chart),
  ])

  return { albums, artists, tracks }
}

function mergeAlbums(target, seen, albums) {
  for (const album of albums) {
    if (!album?.deezerId) continue
    const id = album.deezerId
    if (seen.has(id)) {
      const idx = target.findIndex((a) => String(a.deezerId) === String(id))
      if (idx < 0) continue
      const prev = target[idx]
      const prevUnknown = isUnknownAlbumArtist(prev)
      const nextKnown = !isUnknownAlbumArtist(album)
      if (prevUnknown && nextKnown) {
        target[idx] = {
          ...prev,
          ...album,
          artist: album.artist,
          artistDeezerId: album.artistDeezerId || prev.artistDeezerId,
        }
      } else if (!prev.artistDeezerId && album.artistDeezerId) {
        target[idx] = { ...prev, artistDeezerId: album.artistDeezerId }
      }
      continue
    }
    seen.add(id)
    target.push(album)
  }
}

function isUnknownAlbumArtist(album) {
  const name = String(album?.artist || '').trim()
  return !name || name === 'Artista desconocido'
}

/** /artist/{id}/albums no trae `artist`; rellena con /album/{id}. */
async function enrichAlbumsMissingArtist(albums, concurrency = 6) {
  if (!albums?.length) return []
  const list = albums.slice()
  const missingIdx = []
  list.forEach((album, index) => {
    if (isUnknownAlbumArtist(album) && album.deezerId) missingIdx.push(index)
  })
  if (!missingIdx.length) return list

  let cursor = 0
  const worker = async () => {
    while (cursor < missingIdx.length) {
      const slot = cursor
      cursor += 1
      const index = missingIdx[slot]
      const album = list[index]
      if (!album?.deezerId) continue
      try {
        const data = await deezerFetch(`/album/${album.deezerId}`)
        const name = data?.artist?.name
        if (!name) continue
        list[index] = {
          ...album,
          artist: name,
          artistDeezerId: data.artist?.id ?? album.artistDeezerId,
          releaseDate: data.release_date || album.releaseDate,
          trackCount: data.nb_tracks || album.trackCount,
          fans: Number.isFinite(Number(data.fans)) ? Number(data.fans) : album.fans,
        }
      } catch {
        /* keep */
      }
    }
  }

  const workers = Math.min(concurrency, missingIdx.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return list.filter((album) => !isUnknownAlbumArtist(album))
}

function albumAgeDays(album) {
  if (!album?.releaseDate) return 9999
  const ts = new Date(album.releaseDate).getTime()
  if (!Number.isFinite(ts)) return 9999
  return Math.max(0, (Date.now() - ts) / 86_400_000)
}

/** Prioriza lo reciente + chart + artistas del panorama (urbano/latino). */
function scorePanoramaAlbum(album, chartRank = 999) {
  const age = albumAgeDays(album)
  let score = 0
  if (age <= 21) score += 110
  else if (age <= 60) score += 85
  else if (age <= 120) score += 60
  else if (age <= 240) score += 35
  else if (age <= 400) score += 18
  else if (age <= 730) score += 6

  if (chartRank < 999) score += Math.max(0, 45 - chartRank)
  if (artistMatchesPanorama(album.artist)) score += 48
  else if (ON_BRAND_HOME_HINT.test(`${album.title || ''} ${album.artist || ''}`)) score += 22
  if (album.recordType === 'album' || album.recordType === 'ep') score += 4
  if (isOffBrandHomeAlbum(album)) score -= 200
  return score
}

/** Álbumes del chart global (todos; el score filtra después). */
async function fetchChartHotAlbums(limit = 30) {
  try {
    const { albumsRaw } = await loadChartBundle()
    return (albumsRaw || [])
      .map(normalizeDeezerAlbum)
      .filter(Boolean)
      .slice(0, limit)
      .map((album, index) => ({ album, chartRank: index }))
  } catch {
    return []
  }
}

/** Lanzamientos editoriales recientes de Deezer. */
async function fetchEditorialReleases(limit = 24) {
  try {
    const res = await deezerFetch(`/editorial/0/releases?limit=${limit}`)
    return (res.data || []).map(normalizeDeezerAlbum).filter(Boolean)
  } catch {
    return []
  }
}

/** /artist/{id}/albums no trae `artist`; rellena nombre/id conocidos. */
function attachAlbumArtist(album, artistId, artistName) {
  if (!album) return null
  const unknown = isUnknownAlbumArtist(album)
  return {
    ...album,
    artist: unknown && artistName ? artistName : album.artist,
    artistDeezerId: album.artistDeezerId || artistId || null,
  }
}

/** Últimos álbumes/EPs de una lista de artistas (por id). */
async function fetchNewestAlbumsFromArtistIds(artistIds, perArtist = 2, artistNamesById = null) {
  const out = []
  const names =
    artistNamesById instanceof Map
      ? artistNamesById
      : new Map(
          Object.entries(artistNamesById || {}).map(([id, name]) => [String(id), name])
        )

  await Promise.all(
    artistIds.filter(Boolean).slice(0, 16).map(async (artistId) => {
      try {
        const id = String(artistId)
        const data = await deezerFetch(`/artist/${artistId}/albums?limit=10`)
        const knownName = names.get(id) || ''
        const albums = (data.data || [])
          .map((raw) => attachAlbumArtist(normalizeDeezerAlbum(raw), artistId, knownName))
          .filter(Boolean)
          .filter((a) => a.recordType !== 'single')
          .sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0))
        out.push(...albums.slice(0, perArtist))
      } catch {
        /* skip */
      }
    })
  )
  return out
}

async function fetchSeedArtistNewestAlbums() {
  const pairs = await Promise.all(
    FEATURED_SEED_ARTISTS.map(async (name) => {
      const id = await resolvePanoramaArtistId(name)
      return id ? { id, name } : null
    })
  )
  const valid = pairs.filter(Boolean)
  const namesById = new Map(valid.map((p) => [String(p.id), p.name]))
  return fetchNewestAlbumsFromArtistIds(
    valid.map((p) => p.id),
    1,
    namesById
  )
}

async function fetchSearchedUrbanAlbums(perQuery = 6) {
  const out = []
  const seen = new Set()

  await Promise.all(
    URBAN_ALBUM_SEARCHES.map(async (q) => {
      try {
        const res = await deezerFetch(
          `/search/album?q=${encodeURIComponent(q)}&limit=${perQuery}`
        )
        for (const raw of res.data || []) {
          const album = normalizeDeezerAlbum(raw)
          if (!album || seen.has(album.deezerId)) continue
          // Solo comercial / panorama — nada de hip-hop USA genérico por ser "reciente"
          if (!isOnBrandHomeAlbum(album)) continue
          seen.add(album.deezerId)
          out.push(album)
        }
      } catch {
        /* skip query */
      }
    })
  )

  return out
}

/** Novedades — lo más pegado ahora en la escena urbano/latina. */
export async function fetchPanoramaAlbums(limit = PANORAMA_ALBUMS_DEFAULT_LIMIT) {
  if (
    panoramaCache &&
    panoramaCache._ver === PANORAMA_ALBUMS_CACHE_VER &&
    Date.now() - panoramaCacheTime < PANORAMA_ALBUMS_TTL_MS
  ) {
    return panoramaCache.slice(0, limit)
  }

  const seen = new Set()
  const pool = []
  const chartRankById = new Map()

  const [chartHot, editorial, seedNewest, searchedAlbums, chartBundle] = await Promise.all([
    fetchChartHotAlbums(40),
    fetchEditorialReleases(30),
    fetchSeedArtistNewestAlbums(),
    fetchSearchedUrbanAlbums(8),
    loadChartBundle(),
  ])

  for (const { album, chartRank } of chartHot) {
    chartRankById.set(String(album.deezerId), chartRank)
  }

  // Solo artistas del chart que encajan con el panorama Melodix
  const chartPanoramaArtists = (chartBundle.artists || []).filter(
    (a) => artistMatchesPanorama(a.name) && !isBlockedHomeArtist(a.name)
  )
  const chartArtistNames = new Map(
    chartPanoramaArtists
      .filter((a) => a.deezerId && a.name)
      .map((a) => [String(a.deezerId), a.name])
  )
  const chartArtistNewest = await fetchNewestAlbumsFromArtistIds(
    chartPanoramaArtists.map((a) => a.deezerId),
    2,
    chartArtistNames
  )

  const keepBrand = (album) => album && isOnBrandHomeAlbum(album)

  mergeAlbums(pool, seen, chartHot.map((row) => row.album).filter(keepBrand))
  mergeAlbums(pool, seen, editorial.filter(keepBrand))
  mergeAlbums(pool, seen, seedNewest.filter(keepBrand))
  mergeAlbums(pool, seen, chartArtistNewest.filter(keepBrand))
  mergeAlbums(pool, seen, searchedAlbums.filter(keepBrand))

  const hydrated = await enrichAlbumsMissingArtist(pool)

  const ranked = hydrated
    .map((album) => ({
      album,
      score: scorePanoramaAlbum(
        album,
        chartRankById.has(String(album.deezerId))
          ? chartRankById.get(String(album.deezerId))
          : 999
      ),
    }))
    // Estricto: solo panorama / comercial latino-ES (nada por "score alto + reciente")
    .filter((row) => isOnBrandHomeAlbum(row.album))
    .filter((row) => row.score >= 18 || albumAgeDays(row.album) <= 500)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.album.releaseDate || 0) - new Date(a.album.releaseDate || 0)
    )
    .map((row) => row.album)

  panoramaCache = Object.assign(ranked, {
    _ver: PANORAMA_ALBUMS_CACHE_VER,
    _updatedAt: Date.now(),
  })
  panoramaCacheTime = Date.now()

  return panoramaCache.slice(0, limit)
}

async function fetchAlbumsForGenres(genres = [], perGenre = 5) {
  const out = []
  const seen = new Set()
  await Promise.all(
    genres.slice(0, 3).map(async (genre) => {
      if (!genre?.trim()) return
      try {
        const res = await deezerFetch(
          `/search/album?q=${encodeURIComponent(genre)}&limit=${perGenre}`
        )
        for (const raw of res.data || []) {
          const album = normalizeDeezerAlbum(raw)
          if (!album || seen.has(album.deezerId)) continue
          if (albumAgeDays(album) > 500) continue
          seen.add(album.deezerId)
          out.push(album)
        }
      } catch {
        /* skip */
      }
    })
  )
  return out
}

/**
 * Novedades para el oyente:
 * - Sin historial → 100% comercial (chart / hits).
 * - Con historial → mezcla comercial + lanzamientos de tus artistas/estilo.
 */
export async function fetchNovedadesAlbums(
  limit = PANORAMA_ALBUMS_DEFAULT_LIMIT,
  {
    tasteArtistIds = [],
    tasteArtistNames = [],
    tasteGenres = [],
  } = {}
) {
  const commercial = (await fetchPanoramaAlbums(Math.max(limit * 2, 30))).filter(
    (a) => !isOffBrandHomeAlbum(a)
  )
  const tasteIds = [...new Set(tasteArtistIds.filter(Boolean).map(String))]
  const tasteNames = [
    ...new Set(tasteArtistNames.map(normalizeArtistKey).filter(Boolean)),
  ]

  const hasTaste = tasteIds.length > 0 || tasteNames.length > 0
  if (!hasTaste) {
    return {
      albums: commercial.slice(0, limit),
      mode: 'commercial',
      subtitle: 'Urbano, latino y lo más pegado ahora',
    }
  }

  // Fuerza de personalización: crece con lo que escuchas (0.25 → 0.9)
  const signal = tasteIds.length + tasteNames.length + Math.min(2, tasteGenres.length)
  const personalStrength = Math.min(0.9, 0.25 + signal * 0.08)

  const [personalNewest, genreAlbums] = await Promise.all([
    fetchNewestAlbumsFromArtistIds(
      tasteIds.slice(0, 10),
      2,
      tasteIds.length === tasteArtistNames.length
        ? new Map(tasteIds.map((id, i) => [String(id), tasteArtistNames[i]]))
        : null
    ),
    fetchAlbumsForGenres(tasteGenres, 6),
  ])

  const personalIds = new Set([
    ...personalNewest.map((a) => String(a.deezerId)),
    ...genreAlbums.map((a) => String(a.deezerId)),
  ])

  const matchesTaste = (album) => {
    const key = normalizeArtistKey(album.artist)
    if (!key) return false
    if (tasteNames.some((n) => key.includes(n) || n.includes(key))) return true
    return false
  }

  const seen = new Set()
  const pool = []
  mergeAlbums(pool, seen, commercial)
  mergeAlbums(
    pool,
    seen,
    personalNewest.filter((a) => !isOffBrandHomeAlbum(a))
  )
  mergeAlbums(
    pool,
    seen,
    genreAlbums.filter((a) => !isOffBrandHomeAlbum(a) && isOnBrandHomeAlbum(a))
  )

  const scored = pool.map((album, index) => {
    const chartish = commercial.findIndex(
      (c) => String(c.deezerId) === String(album.deezerId)
    )
    let score = scorePanoramaAlbum(album, chartish >= 0 ? chartish : 999)

    // Base comercial siempre cuenta
    score += 20

    if (personalIds.has(String(album.deezerId))) {
      score += 95 * personalStrength
    }
    if (matchesTaste(album)) {
      score += 70 * personalStrength
    }
    // Un poco de diversidad: no castigar del todo lo comercial puro
    if (chartish >= 0 && chartish < 8) {
      score += 25 * (1 - personalStrength)
    }

    return { album, score, index }
  })

  scored.sort((a, b) => b.score - a.score || a.index - b.index)

  // Al principio siempre 2–3 comerciales on-brand (ancla)
  const commercialLeadCount = personalStrength < 0.45 ? 3 : personalStrength < 0.7 ? 2 : 1
  const leaders = commercial.slice(0, commercialLeadCount)
  const leaderIds = new Set(leaders.map((a) => String(a.deezerId)))
  const rest = scored
    .map((r) => r.album)
    .filter((a) => !leaderIds.has(String(a.deezerId)))
    .filter((a) => !isOffBrandHomeAlbum(a))

  const candidates = [...leaders, ...rest]
    .filter((a) => !isOffBrandHomeAlbum(a))
    .slice(0, Math.max(limit * 2, limit + 6))
  const albums = (await enrichAlbumsMissingArtist(candidates)).slice(0, limit)

  const personalHits = albums.filter(
    (a) => personalIds.has(String(a.deezerId)) || matchesTaste(a)
  ).length

  const topName = tasteArtistNames.find(Boolean)
  return {
    albums,
    mode: personalHits >= 3 ? 'personalized' : 'mixed',
    subtitle:
      personalStrength >= 0.55 && topName
        ? `Urbano + para ti · estilo ${topName}`
        : personalStrength >= 0.4
          ? 'Urbano / latino según lo que escuchas'
          : 'Urbano, latino y lo más pegado ahora',
  }
}

export function getPanoramaAlbumsUpdatedAt() {
  return panoramaCache?._updatedAt || panoramaCacheTime || null
}
