import validate, { schemas } from '../../middleware/validator.js'

describe('Validator Middleware', () => {
  let res
  let next

  beforeEach(() => {
    res = {}
    next = jest.fn()
  })

  describe('register schema', () => {
    it('should pass valid registration data', () => {
      const req = {
        body: {
          username: 'testuser',
          password: 'password123',
          nickname: 'Test User',
          email: 'test@example.com',
        },
      }

      validate(schemas.register)(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body.username).toBe('testuser')
    })

    it('should reject short username', () => {
      const req = {
        body: {
          username: 'ab',
          password: 'password123',
          nickname: 'Test',
          email: 'test@example.com',
        },
      }

      validate(schemas.register)(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should reject invalid email', () => {
      const req = {
        body: {
          username: 'testuser',
          password: 'password123',
          nickname: 'Test',
          email: 'invalid-email',
        },
      }

      validate(schemas.register)(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should reject password without numbers', () => {
      const req = {
        body: {
          username: 'testuser',
          password: 'onlyletters',
          nickname: 'Test',
          email: 'test@example.com',
        },
      }

      validate(schemas.register)(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should strip unknown fields', () => {
      const req = {
        body: {
          username: 'testuser',
          password: 'password123',
          nickname: 'Test',
          email: 'test@example.com',
          unknownField: 'should be removed',
        },
      }

      validate(schemas.register)(req, res, next)

      expect(req.body).not.toHaveProperty('unknownField')
    })
  })

  describe('login schema', () => {
    it('should pass valid login data', () => {
      const req = {
        body: {
          username: 'testuser',
          password: 'password123',
        },
      }

      validate(schemas.login)(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should reject missing username', () => {
      const req = {
        body: {
          password: 'password123',
        },
      }

      validate(schemas.login)(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('aiGenerate schema', () => {
    it('should pass valid AI generation data', () => {
      const req = {
        body: {
          type: 'article',
          prompt: 'Write an article about technology and innovation in the modern era',
          style: 'professional',
          length: 'medium',
        },
      }

      validate(schemas.aiGenerate)(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should reject invalid type', () => {
      const req = {
        body: {
          type: 'invalid_type',
          prompt: 'A prompt that is long enough to pass validation requirements',
        },
      }

      validate(schemas.aiGenerate)(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should reject short prompt', () => {
      const req = {
        body: {
          type: 'article',
          prompt: 'short',
        },
      }

      validate(schemas.aiGenerate)(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('pagination schema', () => {
    it('should apply default pagination values', () => {
      const req = { body: {} }

      validate(schemas.pagination)(req, res, next)

      expect(req.body.page).toBe(1)
      expect(req.body.limit).toBe(10)
    })

    it('should reject invalid page number', () => {
      const req = { body: { page: -1, limit: 10 } }

      validate(schemas.pagination)(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should reject limit exceeding maximum', () => {
      const req = { body: { page: 1, limit: 200 } }

      validate(schemas.pagination)(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
