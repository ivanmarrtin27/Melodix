export function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Buenos días ☀️'
  if (hour >= 12 && hour < 20) return 'Buenas tardes 🌤️'
  return 'Buenas noches 🌙'
}

export function getHomeGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function getHomeGreetingSubtitle() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Encuentra tu banda sonora de la mañana'
  if (hour >= 12 && hour < 20) return 'Encuentra tu banda sonora de la tarde'
  return 'Encuentra tu banda sonora de la noche'
}

export function formatDuration(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatMinutes(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  return `${hours}h ${remaining}m`
}

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
