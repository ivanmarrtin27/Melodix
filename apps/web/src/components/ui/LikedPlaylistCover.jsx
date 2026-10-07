import { Heart } from 'lucide-react'

const ICON_SIZES = {
  sm: 22,
  md: 32,
  lg: 56,
  xl: 88,
}

export function LikedPlaylistCover({ className = '', size = 'md' }) {
  const iconSize = typeof size === 'number' ? size : ICON_SIZES[size] ?? ICON_SIZES.md

  return (
    <div className={`liked-playlist-cover${className ? ` ${className}` : ''}`}>
      <Heart size={iconSize} fill="currentColor" strokeWidth={1.5} aria-hidden />
    </div>
  )
}
