export { getDeezerApiBase } from './catalog/client'
export { FEATURED_SEED_ARTISTS, FEATURED_ALBUM_IDS, PANORAMA_ARTISTS } from './catalog/constants'
export { searchDeezerAll } from './catalog/search'
export { fetchArtistDetail, fetchArtistTopTracks, fetchRelatedArtists, resolveArtistIdByName } from './catalog/artist'
export {
  normalizeRecordType,
  normalizeDeezerAlbum,
  normalizeDeezerArtist,
  normalizeDeezerTrack,
  normalizeChartArtist,
  normalizeDeezerPlaylist,
  artistPictureUrl,
  scrubCatalogBrand,
  publicCatalogOwner,
  formatReleaseDate,
  parseFeaturedFromTitle,
} from './catalog/normalize'
export {
  fetchDeezerTrackCredits,
  enrichTrackWithCredits,
  fetchAlbumDetail,
  putAlbumDetailInCache,
  enrichAlbumTracksCredits,
} from './catalog/album'
export {
  loadChartBundle,
  fetchChartTopTracks,
  fetchChartTopArtists,
  fetchPanoramaTopTracks,
  fetchSpainTopTracks,
  getPanoramaTopSource,
  getPanoramaTopWeekLabel,
} from './catalog/charts'
export {
  fetchPanoramaHomeData,
  fetchPanoramaAlbums,
  fetchPanoramaArtists,
  fetchNovedadesAlbums,
  getPanoramaAlbumsUpdatedAt,
  invalidatePanoramaCache,
} from './catalog/homeCurated'
export {
  artistMatchesPanorama,
  isBlockedHomeArtist,
  isOffBrandHomeAlbum,
  isOnBrandHomeAlbum,
  normalizeArtistKey,
  artistsNamesMatch,
} from './catalog/homeBrand'
export { fetchSimilarTracks } from './catalog/similar'
export { fetchGenreCatalog, fetchPlaylistTracks, scoreOfficialPlaylist } from './catalog/genre'

import { searchDeezerAll } from './catalog/search'
import { fetchAlbumDetail } from './catalog/album'
import { fetchSimilarTracks } from './catalog/similar'
import { fetchArtistDetail } from './catalog/artist'
import { fetchChartTopTracks } from './catalog/charts'

const deezerApi = {
  async search(query, limit = 15, signal) {
    const { tracks } = await searchDeezerAll(query, {
      artists: 0,
      albums: 0,
      tracks: limit,
      playlists: 0,
    })
    return tracks
  },

  searchAlbums(query, limit = 10) {
    return searchDeezerAll(query, {
      artists: 0,
      albums: limit,
      tracks: 0,
      playlists: 0,
    }).then(
      (r) => r.albums
    )
  },

  getAlbum(albumId) {
    return fetchAlbumDetail(albumId)
  },

  getSimilarTracks(track, limit = 12) {
    return fetchSimilarTracks(track, limit)
  },

  async getArtistTop(artistId, limit = 10) {
    const detail = await fetchArtistDetail(artistId)
    return (detail.topTracks || []).slice(0, limit)
  },

  async getChart(limit = 20) {
    return fetchChartTopTracks(limit)
  },
}

export default deezerApi
