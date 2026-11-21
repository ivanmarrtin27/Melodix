import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { detectGenre, GENRE_MAP_VERSION } from '../utils/helpers'
import { STORAGE_KEYS } from '../utils/storage'

const defaultStats = {
  totalSeconds: 0,
  todaySeconds: 0,
  todayDate: null,
  artists: {},
  songs: {},
  genres: {},
  hourly: Array(24).fill(0),
  streak: 0,
  lastListenDate: null,
  dailyGoal: 3600,
  genreMapVersion: 0,
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function updateStreak(lastDate, currentStreak) {
  if (!lastDate) return 1
  const last = new Date(`${lastDate}T12:00:00`)
  const today = new Date(`${todayKey()}T12:00:00`)
  const diff = Math.round((today - last) / 86400000)
  if (diff === 0) return currentStreak || 1
  if (diff === 1) return (currentStreak || 0) + 1
  return 1
}

function resolveGenre(track) {
  return detectGenre(
    track?.title,
    track?.artist,
    track?.genres || track?.genreLabels,
    track?.genreId ?? null
  )
}

/** Reconstruye géneros desde canciones escuchadas (arregla stats viejas en "Otros"). */
function rebuildGenresFromSongs(songs = {}) {
  const rebuilt = {}
  for (const song of Object.values(songs)) {
    if (!song) continue
    const seconds = Number(song.seconds) || 0
    if (seconds <= 0) continue
    const genre = detectGenre(song.title, song.artist, song.genres, song.genreId)
    rebuilt[genre] = (rebuilt[genre] || 0) + seconds
  }
  return rebuilt
}

function mergePersistedStats(persisted, current) {
  if (!persisted || typeof persisted !== 'object') return current
  const hourly =
    Array.isArray(persisted.hourly) && persisted.hourly.length === 24
      ? persisted.hourly
      : current.hourly

  return {
    ...current,
    ...persisted,
    hourly,
    todaySeconds: persisted.todaySeconds ?? 0,
    todayDate: persisted.todayDate ?? null,
    genreMapVersion: persisted.genreMapVersion ?? 0,
  }
}

export const useStatsStore = create(
  persist(
    (set, get) => ({
      ...defaultStats,

      recordPlayStart: (track) => {
        if (!track?.id) return
        const today = todayKey()

        set((s) => {
          const dayReset =
            s.todayDate === today ? {} : { todaySeconds: 0, todayDate: today }

          const streak =
            s.lastListenDate === today ? s.streak : updateStreak(s.lastListenDate, s.streak)

          const genre = resolveGenre(track)
          const songs = { ...s.songs }
          songs[track.id] = {
            ...(songs[track.id] || {}),
            title: track.title,
            artist: track.artist,
            thumbnail: track.thumbnail,
            genre,
            genreId: track.genreId ?? songs[track.id]?.genreId ?? null,
            count: (songs[track.id]?.count || 0) + 1,
            seconds: songs[track.id]?.seconds || 0,
          }

          return {
            ...dayReset,
            songs,
            streak: streak || 1,
            lastListenDate: today,
          }
        })
      },

      recordListeningTime: (track, seconds) => {
        if (!track?.id || !Number.isFinite(seconds) || seconds <= 0) return

        const hour = new Date().getHours()
        const genre = resolveGenre(track)
        const today = todayKey()
        const rounded = Math.round(seconds)

        set((s) => {
          const dayReset =
            s.todayDate === today ? {} : { todaySeconds: 0, todayDate: today }

          const artists = { ...s.artists }
          const songs = { ...s.songs }
          const genres = { ...s.genres }
          const hourly = [...s.hourly]

          artists[track.artist] = (artists[track.artist] || 0) + rounded
          songs[track.id] = {
            ...(songs[track.id] || {
              title: track.title,
              artist: track.artist,
              thumbnail: track.thumbnail,
              count: 0,
            }),
            title: track.title,
            artist: track.artist,
            thumbnail: track.thumbnail || songs[track.id]?.thumbnail,
            genre,
            genreId: track.genreId ?? songs[track.id]?.genreId ?? null,
            seconds: (songs[track.id]?.seconds || 0) + rounded,
          }
          genres[genre] = (genres[genre] || 0) + rounded
          hourly[hour] += rounded

          const streak =
            s.lastListenDate === today ? s.streak : updateStreak(s.lastListenDate, s.streak)

          const todaySeconds = (dayReset.todaySeconds ?? s.todaySeconds) + rounded

          return {
            ...dayReset,
            totalSeconds: s.totalSeconds + rounded,
            todaySeconds,
            artists,
            songs,
            genres,
            hourly,
            streak: streak || 1,
            lastListenDate: today,
          }
        })
      },

      /** @deprecated Usar recordPlayStart + recordListeningTime */
      recordListen: (track, seconds = 30) => {
        get().recordListeningTime(track, seconds)
      },

      getTopArtists: (limit = 5) => {
        const { artists, totalSeconds } = get()
        return Object.entries(artists)
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit)
          .map(([name, seconds]) => ({
            name,
            seconds,
            percent: totalSeconds ? Math.round((seconds / totalSeconds) * 100) : 0,
          }))
      },

      getTopSongs: (limit = 5) => {
        const { songs } = get()
        return Object.values(songs)
          .sort((a, b) => b.count - a.count || b.seconds - a.seconds)
          .slice(0, limit)
      },

      getGenreData: () => {
        const { songs, genres } = get()
        const rebuilt = rebuildGenresFromSongs(songs)
        const source = Object.keys(rebuilt).length > 0 ? rebuilt : genres
        return Object.entries(source)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      },

      /** Reclasifica géneros guardados con el detector actual. */
      reclassifyGenres: () => {
        set((s) => {
          const songs = { ...s.songs }
          for (const [id, song] of Object.entries(songs)) {
            if (!song) continue
            songs[id] = {
              ...song,
              genre: detectGenre(song.title, song.artist, song.genres, song.genreId),
            }
          }
          return {
            songs,
            genres: rebuildGenresFromSongs(songs),
            genreMapVersion: GENRE_MAP_VERSION,
          }
        })
      },

      ensureGenresUpToDate: () => {
        const { genreMapVersion, songs } = get()
        if (!Object.keys(songs || {}).length) {
          if (genreMapVersion !== GENRE_MAP_VERSION) {
            set({ genreMapVersion: GENRE_MAP_VERSION })
          }
          return
        }
        if (genreMapVersion === GENRE_MAP_VERSION) return
        get().reclassifyGenres()
      },

      getTodayProgress: () => {
        const { todaySeconds, dailyGoal, todayDate } = get()
        const today = todayKey()
        const seconds = todayDate === today ? todaySeconds : 0
        return {
          seconds,
          goal: dailyGoal,
          percent: dailyGoal ? Math.min((seconds / dailyGoal) * 100, 100) : 0,
        }
      },

      resetStats: () => set({ ...defaultStats, genreMapVersion: GENRE_MAP_VERSION }),
    }),
    {
      name: STORAGE_KEYS.STATS,
      merge: mergePersistedStats,
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          try {
            useStatsStore.getState().ensureGenresUpToDate()
          } catch {
            /* ignore */
          }
        })
      },
    }
  )
)
