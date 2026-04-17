import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/api/user'
import { ElMessage } from 'element-plus'

const TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_INFO_KEY = 'userInfo'

function getStoredValue(key, fallback = '') {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function getStoredJSON(key, fallback = {}) {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export const useUserStore = defineStore('user', () => {
  const token = ref(getStoredValue(TOKEN_KEY))
  const refreshToken = ref(getStoredValue(REFRESH_TOKEN_KEY))
  const userInfo = ref(getStoredJSON(USER_INFO_KEY))
  const loading = ref(false)
  const isRefreshing = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const username = computed(() => userInfo.value.username || '')
  const nickname = computed(() => userInfo.value.nickname || '')
  const avatar = computed(() => userInfo.value.avatar || '')
  const email = computed(() => userInfo.value.email || '')
  const aiCount = computed(() => userInfo.value.ai_count || 0)
  const userRole = computed(() => userInfo.value.role || 'user')
  const isAdmin = computed(() => userInfo.value.role === 'admin')
  const isVip = computed(() => userInfo.value.role === 'vip' || userInfo.value.role === 'admin')

  function setAuthData(data) {
    token.value = data.token
    refreshToken.value = data.refreshToken
    userInfo.value = data.user

    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user))
  }

  async function login(loginData) {
    try {
      loading.value = true
      const res = await userApi.login(loginData)
      setAuthData(res)

      ElMessage.success('登录成功')
      return true
    } catch (error) {
      ElMessage.error(error.message || '登录失败')
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(registerData) {
    try {
      loading.value = true
      await userApi.register(registerData)
      ElMessage.success('注册成功，请登录')
      return true
    } catch (error) {
      ElMessage.error(error.message || '注册失败')
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchUserInfo() {
    try {
      const res = await userApi.getUserInfo()
      userInfo.value = res.data || res
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo.value))
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  async function updateUserInfo(data) {
    try {
      loading.value = true
      const res = await userApi.updateUser(data)
      userInfo.value = { ...userInfo.value, ...res }
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo.value))
      ElMessage.success('更新成功')
      return true
    } catch (error) {
      ElMessage.error(error.message || '更新失败')
      return false
    } finally {
      loading.value = false
    }
  }

  async function refreshAccessToken() {
    if (isRefreshing.value) return false
    if (!refreshToken.value) return false

    try {
      isRefreshing.value = true
      const res = await userApi.refreshToken(refreshToken.value)
      token.value = res.token
      refreshToken.value = res.refreshToken
      localStorage.setItem(TOKEN_KEY, res.token)
      localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken)
      return true
    } catch {
      logout()
      return false
    } finally {
      isRefreshing.value = false
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await userApi.logout()
      }
    } catch {
      // ignore logout API errors
    } finally {
      token.value = ''
      refreshToken.value = ''
      userInfo.value = {}
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_INFO_KEY)
    }
  }

  function clearAuth() {
    token.value = ''
    refreshToken.value = ''
    userInfo.value = {}
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
  }

  return {
    token,
    refreshToken,
    userInfo,
    loading,
    isRefreshing,
    isLoggedIn,
    username,
    nickname,
    avatar,
    email,
    aiCount,
    userRole,
    isAdmin,
    isVip,
    login,
    register,
    fetchUserInfo,
    updateUserInfo,
    refreshAccessToken,
    logout,
    clearAuth,
    setAuthData,
  }
})
