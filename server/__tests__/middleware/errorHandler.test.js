import { AppError, errorHandler } from '../../middleware/errorHandler.js'

describe('Error Handler Middleware', () => {
  let req
  let res
  let next

  beforeEach(() => {
    req = {
      originalUrl: '/api/test',
      method: 'GET',
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    next = jest.fn()
  })

  describe('AppError', () => {
    it('should create operational error with status code', () => {
      const error = new AppError('Test error', 400)

      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(true)
    })

    it('should include errors array when provided', () => {
      const errors = [{ field: 'name', message: 'Required' }]
      const error = new AppError('Validation error', 400, errors)

      expect(error.errors).toEqual(errors)
    })
  })

  describe('errorHandler', () => {
    it('should handle ValidationError with 400 status', () => {
      const error = new Error('Validation failed')
      error.name = 'ValidationError'
      error.details = [{ path: ['email'], message: 'Invalid email', context: { value: 'bad' } }]

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 400,
          message: '数据验证失败',
        }),
      )
    })

    it('should handle UnauthorizedError with 401 status', () => {
      const error = new Error('Unauthorized')
      error.name = 'UnauthorizedError'

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
    })

    it('should handle file size limit error with 413 status', () => {
      const error = new Error('File too large')
      error.code = 'LIMIT_FILE_SIZE'

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(413)
    })

    it('should handle AppError with custom status code', () => {
      const error = new AppError('Custom error', 422)

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(422)
    })

    it('should handle unknown errors with 500 status', () => {
      const error = new Error('Something went wrong')

      errorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
    })

    it('should include timestamp in error response', () => {
      const error = new Error('Test')

      errorHandler(error, req, res, next)

      const call = res.json.mock.calls[0][0]
      expect(call).toHaveProperty('timestamp')
    })
  })
})
