import { useEffect, useState } from 'react'
import { formatDuration } from '../../utils/helpers'
import { usePlayerStore } from '../../stores/playerStore'
import { NowPlayingBadge } from './NowPlayingBadge'

function formatRemaining(progress, duration) {
  const rem = Math.max(0, (duration || 0) - (progress || 0))
  return `-${formatDuration(rem)}`
}

export function NowPlayingProgress({ onSeek }) {
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)
  const startScrubbing = usePlayerStore((s) => s.startScrubbing)
  const endScrubbing = usePlayerStore((s) => s.endScrubbing)

  const [dragging, setDragging] = useState(false)
  const [local, setLocal] = useState(progress)

  const max = duration > 0 ? duration : 0
  const value = dragging ? local : progress
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0

  useEffect(() => {
    if (!dragging) setLocal(progress)
  }, [progress, dragging])

  const handleChange = (e) => {
    const t = parseFloat(e.target.value)
    setLocal(t)
    onSeek(t)
  }

  const endDrag = () => {
    setDragging(false)
    endScrubbing()
  }

  return (
    <div className="np-progress">
      <div className={`np-progress__rail${dragging ? ' np-progress__rail--active' : ''}`}>
        <div className="np-progress__track" aria-hidden>
          <div className="np-progress__fill" style={{ width: `${pct}%` }} />
          <div className="np-progress__thumb" style={{ left: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={max || 1}
          step={0.25}
          value={max > 0 ? Math.min(value, max) : 0}
          disabled={max <= 0}
          onChange={handleChange}
          onInput={handleChange}
          onPointerDown={() => {
            setDragging(true)
            startScrubbing()
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Posición"
          className="np-progress__input"
        />
      </div>

      <div className="np-progress__meta">
        <span className="np-progress__time">{formatDuration(max > 0 ? Math.min(value, max) : 0)}</span>
        <NowPlayingBadge />
        <span className="np-progress__time np-progress__time--end">
          {max > 0 ? formatRemaining(value, max) : '-0:00'}
        </span>
      </div>
    </div>
  )
}
