import { apiUrl } from '../config/apiBase'

export function apiHealthUrl() {
  return apiUrl('/api/health')
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isTransientApiError(err) {
  if (!err) return false

  const code = err.code
  if (
    code === 'ECONNREFUSED' ||
    code === 'ERR_NETWORK' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNABORTED' ||
    code === 'ERR_CONNECTION_REFUSED'
  ) {
    return true
  }

  const status = err.response?.status ?? err.status
  if (status === 429 || status === 502 || status === 503 || status === 504) return true

  const msg = String(err.message || err).toLowerCase()
  return (
    msg.includes('network error') ||
    msg.includes('failed to fetch') ||
    msg.includes('econnrefused') ||
    msg.includes('proxy error') ||
    msg.includes('socket hang up') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('429') ||
    msg.includes('too many')
  )
}

/** AbortController + setTimeout (compatible con WebViews sin AbortSignal.timeout). */
export function withTimeoutSignal(ms) {
  const controller = new AbortController()
  const id = window.setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(id),
  }
}

export async function pingApiHealth() {
  const { signal, clear } = withTimeoutSignal(4000)
  try {
    const res = await fetch(apiHealthUrl(), {
      signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const data = await res.json()
    return data.ok === true || data.status === 'ok'
  } catch {
    return false
  } finally {
    clear()
  }
}

let waitInflight = null

/** Espera a que el API Python responda (útil al arrancar dev:all). */
export function waitForApiReady({ maxWaitMs = 15000, intervalMs = 450 } = {}) {
  if (waitInflight) return waitInflight

  waitInflight = (async () => {
    const deadline = Date.now() + maxWaitMs
    while (Date.now() < deadline) {
      if (await pingApiHealth()) return true
      await sleep(intervalMs)
    }
    return false
  })().finally(() => {
    waitInflight = null
  })

  return waitInflight
}

export async function fetchWithRetry(url, init = {}, { retries = 4, baseDelayMs = 400 } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, init)
      if (
        res.status === 429 ||
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504
      ) {
        if (attempt >= retries) return res
        const retryAfter = Number(res.headers.get('retry-after'))
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 8000)
          : baseDelayMs * Math.pow(2, attempt)
        await sleep(waitMs)
        continue
      }
      return res
    } catch (err) {
      lastError = err
      if (!isTransientApiError(err) || attempt >= retries) throw err
      await sleep(baseDelayMs * (attempt + 1))
    }
  }
  throw lastError
}

export async function axiosWithRetry(
  requestFn,
  { retries = 4, baseDelayMs = 400, waitForReady = false } = {}
) {
  if (waitForReady) {
    await waitForApiReady({ maxWaitMs: 10000 })
  }

  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await requestFn()
    } catch (err) {
      lastError = err
      if (!isTransientApiError(err) || attempt >= retries) throw err
      await sleep(baseDelayMs * (attempt + 1))
    }
  }
  throw lastError
}
