import { formatTrackArtists } from '../../utils/formatArtist'
import { getTrackCoverUrl } from '../../utils/coverArt'

export function setupMediaSession(track, store) {
  if (!('mediaSession' in navigator)) return

  const cover = getTrackCoverUrl(track, 512) || track.albumCover || track.thumbnail
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: formatTrackArtists(track),
    artwork: cover ? [{ src: cover, sizes: '512x512', type: 'image/jpeg' }] : [],
  })

  navigator.mediaSession.setActionHandler('play', () => store.getState().togglePlay())
  navigator.mediaSession.setActionHandler('pause', () => store.getState().togglePlay())
  navigator.mediaSession.setActionHandler('previoustrack', () => store.getState().previous())
  navigator.mediaSession.setActionHandler('nexttrack', () => store.getState().next())
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime != null) store.getState().seek(details.seekTime)
  })
}

export function syncMediaSessionPlaybackState(isPlaying) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }
}
