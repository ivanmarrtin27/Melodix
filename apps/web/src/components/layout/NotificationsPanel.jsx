import { Bell, CheckCheck, Heart, Music2, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useUserStore } from '../../stores/userStore'
import { useLibraryStore } from '../../stores/libraryStore'
import { buildAppNotifications, getUnreadNotificationCount } from '../../utils/appNotifications'
import { AppPanel, AppPanelCard, AppPanelSection } from './AppPanel'

const TYPE_META = {
  music: { icon: Music2, label: 'Música' },
  tip: { icon: Heart, label: 'Consejo' },
  update: { icon: Sparkles, label: 'Novedad' },
}

function NotificationItem({ item, unread, onRead }) {
  const meta = TYPE_META[item.type] || TYPE_META.update
  const Icon = meta.icon

  return (
    <button
      type="button"
      className={`app-notif${unread ? ' app-notif--unread' : ''}`}
      onClick={() => onRead(item.id)}
    >
      <div className={`app-notif__icon app-notif__icon--${item.type}`}>
        <Icon size={17} strokeWidth={1.85} />
      </div>
      <div className="app-notif__body min-w-0">
        <div className="app-notif__top">
          <p className="app-notif__title truncate">{item.title}</p>
          {unread ? <span className="app-notif__dot" aria-hidden /> : null}
        </div>
        <p className="app-notif__text line-clamp-2">{item.body}</p>
        <p className="app-notif__time">{item.time}</p>
      </div>
    </button>
  )
}

export function NotificationsPanel() {
  const {
    notificationsOpen,
    closeNotifications,
    notificationReadIds,
    markNotificationRead,
    markAllNotificationsRead,
  } = useUserStore()

  const favoritesCount = useLibraryStore((s) => s.favorites.length)

  const notifications = useMemo(
    () => buildAppNotifications({ favoritesCount }),
    [favoritesCount]
  )

  const unreadCount = useMemo(
    () => getUnreadNotificationCount(notifications, notificationReadIds),
    [notifications, notificationReadIds]
  )

  return (
    <AppPanel
      open={notificationsOpen}
      onClose={closeNotifications}
      title="Notificaciones"
      subtitle={unreadCount ? `${unreadCount} sin leer` : 'Estás al día'}
      icon={Bell}
    >
      {unreadCount > 0 && (
        <div className="app-panel__toolbar">
          <button
            type="button"
            className="app-panel__toolbar-btn"
            onClick={() => markAllNotificationsRead(notifications.map((n) => n.id))}
          >
            <CheckCheck size={15} />
            Marcar todo como leído
          </button>
        </div>
      )}

      <AppPanelSection title="Recientes">
        <AppPanelCard className="app-panel__card--flush">
          {notifications.map((item) => (
            <NotificationItem
              key={item.id}
              item={item}
              unread={!notificationReadIds.includes(item.id)}
              onRead={markNotificationRead}
            />
          ))}
        </AppPanelCard>
      </AppPanelSection>
    </AppPanel>
  )
}

export { getUnreadNotificationCount }
