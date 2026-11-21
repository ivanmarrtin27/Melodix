import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { STORAGE_KEYS } from '../utils/storage'
import { isLikedPlaylistId, normalizeLibraryState, generateLikedPlaylistCover } from '../utils/likedPlaylist'

const withLibrary = (partial) => (set, get) => {
  const next = typeof partial === 'function' ? partial(get()) : partial
  set(normalizeLibraryState({ ...get(), ...next }))
}

function albumSnapshot(album) {
  const id = String(album.deezerId ?? album.id ?? '')
  if (!id) return null
  return {
    id,
    deezerId: album.deezerId ?? album.id,
    title: album.title || '',
    artist: album.artist || '',
    cover: album.cover || '',
    releaseDate: album.releaseDate || '',
    trackCount: album.trackCount || album.tracks?.length || 0,
    tracks: album.tracks || [],
    savedAt: new Date().toISOString(),
  }
}

function artistSnapshot(artist) {
  const id = String(artist.deezerId ?? artist.id ?? '')
  if (!id) return null
  const image =
    artist.image ||
    artist.picture_xl ||
    artist.picture_big ||
    artist.picture_medium ||
    artist.picture_small ||
    ''
  return {
    id,
    deezerId: artist.deezerId ?? artist.id,
    name: artist.name || '',
    image,
    fans: artist.fans || 0,
    followedAt: new Date().toISOString(),
  }
}

const libraryStorage = createJSONStorage(() => ({
  getItem: (name) => {
    const current = localStorage.getItem(name)
    if (current != null) return current
    if (name === STORAGE_KEYS.LIBRARY) {
      return localStorage.getItem(STORAGE_KEYS.PLAYLISTS)
    }
    return null
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value)
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
    if (name === STORAGE_KEYS.LIBRARY) {
      localStorage.removeItem(STORAGE_KEYS.PLAYLISTS)
    }
  },
}))

export const useLibraryStore = create(
  persist(
    (set, get) => ({
      recent: [],
      recentAlbums: [],
      recentPlaylists: [],
      favorites: [],
      favoriteAlbums: [],
      followedArtists: [],
      playlists: [],
      albums: [],

      ensureLibraryNormalized: () => set((s) => normalizeLibraryState(s)),

      addRecent: (track) =>
        set((s) => {
          const filtered = s.recent.filter((t) => t.id !== track.id)
          return { recent: [track, ...filtered].slice(0, 20) }
        }),

      addRecentAlbum: (album) =>
        set((s) => {
          if (!album?.id && !album?.deezerId) return s
          const key = String(album.deezerId || album.id)
          const snapshot = {
            id: key,
            deezerId: album.deezerId || Number(album.id) || key,
            title: album.title || '',
            artist: album.artist || '',
            cover: album.cover || '',
            playedAt: new Date().toISOString(),
          }
          const filtered = (s.recentAlbums || []).filter((a) => String(a.id) !== key)
          return { recentAlbums: [snapshot, ...filtered].slice(0, 12) }
        }),

      addRecentPlaylist: (playlist) =>
        set((s) => {
          if (!playlist?.id) return s
          const liked = isLikedPlaylistId(playlist.id)
          const snapshot = {
            id: playlist.id,
            name: playlist.name || 'Lista',
            cover: playlist.cover || (liked ? generateLikedPlaylistCover() : ''),
            isLiked: liked,
            playedAt: new Date().toISOString(),
          }
          const filtered = (s.recentPlaylists || []).filter((p) => p.id !== playlist.id)
          return { recentPlaylists: [snapshot, ...filtered].slice(0, 12) }
        }),

      rememberAlbum: (album) =>
        set((s) => {
          const snap = albumSnapshot(album)
          if (!snap) return s
          const filtered = (s.favoriteAlbums || []).filter((a) => a.id !== snap.id)
          const exists = s.favoriteAlbums?.some((a) => a.id === snap.id)
          if (exists) {
            return {
              favoriteAlbums: s.favoriteAlbums.map((a) =>
                a.id === snap.id ? { ...a, ...snap, savedAt: a.savedAt } : a
              ),
            }
          }
          return { favoriteAlbums: [snap, ...filtered] }
        }),

      toggleFavorite: (track) => {
        withLibrary((s) => {
          const exists = s.favorites.some((t) => t.id === track.id)
          const favorites = exists
            ? s.favorites.filter((t) => t.id !== track.id)
            : [track, ...s.favorites]
          return { favorites }
        })(set, get)
      },

      isFavorite: (id) => get().favorites.some((t) => t.id === id),

      toggleFavoriteAlbum: (album) =>
        set((s) => {
          if (!album?.id && !album?.deezerId) return s
          const snap = albumSnapshot(album)
          if (!snap) return s
          const exists = s.favoriteAlbums.some((a) => a.id === snap.id)
          if (exists) {
            return {
              favoriteAlbums: s.favoriteAlbums.filter((a) => a.id !== snap.id),
            }
          }
          return { favoriteAlbums: [snap, ...s.favoriteAlbums] }
        }),

      isFavoriteAlbum: (id) => get().favoriteAlbums.some((a) => a.id === String(id)),

      toggleFollowArtist: (artist) =>
        set((s) => {
          const snap = artistSnapshot(artist)
          if (!snap) return s
          const exists = (s.followedArtists || []).some((a) => a.id === snap.id)
          if (exists) {
            return {
              followedArtists: (s.followedArtists || []).filter((a) => a.id !== snap.id),
            }
          }
          return { followedArtists: [snap, ...(s.followedArtists || [])] }
        }),

      isFollowingArtist: (id) =>
        (get().followedArtists || []).some((a) => a.id === String(id)),

      addTracksToPlaylist: (playlistId, tracks, albumMeta = null) => {
        if (albumMeta) get().rememberAlbum(albumMeta)

        if (!tracks?.length) return 0
        if (isLikedPlaylistId(playlistId)) {
          let added = 0
          tracks.forEach((t) => {
            if (t?.id && !get().isFavorite(t.id)) {
              get().toggleFavorite(t)
              added += 1
            }
          })
          return added
        }
        let added = 0
        withLibrary((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId || isLikedPlaylistId(p.id)) return p
            const existing = new Set(p.tracks.map((t) => t.id))
            const toAdd = tracks.filter((t) => t?.id && !existing.has(t.id))
            added = toAdd.length
            if (!toAdd.length) return p
            return { ...p, tracks: [...p.tracks, ...toAdd] }
          }),
        }))(set, get)
        return added
      },

      reorderPlaylistTracks: (playlistId, fromIndex, toIndex) => {
        if (fromIndex === toIndex) return
        const applyReorder = (tracks) => {
          const next = [...tracks]
          const [item] = next.splice(fromIndex, 1)
          if (!item) return tracks
          next.splice(toIndex, 0, item)
          return next
        }

        if (isLikedPlaylistId(playlistId)) {
          withLibrary((s) => ({ favorites: applyReorder(s.favorites) }))(set, get)
          return
        }

        withLibrary((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId ? { ...p, tracks: applyReorder(p.tracks) } : p
          ),
        }))(set, get)
      },

      sortPlaylistTracks: (playlistId, sortBy) => {
        const collator = new Intl.Collator('es', { sensitivity: 'base' })
        const compare = (a, b) => {
          if (sortBy === 'artist') {
            return (
              collator.compare(a.artist || '', b.artist || '') ||
              collator.compare(a.title || '', b.title || '')
            )
          }
          if (sortBy === 'duration') {
            return (b.duration || 0) - (a.duration || 0)
          }
          return collator.compare(a.title || '', b.title || '')
        }

        if (isLikedPlaylistId(playlistId)) {
          withLibrary((s) => ({
            favorites: [...s.favorites].sort(compare),
          }))(set, get)
          return
        }

        withLibrary((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId ? { ...p, tracks: [...p.tracks].sort(compare) } : p
          ),
        }))(set, get)
      },

      createPlaylist: ({ name, cover }) => {
        const playlist = {
          id: nanoid(),
          name,
          cover,
          tracks: [],
          createdAt: new Date().toISOString(),
        }
        withLibrary((s) => ({
          playlists: [...s.playlists.filter((p) => !isLikedPlaylistId(p.id)), playlist],
        }))(set, get)
        return playlist
      },

      deletePlaylist: (id) => {
        if (isLikedPlaylistId(id)) return
        withLibrary((s) => ({
          playlists: s.playlists.filter((p) => p.id !== id),
        }))(set, get)
      },

      updatePlaylist: (id, { name, cover }) => {
        if (isLikedPlaylistId(id)) return
        const trimmedName = name?.trim()
        withLibrary((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== id) return p
            return {
              ...p,
              ...(trimmedName ? { name: trimmedName } : {}),
              ...(cover != null ? { cover } : {}),
            }
          }),
        }))(set, get)
      },

      addToPlaylist: (playlistId, track) => {
        if (isLikedPlaylistId(playlistId)) {
          if (!get().isFavorite(track.id)) get().toggleFavorite(track)
          return
        }
        withLibrary((s) => ({
          playlists: s.playlists.map((p) => {
            if (p.id !== playlistId || isLikedPlaylistId(p.id)) return p
            if (p.tracks.some((t) => t.id === track.id)) return p
            return { ...p, tracks: [...p.tracks, track] }
          }),
        }))(set, get)
      },

      removeFromPlaylist: (playlistId, trackId) => {
        if (isLikedPlaylistId(playlistId)) {
          withLibrary((s) => ({
            favorites: s.favorites.filter((t) => t.id !== trackId),
          }))(set, get)
          return
        }
        withLibrary((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
              : p
          ),
        }))(set, get)
      },

      addAlbum: (track) =>
        set((s) => {
          const albumKey = `${track.artist}-${track.title}`
          if (s.albums.some((a) => a.key === albumKey)) return s
          return {
            albums: [
              { key: albumKey, track, playedAt: new Date().toISOString() },
              ...s.albums,
            ].slice(0, 30),
          }
        }),

      getPlaylist: (id) => get().playlists.find((p) => p.id === id),

      getUserPlaylists: () => get().playlists.filter((p) => !isLikedPlaylistId(p.id)),
    }),
    {
      name: STORAGE_KEYS.LIBRARY,
      storage: libraryStorage,
      partialize: (state) => ({
        recent: state.recent,
        recentAlbums: state.recentAlbums,
        recentPlaylists: state.recentPlaylists,
        favorites: state.favorites,
        favoriteAlbums: state.favoriteAlbums,
        followedArtists: state.followedArtists || [],
        playlists: state.playlists,
        albums: state.albums,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          useLibraryStore.setState(normalizeLibraryState(state))
        }
      },
    }
  )
)
