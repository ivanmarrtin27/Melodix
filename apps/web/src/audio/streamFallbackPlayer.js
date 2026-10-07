/**
 * Fallback de audio cuando el embed oficial falla (error 150/153),
 * o cuando el ecualizador está activo y el stream está disponible.
 */

import {
  attachEqualizer,
  isEqualizerContextRunning,
  resumeEqualizerContext,
  syncEqualizer,
} from './equalizer'
import { getApiBase } from '../config/apiBase'

let audio = null
let generation = 0
let eqAttached = false
let pendingEq = null
/** @type {string | null} */
let currentMediaId = null

/** @type {{ onState?: (s: string, meta?: object) => void, onProgress?: (pos: number, dur: number, meta?: object) => void, onError?: (code: number, meta?: object) => void }} */
let listeners = {}

function ensureAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'

  audio.addEventListener('playing', () =>
    listeners.onState?.('playing', { mediaId: currentMediaId })
  )
  audio.addEventListener('pause', () => {
    if (!audio.ended) listeners.onState?.('paused', { mediaId: currentMediaId })
  })
  audio.addEventListener('waiting', () =>
    listeners.onState?.('buffering', { mediaId: currentMediaId })
  )
  audio.addEventListener('ended', () =>
    listeners.onState?.('ended', { mediaId: currentMediaId })
  )
  audio.addEventListener('error', () => {
    listeners.onError?.(-10, { mediaId: currentMediaId })
    listeners.onState?.('error', { mediaId: currentMediaId })
  })
  audio.addEventListener('timeupdate', () => {
    listeners.onProgress?.(audio.currentTime || 0, audio.duration || 0, {
      mediaId: currentMediaId,
    })
  })
  return audio
}

function eqWanted() {
  return Boolean(pendingEq?.enabled)
}

function ensureEqGraph() {
  if (!eqWanted()) return false
  if (eqAttached || !audio) return eqAttached
  eqAttached = attachEqualizer(audio)
  if (pendingEq) syncEqualizer(pendingEq)
  return eqAttached
}

function streamUrl(mediaId) {
  const base = getApiBase()
  const path = `/api/media/stream/${encodeURIComponent(mediaId)}`
  return base ? `${base}${path}` : path
}

function waitForPlayingOrError(el, gen, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn, arg) => {
      if (settled) return
      settled = true
      el.removeEventListener('playing', onPlaying)
      el.removeEventListener('error', onError)
      clearTimeout(timer)
      clearInterval(genWatch)
      fn(arg)
    }
    const onPlaying = () => finish(resolve)
    const onError = () => finish(reject, new Error('Error de stream'))
    const timer = setTimeout(
      () => finish(reject, new Error('Timeout de stream')),
      timeoutMs
    )
    const genWatch = setInterval(() => {
      if (gen !== generation) finish(reject, new Error('Cancelado'))
    }, 120)
    el.addEventListener('playing', onPlaying)
    el.addEventListener('error', onError)
    if (gen !== generation) {
      finish(reject, new Error('Cancelado'))
      return
    }
    // Ya estaba sonando (evento perdido)
    if (!el.paused && el.readyState >= 2) finish(resolve)
  })
}

export const streamFallbackPlayer = {
  setListeners(next) {
    listeners = next || {}
  },

  async play(mediaId, opts = {}) {
    if (!mediaId) throw new Error('Sin mediaId')
    const gen = ++generation
    currentMediaId = String(mediaId)
    const el = ensureAudio()

    if (eqWanted()) {
      ensureEqGraph()
      await resumeEqualizerContext()
      // Si el contexto sigue suspendido, el audio “suena” en silencio → fallar a embed
      if (!isEqualizerContextRunning()) {
        const err = new Error('AudioContext suspendido')
        listeners.onError?.(-11, { mediaId: currentMediaId })
        listeners.onState?.('error', { mediaId: currentMediaId })
        throw err
      }
    }

    listeners.onState?.('loading', { mediaId: currentMediaId })

    el.pause()
    el.src = streamUrl(mediaId)
    if (opts.volume != null) el.volume = Math.max(0, Math.min(1, opts.volume))

    // Listeners ANTES de play() para no perder el evento 'playing'
    const readyPromise = waitForPlayingOrError(el, gen, opts.timeoutMs ?? 12000)
    // Si play() falla antes del await, evitar unhandled rejection del timeout
    void readyPromise.catch(() => {})

    try {
      await el.play()
      await readyPromise
      if (gen !== generation) return
      listeners.onState?.('playing', { mediaId: currentMediaId })
    } catch (err) {
      if (gen !== generation) return
      try {
        el.pause()
      } catch {
        /* ignore */
      }
      listeners.onError?.(-10, { mediaId: currentMediaId })
      listeners.onState?.('error', { mediaId: currentMediaId })
      throw err
    }
  },

  pause() {
    audio?.pause()
  },

  resume() {
    if (eqWanted()) void resumeEqualizerContext()
    void audio?.play()?.catch(() => {})
  },

  stop() {
    generation += 1
    currentMediaId = null
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    listeners.onState?.('idle', {})
  },

  seek(seconds) {
    if (audio && Number.isFinite(seconds)) audio.currentTime = seconds
  },

  setVolume(vol) {
    if (audio) audio.volume = Math.max(0, Math.min(1, Number(vol) || 0))
  },

  /** Guarda ajustes EQ; conecta el grafo si hace falta (evita eco / sin efecto). */
  applyEqualizer(eqSettings) {
    pendingEq = eqSettings || null
    const el = ensureAudio()
    if (eqSettings?.enabled && !eqAttached) {
      eqAttached = attachEqualizer(el)
      void resumeEqualizerContext()
    }
    if (eqAttached) {
      syncEqualizer(eqSettings || { enabled: false })
    }
  },
}

export default streamFallbackPlayer
