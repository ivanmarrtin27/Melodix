import { deezerFetch } from './client'
import { artistsNamesMatch, normalizeArtistKey } from './homeBrand'
import {
  normalizeDeezerAlbum,
  normalizeDeezerArtist,
  normalizeDeezerTrack,
  normalizeRecordType,
} from './normalize'

const artistCache = new Map()
const ARTIST_DETAIL_CACHE_VER = 6
const ARTIST_DETAIL_TTL_MS = 5 * 60 * 1000

const artistIdByNameCache = new Map()

export async function fetchArtistDetail(artistId) {
  const key = `${ARTIST_DETAIL_CACHE_VER}:${artistId}`
  const cached = artistCache.get(key)
  if (cached && Date.now() - cached.ts < ARTIST_DETAIL_TTL_MS) {
    return cached.detail
  }

  const [artistData, topRes, relatedRes] = await Promise.all([
    deezerFetch(`/artist/${artistId}`),
    deezerFetch(`/artist/${artistId}/top?limit=50`),
    deezerFetch(`/artist/${artistId}/related?limit=12`).catch(() => ({ data: [] })),
  ])

  const profile = normalizeDeezerArtist(artistData)
  if (!profile) throw new Error('Artista no encontrado')

  const allReleases = await fetchAllArtistReleases(artistId)

  const topTracks = (topRes.data || [])
    .map((raw) => {
      const album = raw.album ? normalizeDeezerAlbum(raw.album) : null
      return normalizeDeezerTrack(raw, album)
    })
    .filter(Boolean)

  const ownedReleases = filterReleasesOwnedByArtist(allReleases, profile)
  const cleanReleases = await scrubFakeArtistReleases(ownedReleases, profile, topTracks)
  const { albums, eps, singles } = splitArtistDiscography(cleanReleases, topTracks)

  const related = (relatedRes.data || [])
    .map(normalizeDeezerArtist)
    .filter(Boolean)
    .slice(0, 12)

  // Géneros más frecuentes en el top (para chips del perfil)
  const genreCounts = new Map()
  for (const track of topTracks) {
    const g = track.genre
    if (!g || g === 'Otros') continue
    genreCounts.set(g, (genreCounts.get(g) || 0) + 1)
  }
  const genres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 4)

  const latestRelease = [...albums, ...eps, ...singles]
    .filter((r) => r.releaseDate)
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))[0] || null

  const detail = {
    ...profile,
    albums,
    eps,
    singles,
    topTracks,
    related,
    genres,
    latestRelease,
    fetchedAt: new Date().toISOString(),
  }

  artistCache.set(key, { detail, ts: Date.now() })
  return detail
}

async function fetchAllArtistReleases(artistId) {
  const releases = []
  let index = 0
  const pageSize = 100

  while (index < 400) {
    const data = await deezerFetch(
      `/artist/${artistId}/albums?limit=${pageSize}&index=${index}`
    )
    const batch = (data.data || []).map(normalizeDeezerAlbum).filter(Boolean)
    if (!batch.length) break
    releases.push(...batch)
    if (batch.length < pageSize || !data.next) break
    index += pageSize
  }

  const seen = new Set()
  return releases.filter((release) => {
    const id = String(release.deezerId)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function isJunkReleaseTitle(release) {
  const blob = `${release.title || ''} ${release.artist || ''}`.toLowerCase()
  return /karaoke|tribute|in the style of|made famous|cover version|instrumental covers|best of the best|megamix|compilation|various artists|dubteknik|zentrum kagran/.test(
    blob
  )
}

function filterReleasesOwnedByArtist(releases, profile) {
  const artistId = String(profile.deezerId || profile.id || '')
  const artistName = profile.name || ''

  return (releases || []).filter((release) => {
    if (!release?.deezerId) return false
    if (isJunkReleaseTitle(release)) return false

    const type = normalizeRecordType(release.recordType)
    const releaseArtistId = release.artistDeezerId != null ? String(release.artistDeezerId) : ''
    const hasArtistName =
      release.artist && release.artist !== 'Artista desconocido'
    const nameOk = hasArtistName ? artistsNamesMatch(release.artist, artistName) : false

    // /artist/{id}/albums no incluye artista: se asume del perfil
    if (releaseArtistId && artistId && releaseArtistId !== artistId) return false
    if (hasArtistName && !nameOk && releaseArtistId !== artistId) return false

    if (type === 'compilation' || type === 'live') {
      if (hasArtistName && !nameOk) return false
    }

    // Solo rechazar vacío si Deezer confirmó 0 pistas
    if (release.trackCount === 0 && release.fans == null) return false

    return true
  })
}

function releaseAgeDays(release) {
  if (!release?.releaseDate) return null
  const ts = new Date(release.releaseDate).getTime()
  if (!Number.isFinite(ts)) return null
  return Math.floor((Date.now() - ts) / 86_400_000)
}

async function scrubFakeArtistReleases(releases, profile, topTracks = []) {
  const artistId = String(profile.deezerId || profile.id || '')
  const topAlbumIds = new Set(
    (topTracks || [])
      .map((track) => track.albumDeezerId)
      .filter(Boolean)
      .map(String)
  )

  const trusted = []
  const toVerify = []

  for (const release of releases || []) {
    const id = String(release.deezerId)
    const type = normalizeRecordType(release.recordType)

    if (topAlbumIds.has(id)) {
      trusted.push(release)
      continue
    }

    if (type === 'single') {
      trusted.push(release)
      continue
    }

    // Fans ya vienen en /artist/.../albums: filtrar sin llamadas extra
    if (release.fans != null) {
      const ageDays = releaseAgeDays(release)
      const isRecent = ageDays != null && ageDays >= 0 && ageDays <= 75
      const tracks = release.trackCount || 0
      const minFans = tracks >= 3 ? 25 : 20
      if (release.fans < minFans && !(isRecent && release.fans >= 5)) {
        continue
      }
      trusted.push(release)
      continue
    }

    toVerify.push(release)
  }

  if (!toVerify.length) return trusted

  const verified = []
  const chunkSize = 6
  for (let i = 0; i < toVerify.length; i += chunkSize) {
    const chunk = toVerify.slice(i, i + chunkSize)
    const rows = await Promise.all(
      chunk.map(async (release) => {
        try {
          const data = await deezerFetch(`/album/${release.deezerId}`)
          const albumArtistId = data?.artist?.id != null ? String(data.artist.id) : ''
          if (albumArtistId && artistId && albumArtistId !== artistId) return null

          const fans = Number(data?.fans) || 0
          const tracks =
            Number(data?.nb_tracks) ||
            data?.tracks?.data?.length ||
            release.trackCount ||
            0
          if (tracks <= 0) return null

          const ageDays = releaseAgeDays({
            releaseDate: data?.release_date || release.releaseDate,
          })
          const isRecent = ageDays != null && ageDays >= 0 && ageDays <= 75
          const minFans = tracks >= 3 ? 25 : 12
          if (fans < minFans && !(isRecent && fans >= 5)) return null

          return {
            ...release,
            trackCount: tracks,
            fans,
            artist: data?.artist?.name || release.artist,
            artistDeezerId: data?.artist?.id ?? release.artistDeezerId,
            releaseDate: data?.release_date || release.releaseDate,
            recordType: normalizeRecordType(
              data?.record_type || release.recordType || 'album'
            ),
          }
        } catch {
          return null
        }
      })
    )
    verified.push(...rows.filter(Boolean))
  }

  return [...trusted, ...verified]
}

function releaseYear(release) {
  if (!release?.releaseDate) return 0
  const year = new Date(release.releaseDate).getFullYear()
  return Number.isFinite(year) ? year : 0
}

function sortByReleaseDateDesc(a, b) {
  return new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0)
}

function splitArtistDiscography(allReleases, topTracks = []) {
  const topAlbumIds = new Set(
    topTracks
      .map((track) => track.albumDeezerId)
      .filter(Boolean)
      .map(String)
  )

  const normalized = allReleases.map((release) => ({
    ...release,
    recordType: normalizeRecordType(release.recordType),
  }))

  const newestYear = normalized.reduce(
    (max, release) => Math.max(max, releaseYear(release)),
    0
  )
  const minYear = newestYear > 0 ? Math.max(2008, newestYear - 16) : 2008

  const relevant = normalized.filter((release) => {
    const year = releaseYear(release)
    if (!year) return topAlbumIds.has(String(release.deezerId))
    if (year >= minYear) return true
    return topAlbumIds.has(String(release.deezerId))
  })

  const albums = relevant
    .filter((release) => {
      const t = release.recordType
      return t === 'album' || t === 'mixtape'
    })
    .sort(sortByReleaseDateDesc)

  const eps = relevant
    .filter((release) => release.recordType === 'ep')
    .sort(sortByReleaseDateDesc)

  const singles = relevant
    .filter((release) => release.recordType === 'single')
    .sort(sortByReleaseDateDesc)

  for (const id of topAlbumIds) {
    const already =
      albums.some((r) => String(r.deezerId) === id) ||
      eps.some((r) => String(r.deezerId) === id) ||
      singles.some((r) => String(r.deezerId) === id)
    if (already) continue
    const match = normalized.find((release) => String(release.deezerId) === id)
    if (!match) continue
    if (match.recordType === 'single') singles.unshift(match)
    else if (match.recordType === 'ep') eps.unshift(match)
    else if (match.recordType === 'album' || match.recordType === 'mixtape') albums.unshift(match)
  }

  return {
    albums: dedupeReleases(albums).sort(sortByReleaseDateDesc),
    eps: dedupeReleases(eps).sort(sortByReleaseDateDesc),
    singles: dedupeReleases(singles).sort(sortByReleaseDateDesc),
  }
}

function dedupeReleases(list) {
  const seen = new Set()
  return list.filter((release) => {
    const id = String(release.deezerId)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

/** Resuelve un nombre de artista a ID Deezer (para feats / créditos interactivos). */
export async function resolveArtistIdByName(name) {
  const key = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
  if (!key) return null
  if (artistIdByNameCache.has(key)) return artistIdByNameCache.get(key)

  try {
    const search = await deezerFetch(`/search/artist?q=${encodeURIComponent(name)}&limit=5`)
    const rows = search.data || []
    const want = key
    let best = rows[0] || null
    for (const row of rows) {
      const n = String(row?.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .trim()
      if (n === want) {
        best = row
        break
      }
    }
    const id = best?.id != null ? String(best.id) : null
    artistIdByNameCache.set(key, id)
    return id
  } catch {
    artistIdByNameCache.set(key, null)
    return null
  }
}

/** Top tracks de un artista (para recomendaciones). */
export async function fetchArtistTopTracks(artistId, limit = 10) {
  if (!artistId) return []
  try {
    const top = await deezerFetch(`/artist/${artistId}/top?limit=${limit}`)
    return (top.data || [])
      .map((raw) => {
        const album = raw.album ? normalizeDeezerAlbum(raw.album) : null
        return normalizeDeezerTrack(raw, album)
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

/** Artistas relacionados en Deezer. */
export async function fetchRelatedArtists(artistId, limit = 6) {
  if (!artistId) return []
  try {
    const res = await deezerFetch(`/artist/${artistId}/related?limit=${limit}`)
    return (res.data || []).map(normalizeDeezerArtist).filter(Boolean)
  } catch {
    return []
  }
}
