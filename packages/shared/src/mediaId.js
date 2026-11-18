/** Prefijos de catálogo que nunca son mediaIds de stream. */
const CATALOG_PREFIXES = ['deezer-', 'lfm-', 'spotify:', 'spotify-']

/**
 * ID de stream del provider (11 chars), alineado con server YOUTUBE_ID_RE.
 * Rechaza IDs de catálogo (Deezer / Last.fm / Spotify).
 */
export function isProviderMediaId(id) {
  if (!id || typeof id !== 'string') return false
  const value = id.trim()
  if (!value) return false
  const lower = value.toLowerCase()
  if (CATALOG_PREFIXES.some((p) => lower.startsWith(p))) return false
  return /^[A-Za-z0-9_-]{11}$/.test(value)
}

/** Solo mediaId/videoId explícitos — nunca track.id de catálogo. */
export function pickProviderMediaId(track) {
  if (!track) return null
  for (const raw of [track.mediaId, track.videoId]) {
    if (raw && isProviderMediaId(String(raw))) return String(raw)
  }
  return null
}
