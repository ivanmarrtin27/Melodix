import { useEffect, useState } from 'react'
import { Upload, Search, Sparkles } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { generateCoverFromName } from '../../utils/helpers'
import { searchForCoverImage } from '../../services/musicApi'

export function CreatePlaylistModal({
  open,
  onClose,
  onCreate,
  onUpdate,
  playlistToEdit = null,
}) {
  const isEdit = Boolean(playlistToEdit?.id)

  const [name, setName] = useState('')
  const [cover, setCover] = useState(null)
  const [coverMode, setCoverMode] = useState('auto')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setName('')
    setCover(null)
    setCoverMode('auto')
    setSearchQuery('')
    setError('')
  }

  useEffect(() => {
    if (!open) return
    if (playlistToEdit) {
      setName(playlistToEdit.name || '')
      setCover(playlistToEdit.cover || null)
      setCoverMode(playlistToEdit.cover ? 'upload' : 'auto')
      setSearchQuery('')
      setError('')
    } else {
      reset()
    }
  }, [open, playlistToEdit])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCover(reader.result)
      setCoverMode('upload')
    }
    reader.readAsDataURL(file)
  }

  const handleSearchCover = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError('')
    try {
      const thumbnail = await searchForCoverImage(searchQuery)
      if (thumbnail) {
        setCover(thumbnail)
        setCoverMode('search')
      } else {
        setError('No se encontró imagen')
      }
    } catch {
      setError('Error al buscar imagen')
    } finally {
      setLoading(false)
    }
  }

  const resolveCover = () => {
    if (cover) return cover
    if (coverMode === 'auto' && name.trim()) return generateCoverFromName(name.trim())
    return playlistToEdit?.cover || generateCoverFromName(name.trim() || 'Lista')
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('El nombre es obligatorio')
      return
    }

    const payload = { name: name.trim(), cover: resolveCover() }

    if (isEdit) onUpdate?.(playlistToEdit.id, payload)
    else onCreate?.(payload)

    handleClose()
  }

  const previewCover =
    cover || (name && coverMode === 'auto' ? generateCoverFromName(name) : null)

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Editar lista' : 'Nueva lista'}
      placement="top"
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          {previewCover ? (
            <img
              src={previewCover}
              alt=""
              className="w-32 h-32 rounded-xl object-cover shadow-lg"
            />
          ) : (
            <div
              className="w-32 h-32 rounded-xl flex items-center justify-center opacity-30"
              style={{ background: 'var(--border-color)' }}
            >
              <Sparkles size={32} />
            </div>
          )}
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la lista *"
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
        />

        <div className="space-y-2">
          <p className="text-xs opacity-50 font-medium">Portada</p>
          <div className="grid grid-cols-3 gap-2">
            <label
              className={`flex flex-col items-center gap-1 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                coverMode === 'upload' ? 'ring-2 ring-[var(--accent-color)]' : ''
              }`}
              style={{ background: 'var(--bg-primary)' }}
            >
              <Upload size={18} />
              <span className="text-[10px]">Subir</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              type="button"
              onClick={() => setCoverMode('search')}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
                coverMode === 'search' ? 'ring-2 ring-[var(--accent-color)]' : ''
              }`}
              style={{ background: 'var(--bg-primary)' }}
            >
              <Search size={18} />
              <span className="text-[10px]">Buscar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCoverMode('auto')
                setCover(null)
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
                coverMode === 'auto' ? 'ring-2 ring-[var(--accent-color)]' : ''
              }`}
              style={{ background: 'var(--bg-primary)' }}
            >
              <Sparkles size={18} />
              <span className="text-[10px]">Auto</span>
            </button>
          </div>

          {coverMode === 'search' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar imagen..."
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
              />
              <button
                type="button"
                onClick={handleSearchCover}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-black"
                style={{ background: 'var(--accent-color)' }}
              >
                {loading ? '...' : 'OK'}
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-3 rounded-full font-semibold text-black transition-transform duration-200 active:scale-[0.98]"
          style={{ background: 'var(--accent-color)' }}
        >
          {isEdit ? 'Guardar cambios' : 'Crear lista'}
        </button>
      </div>
    </Modal>
  )
}
