import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getLyrics, parseLRC, getActiveLyricLine } from '../../services/musicApi'
import { usePlayerStore } from '../../stores/playerStore'

/**
 * Panel de letra sincronizada: scroll por transform (suave) + tipografía karaoke.
 */
export function PlayerLyricsPanel({ track, active }) {
  const progress = usePlayerStore((s) => s.progress)
  const [loading, setLoading] = useState(false)
  const [lyrics, setLyrics] = useState(null)
  const [error, setError] = useState(null)
  const [translateY, setTranslateY] = useState(0)
  const [entered, setEntered] = useState(false)
  const [snapScroll, setSnapScroll] = useState(true)

  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const lineRefs = useRef([])
  const lastIndexRef = useRef(-1)

  useEffect(() => {
    if (!active || !track) return undefined
    let cancelled = false
    setLoading(true)
    setError(null)
    setLyrics(null)
    setSnapScroll(true)
    lastIndexRef.current = -1
    setTranslateY(0)

    getLyrics(track)
      .then((data) => {
        if (cancelled) return
        if (!data?.plain && !data?.synced) {
          setError('No hay letra disponible para esta canción.')
          return
        }
        setLyrics(data)
      })
      .catch(() => {
        if (!cancelled) setError('No se pudo cargar la letra.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [active, track?.id, track?.title, track?.artist])

  useEffect(() => {
    if (!active) {
      setEntered(false)
      setSnapScroll(true)
      return undefined
    }
    // Deja que la portada empiece a morphar antes de subir la letra
    const enterTimer = window.setTimeout(() => setEntered(true), 70)
    return () => window.clearTimeout(enterTimer)
  }, [active])

  const syncedLines = useMemo(() => {
    if (!lyrics?.synced) return []
    return parseLRC(lyrics.synced)
  }, [lyrics])

  const activeIndex = useMemo(() => {
    if (!syncedLines.length) return -1
    return getActiveLyricLine(syncedLines, progress)
  }, [syncedLines, progress])

  const plainLines = useMemo(() => {
    if (syncedLines.length) return []
    const text =
      lyrics?.plain ||
      (lyrics?.synced
        ? lyrics.synced.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim()
        : '')
    if (!text) return []
    return text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  }, [lyrics, syncedLines.length])

  // Centrar la línea activa con transform (más suave que scrollIntoView)
  useLayoutEffect(() => {
    if (!active || activeIndex < 0) return
    const viewport = viewportRef.current
    const line = lineRefs.current[activeIndex]
    const trackEl = trackRef.current
    if (!viewport || !line || !trackEl) return

    const viewportH = viewport.clientHeight
    const lineTop = line.offsetTop
    const lineH = line.offsetHeight
    const next = viewportH * 0.38 - (lineTop + lineH / 2)

    const isFirst = lastIndexRef.current < 0
    lastIndexRef.current = activeIndex

    if (isFirst) {
      setSnapScroll(true)
      setTranslateY(next)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSnapScroll(false))
      })
      return
    }

    setTranslateY(next)
  }, [active, activeIndex, syncedLines.length, entered])

  if (!active) return null

  return (
    <div
      className={`player-lyrics-panel${entered ? ' player-lyrics-panel--in' : ''}`}
      aria-label="Letra"
    >
      <div ref={viewportRef} className="player-lyrics-panel__viewport">
        {loading ? <p className="player-lyrics-panel__status">Buscando letra…</p> : null}
        {error ? <p className="player-lyrics-panel__status">{error}</p> : null}

        {!loading && !error && syncedLines.length > 0 ? (
          <div
            ref={trackRef}
            className={`player-lyrics-panel__track${snapScroll ? ' player-lyrics-panel__track--snap' : ''}`}
            style={{ transform: `translate3d(0, ${translateY}px, 0)` }}
          >
            {syncedLines.map((line, i) => {
              const isActive = i === activeIndex
              const dist = Math.abs(i - activeIndex)
              return (
                <p
                  key={`${line.time}-${i}`}
                  ref={(el) => {
                    lineRefs.current[i] = el
                  }}
                  className={[
                    'player-lyrics-panel__line',
                    isActive ? 'player-lyrics-panel__line--active' : '',
                    i < activeIndex ? 'player-lyrics-panel__line--passed' : '',
                    dist === 1 ? 'player-lyrics-panel__line--near' : '',
                    dist >= 3 ? 'player-lyrics-panel__line--far' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {line.text}
                </p>
              )
            })}
          </div>
        ) : null}

        {!loading && !error && plainLines.length > 0 ? (
          <div className="player-lyrics-panel__plain">
            {plainLines.map((line, i) => (
              <p key={i} className="player-lyrics-panel__plain-line">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
