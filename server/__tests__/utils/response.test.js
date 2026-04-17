import { successResponse, errorResponse, paginatedResponse } from '../../utils/response.js'

describe('Response Utilities', () => {
  let res

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
  })

  describe('successResponse', () => {
    it('should return success response with default values', () => {
      successResponse(res, { id: 1 })

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 200,
          message: '操作成功',
          data: { id: 1 },
        }),
      )
    })

    it('should return success response with custom message', () => {
      successResponse(res, null, '创建成功', 201)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 201,
          message: '创建成功',
          data: null,
        }),
      )
    })

    it('should include timestamp in response', () => {
      successResponse(res, null)

      const call = res.json.mock.calls[0][0]
      expect(call).toHaveProperty('timestamp')
      expect(new Date(call.timestamp).toISOString()).toBe(call.timestamp)
    })
  })

  describe('errorResponse', () => {
    it('should return error response with default values', () => {
      errorResponse(res, '服务器错误')

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 500,
          message: '服务器错误',
          errors: null,
        }),
      )
    })

    it('should return error response with custom code', () => {
      errorResponse(res, '未授权', 401)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 401,
          message: '未授权',
        }),
      )
    })

    it('should include errors array when provided', () => {
      const errors = [{ field: 'email', message: '邮箱格式不正确' }]
      errorResponse(res, '验证失败', 400, errors)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 400,
          errors,
        }),
      )
    })
  })

  describe('paginatedResponse', () => {
    it('should return paginated response with correct structure', () => {
      const items = [{ id: 1 }, { id: 2 }]
      paginatedResponse(res, items, 10, 1, 2)

      const call = res.json.mock.calls[0][0]
      expect(call.code).toBe(200)
      expect(call.data.items).toEqual(items)
      expect(call.data.pagination).toEqual({
        total: 10,
        page: 1,
        limit: 2,
        totalPages: 5,
      })
    })

    it('should calculate total pages correctly', () => {
      paginatedResponse(res, [], 11, 1, 5)

      const call = res.json.mock.calls[0][0]
      expect(call.data.pagination.totalPages).toBe(3)
    })
  })
})
