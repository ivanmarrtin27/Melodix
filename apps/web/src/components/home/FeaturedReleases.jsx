import { AlbumCover } from '../ui/AlbumCover'
import { RippleCard } from '../ui/RippleCard'
import { SkeletonCard } from '../ui/Skeleton'

export function FeaturedReleases({ albums, loading, onAlbumClick, subtitle }) {
  return (
    <section className="home-section">
      <div className="home-section__head px-4 mb-3">
        <h2 className="home-section__title">Novedades</h2>
        <p className="home-section__sub">
          {subtitle || 'Lo más comercial y pegado ahora'}
        </p>
      </div>

      <div className="home-album-row scrollbar-hide">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="home-album-card home-album-card--skeleton">
                <SkeletonCard size="album" />
              </div>
            ))
          : albums
              .filter(
                (album) =>
                  album?.artist && album.artist !== 'Artista desconocido'
              )
              .map((album) => (
              <RippleCard
                key={album.deezerId}
                onClick={() => onAlbumClick(album)}
                className="home-album-card"
              >
                <div className="home-album-card__cover-wrap">
                  <AlbumCover
                    src={album.cover}
                    fallback={''}
                    alt={album.title}
                    className="home-album-card__cover"
                  />
                  <div className="home-album-card__shine" aria-hidden />
                </div>
                <p className="home-album-card__title line-clamp-2">{album.title}</p>
                <p className="home-album-card__artist truncate">{album.artist}</p>
              </RippleCard>
            ))}
      </div>

      {!loading && albums.length === 0 && (
        <p className="px-4 text-sm text-white/40">No se pudieron cargar álbumes.</p>
      )}
    </section>
  )
}
