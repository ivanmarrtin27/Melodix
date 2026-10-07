import { getApiBase } from '../../config/apiBase'
import { deezerFetch } from './client'
import {
  normalizeChartArtist,
  normalizeDeezerAlbum,
  normalizeDeezerTrack,
} from './normalize'

let chartCache = null
let chartCacheTime = 0
let chartInflight = null
const CHART_CACHE_MS = 10 * 60 * 1000

let panoramaTopCache = null
let panoramaTopCacheTime = 0
let panoramaTopCacheVer = 0
const PANORAMA_TOP_CACHE_VER = 6
/** El Top 50 comercial se refresca en servidor 1×/semana; en cliente cacheamos 6h. */
const TOP50_CLIENT_TTL_MS = 6 * 60 * 60 * 1000

let panoramaTopMeta = { source: 'spain', weekLabel: '' }

export function getPanoramaTopSource() {
  return panoramaTopMeta.source || 'spain'
}

export function getPanoramaTopWeekLabel() {
  return panoramaTopMeta.weekLabel || ''
}

export function invalidateChartCache() {
  chartCache = null
  chartCacheTime = 0
  chartInflight = null
}

export function invalidatePanoramaTopCache() {
  panoramaTopCache = null
  panoramaTopCacheTime = 0
  panoramaTopCacheVer = 0
  panoramaTopMeta = { source: 'spain', weekLabel: '' }
}

export async function loadChartBundle() {
  if (chartCache && Date.now() - chartCacheTime < CHART_CACHE_MS) {
    return chartCache
  }

  if (!chartInflight) {
    chartInflight = (async () => {
      const [tracksRes, artistsRes, albumsRes] = await Promise.all([
        deezerFetch('/chart/0/tracks?limit=40'),
        deezerFetch('/chart/0/artists?limit=30'),
        deezerFetch('/chart/0/albums?limit=50'),
      ])

      const tracks = (tracksRes.data || []).map((t) => {
        const album = t.album ? normalizeDeezerAlbum(t.album) : null
        return normalizeDeezerTrack(t, album)
      })

      const artists = (artistsRes.data || [])
        .map(normalizeChartArtist)
        .filter(Boolean)

      chartCache = { tracks, artists, albumsRaw: albumsRes.data || [] }
      chartCacheTime = Date.now()
      return chartCache
    })().finally(() => {
      chartInflight = null
    })
  }

  return chartInflight
}

/** Top global Deezer (tendencias actuales). */
export async function fetchChartTopTracks(limit = 10) {
  const { tracks } = await loadChartBundle()
  return tracks.slice(0, limit)
}

/** Artistas del chart global con foto de perfil real. */
export async function fetchChartTopArtists(limit = 12) {
  const { artists } = await loadChartBundle()
  return artists.slice(0, limit)
}

function chartsApiPath(path) {
  // Misma regla que resolve/catalog: relativo → proxy Vite; absoluto solo si VITE_API_URL.
  const base = getApiBase() || ''
  return base ? `${base}${path}` : path
}

async function fetchStreamingTop50Spain(limit = 50) {
  const url = chartsApiPath(`/api/charts/top50-es?limit=${limit}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`charts ${res.status}`)
  const data = await res.json()
  const tracks = Array.isArray(data?.tracks) ? data.tracks : []
  if (tracks.length < 10) throw new Error('charts vacíos')
  const rawSource = String(data?.source || 'spain')
  return {
    tracks: tracks.slice(0, limit),
    source: rawSource.includes('spotify') ? 'spotify' : rawSource,
    weekLabel: data?.weekLabel || '',
    week: data?.week || '',
  }
}

/** Top canciones — Top 50 España comercial (actualización semanal en API). */
export async function resolvePanoramaTopTracks(limit = 50, _preloadedChart = null) {
  if (
    panoramaTopCache &&
    panoramaTopCacheVer === PANORAMA_TOP_CACHE_VER &&
    Date.now() - panoramaTopCacheTime < TOP50_CLIENT_TTL_MS
  ) {
    return panoramaTopCache.slice(0, limit)
  }

  const target = Math.max(limit, 50)

  try {
    const streaming = await fetchStreamingTop50Spain(target)
    panoramaTopCache = streaming.tracks
    panoramaTopCacheTime = Date.now()
    panoramaTopCacheVer = PANORAMA_TOP_CACHE_VER
    panoramaTopMeta = {
      source: streaming.source,
      weekLabel: streaming.weekLabel,
      week: streaming.week,
    }
    return panoramaTopCache.slice(0, limit)
  } catch {
    /* fallback mínimo: chart global Deezer */
  }

  const chart = _preloadedChart || (await loadChartBundle())
  panoramaTopCache = (chart.tracks || []).slice(0, target)
  panoramaTopCacheTime = Date.now()
  panoramaTopCacheVer = PANORAMA_TOP_CACHE_VER
  panoramaTopMeta = { source: 'spain', weekLabel: '' }
  return panoramaTopCache.slice(0, limit)
}

export async function fetchPanoramaTopTracks(limit = 50) {
  return resolvePanoramaTopTracks(limit)
}

/** Top 50 España. */
export async function fetchSpainTopTracks(limit = 50) {
  return resolvePanoramaTopTracks(limit)
}
