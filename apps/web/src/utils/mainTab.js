const LAST_TAB_KEY = 'melodix:last-main-tab'

export const MAIN_TAB_PATHS = ['/home', '/search', '/library', '/user']

export function isMainTabPath(pathname) {
  return MAIN_TAB_PATHS.includes(pathname)
}

export function isOverlayDetailPath(pathname) {
  return (
    pathname.startsWith('/album/') ||
    pathname.startsWith('/artist/') ||
    pathname.startsWith('/genre/')
  )
}

export function tabIndexForPath(pathname) {
  const path = pathname.split('?')[0]
  if (path === '/search') return 1
  if (path === '/library' || path.startsWith('/library/')) return 2
  if (path === '/user') return 3
  return 0
}

export function rememberMainTab(pathname) {
  if (isMainTabPath(pathname)) {
    sessionStorage.setItem(LAST_TAB_KEY, pathname)
  }
}

/** Índice del pill inferior — coherente con la pestaña resaltada. */
export function resolveBottomNavIndex(pathname, locationState) {
  if (pathname === '/library' || pathname.startsWith('/library/')) return 2
  if (pathname === '/search') return 1
  if (pathname === '/user') return 3
  if (pathname === '/home') return 0

  if (isOverlayDetailPath(pathname)) {
    const from = locationState?.from?.split('?')[0]
    if (from && isMainTabPath(from)) return tabIndexForPath(from)
    if (from && (from === '/library' || from.startsWith('/library/'))) return 2
    const last = sessionStorage.getItem(LAST_TAB_KEY)
    if (last) return tabIndexForPath(last)
  }

  return 0
}

export function isNavTabHighlighted(tabIndex, pathname, locationState, navIndex) {
  if (navIndex !== tabIndex) return false
  if (isMainTabPath(pathname) || pathname.startsWith('/library/')) {
    if (tabIndex === 2) {
      return pathname === '/library' || pathname.startsWith('/library/')
    }
    return pathname === MAIN_TAB_PATHS[tabIndex]
  }
  if (isOverlayDetailPath(pathname)) {
    return navIndex === resolveBottomNavIndex(pathname, locationState)
  }
  return false
}
