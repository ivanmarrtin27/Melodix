import { get, set, del } from 'idb-keyval'

const LS_PREFIX = 'melodix_'

export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${key}`)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function lsSet(key, value) {
  localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(value))
}

export function lsRemove(key) {
  localStorage.removeItem(`${LS_PREFIX}${key}`)
}

export function lsClear() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX))
  keys.forEach((k) => localStorage.removeItem(k))
}

export async function idbGet(key, fallback = null) {
  const val = await get(`${LS_PREFIX}${key}`)
  return val ?? fallback
}

export async function idbSet(key, value) {
  await set(`${LS_PREFIX}${key}`, value)
}

export async function idbDel(key) {
  await del(`${LS_PREFIX}${key}`)
}

export const STORAGE_KEYS = {
  USER: 'user',
  SETTINGS: 'settings',
  RECENT: 'recent',
  FAVORITES: 'favorites',
  PLAYLISTS: 'playlists',
  LIBRARY: 'melodix_library_v2',
  ALBUMS: 'albums',
  STATS: 'stats',
  SEARCH_HISTORY: 'search_history',
  PLAYER_SESSION: 'player_session',
}
