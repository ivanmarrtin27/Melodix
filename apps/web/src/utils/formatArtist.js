function splitArtistList(raw = '') {
  return String(raw)
    .split(/\s*(?:,|&|\/|·|\|| x | X | y | and )\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

function asCredit(entry) {
  if (!entry) return null
  if (typeof entry === 'string') {
    const name = entry.trim()
    return name ? { name, deezerId: null } : null
  }
  const name = String(entry.name || '').trim()
  if (!name) return null
  const id = entry.deezerId ?? entry.id ?? null
  return {
    name,
    deezerId: id != null && String(id).trim() && String(id) !== 'null' ? String(id) : null,
  }
}

function nameKey(name = '') {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Extrae colaboraciones desde el título (con o sin paréntesis). */
export function parseFeaturedFromTitle(title = '') {
  if (!title) return []

  const feats = []
  const patterns = [
    // (feat. X) / [ft. X] / (featuring X) / (con X) / (with X)
    /\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|con|with)\s+([^\)\]]+?)\s*[\)\]]/gi,
    // feat. X / ft. X al final o en medio, sin paréntesis
    /(?:^|\s)(?:feat\.?|ft\.?|featuring)\s+(.+?)$/gi,
  ]

  for (const pattern of patterns) {
    for (const match of title.matchAll(pattern)) {
      const chunk = String(match[1] || '')
        .replace(/\s*[\(\[].*$/, '')
        .trim()
      if (chunk) feats.push(...splitArtistList(chunk))
    }
  }

  return feats
}

/**
 * Si el campo artista trae "A feat. B" o "A, B", separa principal + feats.
 * @returns {{ main: string, featured: string[] }}
 */
export function splitMainAndFeaturedArtist(artistField = '') {
  const raw = String(artistField || '').trim()
  if (!raw) return { main: '', featured: [] }

  const featMatch = raw.match(
    /^(.+?)\s+(?:feat\.?|ft\.?|featuring|con|with)\s+(.+)$/i
  )
  if (featMatch) {
    return {
      main: featMatch[1].trim(),
      featured: splitArtistList(featMatch[2]),
    }
  }

  // "Artist1, Artist2" / "Artist1 & Artist2" → primero main, resto feats
  if (/\s*(?:,|&|\/|·|\|| x | y | and )\s*/i.test(raw)) {
    const parts = splitArtistList(raw)
    if (parts.length > 1) {
      return { main: parts[0], featured: parts.slice(1) }
    }
  }

  return { main: raw, featured: [] }
}

function contributorsToFeatured(contributors = [], mainArtist = '', mainId = null) {
  const main = nameKey(mainArtist)
  const mainIdStr = mainId != null ? String(mainId) : null

  return (contributors || [])
    .map((c) => {
      const credit = asCredit(c)
      if (!credit) return null
      const role = String(c?.role || '').toLowerCase()
      const idStr = credit.deezerId ? String(credit.deezerId) : null

      // El principal (por id o nombre) no es feat
      if (mainIdStr && idStr && idStr === mainIdStr) return null
      if (nameKey(credit.name) === main) return null

      // Featured explícito
      if (/feat|guest|performer/.test(role)) return credit

      // Sin rol o rol raro: si no es Main del mismo artista, incluir
      if (!role || role === 'featured') return credit

      // Deezer a veces marca colaboradores como Main secundarios
      if (role === 'main' || role === 'primary' || role === 'artist') {
        // Solo si es otro id/nombre distinto al principal (ya filtrado arriba)
        return credit
      }

      return credit
    })
    .filter(Boolean)
}

function pushUnique(list, seen, entry) {
  const credit = asCredit(entry)
  if (!credit) return
  const key = nameKey(credit.name)
  if (!key) return
  if (seen.has(key)) {
    if (credit.deezerId) {
      const prev = list.find((u) => nameKey(u.name) === key)
      if (prev && !prev.deezerId) prev.deezerId = credit.deezerId
    }
    return
  }
  seen.add(key)
  list.push(credit)
}

/** Lista única de artistas invitados ({ name, deezerId }). */
export function extractFeaturedArtists(track) {
  if (!track) return []

  const rawArtist = (typeof track.artist === 'string' ? track.artist : track.artist?.name || '')
    .trim()
  const split = splitMainAndFeaturedArtist(rawArtist)
  const main = split.main || rawArtist
  const mainId = track.artistDeezerId || track.artistId || null

  const pool = [
    ...(Array.isArray(track.featuredArtists) ? track.featuredArtists : []),
    ...contributorsToFeatured(track.contributors, main, mainId),
    ...parseFeaturedFromTitle(track.title),
    ...split.featured,
  ]

  const seen = new Set()
  const unique = []
  const mainKey = nameKey(main)

  for (const entry of pool) {
    const credit = asCredit(entry)
    if (!credit) continue
    if (nameKey(credit.name) === mainKey) continue
    pushUnique(unique, seen, credit)
  }

  return unique
}

/** Título limpio sin sufijos feat/ft. */
export function formatTrackTitle(track) {
  if (!track?.title) return ''
  return String(track.title)
    .replace(/\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring|con|with)\s+[^\)\]]+?\s*[\)\]]/gi, '')
    .replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.+$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Nombre principal (sin feats embebidos en el string). */
export function formatMainArtistName(track) {
  if (!track) return 'Artista desconocido'
  const raw = (typeof track.artist === 'string' ? track.artist : track.artist?.name || '')
    .trim()
  const { main } = splitMainAndFeaturedArtist(raw)
  return main || raw || 'Artista desconocido'
}

/** "Artista principal feat. feat1, feat2" */
export function formatTrackArtists(track) {
  if (!track) return ''

  const main = formatMainArtistName(track)
  const featured = extractFeaturedArtists(track)

  if (!featured.length) return main
  return `${main} feat. ${featured.map((f) => f.name).join(', ')}`
}

/**
 * Créditos estructurados para UI interactiva.
 * @returns {{ title: string, albumId: string|null, main: {name, deezerId}, featured: {name, deezerId}[] }}
 */
export function getTrackCredits(track) {
  if (!track) {
    return { title: '', albumId: null, main: { name: '', deezerId: null }, featured: [] }
  }

  return {
    title: formatTrackTitle(track),
    albumId: track.albumDeezerId || track.albumId || null,
    main: {
      name: formatMainArtistName(track),
      deezerId: track.artistDeezerId || track.artistId || null,
    },
    featured: extractFeaturedArtists(track),
  }
}

/** Fusiona créditos Deezer (contributors) en una pista ya normalizada. */
export function mergeTrackCredits(track, { contributors = [], artist } = {}) {
  if (!track) return track
  const next = {
    ...track,
    contributors: contributors?.length ? contributors : track.contributors || [],
  }
  if (artist?.id && !next.artistDeezerId) {
    next.artistDeezerId = artist.id
  }
  if (artist?.name && (!next.artist || next.artist === 'Artista desconocido')) {
    next.artist = artist.name
  }
  next.featuredArtists = extractFeaturedArtists(next)
  return next
}
