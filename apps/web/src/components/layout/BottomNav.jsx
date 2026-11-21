import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, Library, User } from 'lucide-react'
import {
  isNavTabHighlighted,
  rememberMainTab,
  resolveBottomNavIndex,
} from '../../utils/mainTab'
import { useT } from '../../i18n'

export function BottomNav() {
  const t = useT()
  const { pathname, state } = useLocation()
  const activeIndex = resolveBottomNavIndex(pathname, state)

  const tabs = [
    { to: '/home', icon: Home, label: t('nav.home'), index: 0 },
    { to: '/search', icon: Search, label: t('nav.search'), index: 1 },
    { to: '/library', icon: Library, label: t('nav.library'), index: 2, matchPrefix: '/library' },
    { to: '/user', icon: User, label: t('nav.profile'), index: 3 },
  ]

  useEffect(() => {
    rememberMainTab(pathname)
  }, [pathname])

  return (
    <nav className="bottom-nav-float" aria-label={t('nav.aria')}>
      <div
        className="bottom-nav-pill"
        style={{ '--nav-active-index': activeIndex }}
      >
        <div className="bottom-nav-indicator" aria-hidden />

        {tabs.map(({ to, icon: Icon, label, index, matchPrefix }) => (
          <NavLink
            key={to}
            to={to}
            end={!matchPrefix}
            className={() => {
              const active = isNavTabHighlighted(index, pathname, state, activeIndex)
              return `bottom-nav-tab ${active ? 'bottom-nav-tab--active' : ''}`
            }}
          >
            {() => {
              const active = isNavTabHighlighted(index, pathname, state, activeIndex)
              return (
                <>
                  <span className={`bottom-nav-tab__icon ${active ? 'is-active' : ''}`}>
                    <Icon size={20} strokeWidth={active ? 2.25 : 2} />
                  </span>
                  <span className="bottom-nav-tab__label">{label}</span>
                </>
              )
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
