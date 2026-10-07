import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePlayerDismissDrag } from './usePlayerDismissDrag'

const EXIT_MS = 480
const EXIT_EASE = 'cubic-bezier(0.22, 0.9, 0.28, 1)'

/**
 * Sheet dismiss: arrastre + salida animada hacia abajo antes de onClose.
 */
export function useSheetSlideDismiss({ onClose, enabled = true }) {
  const sheetRef = useRef(null)
  const backdropRef = useRef(null)
  const closingRef = useRef(false)
  const [closing, setClosing] = useState(false)
  const timerRef = useRef(0)
  const rafRef = useRef(0)

  const clearTimers = useCallback(() => {
    window.clearTimeout(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [])

  // Al reabrir, resetear estado de cierre
  useEffect(() => {
    if (!enabled) return undefined
    closingRef.current = false
    setClosing(false)
    clearTimers()
    return undefined
  }, [enabled, clearTimers])

  const runExit = useCallback(
    (fromY = 0) => {
      if (closingRef.current) return
      closingRef.current = true
      setClosing(true)

      const sheet = sheetRef.current
      const backdrop = backdropRef.current
      const vh = window.innerHeight || 800
      const start = Math.max(0, Number(fromY) || 0)

      if (!sheet) {
        onClose?.()
        return
      }

      sheet.style.animation = 'none'
      sheet.style.transformOrigin = '50% 0%'
      sheet.style.transition = 'none'
      sheet.style.transform = `translate3d(0, ${start}px, 0) scale(${1 - Math.min(1, start / vh) * 0.04})`
      sheet.style.opacity = '1'
      void sheet.offsetHeight

      if (backdrop) {
        backdrop.style.transition = 'none'
        backdrop.style.opacity = String(Math.max(0.2, 1 - Math.min(1, start / vh) * 0.65))
      }

      clearTimers()
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          sheet.style.transition = `transform ${EXIT_MS}ms ${EXIT_EASE}, opacity ${Math.round(EXIT_MS * 0.85)}ms ease`
          sheet.style.transform = `translate3d(0, ${Math.round(vh * 1.06)}px, 0) scale(0.97)`
          sheet.style.opacity = '0'

          if (backdrop) {
            backdrop.style.transition = `opacity ${Math.round(EXIT_MS * 0.75)}ms ease`
            backdrop.style.opacity = '0'
          }
        })
      })

      timerRef.current = window.setTimeout(() => {
        onClose?.()
      }, EXIT_MS + 40)
    },
    [onClose, clearTimers]
  )

  const { offsetY, dragging, handlers, offsetRef, resetOffset } = usePlayerDismissDrag({
    enabled: enabled && !closing,
    onDismiss: (fromY) => runExit(fromY),
  })

  useEffect(() => {
    if (enabled) resetOffset()
  }, [enabled, resetOffset])

  useLayoutEffect(() => {
    if (closingRef.current) return
    if (!dragging && offsetY <= 0) return

    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet) return

    sheet.style.animation = 'none'

    const vh = window.innerHeight || 1
    const progress = Math.min(1, offsetY / vh)
    const scale = 1 - progress * 0.04

    sheet.style.transformOrigin = '50% 0%'
    sheet.style.transition = dragging
      ? 'none'
      : `transform 0.38s ${EXIT_EASE}, opacity 0.28s ease`
    sheet.style.transform = `translate3d(0, ${offsetY}px, 0) scale(${scale})`
    sheet.style.opacity = String(1 - progress * 0.1)

    if (backdrop) {
      backdrop.style.transition = dragging ? 'none' : 'opacity 0.28s ease'
      backdrop.style.opacity = String(Math.max(0.2, 1 - progress * 0.65))
    }
  }, [offsetY, dragging])

  const dismiss = useCallback(() => {
    runExit(offsetRef.current || 0)
  }, [runExit, offsetRef])

  useLayoutEffect(() => () => clearTimers(), [clearTimers])

  return {
    sheetRef,
    backdropRef,
    closing,
    dragging,
    handlers,
    dismiss,
  }
}
