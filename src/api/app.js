import request from '@/utils/request'

export const appApi = {
  getList(params = {}) {
    return request.get('/app/list', { params })
  },

  add(data) {
    return request.post('/app/add', data)
  },

  getDetail(id) {
    return request.get(`/app/detail/${id}`)
  },

  update(data) {
    return request.post('/app/update', data)
  },

  delete(id) {
    return request.delete(`/app/delete/${id}`)
  },

  deploy(id) {
    return request.post(`/app/deploy/${id}`)
  },

  generate(data) {
    return request.post('/app/generate', data)
  },

  saveStructure(data) {
    return request.post('/app/save-structure', data)
  },
}
