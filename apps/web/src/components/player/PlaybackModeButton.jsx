import { ListOrdered, Shuffle, Repeat, Repeat1 } from 'lucide-react'
import { usePlayerStore } from '../../stores/playerStore'
import { getPlaybackMode } from '../../utils/playbackMode'

const ICONS = {
  ordered: ListOrdered,
  shuffle: Shuffle,
  'repeat-all': Repeat,
  'repeat-one': Repeat1,
}

export function PlaybackModeButton({ className = '' }) {
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const cyclePlaybackMode = usePlayerStore((s) => s.cyclePlaybackMode)

  const mode = getPlaybackMode({ shuffle, repeat })
  const Icon = ICONS[mode.id]
  const active = mode.id !== 'ordered'

  return (
    <button
      type="button"
      onClick={cyclePlaybackMode}
      className={`${active ? 'text-white' : ''} ${className}`}
      aria-label={mode.label}
      title={mode.label}
    >
      <Icon size={22} strokeWidth={mode.id === 'repeat-one' ? 2.25 : 1.75} />
    </button>
  )
}
