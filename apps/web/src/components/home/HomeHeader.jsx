import { Bell, Settings } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../../stores/userStore'
import { useLibraryStore } from '../../stores/libraryStore'
import { getHomeGreeting, getHomeGreetingSubtitle, getInitials } from '../../utils/helpers'
import { buildAppNotifications, getUnreadNotificationCount } from '../../utils/appNotifications'

export function HomeHeader() {
  const navigate = useNavigate()
  const { user, openNotifications, notificationReadIds } = useUserStore()
  const favoritesCount = useLibraryStore((s) => s.favorites.length)

  const unread = useMemo(() => {
    const notifications = buildAppNotifications({ favoritesCount })
    return getUnreadNotificationCount(notifications, notificationReadIds)
  }, [favoritesCount, notificationReadIds])

  return (
    <header className="home-header px-4 pt-6 pb-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="home-header__avatar-wrap shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="home-header__avatar" />
            ) : (
              <div className="home-header__avatar home-header__avatar--fallback">
                {getInitials(user.name)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="home-header__eyebrow">{getHomeGreetingSubtitle()}</p>
            <h1 className="home-header__title truncate">{getHomeGreeting()}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={openNotifications}
            className="home-header__action home-header__action--badge"
            aria-label="Notificaciones"
          >
            <Bell size={20} strokeWidth={1.85} />
            {unread > 0 ? (
              <span className="home-header__badge" aria-hidden>
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="home-header__action"
            aria-label="Ajustes"
          >
            <Settings size={20} strokeWidth={1.85} />
          </button>
        </div>
      </div>
    </header>
  )
}
