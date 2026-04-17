import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'

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

jest.mock('../../services/aiService.js', () => ({
  default: {
    generateMockStream: jest.fn(),
    generateStream: jest.fn(),
    generateImage: jest.fn(),
    generateMockImage: jest.fn(),
    editImage: jest.fn(),
    generateVariation: jest.fn(),
    providers: {
      glm: {
        name: '智谱',
        createClient: jest.fn(),
        model: 'glm-4-flash',
        maxTokens: 2000,
      },
      deepseek: {
        name: 'DeepSeek',
        createClient: jest.fn(),
        model: 'deepseek-chat',
        maxTokens: 2000,
      },
      doubao: {
        name: '字节豆包',
        createClient: jest.fn(),
        model: 'doubao-lite-32k',
        maxTokens: 2000,
      },
      qwen: {
        name: '通义千问',
        createClient: jest.fn(),
        model: 'qwen-plus',
        maxTokens: 2000,
      },
    },
  },
}))

import db from '../../database/connection.js'
import aiRouter from '../../routes/ai.js'
import aiService from '../../services/aiService.js'

const mockedAIService = jest.mocked(aiService)

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret_key_for_testing')
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        nickname: 'Test User',
        email: 'test@example.com',
        avatar: '',
        role: decoded.role || 'user',
        ai_count: 100,
        status: 1,
      }
      req.token = token
      next()
    } catch {
      return res.status(401).json({ code: 401, message: 'Token无效' })
    }
  } else {
    req.user = null
    next()
  }
})

app.use('/ai', aiRouter)

app.use((err, req, res, _next) => {
  res.status(err.statusCode || 500).json({
    code: err.statusCode || 500,
    message: err.message,
  })
})

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_testing'
process.env.JWT_SECRET = JWT_SECRET
process.env.AI_PRIMARY_PROVIDER = 'mock'

function generateTestToken(user = { id: 1, username: 'testuser', role: 'user' }) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '1h',
  })
}

describe('AI Routes Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /ai/image-templates', () => {
    it('should return image templates without authentication', async () => {
      const response = await request(app).get('/ai/image-templates')

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveProperty('types')
      expect(response.body.data.types).toBeInstanceOf(Array)
      expect(response.body.data.types.length).toBeGreaterThan(0)
    })

    it('should include avatar template', async () => {
      const response = await request(app).get('/ai/image-templates')

      const avatarTemplate = response.body.data.types.find((t) => t.value === 'avatar')
      expect(avatarTemplate).toBeDefined()
      expect(avatarTemplate.label).toBe('头像生成')
    })

    it('should include landscape template', async () => {
      const response = await request(app).get('/ai/image-templates')

      const landscapeTemplate = response.body.data.types.find((t) => t.value === 'landscape')
      expect(landscapeTemplate).toBeDefined()
      expect(landscapeTemplate.label).toBe('风景壁纸')
    })

    it('should include suggested prompts in templates', async () => {
      const response = await request(app).get('/ai/image-templates')

      response.body.data.types.forEach((template) => {
        expect(template).toHaveProperty('suggestedPrompts')
        expect(template.suggestedPrompts).toBeInstanceOf(Array)
      })
    })
  })

  describe('POST /ai/generate', () => {
    const token = generateTestToken()

    it('should reject request without authentication', async () => {
      const response = await request(app).post('/ai/generate').send({
        type: 'article',
        prompt: 'Write an article about technology and innovation in the modern era',
      })

      expect(response.status).toBe(401)
    })

    it('should reject request with invalid type', async () => {
      const response = await request(app)
        .post('/ai/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'invalid_type',
          prompt: 'A prompt that is long enough to pass validation requirements',
        })

      expect(response.status).toBe(500)
    })

    it('should reject request with short prompt', async () => {
      const response = await request(app)
        .post('/ai/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'article',
          prompt: 'short',
        })

      expect(response.status).toBe(500)
    })
  })

  describe('POST /ai/image-generate', () => {
    const token = generateTestToken()

    it('should reject request without authentication', async () => {
      const response = await request(app).post('/ai/image-generate').send({
        prompt: 'A beautiful sunset over the ocean',
      })

      expect(response.status).toBe(401)
    })

    it('should reject request with empty prompt', async () => {
      const response = await request(app)
        .post('/ai/image-generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          prompt: '   ',
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('请输入图片描述')
    })

    it('should reject request with missing prompt', async () => {
      const response = await request(app)
        .post('/ai/image-generate')
        .set('Authorization', `Bearer ${token}`)
        .send({})

      expect([400, 500]).toContain(response.status)
    })

    it('should generate mock image successfully', async () => {
      const mockImageResult = {
        imageData: 'base64data',
        revisedPrompt: 'test prompt enhanced',
        size: '1024x1024',
        provider: 'mock',
        model: 'mock-image-v1',
        generationTimeMs: 50,
        isMock: true,
      }

      mockedAIService.generateImage.mockResolvedValueOnce(mockImageResult)
      db.query.mockResolvedValueOnce({ insertId: 1 })

      const response = await request(app)
        .post('/ai/image-generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          prompt: 'A beautiful sunset over the ocean',
          type: 'landscape',
          size: '1024x1024',
        })

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveProperty('imageData')
      expect(response.body.data).toHaveProperty('size')
    })

    it('should handle AI service errors gracefully', async () => {
      mockedAIService.generateImage.mockRejectedValueOnce(new Error('AI service unavailable'))

      const response = await request(app)
        .post('/ai/image-generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          prompt: 'A beautiful sunset over the ocean',
        })

      expect(response.status).toBe(500)
    })
  })

  describe('POST /ai/image-edit', () => {
    const token = generateTestToken()

    it('should reject request without original image', async () => {
      const response = await request(app)
        .post('/ai/image-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          prompt: 'Change the background to blue',
          editType: 'inpainting',
        })

      expect([400, 500]).toContain(response.status)
    })

    it('should reject invalid edit type', async () => {
      const response = await request(app)
        .post('/ai/image-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalImage: 'base64data',
          prompt: 'Change the background',
          editType: 'invalid_type',
        })

      expect([400, 500]).toContain(response.status)
    })

    it('should reject inpainting without mask image', async () => {
      const response = await request(app)
        .post('/ai/image-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalImage: 'base64data',
          prompt: 'Redraw this area',
          editType: 'inpainting',
        })

      expect([400, 500]).toContain(response.status)
    })

    it('should perform image edit successfully', async () => {
      const mockEditResult = {
        imageData: 'editedbase64data',
        revisedPrompt: 'edited prompt',
        size: '1024x1024',
        provider: 'mock',
        model: 'mock-image-v1',
        generationTimeMs: 100,
        editType: 'style_transfer',
      }

      mockedAIService.editImage.mockResolvedValueOnce(mockEditResult)

      const response = await request(app)
        .post('/ai/image-edit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalImage: 'base64data',
          prompt: 'Transform to oil painting style',
          editType: 'style_transfer',
        })

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveProperty('imageData')
    })
  })

  describe('POST /ai/image-variation', () => {
    const token = generateTestToken()

    it('should reject request without original image', async () => {
      const response = await request(app)
        .post('/ai/image-variation')
        .set('Authorization', `Bearer ${token}`)
        .send({})

      expect([400, 429]).toContain(response.status)
    })

    it('should generate variation successfully', async () => {
      const mockVariationResult = {
        imageData: 'variationbase64data',
        size: '1024x1024',
        provider: 'mock',
        model: 'mock-image-v1',
        generationTimeMs: 80,
        isVariation: true,
      }

      mockedAIService.generateVariation.mockResolvedValueOnce(mockVariationResult)

      const response = await request(app)
        .post('/ai/image-variation')
        .set('Authorization', `Bearer ${token}`)
        .send({
          originalImage: 'base64data',
          size: '1024x1024',
        })

      expect(response.status).toBe(200)
      expect(response.body.data).toHaveProperty('imageData')
      expect(response.body.data.isVariation).toBe(true)
    })
  })

  describe('POST /ai/code-generate', () => {
    const token = generateTestToken()

    it('should reject request without authentication', async () => {
      const response = await request(app).post('/ai/code-generate').send({
        prompt: 'Create a landing page',
      })

      expect(response.status).toBe(401)
    })

    it('should reject request with empty prompt', async () => {
      const response = await request(app)
        .post('/ai/code-generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          prompt: '   ',
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toContain('请输入代码描述需求')
    })

    it('should reject request without prompt', async () => {
      const response = await request(app)
        .post('/ai/code-generate')
        .set('Authorization', `Bearer ${token}`)
        .send({})

      expect(response.status).toBe(400)
    })
  })
})
