import OpenAI from 'openai'
import { logger } from '../utils/logger.js'
import { AppError } from '../middleware/errorHandler.js'

class AIService {
  constructor() {
    this.providers = {
      deepseek: {
        name: 'DeepSeek',
        createClient: () =>
          new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseURL: process.env.DEEPSEEK_BASE_URL,
          }),
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        maxTokens: 2000,
      },
      doubao: {
        name: '字节豆包',
        createClient: () =>
          new OpenAI({
            apiKey: process.env.DOUBAO_API_KEY,
            baseURL: process.env.DOUBAO_BASE_URL,
          }),
        model: process.env.DOUBAO_MODEL || 'doubao-lite-32k',
        maxTokens: 2000,
      },
      qwen: {
        name: '通义千问',
        createClient: () =>
          new OpenAI({
            apiKey: process.env.QWEN_API_KEY,
            baseURL: process.env.QWEN_BASE_URL,
          }),
        model: process.env.QWEN_MODEL || 'qwen-plus',
        maxTokens: 2000,
      },
      glm: {
        name: '智谱',
        createClient: () =>
          new OpenAI({
            apiKey: process.env.GLM_API_KEY,
            baseURL: process.env.GLM_API_BASE_URL,
          }),
        model: process.env.GLM_API_MODEL || 'glm-4-flash',
        maxTokens: 2000,
      },
    }

    this.imageProviders = {
      dalle3: {
        name: 'DALL-E 3',
        createClient: () => {
          const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY
          const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
          return new OpenAI({ apiKey, baseURL })
        },
        model: 'dall-e-3',
        supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
        supportedQualities: ['standard', 'hd'],
      },
      dall_e_2: {
        name: 'DALL-E 2',
        createClient: () => {
          const apiKey = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY
          const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
          return new OpenAI({ apiKey, baseURL })
        },
        model: 'dall-e-2',
        supportedSizes: ['256x256', '512x512', '1024x1024'],
        supportedQualities: ['standard'],
      },
      glm: {
        name: 'GLM Image',
        createClient: () => {
          const apiKey = process.env.GLM_API_KEY
          const baseURL = process.env.GLM_API_BASE_URL
          return new OpenAI({ apiKey, baseURL })
        },
        model: process.env.GLM_IMAGE_MODEL || 'glm-image',
        supportedSizes: ['1024x1024', '512x512', '256x256'],
        supportedQualities: ['standard'],
        isUrlBased: true, // GLM返回图片URL，需要下载转base64
      },
    }

    this.circuitBreakers = {}
    this.primaryProvider = process.env.AI_PRIMARY_PROVIDER || 'deepseek' // 主提供者
    this.fallbackProvider = process.env.AI_FALLBACK_PROVIDER || 'qwen' // 回退提供者
    this.imageProvider = process.env.AI_IMAGE_PROVIDER || 'mock' // 图片提供者

    this.initializeCircuitBreakers()
  }

  initializeCircuitBreakers() {
    Object.keys(this.providers).forEach((provider) => {
      this.circuitBreakers[provider] = {
        failures: 0,
        lastFailureTime: null,
        state: 'closed',
        threshold: 3,
        resetTimeout: 60000,
      }
    })
  }

  getSystemPrompt(type) {
    const prompts = {
      article: `你是一位专业的内容创作专家。请根据用户的要求撰写高质量的文章。
要求：
1. 内容结构清晰，逻辑严谨
2. 语言流畅自然，符合中文表达习惯
3. 提供具体的数据和案例支撑
4. 字数控制在要求范围内`,

      marketing: `你是一位资深的营销文案策划师。请根据产品或服务的特点创作吸引人的营销文案。
要求：
1. 突出卖点和优势
2. 语言有感染力和说服力
3. 符合目标受众的阅读习惯
4. 包含明确的行动号召`,

      social: `你是一位社交媒体运营专家。请为指定的平台创作适合的内容。
要求：
1. 符合平台特性和用户习惯
2. 标题吸引人，内容有价值
3. 适当使用emoji和话题标签
4. 易于传播和互动`,

      summary: `你是一位信息整理专家。请对提供的内容进行精炼总结。
要求：
1. 提取核心要点
2. 保持原意不变
3. 结构化呈现
4. 控制在指定字数内`,

      business: `你是一位商务写作顾问。请撰写正式的商务文档。
要求：
1. 专业、正式的商务语气
2. 格式规范完整
3. 信息准确清晰
4. 符合商务沟通礼仪`,

      creative: `你是一位创意写作大师。请发挥想象力进行创意写作。
要求：
1. 创意新颖独特
2. 文笔优美生动
3. 情感真挚动人
4. 具有文学性和艺术性`,
    }

    return prompts[type] || prompts.article
  }

  async generateStream(
    { type, prompt, style = 'professional', length = 'medium', wordCount = 500, model = null },
    res,
  ) {
    let providerName = model && this.providers[model] ? model : this.getAvailableProvider()

    if (!providerName) {
      throw new AppError('所有AI服务暂时不可用', 503)
    }

    if (model && this.providers[model] && this.circuitBreakers[model]?.state === 'open') {
      providerName = this.getAvailableProvider()
      if (!providerName) {
        throw new AppError('所有AI服务暂时不可用', 503)
      }
    }

    try {
      const provider = this.providers[providerName]
      const client = provider.createClient()

      const systemPrompt = this.buildSystemPrompt(type, style)
      const maxTokens = this.calculateMaxTokens(length, wordCount)

      logger.info(`Starting AI stream generation via ${provider.name}`, {
        type,
        promptLength: prompt.length,
        style,
        maxTokens,
        requestedModel: model,
        actualProvider: providerName,
      })

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })

      res.write(
        `data: ${JSON.stringify({
          type: 'meta',
          provider: providerName,
          providerName: provider.name,
          model: provider.model,
          maxTokens,
        })}\n\n`,
      )

      const stream = await client.chat.completions.create({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        stream: true,
      })

      let fullContent = ''
      let tokenCount = 0

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || ''

        if (delta) {
          fullContent += delta
          tokenCount++

          const data = JSON.stringify({
            type: 'chunk',
            content: delta,
            timestamp: Date.now(),
            tokenCount,
          })

          res.write(`data: ${data}\n\n`)
        }

        if (chunk.usage) {
          const usage = chunk.usage
          if (usage.total_tokens) {
            tokenCount = usage.total_tokens
          }
        }
      }

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          tokenCount,
          contentLength: fullContent.length,
          provider: providerName,
        })}\n\n`,
      )
      res.end()

      this.recordSuccess(providerName)

      logger.info(`AI stream completed`, {
        provider: provider.name,
        totalTokens: tokenCount,
        contentLength: fullContent.length,
      })

      return {
        result: fullContent,
        tokenCount,
        provider: providerName,
      }
    } catch (error) {
      this.recordFailure(providerName)

      if (this.shouldFallback(providerName)) {
        logger.warn(`${providerName} failed, attempting fallback to ${this.fallbackProvider}`)
        return this.generateStream({ type, prompt, style, length, wordCount }, res)
      }

      throw error
    }
  }

  buildSystemPrompt(type, style) {
    let basePrompt = this.getSystemPrompt(type)

    const styleMap = {
      professional: '请使用专业正式的语言风格。',
      casual: '请使用轻松活泼、通俗易懂的语言风格。',
      academic: '请使用学术严谨、引用规范的写作风格。',
      creative: '请使用富有想象力和感染力的语言风格。',
    }

    basePrompt += '\n\n' + (styleMap[style] || styleMap.professional)

    return basePrompt
  }

  calculateMaxTokens(length, wordCount) {
    const lengthMultiplier = {
      short: 0.5,
      medium: 1,
      long: 2,
    }

    return Math.floor(wordCount * (lengthMultiplier[length] || 1))
  }

  getAvailableProvider() {
    if (process.env.AI_PRIMARY_PROVIDER === 'mock') {
      return 'mock'
    }

    const primaryCB = this.circuitBreakers[this.primaryProvider]

    if (
      primaryCB.state === 'closed' ||
      (primaryCB.state === 'half-open' &&
        Date.now() - primaryCB.lastFailureTime > primaryCB.resetTimeout)
    ) {
      return this.primaryProvider
    }

    const fallbackCB = this.circuitBreakers[this.fallbackProvider]
    if (fallbackCB.state === 'closed') {
      return this.fallbackProvider
    }

    return null
  }

  recordSuccess(providerName) {
    const cb = this.circuitBreakers[providerName]
    cb.failures = 0
    cb.state = 'closed'
  }

  recordFailure(providerName) {
    const cb = this.circuitBreakers[providerName]
    cb.failures++
    cb.lastFailureTime = Date.now()

    if (cb.failures >= cb.threshold) {
      cb.state = 'open'
      logger.error(`Circuit breaker OPEN for ${providerName} after ${cb.failures} failures`)
    }
  }

  shouldFallback(currentProvider) {
    return (
      currentProvider !== this.fallbackProvider &&
      this.circuitBreakers[this.fallbackProvider]?.state !== 'open'
    )
  }

  async generateMockStream({ type, prompt }, res) {
    logger.info('Using mock AI response for development')

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    const mockResponse = this.generateMockContent(type, prompt)
    const words = mockResponse.split(' ')

    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 50))

      const chunk = (i === 0 ? '' : ' ') + words[i]
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
    }

    res.write(`data: ${JSON.stringify({ type: 'done', tokenCount: words.length })}\n\n`)
    res.end()

    return { result: mockResponse, tokenCount: words.length, provider: 'mock' }
  }

  generateMockContent(type, prompt) {
    const templates = {
      article: `# 关于${prompt.substring(0, 20)}...的深度分析

## 引言

在当今数字化时代，${prompt.substring(0, 30)}已经成为各行各业关注的焦点。本文将从多个维度深入探讨这一主题的发展趋势与实际应用。

## 核心观点分析

### 1. 发展背景与现状

根据最新行业报告显示，相关领域正在经历前所未有的变革：

• **市场规模**：预计2025年将达到1900亿美元，年复合增长率超过25%
• **技术成熟度**：核心技术已从实验室走向商业化应用
• **用户接受度**：超过70%的企业表示愿意尝试相关解决方案

### 2. 关键成功因素

通过深入调研和实践验证，我们识别出以下几个关键要素：

1. **技术创新驱动**：持续的技术迭代是保持竞争力的基础
2. **用户体验优化**：以用户为中心的设计思维至关重要
3. **数据安全保障**：建立完善的隐私保护机制
4. **生态协同发展**：构建开放共赢的合作网络

### 3. 实际应用场景

在实际业务中，我们已经看到了许多成功的应用案例：

**案例一**：某大型企业通过引入新技术，将运营效率提升了40%，同时降低了30%的运营成本。

**案例二**：创业公司借助平台能力，在3个月内完成了从0到100万用户的增长。

## 未来展望

展望未来，我们有理由相信这一领域将继续保持高速发展态势。建议企业和个人：

✅ 持续关注技术动态，及时调整战略方向
✅ 加大研发投入，培养专业人才
✅ 建立合作伙伴关系，共同推动行业发展
✅ 注重用户体验，打造差异化竞争优势

## 结语

综上所述，${prompt.substring(0, 20)}不仅是一个技术概念，更是推动社会进步的重要力量。让我们携手共创美好未来！

---
*本文由AI智能生成，仅供参考*`,

      marketing: `🚀 【重磅推荐】让您的业务增长300%的秘密武器！

💡 还在为获客发愁？还在担心转化率低？

🎯 我们为您提供一站式解决方案：

✨ **核心优势**
• 智能：AI驱动的精准营销策略
• 高效：10倍提升内容产出效率
• 专业：资深团队保驾护航
• 数据：实时优化投放效果

📊 **真实数据说话**
→ 获客成本降低60%
→ 转化率提升3.5倍
→ 用户留存率提升45%
→ ROI提升280%

🔥 **限时优惠**
前100名客户享受：
▸ 免费诊断报告（价值¥5,000）
▸ 定制化营销方案（价值¥10,000）
▸ 专属客服一对一服务

⏰ 别犹豫！立即行动，抢占先机！

👉 点击这里，开启您的增长之旅！
📞 咨询热线：400-XXX-XXXX

#数字营销 #增长黑客 #AI赋能 #企业转型`,

      social: `🔥 今天分享一个超级实用的技巧！

很多人都在问我：如何高效完成工作？

经过反复实践，我总结了这套方法论：

1️⃣ **明确目标** - 用SMART原则设定可衡量的目标
2️⃣ **拆解任务** - 将大目标分解成小步骤
3️⃣ **专注执行** - 单线程处理，避免多任务切换
4️⃣ **定期复盘** - 每周回顾，持续优化

💡 小贴士：
• 使用番茄工作法，25分钟+5分钟休息
• 建立待办清单，完成后打勾超有成就感！
• 学会说"不"，保护自己的时间精力

实测效果：
✅ 工作效率提升200% ✅ 压力减少60% ✅ 成就感爆棚！

你们有什么高效工作的秘诀吗？评论区分享一下吧～

#高效工作 #时间管理 #职场干货 #自我提升 # productivity`,

      summary: `【核心摘要】

本文主要探讨了${prompt.substring(0, 25)}的相关议题。

**关键要点：**

1. **现状分析**：当前市场环境下，该领域呈现出快速发展的趋势，主要驱动力来自技术创新和用户需求升级。

2. **主要挑战**：包括技术门槛较高、人才短缺、标准化程度不足等问题亟待解决。

3. **解决方案**：提出了一套系统化的实施路径，涵盖技术选型、团队建设、流程优化等多个维度。

4. **预期成果**：按照方案实施后，预计可实现效率提升40%-60%，成本降低25%-35%。

**结论：** 综合来看，该方向具有良好的发展前景和应用价值，值得投入资源进行深入探索。

---
*以上内容由AI自动摘要生成*`,
    }

    return templates[type] || templates.article
  }
  // 图片生成
  async generateImage({
    prompt,
    type = 'general',
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
  }) {
    const startTime = Date.now()

    if (this.imageProvider === 'mock') {
      return this.generateMockImage({ prompt, type, size })
    }

    const providerConfig = this.imageProviders[this.imageProvider]
    if (!providerConfig) {
      throw new AppError(`不支持的图片生成服务: ${this.imageProvider}`, 400)
    }

    const resolvedSize = this.resolveImageSize(type, size, providerConfig.supportedSizes)
    const enhancedPrompt = this.buildImagePrompt(prompt, type)

    logger.info(`Starting image generation via ${providerConfig.name}`, {
      type,
      size: resolvedSize,
      quality,
      promptLength: enhancedPrompt.length,
    })

    try {
      const client = providerConfig.createClient()

      // 根据模型类型构建不同的请求参数
      const requestParams = {
        model: providerConfig.model,
        prompt: enhancedPrompt,
        n: 1,
        size: resolvedSize,
      }

      // 只对非URL基础的模型添加这些参数
      if (!providerConfig.isUrlBased) {
        requestParams.quality = providerConfig.supportedQualities.includes(quality)
          ? quality
          : 'standard'
        requestParams.style = style
        requestParams.response_format = 'b64_json'
      }

      const response = await client.images.generate(requestParams)

      let imageData, revisedPrompt

      if (response.data && response.data[0]) {
        if (providerConfig.isBase64Direct) {
          // GLM 等直接返回 base64 在 data.imageData 的模型
          imageData = response.data[0].imageData || response.data[0].b64_json || null
          revisedPrompt = response.data[0].revised_prompt || response.data[0].prompt || null
        } else if (providerConfig.isUrlBased) {
          // 返回 URL 的模型 - 下载图片并转换为 base64
          const imageUrl = response.data[0].url
          if (!imageUrl) {
            throw new AppError('GLM 图片生成失败：未返回图片URL', 500)
          }
          // 下载图片并转换为 base64
          try {
            const imageResponse = await fetch(imageUrl)
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image: ${imageResponse.status}`)
            }
            const imageBuffer = await imageResponse.arrayBuffer()
            imageData = Buffer.from(imageBuffer).toString('base64')
          } catch (fetchError) {
            logger.error('GLM image download failed:', fetchError.message)
            throw new AppError(`图片下载失败：${fetchError.message}`, 500)
          }
          revisedPrompt = response.data[0].revised_prompt || response.data[0].prompt || null
        } else {
          // DALL-E 等直接返回 base64 的模型
          imageData = response.data[0].b64_json || response.data[0].image || null
          revisedPrompt = response.data[0].revised_prompt || response.data[0].prompt || null
        }
        if (!imageData) {
          throw new AppError('图片生成失败：未返回图片数据', 500)
        }
      }

      if (!imageData) {
        throw new AppError('图片生成失败：未返回有效图片数据', 500)
      }

      const generationTimeMs = Date.now() - startTime

      logger.info(`Image generation completed via ${providerConfig.name}`, {
        size: resolvedSize,
        duration: `${generationTimeMs}ms`,
        imageSize: Math.round(Buffer.from(imageData).length / 1024) + 'KB',
      })

      return {
        imageData,
        revisedPrompt,
        size: resolvedSize,
        provider: providerConfig.name,
        model: providerConfig.model,
        generationTimeMs,
      }
    } catch (error) {
      logger.error(`Image generation failed via ${providerConfig.name}:`, error.message)

      if (error.status === 429) {
        throw new AppError('图片生成请求过于频繁，请稍后重试', 429)
      }
      if (error.status === 400 && error.message?.includes('content_policy')) {
        throw new AppError('生成内容不符合安全策略，请修改提示词后重试', 400)
      }
      if (error.code === 'insufficient_quota') {
        throw new AppError('AI图片配额不足，请联系管理员', 403)
      }

      throw new AppError(`图片生成失败: ${error.message}`, 500)
    }
  }

  resolveImageSize(requestType, requestedSize, supportedSizes) {
    const typeSizeMap = {
      avatar: ['1024x1024'],
      portrait: ['1024x1792'],
      landscape: ['1792x1024'],
      ad_horizontal: ['1792x1024'],
      ad_vertical: ['1024x1792'],
      ad_square: ['1024x1024'],
      design: ['1024x1024', '1792x1024', '1024x1792'],
      icon: ['256x256', '512x512'],
      general: ['1024x1024'],
    }

    const allowedSizes = typeSizeMap[requestType] || typeSizeMap.general

    if (allowedSizes.includes(requestedSize) && supportedSizes.includes(requestedSize)) {
      return requestedSize
    }

    for (const size of allowedSizes) {
      if (supportedSizes.includes(size)) return size
    }

    return supportedSizes[supportedSizes.length - 1] || '1024x1024'
  }

  buildImagePrompt(userPrompt, type) {
    const typePrompts = {
      avatar: `Professional headshot avatar portrait of ${userPrompt}. Clean background, studio lighting, high quality, digital art style. Suitable for use as a profile picture.`,
      portrait: `Vertical portrait illustration of ${userPrompt}. Artistic style, vibrant colors, professional composition, suitable for social media or profile use.`,
      landscape: `Horizontal scenic image of ${userPrompt}. Wide angle, cinematic composition, high detail, professional photography or digital art style.`,
      ad_horizontal: `Professional horizontal advertisement banner design featuring ${userPrompt}. Marketing visual, clean layout, eye-catching, brand-safe, commercial photography style.`,
      ad_vertical: `Professional vertical advertisement poster featuring ${userPrompt}. Mobile-optimized design, engaging visual hierarchy, marketing material style.`,
      ad_square: `Square social media advertisement graphic for ${userPrompt}. Balanced composition, modern design aesthetic, suitable for Instagram/WeChat moments.`,
      design: `Creative design mockup of ${userPrompt}. Professional design asset, clean aesthetics, production-ready visual.`,
      icon: `Minimalist app icon or logo representing ${userPrompt}. Simple shapes, flat design, recognizable at small sizes, modern icon design style.`,
      general: userPrompt,
    }

    let basePrompt = typePrompts[type] || typePrompts.general

    if (type !== 'general' && !basePrompt.toLowerCase().includes(userPrompt.toLowerCase())) {
      basePrompt += ` Subject: ${userPrompt}`
    }

    return basePrompt
  }

  generateMockImage({ prompt, type = 'general', size = '1024x1024' }) {
    logger.info('Using mock image generation for development')

    const [width, height] = size.split('x').map(Number)
    const bgColor = this.getMockColor(type)
    const textColor = '#ffffff'
    const accentColor = this.getAccentColor(type)

    const svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor[0]}"/>
          <stop offset="100%" style="stop-color:${bgColor[1]}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <circle cx="${width / 2}" cy="${height / 2 - 40}" r="${Math.min(width, height) * 0.15}" fill="${accentColor}" opacity="0.3"/>
      <text x="${width / 2}" y="${height / 2 - 20}" text-anchor="middle" fill="${textColor}" font-family="system-ui" font-size="${Math.min(width, height) * 0.04}" font-weight="600">AI Image</text>
      <text x="${width / 2}" y="${height / 2 + 15}" text-anchor="middle" fill="${textColor}" font-family="system-ui" font-size="${Math.min(width, height) * 0.025}" opacity="0.7">${type.toUpperCase()}</text>
      <rect x="${width * 0.2}" y="${height * 0.6}" width="${width * 0.6}" height="${height * 0.02}" rx="4" fill="${accentColor}" opacity="0.5"/>
      <text x="${width / 2}" y="${height * 0.72}" text-anchor="middle" fill="${textColor}" font-family="system-ui" font-size="${Math.min(width, height) * 0.022}" opacity="0.5">${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}</text>
      <text x="${width / 2}" y="${height * 0.9}" text-anchor="middle" fill="${textColor}" font-family="system-ui" font-size="${Math.min(width, height) * 0.018}" opacity="0.3">${width}×${height} · Mock Mode</text>
    </svg>`

    const base64Svg = Buffer.from(svgTemplate).toString('base64')

    return {
      imageData: base64Svg,
      revisedPrompt: `[Mock] ${prompt}`,
      size: `${width}x${height}`,
      provider: 'mock',
      model: 'mock-image-v1',
      generationTimeMs: 50,
      isMock: true,
    }
  }

  getMockColor(type) {
    const colors = {
      avatar: ['#667eea', '#764ba2'],
      portrait: ['#f093fb', '#f5576c'],
      landscape: ['#4facfe', '#00f2fe'],
      ad_horizontal: ['#fa709a', '#fee140'],
      ad_vertical: ['#a18cd1', '#fbc2eb'],
      ad_square: ['#ff0844', '#ffb199'],
      design: ['#11998e', '#38ef7d'],
      icon: ['#fc4a1a', '#f7b733'],
      general: ['#409EFF', '#67C23A'],
    }
    return colors[type] || colors.general
  }

  getAccentColor(type) {
    const accents = {
      avatar: '#a78bfa',
      portrait: '#f472b6',
      landscape: '#22d3ee',
      ad_horizontal: '#fbbf24',
      ad_vertical: '#e879f9',
      ad_square: '#fb7185',
      design: '#34d399',
      icon: '#f59e0b',
      general: '#60a5fa',
    }
    return accents[type] || accents.general
  }

  async editImage({
    originalImage,
    maskImage,
    prompt,
    editType = 'inpainting',
    size = '1024x1024',
    style = 'vivid',
    quality = 'standard',
  }) {
    const startTime = Date.now()
    const providerName = this.imageProvider

    if (providerName === 'mock') {
      return this.generateMockImage({ prompt, type: editType, size })
    }

    const providerConfig = this.imageProviders[providerName]

    if (!providerConfig) {
      throw new AppError(`未配置图片编辑提供者: ${providerName}`, 500)
    }

    try {
      const client = providerConfig.createClient()
      const enhancedPrompt = this.buildEditPrompt(prompt, editType)
      const resolvedSize = this.resolveImageSize(editType, size, providerConfig.supportedSizes)

      logger.info(`Starting image edit (${editType}) via ${providerConfig.name}`, {
        editType,
        promptLength: prompt.length,
        size: resolvedSize,
      })

      let requestParams = {
        model: providerConfig.model,
        prompt: enhancedPrompt,
        image: originalImage,
        n: 1,
        size: resolvedSize,
      }

      if (editType === 'inpainting' && maskImage) {
        requestParams.mask = maskImage
      }

      if (!providerConfig.isUrlBased) {
        requestParams.quality = providerConfig.supportedQualities.includes(quality)
          ? quality
          : 'standard'
        requestParams.style = style
        requestParams.response_format = 'b64_json'
      }

      const response = await client.images.edit(requestParams)

      let imageData, revisedPrompt

      if (response.data && response.data[0]) {
        if (providerConfig.isUrlBased) {
          const imageUrl = response.data[0].url
          if (!imageUrl) {
            throw new AppError('图片编辑失败：未返回图片URL', 500)
          }
          try {
            const imageResponse = await fetch(imageUrl)
            if (!imageResponse.ok) {
              throw new Error(`Failed to download edited image: ${imageResponse.status}`)
            }
            const imageBuffer = await imageResponse.arrayBuffer()
            imageData = Buffer.from(imageBuffer).toString('base64')
          } catch (fetchError) {
            logger.error('Image edit download failed:', fetchError.message)
            throw new AppError(`图片下载失败：${fetchError.message}`, 500)
          }
          revisedPrompt = response.data[0].revised_prompt || null
        } else {
          imageData = response.data[0].b64_json || null
          revisedPrompt = response.data[0].revised_prompt || null
        }
      }

      if (!imageData) {
        throw new AppError('图片编辑失败：未返回有效数据', 500)
      }

      const generationTimeMs = Date.now() - startTime

      logger.info(`Image edit completed via ${providerConfig.name}`, {
        editType,
        duration: `${generationTimeMs}ms`,
        imageSize: Math.round(Buffer.from(imageData).length / 1024) + 'KB',
      })

      return {
        imageData,
        revisedPrompt,
        size: resolvedSize,
        provider: providerConfig.name,
        model: providerConfig.model,
        generationTimeMs,
        editType,
      }
    } catch (error) {
      logger.error(`Image edit failed via ${providerConfig.name}:`, error.message)

      if (error.status === 429) {
        throw new AppError('图片编辑请求过于频繁，请稍后重试', 429)
      }
      if (error.status === 400 && error.message?.includes('content_policy')) {
        throw new AppError('编辑内容不符合安全策略', 400)
      }

      throw new AppError(`图片编辑失败: ${error.message}`, 500)
    }
  }

  async generateVariation({ originalImage, size = '1024x1024', style = 'vivid' }) {
    const startTime = Date.now()
    const providerName = this.imageProvider

    if (providerName === 'mock') {
      return this.generateMockImage({ prompt: 'variation', type: 'general', size })
    }

    const providerConfig = this.imageProviders[providerName]

    if (!providerConfig) {
      throw new AppError(`未配置图片提供者: ${providerName}`, 500)
    }

    try {
      const client = providerConfig.createClient()
      const resolvedSize = this.resolveImageSize('general', size, providerConfig.supportedSizes)

      logger.info(`Generating variation via ${providerConfig.name}`, { size: resolvedSize })

      const requestParams = {
        model: providerConfig.model,
        image: originalImage,
        n: 1,
        size: resolvedSize,
      }

      if (!providerConfig.isUrlBased) {
        requestParams.style = style
        requestParams.response_format = 'b64_json'
      }

      const response = await client.images.createVariation(requestParams)

      let imageData
      if (response.data && response.data[0]) {
        if (providerConfig.isUrlBased) {
          const imageUrl = response.data[0].url
          if (!imageUrl) {
            throw new AppError('生成变体失败：未返回URL', 500)
          }
          try {
            const imageResponse = await fetch(imageUrl)
            if (!imageResponse.ok) {
              throw new Error(`Failed to download variation: ${imageResponse.status}`)
            }
            const imageBuffer = await imageResponse.arrayBuffer()
            imageData = Buffer.from(imageBuffer).toString('base64')
          } catch (fetchError) {
            throw new AppError(`变体下载失败：${fetchError.message}`, 500)
          }
        } else {
          imageData = response.data[0].b64_json || null
        }
      }

      if (!imageData) {
        throw new AppError('生成变体失败：未返回有效数据', 500)
      }

      const generationTimeMs = Date.now() - startTime

      return {
        imageData,
        size: resolvedSize,
        provider: providerConfig.name,
        model: providerConfig.model,
        generationTimeMs,
        isVariation: true,
      }
    } catch (error) {
      logger.error(`Generate variation failed:`, error.message)
      throw new AppError(`生成变体失败: ${error.message}`, 500)
    }
  }

  buildEditPrompt(userPrompt, editType) {
    const typePrompts = {
      inpainting: `Redraw and regenerate the masked area with: ${userPrompt}. Maintain seamless integration with the unmasked regions. Match lighting, color palette, and perspective exactly.`,
      outpainting: `Extend the image canvas and generate new content for the expanded area: ${userPrompt}. Seamlessly continue the existing composition, maintain artistic consistency, match the style and atmosphere of the original image.`,
      style_transfer: `Transform the image into a new artistic style: ${userPrompt}. Preserve the main subject and composition while completely changing the visual aesthetic, color scheme, and artistic technique.`,
      general: userPrompt,
    }

    return typePrompts[editType] || typePrompts.general
  }
}

export const aiService = new AIService()
export default aiService
