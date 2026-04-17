import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/modules/user'
import router from '@/router'
import requestCache, { CACHE_TTL } from '@/utils/requestCache'
import { trackApiCall } from '@/utils/performanceMonitor'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
  },
})

let isTokenRefreshing = false
let pendingRequests = []

function processPendingRequests(isSuccess) {
  pendingRequests.forEach((cb) => cb(isSuccess))
  pendingRequests = []
}

service.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers['Authorization'] = `Bearer ${userStore.token}`
    }
    config._startTime = Date.now()
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

service.interceptors.response.use(
  (response) => {
    const res = response.data
    const duration = response.config._startTime ? Date.now() - response.config._startTime : 0
    trackApiCall(response.config.url, response.config.method, duration, response.status)

    if (res.code !== undefined && res.code >= 400) {
      ElMessage({
        message: res.message || '请求失败',
        type: 'error',
        duration: 5000,
      })

      if (res.code === 401) {
        handleUnauthorized()
      }

      return Promise.reject(new Error(res.message || '请求失败'))
    }

    return res.data ?? res
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      const userStore = useUserStore()

      if (isTokenRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((isSuccess) => {
            if (isSuccess) {
              originalRequest.headers['Authorization'] = `Bearer ${userStore.token}`
              resolve(service(originalRequest))
            } else {
              resolve(Promise.reject(error))
            }
          })
        })
      }

      originalRequest._retry = true
      isTokenRefreshing = true

      try {
        const refreshSuccess = await userStore.refreshAccessToken()

        if (refreshSuccess) {
          processPendingRequests(true)
          originalRequest.headers['Authorization'] = `Bearer ${userStore.token}`
          return service(originalRequest)
        } else {
          processPendingRequests(false)
          handleUnauthorized()
          return Promise.reject(error)
        }
      } catch {
        processPendingRequests(false)
        handleUnauthorized()
        return Promise.reject(error)
      } finally {
        isTokenRefreshing = false
      }
    }

    let message = '网络错误'
    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = '请求参数错误'
          break
        case 401:
          message = '未授权，请重新登录'
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求地址不存在'
          break
        case 429:
          message = error.response.data?.message || '请求过于频繁，请稍后再试'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = `请求失败(${error.response.status})`
      }
    } else if (error.message.includes('timeout')) {
      message = '请求超时'
    } else if (error.message.includes('Network')) {
      message = '网络连接异常'
    }

    ElMessage({
      message,
      type: 'error',
      duration: 5000,
    })

    return Promise.reject(error)
  },
)

let unauthorizedHandling = false

function handleUnauthorized() {
  if (unauthorizedHandling) return
  unauthorizedHandling = true

  const userStore = useUserStore()
  userStore.clearAuth()

  ElMessageBox.confirm('登录已过期，请重新登录', '提示', {
    confirmButtonText: '重新登录',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
    })
    .catch(() => {
      // user cancelled
    })
    .finally(() => {
      unauthorizedHandling = false
    })
}

export default service

export function cachedGet(url, params = {}, options = {}) {
  const { ttl = 60000, forceRefresh = false } = options

  if (!forceRefresh) {
    const cached = requestCache.get(url, params)
    if (cached !== null) {
      return Promise.resolve(cached)
    }
  }

  const pending = requestCache.getPending(url, params)
  if (pending) {
    return pending
  }

  const promise = service.get(url, { params }).then((data) => {
    requestCache.set(url, params, data, ttl)
    return data
  })

  requestCache.setPending(url, params, promise)
  return promise
}

export function invalidateCache(url, params) {
  requestCache.invalidate(url, params)
}

export function invalidateCachePattern(pattern) {
  requestCache.invalidatePattern(pattern)
}

export function clearRequestCache() {
  requestCache.clear()
}

export { CACHE_TTL }
