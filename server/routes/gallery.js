import { Router } from 'express'
import crypto from 'crypto'
import { db } from '../database/connection.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { authenticate, optionalAuth } from '../middleware/auth.js'
import validate, { schemas } from '../middleware/validator.js'
import fileStorage from '../services/fileStorage.js'
import { logger } from '../utils/logger.js'

const router = Router()

function safeJSONParse(str, fallback = null) {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

function formatWorkRow(w) {
  return {
    ...w,
    metadata: safeJSONParse(w.metadata),
    edit_history: safeJSONParse(w.edit_history, []),
    tags: safeJSONParse(w.tags, []),
    fileUrl: `/api/files/${w.file_path}`,
    thumbnailUrl: w.thumbnail_path ? `/api/files/${w.thumbnail_path}` : null,
  }
}

router.get('/', authenticate, validate(schemas.pagination, 'query'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      type,
      is_public,
      category,
      is_favorite,
      search,
      tag,
      sort_by = 'create_time',
      sort_order = 'DESC',
    } = req.query

    const offset = (page - 1) * limit
    const userId = req.user.id

    let whereClause = `WHERE w.user_id = ?`
    const params = [userId]

    if (type && ['image', 'text', 'edited_image'].includes(type)) {
      whereClause += ` AND w.type = ?`
      params.push(type)
    }

    if (is_public !== undefined) {
      whereClause += ` AND w.is_public = ?`
      params.push(is_public === 'true' ? 1 : 0)
    }

    if (category) {
      whereClause += ` AND w.category = ?`
      params.push(category)
    }

    if (is_favorite !== undefined && is_favorite === 'true') {
      whereClause += ` AND w.is_favorite = 1`
    }

    if (search) {
      whereClause += ` AND (w.title LIKE ? OR w.prompt_text LIKE ? OR w.description LIKE ? OR w.tags_text LIKE ?)`
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern, searchPattern)
    }

    if (tag) {
      whereClause += ` AND w.tags_text LIKE ?`
      params.push(`%${tag}%`)
    }

    whereClause += ` AND w.status != 'archived'`

    const validSortFields = [
      'create_time',
      'update_time',
      'view_count',
      'download_count',
      'like_count',
      'title',
    ]
    const sortBy = validSortFields.includes(sort_by) ? sort_by : 'create_time'
    const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM user_works w ${whereClause}`,
      params,
    )
    const total = countResult[0]?.total || 0

    const works = await db.query(
      `SELECT w.*,
                p.title as prompt_title, p.category as prompt_category
         FROM user_works w
         LEFT JOIN prompts p ON w.prompt_id = p.id
         ${whereClause}
         ORDER BY w.${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
    )

    const stats = await db.query(
      `SELECT
          COUNT(*) as total_works,
          COUNT(CASE WHEN type = 'image' THEN 1 END) as images,
          COUNT(CASE WHEN type = 'edited_image' THEN 1 END) as edited_images,
          COUNT(CASE WHEN is_favorite = 1 THEN 1 END) as favorites,
          SUM(file_size) as total_size,
          SUM(view_count) as total_views,
          SUM(download_count) as total_downloads
         FROM user_works
         WHERE user_id = ? AND status != 'archived'`,
      [userId],
    )

    const allTags = await db.query(
      `SELECT tags FROM user_works WHERE user_id = ? AND status != 'archived' AND tags IS NOT NULL`,
      [userId],
    )
    const tagCountMap = {}
    for (const row of allTags) {
      const tags = safeJSONParse(row.tags, [])
      for (const t of tags) {
        tagCountMap[t] = (tagCountMap[t] || 0) + 1
      }
    }
    const popularTags = Object.entries(tagCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }))

    successResponse(res, {
      items: works.map(formatWorkRow),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalWorks: stats[0]?.total_works || 0,
        images: stats[0]?.images || 0,
        editedImages: stats[0]?.edited_images || 0,
        favorites: stats[0]?.favorites || 0,
        totalSize: stats[0]?.total_size || 0,
        totalViews: stats[0]?.total_views || 0,
        totalDownloads: stats[0]?.total_downloads || 0,
      },
      popularTags,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/categories', authenticate, async (req, res, next) => {
  try {
    let categories = []

    try {
      categories = await db.query(
        'SELECT * FROM image_categories WHERE status = 1 ORDER BY sort_order ASC',
      )
    } catch (tableError) {
      if (tableError.message && tableError.message.includes("doesn't exist")) {
        logger.warn('image_categories table not found, using default categories')
        categories = [
          { id: 1, name: '头像', slug: 'avatar', icon: '😊', sort_order: 1, status: 1 },
          { id: 2, name: '人像', slug: 'portrait', icon: '👤', sort_order: 2, status: 1 },
          { id: 3, name: '风景', slug: 'landscape', icon: '🏞️', sort_order: 3, status: 1 },
          { id: 4, name: '动物', slug: 'animal', icon: '🐱', sort_order: 4, status: 1 },
          { id: 5, name: '抽象', slug: 'abstract', icon: '🎨', sort_order: 5, status: 1 },
          { id: 6, name: '动漫', slug: 'anime', icon: '🌸', sort_order: 6, status: 1 },
        ]
      } else {
        throw tableError
      }
    }

    const userCategoryStats = await db
      .query(
        `SELECT category, COUNT(*) as count FROM user_works WHERE user_id = ? AND status != 'archived' GROUP BY category`,
        [req.user.id],
      )
      .catch(() => [])

    const statsMap = {}
    for (const stat of userCategoryStats) {
      if (stat.category) {
        statsMap[stat.category] = stat.count
      }
    }

    successResponse(res, {
      categories: categories.map((c) => ({
        ...c,
        count: statsMap[c.slug] || 0,
      })),
    })
  } catch (error) {
    logger.error('Get categories error:', error)
    next(error)
  }
})

router.get('/tags', authenticate, async (req, res, next) => {
  try {
    const { search } = req.query
    const allTags = await db.query(
      `SELECT tags FROM user_works WHERE user_id = ? AND status != 'archived' AND tags IS NOT NULL`,
      [req.user.id],
    )

    const tagCountMap = {}
    for (const row of allTags) {
      const tags = safeJSONParse(row.tags, [])
      for (const t of tags) {
        if (search && !t.toLowerCase().includes(search.toLowerCase())) continue
        tagCountMap[t] = (tagCountMap[t] || 0) + 1
      }
    }

    const tags = Object.entries(tagCountMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))

    successResponse(res, { tags })
  } catch (error) {
    next(error)
  }
})

router.get('/stats/overview', authenticate, async (req, res, next) => {
  try {
    const stats = await db.query(
      `SELECT
        COUNT(*) as total_works,
        COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_count,
        COUNT(CASE WHEN type = 'image' THEN 1 END) as image_count,
        COUNT(CASE WHEN type = 'edited_image' THEN 1 END) as edited_count,
        COUNT(CASE WHEN is_favorite = 1 THEN 1 END) as favorite_count,
        SUM(file_size) as total_storage,
        SUM(view_count) as total_views,
        SUM(download_count) as total_downloads,
        SUM(like_count) as total_likes,
        SUM(share_count) as total_shares,
        COUNT(CASE WHEN is_public = 1 THEN 1 END) as public_count,
        MAX(create_time) as latest_creation
       FROM user_works
       WHERE user_id = ?`,
      [req.user.id],
    )

    const storageStats = fileStorage.getFileStats()

    successResponse(res, {
      ...stats[0],
      storageStats,
    })
  } catch (error) {
    next(error)
  }
})

router.post('/', authenticate, validate(schemas.gallerySave), async (req, res, next) => {
  try {
    const {
      imageData,
      title,
      description,
      prompt_text,
      prompt_id,
      type = 'image',
      metadata,
      is_public = false,
      category = '',
      tags = [],
      is_favorite = false,
    } = req.body

    const validation = fileStorage.validateBase64(imageData)

    if (!validation.valid) {
      return errorResponse(res, validation.error, 400)
    }

    logger.info(`Saving work to gallery for user ${req.user.id}`, {
      type,
      size: validation.size,
      hasPrompt: !!prompt_id,
      category,
      tagsCount: tags.length,
    })

    const savedFile = await fileStorage.saveImageFromBase64(imageData, {
      userId: req.user.id,
      type,
      prefix: `${req.user.id}_`,
    })

    const result = await db.query(
      `INSERT INTO user_works (
        user_id, type, category, tags, title, description, prompt_id, prompt_text,
        file_path, thumbnail_path, file_size, file_format,
        metadata, is_public, is_favorite, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')`,
      [
        req.user.id,
        type,
        category,
        tags.length > 0 ? JSON.stringify(tags) : null,
        title?.trim() || '',
        description?.trim() || '',
        prompt_id || null,
        prompt_text?.trim() || null,
        savedFile.filePath,
        savedFile.thumbnailPath,
        savedFile.fileSize,
        savedFile.dimensions.format || 'png',
        JSON.stringify({
          ...savedFile.dimensions,
          ...metadata,
        }),
        is_public ? 1 : 0,
        is_favorite ? 1 : 0,
      ],
    )

    logger.info(`Work saved successfully`, {
      workId: result.insertId,
      filePath: savedFile.filePath,
    })

    successResponse(
      res,
      {
        id: result.insertId,
        fileUrl: savedFile.fileUrl,
        thumbnailUrl: savedFile.thumbnailUrl,
        fileSize: savedFile.fileSize,
        dimensions: savedFile.dimensions,
      },
      '作品已保存到画廊',
      201,
    )
  } catch (error) {
    logger.error('Failed to save work:', error)
    next(error)
  }
})

router.post('/batch-delete', authenticate, async (req, res, next) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, '请提供要删除的作品ID列表', 400)
    }

    if (ids.length > 50) {
      return errorResponse(res, '单次最多删除50个作品', 400)
    }

    const works = await db.query(
      `SELECT id, file_path, thumbnail_path, user_id FROM user_works WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    )

    for (const work of works) {
      if (work.user_id !== req.user.id && req.user.role !== 'admin') {
        continue
      }
      await fileStorage.deleteWorkFiles(work)
    }

    const placeholders = ids.map(() => '?').join(',')
    await db.query(
      `DELETE FROM user_works WHERE id IN (${placeholders}) AND (user_id = ? OR ? = 'admin')`,
      [...ids, req.user.id, req.user.role],
    )

    logger.info(`Batch deleted ${ids.length} works by user ${req.user.id}`)

    successResponse(res, null, `成功删除${ids.length}个作品`)
  } catch (error) {
    logger.error('Batch delete works error:', error)
    next(error)
  }
})

router.post('/batch-update', authenticate, async (req, res, next) => {
  try {
    const { ids, updates } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, '请提供要更新的作品ID列表', 400)
    }

    if (ids.length > 50) {
      return errorResponse(res, '单次最多更新50个作品', 400)
    }

    if (!updates || typeof updates !== 'object') {
      return errorResponse(res, '请提供更新内容', 400)
    }

    const allowedFields = ['category', 'is_public', 'is_favorite']
    const setClauses = []
    const setParams = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'category') {
          setClauses.push('category = ?')
          setParams.push(updates[field])
        } else if (field === 'is_public') {
          setClauses.push('is_public = ?')
          setParams.push(updates[field] ? 1 : 0)
        } else if (field === 'is_favorite') {
          setClauses.push('is_favorite = ?')
          setParams.push(updates[field] ? 1 : 0)
        }
      }
    }

    if (updates.add_tags && Array.isArray(updates.add_tags)) {
      const works = await db.query(
        `SELECT id, tags FROM user_works WHERE id IN (${ids.map(() => '?').join(',')}) AND user_id = ?`,
        [...ids, req.user.id],
      )

      for (const work of works) {
        const currentTags = safeJSONParse(work.tags, [])
        const newTags = [...new Set([...currentTags, ...updates.add_tags])].slice(0, 10)
        await db.query('UPDATE user_works SET tags = ? WHERE id = ?', [
          newTags.length > 0 ? JSON.stringify(newTags) : null,
          work.id,
        ])
      }
    }

    if (updates.remove_tags && Array.isArray(updates.remove_tags)) {
      const works = await db.query(
        `SELECT id, tags FROM user_works WHERE id IN (${ids.map(() => '?').join(',')}) AND user_id = ?`,
        [...ids, req.user.id],
      )

      for (const work of works) {
        const currentTags = safeJSONParse(work.tags, [])
        const newTags = currentTags.filter((t) => !updates.remove_tags.includes(t))
        await db.query('UPDATE user_works SET tags = ? WHERE id = ?', [
          newTags.length > 0 ? JSON.stringify(newTags) : null,
          work.id,
        ])
      }
    }

    if (setClauses.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      await db.query(
        `UPDATE user_works SET ${setClauses.join(', ')} WHERE id IN (${placeholders}) AND user_id = ?`,
        [...setParams, ...ids, req.user.id],
      )
    }

    logger.info(`Batch updated ${ids.length} works by user ${req.user.id}`, {
      updates: Object.keys(updates),
    })

    successResponse(res, { updatedCount: ids.length }, `成功更新${ids.length}个作品`)
  } catch (error) {
    logger.error('Batch update works error:', error)
    next(error)
  }
})

router.post('/:id/share', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      title,
      description,
      allow_download = true,
      password = '',
      max_views = 0,
      expires_hours = 0,
    } = req.body

    const [work] = await db.query(
      'SELECT * FROM user_works WHERE id = ? AND status != "archived"',
      [id],
    )

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id) {
      return errorResponse(res, '只有作者可以分享此作品', 403)
    }

    const shareToken = crypto.randomBytes(32).toString('hex')

    let expiresAt = null
    if (expires_hours > 0) {
      expiresAt = new Date(Date.now() + expires_hours * 3600000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ')
    }

    await db.query(
      `INSERT INTO work_shares (work_id, user_id, share_token, title, description, allow_download, password, max_views, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        shareToken,
        title?.trim() || work.title || `作品 ${id}`,
        description?.trim() || '',
        allow_download ? 1 : 0,
        password || '',
        max_views || 0,
        expiresAt,
      ],
    )

    await db.query('UPDATE user_works SET share_count = share_count + 1 WHERE id = ?', [id])

    const shareUrl = `${req.protocol}://${req.get('host')}/s/${shareToken}`
    const embedCode = `<iframe src="${shareUrl}/embed" width="600" height="600" frameborder="0" allowfullscreen></iframe>`

    logger.info(`Work ${id} shared by user ${req.user.id}`, { shareToken })

    successResponse(
      res,
      {
        shareToken,
        shareUrl,
        embedCode,
        expiresAt,
        allowDownload: allow_download,
        hasPassword: !!password,
      },
      '分享链接已创建',
      201,
    )
  } catch (error) {
    logger.error('Share work error:', error)
    next(error)
  }
})

router.get('/:id/shares', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [work] = await db.query('SELECT * FROM user_works WHERE id = ?', [id])
    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, '无权查看分享记录', 403)
    }

    const shares = await db.query(
      `SELECT id, share_token, title, allow_download, password != '' as has_password, max_views, current_views, expires_at, is_active, create_time
       FROM work_shares WHERE work_id = ? ORDER BY create_time DESC`,
      [id],
    )

    successResponse(res, {
      shares: shares.map((s) => ({
        ...s,
        shareUrl: `${req.protocol}://${req.get('host')}/s/${s.share_token}`,
        isExpired: s.expires_at ? new Date(s.expires_at) < new Date() : false,
        isMaxedOut: s.max_views > 0 && s.current_views >= s.max_views,
      })),
    })
  } catch (error) {
    next(error)
  }
})

router.delete('/shares/:shareId', authenticate, async (req, res, next) => {
  try {
    const { shareId } = req.params

    const [share] = await db.query('SELECT * FROM work_shares WHERE id = ?', [shareId])
    if (!share) {
      return errorResponse(res, '分享记录不存在', 404)
    }

    if (share.user_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, '无权删除此分享', 403)
    }

    await db.query('DELETE FROM work_shares WHERE id = ?', [shareId])

    successResponse(res, null, '分享已删除')
  } catch (error) {
    next(error)
  }
})

router.get('/shared/:token', optionalAuth, async (req, res, next) => {
  try {
    const { token } = req.params

    const [share] = await db.query(
      'SELECT * FROM work_shares WHERE share_token = ? AND is_active = 1',
      [token],
    )

    if (!share) {
      return errorResponse(res, '分享链接不存在或已失效', 404)
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      await db.query('UPDATE work_shares SET is_active = 0 WHERE id = ?', [share.id])
      return errorResponse(res, '分享链接已过期', 410)
    }

    if (share.max_views > 0 && share.current_views >= share.max_views) {
      await db.query('UPDATE work_shares SET is_active = 0 WHERE id = ?', [share.id])
      return errorResponse(res, '分享链接浏览次数已达上限', 410)
    }

    if (share.password) {
      const { password } = req.query
      if (password !== share.password) {
        return errorResponse(res, '需要访问密码', 401)
      }
    }

    const [work] = await db.query(
      `SELECT w.*, u.username as author_name FROM user_works w LEFT JOIN users u ON w.user_id = u.id WHERE w.id = ?`,
      [share.work_id],
    )

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    await db.query('UPDATE work_shares SET current_views = current_views + 1 WHERE id = ?', [
      share.id,
    ])
    await db.query('UPDATE user_works SET view_count = view_count + 1 WHERE id = ?', [work.id])

    successResponse(res, {
      work: formatWorkRow(work),
      share: {
        title: share.title,
        description: share.description,
        allowDownload: !!share.allow_download,
        authorName: work.author_name,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/shared/:token/embed', optionalAuth, async (req, res, _next) => {
  try {
    const { token } = req.params

    const [share] = await db.query(
      'SELECT * FROM work_shares WHERE share_token = ? AND is_active = 1',
      [token],
    )

    if (!share) {
      return res.status(404).send('<h1>分享链接不存在或已失效</h1>')
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).send('<h1>分享链接已过期</h1>')
    }

    const [work] = await db.query('SELECT * FROM user_works WHERE id = ?', [share.work_id])
    if (!work) {
      return res.status(404).send('<h1>作品不存在</h1>')
    }

    await db.query('UPDATE work_shares SET current_views = current_views + 1 WHERE id = ?', [
      share.id,
    ])
    await db.query('UPDATE user_works SET view_count = view_count + 1 WHERE id = ?', [work.id])

    const imageUrl = `/api/files/${work.file_path}`
    const title = share.title || work.title || 'AI Generated Art'

    const safeTitle = title
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const safeDesc = (share.description || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: -apple-system, sans-serif; color: #fff; padding: 20px; }
    img { max-width: 100%; max-height: 80vh; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    h2 { margin-bottom: 16px; font-size: 20px; }
    .meta { margin-top: 12px; font-size: 13px; color: #999; }
  </style>
</head>
<body>
  <h2>${safeTitle}</h2>
  <img src="${imageUrl}" alt="${safeTitle}" />
  ${safeDesc ? `<p class="meta">${safeDesc}</p>` : ''}
  <p class="meta">Powered by AI-Resume</p>
</body>
</html>`)
  } catch {
    res.status(500).send('<h1>Server Error</h1>')
  }
})

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [work] = await db.query(
      `SELECT w.*,
              p.title as prompt_title, p.content as prompt_content, p.category as prompt_category
       FROM user_works w
       LEFT JOIN prompts p ON w.prompt_id = p.id
       WHERE w.id = ? AND w.status != 'archived'`,
      [id],
    )

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id && !work.is_public && req.user.role !== 'admin') {
      return errorResponse(res, '无权查看此作品', 403)
    }

    await db.query('UPDATE user_works SET view_count = view_count + 1 WHERE id = ?', [id])

    successResponse(res, formatWorkRow(work))
  } catch (error) {
    next(error)
  }
})

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, description, category, tags, is_public, is_favorite } = req.body

    const [work] = await db.query('SELECT * FROM user_works WHERE id = ?', [id])

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, '只有作者可以编辑此作品', 403)
    }

    const updates = []
    const params = []

    if (title !== undefined) {
      updates.push('title = ?')
      params.push(title.trim())
    }

    if (description !== undefined) {
      updates.push('description = ?')
      params.push(description.trim())
    }

    if (category !== undefined) {
      updates.push('category = ?')
      params.push(category)
    }

    if (tags !== undefined) {
      if (tags.length > 10) {
        return errorResponse(res, '标签最多10个', 400)
      }
      updates.push('tags = ?')
      params.push(tags.length > 0 ? JSON.stringify(tags) : null)
    }

    if (is_public !== undefined) {
      updates.push('is_public = ?')
      params.push(is_public ? 1 : 0)
    }

    if (is_favorite !== undefined) {
      updates.push('is_favorite = ?')
      params.push(is_favorite ? 1 : 0)
    }

    if (updates.length === 0) {
      return errorResponse(res, '没有需要更新的字段', 400)
    }

    params.push(id)
    await db.query(`UPDATE user_works SET ${updates.join(', ')} WHERE id = ?`, params)

    successResponse(res, { id: parseInt(id) }, '作品更新成功')
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [work] = await db.query('SELECT * FROM user_works WHERE id = ?', [id])

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id && req.user.role !== 'admin') {
      return errorResponse(res, '只有作者或管理员可以删除此作品', 403)
    }

    await fileStorage.deleteWorkFiles(work)
    await db.query('DELETE FROM user_works WHERE id = ?', [id])

    logger.info(`Work ${id} deleted by user ${req.user.id}`)

    successResponse(res, null, '作品已删除')
  } catch (error) {
    next(error)
  }
})

router.put('/:id/toggle-public', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [work] = await db.query('SELECT * FROM user_works WHERE id = ?', [id])

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id) {
      return errorResponse(res, '只有作者可以修改公开设置', 403)
    }

    const newPublicStatus = work.is_public ? 0 : 1

    await db.query('UPDATE user_works SET is_public = ? WHERE id = ?', [newPublicStatus, id])

    successResponse(
      res,
      { id: parseInt(id), isPublic: !!newPublicStatus },
      newPublicStatus ? '已设为公开' : '已设为私有',
    )
  } catch (error) {
    next(error)
  }
})

router.put('/:id/toggle-favorite', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [work] = await db.query('SELECT * FROM user_works WHERE id = ?', [id])

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id) {
      return errorResponse(res, '只有作者可以修改收藏设置', 403)
    }

    const newFavoriteStatus = work.is_favorite ? 0 : 1

    await db.query('UPDATE user_works SET is_favorite = ? WHERE id = ?', [newFavoriteStatus, id])

    successResponse(
      res,
      { id: parseInt(id), isFavorite: !!newFavoriteStatus },
      newFavoriteStatus ? '已收藏' : '已取消收藏',
    )
  } catch (error) {
    next(error)
  }
})

router.put('/:id/tags', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const { tags } = req.body

    if (!Array.isArray(tags)) {
      return errorResponse(res, '标签必须是数组', 400)
    }

    if (tags.length > 10) {
      return errorResponse(res, '标签最多10个', 400)
    }

    const [work] = await db.query('SELECT * FROM user_works WHERE id = ?', [id])

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id) {
      return errorResponse(res, '只有作者可以修改标签', 403)
    }

    await db.query('UPDATE user_works SET tags = ? WHERE id = ?', [
      tags.length > 0 ? JSON.stringify(tags) : null,
      id,
    ])

    successResponse(res, { id: parseInt(id), tags }, '标签更新成功')
  } catch (error) {
    next(error)
  }
})

router.put('/:id/category', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params
    const { category } = req.body

    if (!category || typeof category !== 'string') {
      return errorResponse(res, '请提供有效的分类', 400)
    }

    const [work] = await db.query('SELECT * FROM user_works WHERE id = ?', [id])

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id) {
      return errorResponse(res, '只有作者可以修改分类', 403)
    }

    await db.query('UPDATE user_works SET category = ? WHERE id = ?', [category, id])

    successResponse(res, { id: parseInt(id), category }, '分类更新成功')
  } catch (error) {
    next(error)
  }
})

router.post('/:id/download', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [work] = await db.query(
      'SELECT * FROM user_works WHERE id = ? AND status != "archived"',
      [id],
    )

    if (!work) {
      return errorResponse(res, '作品不存在', 404)
    }

    if (work.user_id !== req.user.id && !work.is_public && req.user.role !== 'admin') {
      return errorResponse(res, '无权下载此作品', 403)
    }

    await db.query('UPDATE user_works SET download_count = download_count + 1 WHERE id = ?', [id])

    successResponse(res, { downloadCount: (work.download_count || 0) + 1 }, '下载计数已更新')
  } catch (error) {
    next(error)
  }
})

export default router
