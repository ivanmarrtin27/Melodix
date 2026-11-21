import { usePlayerStore } from '../stores/playerStore'
import { lsGet, lsRemove, lsSet, STORAGE_KEYS } from './storage'

const SESSION_KEY = STORAGE_KEYS.PLAYER_SESSION
let persistTimer = null
let persistenceStarted = false

function snapshotFromState(state) {
  if (!state?.currentTrack) return null
  return {
    currentTrack: state.currentTrack,
    queue: state.queue || [],
    queueIndex: state.queueIndex ?? 0,
    originalQueue: state.originalQueue || state.queue || [],
    progress: state.progress ?? 0,
    duration: state.duration ?? 0,
    volume: state.volume ?? 0.8,
    shuffle: Boolean(state.shuffle),
    repeat: state.repeat || 'off',
    savedAt: Date.now(),
  }
}

export function savePlayerSession(state = usePlayerStore.getState()) {
  const snapshot = snapshotFromState(state)
  if (!snapshot) {
    lsRemove(SESSION_KEY)
    return
  }
  lsSet(SESSION_KEY, snapshot)
}

export function clearPlayerSession() {
  lsRemove(SESSION_KEY)
}

export function restorePlayerSessionIntoStore() {
  const saved = lsGet(SESSION_KEY)
  if (!saved?.currentTrack) return false

  usePlayerStore.setState({
    currentTrack: saved.currentTrack,
    queue: Array.isArray(saved.queue) ? saved.queue : [],
    queueIndex: Number.isFinite(saved.queueIndex) ? saved.queueIndex : 0,
    originalQueue: Array.isArray(saved.originalQueue)
      ? saved.originalQueue
      : Array.isArray(saved.queue)
        ? saved.queue
        : [],
    progress: Number.isFinite(saved.progress) ? saved.progress : 0,
    duration: Number.isFinite(saved.duration) ? saved.duration : 0,
    volume: Number.isFinite(saved.volume) ? saved.volume : 0.8,
    shuffle: Boolean(saved.shuffle),
    repeat: saved.repeat || 'off',
    isPlaying: false,
    isLoading: false,
    playerState: 'idle',
    playerScreen: 'mini',
    isExpanded: false,
    morphRect: null,
    error: null,
    isPreview: false,
  })

  return true
}

function flushPlayerSession() {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  savePlayerSession()
}

export function initPlayerSessionPersistence() {
  if (persistenceStarted || typeof window === 'undefined') return
  persistenceStarted = true

  usePlayerStore.subscribe((state) => {
    if (!state.currentTrack) {
      flushPlayerSession()
      return
    }
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persistTimer = null
      savePlayerSession()
    }, 350)
  })

  const onHide = () => flushPlayerSession()
  window.addEventListener('pagehide', onHide)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide()
  })
}
