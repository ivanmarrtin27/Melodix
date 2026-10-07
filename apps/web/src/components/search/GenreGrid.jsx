import {
  Mic2,
  Disc3,
  Flame,
  Headphones,
  Radio,
  Heart,
  Music2,
  Leaf,
  Music4,
  Award,
  Zap,
  Sun,
  Music,
} from 'lucide-react'
import { GENRES } from '../../utils/helpers'
import { RippleCard } from '../ui/RippleCard'

const GENRE_ICONS = {
  Mic2,
  Disc3,
  Flame,
  Headphones,
  Radio,
  Heart,
  Music2,
  Leaf,
  Music4,
  Award,
  Zap,
  Sun,
}

export function GenreGrid({ onSelect }) {
  return (
    <div className="genre-grid">
      {GENRES.map((genre) => {
        const Icon = GENRE_ICONS[genre.icon] || Music
        return (
          <RippleCard
            key={genre.id}
            onClick={() => onSelect(genre)}
            className="genre-tile"
            style={{ '--tile-tint': genre.color }}
          >
            <span className="genre-tile__glow" aria-hidden />
            <span className="genre-tile__accent" aria-hidden />
            <Icon size={38} className="genre-tile__icon" strokeWidth={1.4} aria-hidden />
            <span className="genre-tile__copy">
              <span className="genre-tile__name">{genre.name}</span>
              {genre.tagline ? (
                <span className="genre-tile__tag">{genre.tagline}</span>
              ) : null}
            </span>
          </RippleCard>
        )
      })}
    </div>
  )
}
