import { X } from 'lucide-react'
import { useEffect } from 'react'

/**
 * @param {'bottom' | 'center' | 'top'} [placement]
 *   bottom = sheet móvil (default)
 *   top / center = más arriba (formularios / teclado)
 */
export function Modal({ open, onClose, title, children, placement = 'bottom' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  const shellAlign =
    placement === 'top'
      ? 'items-start justify-center pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2.75rem))] pb-4 sm:items-center sm:pt-0'
      : placement === 'center'
        ? 'items-center justify-center p-4'
        : 'items-end sm:items-center justify-center'

  const panelRadius =
    placement === 'bottom'
      ? 'rounded-t-2xl sm:rounded-2xl'
      : 'rounded-2xl'

  const panelMotion =
    placement === 'bottom' ? 'app-modal__panel--sheet' : 'app-modal__panel--float'

  return (
    <div className={`app-modal fixed inset-0 z-50 flex ${shellAlign}`} role="presentation">
      <div
        className="app-modal__backdrop absolute inset-0"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`app-modal__panel relative w-full max-w-lg max-h-[min(90dvh,calc(100dvh-2rem))] overflow-y-auto ${panelRadius} p-6 mx-0 sm:mx-4 ${panelMotion}`}
        style={{ background: 'var(--bg-card)' }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
