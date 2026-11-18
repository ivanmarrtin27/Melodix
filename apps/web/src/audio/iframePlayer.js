/**
 * Puente Demus (web):
 * App → iframe host → IFrame Player API → HTML5 → audio del SO
 *
 * Un solo iframe (nunca se destruye entre canciones).
 */

const HOST_SRC = '/embed-host.html'
const IFRAME_ID = 'mediolix-embed-host'

/** @typedef {'idle'|'loading'|'buffering'|'playing'|'paused'|'ended'|'error'} EmbedState */

let host = null
let hostLoaded = false
let playerReady = false
let pendingMediaId = null
/** @type {{ volume?: number } | null} */
let pendingPlayOpts = null
let generation = 0
/** @type {ReturnType<typeof setInterval> | null} */
let readyWaitTimer = null
/** @type {Promise<void> | null} */
let initPromise = null
let messageBound = false

/** @type {{ onState?: (s: EmbedState, meta?: object) => void, onProgress?: (pos: number, dur: number, meta?: object) => void, onReady?: () => void, onError?: (code: number, meta?: object) => void }} */
let listeners = {}

function clearReadyWait() {
  if (readyWaitTimer) {
    clearInterval(readyWaitTimer)
    readyWaitTimer = null
  }
}

function postToHost(cmd, payload = {}) {
  if (!host?.contentWindow) return false
  try {
    host.contentWindow.postMessage(
      { target: 'mediolix-embed', cmd, payload },
      window.location.origin
    )
    return true
  } catch {
    return false
  }
}

function flushPending() {
  if (!pendingMediaId || !playerReady) return
  const id = pendingMediaId
  const opts = pendingPlayOpts || {}
  pendingMediaId = null
  pendingPlayOpts = null
  const payload = { mediaId: id }
  if (opts.volume != null) payload.volume = opts.volume
  postToHost('load', payload)
}

function onMessage(event) {
  if (event.origin !== window.location.origin) return
  const msg = event.data
  if (!msg || msg.source !== 'mediolix-embed') return

  if (msg.type === 'boot') {
    hostLoaded = true
    return
  }

  if (msg.type === 'ready') {
    playerReady = true
    listeners.onReady?.()
    flushPending()
    return
  }

  // pong solo confirma ready real — no marcar listo antes de tiempo
  if (msg.type === 'pong') {
    if (msg.data?.ready) {
      playerReady = true
      flushPending()
    }
    return
  }

  if (msg.type === 'state') {
    listeners.onState?.(msg.data?.state || 'idle', msg.data || {})
    return
  }

  if (msg.type === 'progress') {
    listeners.onProgress?.(
      Number(msg.data?.position) || 0,
      Number(msg.data?.duration) || 0,
      msg.data || {}
    )
    return
  }

  if (msg.type === 'error') {
    const code = Number(msg.data?.code) || -1
    listeners.onError?.(code, msg.data || {})
    // No emitir onState('error') aquí: el store decide si reintenta con otro mediaId
    return
  }
}

function ensureHost() {
  if (host && document.body.contains(host)) return host

  let el = document.getElementById(IFRAME_ID)
  if (!el) {
    el = document.createElement('iframe')
    el.id = IFRAME_ID
    el.title = 'Mediolix playback host'
    el.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    el.setAttribute('allowfullscreen', 'true')
    el.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    // Tamaño real en viewport. display:none / 1×1 / off-screen rompe el audio.
    Object.assign(el.style, {
      position: 'fixed',
      width: '320px',
      height: '180px',
      left: '8px',
      bottom: '8px',
      opacity: '0.01',
      pointerEvents: 'none',
      border: '0',
      zIndex: '1',
    })
    document.body.appendChild(el)
  }

  host = el
  return host
}

function loadIframeHost() {
  // Host listo con la versión actual → no recargar
  if (playerReady && host) {
    const src = host.getAttribute('src') || ''
    if (src.includes('v=9')) return Promise.resolve()
    // Versión antigua → forzar recarga
    playerReady = false
    hostLoaded = false
    initPromise = null
  }
  if (initPromise) return initPromise
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))

  if (!messageBound) {
    window.addEventListener('message', onMessage)
    messageBound = true
  }

  initPromise = new Promise((resolve, reject) => {
    const iframe = ensureHost()
    let settled = false

    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }

    const fail = (err) => {
      if (settled) return
      settled = true
      initPromise = null
      reject(err)
    }

    const timer = setTimeout(() => {
      if (hostLoaded || iframe.contentWindow) done()
      else fail(new Error('Timeout cargando el reproductor embebido'))
    }, 10000)

    iframe.addEventListener(
      'load',
      () => {
        hostLoaded = true
        clearTimeout(timer)
        setTimeout(() => {
          postToHost('ping')
          done()
        }, 100)
      },
      { once: true }
    )

    iframe.onerror = () => fail(new Error('No se pudo cargar el host de reproducción'))

    const nextSrc = `${HOST_SRC}?v=9`
    const currentSrc = iframe.getAttribute('src') || ''
    if (!currentSrc.includes('v=9')) {
      // Recarga forzada al cambiar de versión del host (fix de autoplay)
      playerReady = false
      hostLoaded = false
      iframe.src = nextSrc
    } else if (playerReady) {
      clearTimeout(timer)
      done()
    } else if (hostLoaded || iframe.contentWindow) {
      clearTimeout(timer)
      setTimeout(() => {
        postToHost('ping')
        done()
      }, 100)
    }
  })

  return initPromise
}

export const iframePlayer = {
  setListeners(next) {
    listeners = next || {}
  },

  async init() {
    await loadIframeHost()
  },

  /**
   * @param {string} mediaId
   * @param {{ volume?: number }} [opts]
   */
  async play(mediaId, opts = {}) {
    if (!mediaId) throw new Error('Sin mediaId')
    const gen = ++generation
    clearReadyWait()
    await loadIframeHost()
    if (gen !== generation) return

    listeners.onState?.('loading', { mediaId: String(mediaId) })

    const sendLoad = () => {
      pendingMediaId = null
      // Volumen en el mismo load: el host lo guarda sin desmutear antes de PLAYING
      const payload = { mediaId }
      if (opts.volume != null) payload.volume = opts.volume
      postToHost('load', payload)
    }

    if (!playerReady) {
      pendingMediaId = mediaId
      pendingPlayOpts = { volume: opts.volume }
      let tries = 0
      readyWaitTimer = setInterval(() => {
        tries += 1
        postToHost('ping')
        if (playerReady || tries > 50) {
          clearReadyWait()
          if (playerReady && generation === gen) sendLoad()
          else if (!playerReady && generation === gen) {
            listeners.onError?.(-3, { mediaId: String(mediaId) })
            listeners.onState?.('error', { mediaId: String(mediaId) })
          }
        }
      }, 200)
      return
    }

    sendLoad()
  },

  pause() {
    postToHost('pause')
  },

  resume() {
    postToHost('play')
  },

  /** Llamar en el gesto del usuario para sticky autoplay. */
  unlock() {
    postToHost('unlock')
  },

  stop() {
    generation += 1
    clearReadyWait()
    pendingMediaId = null
    pendingPlayOpts = null
    postToHost('stop')
    listeners.onState?.('idle', {})
  },

  seek(seconds) {
    postToHost('seek', { seconds: Number(seconds) || 0 })
  },

  setVolume(vol) {
    postToHost('volume', { volume: Math.max(0, Math.min(1, Number(vol) || 0)) })
  },

  isReady() {
    return Boolean(playerReady && host)
  },
}

export default iframePlayer
