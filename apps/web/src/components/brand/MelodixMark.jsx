export function MelodixMark({ size, className = '' }) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className={`app-logo-mark${className ? ` ${className}` : ''}`}
      aria-hidden
      draggable={false}
    />
  )
}
