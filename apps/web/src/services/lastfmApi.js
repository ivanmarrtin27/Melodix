import axios from 'axios'
import cacheService from './cacheService'

const BASE = 'https://ws.audioscrobbler.com/2.0'
const KEY = import.meta.env.VITE_LASTFM_KEY || ''

const api = axios.create({ baseURL: BASE, timeout: 8000 })

function hasKey() {
  return Boolean(KEY)
}

const lastfmApi = {
  async getSimilarArtists(artist, limit = 6) {
    if (!hasKey() || !artist?.trim()) return []

    const key = `lastfm:similar:${artist.toLowerCase()}`
    const cached = cacheService.getAny(key)
    if (cached) return cached

    const { data } = await api.get('/', {
      params: {
        method: 'artist.getSimilar',
        artist,
        limit,
        api_key: KEY,
        format: 'json',
      },
    })

    const artists = (data.similarartists?.artist || []).map((a) => ({
      name: a.name,
      match: parseFloat(a.match),
      image: a.image?.find((i) => i.size === 'large')?.['#text'] || null,
    }))

    cacheService.setAll(key, artists, 3600, 86400)
    return artists
  },

  async getSimilarTracks(title, artist, limit = 8) {
    if (!hasKey() || !title?.trim() || !artist?.trim()) return []

    const key = `lastfm:simtrack:${title}:${artist}`.toLowerCase()
    const cached = cacheService.getAny(key)
    if (cached) return cached

    const { data } = await api.get('/', {
      params: {
        method: 'track.getSimilar',
        track: title,
        artist,
        limit,
        api_key: KEY,
        format: 'json',
      },
    })

    const tracks = (data.similartracks?.track || []).map((t) => ({
      title: t.name,
      artist: t.artist?.name || artist,
      match: parseFloat(t.match),
      videoId: null,
      cover: null,
    }))

    cacheService.setAll(key, tracks, 3600, 86400)
    return tracks
  },

  async getArtistTopTracks(artist, limit = 10) {
    if (!hasKey() || !artist?.trim()) return []

    const key = `lastfm:arttop:${artist.toLowerCase()}`
    const cached = cacheService.getAny(key)
    if (cached) return cached

    const { data } = await api.get('/', {
      params: {
        method: 'artist.getTopTracks',
        artist,
        limit,
        api_key: KEY,
        format: 'json',
      },
    })

    const tracks = (data.toptracks?.track || []).map((t) => ({
      title: t.name,
      artist: t.artist?.name || artist,
      plays: parseInt(t.playcount, 10) || 0,
      videoId: null,
    }))

    cacheService.setAll(key, tracks, 3600, 86400)
    return tracks
  },

  async getArtistInfo(artist) {
    if (!hasKey() || !artist?.trim()) return null

    const key = `lastfm:artinfo:${artist.toLowerCase()}`
    const cached = cacheService.getAny(key)
    if (cached) return cached

    const { data } = await api.get('/', {
      params: {
        method: 'artist.getInfo',
        artist,
        api_key: KEY,
        format: 'json',
      },
    })

    const summary = data.artist?.bio?.summary?.replace(/<[^>]+>/g, '') || ''
    const info = {
      name: data.artist?.name,
      bio: summary ? `${summary.split('.')[0]}.` : '',
      tags: (data.artist?.tags?.tag || []).map((t) => t.name).slice(0, 5),
      image:
        data.artist?.image?.find((i) => i.size === 'extralarge')?.['#text'] || null,
    }

    cacheService.setAll(key, info, 3600, 86400)
    return info
  },
}

export default lastfmApi
