import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userApi } from '@/api/user'
import request from '@/utils/request'

vi.mock('@/utils/request', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('userApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should call POST /user/login with credentials', async () => {
      const mockResponse = {
        token: 'test-token',
        refreshToken: 'test-refresh',
        user: { id: 1, username: 'testuser' },
      }
      request.post.mockResolvedValue(mockResponse)

      const result = await userApi.login({ username: 'testuser', password: 'password123' })

      expect(request.post).toHaveBeenCalledWith('/user/login', {
        username: 'testuser',
        password: 'password123',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('register', () => {
    it('should call POST /user/register with user data', async () => {
      const userData = {
        username: 'newuser',
        password: 'password123',
        nickname: 'New User',
        email: 'new@example.com',
      }
      request.post.mockResolvedValue({})

      await userApi.register(userData)

      expect(request.post).toHaveBeenCalledWith('/user/register', userData)
    })
  })

  describe('logout', () => {
    it('should call POST /user/logout', async () => {
      request.post.mockResolvedValue(null)

      await userApi.logout()

      expect(request.post).toHaveBeenCalledWith('/user/logout')
    })
  })

  describe('getUserInfo', () => {
    it('should call GET /user/info', async () => {
      const mockUser = { id: 1, username: 'testuser' }
      request.get.mockResolvedValue(mockUser)

      const result = await userApi.getUserInfo()

      expect(request.get).toHaveBeenCalledWith('/user/info')
      expect(result).toEqual(mockUser)
    })
  })

  describe('refreshToken', () => {
    it('should call POST /user/refresh-token with refresh token', async () => {
      const mockResponse = { token: 'new-token', refreshToken: 'new-refresh' }
      request.post.mockResolvedValue(mockResponse)

      const result = await userApi.refreshToken('old-refresh-token')

      expect(request.post).toHaveBeenCalledWith('/user/refresh-token', {
        refreshToken: 'old-refresh-token',
      })
      expect(result).toEqual(mockResponse)
    })
  })
})
