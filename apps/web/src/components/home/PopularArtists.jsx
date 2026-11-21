import { AlbumCover } from '../ui/AlbumCover'
import { RippleCard } from '../ui/RippleCard'

export function PopularArtists({ artists, followedCount = 0, onArtistClick }) {
  if (!artists.length) return null

  const subtitle =
    followedCount > 0
      ? 'Tus seguidos y lo más pegado ahora'
      : 'Los que más suenan ahora'

  return (
    <section className="home-section">
      <div className="home-section__head px-4 mb-3">
        <h2 className="home-section__title">Artistas</h2>
        <p className="home-section__sub">{subtitle}</p>
      </div>
      <div className="home-artist-row scrollbar-hide">
        {artists.map((artist) => (
          <RippleCard
            key={artist.id}
            onClick={() => onArtistClick?.(artist)}
            className={`home-artist-chip${artist.isFollowed ? ' home-artist-chip--followed' : ''}`}
          >
            <div className="home-artist-chip__photo-wrap">
              <AlbumCover
                src={artist.image}
                fallback=""
                alt={artist.name}
                className="home-artist-chip__photo"
              />
            </div>
            <p className="home-artist-chip__name line-clamp-2">{artist.name}</p>
          </RippleCard>
        ))}
      </div>
    </section>
  )
}
