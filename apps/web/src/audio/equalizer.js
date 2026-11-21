/**
 * Ecualizador Web Audio (7 bandas) sobre un HTMLAudioElement.
 * Solo aplica al motor stream (el iframe cross-origin no permite Web Audio).
 */

import { EQ_BANDS, normalizeEqBands } from '../config/equalizerPresets'

let audioEl = null
let ctx = null
let sourceNode = null
let filters = []
let outputGain = null
let wired = false
let enabled = false
let currentBands = normalizeEqBands()

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) throw new Error('Web Audio no disponible')
    ctx = new AC()
  }
  return ctx
}

function buildFilters(audioContext) {
  return EQ_BANDS.map((band) => {
    const filter = audioContext.createBiquadFilter()
    filter.type = band.type
    filter.frequency.value = band.freq
    filter.Q.value = band.q
    filter.gain.value = 0
    return filter
  })
}

function applyGains() {
  if (!filters.length) return
  const gains = enabled ? currentBands : EQ_BANDS.map(() => 0)
  filters.forEach((filter, i) => {
    filter.gain.setTargetAtTime(gains[i] ?? 0, ctx.currentTime, 0.015)
  })
}

/**
 * Conecta el <audio> al grafo EQ una sola vez.
 * @param {HTMLAudioElement} el
 */
export function attachEqualizer(el) {
  if (!el) return false
  audioEl = el
  try {
    ensureContext()
  } catch {
    return false
  }

  if (wired) {
    void ctx.resume()
    applyGains()
    return true
  }

  try {
    sourceNode = ctx.createMediaElementSource(el)
    filters = buildFilters(ctx)
    outputGain = ctx.createGain()
    outputGain.gain.value = 1

    let node = sourceNode
    for (const filter of filters) {
      node.connect(filter)
      node = filter
    }
    node.connect(outputGain)
    outputGain.connect(ctx.destination)

    wired = true
    applyGains()
    void ctx.resume()
    return true
  } catch (err) {
    console.warn('[eq] no se pudo conectar', err)
    return false
  }
}

export function setEqualizerEnabled(value) {
  enabled = Boolean(value)
  applyGains()
  if (enabled && ctx?.state === 'suspended') void ctx.resume()
}

export function setEqualizerBands(bands) {
  currentBands = normalizeEqBands(bands)
  applyGains()
}

export function syncEqualizer({ enabled: on, bands } = {}) {
  if (bands) setEqualizerBands(bands)
  if (on != null) setEqualizerEnabled(on)
}

export function resumeEqualizerContext() {
  if (ctx?.state === 'suspended') return ctx.resume()
  return Promise.resolve()
}

/** Crear/reanudar AudioContext en el gesto del usuario (evita stream silencioso). */
export function unlockAudioForPlayback() {
  try {
    ensureContext()
  } catch {
    return Promise.resolve()
  }
  if (ctx?.state === 'suspended') return ctx.resume()
  return Promise.resolve()
}

export function isEqualizerContextRunning() {
  return Boolean(ctx && ctx.state === 'running')
}

export function isEqualizerWired() {
  return wired
}

export function getEqualizerState() {
  return {
    wired,
    enabled,
    bands: [...currentBands],
  }
}
