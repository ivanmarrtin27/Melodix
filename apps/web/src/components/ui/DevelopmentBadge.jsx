export function DevelopmentBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 ${className}`}
    >
      En desarrollo
    </span>
  )
}
