import { extractFeaturedArtists, parseFeaturedFromTitle } from '../../utils/formatArtist'
import { detectGenre } from '../../utils/helpers'

const DISCOGRAPHY_TYPES = new Set(['album', 'ep', 'compilation', 'mixtape', 'live'])

export function normalizeRecordType(raw) {
  const type = String(raw || 'album').toLowerCase().trim()
  if (type === 'single') return 'single'
  if (DISCOGRAPHY_TYPES.has(type)) return type
  return 'album'
}

export function normalizeDeezerAlbum(item) {
  if (!item?.id) return null

  const id = item.id
  const coverFromApi =
    item.cover_xl ||
    item.cover_big ||
    item.cover_medium ||
    ''

  return {
    deezerId: id,
    id: String(id),
    title: item.title,
    artist: item.artist?.name || 'Artista desconocido',
    artistDeezerId: item.artist?.id ?? null,
    cover: coverFromApi,
    releaseDate: item.release_date || '',
    trackCount: item.nb_tracks || item.tracks?.data?.length || 0,
    fans: Number.isFinite(Number(item.fans)) ? Number(item.fans) : null,
    genreId: item.genre_id ?? null,
    genres: Array.isArray(item.genres?.data)
      ? item.genres.data.map((g) => g.name).filter(Boolean)
      : Array.isArray(item.genres)
        ? item.genres
        : [],
    recordType: normalizeRecordType(item.record_type || item.type || 'album'),
    type: 'album',
  }
}

export function artistPictureUrl(artist) {
  if (!artist) return ''
  return (
    artist.picture_xl ||
    artist.picture_big ||
    artist.picture_medium ||
    artist.picture_small ||
    ''
  )
}

export function normalizeDeezerArtist(item) {
  if (!item?.id) return null
  return {
    id: String(item.id),
    deezerId: item.id,
    name: item.name,
    image: artistPictureUrl(item),
    fans: item.nb_fan || 0,
    albumCount: item.nb_album || 0,
  }
}

export function normalizeDeezerTrack(track, album) {
  const albumCover =
    album?.cover ||
    track.album?.cover_medium ||
    track.album?.cover_big ||
    track.album?.cover_xl ||
    ''

  const mainArtist = track.artist?.name || album?.artist || 'Artista desconocido'
  const rawForFeat = {
    title: track.title,
    artist: mainArtist,
    artistDeezerId: track.artist?.id || null,
    contributors: track.contributors || [],
  }

  return {
    id: `deezer-${track.id}`,
    deezerId: track.id,
    albumDeezerId: album?.deezerId || track.album?.id || null,
    album: album?.title || track.album?.title || '',
    source: 'deezer',
    title: track.title,
    artist: mainArtist,
    artistDeezerId: track.artist?.id || null,
    featuredArtists: extractFeaturedArtists(rawForFeat),
    contributors: track.contributors || [],
    duration: track.duration || 0,
    thumbnail: albumCover,
    albumCover,
    trackNumber: track.track_position,
    preview: track.preview || null,
    rank: Number(track.rank) || 0,
    explicit: Boolean(track.explicit_lyrics),
    genre: detectGenre(
      track.title,
      mainArtist,
      album?.genres || track.album?.genres || [],
      album?.genreId ?? track.album?.genre_id ?? null
    ),
    genreId: album?.genreId ?? track.album?.genre_id ?? null,
  }
}

export function normalizeChartArtist(item) {
  if (!item?.id) return null
  return {
    id: String(item.id),
    deezerId: item.id,
    name: item.name,
    image: artistPictureUrl(item),
  }
}

/** Quita marca de terceros en textos visibles del catálogo. */
export function scrubCatalogBrand(text) {
  return String(text || '')
    .replace(/\bDeezer\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function publicCatalogOwner(name) {
  const n = String(name || '').trim()
  if (!n) return ''
  if (/deezer/i.test(n)) return 'Editorial'
  return n
}

export function normalizeDeezerPlaylist(item) {
  if (!item?.id) return null
  const rawOwner = item.user?.name || item.creator?.name || ''
  return {
    id: String(item.id),
    deezerId: item.id,
    title: scrubCatalogBrand(item.title) || item.title,
    owner: publicCatalogOwner(rawOwner),
    cover:
      item.picture_xl ||
      item.picture_big ||
      item.picture_medium ||
      '',
    trackCount: item.nb_tracks || 0,
    fans: item.nb_fans || 0,
    type: 'playlist',
    official: /deezer|filtr|topsify/i.test(rawOwner),
  }
}

export function formatReleaseDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export { parseFeaturedFromTitle }
