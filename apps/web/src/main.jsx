import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { useUserStore, applyTheme } from './stores/userStore'
import {
  initPlayerSessionPersistence,
  restorePlayerSessionIntoStore,
} from './utils/playerSession'
import { initNativeShell } from './native/initNativeShell'
import './index.css'
import './app.css'

if (typeof window !== 'undefined') {
  restorePlayerSessionIntoStore()
  void initNativeShell()
}

function ThemeProvider({ children }) {
  const settings = useUserStore((s) => s.settings)

  useEffect(() => {
    initPlayerSessionPersistence()
  }, [])

  useEffect(() => {
    applyTheme(settings)
  }, [settings])

  return children
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
