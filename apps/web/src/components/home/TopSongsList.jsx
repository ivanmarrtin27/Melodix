import { Heart, Play } from 'lucide-react'
import { AlbumCover } from '../ui/AlbumCover'
import { RippleCard } from '../ui/RippleCard'
import { useLibraryStore } from '../../stores/libraryStore'

export function TopSongsList({ tracks, onPlayTrack, onPrimeTrack, subtitle }) {
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite)
  const isFavorite = useLibraryStore((s) => s.isFavorite)

  if (!tracks.length) {
    return (
      <section className="home-section px-4 pb-10">
        <div className="home-section__head mb-3">
          <h2 className="home-section__title">Top canciones</h2>
          <p className="home-section__sub">Marca canciones con ❤️ para verlas aquí.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="home-section px-4 pb-12">
      <div className="home-section__head mb-3">
        <h2 className="home-section__title">Top canciones</h2>
        {subtitle ? <p className="home-section__sub">{subtitle}</p> : null}
      </div>

      <div className="home-track-list">
        {tracks.map((track, index) => {
          const fav = isFavorite(track.id)
          const rank = index + 1
          return (
            <RippleCard
              key={track.id}
              onPointerDown={() => onPrimeTrack?.(track)}
              onClick={() => onPlayTrack(track, index)}
              className="home-track-row"
            >
              <span
                className={`home-track-row__rank${rank <= 3 ? ' home-track-row__rank--top' : ''}`}
              >
                {rank}
              </span>
              <AlbumCover
                src={track.thumbnail || track.albumCover}
                alt=""
                className="home-track-row__cover"
              />
              <div className="home-track-row__meta min-w-0 flex-1">
                <p className="home-track-row__title truncate">{track.title}</p>
                <p className="home-track-row__artist truncate">{track.artist}</p>
              </div>
              <div className="home-track-row__actions">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(track)
                  }}
                  className={`home-track-row__icon-btn${fav ? ' home-track-row__icon-btn--active' : ''}`}
                  aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                >
                  <Heart
                    size={18}
                    fill={fav ? 'var(--accent-color)' : 'none'}
                    color={fav ? 'var(--accent-color)' : 'currentColor'}
                  />
                </button>
                <span className="home-track-row__play" aria-hidden>
                  <Play size={15} fill="currentColor" className="ml-0.5" />
                </span>
              </div>
            </RippleCard>
          )
        })}
      </div>
    </section>
  )
}
