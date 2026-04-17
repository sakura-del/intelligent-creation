import request from '@/utils/request'

export const projectsApi = {
  save(data) {
    return request.post('/projects/', data)
  },

  getList(params) {
    return request.get('/projects/', { params })
  },

  getDetail(id) {
    return request.get(`/projects/${id}`)
  },

  update(id, data) {
    return request.put(`/projects/${id}`, data)
  },

  delete(id) {
    return request.delete(`/projects/${id}`)
  },

  getByShareToken(token) {
    return request.get(`/projects/share/${token}`)
  },

  getEmbedCode(id) {
    return request.get(`/projects/${id}/embed-code`)
  },

  getVersions(id, params = {}) {
    return request.get(`/projects/${id}/versions`, { params })
  },

  createVersion(id, data = {}) {
    return request.post(`/projects/${id}/versions`, data)
  },

  getVersion(id, versionNumber) {
    return request.get(`/projects/${id}/versions/${versionNumber}`)
  },

  restoreVersion(id, versionNumber) {
    return request.post(`/projects/${id}/versions/${versionNumber}/restore`)
  },

  deleteVersion(id, versionId) {
    return request.delete(`/projects/${id}/versions/${versionId}`)
  },

  getTemplates(params = {}) {
    return request.get('/projects/templates/list', { params })
  },

  getTemplateDetail(id) {
    return request.get(`/projects/templates/${id}`)
  },

  createTemplate(data) {
    return request.post('/projects/templates', data)
  },
}
