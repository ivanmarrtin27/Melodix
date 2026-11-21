/** ID de stream del provider (11 chars). Rechaza IDs de catálogo Deezer/Spotify. */
export function isProviderMediaId(id) {
  if (!id || typeof id !== 'string') return false
  const value = id.trim()
  if (!value) return false
  if (value.startsWith('deezer-')) return false
  if (/^\d+$/.test(value)) return false
  return /^[a-zA-Z0-9_-]{11}$/.test(value)
}

export function pickProviderMediaId(track) {
  if (!track) return null
  for (const raw of [track.mediaId, track.videoId, track.id]) {
    if (raw && isProviderMediaId(String(raw))) return String(raw)
  }
  return null
}
