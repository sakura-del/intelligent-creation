import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../database/connection.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { logger } from '../utils/logger.js'
import { authenticate, generateTokens, addToBlacklist, sanitizeInput } from '../middleware/auth.js'
import { authLimiter, strictAuthLimiter } from '../middleware/rateLimiter.js'
import validate, { schemas } from '../middleware/validator.js'
const router = Router()
router.post('/register', authLimiter, sanitizeInput, validate(schemas.register), async (req, res, next) => {
  try {
    const { username, password, nickname, email } = req.body
    let existingUsers
    try {
      existingUsers = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [
        username,
        email,
      ])
    } catch (dbError) {
      logger.error('Database query error during registration:', dbError.message)
      if (dbError.message?.includes("doesn't exist")) {
        return errorResponse(
          res,
          '数据库表不存在，请运行 npm run migrate 创建数据表',
          500,
        )
      }
      return errorResponse(res, '数据库连接失败，请检查配置', 500)
    }
    if (existingUsers && existingUsers.length > 0) {
      return errorResponse(res, '用户名或邮箱已被注册', 409)
    }
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    const result = await db.query(
      `INSERT INTO users (username, password, nickname, email, avatar)
       VALUES (?, ?, ?, ?, '')`,
      [username, hashedPassword, nickname, email],
    )
    const user = {
      id: result.insertId,
      username,
      nickname,
      email,
      role: 'user',
    }
    logger.info(`New user registered: ${username}`)
    const tokens = generateTokens(user)
    successResponse(
      res,
      {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user,
      },
      '注册成功',
      201,
    )
  } catch (error) {
    next(error)
  }
})
router.post('/login', authLimiter, sanitizeInput, validate(schemas.login), async (req, res, next) => {
  try {
    const { username, password } = req.body
    const users = await db.query('SELECT * FROM users WHERE username = ? AND status = 1', [
      username,
    ])
    if (!users || !users.length) {
      logger.warn(`Login attempt with non-existent username: ${username}`, { ip: req.ip })
      return errorResponse(res, '用户名或密码错误', 401)
    }
    const user = users[0]
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      logger.warn(`Login attempt with wrong password for user: ${username}`, { ip: req.ip })
      return errorResponse(res, '用户名或密码错误', 401)
    }
    await db.query('UPDATE users SET last_login_time = NOW() WHERE id = ?', [user.id])
    const userData = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      email: user.email,
      avatar: user.avatar,
      ai_count: user.ai_count,
      role: user.role,
    }
    const tokens = generateTokens(userData)
    logger.info(`User logged in: ${username}`, { userId: user.id, ip: req.ip })
    successResponse(
      res,
      {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: userData,
      },
      '登录成功',
    )
  } catch (error) {
    next(error)
  }
})
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.token
    if (token) {
      try {
        const decoded = jwt.decode(token)
        const expiresIn = (decoded.exp - Math.floor(Date.now() / 1000)) * 1000
        if (expiresIn > 0) {
          addToBlacklist(token, expiresIn)
        }
      } catch {
        addToBlacklist(token, 24 * 60 * 60 * 1000)
      }
    }
    logger.info(`User logged out: ${req.user.id}`)
    successResponse(res, null, '退出登录成功')
  } catch (error) {
    next(error)
  }
})
router.get('/info', authenticate, async (req, res, next) => {
  try {
    successResponse(res, req.user)
  } catch (error) {
    next(error)
  }
})
router.post('/update', authenticate, sanitizeInput, validate(schemas.updateUser), async (req, res, next) => {
  try {
    const { nickname, email, avatar } = req.body
    const updates = {}
    if (nickname !== undefined) updates.nickname = nickname
    if (email !== undefined) updates.email = email
    if (avatar !== undefined) updates.avatar = avatar
    if (Object.keys(updates).length === 0) {
      return errorResponse(res, '没有需要更新的字段')
    }
    await db.query(`UPDATE users SET ? WHERE id = ?`, [updates, req.user.id])
    logger.info(`User ${req.user.id} updated profile`)
    successResponse(res, null, '信息更新成功')
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return errorResponse(res, '邮箱已被其他用户使用', 409)
    }
    next(error)
  }
})
router.post('/refresh-token', sanitizeInput, async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return errorResponse(res, '缺少刷新Token', 400)
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    if (decoded.type !== 'refresh') {
      return errorResponse(res, '无效的刷新Token', 401)
    }
    const users = await db.query(
      'SELECT id, username, nickname, email, avatar, role FROM users WHERE id = ? AND status = 1',
      [decoded.userId],
    )
    if (!users || !users.length) {
      return errorResponse(res, '用户不存在或已被禁用', 401)
    }
    const tokens = generateTokens(users[0])
    successResponse(
      res,
      {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      'Token刷新成功',
    )
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return errorResponse(res, '刷新Token无效或已过期', 401)
    }
    next(error)
  }
})
router.post(
  '/change-password',
  authenticate,
  strictAuthLimiter,
  sanitizeInput,
  async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body
      if (!oldPassword || !newPassword) {
        return errorResponse(res, '请提供原密码和新密码', 400)
      }
      if (oldPassword === newPassword) {
        return errorResponse(res, '新密码不能与原密码相同', 400)
      }
      if (newPassword.length < 8) {
        return errorResponse(res, '新密码长度不能少于8位', 400)
      }
      if (!/^(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
        return errorResponse(res, '新密码必须包含字母和数字', 400)
      }
      const users = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id])
      if (!users || !users.length) {
        return errorResponse(res, '用户不存在', 404)
      }
      const isValid = await bcrypt.compare(oldPassword, users[0].password)
      if (!isValid) {
        logger.warn(`Wrong old password attempt for user: ${req.user.id}`, { ip: req.ip })
        return errorResponse(res, '原密码错误', 400)
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 12)
      await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id])
      if (req.token) {
        try {
          const decoded = jwt.decode(req.token)
          const expiresIn = (decoded.exp - Math.floor(Date.now() / 1000)) * 1000
          if (expiresIn > 0) {
            addToBlacklist(req.token, expiresIn)
          }
        } catch {
          addToBlacklist(req.token, 24 * 60 * 60 * 1000)
        }
      }
      logger.info(`User ${req.user.id} changed password`, { ip: req.ip })
      successResponse(res, null, '密码修改成功，请重新登录')
    } catch (error) {
      next(error)
    }
  },
)
router.get('/statistics', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let todayAiCalls = 0
    let totalContentGenerated = 0
    let appCount = 0
    let resumeCount = 0
    let consecutiveDays = 0
    let chartData = []
    try {
      const [todayResult] = await db.query(
        `SELECT COUNT(*) as count FROM ai_histories
         WHERE user_id = ? AND create_time >= ?${await checkColumnExists('ai_histories', 'is_deleted') ? ' AND is_deleted = 0' : ''}`,
        [userId, today],
      )
      todayAiCalls = todayResult?.count || 0
    } catch (e) {
      logger.warn('查询今日AI调用次数失败:', e.message)
    }
    try {
      const [totalResult] = await db.query(
        `SELECT COUNT(*) as count FROM ai_histories
         WHERE user_id = ?${await checkColumnExists('ai_histories', 'is_deleted') ? ' AND is_deleted = 0' : ''}`,
        [userId],
      )
      totalContentGenerated = totalResult?.count || 0
    } catch (e) {
      logger.warn('查询内容生成总数失败:', e.message)
    }
    try {
      const [appCountResult] = await db.query(
        'SELECT COUNT(*) as count FROM applications WHERE user_id = ?',
        [userId],
      )
      appCount = appCountResult?.count || 0
    } catch (e) {
      logger.warn('查询应用数失败:', e.message)
    }
    try {
      const [resumeCountResult] = await db.query(
        'SELECT COUNT(*) as count FROM resumes WHERE user_id = ?',
        [userId],
      )
      resumeCount = resumeCountResult?.count || 0
    } catch (e) {
      logger.warn('查询简历数失败:', e.message)
    }
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const chartResult = await db.query(
        `SELECT DATE(create_time) as date, COUNT(*) as count
         FROM ai_histories
         WHERE user_id = ? AND create_time >= ?${await checkColumnExists('ai_histories', 'is_deleted') ? ' AND is_deleted = 0' : ''}
         GROUP BY DATE(create_time)
         ORDER BY date DESC
         LIMIT 30`,
        [userId, thirtyDaysAgo],
      )
      chartData = (chartResult || []).map((item) => ({
        label: item.date,
        value: item.count,
        isToday: item.date === new Date().toISOString().split('T')[0],
      }))
    } catch (e) {
      logger.warn('查询图表数据失败:', e.message)
    }
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const [daysResult] = await db.query(
        `SELECT COUNT(DISTINCT DATE(create_time)) as streak
         FROM ai_histories
         WHERE user_id = ? AND create_time >= ?${await checkColumnExists('ai_histories', 'is_deleted') ? ' AND is_deleted = 0' : ''}`,
        [userId, sevenDaysAgo],
      )
      consecutiveDays = daysResult?.streak || 0
    } catch (e) {
      logger.warn('查询连续天数失败:', e.message)
    }
    const statistics = {
      todayAiCalls,
      totalContentGenerated,
      appCount,
      resumeCount,
      consecutiveDays,
      chartData,
    }
    successResponse(res, statistics)
  } catch (error) {
    logger.error('获取用户统计数据失败:', error.message)
    return successResponse(res, {
      todayAiCalls: 0,
      totalContentGenerated: 0,
      appCount: 0,
      resumeCount: 0,
      consecutiveDays: 0,
      chartData: [],
    })
  }
})
async function checkColumnExists(tableName, columnName) {
  try {
    const [result] = await db.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [tableName, columnName],
    )
    return result?.count > 0
  } catch {
    return false
  }
}
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 20, type } = req.query
    const offset = (page - 1) * limit
    const hasIsDeleted = await checkColumnExists('ai_histories', 'is_deleted')
    let whereClause = hasIsDeleted ? 'WHERE user_id = ? AND is_deleted = 0' : 'WHERE user_id = ?'
    const params = [userId]
    if (type && type !== 'all') {
      whereClause += ' AND type = ?'
      params.push(type)
    }
    const [histories] = await db.query(
      `SELECT id, type, title, prompt, style, length_type, model_used,
              token_count, generation_time_ms, is_favorite, create_time
       FROM ai_histories
       ${whereClause}
       ORDER BY create_time DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
    )
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM ai_histories ${whereClause}`,
      params,
    )
    const formattedHistories = (histories || []).map((h) => ({
      id: h.id,
      date: h.create_time,
      type: h.type,
      typeName: getTypeName(h.type),
      typeColor: getTypeColor(h.type),
      title: h.title || generateTitle(h.prompt),
      status: '完成',
      metadata: {
        modelUsed: h.model_used,
        tokenCount: h.token_count,
        generationTime: h.generation_time_ms,
        style: h.style,
        lengthType: h.length_type,
      },
    }))
    successResponse(res, {
      list: formattedHistories,
      total: countResult?.total || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    })
  } catch (error) {
    logger.error('获取用户历史记录失败:', error.message)
    return successResponse(res, {
      list: [],
      total: 0,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    })
  }
})
function getTypeName(type) {
  const typeMap = {
    article: '文章写作',
    marketing: '营销文案',
    social: '社交媒体',
    summary: '内容摘要',
    business: '商业文档',
    creative: '创意写作',
    image: '图片生成',
    code: '代码生成',
    other: '其他',
  }
  return typeMap[type] || type
}
function getTypeColor(type) {
  const colorMap = {
    article: '',
    marketing: 'warning',
    social: 'success',
    summary: 'info',
    business: 'danger',
    creative: '',
    image: 'warning',
    code: '',
    other: 'info',
  }
  return colorMap[type] || ''
}

function generateTitle(prompt) {
  if (!prompt) return '未命名操作'
  return prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt
}

export default router
