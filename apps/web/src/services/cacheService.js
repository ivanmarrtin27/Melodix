const _mem = new Map()

const cacheService = {
  get(key) {
    const entry = _mem.get(key)
    if (!entry) return null
    if (Date.now() > entry.exp) {
      _mem.delete(key)
      return null
    }
    return entry.data
  },

  set(key, data, ttlSeconds = 300) {
    if (_mem.size > 1000) {
      const keys = [..._mem.keys()].slice(0, 100)
      keys.forEach((k) => _mem.delete(k))
    }
    _mem.set(key, { data, exp: Date.now() + ttlSeconds * 1000 })
  },

  getPersisted(key) {
    try {
      const raw = localStorage.getItem(`melodix:${key}`)
      if (!raw) return null
      const { data, exp } = JSON.parse(raw)
      if (Date.now() > exp) {
        localStorage.removeItem(`melodix:${key}`)
        return null
      }
      return data
    } catch {
      return null
    }
  },

  setPersisted(key, data, ttlSeconds = 3600) {
    try {
      localStorage.setItem(
        `melodix:${key}`,
        JSON.stringify({ data, exp: Date.now() + ttlSeconds * 1000 })
      )
    } catch {
      /* localStorage lleno */
    }
  },

  getAny(key) {
    return this.get(key) || this.getPersisted(key)
  },

  setAll(key, data, ttlMem = 300, ttlStorage = 3600) {
    this.set(key, data, ttlMem)
    this.setPersisted(key, data, ttlStorage)
  },

  invalidate(key) {
    _mem.delete(key)
    try {
      localStorage.removeItem(`melodix:${key}`)
    } catch {
      /* ignore */
    }
  },

  getStats() {
    let storageKeys = 0
    try {
      storageKeys = Object.keys(localStorage).filter((k) => k.startsWith('melodix:')).length
    } catch {
      /* ignore */
    }
    return { memEntries: _mem.size, storageKeys }
  },
}

export default cacheService
