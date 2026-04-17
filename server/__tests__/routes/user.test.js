import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

jest.mock('../../database/connection.js', () => ({
  default: {
    query: jest.fn(),
    transaction: jest.fn(),
    getConnection: jest.fn(),
    healthCheck: jest.fn(),
    close: jest.fn(),
  },
  db: {
    query: jest.fn(),
  },
}))

jest.mock('../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

import connectionDb from '../../database/connection.js'
import userRouter from '../../routes/user.js'

const db = connectionDb

const app = express()
app.use(express.json())
app.use('/user', userRouter)

app.use((err, req, res, _next) => {
  res.status(err.statusCode || 500).json({
    code: err.statusCode || 500,
    message: err.message,
  })
})

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_testing'
process.env.JWT_SECRET = JWT_SECRET
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret'
process.env.JWT_EXPIRES_IN = '1h'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'

function generateTestToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '1h' },
  )
}

const mockUser = {
  id: 1,
  username: 'testuser',
  nickname: 'Test User',
  email: 'test@example.com',
  avatar: null,
  role: 'user',
  ai_count: 10,
  status: 'active',
}

describe('User Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /user/register', () => {
    it('should register a new user successfully', async () => {
      db.query.mockResolvedValueOnce([]).mockResolvedValueOnce({ insertId: 1 })

      const response = await request(app).post('/user/register').send({
        username: 'newuser',
        nickname: 'New User',
        email: 'newuser@test.com',
        password: 'password123',
      })

      expect(response.status).toBe(200)
      expect(response.body.code).toBe(200)
      expect(response.body.data.user).toBeDefined()
    })

    it('should reject registration with duplicate username', async () => {
      db.query.mockResolvedValueOnce([{ id: 1 }])

      const response = await request(app).post('/user/register').send({
        username: 'existinguser',
        nickname: 'Existing',
        email: 'existing@test.com',
        password: 'password123',
      })

      expect(response.status).toBe(400)
    })

    it('should reject registration with missing fields', async () => {
      const response = await request(app).post('/user/register').send({})

      expect(response.status).toBe(400)
    })

    it('should reject registration with invalid email', async () => {
      db.query.mockResolvedValueOnce([])

      const response = await request(app).post('/user/register').send({
        username: 'testemail',
        nickname: 'Test',
        email: 'invalid-email',
        password: 'password123',
      })

      expect(response.status).toBe(400)
    })

    it('should reject registration with short password', async () => {
      db.query.mockResolvedValueOnce([])

      const response = await request(app).post('/user/register').send({
        username: 'shortpwd',
        nickname: 'Short',
        email: 'short@test.com',
        password: '123',
      })

      expect(response.status).toBe(400)
    })

    it('should handle database connection error', async () => {
      const dbError = new Error("Table 'users' doesn't exist")
      db.query.mockRejectedValueOnce(dbError)

      const response = await request(app).post('/user/register').send({
        username: 'dberror',
        nickname: 'DB Error',
        email: 'dberror@test.com',
        password: 'password123',
      })

      expect([400, 500]).toContain(response.status)
    })
  })

  describe('POST /user/login', () => {
    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12)
      db.query
        .mockResolvedValueOnce([
          {
            ...mockUser,
            password: hashedPassword,
          },
        ])
        .mockResolvedValueOnce([{ ai_count: 10 }])
        .mockResolvedValueOnce([{ role: 'user' }])

      const response = await request(app).post('/user/login').send({
        username: 'testuser',
        password: 'correctpassword',
      })

      expect(response.status).toBe(200)
      expect(response.body.data.token).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    it('should reject login with non-existent username', async () => {
      db.query.mockResolvedValueOnce([])

      const response = await request(app).post('/user/login').send({
        username: 'nonexistent',
        password: 'password123',
      })

      expect(response.status).toBe(401)
    })

    it('should reject login with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12)
      db.query.mockResolvedValueOnce([
        {
          ...mockUser,
          password: hashedPassword,
        },
      ])

      const response = await request(app).post('/user/login').send({
        username: 'testuser',
        password: 'wrongpassword',
      })

      expect(response.status).toBe(401)
    })

    it('should reject login with missing fields', async () => {
      const response = await request(app).post('/user/login').send({})

      expect(response.status).toBe(400)
    })
  })

  describe('GET /user/info', () => {
    it('should return user info with valid token', async () => {
      db.query.mockResolvedValueOnce([mockUser])

      const token = generateTestToken(mockUser)

      const response = await request(app).get('/user/info').set('Authorization', `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body.data.username).toBe('testuser')
    })

    it('should reject request without token', async () => {
      const response = await request(app).get('/user/info')

      expect(response.status).toBe(401)
    })

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/user/info')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /user/refresh-token', () => {
    it('should refresh token successfully', async () => {
      db.query.mockResolvedValueOnce([mockUser]).mockResolvedValueOnce([{ role: 'user' }])

      const refreshToken = jwt.sign(
        { userId: 1, username: 'testuser', role: 'user', type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' },
      )

      const response = await request(app).post('/user/refresh-token').send({
        refreshToken,
      })

      expect(response.status).toBe(200)
      expect(response.body.data.token).toBeDefined()
    })

    it('should reject refresh without token', async () => {
      const response = await request(app).post('/user/refresh-token').send({})

      expect(response.status).toBe(400)
    })

    it('should reject invalid refresh token', async () => {
      const response = await request(app).post('/user/refresh-token').send({
        refreshToken: 'invalid-refresh-token',
      })

      expect(response.status).toBe(401)
    })

    it('should reject access token used as refresh token', async () => {
      const accessToken = generateTestToken(mockUser)

      const response = await request(app).post('/user/refresh-token').send({
        refreshToken: accessToken,
      })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /user/update', () => {
    it('should update user info with valid token', async () => {
      db.query.mockResolvedValueOnce([mockUser]).mockResolvedValueOnce([])

      const token = generateTestToken(mockUser)

      const response = await request(app)
        .post('/user/update')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nickname: 'Updated Name',
          email: 'updated@test.com',
        })

      expect(response.status).toBe(200)
    })

    it('should reject update without authentication', async () => {
      const response = await request(app).post('/user/update').send({
        nickname: 'Hacker',
      })

      expect(response.status).toBe(401)
    })

    it('should handle duplicate email error', async () => {
      const dbError = new Error('Duplicate entry')
      dbError.code = 'ER_DUP_ENTRY'

      db.query.mockResolvedValueOnce([mockUser]).mockRejectedValueOnce(dbError)

      const token = generateTestToken(mockUser)

      const response = await request(app)
        .post('/user/update')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'duplicate@test.com',
        })

      expect(response.status).toBe(400)
    })
  })
})
