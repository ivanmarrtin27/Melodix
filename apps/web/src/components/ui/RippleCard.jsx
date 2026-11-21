import { useRef } from 'react'

export function RippleCard({ children, onClick, className = '', ...props }) {
  const ref = useRef(null)

  const handleClick = (e) => {
    if (!onClick || props['aria-disabled']) return
    const el = ref.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const ripple = document.createElement('span')
    const size = Math.max(rect.width, rect.height)
    const x = Number.isFinite(e?.clientX) ? e.clientX : rect.left + rect.width / 2
    const y = Number.isFinite(e?.clientY) ? e.clientY : rect.top + rect.height / 2

    ripple.className = 'ripple-effect'
    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${x - rect.left - size / 2}px`
    ripple.style.top = `${y - rect.top - size / 2}px`

    el.appendChild(ripple)
    ripple.addEventListener('animationend', () => ripple.remove())
    onClick(e)
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
      className={`ripple-container cursor-pointer transition-all duration-200 ease-in-out active:scale-[0.97] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
