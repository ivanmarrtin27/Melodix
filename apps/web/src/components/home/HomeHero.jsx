import { useEffect, useState, useCallback, useRef } from 'react'
import { Play, Sparkles } from 'lucide-react'
import { AlbumCover } from '../ui/AlbumCover'
import { RippleCard } from '../ui/RippleCard'
import { badgeClassForSlide } from '../../utils/featuredHero'

const ROTATE_MS = 4000

function HeroSlide({ slide, isActive, onOpen, onPlay }) {
  const { album, badge, subtitle } = slide
  const coverFallback = ''

  return (
    <div className={`home-hero__slide${isActive ? ' home-hero__slide--active' : ''}`}>
      <RippleCard onClick={() => onOpen?.(album)} className="home-hero__shell">
        <AlbumCover src={album.cover} fallback={coverFallback} alt="" className="home-hero__bg" />
        <div className="home-hero__overlay" />
        <div className="home-hero__content">
          <AlbumCover
            src={album.cover}
            fallback={coverFallback}
            alt={album.title}
            className="home-hero__cover"
          />
          <div className="home-hero__copy min-w-0">
            <p className={`home-hero__eyebrow ${badgeClassForSlide(badge)}`}>{badge}</p>
            <h2 className="home-hero__title line-clamp-2">{album.title}</h2>
            <p className="home-hero__meta truncate">
              {album.artist && album.artist !== 'Artista desconocido'
                ? album.artist
                : '…'}
            </p>
            {subtitle ? <p className="home-hero__hint truncate">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (onPlay) onPlay(album)
              else onOpen?.(album)
            }}
            className="home-hero__play"
            aria-label={`Reproducir ${album.title}`}
          >
            <Play size={22} fill="currentColor" className="ml-0.5" />
          </button>
        </div>
      </RippleCard>
    </div>
  )
}

export function HomeHero({ slides = [], loading, onPlayDayMix, onOpen, onPlay }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const fillRef = useRef(null)
  const animRef = useRef(null)

  const count = slides.length
  const slidesKey = slides.map((s) => s.id).join('|')

  useEffect(() => {
    setActive(0)
  }, [slidesKey])

  useEffect(() => {
    animRef.current?.cancel()
    animRef.current = null

    const el = fillRef.current
    if (!el || count <= 1) return undefined

    const anim = el.animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      {
        duration: ROTATE_MS,
        fill: 'forwards',
        easing: 'linear',
      }
    )

    animRef.current = anim

    const onFinish = () => {
      setActive((i) => (i + 1) % count)
    }
    anim.addEventListener('finish', onFinish)

    if (paused) anim.pause()

    return () => {
      anim.removeEventListener('finish', onFinish)
      anim.cancel()
    }
  }, [active, slidesKey, count])

  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    if (paused) anim.pause()
    else anim.play()
  }, [paused])

  const goTo = useCallback((index) => {
    setActive(index)
    setPaused(true)
    window.setTimeout(() => setPaused(false), 12000)
  }, [])

  if (loading) {
    return (
      <section className="home-hero px-4 pt-1 pb-2">
        <div className="home-hero__shell home-hero__shell--loading">
          <div className="skeleton w-full aspect-[16/10] rounded-2xl" />
        </div>
      </section>
    )
  }

  if (!count) {
    return (
      <section className="home-hero px-4 pt-1 pb-2">
        <RippleCard onClick={onPlayDayMix} className="home-hero__shell home-hero__shell--fallback">
          <div className="home-hero__fallback-icon">
            <Sparkles size={28} strokeWidth={1.75} />
          </div>
          <div className="home-hero__copy">
            <p className="home-hero__eyebrow home-hero__eyebrow--recommended">Mix del día</p>
            <h2 className="home-hero__title">Tu Melodix diario</h2>
            <p className="home-hero__meta">Mezcla hecha para ti · Pulsa para escuchar</p>
          </div>
          <button type="button" className="home-hero__play" aria-label="Reproducir mix del día">
            <Play size={22} fill="currentColor" className="ml-0.5" />
          </button>
        </RippleCard>
      </section>
    )
  }

  return (
    <section
      className="home-hero px-4 pt-1 pb-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="home-hero__carousel">
        {slides.map((slide, index) => (
          <HeroSlide
            key={slide.id}
            slide={slide}
            isActive={index === active}
            onOpen={onOpen}
            onPlay={onPlay}
          />
        ))}
      </div>

      {count > 1 && (
        <div className="home-hero__dots" role="tablist" aria-label="Destacados">
          {slides.map((slide, index) => {
            const isActive = index === active
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`${slide.badge}: ${slide.album.title}`}
                className={`home-hero__dot${isActive ? ' home-hero__dot--active' : ''}`}
                onClick={() => goTo(index)}
              >
                {isActive ? <span ref={fillRef} className="home-hero__dot-fill" /> : null}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
