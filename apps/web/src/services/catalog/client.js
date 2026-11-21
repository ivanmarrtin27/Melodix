import { fetchWithRetry } from '../../utils/apiRetry'
import cacheService from '../cacheService'
import { getApiBase } from '../../config/apiBase'

export const DEEZER_BACKEND = getApiBase()
const DEEZER_API = DEEZER_BACKEND ? `${DEEZER_BACKEND}/api/catalog` : '/api/catalog'

export function getDeezerApiBase() {
  return DEEZER_API
}

export async function deezerFetch(path) {
  try {
    const res = await fetchWithRetry(
      `${DEEZER_API}${path}`,
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
  }
}
