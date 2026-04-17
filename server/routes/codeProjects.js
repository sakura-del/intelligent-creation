import { Router } from 'express'
import { db } from '../database/connection.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { authenticate } from '../middleware/auth.js'
import rateLimit from 'express-rate-limit'
import { logger } from '../utils/logger.js'
import crypto from 'crypto'

const router = Router()

const projectLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  message: { code: 429, message: '项目操作频率限制为每分钟30次' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ==================== 项目保存 ====================

router.post('/', authenticate, projectLimiter, async (req, res, next) => {
  try {
    const {
      title = '未命名项目',
      description = '',
      files_data,
      source_type = 'manual',
      source_template_id = null,
      ai_prompt = '',
      template_values = null,
      user_mode = 'expert',
      is_public = false,
    } = req.body

    let files = []
    if (typeof files_data === 'string') {
      try {
        files = JSON.parse(files_data)
      } catch {
        // eslint-disable-line no-empty -- expected invalid JSON
        return errorResponse(res, 'files_data JSON格式错误', 400)
      }
    } else if (Array.isArray(files_data)) {
      files = files_data
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return errorResponse(res, '文件数据不能为空', 400)
    }

    // 验证每个文件
    for (const file of files) {
      if (!file.name || !file.content || !file.language) {
        return errorResponse(res, '文件数据格式错误：缺少name/content/language字段', 400)
      }
    }

    const totalSize = files.reduce((sum, f) => sum + (f.content?.length || 0), 0)

    // 生成唯一分享令牌
    const shareToken = generateShareToken()

    let parsedTemplateValues = null
    if (template_values) {
      if (typeof template_values === 'string') {
        try {
          parsedTemplateValues = JSON.parse(template_values)
        } catch {
          // eslint-disable-line no-empty -- invalid JSON fallback
          parsedTemplateValues = template_values
        }
      } else {
        parsedTemplateValues = template_values
      }
    }

    const queryResult = await db.query(
      `INSERT INTO code_projects (
          user_id, title, description, source_type, source_template_id,
          ai_prompt, files_data, template_values, user_mode,
          file_count, total_size, is_public, share_token, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'saved')`,
      [
        req.user.id,
        title.trim().substring(0, 200),
        description?.trim()?.substring(0, 1000) || '',
        source_type,
        source_template_id || null,
        ai_prompt?.trim() || null,
        JSON.stringify(files),
        parsedTemplateValues ? JSON.stringify(parsedTemplateValues) : null,
        user_mode,
        files.length,
        totalSize,
        is_public ? 1 : 0,
        shareToken,
      ],
    )

    const projectId = queryResult[0]?.insertId || queryResult.insertId

    logger.info(`Project saved: ${projectId} by user ${req.user.id}`, {
      title,
      fileCount: files.length,
      source_type,
    })

    successResponse(
      res,
      {
        id: projectId,
        share_token: shareToken,
        message: '项目保存成功',
      },
      '项目已保存',
      201,
    )
  } catch (error) {
    logger.error('Save project error:', error)
    next(error)
  }
})

// ==================== 项目列表 ====================

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query
    const offset = (page - 1) * limit

    let whereClause = 'WHERE p.user_id = ? AND p.status != "archived"'
    const params = [req.user.id]

    if (search) {
      whereClause += ' AND (p.title LIKE ? OR p.description LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm)
    }

    if (status && ['draft', 'saved'].includes(status)) {
      whereClause += ' AND p.status = ?'
      params.push(status)
    }

    // 获取总数
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM code_projects p ${whereClause}`,
      params,
    )
    const total = countResult.total

    // 获取项目列表（不包含完整的files_data以提高性能）
    const projects = await db.query(
      `SELECT
          p.id, p.title, p.description, p.source_type, p.source_template_id,
          p.user_mode, p.file_count, p.total_size, p.is_public, p.share_token,
          p.status, p.last_modified, p.create_time
         FROM code_projects p
         ${whereClause}
         ORDER BY p.last_modified DESC
         LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset],
    )

    successResponse(res, {
      items: projects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('List projects error:', error)
    next(error)
  }
})

// ==================== 项目详情（含完整代码）====================

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [project] = await db.query(`SELECT * FROM code_projects WHERE id = ? AND user_id = ?`, [
      id,
      req.user.id,
    ])

    if (!project) {
      return errorResponse(res, '项目不存在或无权访问', 404)
    }

    // 解析JSON字段
    project.files_data = JSON.parse(project.files_data || '[]')
    if (project.template_values) {
      project.template_values = JSON.parse(project.template_values)
    }

    successResponse(res, project)
  } catch (error) {
    logger.error('Get project detail error:', error)
    next(error)
  }
})

// ==================== 更新项目 ====================

router.put('/:id', authenticate, projectLimiter, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, description, files, isPublic, status } = req.body

    // 检查权限
    const [existing] = await db.query('SELECT * FROM code_projects WHERE id = ? AND user_id = ?', [
      id,
      req.user.id,
    ])

    if (!existing) {
      return errorResponse(res, '项目不存在或无权修改', 404)
    }

    // 构建更新字段
    const updates = []
    const values = []

    if (title !== undefined) {
      updates.push('title = ?')
      values.push(title.trim())
    }
    if (description !== undefined) {
      updates.push('description = ?')
      values.push(description?.trim() || '')
    }
    if (files && Array.isArray(files)) {
      updates.push('files_data = ?')
      updates.push('file_count = ?')
      updates.push('total_size = ?')
      const totalSize = files.reduce((sum, f) => sum + (f.content?.length || 0), 0)
      values.push(JSON.stringify(files), files.length, totalSize)
    }
    if (isPublic !== undefined) {
      updates.push('is_public = ?')
      values.push(isPublic ? 1 : 0)
    }
    if (status && ['draft', 'saved', 'archived'].includes(status)) {
      updates.push('status = ?')
      values.push(status)
    }

    if (updates.length > 0) {
      values.push(id, req.user.id)
      await db.query(
        `UPDATE code_projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values,
      )
    }

    logger.info(`Project ${id} updated by user ${req.user.id}`)

    successResponse(res, null, '项目更新成功')
  } catch (error) {
    logger.error('Update project error:', error)
    next(error)
  }
})

// ==================== 删除项目 ====================

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const [existing] = await db.query('SELECT * FROM code_projects WHERE id = ? AND user_id = ?', [
      id,
      req.user.id,
    ])

    if (!existing) {
      return errorResponse(res, '项目不存在或无权删除', 404)
    }

    await db.query("UPDATE code_projects SET status = 'archived' WHERE id = ?", [id])

    logger.info(`Project ${id} archived by user ${req.user.id}`)

    successResponse(res, null, '项目已删除')
  } catch (error) {
    logger.error('Delete project error:', error)
    next(error)
  }
})

// ==================== 通过分享令牌访问（公开）====================

router.get('/share/:token', async (req, res, next) => {
  try {
    const { token } = req.params

    const [project] = await db.query(
      `SELECT * FROM code_projects
       WHERE share_token = ? AND is_public = 1 AND status = 'saved'`,
      [token],
    )

    if (!project) {
      return errorResponse(res, '分享链接无效或项目已设为私有', 404)
    }

    // 增加浏览次数（可选）
    // await db.query('UPDATE code_projects SET view_count = view_count + 1 WHERE id = ?', [project.id])

    project.files_data = JSON.parse(project.files_data || '[]')

    successResponse(res, project)
  } catch (error) {
    logger.error('Share access error:', error)
    next(error)
  }
})

// ==================== 版本历史 ====================

router.get('/:id/versions', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.id
    const { page = 1, limit = 20 } = req.query

    const project = await db.query(
      'SELECT id, user_id FROM code_projects WHERE id = ? AND user_id = ?',
      [projectId, req.user.id],
    )
    if (!project || !project.length) {
      return errorResponse(res, '项目不存在', 404)
    }

    const offset = (parseInt(page) - 1) * parseInt(limit)
    const versions = await db.query(
      'SELECT id, version_number, description, file_count, total_size, change_summary, create_time FROM code_project_versions WHERE project_id = ? ORDER BY version_number DESC LIMIT ? OFFSET ?',
      [projectId, parseInt(limit), offset],
    )

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM code_project_versions WHERE project_id = ?',
      [projectId],
    )
    const total = countResult[0]?.total || 0

    successResponse(res, {
      items: versions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    })
  } catch (error) {
    logger.error('Get versions error:', error)
    next(error)
  }
})

router.post('/:id/versions', authenticate, projectLimiter, async (req, res, next) => {
  try {
    const projectId = req.params.id
    const { description = '', changeSummary = '' } = req.body

    const project = await db.query(
      'SELECT id, user_id, files_data, file_count, total_size, current_version FROM code_projects WHERE id = ? AND user_id = ?',
      [projectId, req.user.id],
    )
    if (!project || !project.length) {
      return errorResponse(res, '项目不存在', 404)
    }

    const currentVersion = project[0].current_version || 0
    const newVersion = currentVersion + 1

    await db.query(
      'INSERT INTO code_project_versions (project_id, user_id, version_number, description, files_data, file_count, total_size, change_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        projectId,
        req.user.id,
        newVersion,
        description,
        project[0].files_data,
        project[0].file_count,
        project[0].total_size,
        changeSummary,
      ],
    )

    await db.query('UPDATE code_projects SET current_version = ? WHERE id = ?', [
      newVersion,
      projectId,
    ])

    successResponse(res, { versionNumber: newVersion }, '版本保存成功', 201)
  } catch (error) {
    logger.error('Create version error:', error)
    next(error)
  }
})

router.get('/:id/versions/:versionNumber', authenticate, async (req, res, next) => {
  try {
    const projectId = req.params.id
    const versionNumber = parseInt(req.params.versionNumber)

    const version = await db.query(
      'SELECT * FROM code_project_versions WHERE project_id = ? AND version_number = ? AND user_id = ?',
      [projectId, versionNumber, req.user.id],
    )

    if (!version || !version.length) {
      return errorResponse(res, '版本不存在', 404)
    }

    const versionData = version[0]
    versionData.files_data = JSON.parse(versionData.files_data || '[]')

    successResponse(res, versionData)
  } catch (error) {
    logger.error('Get version error:', error)
    next(error)
  }
})

router.post(
  '/:id/versions/:versionNumber/restore',
  authenticate,
  projectLimiter,
  async (req, res, next) => {
    try {
      const projectId = req.params.id
      const versionNumber = parseInt(req.params.versionNumber)

      const version = await db.query(
        'SELECT files_data, file_count, total_size FROM code_project_versions WHERE project_id = ? AND version_number = ? AND user_id = ?',
        [projectId, versionNumber, req.user.id],
      )

      if (!version || !version.length) {
        return errorResponse(res, '版本不存在', 404)
      }

      await db.query(
        'UPDATE code_projects SET files_data = ?, file_count = ?, total_size = ? WHERE id = ? AND user_id = ?',
        [
          version[0].files_data,
          version[0].file_count,
          version[0].total_size,
          projectId,
          req.user.id,
        ],
      )

      successResponse(res, null, `已恢复到版本 v${versionNumber}`)
    } catch (error) {
      logger.error('Restore version error:', error)
      next(error)
    }
  },
)

router.delete('/:id/versions/:versionId', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM code_project_versions WHERE id = ? AND project_id = ? AND user_id = ?',
      [req.params.versionId, req.params.id, req.user.id],
    )

    if (result.affectedRows === 0) {
      return errorResponse(res, '版本不存在', 404)
    }

    successResponse(res, null, '版本已删除')
  } catch (error) {
    logger.error('Delete version error:', error)
    next(error)
  }
})

// ==================== 项目模板 ====================

router.get('/templates/list', authenticate, async (req, res, next) => {
  try {
    const { category } = req.query
    let sql =
      'SELECT id, name, description, category, icon, preview_image, customizable_fields, default_values, style, features, usage_count FROM code_project_templates WHERE status = 1 AND (is_public = 1 OR user_id = ?)'
    const params = [req.user.id]

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }

    sql += ' ORDER BY sort_order DESC, usage_count DESC'

    const templates = await db.query(sql, params)
    successResponse(res, { templates })
  } catch (error) {
    logger.error('Get project templates error:', error)
    next(error)
  }
})

router.get('/templates/:id', authenticate, async (req, res, next) => {
  try {
    const templates = await db.query(
      'SELECT * FROM code_project_templates WHERE id = ? AND status = 1 AND (is_public = 1 OR user_id = ?)',
      [req.params.id, req.user.id],
    )

    if (!templates || !templates.length) {
      return errorResponse(res, '模板不存在', 404)
    }

    const template = templates[0]
    template.files_data = JSON.parse(template.files_data || '[]')
    if (template.customizable_fields) {
      template.customizable_fields = JSON.parse(template.customizable_fields || '[]')
    }
    if (template.default_values) {
      template.default_values = JSON.parse(template.default_values || '{}')
    }
    if (template.features) {
      template.features = JSON.parse(template.features || '[]')
    }

    await db.query('UPDATE code_project_templates SET usage_count = usage_count + 1 WHERE id = ?', [
      req.params.id,
    ])

    successResponse(res, template)
  } catch (error) {
    logger.error('Get project template detail error:', error)
    next(error)
  }
})

router.post('/templates', authenticate, projectLimiter, async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      icon,
      filesData,
      customizableFields,
      defaultValues,
      style,
      features,
    } = req.body

    if (!name || !filesData) {
      return errorResponse(res, '模板名称和文件数据为必填项', 400)
    }

    const result = await db.query(
      'INSERT INTO code_project_templates (name, description, category, icon, files_data, customizable_fields, default_values, style, features, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        description || '',
        category || 'other',
        icon || '',
        typeof filesData === 'string' ? filesData : JSON.stringify(filesData),
        customizableFields ? JSON.stringify(customizableFields) : null,
        defaultValues ? JSON.stringify(defaultValues) : null,
        style || 'modern',
        features ? JSON.stringify(features) : null,
        req.user.id,
      ],
    )

    successResponse(res, { id: result.insertId }, '模板创建成功', 201)
  } catch (error) {
    logger.error('Create project template error:', error)
    next(error)
  }
})

// ==================== 分享增强 ====================

router.get('/:id/embed-code', authenticate, async (req, res, next) => {
  try {
    const project = await db.query(
      'SELECT id, share_token, embed_token, title, is_public FROM code_projects WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id],
    )

    if (!project || !project.length) {
      return errorResponse(res, '项目不存在', 404)
    }

    let embedToken = project[0].embed_token
    if (!embedToken) {
      embedToken = generateShareToken().replace('share_', 'embed_')
      await db.query('UPDATE code_projects SET embed_token = ? WHERE id = ?', [
        embedToken,
        req.params.id,
      ])
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`
    const embedUrl = `${baseUrl}/api/projects/embed/${embedToken}`

    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border-radius:8px;" sandbox="allow-scripts allow-same-origin"></iframe>`

    successResponse(res, {
      shareUrl: project[0].share_token
        ? `${baseUrl}/api/projects/share/${project[0].share_token}`
        : '',
      embedUrl,
      embedToken,
      iframeCode,
    })
  } catch (error) {
    logger.error('Get embed code error:', error)
    next(error)
  }
})

router.get('/embed/:token', async (req, res, _next) => {
  try {
    const token = req.params.token

    const project = await db.query(
      "SELECT * FROM code_projects WHERE embed_token = ? AND is_public = 1 AND status = 'saved'",
      [token],
    )

    if (!project || !project.length) {
      return res.status(404).send('<h1>404 - 嵌入内容不存在</h1>')
    }

    const filesData = JSON.parse(project[0].files_data || '[]')
    const htmlFile = filesData.find((f) => f.name === 'index.html')
    const cssFile = filesData.find((f) => f.name === 'style.css')
    const jsFile = filesData.find((f) => f.name === 'script.js')

    const html = htmlFile?.content || '<p>No content</p>'
    const css = cssFile?.content || ''
    const js = jsFile?.content || ''

    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project[0].title || 'Embedded Page'}</title>
  <style>${css}</style>
</head>
<body>
${html
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head[^>]*>/gi, '')
  .replace(/<\/?body[^>]*>/gi, '')
  .replace(/<link[^>]*stylesheet[^>]*>/gi, '')
  .replace(/<script[^>]*src=["'][^"']*["'][^>]*><\/script>/gi, '')}
<script>${js}</script>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('X-Frame-Options', 'ALLOWALL')
    res.send(fullHtml)
  } catch (error) {
    logger.error('Embed access error:', error)
    res.status(500).send('<h1>500 - Server Error</h1>')
  }
})

// ==================== 辅助函数 ====================

function generateShareToken() {
  const bytes = crypto.randomBytes(24)
  return 'share_' + bytes.toString('base64url')
}

export default router
