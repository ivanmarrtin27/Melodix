import { X } from 'lucide-react'
import { useEffect } from 'react'

export function AppPanel({ open, onClose, title, subtitle, icon: Icon, children }) {
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="app-panel-overlay">
      <button
        type="button"
        className="app-panel-overlay__backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <aside className="app-panel safe-bottom" role="dialog" aria-modal="true" aria-label={title}>
        <div className="app-panel__ambient" aria-hidden />
        <header className="app-panel__header">
          <div className="app-panel__header-main">
            {Icon ? (
              <div className="app-panel__icon">
                <Icon size={20} strokeWidth={1.85} />
              </div>
            ) : null}
            <div className="min-w-0">
              <h2 className="app-panel__title">{title}</h2>
              {subtitle ? <p className="app-panel__subtitle">{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className="app-panel__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="app-panel__body">{children}</div>
      </aside>
    </div>
  )
}

export function AppPanelSection({ title, children, badge }) {
  return (
    <section className="app-panel__section">
      <div className="app-panel__section-head">
        <h3 className="app-panel__section-title">{title}</h3>
        {badge}
      </div>
      {children}
    </section>
  )
}

export function AppPanelCard({ children, className = '' }) {
  return <div className={`app-panel__card${className ? ` ${className}` : ''}`}>{children}</div>
}

/** Grupo tipo iOS: filas apiladas con divisores, una sola tarjeta. */
export function AppPanelGroup({ children, className = '' }) {
  return (
    <div className={`app-panel__group${className ? ` ${className}` : ''}`}>{children}</div>
  )
}

export function AppPanelGroupRow({ children, className = '' }) {
  return (
    <div className={`app-panel__group-row${className ? ` ${className}` : ''}`}>{children}</div>
  )
}
