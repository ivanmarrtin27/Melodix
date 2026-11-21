import { useCallback } from 'react'
import { useUserStore } from '../stores/userStore'
import { DICTIONARIES } from './dictionaries'
import { DEFAULT_LANGUAGE, resolveLanguage } from './languages'

export {
  LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguage,
  isSupportedLanguage,
  resolveLanguage,
  applyLanguage,
} from './languages'

function interpolate(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    if (vars[key] == null) return `{${key}}`
    return String(vars[key])
  })
}

export function translate(lang, key, vars) {
  const code = resolveLanguage(lang)
  const dict = DICTIONARIES[code] || DICTIONARIES[DEFAULT_LANGUAGE]
  const fallback = DICTIONARIES[DEFAULT_LANGUAGE]?.[key] || DICTIONARIES.en?.[key] || key
  const raw = dict?.[key] ?? fallback
  return vars ? interpolate(raw, vars) : raw
}

/** Traducción fuera de React (lee el idioma actual del store). */
export function t(key, vars) {
  const lang = useUserStore.getState().settings?.language || DEFAULT_LANGUAGE
  return translate(lang, key, vars)
}

export function useT() {
  const language = useUserStore((s) => s.settings?.language || DEFAULT_LANGUAGE)
  return useCallback((key, vars) => translate(language, key, vars), [language])
}

export function useLanguageCode() {
  return useUserStore((s) => resolveLanguage(s.settings?.language || DEFAULT_LANGUAGE))
}
