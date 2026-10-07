import { iframePlayer } from '../audio/iframePlayer'
import { unlockAudioForPlayback } from '../audio/equalizer'

let silentEl = null

/**
 * Llamar en pointerdown/click del usuario ANTES de awaits de reproducción.
 * Desbloquea autoplay (AudioContext + embed muted + audio silencioso).
 */
export function primePlaybackIntent() {
  void iframePlayer.init().catch(() => {})
  try {
    iframePlayer.unlock()
  } catch {
    /* ignore */
  }
  void unlockAudioForPlayback().catch(() => {})

  // Desbloqueo HTMLAudioElement (ruta stream / EQ) en el mismo gesto
  try {
    if (!silentEl) {
      silentEl = new Audio()
      silentEl.preload = 'auto'
      silentEl.volume = 0.001
      // Silencio casi total; play() marca engagement media
      silentEl.src =
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
    }
    const p = silentEl.play()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        try {
          silentEl.pause()
          silentEl.currentTime = 0
        } catch {
          /* ignore */
        }
      }).catch(() => {})
    }
  } catch {
    /* ignore */
  }
}
