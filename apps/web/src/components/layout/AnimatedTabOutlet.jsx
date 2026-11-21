import { Outlet, useLocation } from 'react-router-dom'
import { isOverlayDetailPath } from '../../utils/mainTab'

const TAB_ROUTES = ['/home', '/search', '/library', '/user']

export function AnimatedTabOutlet() {
  const location = useLocation()
  const { pathname } = location
  const isMainTab = TAB_ROUTES.includes(pathname)
  const isDetail = isOverlayDetailPath(pathname)

  const outletKey = isMainTab || isDetail ? `${pathname}:${location.key}` : location.key

  return (
    <div key={outletKey} className="tab-page tab-page-enter-fade">
      <Outlet />
    </div>
  )
}
