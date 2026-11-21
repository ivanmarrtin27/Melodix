export const PLAYBACK_MODES = [
  { id: 'ordered', shuffle: false, repeat: 'off', label: 'Orden de la lista' },
  { id: 'shuffle', shuffle: true, repeat: 'off', label: 'Aleatorio' },
  { id: 'repeat-all', shuffle: false, repeat: 'all', label: 'Repetir lista o álbum' },
  { id: 'repeat-one', shuffle: false, repeat: 'one', label: 'Repetir canción' },
]

export function getPlaybackModeIndex({ shuffle, repeat }) {
  if (repeat === 'one') return 3
  if (repeat === 'all') return 2
  if (shuffle) return 1
  return 0
}

export function getPlaybackMode(state) {
  return PLAYBACK_MODES[getPlaybackModeIndex(state)]
}

export function getNextPlaybackMode(state) {
  const idx = getPlaybackModeIndex(state)
  return PLAYBACK_MODES[(idx + 1) % PLAYBACK_MODES.length]
}
