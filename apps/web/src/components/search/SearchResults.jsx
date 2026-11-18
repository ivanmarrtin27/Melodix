import { useEffect, useMemo, useState } from 'react'
import { Heart, EllipsisVertical } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { navigateWithReturn } from '../../utils/navigationReturn'
import { useLibraryStore } from '../../stores/libraryStore'
import { useT } from '../../i18n'
import { scoreArtistForQuery } from '../../utils/searchRank'
import { normalizeMatchText } from '../../utils/trackMatch'
import { AlbumCover } from '../ui/AlbumCover'
import { RippleCard } from '../ui/RippleCard'
import { TrackCover } from '../ui/TrackCover'

const FILTERS = [{ id: 'music', labelKey: 'search.filterMusic' }]

/** Top canciones oficiales en resultados de búsqueda. */
const SEARCH_SONGS_LIMIT = 6

function SectionTitle({ children }) {
  return <h2 className="search-hits__section-title">{children}</h2>
}

function HitActions({ liked, onToggleLike, showLike }) {
  return (
    <div className="search-hit__actions" onClick={(e) => e.stopPropagation()}>
      {showLike ? (
        <button
          type="button"
          className={`search-hit__icon-btn${liked ? ' search-hit__icon-btn--liked' : ''}`}
          aria-label={liked ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          onClick={onToggleLike}
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
      ) : null}
      <span className="search-hit__icon-btn search-hit__icon-btn--muted" aria-hidden>
        <EllipsisVertical size={18} strokeWidth={2} />
      </span>
    </div>
  )
}

function pickFeaturedArtist(artists, query) {
  if (!artists?.length || !query?.trim()) return null
  const top = artists[0]
  const score = scoreArtistForQuery(top, query)
  if (score < 55) return null
  return top
}

function trackBelongsToArtist(track, artist) {
  if (!track || !artist) return false
  const id = String(artist.deezerId || artist.id || '')
  if (track.artistDeezerId && id && String(track.artistDeezerId) === id) return true
  const a = normalizeMatchText(track.artist || '')
  const b = normalizeMatchText(artist.name || '')
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

export function SearchResults({
  results,
  query = '',
  onPlayTrack,
  onPrimeTrack,
  onOpenArtist,
  onOpenAlbum,
  onOpenPlaylist,
}) {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite)
  const favorites = useLibraryStore((s) => s.favorites)
  const toggleFollowArtist = useLibraryStore((s) => s.toggleFollowArtist)
  const isFollowingArtist = useLibraryStore((s) => s.isFollowingArtist)
  const [filter, setFilter] = useState('music')

  useEffect(() => {
    setFilter('music')
  }, [query])

  const go = (path) => navigateWithReturn(navigate, location, path)
  const { artists = [], albums = [], tracks = [], playlists = [] } = results

  const featured = useMemo(
    () => pickFeaturedArtist(artists, query),
    [artists, query]
  )

  const { songTracks, otherArtists } = useMemo(() => {
    let pool = tracks
    if (featured) {
      const own = []
      const rest = []
      for (const track of tracks) {
        if (trackBelongsToArtist(track, featured)) own.push(track)
        else rest.push(track)
      }
      // Prioriza las del artista top, pero el ranking final es oficial + popularidad
      pool = [...own, ...rest]
    }

    return {
      // Ya filtradas en catalog/search; aquí solo prioriza featured y corta
      songTracks: pool.slice(0, SEARCH_SONGS_LIMIT),
      otherArtists: featured
        ? artists.filter(
            (a) =>
              String(a.deezerId || a.id) !== String(featured.deezerId || featured.id)
          )
        : artists,
    }
  }, [artists, tracks, featured, query])

  const empty = !artists.length && !albums.length && !tracks.length && !playlists.length
  if (empty) return null

  const openArtist = (artist) => {
    const id = artist?.deezerId || artist?.id
    if (!id) return
    onOpenArtist?.(artist)
    go(`/artist/${id}`)
  }

  const following = featured
    ? isFollowingArtist(featured.deezerId || featured.id)
    : false

  return (
    <div className="search-hits">
      <div className="search-filter-row scrollbar-hide" role="tablist" aria-label={t('search.title')}>
        {FILTERS.map((item) => {
          const active = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`search-filter-chip${active ? ' search-filter-chip--active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {t(item.labelKey)}
            </button>
          )
        })}
      </div>

      <>
          {featured ? (
            <section className="search-featured-wrap">
              <RippleCard
                onClick={() => openArtist(featured)}
                className="search-featured-artist"
              >
                <AlbumCover
                  src={featured.image}
                  fallback={''}
                  alt={featured.name}
                  className="search-featured-artist__photo"
                />
                <div className="search-featured-artist__copy min-w-0">
                  <h3 className="search-featured-artist__name">{featured.name}</h3>
                  <p className="search-featured-artist__meta">{t('search.artist')}</p>
                </div>
                <button
                  type="button"
                  className={`search-featured-artist__follow${
                    following ? ' search-featured-artist__follow--on' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFollowArtist(featured)
                  }}
                >
                  {following ? t('search.following') : t('search.follow')}
                </button>
              </RippleCard>
            </section>
          ) : null}

          {songTracks.length > 0 ? (
            <section className="search-hits__section">
              <SectionTitle>{t('search.song')}</SectionTitle>
              <ul className="search-hits__list">
                {songTracks.map((track) => {
                  const liked = favorites.some((row) => row.id === track.id)
                  return (
                    <li key={track.id}>
                      <RippleCard
                        onPointerDown={() => onPrimeTrack?.(track)}
                        onClick={() => onPlayTrack(track, songTracks)}
                        className="search-hit"
                      >
                        <TrackCover track={track} size="md" />
                        <span className="search-hit__copy min-w-0 flex-1">
                          <span className="search-hit__title truncate">{track.title}</span>
                          <span className="search-hit__meta truncate">
                            {track.artist || t('search.artist')}
                          </span>
                        </span>
                        <HitActions
                          showLike
                          liked={liked}
                          onToggleLike={() => toggleFavorite(track)}
                        />
                      </RippleCard>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {albums.length > 0 ? (
            <section className="search-hits__section">
              <SectionTitle>{t('search.album')}</SectionTitle>
              <div className="search-card-row scrollbar-hide">
                {albums.map((album) => (
                  <RippleCard
                    key={album.id}
                    onClick={() => {
                      onOpenAlbum?.(album)
                      go(`/album/${album.deezerId}`)
                    }}
                    className="search-media-card"
                  >
                    <AlbumCover
                      src={album.cover}
                      fallback={''}
                      alt={album.title}
                      className="search-media-card__cover"
                    />
                    <p className="search-media-card__title line-clamp-2">{album.title}</p>
                    <p className="search-media-card__meta truncate">
                      {t('search.album')}
                      {album.artist ? ` · ${album.artist}` : ''}
                    </p>
                  </RippleCard>
                ))}
              </div>
            </section>
          ) : null}

          {otherArtists.length > 0 ? (
            <section className="search-hits__section">
              <SectionTitle>{t('search.artists')}</SectionTitle>
              <ul className="search-hits__list">
                {otherArtists.map((artist) => (
                  <li key={artist.id}>
                    <RippleCard onClick={() => openArtist(artist)} className="search-hit">
                      <AlbumCover
                        src={artist.image}
                        fallback={''}
                        alt={artist.name}
                        className="search-hit__thumb search-hit__thumb--round"
                      />
                      <span className="search-hit__copy min-w-0 flex-1">
                        <span className="search-hit__title truncate">{artist.name}</span>
                        <span className="search-hit__meta">{t('search.artist')}</span>
                      </span>
                      <HitActions showLike={false} />
                    </RippleCard>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {playlists.length > 0 ? (
            <section className="search-hits__section">
              <SectionTitle>{t('search.playlist')}</SectionTitle>
              <div className="search-card-row scrollbar-hide">
                {playlists.map((playlist) => (
                  <RippleCard
                    key={playlist.id}
                    onClick={() => onOpenPlaylist?.(playlist)}
                    className="search-media-card"
                  >
                    <AlbumCover
                      src={playlist.cover}
                      fallback={''}
                      alt={playlist.title}
                      className="search-media-card__cover"
                    />
                    <p className="search-media-card__title line-clamp-2">{playlist.title}</p>
                    <p className="search-media-card__meta truncate">
                      {t('search.playlist')}
                      {playlist.owner ? ` · ${playlist.owner}` : ''}
                    </p>
                  </RippleCard>
                ))}
              </div>
            </section>
          ) : null}
        </>
    </div>
  )
}
