export const LIKED_PLAYLIST_ID = 'liked-songs'
export const LIKED_PLAYLIST_NAME = 'Canciones que te gustan'

export function isLikedPlaylistId(id) {
  return id === LIKED_PLAYLIST_ID
}

function parseAccentColor() {
  if (typeof document === 'undefined') return { r: 29, g: 185, b: 84 }

  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim()
  if (!raw.startsWith('#')) return { r: 29, g: 185, b: 84 }

  const hex = raw.slice(1)
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex

  if (full.length !== 6) return { r: 29, g: 185, b: 84 }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function mixRgb(from, to, amount) {
  return {
    r: Math.round(from.r + (to.r - from.r) * amount),
    g: Math.round(from.g + (to.g - from.g) * amount),
    b: Math.round(from.b + (to.b - from.b) * amount),
  }
}

function rgb({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`
}

/** Portada estilo Spotify (degradado del acento + corazón) */
export function generateLikedPlaylistCover() {
  if (typeof document === 'undefined') return ''

  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 300
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const accent = parseAccentColor()
  const dark = mixRgb(accent, { r: 0, g: 0, b: 0 }, 0.62)
  const mid = mixRgb(accent, { r: 0, g: 0, b: 0 }, 0.28)
  const light = mixRgb(accent, { r: 255, g: 255, b: 255 }, 0.38)

  const grad = ctx.createLinearGradient(0, 300, 300, 0)
  grad.addColorStop(0, rgb(dark))
  grad.addColorStop(0.52, rgb(mid))
  grad.addColorStop(1, rgb(light))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 300, 300)

  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.beginPath()
  const cx = 150
  const cy = 158
  const size = 52
  ctx.moveTo(cx, cy + size * 0.32)
  ctx.bezierCurveTo(cx, cy - size * 0.2, cx - size, cy - size * 0.05, cx - size * 0.5, cy + size * 0.12)
  ctx.bezierCurveTo(cx - size * 0.15, cy + size * 0.55, cx, cy + size * 0.85, cx, cy + size * 0.85)
  ctx.bezierCurveTo(cx, cy + size * 0.85, cx + size * 0.15, cy + size * 0.55, cx + size * 0.5, cy + size * 0.12)
  ctx.bezierCurveTo(cx + size, cy - size * 0.05, cx, cy - size * 0.2, cx, cy + size * 0.32)
  ctx.fill()

  return canvas.toDataURL('image/png')
}
