import { jest, describe, it, expect, beforeEach } from '@jest/globals'

jest.mock('mysql2/promise', () => {
  const mockQuery = jest.fn()
  const mockGetConnection = jest.fn()
  const mockEnd = jest.fn()

  const mockPool = {
    query: mockQuery,
    getConnection: mockGetConnection,
    end: mockEnd,
    pool: {
      _allConnections: [],
    },
  }

  return {
    createPool: jest.fn().mockReturnValue(mockPool),
  }
})

jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Database Connection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('db module', () => {
    it('should export db object with required methods', async () => {
      const { db } = await import('../../database/connection.js')

      expect(db).toBeDefined()
      expect(typeof db.query).toBe('function')
      expect(typeof db.transaction).toBe('function')
      expect(typeof db.healthCheck).toBe('function')
      expect(typeof db.close).toBe('function')
      expect(typeof db.getTroubleshootingTip).toBe('function')
    })

    it('should have getTroubleshootingTip method', async () => {
      const { db } = await import('../../database/connection.js')

      const tip = db.getTroubleshootingTip({ code: 'ECONNREFUSED' })
      expect(typeof tip).toBe('string')
      expect(tip.length).toBeGreaterThan(0)
    })

    it('should return default tip for unknown error code', async () => {
      const { db } = await import('../../database/connection.js')

      const tip = db.getTroubleshootingTip({ code: 'UNKNOWN_ERROR' })
      expect(typeof tip).toBe('string')
      expect(tip).toContain('检查')
    })
  })
})
