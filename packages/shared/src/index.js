/**
 * @melodix/shared — lógica portable web + futuro Expo.
 * Sin React, sin DOM, sin import.meta.env.
 */

export const VERSION = '0.1.0'

export { ACCENT_COLORS } from './accentColors.js'
export {
  PLAYBACK_MODES,
  getPlaybackModeIndex,
  getPlaybackMode,
  getNextPlaybackMode,
} from './playbackMode.js'
export { isProviderMediaId, pickProviderMediaId } from './mediaId.js'
export { shuffleArray, seededShuffle } from './shuffle.js'
export {
  getGreeting,
  getHomeGreeting,
  getHomeGreetingSubtitle,
  formatDuration,
  formatMinutes,
  getInitials,
  formatDate,
} from './formatters.js'
export {
  normalizeMatchText,
  compactMatchText,
  titleTokens,
} from './trackMatch.js'
export {
  scoreArtistForQuery,
  dedupeArtistsByName,
  filterCredibleSearchArtists,
  rankArtistsByQuery,
  scoreAlbumForQuery,
  rankAlbumsByQuery,
  scoreTrackForQuery,
  filterOfficialSearchTracks,
} from './searchRank.js'
export {
  GENRES,
  getGenreById,
  GENRE_PLAYLIST_QUERIES,
  GENRE_MAP_VERSION,
  DEEZER_GENRE_ID_MAP,
  normalizeGenreLabel,
  detectGenre,
} from './genres.js'
export {
  COVER_SIZE,
  COVER_SIZE_LARGE,
  isYoutubeVideoThumb,
  isSquareCoverUrl,
  upscaleCoverUrl,
  pickThumbnailFromList,
  getTrackCoverUrl,
  getTrackCoverFallback,
} from './coverArt.js'
export { resolveApiBase, apiUrl } from './apiBase.js'
