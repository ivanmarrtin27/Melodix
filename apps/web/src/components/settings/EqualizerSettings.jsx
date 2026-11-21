import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, RotateCcw, SlidersHorizontal } from 'lucide-react'
import {
  EQ_BANDS,
  EQ_PRESETS,
  EQ_PRESET_CATEGORIES,
  clampBand,
  eqCurvePath,
  getPresetDisplayName,
  normalizeEqBands,
} from '../../config/equalizerPresets'
import { useT } from '../../i18n'
import { useSheetSlideDismiss } from '../../hooks/useSheetSlideDismiss'

export function EqualizerSettings({ equalizer, onChange, open, onOpen, onClose }) {
  const t = useT()
  const eq = equalizer || { enabled: false, preset: 'flat', bands: normalizeEqBands() }
  const presetName = getPresetDisplayName(eq)

  return (
    <>
      <button
        type="button"
        className="eq-row"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-expanded={Boolean(open)}
      >
        <span className="app-settings-row__icon" aria-hidden>
          <SlidersHorizontal size={16} />
        </span>
        <span className="eq-row__copy">
          <span className="app-settings-row__title">{t('settings.equalizer')}</span>
          <span className="eq-row__status">
            {eq.enabled ? (
              <>
                <span className="eq-row__dot" aria-hidden />
                {t('settings.equalizerOn')} · {presetName}
              </>
            ) : (
              t('settings.equalizerOff')
            )}
          </span>
        </span>
        <span className="eq-row__action" aria-hidden>
          <MiniEqCurve bands={eq.bands} active={eq.enabled} />
          <ChevronRight size={16} strokeWidth={2.25} />
        </span>
      </button>

      {open ? (
        <EqualizerScreen eq={eq} onChange={onChange} onClose={onClose} />
      ) : null}
    </>
  )
}

function MiniEqCurve({ bands, active }) {
  const d = useMemo(() => eqCurvePath(bands), [bands])
  return (
    <svg
      className={`eq-mini-curve${active ? ' eq-mini-curve--on' : ''}`}
      viewBox="0 0 64 28"
      width="40"
      height="18"
      aria-hidden
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function EqualizerScreen({ eq, onChange, onClose }) {
  const t = useT()
  const bands = useMemo(() => normalizeEqBands(eq.bands), [eq.bands])
  const curvePath = useMemo(() => eqCurvePath(bands), [bands])
  const [category, setCategory] = useState(() => {
    const preset = EQ_PRESETS[eq.preset]
    return preset?.category || 'essentials'
  })

  const { sheetRef, backdropRef, closing, dragging, handlers, dismiss } = useSheetSlideDismiss({
    onClose,
  })

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [dismiss])

  const update = (partial) => onChange?.({ ...eq, ...partial })

  const setBand = (index, value) => {
    const next = [...bands]
    next[index] = clampBand(value)
    update({ bands: next, preset: 'custom', enabled: true })
  }

  const applyPreset = (presetId) => {
    const preset = EQ_PRESETS[presetId]
    if (!preset) return
    update({
      preset: presetId,
      bands: [...preset.bands],
      enabled: true,
    })
  }

  const presetsInCategory = Object.values(EQ_PRESETS).filter((p) => p.category === category)

  return (
    <div
      className={`eq-screen${closing ? ' eq-screen--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('settings.equalizer')}
    >
      <button
        ref={backdropRef}
        type="button"
        className="eq-screen__backdrop"
        aria-label={t('settings.close')}
        onClick={dismiss}
        disabled={closing}
      />
      <aside ref={sheetRef} className="eq-screen__sheet safe-bottom">
        <div
          className={`eq-screen__handle-bar${dragging ? ' eq-screen__handle-bar--dragging' : ''}`}
          {...handlers}
          role="button"
          tabIndex={closing ? -1 : 0}
          aria-label={t('settings.close')}
          aria-disabled={closing}
          onKeyDown={(e) => {
            if (closing) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              dismiss()
            }
          }}
        >
          <span className={`eq-screen__handle${dragging ? ' eq-screen__handle--dragging' : ''}`}>
            <span className="eq-screen__handle-pill" aria-hidden />
          </span>
        </div>

        <header className="eq-screen__header">
          <div className="eq-screen__heading">
            <span className="eq-screen__badge" aria-hidden>
              <SlidersHorizontal size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h3 className="eq-screen__title">{t('settings.equalizer')}</h3>
              <p className="eq-screen__sub">{t('settings.equalizerPick')}</p>
            </div>
          </div>
        </header>

        <div className="eq-screen__hero" aria-hidden>
          <svg
            className={`eq-screen__hero-curve${eq.enabled ? ' eq-screen__hero-curve--on' : ''}`}
            viewBox="0 0 64 28"
            preserveAspectRatio="none"
          >
            <path
              d={curvePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="eq-screen__body">
          <div className={`eq-screen__power${eq.enabled ? ' eq-screen__power--on' : ''}`}>
            <div>
              <p className="eq-screen__power-title">
                {eq.enabled ? t('settings.equalizerOn') : t('settings.equalizerOff')}
              </p>
              <p className="eq-screen__power-sub">{t('settings.equalizerHint')}</p>
            </div>
            <button
              type="button"
              onClick={() => update({ enabled: !eq.enabled })}
              className={`app-switch${eq.enabled ? ' app-switch--on' : ''}`}
              aria-pressed={Boolean(eq.enabled)}
              aria-label={t('settings.equalizer')}
            >
              <span className="app-switch__thumb" />
            </button>
          </div>

          <div className="eq-screen__tabs" role="tablist" aria-label={t('settings.equalizerPresets')}>
            {EQ_PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={category === cat.id}
                className={`eq-screen__tab${category === cat.id ? ' eq-screen__tab--active' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                {t(`settings.eqCat.${cat.id}`)}
              </button>
            ))}
          </div>

          <div className="eq-preset-grid" role="listbox" aria-label={t('settings.equalizerPresets')}>
            {presetsInCategory.map((preset) => {
              const active = eq.enabled && eq.preset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`eq-preset-card${active ? ' eq-preset-card--active' : ''}`}
                  onClick={() => applyPreset(preset.id)}
                >
                  <MiniEqCurve bands={preset.bands} active={active || eq.preset === preset.id} />
                  <span className="eq-preset-card__name">{preset.name}</span>
                  <span className="eq-preset-card__blurb">{preset.blurb}</span>
                </button>
              )
            })}
            {eq.preset === 'custom' && category === 'essentials' ? (
              <div className="eq-preset-card eq-preset-card--custom" role="option" aria-selected>
                <MiniEqCurve bands={bands} active />
                <span className="eq-preset-card__name">{t('settings.equalizerCustom')}</span>
                <span className="eq-preset-card__blurb">{t('settings.equalizerCustomSub')}</span>
              </div>
            ) : null}
          </div>

          <div className="eq-manual">
            <div className="eq-manual__head">
              <h4 className="eq-manual__title">{t('settings.equalizerManual')}</h4>
              <button type="button" className="eq-reset" onClick={() => applyPreset('flat')}>
                <RotateCcw size={14} />
                {t('settings.equalizerReset')}
              </button>
            </div>

            <div className="eq-bands" role="group" aria-label={t('settings.equalizerManual')}>
              {EQ_BANDS.map((band, index) => (
                <label key={band.freq} className="eq-band">
                  <span className="eq-band__value">
                    {bands[index] > 0 ? `+${bands[index]}` : bands[index]}
                  </span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={bands[index]}
                    orient="vertical"
                    className="eq-band__slider"
                    aria-label={`${band.label} Hz`}
                    onChange={(e) => setBand(index, e.target.value)}
                  />
                  <span className="eq-band__label">{band.label}</span>
                </label>
              ))}
            </div>
            <p className="eq-manual__scale">−12 dB · 0 · +12 dB</p>
          </div>
        </div>
      </aside>
    </div>
  )
}
