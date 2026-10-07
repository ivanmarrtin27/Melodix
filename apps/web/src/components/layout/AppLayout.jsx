import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { AnimatedTabOutlet } from './AnimatedTabOutlet'
import { MiniPlayer } from './MiniPlayer'
import { PlayerMorphShell } from './PlayerMorphShell'
import { ApiStatusBanner } from './ApiStatusBanner'
import { usePlayerStore } from '../../stores/playerStore'
import { useLibraryStore } from '../../stores/libraryStore'
import { waitForApiReady } from '../../utils/apiRetry'
import { isOverlayDetailPath } from '../../utils/mainTab'
import { resetMainScroll } from '../../utils/navigationReturn'

const NotificationsPanel = lazy(() =>
  import('./NotificationsPanel').then((m) => ({ default: m.NotificationsPanel }))
)

const DOCK_REVEAL_MS = 600

export function AppLayout() {
  const location = useLocation()
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const playerScreen = usePlayerStore((s) => s.playerScreen)
  const ensureLibraryNormalized = useLibraryStore((s) => s.ensureLibraryNormalized)

  const hadTrack = useRef(Boolean(currentTrack))
  const revealTimer = useRef(null)
  const [dockReveal, setDockReveal] = useState(false)

  const isSettingsRoute = location.pathname === '/settings'
  const isPlayerOverlay = playerScreen !== 'mini'
  const showChrome = !isSettingsRoute
  const showMiniPlayer = showChrome && Boolean(currentTrack)
  const mainPadding = !showChrome
    ? 'pb-0'
    : showMiniPlayer
      ? 'pb-dock-with-player'
      : 'pb-dock'

  const playDockReveal = useCallback(() => {
    if (revealTimer.current) clearTimeout(revealTimer.current)
    setDockReveal(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDockReveal(true)
        revealTimer.current = setTimeout(() => {
          setDockReveal(false)
          revealTimer.current = null
        }, DOCK_REVEAL_MS)
      })
    })
  }, [])

  useEffect(() => {
    ensureLibraryNormalized()
    void usePlayerStore.getState().initEmbedPlayer()
    void waitForApiReady({ maxWaitMs: 4000, intervalMs: 200 })
  }, [ensureLibraryNormalized])

  useEffect(() => {
    if (currentTrack && !hadTrack.current) {
      playDockReveal()
    }
    hadTrack.current = Boolean(currentTrack)
  }, [currentTrack, playDockReveal])

  useEffect(() => {
    return () => {
      if (revealTimer.current) clearTimeout(revealTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!isOverlayDetailPath(location.pathname) && !location.pathname.startsWith('/library/')) {
      return
    }
    resetMainScroll()
  }, [location.pathname, location.key])

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <ApiStatusBanner />
      <main
        className={`flex-1 ${
          isPlayerOverlay && showChrome
            ? 'overflow-hidden pointer-events-none'
            : 'overflow-y-auto'
        } ${mainPadding}`}
        aria-hidden={(isPlayerOverlay && showChrome) || undefined}
        {...(isPlayerOverlay && showChrome ? { inert: true } : {})}
      >
        <AnimatedTabOutlet />
      </main>
      {showChrome ? <BottomNav /> : null}
      {showMiniPlayer ? (
        <div
          className={[
            'app-dock',
            dockReveal && !isPlayerOverlay && 'app-dock--reveal',
            isPlayerOverlay && 'app-dock--under-player',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <MiniPlayer
            dockReveal={dockReveal && !isPlayerOverlay}
            underPlayer={isPlayerOverlay}
          />
        </div>
      ) : null}
      {showChrome ? <PlayerMorphShell /> : null}
      <Suspense fallback={null}>
        <NotificationsPanel />
      </Suspense>
    </div>
  )
}
