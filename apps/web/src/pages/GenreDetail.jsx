import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ListMusic, Play, Shuffle, Sparkles } from 'lucide-react'
import { navigateBack, navigateWithReturn } from '../utils/navigationReturn'
import { albumDetailPath } from '../utils/albumRoute'
import { fetchGenreCatalog, fetchPlaylistTracks } from '../services/deezerApi'
import { getGenreById, formatDuration, shuffleArray } from '../utils/helpers'
import { prefetchPlayback } from '../services/musicApi'
import { primePlaybackIntent } from '../utils/playIntent'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { AlbumCover } from '../components/ui/AlbumCover'
import { RippleCard } from '../components/ui/RippleCard'
import { TrackCover } from '../components/ui/TrackCover'
import { SkeletonList } from '../components/ui/Skeleton'

function mosaicCovers(catalog) {
  const covers = []
  const seen = new Set()
  const push = (url) => {
    if (!url || seen.has(url) || covers.length >= 6) return
    seen.add(url)
    covers.push(url)
  }
  for (const album of catalog.albums || []) push(album.cover)
  for (const track of catalog.tracks || []) push(track.thumbnail || track.albumCover)
  for (const pl of catalog.playlists || []) push(pl.cover)
  return covers
}

function formatFans(fans) {
  if (!fans) return null
  if (fans >= 1_000_000) {
    return `${(fans / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (fans >= 1000) return `${Math.round(fans / 1000)}K`
  return String(fans)
}

export default function GenreDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const genre = getGenreById(id)

  const [catalog, setCatalog] = useState({
    tracks: [],
    albums: [],
    playlists: [],
    artists: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playingListId, setPlayingListId] = useState(null)

  const addRecent = useLibraryStore((s) => s.addRecent)
  const addAlbum = useLibraryStore((s) => s.addAlbum)
  const playQueue = usePlayerStore((s) => s.playQueue)
  const playTrack = usePlayerStore((s) => s.playTrack)

  const go = useCallback(
    (path) => navigateWithReturn(navigate, location, path),
    [navigate, location]
  )

  useEffect(() => {
    if (!genre) {
      setError('Género no encontrado')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchGenreCatalog(genre)
      .then((data) => {
        if (!cancelled) setCatalog(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'No se pudo cargar el género')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [genre])

  const covers = useMemo(() => mosaicCovers(catalog), [catalog])
  const featured = catalog.playlists[0] || null
  const morePlaylists = catalog.playlists.slice(1)

  const handlePlay = useCallback(
    (track, queue) => {
      primePlaybackIntent()
      addRecent(track)
      addAlbum(track)
      if (queue?.length) {
        playQueue(queue, queue.findIndex((t) => t.id === track.id))
      } else {
        playTrack(track)
      }
    },
    [addRecent, addAlbum, playQueue, playTrack]
  )

  const handlePlayAll = useCallback(() => {
    if (!catalog.tracks[0]) return
    handlePlay(catalog.tracks[0], catalog.tracks)
  }, [catalog.tracks, handlePlay])

  const handleShuffle = useCallback(() => {
    if (!catalog.tracks.length) return
    const shuffled = shuffleArray(catalog.tracks)
    handlePlay(shuffled[0], shuffled)
  }, [catalog.tracks, handlePlay])

  const handlePlayPlaylist = useCallback(
    async (playlist) => {
      if (!playlist?.deezerId) return
      setPlayingListId(playlist.id)
      try {
        primePlaybackIntent()
        const tracks = await fetchPlaylistTracks(playlist.deezerId, 50)
        if (tracks[0]) handlePlay(tracks[0], tracks)
      } catch {
        /* ignore */
      } finally {
        setPlayingListId(null)
      }
    },
    [handlePlay]
  )

  if (!genre) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-6">
        <button type="button" onClick={() => navigateBack(navigate, location)} className="mb-4">
          <ArrowLeft size={22} />
        </button>
        <p className="text-sm opacity-50">Género no encontrado</p>
      </div>
    )
  }

  const tint = genre.color
  const deep = genre.colorDeep || '#0a0a0c'
  const empty =
    !catalog.tracks.length && !catalog.albums.length && !catalog.playlists.length

  return (
    <div
      className="genre-page max-w-lg mx-auto pb-12"
      style={{ '--genre-tint': tint, '--genre-deep': deep }}
    >
      <header className="genre-hero">
        <div className="genre-hero__mosaic" aria-hidden>
          {covers.length > 0 ? (
            covers.map((src, i) => (
              <AlbumCover key={`${src}-${i}`} src={src} alt="" className="genre-hero__tile" />
            ))
          ) : (
            <div className="genre-hero__fallback" />
          )}
        </div>
        <div className="genre-hero__veil" />

        <button
          type="button"
          onClick={() => navigateBack(navigate, location)}
          className="genre-hero__back"
          aria-label="Volver"
        >
          <ArrowLeft size={20} strokeWidth={1.85} />
        </button>

        <div className="genre-hero__content">
          <p className="genre-hero__eyebrow">
            <Sparkles size={12} strokeWidth={2.2} />
            Catálogo oficial
          </p>
          <h1 className="genre-hero__title">{genre.name}</h1>
          <p className="genre-hero__tagline">{genre.tagline}</p>
          <p className="genre-hero__blurb">{genre.blurb}</p>

          {!loading && catalog.tracks.length > 0 ? (
            <div className="genre-hero__meta">
              <span>Top {catalog.tracks.length}</span>
              {catalog.artists.length > 0 ? (
                <span>{catalog.artists.length} artistas</span>
              ) : null}
              {genre.deezerId ? <span>Charts</span> : <span>Selección curada</span>}
            </div>
          ) : null}

          {!loading && catalog.tracks.length > 0 ? (
            <div className="genre-hero__actions">
              <button type="button" className="genre-hero__play" onClick={handlePlayAll}>
                <Play size={17} fill="currentColor" className="ml-0.5" />
                Reproducir
              </button>
              <button
                type="button"
                className="genre-hero__shuffle"
                onClick={handleShuffle}
                aria-label="Aleatorio"
              >
                <Shuffle size={17} strokeWidth={2.1} />
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="genre-page__body px-4">
        {loading && (
          <div className="pt-2">
            <div className="skeleton h-28 w-full rounded-2xl mb-5" />
            <SkeletonList count={8} />
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-red-400 py-8 text-center">{error}</p>
        )}

        {!loading && !error && empty && (
          <p className="text-center text-sm opacity-40 py-10">
            No hay catálogo disponible para este género ahora mismo.
          </p>
        )}

        {!loading && !error && !empty && (
          <>
            {featured && (
              <section className="genre-section">
                <div className="genre-section__head">
                  <h2 className="genre-section__title">Lista destacada</h2>
                  <p className="genre-section__sub">Selección editorial</p>
                </div>
                <RippleCard
                  className="genre-featured"
                  onClick={() => handlePlayPlaylist(featured)}
                >
                  <AlbumCover
                    src={featured.cover}
                    alt={featured.title}
                    className="genre-featured__cover"
                  />
                  <div className="genre-featured__copy min-w-0">
                    <span className="genre-featured__badge">
                      <ListMusic size={11} />
                      {featured.official ? 'Oficial' : 'Lista'}
                    </span>
                    <p className="genre-featured__title line-clamp-2">{featured.title}</p>
                    <p className="genre-featured__meta truncate">
                      {featured.owner && !/^deezer$/i.test(String(featured.owner).trim())
                        ? featured.owner
                        : 'Lista'}
                      {featured.trackCount ? ` · ${featured.trackCount} temas` : ''}
                      {featured.fans ? ` · ${formatFans(featured.fans)} fans` : ''}
                    </p>
                  </div>
                  <span className="genre-featured__play" aria-hidden>
                    {playingListId === featured.id ? (
                      <span className="genre-featured__spinner" />
                    ) : (
                      <Play size={16} fill="currentColor" className="ml-0.5" />
                    )}
                  </span>
                </RippleCard>
              </section>
            )}

            {catalog.tracks.length > 0 && (
              <section className="genre-section">
                <div className="genre-section__head">
                  <h2 className="genre-section__title">Top canciones</h2>
                  <p className="genre-section__sub">
                    {genre.deezerId ? 'Chart oficial' : 'Selección'}
                  </p>
                </div>
                <ul className="genre-track-list">
                  {catalog.tracks.map((track, index) => (
                    <li key={track.id}>
                      <RippleCard
                        onPointerDown={() => {
                          primePlaybackIntent()
                          prefetchPlayback(track)
                        }}
                        onClick={() => handlePlay(track, catalog.tracks)}
                        className="genre-track"
                      >
                        <span className="genre-track__rank">{index + 1}</span>
                        <TrackCover track={track} size="md" />
                        <span className="genre-track__copy min-w-0 flex-1">
                          <span className="genre-track__title truncate">{track.title}</span>
                          <span className="genre-track__artist truncate">{track.artist}</span>
                        </span>
                        <span className="genre-track__time tabular-nums">
                          {formatDuration(track.duration)}
                        </span>
                      </RippleCard>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {catalog.artists.length > 0 && (
              <section className="genre-section">
                <div className="genre-section__head">
                  <h2 className="genre-section__title">Artistas del momento</h2>
                </div>
                <div className="genre-artists scrollbar-hide">
                  {catalog.artists.map((artist) => (
                    <RippleCard
                      key={artist.id}
                      className="genre-artist"
                      onClick={() => go(`/artist/${artist.deezerId}`)}
                    >
                      <AlbumCover
                        src={artist.image}
                        fallback={''}
                        alt={artist.name}
                        className="genre-artist__avatar"
                      />
                      <p className="genre-artist__name truncate">{artist.name}</p>
                      {artist.fans ? (
                        <p className="genre-artist__fans">{formatFans(artist.fans)} oyentes</p>
                      ) : (
                        <p className="genre-artist__fans">Artista</p>
                      )}
                    </RippleCard>
                  ))}
                </div>
              </section>
            )}

            {catalog.albums.length > 0 && (
              <section className="genre-section">
                <div className="genre-section__head">
                  <h2 className="genre-section__title">Álbumes</h2>
                  <p className="genre-section__sub">Lanzamientos del chart</p>
                </div>
                <div className="genre-albums scrollbar-hide">
                  {catalog.albums.map((album) => (
                    <RippleCard
                      key={album.id}
                      className="genre-album"
                      onClick={() => {
                        const path = albumDetailPath(album)
                        if (path) go(path)
                      }}
                    >
                      <AlbumCover
                        src={album.cover}
                        fallback={''}
                        alt={album.title}
                        className="genre-album__cover"
                      />
                      <p className="genre-album__title line-clamp-2">{album.title}</p>
                      <p className="genre-album__artist truncate">{album.artist}</p>
                    </RippleCard>
                  ))}
                </div>
              </section>
            )}

            {morePlaylists.length > 0 && (
              <section className="genre-section">
                <div className="genre-section__head">
                  <h2 className="genre-section__title">Más listas oficiales</h2>
                </div>
                <div className="genre-playlists scrollbar-hide">
                  {morePlaylists.map((playlist) => (
                    <RippleCard
                      key={playlist.id}
                      className="genre-playlist"
                      onClick={() => handlePlayPlaylist(playlist)}
                    >
                      <div className="relative">
                        <AlbumCover
                          src={playlist.cover}
                          alt={playlist.title}
                          className="genre-playlist__cover"
                        />
                        <span className="genre-playlist__badge">
                          <ListMusic size={12} />
                        </span>
                      </div>
                      <p className="genre-playlist__title line-clamp-2">{playlist.title}</p>
                      <p className="genre-playlist__meta truncate">
                        {playlist.owner || 'Lista'}
                        {playlist.trackCount ? ` · ${playlist.trackCount}` : ''}
                      </p>
                    </RippleCard>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
