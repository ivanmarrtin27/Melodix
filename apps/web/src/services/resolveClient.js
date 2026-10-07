/**
 * Cliente thin de resolve: solo habla con el server.
 * El scoring YouTube vive en server/track_match.py — no reimplementar aquí.
 */
import cacheService from './cacheService'
import { isProviderMediaId, pickProviderMediaId } from '../utils/mediaId'
import { getApiBase } from '../config/apiBase'

const resolveInflight = new Map()
/** @type {Map<string, string>} */
const mediaIdByTrackId = new Map()

function apiPath(path) {
  const base = getApiBase()
  if (!base) return path
  return `${base}${path}`
}

function trackResolveKey(track) {
  const title = track?.title?.trim() || ''
  const artist = track?.artist?.trim() || ''
  const album = track?.album || track?.albumTitle || ''
  const duration = track?.duration > 0 ? Math.round(track.duration) : 0
  return `mediaid:v11:${title}:${artist}:${album}:${duration}`.toLowerCase()
}

export function rememberMediaId(track, mediaId) {
  if (!mediaId || !isProviderMediaId(String(mediaId))) return
  const id = String(mediaId)
  if (track?.id != null) mediaIdByTrackId.set(String(track.id), id)
  const key = trackResolveKey(track)
  if (track?.title && track?.artist) {
    cacheService.setAll(key, id, 14400, 86400)
    cacheService.setAll(
      `resolve:v11:${track.title.trim()}:${track.artist.trim()}:${track.album || track.albumTitle || ''}:${track.duration > 0 ? Math.round(track.duration) : 0}`.toLowerCase(),
      id,
      86400,
      86400
    )
  }
}

export function peekCachedMediaId(track) {
  if (!track) return null
  const existing = pickProviderMediaId(track)
  if (existing) return existing
  if (track.id != null) {
    const byId = mediaIdByTrackId.get(String(track.id))
    if (byId) return byId
  }
  if (!track.title?.trim() || !track.artist?.trim()) return null
  const cached = cacheService.getAny(trackResolveKey(track))
  return cached && isProviderMediaId(String(cached)) ? String(cached) : null
}

async function resolveViaBackend(title, artist, meta = {}, limit = 1) {
  const params = new URLSearchParams({ title, artist })
  if (meta.album) params.set('album', meta.album)
  if (meta.duration > 0) params.set('duration', String(Math.round(meta.duration)))
  params.set('limit', String(Math.max(1, Math.min(limit, 8))))
  params.set('prefer_explicit', meta.preferExplicit === false ? 'false' : 'true')

  const res = await fetch(apiPath(`/api/media/resolve?${params}`), {
    signal: AbortSignal.timeout(limit > 1 ? 16000 : 12000),
  })
  if (!res.ok) return limit > 1 ? [] : null
  const data = await res.json()

  if (limit === 1) {
    const id = data.mediaId || data.videoId || null
    return id && isProviderMediaId(String(id)) ? String(id) : null
  }

  const ids = []
  if (Array.isArray(data.candidates)) {
    for (const c of data.candidates) {
      const id = typeof c === 'string' ? c : c?.mediaId || c?.videoId
      if (id && isProviderMediaId(String(id))) ids.push(String(id))
    }
  }
  const primary = data.mediaId || data.videoId
  if (primary && isProviderMediaId(String(primary))) ids.unshift(String(primary))
  return [...new Set(ids)]
}

async function resolveMediaId(title, artist, meta = {}) {
  const album = meta.album || ''
  const duration = meta.duration > 0 ? Math.round(meta.duration) : 0
  const key = `resolve:v11:${title}:${artist}:${album}:${duration}`.toLowerCase()
  const cached = cacheService.getAny(key)
  if (cached) return cached

  try {
    const mediaId = await resolveViaBackend(title, artist, {
      album,
      duration,
      preferExplicit: meta.preferExplicit !== false,
    }, 1)
    if (mediaId) {
      cacheService.setAll(key, mediaId, 86400, 86400)
      return mediaId
    }
  } catch (err) {
    console.error('[resolveClient]', err?.message || err)
  }
  return null
}

/** Rápido: un solo mediaId (ruta crítica de play). */
export async function resolveVideoId(track) {
  const existing = peekCachedMediaId(track)
  if (existing) return existing

  const title = track?.title?.trim()
  const artist = track?.artist?.trim()
  if (!title || !artist) return null

  const duration = track?.duration > 0 ? Math.round(track.duration) : undefined
  const album = track?.album || track?.albumTitle || ''
  const key = trackResolveKey(track)

  if (resolveInflight.has(key)) return resolveInflight.get(key)

  const job = resolveMediaId(title, artist, { album, duration })
    .then((mediaId) => {
      if (mediaId) {
        rememberMediaId(track, mediaId)
        cacheService.setAll(key, mediaId, 14400, 86400)
      }
      return mediaId || null
    })
    .catch(() => null)
    .finally(() => resolveInflight.delete(key))

  resolveInflight.set(key, job)
  return job
}

/** Lista para reintentos (en segundo plano). Scoring solo en server. */
export async function resolveMediaCandidates(track) {
  const title = track?.title?.trim()
  const artist = track?.artist?.trim()
  const existing = pickProviderMediaId(track)
  if (!title || !artist) {
    return existing ? [existing] : []
  }

  const duration = track?.duration > 0 ? Math.round(track.duration) : undefined
  const album = track?.album || track?.albumTitle || ''
  const key = `mediacands:v5:${title}:${artist}:${album}:${duration || 0}`.toLowerCase()
  const cached = cacheService.getAny(key)
  if (cached?.length) return cached

  if (resolveInflight.has(key)) {
    return resolveInflight.get(key)
  }

  const job = resolveViaBackend(title, artist, { album, duration }, 3)
    .then(async (ids) => {
      let list = ids
      if (!list.length) {
        const one = await resolveMediaId(title, artist, { album, duration })
        list = one ? [one] : []
      }
      if (!list.length && existing) list = [existing]
      if (list.length) {
        cacheService.setAll(key, list, 14400, 86400)
        rememberMediaId(track, list[0])
      }
      return list
    })
    .catch(async () => {
      const one = await resolveMediaId(title, artist, { album, duration }).catch(() => null)
      return one ? [one] : existing ? [existing] : []
    })
    .finally(() => {
      resolveInflight.delete(key)
    })

  resolveInflight.set(key, job)
  return job
}

export function clearResolveInflight() {
  resolveInflight.clear()
}
