import { useEffect, useState } from 'react'
import {
  enrichTrackCover,
  getTrackCoverFallback,
  getTrackCoverUrl,
  isSquareCoverUrl,
} from '../../utils/coverArt'

const SIZE_CLASS = {
  mini: 'w-[2.375rem] h-[2.375rem] rounded-md',
  sm: 'w-11 h-11 rounded-lg',
  md: 'w-12 h-12 rounded-lg',
  lg: 'w-14 h-14 rounded-xl',
}

export function TrackCover({ track, size = 'md', className = '' }) {
  const [src, setSrc] = useState(() => getTrackCoverUrl(track))
  const square = isSquareCoverUrl(src)

  useEffect(() => {
    const next = getTrackCoverUrl(track)
    setSrc(next)

    if (next && isSquareCoverUrl(next)) return

    let cancelled = false
    enrichTrackCover(track).then((enriched) => {
      if (cancelled) return
      const cover = getTrackCoverUrl(enriched)
      if (cover) setSrc(cover)
    })

    return () => {
      cancelled = true
    }
  }, [track.id, track.thumbnail, track.albumCover, track.videoId, track.artist, track.title])

  const boxClass = SIZE_CLASS[size] || SIZE_CLASS.md
  const fallback = getTrackCoverFallback(track)

  return (
    <div
      className={`${boxClass} overflow-hidden flex-shrink-0 ${className}`}
      style={{ background: 'var(--border-color)' }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className={`w-full h-full ${square ? 'object-cover' : 'object-contain'}`}
          onError={() => {
            if (fallback && src !== fallback) setSrc(fallback)
          }}
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-xs opacity-40"
          aria-hidden
        >
          ♫
        </div>
      )}
    </div>
  )
}
