import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ACCENT_COLORS } from '../utils/helpers'
import { defaultEqualizerSettings, normalizeEqBands } from '../config/equalizerPresets'
import { STORAGE_KEYS } from '../utils/storage'
import {
  applyLanguage,
  DEFAULT_LANGUAGE,
  resolveLanguage,
} from '../i18n/languages'

const defaultUser = {
  name: 'Oyente',
  email: 'usuario@melodix.app',
  avatar: null,
}

const defaultSettings = {
  theme: 'dark',
  accent: 'red',
  language: DEFAULT_LANGUAGE,
  visualizerEnabled: true,
  equalizer: defaultEqualizerSettings(),
}

export const useUserStore = create(
  persist(
    (set) => ({
      user: defaultUser,
      settings: defaultSettings,
      notificationsOpen: false,
      notificationReadIds: [],

      setSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),
      setEqualizer: (partial) =>
        set((s) => ({
          settings: {
            ...s.settings,
            equalizer: {
              ...defaultEqualizerSettings(),
              ...s.settings.equalizer,
              ...partial,
              bands: normalizeEqBands(
                partial?.bands ?? s.settings.equalizer?.bands
              ),
            },
          },
        })),
      toggleTheme: () =>
        set((s) => ({
          settings: {
            ...s.settings,
            theme: s.settings.theme === 'dark' ? 'light' : 'dark',
          },
        })),
      setAccent: (accent) =>
        set((s) => ({ settings: { ...s.settings, accent } })),
      openNotifications: () => set({ notificationsOpen: true }),
      closeNotifications: () => set({ notificationsOpen: false }),
      markNotificationRead: (id) =>
        set((s) => ({
          notificationReadIds: s.notificationReadIds.includes(id)
            ? s.notificationReadIds
            : [...s.notificationReadIds, id],
        })),
      markAllNotificationsRead: (ids = []) =>
        set((s) => ({
          notificationReadIds: [...new Set([...s.notificationReadIds, ...ids])],
        })),
    }),
    {
      name: STORAGE_KEYS.USER,
      partialize: (s) => ({
        user: s.user,
        settings: s.settings,
        notificationReadIds: s.notificationReadIds,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          state.user = { ...defaultUser, ...state.user }
        }
        if (state?.settings) {
          const { audioQuality: _aq, brandAccentMigration, ...rest } = state.settings
          const eq = rest.equalizer || defaultEqualizerSettings()
          const needsBrandAccent =
            brandAccentMigration !== 1 &&
            (!rest.accent || rest.accent === 'green')
          state.settings = {
            ...defaultSettings,
            ...rest,
            accent: needsBrandAccent ? 'red' : rest.accent || 'red',
            brandAccentMigration: 1,
            language: resolveLanguage(rest.language || defaultSettings.language),
            equalizer: {
              ...defaultEqualizerSettings(),
              ...eq,
              bands: normalizeEqBands(eq.bands),
            },
          }
        }
      },
    }
  )
)

export function applyTheme(settings) {
  const root = document.documentElement
  const accent = ACCENT_COLORS[settings.accent]?.value || ACCENT_COLORS.red.value

  root.style.setProperty('--accent-color', accent)
  root.classList.toggle('light', settings.theme === 'light')

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = settings.theme === 'dark' ? '#0a0a0a' : '#f5f5f5'

  applyLanguage(settings.language || DEFAULT_LANGUAGE)
}
