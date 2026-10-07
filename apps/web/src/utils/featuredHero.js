import { seededShuffle } from './helpers'

function normArtist(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function artistsMatch(a, b) {
  const left = normArtist(a)
  const right = normArtist(b)
  if (!left || !right) return false
  if (left === right) return true
  return left.includes(right) || right.includes(left)
}

function albumKey(album) {
  return String(album?.deezerId || album?.id || '')
}

/**
 * @param {{ panoramaAlbums?: object[], recentAlbums?: object[], favorites?: object[], recent?: object[] }} input
 * @returns {{ id: string, album: object, badge: string, subtitle: string }[]}
 */
export function buildFeaturedSlides({
  panoramaAlbums = [],
  recentAlbums = [],
  favorites = [],
  recent = [],
}) {
  const trending = []
  const recommended = []
  const recentSlides = []
  const seen = new Set()

  const push = (bucket, album, badge, subtitle) => {
    const id = albumKey(album)
    if (!album?.title || !id || !/^\d+$/.test(id) || seen.has(id)) return
    const artist = String(album.artist || '').trim()
    if (!artist || artist === 'Artista desconocido') return
    seen.add(id)
    bucket.push({ id, album, badge, subtitle })
  }

  panoramaAlbums.slice(0, 5).forEach((album) => {
    push(trending, album, 'Top actualidad', 'Lo más escuchado ahora')
  })

  const tasteArtists = [...favorites, ...recent].map((t) => t?.artist).filter(Boolean)

  for (const album of panoramaAlbums) {
    if (recommended.length >= 3) break
    if (tasteArtists.some((name) => artistsMatch(name, album.artist))) {
      push(recommended, album, 'Recomendado', `Porque escuchas ${album.artist}`)
    }
  }

  if (recommended.length < 2) {
    const dayKey = new Date().toISOString().slice(0, 10)
    const pool = panoramaAlbums.filter((a) => !seen.has(albumKey(a)))
    for (const album of seededShuffle(pool, dayKey)) {
      if (recommended.length >= 3) break
      push(recommended, album, 'Recomendado', 'Selección personalizada de hoy')
    }
  }

  recentAlbums.slice(0, 4).forEach((album) => {
    push(recentSlides, album, 'Reciente', 'Continúa donde lo dejaste')
  })

  const interleaved = []
  const maxLen = Math.max(trending.length, recommended.length, recentSlides.length, 0)

  for (let i = 0; i < maxLen && interleaved.length < 6; i += 1) {
    if (trending[i]) interleaved.push(trending[i])
    if (recommended[i] && interleaved.length < 6) interleaved.push(recommended[i])
    if (recentSlides[i] && interleaved.length < 6) interleaved.push(recentSlides[i])
  }

  return interleaved
}

export function badgeClassForSlide(badge) {
  if (badge === 'Top actualidad') return 'home-hero__eyebrow--trending'
  if (badge === 'Recomendado') return 'home-hero__eyebrow--recommended'
  if (badge === 'Reciente') return 'home-hero__eyebrow--recent'
  return ''
}
