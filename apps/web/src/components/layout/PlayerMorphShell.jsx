import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { AmbientBackground } from '../player/AmbientBackground'
import { FullPlayerContent } from './FullPlayer'
import { usePlayerDismissDrag } from '../../hooks/usePlayerDismissDrag'
import {
  MORPH_OPEN_TRANSITION,
  MORPH_CLOSE_TRANSITION,
  DISMISS_SPRING_TRANSITION,
  applySlideExpandFrom,
  applySlideExpandTo,
  applySlideDismissFrom,
  applySlideDismissTo,
} from '../../utils/playerMorph'
import { useT } from '../../i18n'

const OPEN_MS = 680
const CLOSE_MS = 900

export function PlayerMorphShell() {
  const t = useT()
  const shellRef = useRef(null)
  const pendingCloseY = useRef(0)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const playerScreen = usePlayerStore((s) => s.playerScreen)
  const morphRect = usePlayerStore((s) => s.morphRect)
  const completeOpen = usePlayerStore((s) => s.completeOpen)
  const completeClose = usePlayerStore((s) => s.completeClose)
  const requestCollapse = usePlayerStore((s) => s.requestCollapse)

  const isOpening = playerScreen === 'opening'
  const isOpen = playerScreen === 'open'
  const isClosing = playerScreen === 'closing'

  const onDismiss = useCallback(
    (fromY = 0) => {
      pendingCloseY.current = Math.max(0, fromY)
      requestCollapse()
    },
    [requestCollapse]
  )

  const { offsetY, dragging, handlers, resetOffset, offsetRef } = usePlayerDismissDrag({
    enabled: isOpen && !isClosing,
    onDismiss,
  })

  useEffect(() => {
    if (playerScreen === 'mini') {
      resetOffset()
      pendingCloseY.current = 0
    }
  }, [playerScreen, resetOffset])

  useEffect(() => {
    if (playerScreen === 'mini') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [playerScreen])

  useLayoutEffect(() => {
    const shell = shellRef.current
    if (!shell || !morphRect) return

    let fallbackTimer

    const clearFallback = () => {
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }

    if (playerScreen === 'opening') {
      shell.style.transition = 'none'
      applySlideExpandFrom(shell, morphRect)

      shell.offsetHeight

      shell.style.transition = MORPH_OPEN_TRANSITION
      applySlideExpandTo(shell)

      const finish = () => {
        clearFallback()
        completeOpen()
      }

      const onEnd = (event) => {
        if (event.target !== shell || event.propertyName !== 'transform') return
        shell.removeEventListener('transitionend', onEnd)
        finish()
      }
      shell.addEventListener('transitionend', onEnd)
      fallbackTimer = window.setTimeout(finish, OPEN_MS)
      return () => {
        shell.removeEventListener('transitionend', onEnd)
        clearFallback()
      }
    }

    if (playerScreen === 'closing') {
      const fromY = pendingCloseY.current || offsetRef.current || 0
      pendingCloseY.current = 0

      // Tap o gesto: siempre baja con animación (desde 0 o desde el offset del dedo)
      shell.style.transition = 'none'
      applySlideDismissFrom(shell, fromY)

      shell.offsetHeight

      shell.style.transition = MORPH_CLOSE_TRANSITION
      applySlideDismissTo(shell)

      const finish = () => {
        clearFallback()
        completeClose()
      }

      const onEnd = (event) => {
        if (event.target !== shell || event.propertyName !== 'transform') return
        shell.removeEventListener('transitionend', onEnd)
        finish()
      }
      shell.addEventListener('transitionend', onEnd)
      fallbackTimer = window.setTimeout(finish, CLOSE_MS)
      return () => {
        shell.removeEventListener('transitionend', onEnd)
        clearFallback()
      }
    }
  }, [playerScreen, morphRect, completeOpen, completeClose, offsetRef])

  // Drag / spring-back while fully open
  useLayoutEffect(() => {
    if (!isOpen || isClosing) return
    const shell = shellRef.current
    if (!shell) return

    const vh = window.innerHeight || 1
    const progress = Math.min(1, offsetY / vh)
    const scale = 1 - progress * 0.045
    const radius = progress * 20

    shell.style.transformOrigin = '50% 0%'
    shell.style.transition = dragging ? 'none' : DISMISS_SPRING_TRANSITION
    shell.style.transform = `translate3d(0, ${offsetY}px, 0) scale(${scale})`
    shell.style.borderRadius = `${radius}px`
    shell.style.opacity = String(1 - progress * 0.12)
  }, [isOpen, isClosing, offsetY, dragging])

  if (playerScreen === 'mini' || !currentTrack) return null

  const artUrl = currentTrack.albumCover || currentTrack.thumbnail
  const dragProgress = Math.min(1, offsetY / (window.innerHeight || 1))

  return (
    <div
      ref={shellRef}
      className={[
        'player-morph-shell',
        isOpening && 'player-morph-shell--opening',
        isOpen && 'player-morph-shell--open',
        isClosing && 'player-morph-shell--closing',
        dragging && 'player-morph-shell--dragging',
      ]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={t('player.dialog')}
    >
      <div
        className="player-morph-shell__backdrop"
        key={currentTrack.id}
        style={
          isOpen && offsetY > 0
            ? { opacity: Math.max(0.25, 1 - dragProgress * 0.55) }
            : undefined
        }
      >
        <AmbientBackground imageUrl={artUrl} />
      </div>

      <div className="player-morph-shell__content">
        <div
          className={`player-sheet-handle-bar${dragging ? ' player-sheet-handle-bar--dragging' : ''}`}
          {...handlers}
          role="button"
          tabIndex={isOpen && !isClosing ? 0 : -1}
          aria-label={t('player.minimize')}
          aria-disabled={!isOpen || isClosing}
          onKeyDown={(e) => {
            if (!isOpen || isClosing) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onDismiss(0)
            }
          }}
        >
          <span className={`player-sheet-handle${dragging ? ' player-sheet-handle--dragging' : ''}`}>
            <span className="player-sheet-handle__pill" aria-hidden />
          </span>
        </div>
        <div className="player-morph-shell__body">
          <FullPlayerContent />
        </div>
      </div>
    </div>
  )
}
