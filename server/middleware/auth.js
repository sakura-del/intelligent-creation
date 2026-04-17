import jwt from 'jsonwebtoken'
import { db } from '../database/connection.js'
import { AppError } from './errorHandler.js'
import { errorResponse } from '../utils/response.js'
import { logger } from '../utils/logger.js'

const tokenBlacklist = new Map()

const BLACKLIST_CLEANUP_INTERVAL = 60 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [token, expiry] of tokenBlacklist) {
    if (expiry < now) {
      tokenBlacklist.delete(token)
    }
  }
}, BLACKLIST_CLEANUP_INTERVAL)

export function isTokenBlacklisted(token) {
  const expiry = tokenBlacklist.get(token)
  if (!expiry) return false
  if (expiry < Date.now()) {
    tokenBlacklist.delete(token)
    return false
  }
  return true
}

export function addToBlacklist(token, expiresInMs) {
  tokenBlacklist.set(token, Date.now() + expiresInMs)
}

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('未提供认证Token', 401)
    }

    const token = authHeader.split(' ')[1]

    if (isTokenBlacklisted(token)) {
      return errorResponse(res, 'Token已失效，请重新登录', 401)
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.type === 'refresh') {
      return errorResponse(res, '请使用访问Token而非刷新Token', 401)
    }

    const users = await db.query(
      'SELECT id, username, nickname, email, avatar, role, ai_count, status FROM users WHERE id = ?',
      [decoded.userId],
    )

    if (!users || !users.length) {
      logger.warn(`Authentication failed: User ID ${decoded.userId} not found in database`, {
        userId: decoded.userId,
        username: decoded.username,
        tokenIssuedAt: new Date(decoded.iat * 1000).toISOString(),
      })
      throw new AppError('用户不存在或已被删除，请重新登录', 401)
    }

    if (users[0].status === 0) {
      return errorResponse(res, '账号已被禁用，请联系管理员', 403)
    }

    req.user = users[0]
    req.token = token
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, '无效的Token', 401)
    }
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token已过期', 401)
    }
    next(error)
  }
}

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.split(' ')[1]

    if (isTokenBlacklisted(token)) {
      return next()
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const users = await db.query(
      'SELECT id, username, nickname, email, avatar, role, ai_count, status FROM users WHERE id = ?',
      [decoded.userId],
    )

    if (users && users.length && users[0].status !== 0) {
      req.user = users[0]
      req.token = token
    }

    next()
  } catch {
    next()
  }
}

export const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, username: user.username, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
  )

  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
  )

  return { accessToken, refreshToken }
}

export const checkAICount = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const result = await db.query(
      `SELECT COUNT(*) as count FROM ai_histories
       WHERE user_id = ? AND DATE(create_time) = ?`,
      [req.user.id, today],
    )

    const roleLimits = {
      admin: 9999,
      vip: 500,
      user: 100,
    }
    const dailyLimit = roleLimits[req.user.role] || parseInt(process.env.AI_DAILY_LIMIT_PER_USER) || 100

    if (result && result[0] && result[0].count >= dailyLimit) {
      return errorResponse(res, `今日AI调用次数已达上限(${dailyLimit}次)，请明天再试`, 403)
    }

    next()
  } catch (error) {
    next(error)
  }
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, '未授权访问', 401)
    }

    if (roles.length && !roles.includes(req.user.role)) {
      logger.warn(`Authorization failed: User ${req.user.id} with role '${req.user.role}' attempted to access resource requiring roles: [${roles.join(', ')}]`)
      return errorResponse(res, '权限不足', 403)
    }

    next()
  }
}

export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj
    const sanitized = Array.isArray(obj) ? [] : {}
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim()
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitized[key] = sanitize(obj[key])
      } else {
        sanitized[key] = obj[key]
      }
    }
    return sanitized
  }

  if (req.body) req.body = sanitize(req.body)
  if (req.query) req.query = sanitize(req.query)
  if (req.params) req.params = sanitize(req.params)

  next()
}

export const authMiddleware = authenticate
export const adminOnly = authorize('admin')
