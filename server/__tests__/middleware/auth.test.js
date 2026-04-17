import { jest, describe, it, expect } from '@jest/globals'
import jwt from 'jsonwebtoken'
import {
  generateTokens,
  addToBlacklist,
  isTokenBlacklisted,
  sanitizeInput,
} from '../../middleware/auth.js'

describe('Auth Middleware', () => {
  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const user = { id: 1, username: 'testuser', role: 'user' }
      const tokens = generateTokens(user)

      expect(tokens).toHaveProperty('accessToken')
      expect(tokens).toHaveProperty('refreshToken')
      expect(typeof tokens.accessToken).toBe('string')
      expect(typeof tokens.refreshToken).toBe('string')
    })

    it('should include userId and role in access token', () => {
      const user = { id: 1, username: 'testuser', role: 'admin' }
      const tokens = generateTokens(user)
      const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET)

      expect(decoded.userId).toBe(1)
      expect(decoded.username).toBe('testuser')
      expect(decoded.role).toBe('admin')
    })

    it('should include type=refresh in refresh token', () => {
      const user = { id: 1, username: 'testuser', role: 'user' }
      const tokens = generateTokens(user)
      const decoded = jwt.verify(tokens.refreshToken, process.env.JWT_REFRESH_SECRET)

      expect(decoded.type).toBe('refresh')
      expect(decoded.userId).toBe(1)
    })

    it('should default role to user if not provided', () => {
      const user = { id: 1, username: 'testuser' }
      const tokens = generateTokens(user)
      const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET)

      expect(decoded.role).toBe('user')
    })
  })

  describe('Token Blacklist', () => {
    it('should add token to blacklist', () => {
      const token = 'test-token-123'
      addToBlacklist(token, 3600000)

      expect(isTokenBlacklisted(token)).toBe(true)
    })

    it('should return false for non-blacklisted token', () => {
      expect(isTokenBlacklisted('non-existent-token')).toBe(false)
    })

    it('should expire blacklisted tokens', async () => {
      const token = 'expiring-token'
      addToBlacklist(token, 100)

      expect(isTokenBlacklisted(token)).toBe(true)

      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(isTokenBlacklisted(token)).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('should sanitize script tags', () => {
      const req = {
        body: { name: '<script>alert("xss")</script>test' },
        query: {},
        params: {},
      }
      const res = {}
      const next = jest.fn()

      sanitizeInput(req, res, next)

      expect(req.body.name).toBe('test')
      expect(next).toHaveBeenCalled()
    })

    it('should sanitize javascript: protocol', () => {
      const req = {
        body: { url: 'javascript:alert(1)' },
        query: {},
        params: {},
      }
      const res = {}
      const next = jest.fn()

      sanitizeInput(req, res, next)

      expect(req.body.url).toBe('')
      expect(next).toHaveBeenCalled()
    })

    it('should sanitize event handlers', () => {
      const req = {
        body: { html: '<div onclick="alert(1)">click</div>' },
        query: {},
        params: {},
      }
      const res = {}
      const next = jest.fn()

      sanitizeInput(req, res, next)

      expect(req.body.html).not.toContain('onclick')
      expect(next).toHaveBeenCalled()
    })

    it('should trim whitespace', () => {
      const req = {
        body: { name: '  hello world  ' },
        query: {},
        params: {},
      }
      const res = {}
      const next = jest.fn()

      sanitizeInput(req, res, next)

      expect(req.body.name).toBe('hello world')
      expect(next).toHaveBeenCalled()
    })

    it('should handle nested objects', () => {
      const req = {
        body: {
          user: { name: '<script>hack</script>alice', bio: '  test  ' },
          post: { title: '<b>bold</b>', content: 'javascript:evil' },
        },
        query: {},
        params: {},
      }
      const res = {}
      const next = jest.fn()

      sanitizeInput(req, res, next)

      expect(req.body.user.name).toBe('alice')
      expect(req.body.user.bio).toBe('test')
      expect(req.body.post.title).toBe('<b>bold</b>')
      expect(req.body.post.content).toBe('')
      expect(next).toHaveBeenCalled()
    })

    it('should handle null and undefined gracefully', () => {
      const req = {
        body: { name: null, email: undefined, age: 25 },
        query: {},
        params: {},
      }
      const res = {}
      const next = jest.fn()

      expect(() => sanitizeInput(req, res, next)).not.toThrow()
      expect(req.body.age).toBe(25)
      expect(next).toHaveBeenCalled()
    })
  })
})
