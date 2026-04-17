import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import aiService from '../../services/aiService.js'

describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getSystemPrompt', () => {
    it('should return article prompt for article type', () => {
      const prompt = aiService.getSystemPrompt('article')
      expect(prompt).toContain('内容创作专家')
      expect(prompt).toContain('文章')
    })

    it('should return marketing prompt for marketing type', () => {
      const prompt = aiService.getSystemPrompt('marketing')
      expect(prompt).toContain('营销文案')
    })

    it('should return social prompt for social type', () => {
      const prompt = aiService.getSystemPrompt('social')
      expect(prompt).toContain('社交媒体')
    })

    it('should return summary prompt for summary type', () => {
      const prompt = aiService.getSystemPrompt('summary')
      expect(prompt).toContain('信息整理')
    })

    it('should return business prompt for business type', () => {
      const prompt = aiService.getSystemPrompt('business')
      expect(prompt).toContain('商务')
    })

    it('should return creative prompt for creative type', () => {
      const prompt = aiService.getSystemPrompt('creative')
      expect(prompt).toContain('创意写作')
    })

    it('should default to article prompt for unknown type', () => {
      const prompt = aiService.getSystemPrompt('unknown_type')
      expect(prompt).toContain('内容创作专家')
    })
  })

  describe('buildSystemPrompt', () => {
    it('should append professional style to base prompt', () => {
      const prompt = aiService.buildSystemPrompt('article', 'professional')
      expect(prompt).toContain('专业正式')
    })

    it('should append casual style to base prompt', () => {
      const prompt = aiService.buildSystemPrompt('article', 'casual')
      expect(prompt).toContain('轻松活泼')
    })

    it('should append academic style to base prompt', () => {
      const prompt = aiService.buildSystemPrompt('article', 'academic')
      expect(prompt).toContain('学术严谨')
    })

    it('should append creative style to base prompt', () => {
      const prompt = aiService.buildSystemPrompt('article', 'creative')
      expect(prompt).toContain('富有想象力')
    })

    it('should default to professional style for unknown style', () => {
      const prompt = aiService.buildSystemPrompt('article', 'unknown')
      expect(prompt).toContain('专业正式')
    })
  })

  describe('calculateMaxTokens', () => {
    it('should calculate short length tokens', () => {
      const tokens = aiService.calculateMaxTokens('short', 500)
      expect(tokens).toBe(250)
    })

    it('should calculate medium length tokens', () => {
      const tokens = aiService.calculateMaxTokens('medium', 500)
      expect(tokens).toBe(500)
    })

    it('should calculate long length tokens', () => {
      const tokens = aiService.calculateMaxTokens('long', 500)
      expect(tokens).toBe(1000)
    })

    it('should default to medium for unknown length', () => {
      const tokens = aiService.calculateMaxTokens('unknown', 500)
      expect(tokens).toBe(500)
    })

    it('should floor the result', () => {
      const tokens = aiService.calculateMaxTokens('short', 333)
      expect(tokens).toBe(166)
    })
  })

  describe('Circuit Breaker', () => {
    it('should initialize circuit breakers for all providers', () => {
      expect(aiService.circuitBreakers).toHaveProperty('deepseek')
      expect(aiService.circuitBreakers).toHaveProperty('doubao')
      expect(aiService.circuitBreakers).toHaveProperty('qwen')
      expect(aiService.circuitBreakers).toHaveProperty('glm')

      Object.values(aiService.circuitBreakers).forEach((cb) => {
        expect(cb.state).toBe('closed')
        expect(cb.failures).toBe(0)
        expect(cb.threshold).toBe(3)
      })
    })

    it('should record success and reset failures', () => {
      aiService.circuitBreakers.deepseek.failures = 2
      aiService.circuitBreakers.deepseek.state = 'half-open'

      aiService.recordSuccess('deepseek')

      expect(aiService.circuitBreakers.deepseek.failures).toBe(0)
      expect(aiService.circuitBreakers.deepseek.state).toBe('closed')
    })

    it('should record failure and increment count', () => {
      aiService.recordFailure('deepseek')

      expect(aiService.circuitBreakers.deepseek.failures).toBe(1)
      expect(aiService.circuitBreakers.deepseek.lastFailureTime).toBeTruthy()
      expect(aiService.circuitBreakers.deepseek.state).toBe('closed')
    })

    it('should open circuit breaker after threshold failures', () => {
      aiService.circuitBreakers.deepseek.failures = 0
      aiService.circuitBreakers.deepseek.state = 'closed'

      aiService.recordFailure('deepseek')
      aiService.recordFailure('deepseek')
      aiService.recordFailure('deepseek')

      expect(aiService.circuitBreakers.deepseek.failures).toBe(3)
      expect(aiService.circuitBreakers.deepseek.state).toBe('open')
    })

    it('should fallback when current provider is not the fallback', () => {
      aiService.primaryProvider = 'deepseek'
      aiService.fallbackProvider = 'qwen'

      expect(aiService.shouldFallback('deepseek')).toBe(true)
    })

    it('should not fallback when current provider is the fallback', () => {
      aiService.primaryProvider = 'deepseek'
      aiService.fallbackProvider = 'qwen'

      expect(aiService.shouldFallback('qwen')).toBe(false)
    })

    it('should not fallback when fallback is open', () => {
      aiService.primaryProvider = 'deepseek'
      aiService.fallbackProvider = 'qwen'
      aiService.circuitBreakers.qwen.state = 'open'

      expect(aiService.shouldFallback('deepseek')).toBe(false)
    })

    it('should return null when all providers are open', () => {
      aiService.primaryProvider = 'deepseek'
      aiService.fallbackProvider = 'qwen'
      aiService.circuitBreakers.deepseek.state = 'open'
      aiService.circuitBreakers.qwen.state = 'open'

      const provider = aiService.getAvailableProvider()
      expect(provider).toBeNull()
    })

    it('should return mock provider when configured', () => {
      const originalValue = process.env.AI_PRIMARY_PROVIDER
      process.env.AI_PRIMARY_PROVIDER = 'mock'

      const provider = aiService.getAvailableProvider()
      expect(provider).toBe('mock')

      process.env.AI_PRIMARY_PROVIDER = originalValue
    })
  })

  describe('generateMockContent', () => {
    it('should generate article mock content', () => {
      const content = aiService.generateMockContent('article', '测试主题')
      expect(content).toContain('深度分析')
    })

    it('should generate marketing mock content', () => {
      const content = aiService.generateMockContent('marketing', '测试产品')
      expect(content).toContain('推荐')
    })

    it('should generate social mock content', () => {
      const content = aiService.generateMockContent('social', '测试话题')
      expect(content).toContain('分享')
    })

    it('should generate summary mock content', () => {
      const content = aiService.generateMockContent('summary', '测试内容')
      expect(content).toContain('摘要')
    })

    it('should default to article for unknown type', () => {
      const content = aiService.generateMockContent('unknown', '测试')
      expect(content).toContain('深度分析')
    })

    it('should include prompt text in generated content', () => {
      const content = aiService.generateMockContent('article', '人工智能技术')
      expect(content).toContain('人工智能技术')
    })
  })

  describe('resolveImageSize', () => {
    it('should return requested size when supported', () => {
      const size = aiService.resolveImageSize('general', '1024x1024', [
        '1024x1024',
        '1792x1024',
        '1024x1792',
      ])
      expect(size).toBe('1024x1024')
    })

    it('should fallback to first allowed size when requested not supported', () => {
      const size = aiService.resolveImageSize('avatar', '1792x1024', ['1024x1024', '1792x1024'])
      expect(size).toBe('1024x1024')
    })

    it('should return last supported size as ultimate fallback', () => {
      const size = aiService.resolveImageSize('icon', '1024x1024', ['256x256'])
      expect(size).toBe('256x256')
    })

    it('should return last supported size when no allowed sizes match', () => {
      const size = aiService.resolveImageSize('icon', '1024x1024', ['512x512'])
      expect(size).toBe('512x512')
    })

    it('should handle avatar type with correct sizes', () => {
      const size = aiService.resolveImageSize('avatar', '512x512', ['1024x1024'])
      expect(size).toBe('1024x1024')
    })

    it('should handle landscape type with correct sizes', () => {
      const size = aiService.resolveImageSize('landscape', '1792x1024', [
        '1024x1024',
        '1792x1024',
        '1024x1792',
      ])
      expect(size).toBe('1792x1024')
    })
  })

  describe('buildImagePrompt', () => {
    it('should enhance avatar prompt', () => {
      const prompt = aiService.buildImagePrompt('a person', 'avatar')
      expect(prompt).toContain('Professional headshot')
      expect(prompt).toContain('a person')
    })

    it('should enhance landscape prompt', () => {
      const prompt = aiService.buildImagePrompt('mountains', 'landscape')
      expect(prompt).toContain('Horizontal scenic')
      expect(prompt).toContain('mountains')
    })

    it('should return raw prompt for general type', () => {
      const prompt = aiService.buildImagePrompt('a beautiful scene', 'general')
      expect(prompt).toBe('a beautiful scene')
    })

    it('should handle unknown type as general', () => {
      const prompt = aiService.buildImagePrompt('test prompt', 'unknown')
      expect(prompt).toBe('test prompt')
    })
  })

  describe('generateMockImage', () => {
    it('should return mock image data with correct structure', () => {
      const result = aiService.generateMockImage({
        prompt: 'test image',
        type: 'general',
        size: '1024x1024',
      })

      expect(result).toHaveProperty('imageData')
      expect(result).toHaveProperty('revisedPrompt')
      expect(result).toHaveProperty('size', '1024x1024')
      expect(result).toHaveProperty('provider', 'mock')
      expect(result).toHaveProperty('model', 'mock-image-v1')
      expect(result).toHaveProperty('isMock', true)
    })

    it('should return base64 encoded SVG', () => {
      const result = aiService.generateMockImage({
        prompt: 'test',
        type: 'general',
        size: '512x512',
      })

      expect(typeof result.imageData).toBe('string')
      expect(result.imageData.length).toBeGreaterThan(0)

      const decoded = Buffer.from(result.imageData, 'base64').toString()
      expect(decoded).toContain('<svg')
    })

    it('should handle different sizes', () => {
      const result = aiService.generateMockImage({
        prompt: 'test',
        type: 'general',
        size: '256x256',
      })

      expect(result.size).toBe('256x256')
    })

    it('should handle different types', () => {
      const avatarResult = aiService.generateMockImage({
        prompt: 'test',
        type: 'avatar',
        size: '1024x1024',
      })
      expect(avatarResult.revisedPrompt).toContain('Mock')
    })
  })

  describe('getMockColor', () => {
    it('should return colors for known types', () => {
      const colors = aiService.getMockColor('avatar')
      expect(Array.isArray(colors)).toBe(true)
      expect(colors.length).toBe(2)
    })

    it('should return default colors for unknown types', () => {
      const colors = aiService.getMockColor('unknown')
      expect(Array.isArray(colors)).toBe(true)
      expect(colors.length).toBe(2)
    })
  })

  describe('getAccentColor', () => {
    it('should return accent color for known types', () => {
      const color = aiService.getAccentColor('avatar')
      expect(typeof color).toBe('string')
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('should return default accent color for unknown types', () => {
      const color = aiService.getAccentColor('unknown')
      expect(typeof color).toBe('string')
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })

  describe('buildEditPrompt', () => {
    it('should build inpainting prompt', () => {
      const prompt = aiService.buildEditPrompt('redraw area', 'inpainting')
      expect(prompt).toContain('Redraw')
      expect(prompt).toContain('redraw area')
    })

    it('should build outpainting prompt', () => {
      const prompt = aiService.buildEditPrompt('extend scene', 'outpainting')
      expect(prompt).toContain('Extend')
      expect(prompt).toContain('extend scene')
    })

    it('should build style_transfer prompt', () => {
      const prompt = aiService.buildEditPrompt('oil painting', 'style_transfer')
      expect(prompt).toContain('Transform')
      expect(prompt).toContain('oil painting')
    })

    it('should return raw prompt for general type', () => {
      const prompt = aiService.buildEditPrompt('test edit', 'general')
      expect(prompt).toBe('test edit')
    })
  })

  describe('Providers Configuration', () => {
    it('should have deepseek provider configured', () => {
      expect(aiService.providers.deepseek).toBeDefined()
      expect(aiService.providers.deepseek.name).toBe('DeepSeek')
    })

    it('should have doubao provider configured', () => {
      expect(aiService.providers.doubao).toBeDefined()
      expect(aiService.providers.doubao.name).toBe('字节豆包')
    })

    it('should have qwen provider configured', () => {
      expect(aiService.providers.qwen).toBeDefined()
      expect(aiService.providers.qwen.name).toBe('通义千问')
    })

    it('should have glm provider configured', () => {
      expect(aiService.providers.glm).toBeDefined()
      expect(aiService.providers.glm.name).toBe('智谱')
    })

    it('should have image providers configured', () => {
      expect(aiService.imageProviders.dalle3).toBeDefined()
      expect(aiService.imageProviders.dall_e_2).toBeDefined()
      expect(aiService.imageProviders.glm).toBeDefined()
    })

    it('should have default primary and fallback providers', () => {
      expect(aiService.primaryProvider).toBeTruthy()
      expect(aiService.fallbackProvider).toBeTruthy()
    })
  })
})
