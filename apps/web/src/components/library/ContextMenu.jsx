import { Heart, Trash2, ListPlus } from 'lucide-react'

export function ContextMenu({ open, position, onClose, onDelete, onFavorite, onAddToList, isFavorite }) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-xl shadow-2xl py-2 min-w-[200px] animate-fade-in"
        style={{
          background: 'var(--bg-card)',
          top: position.y,
          left: position.x,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <button
          onClick={() => { onFavorite(); onClose() }}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-white/5 transition-colors duration-200"
        >
          <Heart size={16} fill={isFavorite ? 'var(--accent-color)' : 'none'} />
          {isFavorite ? 'Quitar favorito' : 'Marcar favorito'}
        </button>
        <button
          onClick={() => { onAddToList(); onClose() }}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-white/5 transition-colors duration-200"
        >
          <ListPlus size={16} />
          Añadir a otra lista
        </button>
        <button
          onClick={() => { onDelete(); onClose() }}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors duration-200"
        >
          <Trash2 size={16} />
          Eliminar de lista
        </button>
      </div>
    </>
  )
}
