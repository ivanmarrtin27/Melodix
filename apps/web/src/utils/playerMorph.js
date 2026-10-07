/** @typedef {{ top: number, left: number, width: number, height: number }} MorphRect */

/** Apertura: sheet sube desde el mini. */
export const MORPH_OPEN_TRANSITION =
  'transform 0.62s cubic-bezier(0.22, 0.82, 0.24, 1), border-radius 0.62s cubic-bezier(0.22, 0.82, 0.24, 1), opacity 0.4s ease'

/**
 * Cierre / minimizar: más lento y con deceleración natural
 * (como un sheet iOS, sin “salto”).
 */
export const MORPH_CLOSE_TRANSITION =
  'transform 0.82s cubic-bezier(0.22, 0.9, 0.28, 1), border-radius 0.82s cubic-bezier(0.22, 0.9, 0.28, 1), opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)'

/** @deprecated use MORPH_CLOSE_TRANSITION */
export const MORPH_TRANSITION = MORPH_CLOSE_TRANSITION

/** Vuelve arriba si sueltas sin cerrar. */
export const DISMISS_SPRING_TRANSITION =
  'transform 0.58s cubic-bezier(0.22, 0.9, 0.28, 1), border-radius 0.58s cubic-bezier(0.22, 0.9, 0.28, 1), opacity 0.45s ease'

/** Bottom-center of the mini player — expansion grows upward from here. */
export function morphOriginFromRect(rect) {
  return `${rect.left + rect.width / 2}px ${rect.top + rect.height}px`
}

/** Scale full-screen shell down to match a screen rect (bottom-anchored). */
export function morphScaleFromRect(rect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return `scale(${rect.width / vw}, ${rect.height / vh})`
}

/** Legacy center-based FLIP (kept for reference). */
export function flipTransformFromRect(rect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const scaleX = rect.width / vw
  const scaleY = rect.height / vh
  const x = rect.left + rect.width / 2 - vw / 2
  const y = rect.top + rect.height / 2 - vh / 2
  return `translate3d(${x}px, ${y}px, 0) scale(${scaleX}, ${scaleY})`
}

/** @deprecated Prefer applySlideExpandFrom — morph scale legacy. */
export function applyMorphCollapsed(shell, rect) {
  applySlideExpandFrom(shell, rect)
}

export function applyMorphExpanded(shell) {
  applySlideExpandTo(shell)
}

/**
 * Estado inicial al abrir: sheet justo sobre el mini player,
 * listo para subir a pantalla completa.
 */
export function applySlideExpandFrom(shell, rect) {
  const vh = typeof window !== 'undefined' ? window.innerHeight || 1 : 1
  const miniTop = rect?.top != null ? Number(rect.top) : vh * 0.88
  // Empieza anclado al card del mini (no desde fuera de pantalla del todo)
  const fromY = Math.max(48, Math.min(vh * 0.92, miniTop - 8))

  shell.style.transformOrigin = '50% 100%'
  shell.style.transform = `translate3d(0, ${fromY}px, 0) scale(0.96)`
  shell.style.borderRadius = '18px'
  shell.style.opacity = '1'
}

/** Estado final abierto — origen listo para el gesto de minimizar. */
export function applySlideExpandTo(shell) {
  shell.style.transformOrigin = '50% 0%'
  shell.style.transform = 'translate3d(0, 0, 0) scale(1)'
  shell.style.borderRadius = '0px'
  shell.style.opacity = '1'
}

/** Cierre deslizando hacia abajo desde un offset (gesto) o desde 0. */
export function applySlideDismissFrom(shell, fromY = 0) {
  const vh = typeof window !== 'undefined' ? window.innerHeight || 1 : 1
  const progress = Math.min(1, Math.max(0, fromY) / vh)
  shell.style.transformOrigin = '50% 0%'
  shell.style.transform = `translate3d(0, ${Math.max(0, fromY)}px, 0) scale(${1 - progress * 0.045})`
  shell.style.borderRadius = fromY > 6 ? '18px' : '0px'
  shell.style.opacity = '1'
}

export function applySlideDismissTo(shell) {
  shell.style.transformOrigin = '50% 0%'
  // Baja completo con poca contracción — sensación de sheet, no de “pop”
  shell.style.transform = 'translate3d(0, 102%, 0) scale(0.985)'
  shell.style.borderRadius = '20px 20px 0 0'
  shell.style.opacity = '0.55'
}

export function measureMorphSource() {
  const el = document.querySelector('[data-player-morph-source]')
  if (!el) return serializeRect(getMiniPlayerTargetRect())
  return serializeRect(el.getBoundingClientRect())
}

/** Fallback when the mini player node is not mounted. */
export function getMiniPlayerTargetRect() {
  const source = document.querySelector('[data-player-morph-source]')
  if (source) {
    return source.getBoundingClientRect()
  }

  const styles = getComputedStyle(document.documentElement)
  const navBlock = parseFloat(styles.getPropertyValue('--dock-nav-block')) || 52
  const miniBlock = parseFloat(styles.getPropertyValue('--dock-mini-block')) || 54
  const gap = parseFloat(styles.getPropertyValue('--dock-gap')) || 5
  const bottomInset = parseFloat(styles.getPropertyValue('--dock-bottom-inset')) || 12
  const padding = 16
  const width = Math.min(window.innerWidth - padding * 2, 448)
  const left = (window.innerWidth - width) / 2
  const height = miniBlock + 2
  const top = window.innerHeight - navBlock - bottomInset - gap - height

  return {
    top: Math.max(0, top),
    left,
    width,
    height,
  }
}

export function serializeRect(rect) {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}
