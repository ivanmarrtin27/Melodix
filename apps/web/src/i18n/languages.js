/** Idiomas principales con UI traducida. */
export const LANGUAGES = [
  { code: 'es', name: 'Spanish', native: 'Español', region: 'ES', dir: 'ltr' },
  { code: 'en', name: 'English', native: 'English', region: 'US', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', native: '中文', region: 'CN', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', region: 'IN', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', region: 'SA', dir: 'rtl' },
  { code: 'pt', name: 'Portuguese', native: 'Português', region: 'BR', dir: 'ltr' },
  { code: 'fr', name: 'French', native: 'Français', region: 'FR', dir: 'ltr' },
  { code: 'de', name: 'German', native: 'Deutsch', region: 'DE', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', native: '日本語', region: 'JP', dir: 'ltr' },
  { code: 'ko', name: 'Korean', native: '한국어', region: 'KR', dir: 'ltr' },
  { code: 'ru', name: 'Russian', native: 'Русский', region: 'RU', dir: 'ltr' },
  { code: 'it', name: 'Italian', native: 'Italiano', region: 'IT', dir: 'ltr' },
]

export const DEFAULT_LANGUAGE = 'es'

export function getLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0]
}

export function isSupportedLanguage(code) {
  return LANGUAGES.some((l) => l.code === code)
}

export function resolveLanguage(code) {
  if (isSupportedLanguage(code)) return code
  return DEFAULT_LANGUAGE
}

export function applyLanguage(code) {
  const lang = getLanguage(resolveLanguage(code))
  const root = document.documentElement
  root.lang = lang.code
  root.dir = lang.dir
}
