import { fetchWithRetry } from '../../utils/apiRetry'
import cacheService from '../cacheService'
import { getApiBase } from '../../config/apiBase'

/** @deprecated Prefer getApiBase() — se mantiene por compat. */
export function getDeezerBackend() {
  return getApiBase()
}

/** Snapshot legacy; prefer getDeezerApiBase() en código nuevo. */
export const DEEZER_BACKEND = getApiBase()

export function getDeezerApiBase() {
  const base = getApiBase()
  return base ? `${base}/api/catalog` : '/api/catalog'
}

/** Evita avalancha de /album/{id} en Home (Deezer responde 429). */
const MAX_INFLIGHT = 6
let inflight = 0
const waitQueue = []

function acquireSlot() {
  if (inflight < MAX_INFLIGHT) {
    inflight += 1
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    waitQueue.push(resolve)
  }).then(() => {
    inflight += 1
  })
}

function releaseSlot() {
  inflight = Math.max(0, inflight - 1)
  const next = waitQueue.shift()
  if (next) next()
}

export async function deezerFetch(path) {
  await acquireSlot()
  try {
    const res = await fetchWithRetry(
      `${getDeezerApiBase()}${path}`,
      { signal: AbortSignal.timeout(15000) },
      { retries: 5, baseDelayMs: 600 }
    )
    if (res.status === 429) {
      const cached = cacheService.get(`deezer:ok:${path}`)
      if (cached) return cached
      throw Object.assign(new Error('Catálogo saturado (429)'), { status: 429 })
    }
    if (!res.ok) throw Object.assign(new Error(`Catálogo ${res.status}`), { status: res.status })
    const data = await res.json()
    // Cuota a veces llega como 200 + error
    if (data?.error?.code === 4 || /quota|limit/i.test(String(data?.error?.message || ''))) {
      const cached = cacheService.get(`deezer:ok:${path}`)
      if (cached) return cached
      throw Object.assign(new Error('Catálogo saturado (429)'), { status: 429 })
    }
    cacheService.set(`deezer:ok:${path}`, data, 600)
    return data
  } catch (err) {
    const cached = cacheService.get(`deezer:ok:${path}`)
    if (cached) return cached
    throw err
  } finally {
    releaseSlot()
  }
}
