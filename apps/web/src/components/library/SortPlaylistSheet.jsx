import { GripVertical, Type, User, Clock } from 'lucide-react'
import { Modal } from '../ui/Modal'

const SORT_OPTIONS = [
  { id: 'title', label: 'Por título (A–Z)', icon: Type },
  { id: 'artist', label: 'Por artista (A–Z)', icon: User },
  { id: 'duration', label: 'Por duración', icon: Clock },
  { id: 'manual', label: 'Orden personalizado', icon: GripVertical },
]

export function SortPlaylistSheet({ open, onClose, onSelect }) {
  return (
    <Modal open={open} onClose={onClose} title="Ordenar lista">
      <p className="text-sm opacity-50 mb-4">
        Elige cómo quieres ordenar las canciones de esta lista.
      </p>
      <div className="space-y-2">
        {SORT_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              onSelect(id)
              onClose()
            }}
            className="flex items-center gap-3 w-full p-3.5 rounded-xl hover:bg-white/5 text-left transition-colors"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--border-color)' }}
            >
              <Icon size={18} />
            </div>
            <span className="font-medium">{label}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
