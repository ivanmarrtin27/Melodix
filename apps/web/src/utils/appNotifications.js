export function buildAppNotifications({ favoritesCount }) {
  const items = []

  if (favoritesCount === 0) {
    items.push({
      id: 'liked-tip',
      type: 'tip',
      title: 'Construye tu lista Me gusta',
      body: 'Pulsa el corazón en cualquier canción para guardarla.',
      time: 'Consejo',
    })
  }

  items.push({
    id: 'welcome',
    type: 'update',
    title: 'Bienvenido a Melodix',
    body: 'Explora novedades, artistas y tu biblioteca en un solo lugar.',
    time: 'Melodix',
  })

  return items
}

export function getUnreadNotificationCount(notifications, readIds = []) {
  return notifications.filter((n) => !readIds.includes(n.id)).length
}
