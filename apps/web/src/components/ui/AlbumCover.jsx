import { useEffect, useState } from 'react'

export function AlbumCover({ src, fallback, alt, className = '' }) {
  const [url, setUrl] = useState(() => src || fallback || '')

  useEffect(() => {
    setUrl(src || fallback || '')
  }, [src, fallback])

  if (!url) return <div className={className} aria-hidden />

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => {
        if (fallback && url !== fallback) setUrl(fallback)
      }}
    />
  )
}
