import { useCallback, useRef, useState } from 'react'

const DISMISS_RATIO = 0.22
const DISMISS_VELOCITY = 0.65 // px/ms
const TAP_SLOP = 12
const MAX_DRAG_RATIO = 0.92

/**
 * Arrastre vertical para minimizar el full player (sheet dismiss).
 * Tap en el handle = dismiss; soltar a mitad = vuelve o cierra según umbral/velocidad.
 */
export function usePlayerDismissDrag({ enabled, onDismiss }) {
  const [offsetY, setOffsetY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const offsetRef = useRef(0)
  const draggingRef = useRef(false)
  const startRef = useRef(null)
  const lastRef = useRef(null)
  const samplesRef = useRef([])

  const commitOffset = useCallback((y) => {
    offsetRef.current = y
    setOffsetY(y)
  }, [])

  const resetOffset = useCallback(() => {
    offsetRef.current = 0
    setOffsetY(0)
    setDragging(false)
    draggingRef.current = false
    startRef.current = null
  }, [])

  const onPointerDown = useCallback(
    (e) => {
      if (!enabled) return
      if (e.pointerType === 'mouse' && e.button !== 0) return

      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)

      const now = performance.now()
      startRef.current = { y: e.clientY, t: now }
      lastRef.current = { y: e.clientY, t: now }
      samplesRef.current = [{ y: e.clientY, t: now }]
      draggingRef.current = true
      setDragging(true)
    },
    [enabled]
  )

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current || !startRef.current) return

    const now = performance.now()
    const raw = Math.max(0, e.clientY - startRef.current.y)
    const max = window.innerHeight * MAX_DRAG_RATIO
    // Resistencia suave al acercarse al final
    const y = raw < max * 0.7 ? raw : max * 0.7 + (raw - max * 0.7) * 0.35

    lastRef.current = { y: e.clientY, t: now }
    const samples = samplesRef.current
    samples.push({ y: e.clientY, t: now })
    if (samples.length > 6) samples.shift()

    commitOffset(Math.min(y, max))
  }, [commitOffset])

  const endDrag = useCallback(
    (e) => {
      if (!draggingRef.current || !startRef.current) return

      draggingRef.current = false
      setDragging(false)

      const start = startRef.current
      startRef.current = null
      const now = performance.now()
      const last = lastRef.current || { y: e?.clientY ?? start.y, t: now }
      const dy = offsetRef.current
      const travel = Math.abs(last.y - start.y)
      const isTap = travel < TAP_SLOP && now - start.t < 450

      // Velocidad reciente (últimos ~100ms)
      const samples = samplesRef.current
      let velocity = 0
      if (samples.length >= 2) {
        const newest = samples[samples.length - 1]
        let oldest = samples[0]
        for (let i = samples.length - 2; i >= 0; i -= 1) {
          if (newest.t - samples[i].t >= 80) {
            oldest = samples[i]
            break
          }
          oldest = samples[i]
        }
        const dt = Math.max(1, newest.t - oldest.t)
        velocity = (newest.y - oldest.y) / dt
      }

      const vh = window.innerHeight
      const shouldDismiss =
        isTap || dy >= vh * DISMISS_RATIO || velocity >= DISMISS_VELOCITY

      if (shouldDismiss) {
        onDismiss?.(dy)
        return
      }

      // Mantener offset un frame con transition activa, luego spring a 0
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          commitOffset(0)
        })
      })
    },
    [commitOffset, onDismiss]
  )

  return {
    offsetY,
    dragging,
    offsetRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
    resetOffset,
    commitOffset,
  }
}
