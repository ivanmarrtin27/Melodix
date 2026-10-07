import { useRef, useCallback } from 'react'

export function useLongPress(callback, ms = 500) {
  const timerRef = useRef(null)

  const start = useCallback(
    (e) => {
      timerRef.current = setTimeout(() => callback(e), ms)
    },
    [callback, ms]
  )

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
  }
}
