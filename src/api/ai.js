import request, { cachedGet, CACHE_TTL, invalidateCachePattern } from '@/utils/request'

export const aiApi = {
  generate(data, onProgress) {
    return request.post('/ai/generate', data, {
      responseType: 'text',
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.event.currentTarget.response) {
          onProgress(progressEvent.event.currentTarget.response)
        }
      },
    })
  },

  codeGenerate(data) {
    return request.post('/ai/code-generate', data)
  },

  getHistory(params) {
    return request.get('/ai/history', { params })
  },

  saveHistory(data) {
    return request.post('/ai/history', data)
  },

  getHistoryDetail(id) {
    return request.get(`/ai/history/${id}`)
  },

  deleteHistory(id) {
    return request.delete(`/ai/history/${id}`)
  },

  toggleFavorite(id) {
    return request.post(`/ai/history/${id}/favorite`)
  },

  getCount() {
    return cachedGet('/ai/count', {}, { ttl: CACHE_TTL.SHORT })
  },

  getContentTemplates() {
    return cachedGet('/ai/content-templates', {}, { ttl: CACHE_TTL.LONG })
  },
}

export const imageApi = {
  generate(data) {
    return request.post('/ai/image-generate', data)
  },

  edit(data) {
    return request.post('/ai/image-edit', data)
  },

  variation(data) {
    return request.post('/ai/image-variation', data)
  },

  getTemplates() {
    return cachedGet('/ai/image-templates', {}, { ttl: CACHE_TTL.VERY_LONG })
  },

  getCategories() {
    return cachedGet('/gallery/categories', {}, { ttl: CACHE_TTL.VERY_LONG })
  },
}

export const galleryApi = {
  getList(params) {
    return request.get('/gallery', { params })
  },

  save(data) {
    invalidateCachePattern('/gallery')
    return request.post('/gallery', data)
  },

  getDetail(id) {
    return request.get(`/gallery/${id}`)
  },

  update(id, data) {
    invalidateCachePattern('/gallery')
    return request.put(`/gallery/${id}`, data)
  },

  delete(id) {
    invalidateCachePattern('/gallery')
    return request.delete(`/gallery/${id}`)
  },

  togglePublic(id) {
    invalidateCachePattern('/gallery')
    return request.put(`/gallery/${id}/toggle-public`)
  },

  toggleFavorite(id) {
    invalidateCachePattern('/gallery')
    return request.put(`/gallery/${id}/toggle-favorite`)
  },

  updateTags(id, tags) {
    invalidateCachePattern('/gallery')
    return request.put(`/gallery/${id}/tags`, { tags })
  },

  updateCategory(id, category) {
    invalidateCachePattern('/gallery')
    return request.put(`/gallery/${id}/category`, { category })
  },

  batchDelete(ids) {
    invalidateCachePattern('/gallery')
    return request.post('/gallery/batch-delete', { ids })
  },

  batchUpdate(ids, updates) {
    invalidateCachePattern('/gallery')
    return request.post('/gallery/batch-update', { ids, updates })
  },

  getStats() {
    return cachedGet('/gallery/stats/overview', {}, { ttl: CACHE_TTL.SHORT })
  },

  getCategories() {
    return cachedGet('/gallery/categories', {}, { ttl: CACHE_TTL.VERY_LONG })
  },

  getTags(params) {
    return cachedGet('/gallery/tags', params, { ttl: CACHE_TTL.LONG })
  },

  share(id, data) {
    return request.post(`/gallery/${id}/share`, data)
  },

  getShares(id) {
    return request.get(`/gallery/${id}/shares`)
  },

  deleteShare(shareId) {
    return request.delete(`/gallery/shares/${shareId}`)
  },

  getSharedWork(token, params) {
    return request.get(`/gallery/shared/${token}`, { params })
  },

  recordDownload(id) {
    return request.post(`/gallery/${id}/download`)
  },
}
