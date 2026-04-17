import Joi from 'joi'

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }))

      const validationError = new Error('数据验证失败')
      validationError.name = 'ValidationError'
      validationError.details = errors
      return next(validationError)
    }

    req[property] = value
    next()
  }
}

export const schemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(20).required().messages({
      'string.min': '用户名长度不能少于{#limit}个字符',
      'string.max': '用户名长度不能超过{#limit}个字符',
      'any.required': '用户名为必填项',
    }),
    password: Joi.string()
      .min(6)
      .max(100)
      .pattern(/^(?=.*[a-zA-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': '密码长度不能少于{#limit}位',
        'string.pattern.base': '密码必须包含字母和数字',
        'any.required': '密码为必填项',
      }),
    nickname: Joi.string().max(20).required().messages({
      'string.max': '昵称长度不能超过{#limit}个字符',
    }),
    email: Joi.string().email().max(50).required().messages({
      'string.email': '请输入有效的邮箱地址',
      'any.required': '邮箱为必填项',
    }),
  }),

  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),

  updateUser: Joi.object({
    nickname: Joi.string().max(20),
    email: Joi.string().email().max(50),
    avatar: Joi.string().uri().allow(''),
  }),

  resume: Joi.object({
    template_id: Joi.number().integer().positive().required(),
    title: Joi.string().max(100).required(),
    content: Joi.string().required(),
  }),

  app: Joi.object({
    name: Joi.string().max(100).required(),
    description: Joi.string().required(),
    structure: Joi.object().required(),
  }),

  aiGenerate: Joi.object({
    type: Joi.string()
      .valid('article', 'marketing', 'social', 'summary', 'business', 'creative')
      .required(),
    prompt: Joi.string().min(10).max(2000).required(),
    style: Joi.string().valid('professional', 'casual', 'academic', 'creative'),
    length: Joi.string().valid('short', 'medium', 'long'),
    wordCount: Joi.number().integer().min(50).max(5000),
  }),

  imageGenerate: Joi.object({
    prompt: Joi.string().min(3).max(1000).required().messages({
      'string.min': '提示词至少需要{#limit}个字符',
      'string.max': '提示词不能超过{#limit}个字符',
      'any.required': '请输入图片描述（提示词）',
    }),
    type: Joi.string()
      .valid(
        'avatar',
        'portrait',
        'landscape',
        'ad_horizontal',
        'ad_vertical',
        'ad_square',
        'design',
        'icon',
        'general',
      )
      .default('general'),
    size: Joi.string().valid('256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'),
    quality: Joi.string().valid('standard', 'hd').default('standard'),
    style: Joi.string().valid('vivid', 'natural').default('vivid'),
    count: Joi.number().integer().min(1).max(5).default(1),
  }),

  imageEdit: Joi.object({
    originalImage: Joi.string().required().messages({
      'any.required': '请提供原始图片数据',
    }),
    maskImage: Joi.string().allow(''),
    prompt: Joi.string().max(1000).allow(''),
    editType: Joi.string()
      .valid('inpainting', 'outpainting', 'style_transfer')
      .default('inpainting'),
    size: Joi.string()
      .valid('256x256', '512x512', '1024x1024', '1792x1024', '1024x1792')
      .default('1024x1024'),
    quality: Joi.string().valid('standard', 'hd').default('standard'),
    style: Joi.string().valid('vivid', 'natural').default('vivid'),
  }),

  imageVariation: Joi.object({
    originalImage: Joi.string().required().messages({
      'any.required': '请提供原始图片数据',
    }),
    size: Joi.string()
      .valid('256x256', '512x512', '1024x1024', '1792x1024', '1024x1792')
      .default('1024x1024'),
    style: Joi.string().valid('vivid', 'natural').default('vivid'),
    count: Joi.number().integer().min(1).max(5).default(1),
  }),

  gallerySave: Joi.object({
    imageData: Joi.string().required().messages({
      'any.required': '请提供图片数据',
    }),
    title: Joi.string().max(200).allow(''),
    prompt_text: Joi.string().allow(''),
    prompt_id: Joi.number().integer().allow(null),
    type: Joi.string().valid('image', 'text', 'edited_image').default('image'),
    metadata: Joi.object().allow(null),
    is_public: Joi.boolean().default(false),
    category: Joi.string().max(50).allow(''),
    tags: Joi.array().items(Joi.string().max(30)).max(10),
    is_favorite: Joi.boolean().default(false),
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),

  promptCreate: Joi.object({
    title: Joi.string().min(2).max(200).required().messages({
      'string.min': '标题至少需要{#limit}个字符',
      'string.max': '标题不能超过{#limit}个字符',
      'any.required': '请输入提示词标题',
    }),
    content: Joi.string().min(10).max(5000).required().messages({
      'string.min': '提示词内容至少需要{#limit}个字符',
      'string.max': '提示词内容不能超过{#limit}个字符',
      'any.required': '请输入提示词内容',
    }),
    description: Joi.string().max(500).allow(''),
    category: Joi.string()
      .valid(
        'avatar',
        'portrait',
        'landscape',
        'ad_horizontal',
        'ad_vertical',
        'ad_square',
        'design',
        'icon',
        'general',
        'text',
        'marketing',
        'social',
        'business',
        'creative',
      )
      .default('general'),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    variables: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        description: Joi.string().allow(''),
        default_value: Joi.string().allow(''),
        required: Joi.boolean().default(false),
      }),
    ),
    scene_tags: Joi.array().items(Joi.string().max(50)).max(10),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
    is_template: Joi.boolean().default(false),
    is_public: Joi.boolean().default(false),
  }),

  promptUpdate: Joi.object({
    title: Joi.string().min(2).max(200),
    content: Joi.string().min(10).max(5000),
    description: Joi.string().max(500).allow(''),
    category: Joi.string().valid(
      'avatar',
      'portrait',
      'landscape',
      'ad_horizontal',
      'ad_vertical',
      'ad_square',
      'design',
      'icon',
      'general',
      'text',
      'marketing',
      'social',
      'business',
      'creative',
    ),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    variables: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        description: Joi.string().allow(''),
        default_value: Joi.string().allow(''),
        required: Joi.boolean().default(false),
      }),
    ),
    scene_tags: Joi.array().items(Joi.string().max(50)).max(10),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    is_template: Joi.boolean(),
    is_public: Joi.boolean(),
    status: Joi.string().valid('draft', 'published', 'archived'),
    change_log: Joi.string().max(500).allow(''),
  }),

  promptRate: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required().messages({
      'number.min': '评分最低为{#limit}',
      'number.max': '评分最高为{#limit}',
      'any.required': '请提供评分',
    }),
    feedback: Joi.string().max(500).allow(''),
  }),

  promptResolve: Joi.object({
    variables: Joi.object().pattern(Joi.string(), Joi.string().allow('')).required().messages({
      'any.required': '请提供变量值',
    }),
  }),
}

export default validate
