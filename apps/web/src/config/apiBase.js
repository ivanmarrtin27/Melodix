import { resolveApiBase, apiUrl as sharedApiUrl } from '@melodix/shared/apiBase'

/**
 * Base URL del API FastAPI (wrapper Vite de @melodix/shared).
 * Vacío = rutas relativas `/api/...` (proxy Vite).
 */
export function getApiBase() {
  const configured = String(import.meta.env.VITE_API_URL || '')
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const base = resolveApiBase(configured, hostname)

  if (
    import.meta.env.DEV &&
    configured &&
    !base &&
    hostname &&
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1'
  ) {
    console.warn(
      '[Melodix] VITE_API_URL es localhost pero abres desde',
      hostname,
      '→ usando /api (proxy Vite) para el móvil.'
    )
  }

  return base
}

export function apiUrl(path) {
  return sharedApiUrl(getApiBase(), path)
}
