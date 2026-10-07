import { compactMatchText, normalizeMatchText, titleTokens } from './trackMatch.js'

/** Puntuación de relevancia artista ↔ texto buscado (exacto > prefijo > contiene + popularidad). */
export function scoreArtistForQuery(artist, query) {
  const q = normalizeMatchText(query)
  if (!q || !artist?.name) return -1

  const name = normalizeMatchText(artist.name)
  const qCompact = compactMatchText(q)
  const nameCompact = compactMatchText(name)

  let score = 0

  if (name === q || nameCompact === qCompact) score += 120
  else if (name.startsWith(q) || nameCompact.startsWith(qCompact)) score += 85
  else if (name.includes(q) || nameCompact.includes(qCompact)) score += 55
  else {
    const tokens = titleTokens(q)
    if (!tokens.length) return -1
    const hits = tokens.filter((t) => name.includes(t)).length
    const ratio = hits / tokens.length
    if (ratio < 0.5) return -1
    score += Math.round(ratio * 40)
  }

  // Popularidad (fans Deezer): peso fuerte para separar perfiles reales de clones
  const fans = Number(artist.fans) || 0
  if (fans > 0) {
    score += Math.min(48, Math.log10(fans + 10) * 9)
  }

  const albums = Number(artist.albumCount) || 0
  // Penaliza catálogos spam (muchos álbumes, casi nadie escucha)
  if (albums >= 40 && fans < 800) score -= 40
  else if (albums >= 20 && fans < 150) score -= 25

  // Bonus si el nombre es corto y coincide bien (menos ruido)
  if (name.split(' ').length <= 3 && score >= 55) score += 4

  return score
}

/** Un nombre → un artista (el de más fans). */
export function dedupeArtistsByName(artists) {
  const best = new Map()
  for (const artist of artists || []) {
    const key = normalizeMatchText(artist?.name || '')
    if (!key) continue
    const prev = best.get(key)
    if (!prev || (Number(artist.fans) || 0) > (Number(prev.fans) || 0)) {
      best.set(key, artist)
    }
  }
  return [...best.values()]
}

/**
 * Quita perfiles fantasma / clones de Deezer.
 * Conserva artistas con tracción real o que aparecen en las canciones de la misma búsqueda.
 */
export function filterCredibleSearchArtists(artists, query, { fromTracks = [] } = {}) {
  const q = normalizeMatchText(query)
  const qCompact = compactMatchText(q)
  const trackIds = new Set(
    (fromTracks || [])
      .map((a) => String(a.deezerId || a.id || ''))
      .filter(Boolean)
  )
  const trackNames = new Set(
    (fromTracks || [])
      .map((a) => normalizeMatchText(a.name || a.artist || ''))
      .filter(Boolean)
  )

  const deduped = dedupeArtistsByName(artists)
  if (!deduped.length) return []

  const maxFans = Math.max(0, ...deduped.map((a) => Number(a.fans) || 0))

  return deduped.filter((artist) => {
    const fans = Number(artist.fans) || 0
    const albums = Number(artist.albumCount) || 0
    const id = String(artist.deezerId || artist.id || '')
    const name = normalizeMatchText(artist.name || '')
    const nameCompact = compactMatchText(name)
    const exact = Boolean(q) && (name === q || nameCompact === qCompact)
    const inTracks = trackIds.has(id) || trackNames.has(name)

    // Confirmado por hits de canciones de esta búsqueda
    if (inTracks && fans >= 40) return true
    if (inTracks && exact && fans >= 100) return true

    // Cáscaras vacías
    if (fans <= 0) return false
    if (fans < 30 && albums <= 3) return false

    // Spam típico: discografía inflada sin oyentes
    if (albums >= 50 && fans < 1000) return false
    if (albums >= 25 && fans < 200) return false

    // Si hay un perfil claro dominante, descarta clones débiles
    if (maxFans >= 8000) {
      const floor = Math.max(500, Math.floor(maxFans * 0.02))
      if (fans < floor) return false
    } else if (maxFans >= 1500) {
      const floor = Math.max(120, Math.floor(maxFans * 0.04))
      if (fans < floor && !exact) return false
      if (exact && fans < Math.max(80, Math.floor(maxFans * 0.015))) return false
    } else if (maxFans >= 400) {
      if (fans < 60 && !inTracks) return false
    } else if (!exact && fans < 40) {
      return false
    }

    return true
  })
}

export function rankArtistsByQuery(artists, query) {
  if (!artists?.length) return []
  return [...artists]
    .map((artist, index) => ({
      artist,
      index,
      score: scoreArtistForQuery(artist, query),
    }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.artist)
}

/** Álbumes: título + artista vs query. */
export function scoreAlbumForQuery(album, query) {
  const q = normalizeMatchText(query)
  if (!q || !album?.title) return -1
  const title = normalizeMatchText(album.title)
  const artist = normalizeMatchText(album.artist || '')
  let score = 0
  if (title === q) score += 90
  else if (title.startsWith(q)) score += 60
  else if (title.includes(q)) score += 35
  if (artist === q) score += 40
  else if (artist.includes(q)) score += 20
  return score
}

export function rankAlbumsByQuery(albums, query) {
  if (!albums?.length) return []
  return [...albums]
    .map((album, index) => ({
      album,
      index,
      score: scoreAlbumForQuery(album, query),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.album)
}

const JUNK_TRACK_TITLE =
  /karaoke|tribute|in the style of|made famous|cover version|instrumental covers|best of the best|megamix|piano version|8-bit|lofi remake|nightcore|sped up|slowed|reverb/i

/** Canciones oficiales: sin covers/karaoke, dedupe y ranking por match + popularidad. */
export function scoreTrackForQuery(track, query) {
  const q = normalizeMatchText(query)
  if (!q || !track?.title) return -1

  const title = normalizeMatchText(track.title)
  const artist = normalizeMatchText(track.artist || '')
  let score = 0

  if (title === q) score += 120
  else if (title.startsWith(q)) score += 80
  else if (title.includes(q)) score += 45
  else {
    const tokens = titleTokens(q)
    if (!tokens.length) return -1
    const hits = tokens.filter((t) => title.includes(t) || artist.includes(t)).length
    const ratio = hits / tokens.length
    if (ratio < 0.5) return -1
    score += Math.round(ratio * 40)
  }

  if (artist === q) score += 40
  else if (artist.startsWith(q) || q.startsWith(artist)) score += 28
  else if (artist.includes(q) || q.includes(artist)) score += 18

  // Popularidad Deezer (rank): lo que más escucha la gente
  const rank = Number(track.rank) || 0
  if (rank >= 500_000) score += 55
  else if (rank >= 100_000) score += 42
  else if (rank >= 20_000) score += 30
  else if (rank >= 5_000) score += 18
  else if (rank > 0) score += Math.min(14, Math.log10(rank + 10) * 4)
  else score -= 8

  if (JUNK_TRACK_TITLE.test(track.title || '')) score -= 100

  return score
}

/** Top N canciones oficiales / relevantes (match + oyentes). */
export function filterOfficialSearchTracks(tracks, query, limit = 6) {
  if (!tracks?.length) return []

  const ranked = [...tracks]
    .filter((track) => {
      if (!track?.title) return false
      if (JUNK_TRACK_TITLE.test(track.title)) return false
      return scoreTrackForQuery(track, query) >= 35
    })
    .map((track, index) => ({
      track,
      index,
      score: scoreTrackForQuery(track, query),
      popularity: Number(track.rank) || 0,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.popularity - a.popularity ||
        a.index - b.index
    )

  // Dedupe por título+artista (quedarse con la más popular)
  const seen = new Set()
  const out = []
  for (const row of ranked) {
    const key = `${normalizeMatchText(row.track.title)}|${normalizeMatchText(row.track.artist)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row.track)
    if (out.length >= limit) break
  }
  return out
}
