export const GENRES = [
  {
    id: 'pop',
    name: 'Pop',
    color: '#e11d8c',
    colorDeep: '#4a0629',
    icon: 'Mic2',
    deezerId: 132,
    tagline: 'Hits globales',
    blurb: 'Lo más escuchado del pop actual y los clásicos que no pasan de moda.',
  },
  {
    id: 'rock',
    name: 'Rock',
    color: '#dc2626',
    colorDeep: '#2a0606',
    icon: 'Disc3',
    deezerId: 152,
    tagline: 'Guitarra y escenario',
    blurb: 'Clásicos, alternativas y novedades del rock con charts oficiales.',
  },
  {
    id: 'reggaeton',
    name: 'Reggaeton',
    color: '#ea580c',
    colorDeep: '#2c1004',
    icon: 'Flame',
    deezerId: 122,
    tagline: 'Perreo & urbano',
    blurb: 'El sonido urbano latino: charts, listas editoriales y artistas top.',
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop',
    color: '#ca8a04',
    colorDeep: '#241a02',
    icon: 'Headphones',
    deezerId: 116,
    tagline: 'Rap esencial',
    blurb: 'Bars, beats y lo más fuerte del rap y el hip-hop ahora mismo.',
  },
  {
    id: 'electronic',
    name: 'Electrónica',
    color: '#0891b2',
    colorDeep: '#04242c',
    icon: 'Radio',
    deezerId: 106,
    tagline: 'Dance & club',
    blurb: 'Desde el underground hasta los hits de pista: EDM, house y más.',
  },
  {
    id: 'rnb',
    name: 'R&B',
    color: '#9333ea',
    colorDeep: '#1e0838',
    icon: 'Heart',
    deezerId: 165,
    tagline: 'Soul contemporáneo',
    blurb: 'Voces, groove y atmósferas del R&B y el soul actuales.',
  },
  {
    id: 'flamenco',
    name: 'Flamenco',
    color: '#b91c1c',
    colorDeep: '#2a0808',
    icon: 'Music2',
    deezerId: null,
    tagline: 'Raíz y fusión',
    blurb: 'Flamenco puro y nuevo flamenco: artistas, álbumes y listas curadas.',
  },
  {
    id: 'indie',
    name: 'Indie',
    color: '#65a30d',
    colorDeep: '#142206',
    icon: 'Leaf',
    deezerId: 85,
    tagline: 'Alternativo',
    blurb: 'Descubre lo nuevo del indie y el pop alternativo con charts oficiales.',
  },
  {
    id: 'jazz',
    name: 'Jazz',
    color: '#4f46e5',
    colorDeep: '#12103a',
    icon: 'Music4',
    deezerId: 129,
    tagline: 'Improvisación',
    blurb: 'Estándares, contemporáneo y lo esencial del jazz en charts oficiales.',
  },
  {
    id: 'classical',
    name: 'Clásica',
    color: '#78716c',
    colorDeep: '#1c1a18',
    icon: 'Award',
    deezerId: 98,
    tagline: 'Orquesta & cámara',
    blurb: 'Obras imprescindibles y selecciones editoriales de música clásica.',
  },
  {
    id: 'metal',
    name: 'Metal',
    color: '#52525b',
    colorDeep: '#0f0f12',
    icon: 'Zap',
    deezerId: 464,
    tagline: 'Peso y potencia',
    blurb: 'Heavy, metalcore y lo más duro del chart metal oficial.',
  },
  {
    id: 'latin',
    name: 'Latina',
    color: '#d97706',
    colorDeep: '#2a1602',
    icon: 'Sun',
    deezerId: 197,
    tagline: 'Ritmo latino',
    blurb: 'Pop latino, tropical y lo que mueve las listas en español.',
  },
]

export function getGenreById(id) {
  return GENRES.find((g) => g.id === id) || null
}

/** Queries para listas oficiales cuando no hay chart limpio. */
export const GENRE_PLAYLIST_QUERIES = {
  pop: ['Pop Hits', 'Top Pop', 'Pop Essentials', 'Hot Hits'],
  rock: ['Rock Hits', 'Classic Rock', 'Rock Essentials', 'Best Rock'],
  reggaeton: ['Reggaeton Hits', 'Perreo Intensivo', 'Latin Urban', 'Reggaeton Essentials'],
  hiphop: ['Rap Hits', 'Hip-Hop Hits', 'Rap Essentials', 'Top Rap'],
  electronic: ['Dance Hits', 'Electronic Hits', 'EDM Hits', 'Club Hits'],
  rnb: ['R&B Hits', 'Soul Hits', 'R&B Essentials', 'Top R&B'],
  flamenco: ['Flamenco Hits', 'Nuevo Flamenco', 'Flamenco Pop', 'Cante Flamenco'],
  indie: ['Indie Hits', 'Alternative Hits', 'Indie Essentials', 'Indie Pop'],
  jazz: ['Jazz Hits', 'Jazz Essentials', 'Smooth Jazz', 'Best Jazz'],
  classical: ['Classical Essentials', 'Clásica', 'Best of Classical', 'Orchestra Hits'],
  metal: ['Metal Hits', 'Heavy Metal', 'Metal Essentials', 'Best Metal'],
  latin: ['Latin Hits', 'Pop Latino', 'Latino Hits', 'Tropical Hits'],
}

/** Subir cuando cambie el mapa de géneros → fuerza reclasificar stats guardadas. */
export const GENRE_MAP_VERSION = 4

const GENRE_BY_NAME = Object.fromEntries(
  GENRES.map((g) => [g.name.toLowerCase(), g.name])
)

/** IDs oficiales Deezer → género Melodix */
export const DEEZER_GENRE_ID_MAP = {
  132: 'Pop',
  116: 'Hip-Hop',
  122: 'Reggaeton',
  152: 'Rock',
  113: 'Electrónica',
  165: 'R&B',
  85: 'Indie',
  106: 'Electrónica',
  129: 'Jazz',
  67: 'Latina',
  98: 'Clásica',
  464: 'Metal',
  169: 'R&B',
  71: 'Latina',
  197: 'Latina',
  144: 'Latina',
  466: 'Indie',
  138: 'Latina', // Pop latino
}

/** Artistas conocidos → género de la app (escena comercial / urbana). */
const ARTIST_GENRE_MAP = {
  'bad bunny': 'Reggaeton',
  'karol g': 'Reggaeton',
  feid: 'Reggaeton',
  'j balvin': 'Reggaeton',
  'rauw alejandro': 'Reggaeton',
  'anuel aa': 'Reggaeton',
  ozuna: 'Reggaeton',
  'daddy yankee': 'Reggaeton',
  'myke towers': 'Reggaeton',
  jhayco: 'Reggaeton',
  'jhay cortez': 'Reggaeton',
  'omar courtz': 'Reggaeton',
  quevedo: 'Reggaeton',
  mora: 'Reggaeton',
  'milo j': 'Reggaeton',
  'eladio carrion': 'Reggaeton',
  'young miko': 'Reggaeton',
  'bad gyal': 'Reggaeton',
  'jc reyes': 'Reggaeton',
  sech: 'Reggaeton',
  'peso pluma': 'Latina',
  'floyy menor': 'Reggaeton',
  floyymenor: 'Reggaeton',
  'cris mj': 'Reggaeton',
  blessd: 'Reggaeton',
  'bryant myers': 'Reggaeton',
  haze: 'Reggaeton',
  tainy: 'Reggaeton',
  bizarrap: 'Hip-Hop',
  'rels b': 'Hip-Hop',
  delaossa: 'Hip-Hop',
  'recycled j': 'Hip-Hop',
  bejo: 'Hip-Hop',
  'c. tangana': 'Flamenco',
  'c tangana': 'Flamenco',
  rosalía: 'Flamenco',
  rosalia: 'Flamenco',
  judeline: 'Indie',
  aitana: 'Pop',
  'lola indigo': 'Pop',
  'lola índigo': 'Pop',
  emilia: 'Pop',
  'tiago pzk': 'Reggaeton',
  trueno: 'Hip-Hop',
  'nicki nicole': 'Hip-Hop',
  shakira: 'Latina',
  maluma: 'Reggaeton',
  'nicky jam': 'Reggaeton',
  farruko: 'Reggaeton',
  'don omar': 'Reggaeton',
  wisin: 'Reggaeton',
  yandel: 'Reggaeton',
  arcangel: 'Reggaeton',
  'de la ghetto': 'Reggaeton',
  'ivy queen': 'Reggaeton',
  'becky g': 'Reggaeton',
  'maria becerra': 'Reggaeton',
  tini: 'Pop',
  'dua lipa': 'Pop',
  'the weeknd': 'R&B',
  'taylor swift': 'Pop',
  'billie eilish': 'Pop',
  'ariana grande': 'Pop',
  drake: 'Hip-Hop',
  'travis scott': 'Hip-Hop',
  'kanye west': 'Hip-Hop',
  'kendrick lamar': 'Hip-Hop',
  metallica: 'Metal',
  'imagine dragons': 'Rock',
  coldplay: 'Pop',
  'ed sheeran': 'Pop',
  'harry styles': 'Pop',
  'bruno mars': 'Pop',
  adele: 'Pop',
  sza: 'R&B',
  'doja cat': 'Pop',
  // Escena ES / LAT ampliada
  'ana mena': 'Pop',
  'manuel carrasco': 'Pop',
  'pablo alboran': 'Pop',
  'pablo alborán': 'Pop',
  'dani fernandez': 'Pop',
  'dani fernández': 'Pop',
  'nil moliner': 'Pop',
  'mora y mas': 'Reggaeton',
  'rvfv': 'Reggaeton',
  'dellafuente': 'Flamenco',
  'makarines': 'Flamenco',
  'nathy peluso': 'Latina',
  'bizarrap': 'Hip-Hop',
  'lit killah': 'Hip-Hop',
  'duki': 'Hip-Hop',
  'khea': 'Reggaeton',
  'cazzu': 'Reggaeton',
  'nicky nicole': 'Hip-Hop',
  'wos': 'Hip-Hop',
  'yael ybillah': 'Hip-Hop',
  'soge culebra': 'Hip-Hop',
  'gazir': 'Hip-Hop',
  'natos y waor': 'Hip-Hop',
  'hard gz': 'Hip-Hop',
  'morad': 'Hip-Hop',
  'beny jr': 'Hip-Hop',
  'el reno renardo': 'Hip-Hop',
  'kapo': 'Reggaeton',
  'beele': 'Reggaeton',
  'hugel': 'Electrónica',
  'meduza': 'Electrónica',
  'calvin harris': 'Electrónica',
  'david guetta': 'Electrónica',
  'marshmello': 'Electrónica',
  'the chainsmokers': 'Electrónica',
  'olivia rodrigo': 'Pop',
  'sabrina carpenter': 'Pop',
  'charli xcx': 'Pop',
  'lady gaga': 'Pop',
  beyonce: 'R&B',
  beyoncé: 'R&B',
  rihanna: 'Pop',
  'post malone': 'Hip-Hop',
  '21 savage': 'Hip-Hop',
  'future': 'Hip-Hop',
  'metro boomin': 'Hip-Hop',
  'ice spice': 'Hip-Hop',
  'tyler the creator': 'Hip-Hop',
  'frank ocean': 'R&B',
  'the neighbourhood': 'Indie',
  arctic: 'Indie',
  'arctic monkeys': 'Indie',
  'tame impala': 'Indie',
  'lana del rey': 'Indie',
  'radiohead': 'Rock',
  'foo fighters': 'Rock',
  queen: 'Rock',
  'the beatles': 'Rock',
  'linkin park': 'Rock',
  'red hot chili peppers': 'Rock',
  'guns n roses': 'Rock',
  'manuel turizo': 'Reggaeton',
  'sebastian yatra': 'Latina',
  'camilo': 'Latina',
  'carin leon': 'Latina',
  'grupo frontera': 'Latina',
  'fuerza regida': 'Latina',
  'junior h': 'Latina',
  'natanael cano': 'Latina',
  'romeo santos': 'Latina',
  'prince royce': 'Latina',
  'aventura': 'Latina',
  'enrique iglesias': 'Latina',
  'luis fonsi': 'Latina',
  'ricky martin': 'Latina',
  'jenni rivera': 'Latina',
  'christian nodal': 'Latina',
  'arde bogota': 'Rock',
  'arde bogotá': 'Rock',
  'vetusta morla': 'Indie',
  'love of lesbian': 'Indie',
  'izal': 'Indie',
  'leiva': 'Rock',
  'extremoduro': 'Rock',
  'estopa': 'Flamenco',
  'melendi': 'Pop',
  'alejandro sanz': 'Pop',
  'david bisbal': 'Pop',
  'juanes': 'Latina',
  'j balbin': 'Reggaeton',
  'rai nenes': 'Reggaeton',
  'eladio': 'Reggaeton',
  'alvaro diaz': 'Reggaeton',
  'guaynaa': 'Reggaeton',
  'lunay': 'Reggaeton',
  'paloma mami': 'Reggaeton',
  'tokischa': 'Reggaeton',
  'villano antillano': 'Reggaeton',
  'raw alejandro': 'Reggaeton',
}

/** Palabras clave en título/artista → género (orden = prioridad). */
const GENRE_KEYWORDS = [
  {
    name: 'Reggaeton',
    keys: [
      'reggaeton',
      'reggaetón',
      'dembow',
      'perreo',
      'guaya',
      'nepeo',
      'urbano latino',
      'latin trap',
      'trap latino',
      'corridos tumbados',
      'perreito',
    ],
  },
  {
    name: 'Hip-Hop',
    keys: [
      'hip-hop',
      'hip hop',
      'hiphop',
      'rap',
      'drill',
      'freestyle',
      'boom bap',
      'trap beat',
    ],
  },
  {
    name: 'Flamenco',
    keys: ['flamenco', 'rumba', 'cante', 'nuevo flamenco', 'flamenco pop'],
  },
  {
    name: 'Electrónica',
    keys: [
      'electronic',
      'electrónica',
      'electronica',
      'edm',
      'techno',
      'house',
      'trance',
      'dubstep',
      'drum and bass',
      'dnb',
      'synth',
      'remix club',
    ],
  },
  {
    name: 'R&B',
    keys: ['r&b', 'rnb', 'rhythm and blues', 'soul'],
  },
  {
    name: 'Rock',
    keys: ['rock', 'punk', 'grunge', 'alternative rock'],
  },
  {
    name: 'Metal',
    keys: ['metal', 'hardcore', 'death metal', 'heavy metal'],
  },
  {
    name: 'Jazz',
    keys: ['jazz', 'bossa', 'swing', 'bebop'],
  },
  {
    name: 'Clásica',
    keys: ['classical', 'clásica', 'clasica', 'symphony', 'orchestra', 'ópera', 'opera'],
  },
  {
    name: 'Indie',
    keys: ['indie', 'alternative', 'alt pop', 'dream pop'],
  },
  {
    name: 'Latina',
    keys: [
      'salsa',
      'bachata',
      'cumbia',
      'merengue',
      'vallenato',
      'mariachi',
      'ranchera',
      'corrido',
      'regional mexicano',
      'latin',
      'latina',
      'latino',
    ],
  },
  {
    name: 'Pop',
    keys: ['pop', 'k-pop', 'kpop', 'dance pop'],
  },
]

/** Normaliza nombres de género Deezer / Last.fm a los de Melodix. */
export function normalizeGenreLabel(raw) {
  if (raw == null) return null
  if (typeof raw === 'number') {
    return DEEZER_GENRE_ID_MAP[raw] || null
  }
  if (typeof raw !== 'string') return null
  const g = raw.trim().toLowerCase()
  if (!g) return null

  if (GENRE_BY_NAME[g]) return GENRE_BY_NAME[g]

  if (/reggaeton|reggaetón|dembow|latin urban|urbano latino|musica urbana|música urbana/.test(g)) {
    return 'Reggaeton'
  }
  if (/rap\/hip|hip.?hop|rap\b|drill/.test(g)) return 'Hip-Hop'
  if (/flamenco/.test(g)) return 'Flamenco'
  if (/electro|edm|techno|house|\bdance\b/.test(g)) return 'Electrónica'
  if (/r&b|rnb|soul|funk/.test(g)) return 'R&B'
  if (/metal/.test(g)) return 'Metal'
  if (/rock|punk|grunge/.test(g)) return 'Rock'
  if (/jazz|bossa/.test(g)) return 'Jazz'
  if (/classic|clásica|clasica|opera|ópera/.test(g)) return 'Clásica'
  if (/indie|alternativ/.test(g)) return 'Indie'
  if (/salsa|bachata|cumbia|merengue|pop latino|latino|latina|mexica|corrido|reggae\b/.test(g)) {
    return 'Latina'
  }
  if (/\btrap\b/.test(g)) return 'Hip-Hop'
  if (/pop/.test(g)) return 'Pop'

  return null
}

function normalizeArtistKey(name = '') {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitArtistNames(artist = '') {
  return String(artist || '')
    .split(/\s*(?:,|&|\/|·|\|| x | X | y | and | feat\.?|ft\.?|featuring|con )\s*/i)
    .map((part) =>
      part
        .replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .map(normalizeArtistKey)
    .filter((k) => k.length >= 2)
}

function genreFromArtistKey(artistKey) {
  if (!artistKey) return null
  if (ARTIST_GENRE_MAP[artistKey]) return ARTIST_GENRE_MAP[artistKey]

  // Solo coincidencias de token completas (evita "v" → travis scott)
  for (const [key, genre] of Object.entries(ARTIST_GENRE_MAP)) {
    if (key.length < 4) continue
    if (artistKey === key) return genre
    if (artistKey.startsWith(`${key} `) || artistKey.endsWith(` ${key}`)) return genre
    if (artistKey.includes(` ${key} `)) return genre
  }
  return null
}

function detectGenreFromArtists(artist) {
  const parts = splitArtistNames(artist)
  for (const part of parts) {
    const hit = genreFromArtistKey(part)
    if (hit) return hit
  }
  // Frase completa por si el mapa tiene nombres compuestos
  return genreFromArtistKey(normalizeArtistKey(artist))
}

/**
 * Detecta género: artista conocido > catálogo Deezer > palabras clave.
 */
export function detectGenre(title, artist, extraGenres = [], genreId = null) {
  const fromArtist = detectGenreFromArtists(artist)
  if (fromArtist) return fromArtist

  // Feats en el título
  const featBits = String(title || '').match(
    /(?:feat\.?|ft\.?|featuring|con|with)\s+([^)\]]+)/i
  )
  if (featBits?.[1]) {
    const fromFeat = detectGenreFromArtists(featBits[1])
    if (fromFeat) return fromFeat
  }

  if (genreId != null) {
    const fromId = normalizeGenreLabel(Number(genreId)) || normalizeGenreLabel(genreId)
    if (fromId) return fromId
  }

  const catalog = Array.isArray(extraGenres)
    ? extraGenres
    : typeof extraGenres === 'string'
      ? [extraGenres]
      : []
  for (const raw of catalog) {
    const mapped = normalizeGenreLabel(raw)
    if (mapped) return mapped
  }

  const text = `${title || ''} ${artist || ''}`.toLowerCase()
  for (const group of GENRE_KEYWORDS) {
    if (group.keys.some((k) => text.includes(k))) return group.name
  }

  return 'Otros'
}
