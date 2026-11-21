import { Capacitor } from '@capacitor/core'

/** Ajustes nativos solo cuando corre dentro de Capacitor (Android/iOS). */
export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#0a0a0a' })
  } catch {
    /* plugin opcional */
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* plugin opcional */
  }

  try {
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else App.exitApp()
    })
  } catch {
    /* plugin opcional */
  }
}
