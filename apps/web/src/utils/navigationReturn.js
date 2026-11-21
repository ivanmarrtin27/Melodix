const RETURN_SCROLL_KEY = 'mediolix:return-scroll'

export function getMainScrollContainer() {
  return document.querySelector('main.flex-1')
}

export function resetMainScroll() {
  const apply = () => getMainScrollContainer()?.scrollTo({ top: 0, left: 0 })
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
}

/** Estado para volver a la pantalla anterior con el mismo scroll. */
export function captureReturnState(location) {
  const el = getMainScrollContainer()
  return {
    from: `${location.pathname}${location.search}`,
    scrollY: el?.scrollTop ?? 0,
  }
}

export function stashReturnScroll(scrollY) {
  if (scrollY == null || Number.isNaN(Number(scrollY))) return
  sessionStorage.setItem(RETURN_SCROLL_KEY, String(scrollY))
}

export function restoreReturnScroll() {
  const raw = sessionStorage.getItem(RETURN_SCROLL_KEY)
  if (raw == null) return
  sessionStorage.removeItem(RETURN_SCROLL_KEY)
  const y = Number(raw)
  if (!Number.isFinite(y) || y <= 0) return

  const apply = () => getMainScrollContainer()?.scrollTo({ top: y, left: 0 })
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
}

export function navigateWithReturn(navigate, location, path) {
  navigate(path, { state: captureReturnState(location) })
  resetMainScroll()
}

export function navigateBack(navigate, location) {
  const from = location.state?.from
  if (from) {
    stashReturnScroll(location.state.scrollY)
    navigate(from, { replace: false })
    return
  }
  navigate(-1)
}
