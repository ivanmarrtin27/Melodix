import { useCallback, useEffect, useState } from 'react'
import { pingApiHealth } from '../../utils/apiRetry'

/**
 * Banner fijo cuando el API no responde (típico: no levantaste `dev:all:mobile`
 * o el firewall bloquea el puerto).
 */
export function ApiStatusBanner() {
  const [online, setOnline] = useState(true)
  const [checking, setChecking] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const check = useCallback(async () => {
    setChecking(true)
    const ok = await pingApiHealth()
    setOnline(ok)
    if (ok) setDismissed(false)
    setChecking(false)
    return ok
  }, [])

  useEffect(() => {
    void check()
    const onOnline = () => void check()
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void check()
    }, 12000)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.clearInterval(id)
    }
  }, [check])

  if (online || dismissed) return null

  return (
    <div className="api-status-banner" role="alert">
      <div className="api-status-banner__copy">
        <p className="api-status-banner__title">Sin conexión al servidor</p>
        <p className="api-status-banner__sub">
          En el PC: <code>npm run dev:all:mobile</code> · emulador usa <code>127.0.0.1</code> +{' '}
          <code>adb reverse</code> · móvil real: IP LAN (no 127.0.0.1)
        </p>
      </div>
      <div className="api-status-banner__actions">
        <button
          type="button"
          className="api-status-banner__btn"
          disabled={checking}
          onClick={() => void check()}
        >
          {checking ? '…' : 'Reintentar'}
        </button>
        <button
          type="button"
          className="api-status-banner__btn api-status-banner__btn--ghost"
          onClick={() => setDismissed(true)}
        >
          Ocultar
        </button>
      </div>
    </div>
  )
}
