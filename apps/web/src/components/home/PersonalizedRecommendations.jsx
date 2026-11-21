import { Play, Sparkles } from 'lucide-react'
import { AlbumCover } from '../ui/AlbumCover'
import { RippleCard } from '../ui/RippleCard'
import { SkeletonCard } from '../ui/Skeleton'
import { isLastfmConfigured } from '../../services/recommendationsService'

export function PersonalizedRecommendations({
  tracks,
  loading,
  subtitle,
  source,
  onPlayTrack,
  onPlayAll,
  onPrimeTrack,
}) {
  const badge =
    source === 'lastfm' && isLastfmConfigured()
      ? 'Last.fm'
      : source === 'chart'
        ? 'Tendencias'
        : 'Para ti'

  return (
    <section className="home-section">
      <div className="home-section__head px-4 mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={16} className="text-white/55 shrink-0" />
            <h2 className="home-section__title">Recomendado para ti</h2>
            <span className="home-reco-badge">{badge}</span>
          </div>
          {subtitle ? <p className="home-section__sub">{subtitle}</p> : null}
        </div>
        {tracks.length > 0 && (
          <button
            type="button"
            onClick={onPlayAll}
            className="home-reco-play-all shrink-0"
            aria-label="Reproducir recomendaciones"
          >
            <Play size={14} fill="currentColor" />
          </button>
        )}
      </div>

      <div className="home-album-row scrollbar-hide">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="home-reco-card home-reco-card--skeleton">
                <SkeletonCard size="album" />
              </div>
            ))
          : tracks.map((track) => (
              <RippleCard
                key={track.id}
                onPointerDown={() => onPrimeTrack?.(track)}
                onClick={() => onPlayTrack(track)}
                className="home-reco-card"
              >
                <div className="home-reco-card__cover-wrap">
                  <AlbumCover
                    src={track.thumbnail || track.albumCover}
                    alt=""
                    className="home-reco-card__cover"
                  />
                </div>
                <p className="home-reco-card__title line-clamp-2">{track.title}</p>
                <p className="home-reco-card__artist truncate">{track.artist}</p>
              </RippleCard>
            ))}
      </div>

      {!loading && tracks.length === 0 && (
        <p className="px-4 text-sm text-white/40">
          Escucha canciones, marca favoritos o sigue artistas para personalizar esto.
        </p>
      )}
    </section>
  )
}
