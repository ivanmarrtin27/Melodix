import { ACCENT_COLORS } from './accentColors'
import { getInitials } from './formatters'

export function generateCoverFromName(name) {
  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 300
  const ctx = canvas.getContext('2d')

  const colors = Object.values(ACCENT_COLORS).map((c) => c.value)
  const bg = colors[Math.floor(Math.random() * colors.length)]

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 300, 300)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 100px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(getInitials(name), 150, 150)

  return canvas.toDataURL('image/png')
}
