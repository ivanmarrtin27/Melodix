import {
  LIKED_PLAYLIST_ID,
  LIKED_PLAYLIST_NAME,
  generateLikedPlaylistCover,
  isLikedPlaylistId,
} from '../constants/likedPlaylist'

export { isLikedPlaylistId, LIKED_PLAYLIST_ID, LIKED_PLAYLIST_NAME, generateLikedPlaylistCover }

export function normalizeLibraryState(state) {
  const favorites = state.favorites || []
  const userPlaylists = (state.playlists || []).filter((p) => !isLikedPlaylistId(p.id))
  const prevLiked = (state.playlists || []).find((p) => isLikedPlaylistId(p.id))

  const likedPlaylist = {
    id: LIKED_PLAYLIST_ID,
    name: LIKED_PLAYLIST_NAME,
    cover: prevLiked?.cover || generateLikedPlaylistCover(),
    tracks: [...favorites],
    isSystem: true,
    createdAt: prevLiked?.createdAt || '1970-01-01T00:00:00.000Z',
  }

  return {
    ...state,
    favorites,
    playlists: [likedPlaylist, ...userPlaylists],
  }
}
