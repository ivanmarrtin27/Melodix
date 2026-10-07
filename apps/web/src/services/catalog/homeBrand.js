import { PANORAMA_ARTISTS } from './constants'

const PANORAMA_ARTIST_LOOKUP = new Set(
  PANORAMA_ARTISTS.map((name) => name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''))
)

export function artistMatchesPanorama(artistName = '') {
  const norm = artistName
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
  if (PANORAMA_ARTIST_LOOKUP.has(norm)) return true
  for (const key of PANORAMA_ARTIST_LOOKUP) {
    if (norm.includes(key) || key.includes(norm)) return true
  }
  return false
}

/** Material que no encaja con Melodix (urbano / latino / pop comercial ES-LATAM). */
export const OFF_BRAND_HOME_ALBUM =
  /soundtrack|original motion picture|music from the (?:motion|film|movie)|original score|\bscore\b|broadway|cast recording|cast album|orchestra|philharmonic|symphon|opera\b|ballet|video game|game soundtrack|disney|pixar|marvel studios|star wars|harry potter|lord of the rings|lofi beats|study beats|piano covers|meditation|yoga|white noise|nature sounds|audiobook|podcast|christmas hits|kids songs|nursery rhymes|classical hits|baroque|mozart|beethoven|bach\b|hardcore punk|noise rock|industrial|deathcore|metalcore|\bpunk\b|\bmetal\b|grindcore|post-punk|experimental noise/i

/** Pistas de escena comercial latina / ES (no basta "hip-hop" genérico USA). */
export const ON_BRAND_HOME_HINT =
  /reggaeton|reggaet[oó]n|urbano|latin(?:o|a)?|dembow|perreo|espa[nñ]ol|castellano|corrido|salsa|bachata|cumbia|mambo|merengue|rumba|flamenco|trap (?:latino|espa[nñ]ol)|latin trap|pop latino|musica urbana|música urbana/i

/** Artistas / títulos que se cuelan en charts editoriales y no son el panorama Melodix. */
const BLOCKED_HOME_ARTISTS =
  /^(planet b|the locust|dead cross|kool keith|dr\.?\s*octagon|saiko)$/i

export function isBlockedHomeArtist(artistName = '') {
  const raw = String(artistName || '').trim()
  if (!raw) return false
  if (BLOCKED_HOME_ARTISTS.test(raw)) return true
  const primary = raw.split(/[,&]| feat\.? | ft\.? |\s+x\s+/i)[0].trim()
  return primary !== raw && BLOCKED_HOME_ARTISTS.test(primary)
}

export function isOffBrandHomeAlbum(album) {
  if (!album) return true
  const title = String(album.title || '')
  const artist = String(album.artist || '')
  const blob = `${title} ${artist}`
  if (isBlockedHomeArtist(artist)) return true
  if (OFF_BRAND_HOME_ALBUM.test(blob)) return true
  if (/various artists|varios artistas|multi-?artists|compilation/i.test(artist)) return true
  if (
    album.recordType === 'compilation' &&
    !artistMatchesPanorama(artist) &&
    !ON_BRAND_HOME_HINT.test(blob)
  ) {
    return true
  }
  return false
}

/** ¿Encaja en el catálogo de la app? Solo panorama o escena urbana/latina comercial. */
export function isOnBrandHomeAlbum(album) {
  if (!album || isOffBrandHomeAlbum(album)) return false
  if (artistMatchesPanorama(album.artist)) return true
  const blob = `${album.title || ''} ${album.artist || ''}`
  if (ON_BRAND_HOME_HINT.test(blob)) return true
  return false
}

export function normalizeArtistKey(name = '') {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function artistsNamesMatch(a, b) {
  const na = normalizeArtistKey(a)
  const nb = normalizeArtistKey(b)
  if (!na || !nb) return false
  if (na === nb) return true
  // Evita matches demasiado cortos (ej. "sa" dentro de cualquier cosa)
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) {
    return true
  }
  return false
}
