/** ID numérico de Deezer para rutas /album/:id */
export function resolveDeezerAlbumId(albumOrId) {
  if (albumOrId == null) return null

  if (typeof albumOrId === 'string' || typeof albumOrId === 'number') {
    const id = String(albumOrId).trim()
    if (!/^\d+$/.test(id)) return null
    return id
  }

  const raw = albumOrId.deezerId ?? albumOrId.id
  const id = String(raw ?? '').trim()
  if (!/^\d+$/.test(id)) return null
  return id
}

export function albumDetailPath(albumOrId) {
  const id = resolveDeezerAlbumId(albumOrId)
  return id ? `/album/${id}` : null
}
