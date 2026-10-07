/**
 * Parsea texto pegado para importar canciones a una lista.
 * Formatos: JSON [{title,artist}], o líneas "Artista - Título".
 */
export function parsePlaylistImportText(text) {
  const trimmed = text?.trim()
  if (!trimmed) return []

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed)
      const list = Array.isArray(data) ? data : data.tracks || []
      return list
        .map((row) => ({
          title: String(row.title || row.name || '').trim(),
          artist: String(row.artist || row.artista || '').trim(),
        }))
        .filter((r) => r.title)
    } catch {
      return []
    }
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.match(/\s[-–—|]\s/)
      if (sep) {
        const idx = line.indexOf(sep[0])
        const left = line.slice(0, idx).trim()
        const right = line.slice(idx + sep[0].length).trim()
        return { artist: left, title: right }
      }
      return { artist: '', title: line }
    })
    .filter((r) => r.title)
}
