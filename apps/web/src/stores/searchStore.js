import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '../utils/storage'

const MAX_HISTORY = 18

function normalizeQuery(query) {
  return String(query || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function itemKey(item) {
  if (!item) return ''
  if (item.type === 'query') return `query:${String(item.query || '').toLowerCase()}`
  return `${item.type}:${item.id}`
}

function normalizeItem(raw) {
  if (!raw) return null

  // Migración: entradas antiguas { query, searchedAt, resultCount }
  if (!raw.type && raw.query) {
    return {
      type: 'query',
      id: `q-${normalizeQuery(raw.query).toLowerCase()}`,
      query: normalizeQuery(raw.query),
      title: normalizeQuery(raw.query),
      subtitle: raw.resultCount != null ? `${raw.resultCount} resultados` : 'Búsqueda',
      image: null,
      searchedAt: raw.searchedAt || new Date().toISOString(),
      resultCount: Number.isFinite(raw.resultCount) ? raw.resultCount : null,
    }
  }

  if (!raw.type || !raw.title) return null

  return {
    type: raw.type,
    id: String(raw.id || raw.deezerId || raw.query || raw.title),
    query: raw.query ? normalizeQuery(raw.query) : null,
    title: String(raw.title).trim(),
    subtitle: raw.subtitle || '',
    image: raw.image || null,
    deezerId: raw.deezerId ?? null,
    searchedAt: raw.searchedAt || new Date().toISOString(),
    resultCount: Number.isFinite(raw.resultCount) ? raw.resultCount : null,
  }
}

export const useSearchStore = create(
  persist(
    (set, get) => ({
      history: [],

      /** Texto de búsqueda (solo con resultados). */
      addQuery: (query, resultCount = null) => {
        const normalized = normalizeQuery(query)
        if (normalized.length < 2) return
        if (!Number.isFinite(resultCount) || resultCount <= 0) return

        const entry = normalizeItem({
          type: 'query',
          id: `q-${normalized.toLowerCase()}`,
          query: normalized,
          title: normalized,
          subtitle: `${resultCount} resultado${resultCount === 1 ? '' : 's'}`,
          resultCount,
          searchedAt: new Date().toISOString(),
        })
        if (!entry) return

        set((state) => {
          const key = itemKey(entry)
          const filtered = state.history.filter((item) => itemKey(item) !== key)
          return { history: [entry, ...filtered].slice(0, MAX_HISTORY) }
        })
      },

      /** Artista / álbum / canción visitado o tocado. */
      addItem: (raw) => {
        const entry = normalizeItem({
          ...raw,
          searchedAt: new Date().toISOString(),
        })
        if (!entry) return

        set((state) => {
          const key = itemKey(entry)
          const filtered = state.history.filter((item) => itemKey(item) !== key)
          return { history: [entry, ...filtered].slice(0, MAX_HISTORY) }
        })
      },

      /** @deprecated usar addQuery — compat con llamadas viejas */
      addSearch: (query, resultCount = null) => {
        get().addQuery(query, resultCount)
      },

      removeItem: (itemOrQuery) => {
        const key =
          typeof itemOrQuery === 'string'
            ? itemKey({ type: 'query', query: itemOrQuery, id: itemOrQuery })
            : itemKey(itemOrQuery)
        if (!key) return
        set((state) => ({
          history: state.history.filter((item) => itemKey(item) !== key),
        }))
      },

      removeSearch: (query) => {
        get().removeItem(query)
      },

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: STORAGE_KEYS.SEARCH_HISTORY,
      version: 2,
      migrate: (persisted) => {
        const history = Array.isArray(persisted?.history)
          ? persisted.history.map(normalizeItem).filter(Boolean)
          : []
        return { history }
      },
    }
  )
)
