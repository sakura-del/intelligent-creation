import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from '../database/connection.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { authenticate } from '../middleware/auth.js'
import validate, { schemas } from '../middleware/validator.js'
import { logger } from '../utils/logger.js'

const router = Router()

const promptLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  message: { code: 429, message: '提示词操作频率限制为每分钟30次' },
  standardHeaders: true,
  legacyHeaders: false,
})

const VALID_CATEGORIES = [
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
]

function safeJSONParse(str, fallback = []) {
  if (!str) return fallback
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : fallback
  } catch (error) {
    logger.warn('JSON parse error, using fallback:', {
      error: error.message,
      sample: String(str).substring(0, 100),
    })
    return fallback
  }
}

function resolvePromptVariables(content, variableValues) {
  let resolved = content
  const varMap = variableValues || {}
  const regex = /\{\{(\w+)\}\}/g
  resolved = resolved.replace(regex, (match, varName) => {
    if (varMap[varName] !== undefined && varMap[varName] !== '') {
      return varMap[varName]
    }
    return match
  })
  return resolved
}

function extractVariableNames(content) {
  const regex = /\{\{(\w+)\}\}/g
  const names = new Set()
  let match
  while ((match = regex.exec(content)) !== null) {
    names.add(match[1])
  }
  return Array.from(names)
}

function formatPromptRow(p) {
  return {
    ...p,
    tags: safeJSONParse(p.tags),
    variables: safeJSONParse(p.variables),
    scene_tags: safeJSONParse(p.scene_tags),
  }
}

router.get('/', authenticate, validate(schemas.pagination, 'query'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      search,
      is_template,
      is_public,
      sort_by = 'create_time',
      sort_order = 'DESC',
      user_id,
      scene,
    } = req.query

    const offset = (page - 1) * limit
    const userId = parseInt(user_id) || req.user.id
    const isAdmin = req.user.role === 'admin'

    let whereClause = `WHERE p.status != 'deleted'`
    const params = []

    if (category && VALID_CATEGORIES.includes(category)) {
      whereClause += ` AND p.category = ?`
      params.push(category)
    }

    if (search) {
      whereClause += ` AND (p.title LIKE ? OR p.content LIKE ? OR p.description LIKE ?)`
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    if (is_template !== undefined) {
      whereClause += ` AND p.is_template = ?`
      params.push(parseInt(is_template))
    }

    if (is_public === 'true' || is_public === true) {
      whereClause += ` AND p.is_public = 1`
    } else if (!isAdmin) {
      whereClause += ` AND (p.user_id = ? OR p.is_public = 1)`
      params.push(userId)
    }

    if (user_id && !isAdmin && parseInt(user_id) !== req.user.id) {
      whereClause += ` AND p.is_public = 1`
    }

    if (scene) {
      whereClause += ` AND (p.scene_tags LIKE ? OR p.category = ?)`
      params.push(`%"${scene}"%`, scene)
    }

    const validSortFields = ['create_time', 'update_time', 'use_count', 'avg_rating', 'title']
    const sortBy = validSortFields.includes(sort_by) ? sort_by : 'create_time'
    const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM prompts p ${whereClause}`,
      params,
    )
    const total = countResult[0]?.total || 0

    const prompts = await db.query(
      `SELECT p.*, u.username as author_name, u.avatar as author_avatar,
                (SELECT COUNT(*) FROM user_works WHERE prompt_id = p.id) as work_count
         FROM prompts p
         LEFT JOIN users u ON p.user_id = u.id
         ${whereClause}
         ORDER BY p.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
    )

    const categories = await db.query(
      `SELECT category, COUNT(*) as count
         FROM prompts
         WHERE status != 'deleted' AND is_public = 1
         GROUP BY category
         ORDER BY count DESC`,
    )

    successResponse(res, {
      items: prompts.map(formatPromptRow),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
      categories: categories.map((c) => ({ value: c.category, count: c.count })),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/templates', authenticate, async (req, res, next) => {
  try {
    const { category } = req.query

    let whereClause = `WHERE p.status = 'published' AND p.is_template = 1 AND p.is_public = 1`
    const params = []

    if (category && VALID_CATEGORIES.includes(category)) {
      whereClause += ` AND p.category = ?`
      params.push(category)
    }

    const templates = await db.query(
      `SELECT p.* FROM prompts p ${whereClause} ORDER BY p.use_count DESC, p.avg_rating DESC LIMIT 50`,
      params,
    )

    successResponse(res, {
      templates: templates.map(formatPromptRow),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/recommend', authenticate, async (req, res, next) => {
  try {
    const { category, scene, limit = 6 } = req.query
    const userId = req.user.id
    const maxResults = Math.min(parseInt(limit), 20)

    let whereClause = `WHERE p.status = 'published' AND p.is_public = 1 AND p.user_id != ?`
    const params = [userId]

    if (category && VALID_CATEGORIES.includes(category)) {
      whereClause += ` AND p.category = ?`
      params.push(category)
    }

    if (scene) {
      whereClause += ` AND (p.scene_tags LIKE ? OR p.category = ?)`
      params.push(`%"${scene}"%`, scene)
    }

    const recentUsed = await db.query(
      `SELECT prompt_id, COUNT(*) as use_count FROM user_works
       WHERE user_id = ? AND prompt_id IS NOT NULL
       GROUP BY prompt_id ORDER BY use_count DESC LIMIT 5`,
      [userId],
    )

    const recentCategories = recentUsed.map((r) => r.prompt_id)

    let recommended = []

    if (recentCategories.length > 0 && !category && !scene) {
      const recentPrompts = await db.query(
        `SELECT category FROM prompts WHERE id IN (?) AND status != 'deleted'`,
        [recentCategories],
      )
      const topCategories = [...new Set(recentPrompts.map((p) => p.category))].slice(0, 3)

      if (topCategories.length > 0) {
        const catPlaceholders = topCategories.map(() => '?').join(',')
        recommended = await db.query(
          `SELECT p.*, u.username as author_name
           FROM prompts p
           LEFT JOIN users u ON p.user_id = u.id
           WHERE p.status = 'published' AND p.is_public = 1
             AND p.category IN (${catPlaceholders})
             AND p.user_id != ?
           ORDER BY p.avg_rating DESC, p.use_count DESC
           LIMIT ?`,
          [...topCategories, userId, maxResults],
        )
      }
    }

    if (recommended.length < maxResults) {
      const remaining = maxResults - recommended.length
      const excludeIds = recommended.map((r) => r.id)
      let excludeClause = ''
      const excludeParams = []
      if (excludeIds.length > 0) {
        excludeClause = ` AND p.id NOT IN (${excludeIds.map(() => '?').join(',')})`
        excludeParams.push(...excludeIds)
      }

      const popular = await db.query(
        `SELECT p.*, u.username as author_name
         FROM prompts p
         LEFT JOIN users u ON p.user_id = u.id
         ${whereClause}${excludeClause}
         ORDER BY p.use_count DESC, p.avg_rating DESC
         LIMIT ?`,
        [...params, ...excludeParams, remaining],
      )

      recommended = [...recommended, ...popular]
    }

    successResponse(res, {
      recommendations: recommended.slice(0, maxResults).map(formatPromptRow),
      reason: category || scene ? 'category_match' : 'usage_based',
    })
  } catch (error) {
    next(error)
  }
})

router.get('/scenes', authenticate, async (req, res, next) => {
  try {
    const prompts = await db.query(
      `SELECT scene_tags FROM prompts WHERE status = 'published' AND is_public = 1 AND scene_tags IS NOT NULL`,
    )

    const sceneSet = new Set()
    prompts.forEach((p) => {
      const tags = safeJSONParse(p.scene_tags, [])
      tags.forEach((tag) => sceneSet.add(tag))
    })

    const scenes = Array.from(sceneSet)
      .sort()
      .map((name) => ({ name, label: name }))

    successResponse(res, { scenes })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [prompt] = await db.query(
      `SELECT p.*, u.username as author_name, u.avatar as author_avatar
       FROM prompts p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ? AND p.status != 'deleted'`,
      [id],
    )

    if (!prompt) {
      return errorResponse(res, '提示词不存在', 404)
    }

    if (prompt.user_id !== req.user.id && !prompt.is_public && req.user.role !== 'admin') {
      return errorResponse(res, '无权访问此提示词', 403)
    }

    const versions = await db.query(
      `SELECT id, version, title, change_log, create_time FROM prompts WHERE parent_id = ? OR id = ? ORDER BY version ASC`,
      [id, id],
    )

    const usageStats = await db.query(
      `SELECT COUNT(*) as totalUses FROM user_works WHERE prompt_id = ?`,
      [id],
    )

    let myRating = null
    try {
      const [ratingRow] = await db.query(
        'SELECT rating, feedback FROM prompt_ratings WHERE prompt_id = ? AND user_id = ?',
        [id, req.user.id],
      )
      if (ratingRow) {
        myRating = { rating: ratingRow.rating, feedback: ratingRow.feedback || '' }
      }
    } catch {
      // eslint-disable-line no-empty -- table may not exist
      // prompt_ratings table may not exist yet
    }

    const recentRatings = await db
      .query(
        `SELECT pr.rating, pr.feedback, pr.create_time, u.username
       FROM prompt_ratings pr
       LEFT JOIN users u ON pr.user_id = u.id
       WHERE pr.prompt_id = ?
       ORDER BY pr.create_time DESC LIMIT 10`,
        [id],
      )
      .catch(() => [])

    await db.query('UPDATE prompts SET use_count = use_count + 1 WHERE id = ?', [id])

    successResponse(res, {
      ...formatPromptRow(prompt),
      versions,
      myRating,
      recentRatings,
      stats: {
        totalUses: usageStats[0]?.totalUses || 0,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/resolve', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const { variables } = req.body

    if (!variables || typeof variables !== 'object') {
      return errorResponse(res, '请提供变量值对象', 400)
    }

    const [prompt] = await db.query('SELECT * FROM prompts WHERE id = ? AND status != "deleted"', [
      id,
    ])

    if (!prompt) {
      return errorResponse(res, '提示词不存在', 404)
    }

    if (prompt.user_id !== req.user.id && !prompt.is_public && req.user.role !== 'admin') {
      return errorResponse(res, '无权访问此提示词', 403)
    }

    const definedVars = safeJSONParse(prompt.variables, [])
    const missingRequired = definedVars
      .filter((v) => v.required && (!variables[v.name] || variables[v.name].trim() === ''))
      .map((v) => v.name)

    if (missingRequired.length > 0) {
      return errorResponse(res, `必填变量未提供值: ${missingRequired.join(', ')}`, 400)
    }

    const resolved = resolvePromptVariables(prompt.content, variables)
    const unresolved = extractVariableNames(resolved)

    successResponse(res, {
      resolvedContent: resolved,
      unresolvedVariables: unresolved,
      allResolved: unresolved.length === 0,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:id/versions/:versionId', authenticate, async (req, res, next) => {
  try {
    const { id, versionId } = req.params

    const [current] = await db.query('SELECT * FROM prompts WHERE id = ? AND status != "deleted"', [
      id,
    ])
    if (!current) {
      return errorResponse(res, '提示词不存在', 404)
    }

    if (current.user_id !== req.user.id && !current.is_public && req.user.role !== 'admin') {
      return errorResponse(res, '无权访问此提示词', 403)
    }

    const [version] = await db.query('SELECT * FROM prompts WHERE id = ? AND status != "deleted"', [
      versionId,
    ])

    if (!version) {
      return errorResponse(res, '版本不存在', 404)
    }

    const isRelated =
      version.id === current.id ||
      version.parent_id === current.id ||
      current.parent_id === version.id
    if (!isRelated) {
      return errorResponse(res, '该版本与当前提示词无关', 400)
    }

    successResponse(res, {
      version: formatPromptRow(version),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:id/diff', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const { from, to } = req.query

    const [current] = await db.query('SELECT * FROM prompts WHERE id = ? AND status != "deleted"', [
      id,
    ])
    if (!current) {
      return errorResponse(res, '提示词不存在', 404)
    }

    if (current.user_id !== req.user.id && !current.is_public && req.user.role !== 'admin') {
      return errorResponse(res, '无权访问此提示词', 403)
    }

    let fromVersion = current
    let toVersion = current

    if (from) {
      const [fromRow] = await db.query(
        'SELECT * FROM prompts WHERE id = ? AND status != "deleted"',
        [from],
      )
      if (!fromRow) return errorResponse(res, '来源版本不存在', 404)
      fromVersion = fromRow
    } else {
      const [prevVersion] = await db.query(
        'SELECT * FROM prompts WHERE parent_id = ? AND status != "deleted" ORDER BY version DESC LIMIT 1',
        [id],
      )
      if (prevVersion) fromVersion = prevVersion
    }

    if (to) {
      const [toRow] = await db.query('SELECT * FROM prompts WHERE id = ? AND status != "deleted"', [
        to,
      ])
      if (!toRow) return errorResponse(res, '目标版本不存在', 404)
      toVersion = toRow
    }

    const fields = ['title', 'content', 'description', 'category', 'tags', 'variables']
    const diff = fields
      .map((field) => {
        const fromVal =
          typeof fromVersion[field] === 'string'
            ? fromVersion[field]
            : JSON.stringify(fromVersion[field])
        const toVal =
          typeof toVersion[field] === 'string' ? toVersion[field] : JSON.stringify(toVersion[field])
        return {
          field,
          from: fromVal || '',
          to: toVal || '',
          changed: fromVal !== toVal,
        }
      })
      .filter((d) => d.changed)

    successResponse(res, {
      fromVersion: {
        id: fromVersion.id,
        version: fromVersion.version,
        title: fromVersion.title,
        change_log: fromVersion.change_log,
        create_time: fromVersion.create_time,
      },
      toVersion: {
        id: toVersion.id,
        version: toVersion.version,
        title: toVersion.title,
        change_log: toVersion.change_log,
        create_time: toVersion.create_time,
      },
      diff,
      hasChanges: diff.length > 0,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/:id/rollback/:versionId', authenticate, promptLimiter, async (req, res, next) => {
  try {
    const { id, versionId } = req.params

    const [current] = await db.query('SELECT * FROM prompts WHERE id = ? AND status != "deleted"', [
      id,
    ])
    if (!current) {
      return errorResponse(res, '提示词不存在', 404)
    }

    if (current.user_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, '只有作者才能回滚此提示词', 403)
    }

    const [targetVersion] = await db.query(
      'SELECT * FROM prompts WHERE id = ? AND status != "deleted"',
      [versionId],
    )
    if (!targetVersion) {
      return errorResponse(res, '目标版本不存在', 404)
    }

    const newVersion = current.version + 1

    await db.query(
      `INSERT INTO prompts (user_id, title, content, description, category, tags, variables, scene_tags, difficulty, is_template, is_public, version, parent_id, change_log, status)
       SELECT user_id, title, content, description, category, tags, variables, scene_tags, difficulty, is_template, is_public, version, ?, change_log, status
       FROM prompts WHERE id = ?`,
      [id, id],
    )

    const safeJSONStr = (val) => {
      if (val === undefined || val === null) return null
      if (typeof val === 'string') return val
      return JSON.stringify(val)
    }

    await db.query(
      `UPDATE prompts SET
        title = ?,
        content = ?,
        description = ?,
        category = ?,
        tags = ?,
        variables = ?,
        scene_tags = ?,
        difficulty = ?,
        is_template = ?,
        is_public = ?,
        version = ?,
        change_log = ?,
        update_time = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        targetVersion.title,
        targetVersion.content,
        targetVersion.description,
        targetVersion.category,
        safeJSONStr(targetVersion.tags),
        safeJSONStr(targetVersion.variables),
        safeJSONStr(targetVersion.scene_tags),
        targetVersion.difficulty || 'beginner',
        targetVersion.is_template,
        targetVersion.is_public,
        newVersion,
        `回滚到版本 v${targetVersion.version}`,
        id,
      ],
    )

    logger.info(
      `Prompt ${id} rolled back to v${targetVersion.version} (new v${newVersion}) by user ${req.user.id}`,
    )

    successResponse(
      res,
      { id: parseInt(id), version: newVersion, rolledBackTo: targetVersion.version },
      '回滚成功',
    )
  } catch (error) {
    next(error)
  }
})

router.post('/', authenticate, promptLimiter, async (req, res, next) => {
  try {
    const {
      title,
      content,
      description,
      category,
      tags,
      variables,
      is_template,
      is_public,
      scene_tags,
      difficulty,
    } = req.body

    if (!title?.trim() || !content?.trim()) {
      return errorResponse(res, '标题和内容不能为空', 400)
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return errorResponse(res, '无效的分类', 400)
    }

    const extractedVars = extractVariableNames(content)
    let finalVariables = variables
    if (!finalVariables && extractedVars.length > 0) {
      finalVariables = extractedVars.map((name) => ({
        name,
        description: '',
        default_value: '',
        required: false,
      }))
    }

    const result = await db.query(
      `INSERT INTO prompts (user_id, title, content, description, category, tags, variables, scene_tags, difficulty, is_template, is_public, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      [
        req.user.id,
        title.trim(),
        content.trim(),
        description?.trim() || '',
        category,
        tags ? JSON.stringify(tags) : null,
        finalVariables ? JSON.stringify(finalVariables) : null,
        scene_tags ? JSON.stringify(scene_tags) : null,
        difficulty || 'beginner',
        is_template ? 1 : 0,
        is_public ? 1 : 0,
      ],
    )

    logger.info(`Prompt created by user ${req.user.id}`, { promptId: result.insertId, category })

    successResponse(res, { id: result.insertId }, '提示词创建成功', 201)
  } catch (error) {
    next(error)
  }
})

router.put('/:id', authenticate, promptLimiter, async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      title,
      content,
      description,
      category,
      tags,
      variables,
      is_template,
      is_public,
      status,
      change_log,
      scene_tags,
      difficulty,
    } = req.body

    const [existing] = await db.query('SELECT * FROM prompts WHERE id = ?', [id])

    if (!existing) {
      return errorResponse(res, '提示词不存在', 404)
    }

    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, '只有作者才能编辑此提示词', 403)
    }

    const newVersion = existing.version + 1

    await db.query(
      `INSERT INTO prompts (user_id, title, content, description, category, tags, variables, scene_tags, difficulty, is_template, is_public, version, parent_id, change_log, status)
       SELECT user_id, title, content, description, category, tags, variables, scene_tags, difficulty, is_template, is_public, version, ?, change_log, status
       FROM prompts WHERE id = ?`,
      [id, id],
    )

    const safeJSONStringify = (val) => {
      if (val === undefined || val === null) return null
      if (typeof val === 'string') return val
      return JSON.stringify(val)
    }

    const existingTags = safeJSONStringify(existing.tags)
    const existingVariables = safeJSONStringify(existing.variables)
    const existingSceneTags = safeJSONStringify(existing.scene_tags)

    await db.query(
      `UPDATE prompts SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        tags = ?,
        variables = ?,
        scene_tags = ?,
        difficulty = COALESCE(?, difficulty),
        is_template = COALESCE(?, is_template),
        is_public = COALESCE(?, is_public),
        status = COALESCE(?, status),
        version = ?,
        change_log = ?,
        update_time = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title?.trim() || null,
        content?.trim() || null,
        description?.trim() || null,
        category || null,
        tags ? JSON.stringify(tags) : existingTags,
        variables ? JSON.stringify(variables) : existingVariables,
        scene_tags ? JSON.stringify(scene_tags) : existingSceneTags,
        difficulty || null,
        is_template !== undefined ? (is_template ? 1 : 0) : null,
        is_public !== undefined ? (is_public ? 1 : 0) : null,
        status || null,
        newVersion,
        change_log || `更新到版本 v${newVersion}`,
        id,
      ],
    )

    logger.info(`Prompt ${id} updated to v${newVersion} by user ${req.user.id}`)

    successResponse(res, { id: parseInt(id), version: newVersion }, '提示词更新成功')
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [prompt] = await db.query('SELECT * FROM prompts WHERE id = ?', [id])

    if (!prompt) {
      return errorResponse(res, '提示词不存在', 404)
    }

    if (prompt.user_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, '只有作者或管理员可以删除此提示词', 403)
    }

    await db.query("UPDATE prompts SET status = 'deleted' WHERE id = ?", [id])
    await db.query("UPDATE user_works SET status = 'archived' WHERE prompt_id = ?", [id])

    logger.info(`Prompt ${id} soft-deleted by user ${req.user.id}`)

    successResponse(res, null, '提示词已删除')
  } catch (error) {
    next(error)
  }
})

router.post('/:id/fork', authenticate, promptLimiter, async (req, res, next) => {
  try {
    const { id } = req.params

    const [original] = await db.query(
      'SELECT * FROM prompts WHERE id = ? AND status != "deleted"',
      [id],
    )

    if (!original) {
      return errorResponse(res, '原提示词不存在', 404)
    }

    if (!original.is_public && original.user_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, '只能Fork公开的提示词', 403)
    }

    const result = await db.query(
      `INSERT INTO prompts (user_id, title, content, description, category, tags, variables, scene_tags, difficulty, is_template, is_public, parent_id, status)
       VALUES (?, CONCAT(?, ' (Fork)'), ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'draft')`,
      [
        req.user.id,
        original.title,
        original.content,
        original.description,
        original.category,
        original.tags,
        original.variables,
        original.scene_tags,
        original.difficulty || 'beginner',
        id,
      ],
    )

    await db.query('UPDATE prompts SET use_count = use_count + 1 WHERE id = ?', [id])

    logger.info(`Prompt ${id} forked by user ${req.user.id} -> new ID: ${result.insertId}`)

    successResponse(res, { id: result.insertId, parentId: id }, 'Fork成功，已创建副本')
  } catch (error) {
    next(error)
  }
})

router.post('/:id/rate', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const { rating, feedback } = req.body

    if (!rating || rating < 1 || rating > 5) {
      return errorResponse(res, '评分必须在1-5之间', 400)
    }

    const [prompt] = await db.query('SELECT * FROM prompts WHERE id = ? AND status != "deleted"', [
      id,
    ])

    if (!prompt) {
      return errorResponse(res, '提示词不存在', 404)
    }

    const [existingRating] = await db.query(
      'SELECT * FROM prompt_ratings WHERE prompt_id = ? AND user_id = ?',
      [id, req.user.id],
    )

    if (existingRating) {
      await db.query(
        'UPDATE prompt_ratings SET rating = ?, feedback = ?, update_time = NOW() WHERE id = ?',
        [rating, feedback || existingRating.feedback, existingRating.id],
      )
    } else {
      await db.query(
        'INSERT INTO prompt_ratings (prompt_id, user_id, rating, feedback) VALUES (?, ?, ?, ?)',
        [id, req.user.id, rating, feedback || null],
      )
    }

    const [stats] = await db.query(
      'SELECT AVG(rating) as avgRating, COUNT(*) as count FROM prompt_ratings WHERE prompt_id = ?',
      [id],
    )

    await db.query('UPDATE prompts SET avg_rating = ?, rating_count = ? WHERE id = ?', [
      parseFloat(stats.avgRating).toFixed(1),
      stats.count,
      id,
    ])

    successResponse(
      res,
      { avgRating: parseFloat(stats.avgRating), ratingCount: stats.count },
      '评分成功',
    )
  } catch (error) {
    if (error.message?.includes("doesn't exist")) {
      await db.query(
        `CREATE TABLE IF NOT EXISTS prompt_ratings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          prompt_id INT NOT NULL,
          user_id INT NOT NULL,
          rating TINYINT NOT NULL,
          feedback TEXT,
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_prompt_user (prompt_id, user_id),
          FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提示词评分表'`,
      )
    }
    next(error)
  }
})

router.get('/:id/my-rating', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [rating] = await db.query(
      'SELECT rating, feedback, create_time, update_time FROM prompt_ratings WHERE prompt_id = ? AND user_id = ?',
      [id, req.user.id],
    )

    successResponse(res, {
      myRating: rating
        ? { rating: rating.rating, feedback: rating.feedback || '', updateTime: rating.update_time }
        : null,
    })
  } catch (error) {
    if (error.message?.includes("doesn't exist")) {
      successResponse(res, { myRating: null })
      return
    }
    next(error)
  }
})

export default router
