export function extractColorsFromImage(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 48
        canvas.height = 48
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, 48, 48)
        const { data } = ctx.getImageData(0, 0, 48, 48)

        let r = 0
        let g = 0
        let b = 0
        let count = 0

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3]
          if (alpha < 128) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }

        if (!count) {
          resolve(null)
          return
        }

        resolve({
          primary: `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`,
          secondary: `rgb(${Math.round(r / count * 0.6)}, ${Math.round(g / count * 0.6)}, ${Math.round(b / count * 0.6)})`,
        })
      } catch {
        resolve(null)
      }
    }

    img.onerror = () => resolve(null)
    img.src = imageUrl
  })
}
