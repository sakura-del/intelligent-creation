import { Router } from 'express'
import { db } from '../database/connection.js'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'
import { authenticate } from '../middleware/auth.js'
import validate, { schemas } from '../middleware/validator.js'
import aiService from '../services/aiService.js'
import { logger } from '../utils/logger.js'

const router = Router()

router.get('/list', authenticate, validate(schemas.pagination, 'query'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const offset = (page - 1) * limit

    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM applications WHERE user_id = ?',
      [req.user.id],
    )
    const total = totalResult[0]?.total || 0

    const applications = await db.query(
      `SELECT id, name, description, status, deploy_url, create_time, update_time
       FROM applications
       WHERE user_id = ?
       ORDER BY create_time DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), parseInt(offset)],
    )

    paginatedResponse(res, applications, total, page, limit)
  } catch (error) {
    next(error)
  }
})

router.post('/add', authenticate, validate(schemas.app), async (req, res, next) => {
  try {
    const { name, description, structure } = req.body

    const result = await db.query(
      `INSERT INTO applications (user_id, name, description, structure)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, name, description, JSON.stringify(structure)],
    )

    logger.info(`New application created: ${name} by user ${req.user.id}`)

    successResponse(res, { id: result.insertId }, '应用创建成功', 201)
  } catch (error) {
    next(error)
  }
})

router.get('/detail/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const apps = await db.query('SELECT * FROM applications WHERE id = ? AND user_id = ?', [
      id,
      req.user.id,
    ])

    if (!apps || !apps.length) {
      return errorResponse(res, '应用不存在', 404)
    }

    successResponse(res, apps[0])
  } catch (error) {
    next(error)
  }
})

router.post('/update', authenticate, async (req, res, next) => {
  try {
    const { id, name, description, structure, status } = req.body

    const existing = await db.query('SELECT id FROM applications WHERE id = ? AND user_id = ?', [
      id,
      req.user.id,
    ])

    if (!existing || !existing.length) {
      return errorResponse(res, '应用不存在或无权修改', 404)
    }

    const updates = { update_time: new Date() }
    if (name) updates.name = name
    if (description) updates.description = description
    if (structure) updates.structure = JSON.stringify(structure)
    if (status) updates.status = status

    await db.query('UPDATE applications SET ? WHERE id = ?', [updates, id])

    successResponse(res, null, '更新成功')
  } catch (error) {
    next(error)
  }
})

router.delete('/delete/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const result = await db.query('DELETE FROM applications WHERE id = ? AND user_id = ?', [
      id,
      req.user.id,
    ])

    if (!result?.affectedRows) {
      return errorResponse(res, '应用不存在或无权删除', 404)
    }

    successResponse(res, null, '删除成功')
  } catch (error) {
    next(error)
  }
})

router.post('/generate', authenticate, async (req, res, next) => {
  try {
    const { description } = req.body

    if (!description || description.length < 10) {
      return errorResponse(res, '请提供详细的应用需求描述（至少10个字符）', 400)
    }

    logger.info(`App generation request:`, { userId: req.user.id, descLength: description.length })

    const systemPrompt = `你是一位资深的全栈开发工程师和产品架构师。根据用户描述的应用需求，生成完整的应用程序代码和结构。

要求：
1. 使用 Vue3 + Element Plus 前端框架
2. 提供清晰的文件结构说明
3. 包含核心功能组件代码
4. 注释清晰，易于理解
5. 代码要完整可运行

输出格式（严格JSON）：
{
  "name": "应用名称",
  "structure": {
    "type": "vue-app",
    "files": [
      {"path": "src/App.vue", "content": "..."},
      {"path": "src/components/...", "content": "..."}
    ]
  },
  "features": ["功能列表"],
  "techStack": ["技术栈"],
  "readme": "使用说明"
}`

    let generatedContent

    if (process.env.AI_PRIMARY_PROVIDER === 'mock') {
      generatedContent = generateMockApp(description)
    } else {
      const client = aiService.providers[aiService.primaryProvider]?.createClient()

      if (!client) {
        return errorResponse(res, 'AI服务暂时不可用', 503)
      }

      const completion = await client.chat.completions.create({
        model: aiService.providers[aiService.primaryProvider].model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: description },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      })

      generatedContent = completion.choices[0]?.message?.content || ''
    }

    let appData
    try {
      const jsonMatch = generatedContent.match(/\{[\s\S]*\}/)
      appData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: generatedContent }
    } catch {
      appData = { code: generatedContent }
    }

    await db.query(
      `INSERT INTO applications (user_id, name, description, structure, code, status)
       VALUES (?, ?, ?, ?, ?, 'ready')`,
      [
        req.user.id,
        appData.name || '生成的应用',
        description,
        JSON.stringify(appData.structure || {}),
        generatedContent,
      ],
    )

    logger.info(`App generated successfully for user ${req.user.id}`)

    successResponse(res, appData, '应用生成成功', 201)
  } catch (error) {
    logger.error('App generation failed:', error)
    next(error)
  }
})

function generateMockApp(description) {
  return JSON.stringify(
    {
      name: `${description.substring(0, 15)}管理系统`,
      structure: {
        type: 'vue-app',
        files: [
          {
            path: 'src/App.vue',
            content: `<template>
  <div class="app">
    <el-container>
      <el-aside width="200px">
        <el-menu>
          <el-menu-item index="1">首页</el-menu-item>
          <el-menu-item index="2">数据管理</el-menu-item>
          <el-menu-item index="3">设置</el-menu-item>
        </el-menu>
      </el-aside>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>`,
          },
          {
            path: 'src/views/Home.vue',
            content: `<template>
  <div class="home">
    <h1>欢迎使用${description.substring(0, 20)}</h1>
    <p>这是一个基于AI自动生成的应用程序</p>
  </div>
</template>`,
          },
        ],
      },
      features: ['数据管理', '用户权限', '报表统计'],
      techStack: ['Vue3', 'Element Plus', 'Node.js', 'MySQL'],
      readme: `# 应用说明\n\n基于您的需求"${description}"，AI已为您生成了这个应用程序。\n\n## 快速开始\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## 功能特性\n\n- ✅ 完整的CRUD操作\n- ✅ 响应式设计\n- ✅ 权限控制\n- ✅ 数据可视化`,
    },
    null,
    2,
  )
}

router.post('/save-structure', authenticate, async (req, res, next) => {
  try {
    const { id, name, description, structure, code } = req.body

    if (!structure) {
      return errorResponse(res, '缺少应用结构数据', 400)
    }

    if (id) {
      const existing = await db.query('SELECT id FROM applications WHERE id = ? AND user_id = ?', [
        id,
        req.user.id,
      ])
      if (!existing || !existing.length) {
        return errorResponse(res, '应用不存在或无权修改', 404)
      }

      const updates = { update_time: new Date(), structure: JSON.stringify(structure) }
      if (code) updates.code = code
      if (name) updates.name = name
      if (description) updates.description = description

      await db.query('UPDATE applications SET ? WHERE id = ?', [updates, id])
      logger.info(`App structure updated: ${id} by user ${req.user.id}`)
      successResponse(res, { id }, '保存成功')
    } else {
      const result = await db.query(
        `INSERT INTO applications (user_id, name, description, structure, code, status)
         VALUES (?, ?, ?, ?, ?, 'draft')`,
        [
          req.user.id,
          name || '未命名应用',
          description || '',
          JSON.stringify(structure),
          code || '',
        ],
      )
      logger.info(`New app created with structure: ${result.insertId} by user ${req.user.id}`)
      successResponse(res, { id: result.insertId }, '创建成功', 201)
    }
  } catch (error) {
    logger.error('Save app structure error:', error)
    next(error)
  }
})

router.post('/deploy/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params

    const apps = await db.query('SELECT * FROM applications WHERE id = ? AND user_id = ?', [
      id,
      req.user.id,
    ])

    if (!apps || !apps.length) {
      return errorResponse(res, '应用不存在', 404)
    }

    await db.query(
      `UPDATE applications
       SET status = 'deployed', deploy_url = ?
       WHERE id = ?`,
      [`https://app-${id}.vercel.app`, id],
    )

    logger.info(`Application ${id} deployed by user ${req.user.id}`)

    successResponse(
      res,
      {
        deployUrl: `https://app-${id}.vercel.app`,
        status: 'deployed',
      },
      '部署请求已提交',
    )
  } catch (error) {
    next(error)
  }
})

export default router
