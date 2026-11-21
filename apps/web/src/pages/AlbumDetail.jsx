import { useEffect } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { navigateBack, navigateWithReturn } from '../utils/navigationReturn'
import { useState } from 'react'
import { ArrowLeft, Play, Shuffle, Disc3, Heart, ListPlus } from 'lucide-react'
import { fetchAlbumDetail, formatReleaseDate, enrichAlbumTracksCredits, putAlbumDetailInCache } from '../services/deezerApi'
import { prepareAlbumPlayback, prefetchPlayback } from '../services/musicApi'
import { primePlaybackIntent } from '../utils/playIntent'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { formatTrackArtists } from '../utils/formatArtist'
import { formatDuration, formatMinutes, shuffleArray } from '../utils/helpers'
import { AddAlbumToPlaylistSheet } from '../components/library/AddAlbumToPlaylistSheet'
import { AlbumCover } from '../components/ui/AlbumCover'
import { RippleCard } from '../components/ui/RippleCard'
import { SkeletonList } from '../components/ui/Skeleton'

export default function AlbumDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => navigateBack(navigate, location)
  const { addRecent, addAlbum, addRecentAlbum, toggleFavoriteAlbum, isFavoriteAlbum } =
    useLibraryStore()
  const playQueue = usePlayerStore((s) => s.playQueue)

  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [playlistSheetOpen, setPlaylistSheetOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    setAlbum(null)
    setLoading(true)
    setLoadError(null)

    fetchAlbumDetail(id)
      .then(async (data) => {
        if (cancelled) return
        setAlbum(data)
        if (data) addRecentAlbum(data)
        if (data?.tracks?.length) {
          void prepareAlbumPlayback(data, data.tracks[0].id).catch(() => {})

          // Feats: la tracklist del álbum no trae contributors; enriquecer y refrescar UI
          const needsFeats = data.tracks.some(
            (t) =>
              !(Array.isArray(t.featuredArtists) && t.featuredArtists.length) &&
              !(Array.isArray(t.contributors) && t.contributors.length > 1)
          )
          if (needsFeats) {
            try {
              const tracks = await enrichAlbumTracksCredits(data.tracks, 3)
              if (cancelled || !tracks?.length) return
              const next = { ...data, tracks, trackCount: tracks.length }
              putAlbumDetailInCache(next)
              setAlbum((prev) => {
                if (!prev) return prev
                const same =
                  String(prev.deezerId || prev.id) === String(data.deezerId || data.id)
                return same ? next : prev
              })
            } catch {
              /* tracklist base ya visible */
            }
          }
        }
      })
      .catch((err) => {
        if (cancelled) return
        const status = err?.status
        setLoadError(
          status === 429 || /429|demasiadas|quota/i.test(String(err?.message || ''))
            ? 'El catálogo está saturado. Espera unos segundos y pulsa Reintentar.'
            : 'No se pudo cargar el álbum'
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, addRecentAlbum, reloadKey])

  const handleRetry = () => setReloadKey((k) => k + 1)

  const startPlayback = (index) => {
    if (!album?.tracks.length) return

    primePlaybackIntent()
    const track = album.tracks[index]
    addRecent(track)
    addAlbum(track)

    playQueue(album.tracks, index)
    void prepareAlbumPlayback(album, track.id).catch(() => {})
  }

  const handlePlayTrack = (index) => {
    startPlayback(index)
  }

  const handlePlayAll = () => {
    startPlayback(0)
  }

  const handleShuffle = () => {
    if (!album?.tracks.length) return

    primePlaybackIntent()
    const shuffled = shuffleArray(album.tracks)
    addRecent(shuffled[0])
    addAlbum(shuffled[0])

    playQueue(shuffled, 0)
    void prepareAlbumPlayback(album, shuffled[0].id).catch(() => {})
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="skeleton w-full aspect-square rounded-2xl mb-4" />
        <div className="skeleton h-6 w-2/3 rounded mb-2" />
        <div className="skeleton h-4 w-1/3 rounded mb-6" />
        <SkeletonList count={6} />
      </div>
    )
  }

  if (loadError && !album) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6 text-center">
        <Disc3 size={48} className="mx-auto opacity-30 mb-4" />
        <p className="opacity-60">{loadError}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 rounded-full text-sm font-semibold text-black"
            style={{ background: 'var(--accent-color)' }}
          >
            Reintentar
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="text-sm underline opacity-60"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  if (!album) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="skeleton w-full aspect-square rounded-2xl mb-4" />
        <div className="skeleton h-6 w-2/3 rounded mb-2" />
        <div className="skeleton h-4 w-1/3 rounded mb-6" />
        <SkeletonList count={6} />
      </div>
    )
  }

  const totalSeconds = (album.tracks || []).reduce((sum, t) => sum + (t.duration || 0), 0)
  const albumFav = isFavoriteAlbum(album.deezerId || album.id)

  return (
    <div className="max-w-lg mx-auto pb-6 min-h-full">
      <div className="relative px-4 pt-4">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 z-10 p-2 rounded-full backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <ArrowLeft size={20} />
        </button>

        <AlbumCover
          src={album.cover}
          fallback={''}
          alt={album.title}
          className="w-full max-w-xs mx-auto aspect-square rounded-2xl object-cover shadow-2xl"
        />
      </div>

      <div className="px-4 mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-1">
          Álbum
        </p>
        <h1 className="text-2xl font-bold leading-tight mb-1">{album.title}</h1>
        {album.artistDeezerId ? (
          <button
            type="button"
            onClick={() =>
              navigateWithReturn(navigate, location, `/artist/${album.artistDeezerId}`)
            }
            className="text-sm opacity-70 mb-1 hover:opacity-100 hover:underline underline-offset-2 transition-opacity text-left"
          >
            {album.artist}
          </button>
        ) : (
          <p className="text-sm opacity-70 mb-1">{album.artist}</p>
        )}
        <p className="text-xs opacity-50">
          {formatReleaseDate(album.releaseDate)}
          {album.trackCount ? ` · ${album.trackCount} canciones` : ''}
          {totalSeconds > 0 ? ` · ${formatMinutes(totalSeconds)}` : ''}
        </p>

        {album.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {album.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-[10px] px-2 py-0.5 rounded-full opacity-70"
                style={{ background: 'var(--border-color)' }}
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button
            onClick={handlePlayAll}
            disabled={!album.tracks?.length}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-black transition-transform duration-200 active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--accent-color)' }}
          >
            <Play size={18} fill="black" />
            Reproducir
          </button>
          <button
            onClick={handleShuffle}
            disabled={!album.tracks?.length}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full font-medium border transition-colors duration-200 disabled:opacity-40"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Shuffle size={18} />
            Mezclar
          </button>
          <button
            type="button"
            onClick={() => toggleFavoriteAlbum(album)}
            className="w-11 h-11 flex items-center justify-center rounded-full border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border-color)' }}
            aria-label={albumFav ? 'Quitar álbum de favoritos' : 'Añadir álbum a favoritos'}
            title={albumFav ? 'Quitar de favoritos' : 'Favorito'}
          >
            <Heart
              size={20}
              fill={albumFav ? 'var(--accent-color)' : 'none'}
              color={albumFav ? 'var(--accent-color)' : 'currentColor'}
            />
          </button>
          <button
            type="button"
            onClick={() => setPlaylistSheetOpen(true)}
            disabled={!album.tracks?.length}
            className="w-11 h-11 flex items-center justify-center rounded-full border transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{ borderColor: 'var(--border-color)' }}
            aria-label="Guardar álbum en lista"
            title="Guardar en lista"
          >
            <ListPlus size={20} />
          </button>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-semibold opacity-60 mb-3">Tracklist</h2>
          <div className="space-y-1">
            {(album.tracks || []).map((track, i) => (
              <RippleCard
                key={track.id}
                onPointerDown={() => {
                  primePlaybackIntent()
                  prefetchPlayback(track)
                }}
                onClick={() => handlePlayTrack(i)}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 disabled:opacity-50"
              >
                <span className="text-sm opacity-40 w-6 text-center tabular-nums">
                  {track.trackNumber || i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{track.title}</p>
                  <p className="text-xs opacity-50 truncate">{formatTrackArtists(track)}</p>
                </div>
                <span className="text-xs opacity-40 tabular-nums">
                  {formatDuration(track.duration)}
                </span>
              </RippleCard>
            ))}
          </div>
        </div>
      </div>

      <AddAlbumToPlaylistSheet
        open={playlistSheetOpen}
        onClose={() => setPlaylistSheetOpen(false)}
        album={album}
      />
    </div>
  )
}
