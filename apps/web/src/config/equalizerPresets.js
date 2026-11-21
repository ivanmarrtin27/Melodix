/** Bandas del ecualizador paramétrico (Hz). */
export const EQ_BANDS = [
  { freq: 60, type: 'lowshelf', label: '60', q: 0.7 },
  { freq: 150, type: 'peaking', label: '150', q: 1.1 },
  { freq: 400, type: 'peaking', label: '400', q: 1.1 },
  { freq: 1000, type: 'peaking', label: '1k', q: 1.0 },
  { freq: 2400, type: 'peaking', label: '2.4k', q: 1.0 },
  { freq: 6000, type: 'peaking', label: '6k', q: 1.0 },
  { freq: 12000, type: 'highshelf', label: '12k', q: 0.7 },
]

export const FLAT_BANDS = EQ_BANDS.map(() => 0)

export const EQ_PRESET_CATEGORIES = [
  { id: 'essentials', name: 'Esenciales' },
  { id: 'genres', name: 'Géneros' },
  { id: 'studio', name: 'Estudio' },
]

/**
 * Presets profesionales (ganancias en dB, −12…+12).
 * 7 bandas: 60 · 150 · 400 · 1k · 2.4k · 6k · 12k
 */
export const EQ_PRESETS = {
  flat: {
    id: 'flat',
    name: 'Plano',
    category: 'essentials',
    blurb: 'Sin coloración',
    bands: [...FLAT_BANDS],
  },
  bass: {
    id: 'bass',
    name: 'Bass Boost',
    category: 'essentials',
    blurb: 'Graves potentes',
    bands: [7, 5, 2, 0, -1, 0, 1],
  },
  deepBass: {
    id: 'deepBass',
    name: 'Sub Bass',
    category: 'essentials',
    blurb: 'Impacto grave',
    bands: [9, 6, 1, -1, -2, 0, 0],
  },
  treble: {
    id: 'treble',
    name: 'Brillo',
    category: 'essentials',
    blurb: 'Agudos abiertos',
    bands: [-1, 0, 0, 1, 3, 5, 6],
  },
  loudness: {
    id: 'loudness',
    name: 'Loudness',
    category: 'essentials',
    blurb: 'Volumen percibido',
    bands: [5, 3, 0, -2, 1, 3, 4],
  },
  soft: {
    id: 'soft',
    name: 'Suave',
    category: 'essentials',
    blurb: 'Escucha relajada',
    bands: [2, 1, 0, -1, -1, -2, -1],
  },
  night: {
    id: 'night',
    name: 'Noche',
    category: 'essentials',
    blurb: 'Menos fatiga',
    bands: [3, 2, 0, -1, -2, -3, -2],
  },

  pop: {
    id: 'pop',
    name: 'Pop',
    category: 'genres',
    blurb: 'Radio comercial',
    bands: [3, 2, 0, 1, 2, 3, 2],
  },
  rock: {
    id: 'rock',
    name: 'Rock',
    category: 'genres',
    blurb: 'Guitarras y cuerpo',
    bands: [4, 2, -1, 1, 3, 2, 3],
  },
  metal: {
    id: 'metal',
    name: 'Metal',
    category: 'genres',
    blurb: 'Punch y presencia',
    bands: [5, 2, -2, 0, 4, 3, 2],
  },
  hiphop: {
    id: 'hiphop',
    name: 'Hip-Hop',
    category: 'genres',
    blurb: '808 y presencia',
    bands: [6, 4, 1, 0, 2, 1, 2],
  },
  rnb: {
    id: 'rnb',
    name: 'R&B',
    category: 'genres',
    blurb: 'Warmth y vocal',
    bands: [4, 3, 1, 2, 3, 1, 0],
  },
  electronic: {
    id: 'electronic',
    name: 'Electrónica',
    category: 'genres',
    blurb: 'Club / EDM',
    bands: [5, 3, -1, 0, 2, 4, 5],
  },
  dance: {
    id: 'dance',
    name: 'Dance',
    category: 'genres',
    blurb: 'Pista energética',
    bands: [6, 3, -1, 1, 2, 4, 3],
  },
  latin: {
    id: 'latin',
    name: 'Urbano',
    category: 'genres',
    blurb: 'Reggaeton / latin',
    bands: [5, 3, 0, 1, 3, 2, 1],
  },
  jazz: {
    id: 'jazz',
    name: 'Jazz',
    category: 'genres',
    blurb: 'Natural y aire',
    bands: [2, 1, 0, 1, 2, 2, 1],
  },
  classical: {
    id: 'classical',
    name: 'Clásica',
    category: 'genres',
    blurb: 'Dinámica orquestal',
    bands: [3, 1, 0, 0, 1, 2, 3],
  },
  acoustic: {
    id: 'acoustic',
    name: 'Acústica',
    category: 'genres',
    blurb: 'Cuerdas y cuerpo',
    bands: [3, 2, 1, 0, 1, 2, 1],
  },

  vocal: {
    id: 'vocal',
    name: 'Voces',
    category: 'studio',
    blurb: 'Claridad vocal',
    bands: [-2, -1, 1, 4, 5, 2, 0],
  },
  podcast: {
    id: 'podcast',
    name: 'Podcast',
    category: 'studio',
    blurb: 'Habla inteligible',
    bands: [-3, -1, 2, 5, 4, 1, -1],
  },
  live: {
    id: 'live',
    name: 'En vivo',
    category: 'studio',
    blurb: 'Sensación de sala',
    bands: [3, 1, -1, 0, 2, 3, 2],
  },
  cinema: {
    id: 'cinema',
    name: 'Cine',
    category: 'studio',
    blurb: 'Banda sonora',
    bands: [5, 3, 0, -1, 1, 2, 3],
  },
  bassCut: {
    id: 'bassCut',
    name: 'Menos graves',
    category: 'studio',
    blurb: 'Limpia el low-end',
    bands: [-5, -3, -1, 0, 1, 1, 0],
  },
  presence: {
    id: 'presence',
    name: 'Presencia',
    category: 'studio',
    blurb: 'Detalle medio-agudo',
    bands: [0, 0, 1, 2, 4, 3, 1],
  },
  warm: {
    id: 'warm',
    name: 'Cálido',
    category: 'studio',
    blurb: 'Tonos redondos',
    bands: [3, 2, 1, 0, -1, -2, -1],
  },
  bright: {
    id: 'bright',
    name: 'Cristalino',
    category: 'studio',
    blurb: 'Aire y definición',
    bands: [-1, 0, 0, 1, 2, 5, 7],
  },
}

export function getEqPreset(id) {
  return EQ_PRESETS[id] || null
}

export function getPresetDisplayName(eq) {
  if (!eq) return 'Plano'
  if (eq.preset === 'custom') return 'Personalizado'
  return getEqPreset(eq.preset)?.name || 'Plano'
}

export function clampBand(db) {
  const n = Number(db)
  if (!Number.isFinite(n)) return 0
  return Math.max(-12, Math.min(12, Math.round(n * 10) / 10))
}

export function normalizeEqBands(bands) {
  const src = Array.isArray(bands) ? bands : FLAT_BANDS
  return EQ_BANDS.map((_, i) => clampBand(src[i] ?? 0))
}

export function defaultEqualizerSettings() {
  return {
    enabled: false,
    preset: 'flat',
    bands: [...FLAT_BANDS],
  }
}

/** Path SVG para miniatura de curva EQ (viewBox 0 0 64 28). */
export function eqCurvePath(bands, { width = 64, height = 28 } = {}) {
  const values = normalizeEqBands(bands)
  const mid = height / 2
  const step = width / Math.max(1, values.length - 1)
  return values
    .map((db, i) => {
      const x = i * step
      const y = mid - (db / 12) * (mid - 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}
