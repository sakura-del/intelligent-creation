import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from '../database/connection.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { authenticate, checkAICount } from '../middleware/auth.js'
import { aiLimiter } from '../middleware/rateLimiter.js'
import validate, { schemas } from '../middleware/validator.js'
import aiService from '../services/aiService.js'
import { logger } from '../utils/logger.js'

const router = Router()

router.post(
  '/generate',
  authenticate,
  checkAICount,
  aiLimiter,
  validate(schemas.aiGenerate),
  async (req, res, next) => {
    try {
      const { type, prompt, style, length, wordCount, model } = req.body
      const startTime = Date.now()

      logger.info(`AI generate request from user ${req.user.id}`, {
        type,
        promptLength: prompt?.length || 0,
        style,
        length,
        model,
      })

      let result

      if (process.env.AI_PRIMARY_PROVIDER === 'mock') {
        result = await aiService.generateMockStream({ type, prompt }, res)
      } else {
        result = await aiService.generateStream(
          { type, prompt, style, length, wordCount, model },
          res,
        )
      }

      const generationTimeMs = Date.now() - startTime

      await db.query(
        `INSERT INTO ai_histories (user_id, prompt, result, type, model_used, token_count, generation_time_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          prompt,
          result.result,
          type,
          result.provider,
          result.tokenCount,
          generationTimeMs,
        ],
      )

      successResponse(
        res,
        {
          result: result.result,
          provider: result.provider,
          tokenCount: result.tokenCount,
          generationTimeMs,
        },
        '生成成功',
      )
    } catch (error) {
      logger.error('AI generation error:', error)
      next(error)
    }
  },
)

const imageLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  message: { code: 429, message: '图片生成频率限制为每分钟5次' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post(
  '/image-generate',
  authenticate,
  checkAICount,
  imageLimiter,
  validate(schemas.imageGenerate),
  async (req, res, next) => {
    try {
      const { prompt, type, size, quality, style } = req.body

      if (!prompt?.trim()) {
        return errorResponse(res, '请输入图片描述', 400)
      }

      logger.info(`Image generation request from user ${req.user.id}`, {
        promptLength: prompt.length,
        type,
        size,
      })

      const startTime = Date.now()
      const result = await aiService.generateImage({
        prompt: prompt.trim(),
        type: type || 'general',
        size: size || '1024x1024',
        quality: quality || 'standard',
        style: style || 'vivid',
      })

      const generationTimeMs = Date.now() - startTime

      await db.query(
        `INSERT INTO ai_histories (user_id, prompt, result, type, model_used, token_count, generation_time_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          prompt,
          JSON.stringify({ type, size: result.size, provider: result.provider, imageCount: 1 }),
          'image',
          result.provider,
          0,
          generationTimeMs,
        ],
      )

      successResponse(
        res,
        {
          imageData: result.imageData,
          revisedPrompt: result.revisedPrompt || null,
          size: result.size,
          provider: result.provider,
          isMock: process.env.AI_PRIMARY_PROVIDER === 'mock',
          generationTimeMs,
        },
        '图片生成成功',
      )
    } catch (error) {
      logger.error('AI image generation error:', error)
      next(error)
    }
  },
)

router.get('/models', async (req, res, next) => {
  try {
    const models = [
      {
        id: 'glm-4-plus',
        name: 'GLM-4 Plus',
        provider: 'glm',
        type: 'text',
        description: '智谱AI旗舰模型，适合代码生成和复杂推理',
        maxTokens: 4096,
      },
      {
        id: 'glm-4v-plus',
        name: 'GLM-4V Plus',
        provider: 'glm',
        type: 'multimodal',
        description: '智谱AI多模态模型，支持图文理解',
        maxTokens: 4096,
      },
      {
        id: 'dall-e-3',
        name: 'DALL·E 3',
        provider: 'openai',
        type: 'image',
        description: 'OpenAI图片生成模型，高质量图像创作',
        maxTokens: 0,
      },
      {
        id: 'cogview-3-plus',
        name: 'CogView-3 Plus',
        provider: 'glm',
        type: 'image',
        description: '智谱AI图片生成模型，中文场景优化',
        maxTokens: 0,
      },
    ]

    successResponse(res, { models })
  } catch (error) {
    next(error)
  }
})

router.get('/image-templates', async (req, res, next) => {
  try {
    const templates = [
      {
        value: 'avatar',
        label: '头像生成',
        icon: 'UserFilled',
        suggestedPrompts: ['专业商务头像', '可爱卡通头像', '赛博朋克风格'],
      },
      {
        value: 'portrait',
        label: '人像摄影',
        icon: 'Avatar',
        suggestedPrompts: ['电影级肖像照', '古风汉服写真', '时尚杂志封面'],
      },
      {
        value: 'landscape',
        label: '风景壁纸',
        icon: 'Picture',
        suggestedPrompts: ['赛博朋克城市', '梦幻森林', '星空银河'],
      },
      {
        value: 'ad_horizontal',
        label: '横版广告',
        icon: 'DataBoard',
        suggestedPrompts: ['双11促销Banner', '新品发布横幅', '品牌宣传图'],
      },
      {
        value: 'ad_vertical',
        label: '竖版海报',
        icon: 'Postcard',
        suggestedPrompts: ['手机端活动页', '微信分享配图', '小红书风格'],
      },
      {
        value: 'design',
        label: '设计素材',
        icon: 'MagicStick',
        suggestedPrompts: ['UI界面设计', '图标Logo', '3D渲染图'],
      },
    ]

    successResponse(res, { types: templates })
  } catch (error) {
    next(error)
  }
})

const editLimiter = rateLimit({
  windowMs: 60000,
  max: 3,
  message: { code: 429, message: '图片编辑频率限制为每分钟3次' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post(
  '/image-edit',
  authenticate,
  checkAICount,
  editLimiter,
  validate(schemas.imageEdit),
  async (req, res, next) => {
    try {
      const {
        originalImage,
        maskImage,
        prompt: editPrompt,
        editType = 'inpainting',
        size = '1024x1024',
        quality = 'standard',
        style = 'vivid',
      } = req.body

      if (editType === 'inpainting' && !maskImage) {
        return errorResponse(res, '局部重绘需要提供mask遮罩图像', 400)
      }

      const startTime = Date.now()
      const result = await aiService.editImage({
        originalImage,
        maskImage: maskImage || undefined,
        prompt: (editPrompt || '').trim(),
        editType,
        size: size || undefined,
        quality: quality || 'standard',
        style: style || 'vivid',
      })

      const generationTimeMs = Date.now() - startTime

      await db.query(
        `INSERT INTO ai_histories (user_id, prompt, result, type, model_used, token_count, generation_time_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          editPrompt || `image edit: ${editType}`,
          JSON.stringify({ editType, size: result.size, provider: result.provider }),
          'image_edit',
          result.provider,
          0,
          generationTimeMs,
        ],
      )

      successResponse(
        res,
        {
          imageData: result.imageData,
          revisedPrompt: result.revisedPrompt || null,
          size: result.size,
          provider: result.provider,
          editType: result.editType,
          generationTimeMs: result.generationTimeMs,
        },
        `${editType === 'inpainting' ? '局部重绘' : editType === 'outpainting' ? '画布扩展' : '风格迁移'}完成`,
      )
    } catch (error) {
      logger.error('AI image edit error:', error)
      next(error)
    }
  },
)

router.post(
  '/image-variation',
  authenticate,
  checkAICount,
  editLimiter,
  validate(schemas.imageVariation),
  async (req, res, next) => {
    try {
      const { originalImage, size = '1024x1024', style = 'vivid' } = req.body

      const startTime = Date.now()
      const result = await aiService.generateVariation({
        originalImage,
        size,
        style,
      })

      const generationTimeMs = Date.now() - startTime

      await db.query(
        `INSERT INTO ai_histories (user_id, prompt, result, type, model_used, token_count, generation_time_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          'image variation',
          JSON.stringify({ size: result.size, provider: result.provider }),
          'image_variation',
          result.provider,
          0,
          generationTimeMs,
        ],
      )

      successResponse(
        res,
        {
          imageData: result.imageData,
          revisedPrompt: null,
          size: result.size,
          provider: result.provider,
          isVariation: true,
          generationTimeMs: result.generationTimeMs,
        },
        '变体生成成功',
      )
    } catch (error) {
      logger.error('AI image variation error:', error)
      next(error)
    }
  },
)

// ==================== AI代码生成API (Phase 2新增) ====================

const codeGenLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: { code: 429, message: '代码生成频率限制为每分钟10次' },
  standardHeaders: true,
  legacyHeaders: false,
})

function buildCodeSystemPrompt(style = 'modern', features = []) {
  const basePrompt = `你是一个资深前端工程师和UI设计师，专精于创建高质量、响应式的H5营销页面。

## 核心任务
根据用户的自然语言描述，生成完整的、可直接运行的网页代码。

## ⚠️⚠️⚠️ 极其重要的输出格式要求（违反将导致失败）⚠️⚠️⚠️

你必须返回一个**纯净的JSON对象**，不要包含任何其他文字、markdown标记、代码块符号。

### 绝对禁止❌
- ❌ 不要将JSON字符串作为html/css/js字段的值
- ❌ 不要返回 {"html": "{\\"html\\": \\"...\\"}"} 这种嵌套格式
- ❌ 不要在任何字段中嵌套JSON字符串
- ❌ html字段必须是完整的HTML代码（包含<!DOCTYPE>, <html>, <head>, <body>标签）
- ❌ css字段必须是纯CSS代码（以选择器开头，如 body { ... }）
- ❌ js字段必须是纯JavaScript代码（以 const / function / document 等）

### 必须遵守✅
- ✅ 直接输出：{"html": "<!DOCTYPE html>...真实HTML代码...", "css": "body{...真实CSS...}", "js": "console.log(...真实JS...)", "description": "..."}
- ✅ html字段值必须以 <!DOCTYPE 或 <html 开头
- ✅ css字段值必须包含CSS选择器和属性
- ✅ 所有字符串中的双引号转义为 \\"
- ✅ 换行符使用 \\n

### 正确示例
{"html":"<!DOCTYPE html>\\n<html lang=\\"zh-CN\\">\\n<head>\\n  <meta charset=\\"UTF-8\\">\\n  <title>Page</title>\\n</head>\\n<body>\\n  <h1>Hello</h1>\\n</body>\\n</html>","css":"body{font-family:sans-serif;padding:20px;}","js":"document.addEventListener('DOMContentLoaded',()=>{console.log('loaded');});","description":"简单页面"}

## 代码质量规范
1. ✅ 使用语义化HTML5标签（header, nav, main, section, article, footer）
2. ✅ CSS采用移动端优先的响应式设计（@media查询断点：768px, 1024px, 1440px）
3. ✅ JavaScript使用ES6+语法（const/let,箭头函数,模板字符串\`\`,解构赋值）
4. ✅ 所有图片使用占位符（https://picsum.photos/宽度/高度?random=数字）
5. ✅ 字体使用系统默认字体栈：-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
6. ✅ 颜色使用CSS变量或现代配色方案（禁止使用过时的颜色名）
7. ✅ 必须包含 <meta charset="UTF-8"> 和 viewport meta标签

## 设计原则
- 首屏视觉冲击力强（大标题、高质量hero区域）
- 移动端友好（触摸目标至少44x44px）
- 加载性能优化（CSS在head中，JS在body底部）
- 微交互增强用户体验`

  const stylePrompts = {
    modern: `\n## 风格要求：现代简约
- 扁平化设计，无阴影或极浅阴影
- 大量留白（padding/margin >= 16px）
- 主色调：#2563eb（蓝色系），辅助色：#64748b（灰色）
- 圆角：8px-12px
- 微交互动画：transform + transition 0.3s ease`,
    luxury: `\n## 风格要求：奢华高端
- 渐变背景（深色系：#1a1a2e → #16213e）
- 金色点缀：#d4af37 或 #c9a96e
- 衬线字体用于标题：'Playfair Display', Georgia, serif
- 大量留白 + 精致分隔线
- hover时微光效果`,
    minimal: `\n## 风格要求：极简主义
- 黑白灰主色调（#111, #333, #666, #f5f5f5）
- 无边框或1px细线框
- 克制的动画（仅opacity变化）
- 强调排版层次（字号对比明显）`,
    playful: `\n## 风格要求：活泼趣味
- 明亮色彩（#f43f5e, #8b5cf6, #06b6d4, #10b981）
- 大圆角（16px-24px）
- 弹性动画（spring效果，0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)）
- 可爱的图标/emoji装饰`,
    corporate: `\n## 风格要求：企业专业
- 商务蓝色主调：#0369a1, #0ea5e9
- 清晰的信息层级
- 数据可视化元素（图表、统计数字）
- 专业的CTA按钮样式`,
  }

  const featurePrompts = []
  if (features.includes('animation')) {
    featurePrompts.push(`
## 动画特性要求
- 页面加载时元素依次入场（stagger animation，每个延迟0.1s）
- 使用CSS @keyframes定义2-3组动画
- IntersectionObserver实现滚动触发动画
- 按钮hover时有scale(1.02)或轻微上移效果`)
  }
  if (features.includes('responsive')) {
    featurePrompts.push(`
## 响应式布局要求
- Mobile First: 默认移动端样式，@media (min-width:768px) 增强平板，@media (min-width:1024px) 增强桌面
- 导航栏在移动端变为汉堡菜单
- 图片网格在小屏幕变为单列
- 字体大小使用clamp()函数实现流体排版`)
  }
  if (features.includes('interactive')) {
    featurePrompts.push(`
## 交互特性要求
- 至少3个有意义的交互点（tab切换、卡片展开、模态框等）
- 表单元素带实时验证反馈
- loading状态和空状态处理`)
  }
  if (features.includes('form')) {
    featurePrompts.push(`
## 表单组件要求
- 包含完整的表单（input, textarea, select等）
- 实时验证（邮箱格式、必填项、长度限制）
- 提交按钮带loading状态
- 成功/错误的toast提示`)
  }

  return `${basePrompt}\n\n${stylePrompts[style] || stylePrompts.modern}${featurePrompts.join('\n')}

## 最后再次强调：只返回纯JSON对象，不要markdown代码块，不要注释，不要解释！`
}

router.post(
  '/code-generate',
  authenticate,
  checkAICount,
  codeGenLimiter,
  async (req, res, next) => {
    try {
      const { prompt, templateId, style = 'modern', features = [] } = req.body

      if (!prompt?.trim()) {
        return errorResponse(res, '请输入代码描述需求', 400)
      }

      const startTime = Date.now()

      logger.info(`AI Code Generation request from user ${req.user.id}`, {
        promptLength: prompt.length,
        templateId,
        style,
        features,
      })

      // 构建System Prompt
      const systemPrompt = buildCodeSystemPrompt(style, features)

      // 构建User Prompt
      let userPrompt = `请为以下需求生成完整的H5页面代码：

## 用户需求
${prompt.trim()}`

      // 如果选择了模板，获取模板上下文
      if (templateId) {
        try {
          const [template] = await db.query(
            'SELECT context FROM code_templates WHERE id = ? AND status = ?',
            [templateId, 'published'],
          )
          if (template?.context) {
            userPrompt += `\n\n## 参考模板上下文\n${template.context}`
          }
        } catch (e) {
          logger.warn('Failed to load template context:', e.message)
        }
      }

      userPrompt += '\n\n请直接返回JSON格式的代码，无需任何解释。'

      // 调用GLM API (使用providers.glm) + 60秒超时控制
      const glmProvider = aiService.providers.glm
      const glmClient = glmProvider.createClient()

      logger.info('Calling GLM-4-plus for code generation...')

      const AI_TIMEOUT_MS = 55000

      const completionPromise = glmClient.chat.completions.create({
        model: 'glm-4-plus',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      })

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI生成超时：超过55秒未响应')), AI_TIMEOUT_MS),
      )

      const completion = await Promise.race([completionPromise, timeoutPromise])

      if (!completion?.choices || !completion.choices[0]) {
        throw new Error('AI服务未返回有效响应')
      }

      const aiResponseText = completion.choices[0].message.content
      const tokensUsed = completion.usage?.total_tokens || 0

      logger.info(
        `AI Code Gen raw response length: ${aiResponseText.length}, tokens: ${tokensUsed}`,
      )

      // 使用增强的JSON解析器（处理各种非标准格式）
      let parsedResponse

      try {
        parsedResponse = JSON.parse(aiResponseText)
        logger.info('Primary JSON parse succeeded (standard format)')
      } catch (parseError) {
        logger.warn(`Primary JSON parse failed: ${parseError.message}, using enhanced extractor`)
        parsedResponse = extractJSONFromText(aiResponseText)
      }

      // 使用代码清洗和验证函数
      const sanitizedCode = validateAndSanitizeCode(parsedResponse)

      if (!sanitizedCode) {
        const err = new Error('AI返回的代码缺少有效内容或格式错误')
        err.status = 500
        throw err
      }

      if (sanitizedCode._fallback) {
        logger.warn('Using fallback mode - raw text as HTML')
      }

      // 构造文件数组
      const files = []

      if (sanitizedCode.html) {
        files.push({
          name: 'index.html',
          content: sanitizedCode.html,
          language: 'html',
        })
      }

      if (sanitizedCode.css) {
        files.push({
          name: 'style.css',
          content: sanitizedCode.css,
          language: 'css',
        })
      }

      if (sanitizedCode.js) {
        files.push({
          name: 'script.js',
          content: sanitizedCode.js,
          language: 'javascript',
        })
      }

      const generationTimeMs = Date.now() - startTime

      logger.info(
        `Code generation completed in ${generationTimeMs}ms, ${files.length} files generated`,
      )

      // 记录到数据库
      await db.query(
        `INSERT INTO ai_histories (user_id, prompt, result, type, model_used, token_count, generation_time_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          prompt,
          JSON.stringify(files),
          'code_generate',
          'glm-4-plus',
          tokensUsed,
          generationTimeMs,
        ],
      )

      successResponse(
        res,
        {
          files,
          metadata: {
            description: parsedResponse.description || '',
            model: 'glm-4-plus',
            tokensUsed,
            generationTimeMs,
            style,
            features,
          },
        },
        '代码生成成功',
      )
    } catch (error) {
      logger.error('AI code generation error:', error)
      next(error)
    }
  },
)

// 辅助函数：从文本中提取JSON
function cleanResponseText(text) {
  if (!text || typeof text !== 'string') return ''

  let cleaned = text

  cleaned = cleaned.replace(/^\uFEFF/, '')
  cleaned = cleaned.replace(/^[\u200B-\u200D\uFEFF\u00A0]+/, '')

  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n')
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1)
    }
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3).trim()
  }

  cleaned = cleaned.replace(/^```json\s*/i, '')
  cleaned = cleaned.replace(/^```\s*/i, '')
  cleaned = cleaned.replace(/\s*```\s*$/, '')

  cleaned = cleaned.trim()

  return cleaned
}

function extractJSONFromText(text) {
  const cleaned = cleanResponseText(text)

  if (!cleaned) {
    logger.warn('Empty text after cleaning')
    return null
  }

  try {
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed === 'object') {
      logger.info('Direct JSON parse succeeded')
      return parsed
    }
  } catch (e) {
    logger.warn(`Direct JSON parse failed: ${e.message}`)
  }

  const jsonPattern = /\{[\s\S]*"html"[\s\S]*"css"[\s\S]*"js"[\s\S]*\}/
  const match = cleaned.match(jsonPattern)

  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (parsed && parsed.html) {
        logger.info('Regex JSON extraction succeeded')
        return parsed
      }
    } catch (e) {
      logger.warn(`Regex extraction parse failed: ${e.message}`)
    }
  }

  const braceStart = cleaned.indexOf('{')
  const braceEnd = cleaned.lastIndexOf('}')

  if (braceStart !== -1 && braceEnd > braceStart) {
    const candidate = cleaned.substring(braceStart, braceEnd + 1)
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object') {
        logger.info('Brace boundary extraction succeeded')
        return parsed
      }
    } catch (e) {
      logger.warn(`Brace boundary parse failed: ${e.message}`)
    }
  }

  logger.error('All JSON parsing methods failed')

  const fallbackHtml = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').substring(0, 50000) // eslint-disable-line no-control-regex -- sanitize control chars

  return {
    html: fallbackHtml,
    css: `/* Auto-generated fallback styles */\n* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; padding: 20px; max-width: 1200px; margin: 0 auto; }`,
    js: '',
    description: 'Fallback:原始内容作为HTML',
    _fallback: true,
  }
}

function tryExtractNestedContent(content, type) {
  if (!content || typeof content !== 'string') return content

  const trimmed = content.trim()

  if (trimmed.startsWith('{"') || trimmed.startsWith('{')) {
    try {
      const nested = JSON.parse(trimmed)
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        logger.warn(`Detected nested JSON in ${type} field, extracting...`)
        return nested[type] || nested.html || nested.content || nested.code || content
      }
    } catch {
      // eslint-disable-line no-empty -- expected invalid JSON
      // 不是有效JSON
    }
  }

  return content
}

function validateAndSanitizeCode(parsed) {
  if (!parsed) return null

  const result = {}

  let rawHtml = parsed.html || ''
  let rawCss = parsed.css || ''
  let rawJs = parsed.js || ''

  rawHtml = tryExtractNestedContent(rawHtml, 'html')
  rawCss = tryExtractNestedContent(rawCss, 'css')
  rawJs = tryExtractNestedContent(rawJs, 'js')

  if (rawHtml && !/<[a-z][\s\S]*>/i.test(rawHtml)) {
    logger.warn(
      `HTML field doesn't contain HTML tags, treating as text content. First 80 chars: ${rawHtml.slice(0, 80)}`,
    )
  }

  result.html = sanitizeHTML(rawHtml)
  result.css = sanitizeCSS(rawCss)
  result.js = sanitizeJS(rawJs)
  result.description = String(parsed.description || '').substring(0, 500)

  if (!result.html && !result.css && !result.js) {
    logger.error('No valid code content after sanitization')
    return null
  }

  return result
}

function unescapeLiteralChars(str) {
  if (!str || typeof str !== 'string') return ''

  let result = str

  result = result.replace(/\\n/g, '\n')
  result = result.replace(/\\t/g, '\t')
  result = result.replace(/\\r/g, '\r')
  result = result.replace(/\\"/g, '"')
  result = result.replace(/\\\\/g, '\\')

  return result
}

function detectAndFixContentFormat(content, type = 'html') {
  if (!content || typeof content !== 'string') return content

  let fixed = content

  const literalNewlineCount = (fixed.match(/\\n/g) || []).length
  const literalTabCount = (fixed.match(/\\t/g) || []).length

  if (literalNewlineCount > 0 || literalTabCount > 0) {
    logger.info(
      `Detected ${literalNewlineCount} literal \\\\n and ${literalTabCount} literal \\\\t in ${type}, unescaping...`,
    )
    fixed = unescapeLiteralChars(fixed)
  }

  if (type === 'html') {
    const hasHTMLStructure =
      /<(html|body|div|p|h[1-6]|section|article|header|footer|nav|main|span|a|img|ul|ol|li)\b/i.test(
        fixed,
      )

    if (!hasHTMLStructure && fixed.length > 10) {
      logger.warn(
        `HTML content lacks HTML structure, wrapping in proper template. First 100 chars: ${fixed.slice(0, 100)}`,
      )

      const paragraphs = fixed.split(/\n\n+/).filter((p) => p.trim())
      const bodyContent = paragraphs
        .map((p) => {
          const trimmed = p.trim()
          if (!trimmed) return ''
          if (/^#{1,3}\s/.test(trimmed)) {
            const level = trimmed.match(/^#+/)[0].length
            const text = trimmed.replace(/^#+\s*/, '')
            return `  <h${level}>${text}</h${level}>`
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const items = trimmed.split(/\n/).filter((l) => /^[-*]\s/.test(l))
            const listItems = items
              .map((l) => `    <li>${l.replace(/^[-*]\s*/, '')}</li>`)
              .join('\n')
            return `  <ul>\n${listItems}\n  </ul>`
          }
          if (trimmed.includes('://') && (trimmed.startsWith('http') || trimmed.includes('img'))) {
            return `  <img src="${trimmed}" alt="image" />`
          }
          return `  <p>${trimmed.replace(/\n/g, '<br>')}</p>`
        })
        .join('\n\n')

      fixed = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Generated Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { margin: 1em 0 0.5em; color: #111; }
    p { margin: 0.5em 0; }
    ul { margin: 0.5em 0; padding-left: 2em; }
    li { margin: 0.25em 0; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`
      logger.info('Content wrapped in HTML template successfully')
    }
  }

  return fixed
}

function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return ''

  let sanitized = html

  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex -- sanitize control chars

  sanitized = detectAndFixContentFormat(sanitized, 'html')

  if (!sanitized.includes('<!DOCTYPE') && !sanitized.includes('<html')) {
    sanitized = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>AI Generated Page</title>\n</head>\n<body>\n${sanitized}\n</body>\n</html>`
  }

  if (!sanitized.includes('charset')) {
    sanitized = sanitized.replace('<head>', '<head>\n  <meta charset="UTF-8">')
  }

  if (!sanitized.includes('viewport')) {
    sanitized = sanitized.replace(
      '</head>',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n</head>',
    )
  }

  return sanitized
}

function sanitizeCSS(css) {
  if (!css || typeof css !== 'string') return ''
  let sanitized = css.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex -- sanitize control chars
  sanitized = unescapeLiteralChars(sanitized)
  return sanitized
}

function sanitizeJS(js) {
  if (!js || typeof js !== 'string') return ''
  let sanitized = js.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // eslint-disable-line no-control-regex -- sanitize control chars
  sanitized = unescapeLiteralChars(sanitized)
  return sanitized
}

// ==================== 内容模板API ====================

router.get('/content-templates', authenticate, async (req, res, next) => {
  try {
    const { type, category } = req.query
    let sql = 'SELECT * FROM content_templates WHERE status = 1 AND (is_public = 1 OR user_id = ?)'
    const params = [req.user.id]

    if (type) {
      sql += ' AND type = ?'
      params.push(type)
    }
    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }

    sql += ' ORDER BY sort_order DESC, usage_count DESC, create_time DESC'

    const templates = await db.query(sql, params)
    successResponse(res, { templates })
  } catch (error) {
    logger.error('Get content templates error:', error)
    next(error)
  }
})

router.get('/content-templates/:id', authenticate, async (req, res, next) => {
  try {
    const templates = await db.query(
      'SELECT * FROM content_templates WHERE id = ? AND status = 1 AND (is_public = 1 OR user_id = ?)',
      [req.params.id, req.user.id],
    )

    if (!templates || !templates.length) {
      return errorResponse(res, '模板不存在', 404)
    }

    successResponse(res, templates[0])
  } catch (error) {
    next(error)
  }
})

router.post('/content-templates', authenticate, async (req, res, next) => {
  try {
    const { name, type, description, promptTemplate, variables, style, length, icon, category } =
      req.body

    if (!name || !type || !promptTemplate) {
      return errorResponse(res, '模板名称、类型和提示词模板为必填项', 400)
    }

    const result = await db.query(
      `INSERT INTO content_templates (name, type, description, prompt_template, variables, style, length, icon, category, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        type,
        description || '',
        promptTemplate,
        variables ? JSON.stringify(variables) : null,
        style || 'professional',
        length || 'medium',
        icon || '',
        category || '',
        req.user.id,
      ],
    )

    successResponse(res, { id: result.insertId }, '模板创建成功', 201)
  } catch (error) {
    logger.error('Create content template error:', error)
    next(error)
  }
})

router.put('/content-templates/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await db.query(
      'SELECT id FROM content_templates WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id],
    )

    if (!existing || !existing.length) {
      return errorResponse(res, '模板不存在或无权编辑', 404)
    }

    const { name, type, description, promptTemplate, variables, style, length, icon, category } =
      req.body
    const updates = {}

    if (name !== undefined) updates.name = name
    if (type !== undefined) updates.type = type
    if (description !== undefined) updates.description = description
    if (promptTemplate !== undefined) updates.prompt_template = promptTemplate
    if (variables !== undefined) updates.variables = JSON.stringify(variables)
    if (style !== undefined) updates.style = style
    if (length !== undefined) updates.length = length
    if (icon !== undefined) updates.icon = icon
    if (category !== undefined) updates.category = category

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, '没有需要更新的字段', 400)
    }

    await db.query('UPDATE content_templates SET ? WHERE id = ?', [updates, req.params.id])

    successResponse(res, null, '模板更新成功')
  } catch (error) {
    logger.error('Update content template error:', error)
    next(error)
  }
})

router.delete('/content-templates/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await db.query(
      'SELECT id FROM content_templates WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id],
    )

    if (!existing || !existing.length) {
      return errorResponse(res, '模板不存在或无权删除', 404)
    }

    await db.query('DELETE FROM content_templates WHERE id = ?', [req.params.id])

    successResponse(res, null, '模板删除成功')
  } catch (error) {
    logger.error('Delete content template error:', error)
    next(error)
  }
})

// ==================== 历史记录管理API ====================

router.post('/history', authenticate, async (req, res, next) => {
  try {
    const { type, prompt, result, style, length_type, word_count, model_used, provider, token_count, generation_time_ms } = req.body

    if (!type || !prompt) {
      return errorResponse(res, '缺少必要参数: type, prompt', 400)
    }

    const title = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt

    const [result_insert] = await db.query(
      `INSERT INTO ai_histories (user_id, type, title, prompt, result, style, length_type, word_count, model_used, provider, token_count, generation_time_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, type, title, prompt, result || null, style || null, length_type || null,
        word_count || 0, model_used || null, provider || null, token_count || 0, generation_time_ms || null]
    )

    successResponse(res, { id: result_insert.insertId }, '历史记录已保存', 201)
  } catch (error) {
    logger.error('Save AI history error:', error)
    next(error)
  }
})

router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, type, search } = req.query
    const safePage = Math.max(1, parseInt(page) || 1)
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 10))
    const offset = (safePage - 1) * parseInt(safeLimit)

    let countSql = 'SELECT COUNT(*) as total FROM ai_histories WHERE user_id = ?'
    let dataSql =
      'SELECT id, prompt, type, title, model_used, token_count, generation_time_ms, is_favorite, create_time FROM ai_histories WHERE user_id = ?'
    const params = [req.user.id]
    const dataParams = [req.user.id]

    if (type) {
      countSql += ' AND type = ?'
      dataSql += ' AND type = ?'
      params.push(type)
      dataParams.push(type)
    }

    if (search) {
      countSql += ' AND (prompt LIKE ? OR title LIKE ?)'
      dataSql += ' AND (prompt LIKE ? OR title LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern)
      dataParams.push(searchPattern, searchPattern)
    }

    const countResult = await db.query(countSql, params)
    const total = countResult[0]?.total || 0

    dataSql += ' ORDER BY create_time DESC LIMIT ? OFFSET ?'
    dataParams.push(parseInt(limit), offset)

    const items = await db.query(dataSql, dataParams)

    const itemsWithPreview = items.map((item) => ({
      ...item,
      prompt_preview: item.prompt
        ? item.prompt.substring(0, 50) + (item.prompt.length > 50 ? '...' : '')
        : '',
    }))

    successResponse(res, {
      items: itemsWithPreview,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    if (error.message && error.message.includes("doesn't exist")) {
      logger.warn('AI history table not yet created, returning empty result')
      return successResponse(res, { items: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } })
    }
    logger.error('Get AI history error:', error)
    next(error)
  }
})

router.get('/history/:id', authenticate, async (req, res, next) => {
  try {
    const histories = await db.query('SELECT * FROM ai_histories WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id,
    ])

    if (!histories || !histories.length) {
      return errorResponse(res, '历史记录不存在', 404)
    }

    successResponse(res, histories[0])
  } catch (error) {
    next(error)
  }
})

router.delete('/history/:id', authenticate, async (req, res, next) => {
  try {
    const existing = await db.query('SELECT id FROM ai_histories WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id,
    ])

    if (!existing || !existing.length) {
      return errorResponse(res, '历史记录不存在', 404)
    }

    await db.query('DELETE FROM ai_histories WHERE id = ?', [req.params.id])

    successResponse(res, null, '删除成功')
  } catch (error) {
    logger.error('Delete AI history error:', error)
    next(error)
  }
})

router.post('/history/:id/favorite', authenticate, async (req, res, next) => {
  try {
    const existing = await db.query(
      'SELECT is_favorite FROM ai_histories WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id],
    )

    if (!existing || !existing.length) {
      return errorResponse(res, '历史记录不存在', 404)
    }

    const newFavoriteStatus = existing[0].is_favorite ? 0 : 1

    await db.query('UPDATE ai_histories SET is_favorite = ? WHERE id = ?', [
      newFavoriteStatus,
      req.params.id,
    ])

    successResponse(
      res,
      { isFavorite: !!newFavoriteStatus },
      newFavoriteStatus ? '已收藏' : '已取消收藏',
    )
  } catch (error) {
    next(error)
  }
})

router.post('/history/batch-delete', authenticate, async (req, res, next) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, '请提供要删除的记录ID列表', 400)
    }

    if (ids.length > 50) {
      return errorResponse(res, '单次最多删除50条记录', 400)
    }

    const placeholders = ids.map(() => '?').join(',')
    await db.query(`DELETE FROM ai_histories WHERE id IN (${placeholders}) AND user_id = ?`, [
      ...ids,
      req.user.id,
    ])

    successResponse(res, null, `成功删除${ids.length}条记录`)
  } catch (error) {
    logger.error('Batch delete history error:', error)
    next(error)
  }
})

// ==================== 内容导出API ====================

router.post('/export', authenticate, async (req, res, next) => {
  try {
    const { content, format = 'txt', title = 'AI生成内容' } = req.body

    if (!content) {
      return errorResponse(res, '请提供要导出的内容', 400)
    }

    if (format === 'txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(title)}.txt"`,
      )
      res.send(content)
    } else if (format === 'html') {
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #333; }
    h1 { font-size: 28px; border-bottom: 2px solid #409EFF; padding-bottom: 10px; }
    h2 { font-size: 22px; color: #2c3e50; margin-top: 30px; }
    h3 { font-size: 18px; color: #34495e; }
    p { margin: 12px 0; }
    ul, ol { padding-left: 24px; }
    li { margin: 6px 0; }
    strong { color: #409EFF; }
    blockquote { border-left: 4px solid #409EFF; padding: 10px 20px; margin: 16px 0; background: #f8f9fa; }
    code { background: #f1f3f5; padding: 2px 6px; border-radius: 3px; font-size: 14px; }
    pre { background: #2d2d2d; color: #ccc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; color: inherit; }
    .meta { color: #999; font-size: 14px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">由AI创作平台生成 · ${new Date().toLocaleDateString('zh-CN')}</div>
  <div class="content">${content.replace(/\n/g, '<br>')}</div>
</body>
</html>`
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(title)}.html"`,
      )
      res.send(htmlContent)
    } else if (format === 'md') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.md"`)
      res.send(content)
    } else {
      return errorResponse(res, '不支持的导出格式，支持: txt, html, md', 400)
    }
  } catch (error) {
    logger.error('Export content error:', error)
    next(error)
  }
})

export default router
