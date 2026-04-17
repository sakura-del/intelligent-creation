import request from '@/utils/request'

export const userApi = {
  login(data) {
    return request.post('/user/login', data)
  },

  register(data) {
    return request.post('/user/register', data)
  },

  logout() {
    return request.post('/user/logout')
  },

  getUserInfo() {
    return request.get('/user/info')
  },

  updateUser(data) {
    return request.post('/user/update', data)
  },

  refreshToken(refreshToken) {
    return request.post('/user/refresh-token', { refreshToken })
  },

  getAICount() {
    return request.get('/ai/count')
  },

  getStatistics() {
    return request.get('/user/statistics')
  },

  getHistory(params = {}) {
    return request.get('/user/history', { params })
  },
}
