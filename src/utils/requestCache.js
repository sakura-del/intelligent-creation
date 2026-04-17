class RequestCache {
  constructor() {
    this.cache = new Map()
    this.pendingRequests = new Map()
  }

  _generateKey(url, params) {
    const sortedParams = params
      ? JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))
      : ''
    return `${url}:${sortedParams}`
  }

  get(url, params) {
    const key = this._generateKey(url, params)
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }

  set(url, params, data, ttl = 60000) {
    const key = this._generateKey(url, params)
    this.cache.set(key, {
      data,
      expireAt: Date.now() + ttl,
    })
  }

  invalidate(url, params) {
    if (params) {
      const key = this._generateKey(url, params)
      this.cache.delete(key)
    } else {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${url}:`)) {
          this.cache.delete(key)
        }
      }
    }
  }

  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  clear() {
    this.cache.clear()
  }

  getPending(url, params) {
    const key = this._generateKey(url, params)
    return this.pendingRequests.get(key) || null
  }

  setPending(url, params, promise) {
    const key = this._generateKey(url, params)
    this.pendingRequests.set(key, promise)
    promise.finally(() => {
      this.pendingRequests.delete(key)
    })
  }

  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.expireAt) {
        this.cache.delete(key)
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      pendingSize: this.pendingRequests.size,
    }
  }
}

const requestCache = new RequestCache()

setInterval(
  () => {
    requestCache.cleanup()
  },
  5 * 60 * 1000,
)

export default requestCache

export const CACHE_TTL = {
  SHORT: 30 * 1000,
  MEDIUM: 60 * 1000,
  LONG: 5 * 60 * 1000,
  VERY_LONG: 30 * 60 * 1000,
}
