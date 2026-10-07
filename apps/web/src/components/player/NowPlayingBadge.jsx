import { usePlayerStore } from '../../stores/playerStore'
import { useUserStore } from '../../stores/userStore'
import { useVisualizerStore } from '../../stores/visualizerStore'
import { useT } from '../../i18n'

const FALLBACK = [0.35, 0.7, 0.45, 0.85, 0.55]
const QUIET = [0.28, 0.28, 0.28, 0.28, 0.28]

export function NowPlayingBadge() {
  const t = useT()
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const vizEnabled = useUserStore((s) => Boolean(s.settings?.visualizerEnabled))
  const levels = useVisualizerStore((s) => s.levels)
  const vizActive = useVisualizerStore((s) => s.active)

  const useLive = vizEnabled && vizActive && isPlaying && levels?.length > 0
  const animate = vizEnabled && isPlaying && !useLive
  const bars = useLive ? levels.slice(0, 5) : vizEnabled ? FALLBACK : QUIET

  return (
    <div
      className={[
        'np-status',
        !isPlaying ? 'np-status--paused' : '',
        useLive ? 'np-status--live' : '',
        !vizEnabled ? 'np-status--off' : '',
        animate ? 'np-status--animate' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-live="polite"
    >
      <div className="np-status__eq" aria-hidden>
        {bars.map((lvl, i) => (
          <span
            key={i}
            className="np-status__bar"
            style={
              useLive
                ? { ['--np-h']: `${0.28 + Math.min(1, lvl) * 0.72}` }
                : animate
                  ? { animationDelay: `${i * 0.12}s` }
                  : { ['--np-h']: `${lvl}` }
            }
          />
        ))}
      </div>
      <span className="np-status__label">{t('player.nowPlaying')}</span>
    </div>
  )
}
