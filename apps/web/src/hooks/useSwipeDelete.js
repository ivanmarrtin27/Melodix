import { useState, useRef } from 'react'

export function useSwipeDelete(onDelete, threshold = 80) {
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)

  const handlers = {
    onTouchStart: (e) => {
      startX.current = e.touches[0].clientX
      setSwiping(true)
    },
    onTouchMove: (e) => {
      if (!swiping) return
      const diff = startX.current - e.touches[0].clientX
      if (diff > 0) setOffset(Math.min(diff, 120))
    },
    onTouchEnd: () => {
      setSwiping(false)
      if (offset > threshold) {
        onDelete()
      }
      setOffset(0)
    },
  }

  return { offset, handlers }
}
