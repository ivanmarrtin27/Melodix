import { useRef, useState, useCallback } from 'react'

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const containerRef = useRef(null)

  const onTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setPulling(true)
    }
  }, [])

  const onTouchMove = useCallback(
    (e) => {
      if (!pulling) return
      const diff = e.touches[0].clientY - startY.current
      if (diff > 0) {
        setPullDistance(Math.min(diff * 0.5, 80))
      }
    },
    [pulling]
  )

  const onTouchEnd = useCallback(async () => {
    if (pullDistance > 60) {
      await onRefresh?.()
    }
    setPulling(false)
    setPullDistance(0)
  }, [pullDistance, onRefresh])

  return {
    containerRef,
    pullDistance,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
