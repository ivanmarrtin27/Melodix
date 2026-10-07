import { useEffect, useState } from 'react'
import { formatDuration } from '../../utils/helpers'
import { usePlayerStore } from '../../stores/playerStore'

function SeekLine({ onSeek, className = '' }) {
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

  const start = () => {
    setDragging(true)
    startScrubbing()
  }

  const end = () => {
    setDragging(false)
    endScrubbing()
  }

  return (
    <div className={`relative group ${className}`}>
      <div
        className="w-full rounded-full overflow-hidden pointer-events-none"
        style={{ height: '2px', background: 'rgba(255, 255, 255, 0.15)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'var(--accent-color)' }}
        />
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
        onPointerDown={start}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        aria-label="Posición de reproducción"
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
        style={{ height: '16px', top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  )
}

export function ProgressBar({ onSeek, className = '', showTimes = true }) {
  const progress = usePlayerStore((s) => s.progress)
  const duration = usePlayerStore((s) => s.duration)

  if (!showTimes) {
    return <SeekLine onSeek={onSeek} className={className} />
  }

  const max = duration > 0 ? duration : 0
  const display = max > 0 ? Math.min(progress, max) : progress

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-[11px] tabular-nums opacity-45 w-10 text-right shrink-0">
        {formatDuration(display)}
      </span>
      <SeekLine onSeek={onSeek} className="flex-1" />
      <span className="text-[11px] tabular-nums opacity-45 w-10 shrink-0">
        {formatDuration(duration)}
      </span>
    </div>
  )
}
