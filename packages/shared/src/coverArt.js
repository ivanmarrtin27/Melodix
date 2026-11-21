const COVER_SIZE = 300
const COVER_SIZE_LARGE = 544

export { COVER_SIZE, COVER_SIZE_LARGE }

/** Miniatura horizontal de vídeo de YouTube (se recorta mal en cuadrado) */
export function isYoutubeVideoThumb(url) {
  if (!url) return false
  return /i\.ytimg\.com\/vi\/[^/]+\/(hq|mq|sd|default|maxres)default/i.test(url)
}

/** Portada cuadrada oficial (YT Music / Deezer / Google Music) */
export function isSquareCoverUrl(url) {
  if (!url) return false
  if (url.includes('googleusercontent.com')) return true
  if (url.includes('cdn-images.dzcdn.net')) return true
  if (url.includes('scdn.co')) return true
  return false
}

/** Escala portadas de googleusercontent a mayor resolución */
export function upscaleCoverUrl(url, size = COVER_SIZE) {
  if (!url) return url

  if (url.includes('googleusercontent.com') && url.includes('=')) {
    const base = url.split('=')[0]
    return `${base}=w${size}-h${size}-l90-rj`
  }

  if (url.includes('cdn-images.dzcdn.net')) {
    return url.replace(/\/\d+x\d+-/, `/${size}x${size}-`)
  }

  return url
}

export function pickThumbnailFromList(thumbnails = [], size = COVER_SIZE) {
  if (!thumbnails.length) return null

  const sorted = [...thumbnails].sort(
    (a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0)
  )
  const best = sorted[0]?.url
  return best ? upscaleCoverUrl(best, size) : null
}

/** URL de portada preferida para listados y reproductor */
export function getTrackCoverUrl(track, size = COVER_SIZE) {
  const candidate = track?.albumCover || track?.thumbnail
  if (candidate && isSquareCoverUrl(candidate)) {
    return upscaleCoverUrl(candidate, size)
  }
  if (candidate && !isYoutubeVideoThumb(candidate)) {
    return upscaleCoverUrl(candidate, size)
  }
  if (track?.videoId && isYoutubeVideoThumb(candidate)) {
    return null
  }
  return candidate ? upscaleCoverUrl(candidate, size) : null
}

export function getTrackCoverFallback(track) {
  if (track?.videoId) {
    return `https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg`
  }
  if (track?.mediaId) {
    return `https://i.ytimg.com/vi/${track.mediaId}/mqdefault.jpg`
  }
  return null
}
