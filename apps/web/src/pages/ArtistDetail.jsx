import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { navigateBack, navigateWithReturn } from '../utils/navigationReturn'
import { albumDetailPath } from '../utils/albumRoute'
import {
  ArrowLeft,
  Play,
  Shuffle,
  User,
  Heart,
  ChevronDown,
  ChevronUp,
  UserCheck,
  BadgeCheck,
  Disc3,
  Music2,
  Sparkles,
} from 'lucide-react'
import { fetchArtistDetail } from '../services/deezerApi'
import { getSimilarArtistsForUi } from '../services/recommendationsService'
import { prefetchPlayback } from '../services/musicApi'
import { primePlaybackIntent } from '../utils/playIntent'
import { useLibraryStore } from '../stores/libraryStore'
import { usePlayerStore } from '../stores/playerStore'
import { useSearchStore } from '../stores/searchStore'
import { formatDuration, shuffleArray } from '../utils/helpers'
import { extractColorsFromImage } from '../utils/extractColors'
import { AlbumCover } from '../components/ui/AlbumCover'
import { RippleCard } from '../components/ui/RippleCard'
import { SkeletonList } from '../components/ui/Skeleton'

function formatFans(fans, { short = false } = {}) {
  if (!fans) return null
  if (fans >= 1_000_000) {
    const val = (fans / 1_000_000).toFixed(1).replace(/\.0$/, '')
    return short ? `${val}M` : `${val}M oyentes`
  }
  if (fans >= 1_000) {
    const val = `${Math.round(fans / 1_000)}K`
    return short ? val : `${val} oyentes`
  }
  return short ? String(fans) : `${fans} oyentes`
}

function releaseTypeLabel(recordType) {
  if (recordType === 'ep') return 'EP'
  if (recordType === 'single') return 'Single'
  if (recordType === 'compilation') return 'Compilación'
  if (recordType === 'live') return 'En vivo'
  if (recordType === 'mixtape') return 'Mixtape'
  return 'Álbum'
}

function ReleaseCard({ item, onClick }) {
  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null
  const typeLabel = releaseTypeLabel(item.recordType)
  const meta = [typeLabel, year].filter(Boolean).join(' · ')

  return (
    <RippleCard onClick={onClick} className="artist-release-card">
      <AlbumCover
        src={item.cover}
        fallback={''}
        alt={item.title}
        className="artist-release-card__cover"
      />
      <p className="artist-release-card__title line-clamp-2">{item.title}</p>
      {meta ? <p className="artist-release-card__year">{meta}</p> : null}
    </RippleCard>
  )
}

const TOP_COLLAPSED_COUNT = 5

function ArtistPageSkeleton() {
  return (
    <div className="artist-page max-w-lg mx-auto">
      <div className="artist-hero artist-hero--loading">
        <div className="artist-hero__shimmer" />
        <div className="artist-hero__content">
          <div className="skeleton w-[min(52vw,11.5rem)] aspect-square rounded-full mx-auto" />
          <div className="skeleton h-8 w-2/3 rounded mx-auto mt-5" />
          <div className="skeleton h-4 w-1/2 rounded mx-auto mt-2" />
          <div className="flex justify-center gap-2 mt-5">
            <div className="skeleton h-10 w-24 rounded-full" />
            <div className="skeleton h-12 w-12 rounded-full" />
            <div className="skeleton h-12 w-12 rounded-full" />
          </div>
        </div>
      </div>
      <div className="px-4 mt-6">
        <SkeletonList count={5} />
      </div>
    </div>
  )
}

export default function ArtistDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => navigateBack(navigate, location)
  const { addRecent, addAlbum, toggleFavorite, isFavorite, toggleFollowArtist, isFollowingArtist } =
    useLibraryStore()
  const playTrack = usePlayerStore((s) => s.playTrack)
  const playQueue = usePlayerStore((s) => s.playQueue)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const [artist, setArtist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [heroTint, setHeroTint] = useState(null)
  const [topExpanded, setTopExpanded] = useState(false)
  const [similarArtists, setSimilarArtists] = useState([])

  useEffect(() => {
    setTopExpanded(false)
  }, [id])

  useEffect(() => {
    let cancelled = false

    setArtist(null)
    setSimilarArtists([])
    setLoading(true)
    setLoadError(null)
    setHeroTint(null)

    fetchArtistDetail(id)
      .then((data) => {
        if (cancelled) return
        setArtist({
          ...data,
          albums: data.albums || [],
          eps: data.eps || [],
          singles: data.singles || [],
          topTracks: data.topTracks || [],
          related: data.related || [],
          genres: data.genres || [],
          latestRelease: data.latestRelease || null,
        })
        if (data?.name) {
          useSearchStore.getState().addItem({
            type: 'artist',
            id: String(data.deezerId || data.id),
            deezerId: data.deezerId,
            title: data.name,
            subtitle: '',
            image: data.image,
          })
          // Last.fm como refuerzo si el related del catálogo viene corto
          if (!(data.related?.length >= 6)) {
            void getSimilarArtistsForUi(data.name).then((list) => {
              if (!cancelled) setSimilarArtists(list)
            })
          }
        }
        if (data?.topTracks?.[0]) prefetchPlayback(data.topTracks[0])
        const img =
          data?.image || ''
        extractColorsFromImage(img).then((colors) => {
          if (!cancelled) setHeroTint(colors)
        })
      })
      .catch(() => {
        if (!cancelled) setLoadError('No se pudo cargar el artista')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const playFromQueue = useCallback(
    (track, queue) => {
      primePlaybackIntent()
      addRecent(track)
      addAlbum(track)
      if (queue?.length) playQueue(queue, queue.findIndex((t) => t.id === track.id))
      else playTrack(track)
    },
    [addRecent, addAlbum, playQueue, playTrack]
  )

  const handlePlayTop = (index = 0) => {
    if (!artist?.topTracks?.length) return
    playFromQueue(artist.topTracks[index], artist.topTracks)
  }

  const handleShuffleTop = () => {
    if (!artist?.topTracks?.length) return
    const shuffled = shuffleArray(artist.topTracks)
    playFromQueue(shuffled[0], shuffled)
  }

  const openAlbum = useCallback(
    (album) => {
      const path = albumDetailPath(album)
      if (path) navigateWithReturn(navigate, location, path)
    },
    [navigate, location]
  )

  const heroStyle = useMemo(
    () =>
      heroTint
        ? {
            '--artist-tint': heroTint.primary,
            '--artist-tint-soft': heroTint.secondary || heroTint.primary,
          }
        : undefined,
    [heroTint]
  )

  const isVerified = (artist?.fans || 0) >= 50_000
  const releaseCount =
    (artist?.albums?.length || 0) + (artist?.eps?.length || 0) + (artist?.singles?.length || 0)

  const similarList = useMemo(() => {
    if (artist?.related?.length) {
      return artist.related.map((a) => ({
        id: a.id,
        deezerId: a.deezerId,
        name: a.name,
        image: a.image,
      }))
    }
    return similarArtists
  }, [artist?.related, similarArtists])

  const allTopTracks = artist?.topTracks ?? []
  const visibleTopTracks = topExpanded
    ? allTopTracks
    : allTopTracks.slice(0, TOP_COLLAPSED_COUNT)
  const canExpandTop = allTopTracks.length > TOP_COLLAPSED_COUNT
  const hiddenTopCount = allTopTracks.length - TOP_COLLAPSED_COUNT

  if (loading) return <ArtistPageSkeleton />

  if (loadError && !artist) {
    return (
      <div className="artist-page artist-page--empty max-w-lg mx-auto px-4 pt-6 text-center">
        <User size={48} className="mx-auto opacity-30 mb-4" />
        <p className="opacity-60">{loadError}</p>
        <button type="button" onClick={handleBack} className="mt-4 text-sm underline opacity-60">
          Volver
        </button>
      </div>
    )
  }

  if (!artist) return null

  const artistImage =
    artist.image || ''
  const following = isFollowingArtist(artist.deezerId || artist.id)
  const latest = artist.latestRelease

  return (
    <div className="artist-page max-w-lg mx-auto pb-10" style={heroStyle}>
      <header className="artist-hero">
        <AlbumCover
          src={artistImage}
          fallback={''}
          alt=""
          className="artist-hero__bg"
          aria-hidden
        />
        <div className="artist-hero__scrim" aria-hidden />
        <div className="artist-hero__glow" aria-hidden />

        <button
          type="button"
          onClick={handleBack}
          className="artist-hero__back"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="artist-hero__content">
          <div className="artist-hero__photo-wrap">
            <AlbumCover
              src={artistImage}
              fallback={''}
              alt={artist.name}
              className="artist-hero__photo"
            />
          </div>

          {isVerified ? (
            <span className="artist-hero__verified">
              <BadgeCheck size={14} strokeWidth={2.2} />
              Artista verificado
            </span>
          ) : (
            <span className="artist-hero__verified artist-hero__verified--soft">Artista</span>
          )}

          <h1 className="artist-hero__name">{artist.name}</h1>

          {artist.genres?.length > 0 ? (
            <div className="artist-hero__genres">
              {artist.genres.map((genre) => (
                <span key={genre} className="artist-hero__genre-chip">
                  {genre}
                </span>
              ))}
            </div>
          ) : null}

          <div className="artist-hero__toolbar">
            <button
              type="button"
              onClick={() => toggleFollowArtist(artist)}
              className={`artist-hero__follow${following ? ' artist-hero__follow--active' : ''}`}
              aria-pressed={following}
            >
              {following ? (
                <>
                  <UserCheck size={16} />
                  Siguiendo
                </>
              ) : (
                <>
                  <User size={16} />
                  Seguir
                </>
              )}
            </button>

            {artist.topTracks.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => handlePlayTop(0)}
                  className="artist-hero__play"
                  aria-label="Reproducir"
                >
                  <Play size={24} fill="currentColor" className="ml-0.5" />
                </button>
                <button
                  type="button"
                  onClick={handleShuffleTop}
                  className="artist-hero__shuffle"
                  aria-label="Mezclar"
                >
                  <Shuffle size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="artist-stats px-4">
        <div className="artist-stats__card">
          <span className="artist-stats__value">
            {formatFans(artist.fans, { short: true }) || '—'}
          </span>
          <span className="artist-stats__label">Oyentes</span>
        </div>
        <div className="artist-stats__card">
          <span className="artist-stats__value">{artist.albums?.length || 0}</span>
          <span className="artist-stats__label">Álbumes</span>
        </div>
        <div className="artist-stats__card">
          <span className="artist-stats__value">
            {(artist.singles?.length || 0) + (artist.eps?.length || 0)}
          </span>
          <span className="artist-stats__label">Singles / EPs</span>
        </div>
        <div className="artist-stats__card">
          <span className="artist-stats__value">{allTopTracks.length || 0}</span>
          <span className="artist-stats__label">Top tracks</span>
        </div>
      </div>

      {latest ? (
        <section className="artist-section px-4">
          <div className="artist-section__head">
            <h2 className="artist-section__title">Último lanzamiento</h2>
            <p className="artist-section__sub artist-section__sub--inline">
              {releaseTypeLabel(latest.recordType)}
              {latest.releaseDate
                ? ` · ${new Date(latest.releaseDate).getFullYear()}`
                : ''}
            </p>
          </div>
          <RippleCard className="artist-latest" onClick={() => openAlbum(latest)}>
            <AlbumCover
              src={latest.cover}
              fallback={''}
              alt={latest.title}
              className="artist-latest__cover"
            />
            <div className="artist-latest__copy min-w-0">
              <p className="artist-latest__title line-clamp-2">{latest.title}</p>
              <p className="artist-latest__meta">
                {releaseTypeLabel(latest.recordType)}
                {latest.releaseDate
                  ? ` · ${new Date(latest.releaseDate).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}`
                  : ''}
              </p>
            </div>
            <span className="artist-latest__icon" aria-hidden>
              <Disc3 size={18} />
            </span>
          </RippleCard>
        </section>
      ) : null}

      {visibleTopTracks.length > 0 && (
        <section className="artist-section px-4">
          <div className="artist-section__head">
            <h2 className="artist-section__title">Más escuchadas</h2>
            <p className="artist-section__sub artist-section__sub--inline">
              <Sparkles size={12} />
              Ranking
            </p>
          </div>

          <ol className="artist-track-list">
            {visibleTopTracks.map((track, i) => {
              const rank = i + 1
              const fav = isFavorite(track.id)
              const isCurrent = currentTrack?.id === track.id && isPlaying

              return (
                <li key={track.id}>
                  <RippleCard
                    onPointerDown={() => {
                      primePlaybackIntent()
                      prefetchPlayback(track)
                    }}
                    onClick={() => playFromQueue(track, artist.topTracks)}
                    className={`artist-track-row${isCurrent ? ' artist-track-row--playing' : ''}`}
                  >
                    <span className="artist-track-row__rank">{rank}</span>
                    <AlbumCover
                      src={track.thumbnail || track.albumCover}
                      alt=""
                      className="artist-track-row__cover"
                    />
                    <div className="artist-track-row__meta">
                      <p className="artist-track-row__title truncate">{track.title}</p>
                      {track.album ? (
                        <p className="artist-track-row__album truncate">{track.album}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(track)
                      }}
                      className={`artist-track-row__fav${fav ? ' artist-track-row__fav--active' : ''}`}
                      aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                    >
                      <Heart
                        size={17}
                        fill={fav ? 'var(--accent-color)' : 'none'}
                        color={fav ? 'var(--accent-color)' : 'currentColor'}
                      />
                    </button>
                    <span className="artist-track-row__duration">
                      {formatDuration(track.duration)}
                    </span>
                  </RippleCard>
                </li>
              )
            })}
          </ol>

          {canExpandTop && (
            <button
              type="button"
              className="artist-top-expand"
              onClick={() => setTopExpanded((open) => !open)}
              aria-expanded={topExpanded}
            >
              {topExpanded ? (
                <>
                  Ver menos
                  <ChevronUp size={16} />
                </>
              ) : (
                <>
                  Ver {hiddenTopCount} más
                  <ChevronDown size={16} />
                </>
              )}
            </button>
          )}
        </section>
      )}

      {releaseCount > 0 ? (
        <div className="artist-discog-note px-4">
          <Music2 size={14} />
          <span>
            Discografía · {artist.albums?.length || 0} álbumes
            {(artist.eps?.length || 0) > 0 ? ` · ${artist.eps.length} EPs` : ''}
            {(artist.singles?.length || 0) > 0
              ? ` · ${artist.singles.length} singles`
              : ''}
          </span>
        </div>
      ) : null}

      {(artist.albums?.length || 0) > 0 && (
        <section className="artist-section">
          <h2 className="artist-section__title px-4">Álbumes</h2>
          <div className="artist-release-row scrollbar-hide">
            {artist.albums.map((album) => (
              <ReleaseCard key={album.id} item={album} onClick={() => openAlbum(album)} />
            ))}
          </div>
        </section>
      )}

      {(artist.eps?.length || 0) > 0 && (
        <section className="artist-section">
          <h2 className="artist-section__title px-4">EPs</h2>
          <div className="artist-release-row scrollbar-hide">
            {artist.eps.map((album) => (
              <ReleaseCard key={album.id} item={album} onClick={() => openAlbum(album)} />
            ))}
          </div>
        </section>
      )}

      {(artist.singles?.length || 0) > 0 && (
        <section className="artist-section">
          <h2 className="artist-section__title px-4">Singles</h2>
          <div className="artist-release-row scrollbar-hide">
            {artist.singles.map((album) => (
              <ReleaseCard key={album.id} item={album} onClick={() => openAlbum(album)} />
            ))}
          </div>
        </section>
      )}

      {similarList.length > 0 && (
        <section className="artist-section">
          <div className="artist-section__head px-4">
            <h2 className="artist-section__title">Artistas similares</h2>
            <p className="artist-section__sub artist-section__sub--inline">
              {artist.related?.length ? 'Relacionados' : 'Sugeridos'}
            </p>
          </div>
          <div className="artist-similar-row scrollbar-hide">
            {similarList.map((item) => (
              <button
                key={item.id}
                type="button"
                className="artist-similar-chip"
                onClick={() => {
                  if (item.deezerId) {
                    navigateWithReturn(navigate, location, `/artist/${item.deezerId}`)
                  }
                }}
              >
                <img
                  src={item.image || ''}
                  alt=""
                  className="artist-similar-chip__img"
                />
                <span className="artist-similar-chip__name line-clamp-2">{item.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
