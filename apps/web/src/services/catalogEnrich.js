import { searchDeezerAll } from './deezerApi'
import { filterOfficialSearchTracks } from '../utils/searchRank'

const enrichInflight = new Map()

/**
 * Ejecuta `fn` sobre items con concurrencia limitada (evita N+1 en ráfaga).
 */
export async function mapPool(items, concurrency, fn) {
  const list = Array.isArray(items) ? items : []
  if (!list.length) return []
  const out = new Array(list.length)
  let cursor = 0
  const workers = Math.min(Math.max(1, concurrency), list.length)

  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (cursor < list.length) {
        const index = cursor
        cursor += 1
        out[index] = await fn(list[index], index)
      }
    })
  )
  return out
}

function enrichKey(title, artist) {
  return `enrich:${String(title || '').trim()}|${String(artist || '').trim()}`.toLowerCase()
}

/**
 * Resuelve una pista Last.fm/metadata suelta a pista Deezer (dedupe inflight).
 */
export async function enrichLooseTrackToDeezer(row, { official = false } = {}) {
  const title = row?.title?.trim()
  const artist = (row?.artist || '').trim()
  if (!title) return row?.id ? row : null

  const key = enrichKey(title, artist)
  if (enrichInflight.has(key)) return enrichInflight.get(key)

  const job = (async () => {
    try {
      const { tracks } = await searchDeezerAll(`${title} ${artist}`, {
        artists: 0,
        albums: 0,
        tracks: official ? 5 : 1,
      })
      if (official) {
        // Score contra título (no query compuesto title+artist)
        const ranked = filterOfficialSearchTracks(tracks, title, 1)
        return ranked[0] || tracks[0] || (row.id ? row : null)
      }
      return tracks[0] || (row.id ? row : null)
    } catch {
      return row?.id ? row : null
    } finally {
      enrichInflight.delete(key)
    }
  })()

  enrichInflight.set(key, job)
  return job
}

/** Enriquecer lista suelta → Deezer, en paralelo acotado. */
export async function enrichLooseTracksToDeezer(tracks, { concurrency = 4, official = false } = {}) {
  const slice = (tracks || []).slice(0, 16)
  const mapped = await mapPool(slice, concurrency, (t) =>
    enrichLooseTrackToDeezer(t, { official })
  )
  return mapped.filter(Boolean)
}
