import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Moon, Settings, Sun } from 'lucide-react'
import { useUserStore } from '../stores/userStore'
import { usePlayerStore } from '../stores/playerStore'
import { ACCENT_COLORS as COLORS } from '../utils/helpers'
import { useT } from '../i18n'
import { EqualizerSettings } from '../components/settings/EqualizerSettings'
import {
  AppPanelGroup,
  AppPanelGroupRow,
  AppPanelSection,
} from '../components/layout/AppPanel'

/**
 * v2 Settings — solo lo acordado: tema, color de acento, ecualizador.
 */
export default function SettingsPage() {
  const t = useT()
  const navigate = useNavigate()
  const { settings, toggleTheme, setAccent, setEqualizer } = useUserStore()

  const syncEqualizerPlayback = usePlayerStore((s) => s.syncEqualizerPlayback)
  const applyEqualizerLive = usePlayerStore((s) => s.applyEqualizerLive)
  const requestCollapse = usePlayerStore((s) => s.requestCollapse)
  const playerScreen = usePlayerStore((s) => s.playerScreen)

  const [eqScreenOpen, setEqScreenOpen] = useState(false)

  useEffect(() => {
    if (playerScreen !== 'mini') requestCollapse()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEqualizerChange = (nextEq) => {
    const wasEnabled = Boolean(settings.equalizer?.enabled)
    setEqualizer(nextEq)
    if (Boolean(nextEq.enabled) !== wasEnabled) {
      void syncEqualizerPlayback()
    } else {
      applyEqualizerLive()
    }
  }

  const isDark = settings.theme === 'dark'

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/home', { replace: true })
  }

  return (
    <div className="settings-page safe-bottom">
      <header className="settings-page__header safe-top">
        <button
          type="button"
          className="settings-page__back"
          onClick={goBack}
          aria-label={t('settings.back')}
        >
          <ArrowLeft size={20} strokeWidth={2.1} />
        </button>
        <div className="settings-page__heading">
          <div className="settings-page__icon" aria-hidden>
            <Settings size={18} strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <h1 className="settings-page__title">{t('settings.title')}</h1>
            <p className="settings-page__subtitle">{t('settings.subtitle')}</p>
          </div>
        </div>
      </header>

      <div className="settings-page__body">
        <AppPanelSection title={t('settings.preferences')}>
          <AppPanelGroup>
            <AppPanelGroupRow>
              <div className="app-settings-row">
                <div className="app-settings-row__copy">
                  <span className="app-settings-row__icon" aria-hidden>
                    {isDark ? <Moon size={16} /> : <Sun size={16} />}
                  </span>
                  <div>
                    <p className="app-settings-row__title">
                      {isDark ? t('settings.themeDark') : t('settings.themeLight')}
                    </p>
                    <p className="app-settings-row__sub">{t('settings.themeSub')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`app-switch${isDark ? ' app-switch--on' : ''}`}
                  aria-pressed={isDark}
                  aria-label={t('settings.themeToggle')}
                >
                  <span className="app-switch__thumb" />
                </button>
              </div>
            </AppPanelGroupRow>

            <AppPanelGroupRow className="app-panel__group-row--accent">
              <p className="app-panel__hint app-panel__hint--inline">{t('settings.accentColor')}</p>
              <div className="app-accent-grid" role="listbox" aria-label={t('settings.accentColor')}>
                {Object.entries(COLORS).map(([key, { name, value }]) => (
                  <button
                    key={key}
                    type="button"
                    role="option"
                    aria-selected={settings.accent === key}
                    onClick={() => setAccent(key)}
                    title={name}
                    className={`app-accent-swatch${settings.accent === key ? ' app-accent-swatch--active' : ''}`}
                    style={{ '--swatch-color': value }}
                  >
                    <span className="app-accent-swatch__dot" />
                    <span className="app-accent-swatch__name">{name}</span>
                  </button>
                ))}
              </div>
            </AppPanelGroupRow>
          </AppPanelGroup>
        </AppPanelSection>

        <AppPanelSection title={t('settings.sound')}>
          <AppPanelGroup>
            <AppPanelGroupRow>
              <EqualizerSettings
                equalizer={settings.equalizer}
                onChange={handleEqualizerChange}
                open={eqScreenOpen}
                onOpen={() => setEqScreenOpen(true)}
                onClose={() => setEqScreenOpen(false)}
              />
            </AppPanelGroupRow>
          </AppPanelGroup>
        </AppPanelSection>

        <p className="settings-page__footer">MELODIX v2</p>
      </div>
    </div>
  )
}
