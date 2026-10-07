import { extractFeaturedArtists, mergeTrackCredits, parseFeaturedFromTitle } from '../../utils/formatArtist'
import { deezerFetch } from './client'
import { normalizeDeezerAlbum, normalizeDeezerTrack } from './normalize'

const albumCache = new Map()

export async function fetchAlbumDetail(deezerId) {
  const cacheKey = `v4:${String(deezerId ?? '').trim()}`
  if (
    !cacheKey ||
    cacheKey === 'v4:' ||
    cacheKey === 'v4:undefined' ||
    cacheKey === 'v4:null' ||
    cacheKey === 'v4:NaN'
  ) {
    throw new Error('ID de álbum no válido')
  }
  if (albumCache.has(cacheKey)) return albumCache.get(cacheKey)

  const data = await deezerFetch(`/album/${deezerId}`)
  if (data?.error || !data?.id) {
    const msg = data?.error?.message || ''
    if (/quota|limit|429/i.test(msg) || data?.error?.code === 4) {
      throw Object.assign(new Error('Demasiadas peticiones. Espera unos segundos y reintenta.'), {
        status: 429,
      })
    }
    throw new Error(msg || 'Álbum no encontrado')
  }

  const album = normalizeDeezerAlbum(data)
  if (!album) throw new Error('Álbum no encontrado')

  // Abrir ya con la tracklist del álbum (sin N peticiones /track que provocan 429).
  const baseTracks = (data.tracks?.data || []).map((t) => normalizeDeezerTrack(t, album))
  const detail = {
    ...album,
    trackCount: baseTracks.length,
    tracks: baseTracks,
    label: data.label,
    genres: data.genres?.data?.map((g) => g.name) || [],
  }

  albumCache.set(cacheKey, detail)
  return detail
}

/** Actualiza caché tras enriquecer feats (para no volver a pedir /track). */
export function putAlbumDetailInCache(detail) {
  const id = detail?.deezerId ?? detail?.id
  if (id == null || id === '') return
  albumCache.set(`v4:${String(id)}`, detail)
}

/** Detalle de pista Deezer (incluye contributors / feats). */
export async function fetchDeezerTrackCredits(deezerTrackId) {
  if (!deezerTrackId) return null
  const id = String(deezerTrackId).replace(/^deezer-/, '')
  if (!id) return null

  try {
    const data = await deezerFetch(`/track/${id}`)
    if (!data?.id) return null
    return {
      contributors: data.contributors || [],
      artist: data.artist || null,
      title: data.title || null,
    }
  } catch {
    return null
  }
}

/** Enriquece una pista normalizada con collaborators oficiales de Deezer. */
export async function enrichTrackWithCredits(track) {
  if (!track) return track
  const already =
    (Array.isArray(track.contributors) && track.contributors.length > 1) ||
    (Array.isArray(track.featuredArtists) && track.featuredArtists.length > 0)
  // Si ya hay feats parseados del título, igual intentamos IDs vía /track
  const deezerId = track.deezerId || String(track.id || '').replace(/^deezer-/, '')
  if (!deezerId || !/^\d+$/.test(String(deezerId))) return track

  const detail = await fetchDeezerTrackCredits(deezerId)
  if (!detail) return track

  const merged = mergeTrackCredits(track, detail)
  // Si el título Deezer trae feat y el nuestro no, preferir título API
  if (detail.title && !parseFeaturedFromTitle(track.title).length) {
    const fromApiTitle = parseFeaturedFromTitle(detail.title)
    if (fromApiTitle.length) {
      merged.title = detail.title
      merged.featuredArtists = extractFeaturedArtists({
        ...merged,
        title: detail.title,
      })
    }
  }

  // Evita trabajo inútil si no cambió nada
  if (already && merged.featuredArtists?.length === track.featuredArtists?.length) {
    const sameIds = merged.featuredArtists.every(
      (f, i) => f.name === track.featuredArtists[i]?.name
    )
    if (sameIds) return { ...merged }
  }

  return merged
}

/**
 * Completa feats/colaboradores por pista (Deezer /track/{id}).
 * Llamar desde la UI y setState cuando termine — la ficha del álbum no trae contributors.
 */
export async function enrichAlbumTracksCredits(tracks, concurrency = 3) {
  if (!tracks?.length) return []
  const out = tracks.slice()
  let cursor = 0

  const worker = async () => {
    while (cursor < out.length) {
      const index = cursor
      cursor += 1
      const track = out[index]
      if (!track) continue
      if (
        (Array.isArray(track.contributors) && track.contributors.length > 1) ||
        (Array.isArray(track.featuredArtists) && track.featuredArtists.length > 0)
      ) {
        continue
      }
      try {
        out[index] = await enrichTrackWithCredits(track)
        // Ritmo suave para no saturar Deezer (429)
        await new Promise((r) => setTimeout(r, 60))
      } catch {
        /* mantener pista base */
      }
    }
  }

  const workers = Math.min(concurrency, out.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return out
}
