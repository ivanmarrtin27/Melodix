import { useEffect, useState } from 'react'
import { waitForApiReady } from '../../utils/apiRetry'
import { MelodixMark } from '../brand/MelodixMark'

const HOLD_MS = 1500
const EXIT_MS = 650

export function AppSplash({ onComplete }) {
  const [phase, setPhase] = useState('enter')

  useEffect(() => {
    void waitForApiReady({ maxWaitMs: 12000 })
    document.body.classList.add('app-splash-active')
    const exitTimer = setTimeout(() => setPhase('exit'), HOLD_MS)
    const doneTimer = setTimeout(() => {
      document.body.classList.remove('app-splash-active')
      onComplete?.()
    }, HOLD_MS + EXIT_MS)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
      document.body.classList.remove('app-splash-active')
    }
  }, [onComplete])

  return (
    <div
      className={`app-splash app-splash--${phase}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando Melodix"
    >
      <div className="app-splash__backdrop" aria-hidden />
      <div className="app-splash__glow app-splash__glow--primary" aria-hidden />
      <div className="app-splash__glow app-splash__glow--secondary" aria-hidden />

      <div className="app-splash__content">
        <div className="app-splash__logo-stage">
          <span className="app-splash__ring app-splash__ring--outer" aria-hidden />
          <span className="app-splash__ring app-splash__ring--inner" aria-hidden />
          <div className="app-splash__logo">
            <MelodixMark />
          </div>
        </div>

        <h1 className="app-splash__name">Melodix</h1>
        <p className="app-splash__tagline">Tu música, sin límites</p>

        <div className="app-splash__loader" aria-hidden>
          <span className="app-splash__loader-fill" />
        </div>
      </div>
    </div>
  )
}
