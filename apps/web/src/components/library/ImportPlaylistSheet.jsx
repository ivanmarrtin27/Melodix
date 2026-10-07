import { useState } from 'react'
import { searchDeezerAll } from '../../services/deezerApi'
import { parsePlaylistImportText } from '../../utils/playlistImport'
import { Modal } from '../ui/Modal'

export function ImportPlaylistSheet({ open, onClose, onImported }) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState(null)
  const [importing, setImporting] = useState(false)

  const handleClose = () => {
    setText('')
    setStatus(null)
    onClose()
  }

  const handleImport = async () => {
    const rows = parsePlaylistImportText(text)
    if (!rows.length) {
      setStatus({ type: 'error', message: 'No se reconoció ninguna canción en el texto.' })
      return
    }

    setImporting(true)
    setStatus({ type: 'info', message: `Buscando ${rows.length} canciones…` })

    const found = []
    let missed = 0

    for (const row of rows) {
      const q = [row.artist, row.title].filter(Boolean).join(' ')
      try {
        const { tracks } = await searchDeezerAll(q, { artists: 0, albums: 0, tracks: 1 })
        if (tracks[0]) found.push(tracks[0])
        else missed += 1
      } catch {
        missed += 1
      }
    }

    setImporting(false)

    if (!found.length) {
      setStatus({
        type: 'error',
        message: 'No se encontró ninguna canción. Revisa el formato.',
      })
      return
    }

    onImported(found)
    setStatus({
      type: 'success',
      message: `Importadas ${found.length} canciones${missed ? ` (${missed} no encontradas)` : ''}.`,
    })
    setTimeout(handleClose, 1200)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Importar canciones">
      <p className="text-sm opacity-50 mb-3">
        Pega una canción por línea (<strong>Artista - Título</strong>) o un JSON con{' '}
        <code className="text-xs opacity-80">title</code> y <code className="text-xs opacity-80">artist</code>.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Bad Bunny - Monaco\nQuevedo - Playa del Inglés\n[{"title":"…","artist":"…"}]'}
        rows={8}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none mb-4"
        style={{ background: 'var(--bg-primary)' }}
        disabled={importing}
      />

      {status && (
        <p
          className={`text-sm mb-3 ${
            status.type === 'error'
              ? 'text-red-400'
              : status.type === 'success'
                ? 'text-emerald-400'
                : 'opacity-60'
          }`}
        >
          {status.message}
        </p>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={importing || !text.trim()}
        className="w-full py-3 rounded-full font-semibold text-black disabled:opacity-40"
        style={{ background: 'var(--accent-color)' }}
      >
        {importing ? 'Importando…' : 'Importar a la lista'}
      </button>
    </Modal>
  )
}
