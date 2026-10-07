/**
 * Resolución portable de la base del API (sin Vite).
 * En web: pasar import.meta.env.VITE_API_URL y window.location.hostname.
 */
export function resolveApiBase(configuredUrl = '', pageHostname = '') {
  const configured = String(configuredUrl || '')
    .trim()
    .replace(/\/$/, '')

  if (!configured) return ''

  try {
    const api = new URL(configured, 'http://localhost')
    const apiLoopback =
      api.hostname === '127.0.0.1' ||
      api.hostname === 'localhost' ||
      api.hostname === '::1'
    const pageIsRemote =
      pageHostname &&
      pageHostname !== '127.0.0.1' &&
      pageHostname !== 'localhost' &&
      pageHostname !== '::1'

    if (apiLoopback && pageIsRemote) return ''
  } catch {
    /* URL inválida: devolver tal cual */
  }

  return configured
}

export function apiUrl(base, path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}
