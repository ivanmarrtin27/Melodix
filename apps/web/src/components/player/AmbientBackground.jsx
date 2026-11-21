import { useEffect, useState } from 'react'
import { extractColorsFromImage } from '../../utils/extractColors'

const colorCache = new Map()

async function getColors(imageUrl) {
  if (colorCache.has(imageUrl)) return colorCache.get(imageUrl)
  const colors = await extractColorsFromImage(imageUrl)
  if (colors) colorCache.set(imageUrl, colors)
  return colors
}

export function AmbientBackground({ imageUrl }) {
  const [colors, setColors] = useState(null)

  useEffect(() => {
    if (!imageUrl) {
      setColors(null)
      return
    }

    let cancelled = false
    getColors(imageUrl).then((result) => {
      if (!cancelled) setColors(result)
    })

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return (
    <div className="ambient-bg absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute inset-0 bg-[#08080a]" />

      {imageUrl ? (
        <>
          <div className="ambient-bg-blur-layer absolute inset-0" aria-hidden>
            <img
              key={`deep-${imageUrl}`}
              src={imageUrl}
              alt=""
              className="ambient-bg-blur-img ambient-bg-blur-img--deep ambient-bg-blur-img--enter"
              draggable={false}
            />
          </div>
          <div className="ambient-bg-blur-layer absolute inset-0" aria-hidden>
            <img
              key={`glow-${imageUrl}`}
              src={imageUrl}
              alt=""
              className="ambient-bg-blur-img ambient-bg-blur-img--glow ambient-bg-blur-img--enter ambient-bg-blur-img--enter-delayed"
              draggable={false}
            />
          </div>
        </>
      ) : null}

      <div
        className="ambient-bg-tint absolute inset-0 transition-[background] duration-700 ease-out"
        style={{
          background: colors
            ? `linear-gradient(168deg, ${colors.primary}66 0%, ${colors.secondary}44 32%, rgba(10,10,14,0.75) 58%, rgba(6,6,8,0.94) 100%)`
            : 'linear-gradient(180deg, rgba(28,28,32,0.45) 0%, rgba(8,8,10,0.92) 100%)',
        }}
      />

      <div className="ambient-bg-bloom absolute inset-0" />
      <div className="ambient-bg-vignette absolute inset-0" />
      <div className="ambient-bg-shine absolute inset-0" />
      <div className="ambient-bg-grain absolute inset-0" aria-hidden />
    </div>
  )
}
