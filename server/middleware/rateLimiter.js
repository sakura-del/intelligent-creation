import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger.js'

const isDevelopment = process.env.NODE_ENV === 'development'

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 999 : 100,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.originalUrl,
      method: req.method,
    })
    res.status(429).json({
      code: 429,
      message: '请求过于频繁，请稍后再试',
      data: null,
      retryAfter: 60,
      timestamp: new Date().toISOString(),
    })
  },
})

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevelopment ? 999 : 10,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  handler: (req, res) => {
    logger.warn(`AI rate limit exceeded for user: ${req.user?.id || req.ip}`)
    res.status(429).json({
      code: 429,
      message: 'AI调用过于频繁，请等待1分钟后重试',
      data: null,
      timestamp: new Date().toISOString(),
    })
  },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 999 : 5,
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.originalUrl,
    })
    res.status(429).json({
      code: 429,
      message: '登录尝试次数过多，请15分钟后再试',
      data: null,
      timestamp: new Date().toISOString(),
    })
  },
})

export const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDevelopment ? 999 : 3,
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.error(`Strict auth rate limit exceeded for IP: ${req.ip}`, {
      ip: req.ip,
      path: req.originalUrl,
    })
    res.status(429).json({
      code: 429,
      message: '操作过于频繁，请1小时后再试',
      data: null,
      timestamp: new Date().toISOString(),
    })
  },
})
