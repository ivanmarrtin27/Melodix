/** Normalización de texto para ranking de búsqueda en catálogo (no resolve YT). */

export function normalizeMatchText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function compactMatchText(value = '') {
  return normalizeMatchText(value).replace(/\s+/g, '')
}

export function titleTokens(title) {
  return normalizeMatchText(title).split(' ').filter((t) => t.length > 1)
}
