import axios from 'axios'
import cacheService from './cacheService'

const BASE = 'https://lrclib.net/api'

const lyricsApi = {
  async getLyrics(title, artist, duration = null) {
    if (!title?.trim() || !artist?.trim()) {
      return { synced: null, plain: null, hasSynced: false }
    }

    const key = `lrclib:${title}:${artist}`.toLowerCase()
    const cached = cacheService.getAny(key)
    if (cached) return cached

    try {
      const params = { track_name: title, artist_name: artist }
      if (duration) params.duration = Math.round(duration)

      const { data } = await axios.get(`${BASE}/get`, { params, timeout: 5000 })

      const result = {
        synced: data.syncedLyrics || null,
        plain: data.plainLyrics || null,
        hasSynced: !!data.syncedLyrics,
      }

      cacheService.setAll(key, result, 86400, 86400 * 7)
      return result
    } catch {
      const empty = { synced: null, plain: null, hasSynced: false }
      // Evita martillar lrclib en misses repetidos
      cacheService.setAll(key, empty, 600, 1800)
      return empty
    }
  },

  parseLRC(lrcString) {
    if (!lrcString) return []
    const parsed = []

    for (const line of lrcString.split('\n')) {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/)
      if (!match) continue
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const ms = parseInt(match[3].padEnd(3, '0'), 10)
      const time = minutes * 60 + seconds + ms / 1000
      const text = match[4].trim()
      if (text) parsed.push({ time, text })
    }

    return parsed.sort((a, b) => a.time - b.time)
  },

  getActiveLine(parsedLyrics, currentTime) {
    let active = 0
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (parsedLyrics[i].time <= currentTime) active = i
      else break
    }
    return active
  },
}

export default lyricsApi
