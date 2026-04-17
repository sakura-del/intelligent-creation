import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../user'

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('initial state', () => {
    it('should have empty token by default', () => {
      const store = useUserStore()
      expect(store.token).toBe('')
    })

    it('should have empty userInfo by default', () => {
      const store = useUserStore()
      expect(store.userInfo).toEqual({})
    })

    it('should not be logged in by default', () => {
      const store = useUserStore()
      expect(store.isLoggedIn).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('should return username from userInfo', () => {
      const store = useUserStore()
      store.userInfo = { username: 'testuser' }
      expect(store.username).toBe('testuser')
    })

    it('should return nickname from userInfo', () => {
      const store = useUserStore()
      store.userInfo = { nickname: 'Test User' }
      expect(store.nickname).toBe('Test User')
    })

    it('should return userRole from userInfo', () => {
      const store = useUserStore()
      store.userInfo = { role: 'admin' }
      expect(store.userRole).toBe('admin')
    })

    it('should return default role as user', () => {
      const store = useUserStore()
      expect(store.userRole).toBe('user')
    })

    it('should detect admin role', () => {
      const store = useUserStore()
      store.userInfo = { role: 'admin' }
      expect(store.isAdmin).toBe(true)
    })

    it('should detect vip role for admin', () => {
      const store = useUserStore()
      store.userInfo = { role: 'admin' }
      expect(store.isVip).toBe(true)
    })

    it('should detect vip role for vip', () => {
      const store = useUserStore()
      store.userInfo = { role: 'vip' }
      expect(store.isVip).toBe(true)
    })
  })

  describe('clearAuth', () => {
    it('should clear all auth data', () => {
      const store = useUserStore()
      store.token = 'test-token'
      store.refreshToken = 'test-refresh'
      store.userInfo = { username: 'test' }
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('refreshToken', 'test-refresh')
      localStorage.setItem('userInfo', JSON.stringify({ username: 'test' }))

      store.clearAuth()

      expect(store.token).toBe('')
      expect(store.refreshToken).toBe('')
      expect(store.userInfo).toEqual({})
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('refreshToken')).toBeNull()
      expect(localStorage.getItem('userInfo')).toBeNull()
    })
  })

  describe('setAuthData', () => {
    it('should set auth data and persist to localStorage', () => {
      const store = useUserStore()
      const authData = {
        token: 'new-token',
        refreshToken: 'new-refresh',
        user: { id: 1, username: 'testuser', role: 'user' },
      }

      store.setAuthData(authData)

      expect(store.token).toBe('new-token')
      expect(store.refreshToken).toBe('new-refresh')
      expect(store.userInfo).toEqual(authData.user)
      expect(localStorage.getItem('token')).toBe('new-token')
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh')
      expect(JSON.parse(localStorage.getItem('userInfo'))).toEqual(authData.user)
    })
  })

  describe('isLoggedIn', () => {
    it('should be true when token exists', () => {
      const store = useUserStore()
      store.token = 'valid-token'
      expect(store.isLoggedIn).toBe(true)
    })

    it('should be false when token is empty', () => {
      const store = useUserStore()
      store.token = ''
      expect(store.isLoggedIn).toBe(false)
    })
  })
})
