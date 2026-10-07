import { Clock3, Disc3, Mic2, Music2, Search, Trash2, X } from 'lucide-react'
import { useSearchStore } from '../../stores/searchStore'
import { useT } from '../../i18n'
import { AlbumCover } from '../ui/AlbumCover'
import { RippleCard } from '../ui/RippleCard'

function typeLabel(type, t) {
  if (type === 'artist') return t('search.artist')
  if (type === 'album') return t('search.album')
  if (type === 'track') return t('search.song')
  return t('search.queryType')
}

function itemMatches(item, needle) {
  if (!needle) return true
  const hay = [item.title, item.query, item.subtitle]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(needle)
}

function HistoryThumb({ item }) {
  if (item.image || item.type === 'artist' || item.type === 'album' || item.type === 'track') {
    const rounded = item.type === 'artist' ? 'rounded-full' : 'rounded-lg'
    return (
      <AlbumCover
        src={item.image}
        alt=""
        className={`search-history__thumb ${rounded}`}
      />
    )
  }

  const Icon =
    item.type === 'artist' ? Mic2 : item.type === 'album' ? Disc3 : item.type === 'track' ? Music2 : Search

  return (
    <span className="search-history__icon" aria-hidden>
      <Icon size={16} />
    </span>
  )
}

export function SearchHistory({ onSelect, compact = false, filter = '' }) {
  const t = useT()
  const history = useSearchStore((s) => s.history)
  const removeItem = useSearchStore((s) => s.removeItem)
  const clearHistory = useSearchStore((s) => s.clearHistory)

  const needle = filter.trim().toLowerCase()
  const items = history.filter((item) => itemMatches(item, needle))

  if (!items.length) return null

  if (compact) {
    return (
      <div className="search-history-inline">
        <div className="search-history-inline__head">
          <span className="search-history-inline__label">
            <Clock3 size={12} />
            {t('search.recent')}
          </span>
          <button
            type="button"
            onClick={clearHistory}
            className="search-history-inline__clear"
            aria-label={t('search.clear')}
          >
            <Trash2 size={12} />
          </button>
        </div>
        <div className="search-history-inline__chips scrollbar-hide">
          {items.map((item) => {
            const key = `${item.type}:${item.id}`
            return (
              <div key={key} className="search-history-chip">
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="search-history-chip__main"
                >
                  {item.image ? (
                    <AlbumCover
                      src={item.image}
                      alt=""
                      className={`search-history-chip__avatar${item.type === 'artist' ? ' search-history-chip__avatar--round' : ''}`}
                    />
                  ) : (
                    <Search size={12} className="search-history-chip__icon" />
                  )}
                  <span className="search-history-chip__text truncate">{item.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="search-history-chip__remove"
                  aria-label={`${t('search.clear')} ${item.title}`}
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <section className="search-history">
      <div className="search-history__head">
        <h2 className="search-history__title">{t('search.recent')}</h2>
        <button
          type="button"
          onClick={clearHistory}
          className="search-history__clear"
          aria-label={t('search.clear')}
        >
          <Trash2 size={14} />
          <span>{t('search.clear')}</span>
        </button>
      </div>

      <ul className="search-history__list">
        {items.map((item) => {
          const key = `${item.type}:${item.id}`
          return (
            <li key={key}>
              <RippleCard onClick={() => onSelect(item)} className="search-history__item">
                <HistoryThumb item={item} />
                <span className="search-history__copy min-w-0 flex-1">
                  <span className="search-history__query truncate">{item.title}</span>
                  <span className="search-history__meta">
                    {typeLabel(item.type, t)}
                    {item.subtitle ? ` • ${item.subtitle}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeItem(item)
                  }}
                  className="search-history__remove"
                  aria-label={`${t('search.clear')} ${item.title}`}
                >
                  <X size={16} />
                </button>
              </RippleCard>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
