export function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return <div className={`skeleton ${rounded} ${className}`} />
}

export function SkeletonCard({ size = 'md' }) {
  const sizes = {
    sm: 'w-28 h-28',
    md: 'w-36 h-36',
    album: 'w-[7rem] aspect-square',
    lg: 'w-full aspect-square',
  }
  return (
    <div className="flex-shrink-0">
      <Skeleton className={`${sizes[size]} mb-2`} />
      <Skeleton className="h-3 w-20 mb-1" rounded="rounded" />
      <Skeleton className="h-2 w-14" rounded="rounded" />
    </div>
  )
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-3 w-3/4 mb-2" rounded="rounded" />
            <Skeleton className="h-2 w-1/2" rounded="rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
