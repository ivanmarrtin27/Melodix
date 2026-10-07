import { ArrowUpDown, Plus, FileInput, Pencil } from 'lucide-react'

const actions = [
  { id: 'edit', label: 'Editar', icon: Pencil },
  { id: 'sort', label: 'Ordenar', icon: ArrowUpDown },
  { id: 'add', label: 'Añadir', icon: Plus },
  { id: 'import', label: 'Importar', icon: FileInput },
]

export function PlaylistActionsBar({ onAction, showEdit = true }) {
  const visible = showEdit ? actions : actions.filter((a) => a.id !== 'edit')

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
      {visible.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onAction(id)}
          className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors hover:bg-white/5 active:scale-95"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Icon size={15} className="opacity-80" />
          {label}
        </button>
      ))}
    </div>
  )
}
