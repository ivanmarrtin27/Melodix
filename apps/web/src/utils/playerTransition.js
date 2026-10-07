const EXPAND_MS = 580
const EASING_SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)'

export function runPlayerTransition(commit) {
  if (typeof document !== 'undefined' && document.startViewTransition) {
    document.startViewTransition(() => commit())
    return Promise.resolve()
  }

  commit()

  return new Promise((resolve) => {
    window.setTimeout(resolve, EXPAND_MS)
  })
}

export function runPlayerTransitionEnd(commit) {
  if (typeof document !== 'undefined' && document.startViewTransition) {
    document.startViewTransition(() => commit())
    return
  }
  commit()
}

export const PLAYER_EXPAND_MS = EXPAND_MS
export const PLAYER_EASING = EASING_SPRING
