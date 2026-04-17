import { Router } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, adminOnly } from '../middleware/auth.js'
import { success, error } from '../utils/response.js'

const router = Router()

const TRACK_RATE_LIMIT = 100

let trackCount = 0
let lastReset = Date.now()

function checkRateLimit() {
  const now = Date.now()
  if (now - lastReset > 60000) {
    trackCount = 0
    lastReset = now
  }
  if (trackCount >= TRACK_RATE_LIMIT) return false
  trackCount++
  return true
}

router.post('/track', async (req, res) => {
  try {
    const { events } = req.body
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json(error('事件数据无效'))
    }

    if (!checkRateLimit()) {
      return res.status(429).json(error('请求过于频繁'))
    }

    const values = events.map((e) => [
      e.user_id || null,
      e.session_id || 'unknown',
      e.event_type || 'custom',
      e.event_name || 'unknown',
      JSON.stringify(e.properties || {}),
      e.url || null,
      e.path || null,
      e.referrer || null,
      e.viewportWidth || null,
      e.viewportHeight || null,
      e.clientX || null,
      e.clientY || null,
      e.scrollDepth || null,
      e.dwellTimeMs || null,
      req.ip || null,
      req.headers['user-agent'] || null,
    ])

    const sql = `INSERT INTO analytics_events
      (user_id, session_id, event_type, event_name, properties, url, path, referrer,
       viewport_width, viewport_height, client_x, client_y, scroll_depth, dwell_time_ms,
       ip_address, user_agent)
      VALUES ?`

    await db.query(sql, [values])
    res.json(success(null, `成功记录 ${events.length} 个事件`))
  } catch (err) {
    console.error('Track error:', err)
    res.status(500).json(error('事件记录失败'))
  }
})

router.get('/stats/overview', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { range = '7d' } = req.query
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7

    const [totalUsers] = await db.query('SELECT COUNT(*) as count FROM users')
    const [activeUsers] = await db.query(
      `SELECT COUNT(DISTINCT user_id) as count FROM analytics_events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days],
    )
    const [totalEvents] = await db.query(
      'SELECT COUNT(*) as count FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days],
    )
    const [totalSessions] = await db.query(
      `SELECT COUNT(DISTINCT session_id) as count FROM analytics_events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days],
    )
    const [pageViews] = await db.query(
      `SELECT COUNT(*) as count FROM analytics_events
       WHERE event_type = 'page_view' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days],
    )

    const [avgSessionDuration] = await db.query(
      `SELECT AVG(session_duration) as avg_duration FROM (
        SELECT session_id,
               TIMESTAMPDIFF(SECOND, MIN(created_at), MAX(created_at)) as session_duration
        FROM analytics_events
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY session_id
      ) as sessions`,
      [days],
    )

    res.json(
      success({
        totalUsers: totalUsers[0]?.count || 0,
        activeUsers: activeUsers[0]?.count || 0,
        totalEvents: totalEvents[0]?.count || 0,
        totalSessions: totalSessions[0]?.count || 0,
        pageViews: pageViews[0]?.count || 0,
        avgSessionDuration: Math.round(avgSessionDuration[0]?.avg_duration || 0),
      }),
    )
  } catch (err) {
    console.error('Stats overview error:', err)
    res.status(500).json(error('获取统计数据失败'))
  }
})

router.get('/stats/trend', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { range = '7d', metric = 'users' } = req.query
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7

    let sql
    if (metric === 'users') {
      sql = `SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as value
             FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at) ORDER BY date`
    } else if (metric === 'events') {
      sql = `SELECT DATE(created_at) as date, COUNT(*) as value
             FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at) ORDER BY date`
    } else if (metric === 'sessions') {
      sql = `SELECT DATE(created_at) as date, COUNT(DISTINCT session_id) as value
             FROM analytics_events WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at) ORDER BY date`
    } else {
      sql = `SELECT DATE(created_at) as date, COUNT(*) as value
             FROM analytics_events WHERE event_type = 'page_view'
             AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
             GROUP BY DATE(created_at) ORDER BY date`
    }

    const [rows] = await db.query(sql, [days])
    res.json(success(rows))
  } catch (err) {
    console.error('Stats trend error:', err)
    res.status(500).json(error('获取趋势数据失败'))
  }
})

router.get('/stats/pages', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { range = '7d', limit = 20 } = req.query
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7

    const [rows] = await db.query(
      `SELECT path, COUNT(*) as views, COUNT(DISTINCT user_id) as unique_users,
              COUNT(DISTINCT session_id) as sessions
       FROM analytics_events
       WHERE event_type = 'page_view' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY path ORDER BY views DESC LIMIT ?`,
      [days, parseInt(limit)],
    )

    res.json(success(rows))
  } catch (err) {
    console.error('Pages stats error:', err)
    res.status(500).json(error('获取页面统计失败'))
  }
})

router.get('/ai/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { range = '7d' } = req.query
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7

    const [totalCalls] = await db.query(
      'SELECT COUNT(*) as count FROM ai_call_stats WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days],
    )
    const [successCalls] = await db.query(
      'SELECT COUNT(*) as count FROM ai_call_stats WHERE success = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days],
    )
    const [failedCalls] = await db.query(
      'SELECT COUNT(*) as count FROM ai_call_stats WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days],
    )
    const [totalTokens] = await db.query(
      'SELECT COALESCE(SUM(total_tokens), 0) as total FROM ai_call_stats WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days],
    )
    const [totalCost] = await db.query(
      'SELECT COALESCE(SUM(cost_usd), 0) as total FROM ai_call_stats WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days],
    )
    const [avgDuration] = await db.query(
      'SELECT COALESCE(AVG(duration_ms), 0) as avg FROM ai_call_stats WHERE success = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days],
    )
    const [modelStats] = await db.query(
      `SELECT model, call_type, COUNT(*) as calls,
              COALESCE(SUM(total_tokens), 0) as tokens,
              COALESCE(AVG(duration_ms), 0) as avg_duration,
              COALESCE(SUM(cost_usd), 0) as cost
       FROM ai_call_stats WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY model, call_type ORDER BY calls DESC`,
      [days],
    )
    const [dailyTrend] = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as calls,
              COALESCE(SUM(total_tokens), 0) as tokens,
              ROUND(COALESCE(AVG(duration_ms), 0)) as avg_duration
       FROM ai_call_stats WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at) ORDER BY date`,
      [days],
    )

    res.json(
      success({
        summary: {
          totalCalls: totalCalls[0]?.count || 0,
          successCalls: successCalls[0]?.count || 0,
          failedCalls: failedCalls[0]?.count || 0,
          successRate:
            totalCalls[0]?.count > 0
              ? Math.round((successCalls[0]?.count / totalCalls[0]?.count) * 10000) / 100
              : 0,
          totalTokens: totalTokens[0]?.total || 0,
          totalCost: parseFloat((totalCost[0]?.total || 0).toFixed(4)),
          avgDuration: Math.round(avgDuration[0]?.avg || 0),
        },
        byModel: modelStats,
        dailyTrend,
      }),
    )
  } catch (err) {
    console.error('AI stats error:', err)
    res.status(500).json(error('获取AI统计数据失败'))
  }
})

router.get('/heatmap/clicks', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { path, range = '7d' } = req.query
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7

    let sql = `SELECT client_x, client_y, path, COUNT(*) as weight
               FROM analytics_events
               WHERE event_type = 'click' AND client_x IS NOT NULL
               AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`
    const params = [days]

    if (path && path !== 'all') {
      sql += ' AND path = ?'
      params.push(path)
    }

    sql += ' GROUP BY client_x, client_y, path ORDER BY weight DESC LIMIT 1000'

    const [rows] = await db.query(sql, params)

    const data = rows.map((r) => ({
      x: r.client_x,
      y: r.clientY,
      weight: r.weight,
      path: r.path,
    }))

    res.json(success(data))
  } catch (err) {
    console.error('Heatmap clicks error:', err)
    res.status(500).json(error('获取点击热力图数据失败'))
  }
})

router.get('/heatmap/scroll', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { path, range = '7d' } = req.query
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7

    let sql = `SELECT path,
               FLOOR(scroll_depth / 5) * 5 as depth_range,
               COUNT(*) as visits,
               COUNT(DISTINCT session_id) as unique_sessions
               FROM analytics_events
               WHERE event_type = 'scroll' AND scroll_depth IS NOT NULL
               AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`
    const params = [days]

    if (path && path !== 'all') {
      sql += ' AND path = ?'
      params.push(path)
    }

    sql += ' GROUP BY path, depth_range ORDER BY depth_range'

    const [rows] = await db.query(sql, params)
    res.json(success(rows))
  } catch (err) {
    console.error('Heatmap scroll error:', err)
    res.status(500).json(error('获取滚动热力图数据失败'))
  }
})

router.get('/features', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { range = '7d' } = req.query
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7

    const [featureUsage] = await db.query(
      `SELECT event_name as feature, COUNT(*) as usage_count,
              COUNT(DISTINCT user_id) as unique_users,
              ROUND(COALESCE(AVG(dwell_time_ms), 0)) as avg_dwell_ms
       FROM analytics_events
       WHERE event_type = 'feature_usage' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY event_name ORDER BY usage_count DESC`,
      [days],
    )

    const [dailyFeatureTrend] = await db.query(
      `SELECT DATE(created_at) as date, event_name as feature, COUNT(*) as count
       FROM analytics_events
       WHERE event_type = 'feature_usage' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(created_at), event_name ORDER BY date, feature`,
      [days],
    )

    res.json(success({ features: featureUsage, dailyTrend: dailyFeatureTrend }))
  } catch (err) {
    console.error('Features stats error:', err)
    res.status(500).json(error('获取功能使用统计失败'))
  }
})

router.get('/funnel/default', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { range = '30d' } = req.query
    const days = range === '90d' ? 90 : parseInt(range)

    const funnelSteps = [
      { name: '访问网站', condition: "event_type = 'page_view'" },
      { name: '注册账号', condition: "event_name = 'register'" },
      {
        name: '首次AI调用',
        condition: "event_name IN ('ai_generate', 'ai_code_generate', 'ai_image_generate')",
      },
      { name: '保存内容', condition: "event_name IN ('gallery_save', 'project_save')" },
      { name: '分享作品', condition: "event_name IN ('gallery_share', 'project_share')" },
    ]

    const results = []
    for (const step of funnelSteps) {
      const [row] = await db.query(
        `SELECT COUNT(DISTINCT user_id) as users FROM analytics_events
         WHERE ${step.condition} AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [days],
      )
      results.push({
        step: step.name,
        users: row[0]?.users || 0,
      })
    }

    const totalUsers = results[0]?.users || 1
    const funnelData = results.map((r, i) => ({
      ...r,
      conversionRate: i === 0 ? 100 : Math.round((r.users / totalUsers) * 10000) / 100,
      dropOff:
        i === 0
          ? 0
          : Math.round(
              ((results[i - 1].users - r.users) / Math.max(results[i - 1].users, 1)) * 10000,
            ) / 100,
    }))

    res.json(success(funnelData))
  } catch (err) {
    console.error('Funnel error:', err)
    res.status(500).json(error('获取漏斗数据失败'))
  }
})

router.post('/funnel/custom', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { name, steps, range = '30d' } = req.body
    if (!name || !Array.isArray(steps) || steps.length < 2) {
      return res.status(400).json(error('漏斗配置无效'))
    }

    const days = range === '90d' ? 90 : parseInt(range) || 30

    const results = []
    for (const step of steps) {
      let condition
      const params = [days]

      if (Array.isArray(step.events)) {
        const placeholders = step.events.map(() => 'event_name = ?').join(' OR ')
        condition = placeholders
        params.unshift(...step.events)
      } else {
        condition = 'event_name = ?'
        params.unshift(step.event || step)
      }

      const [row] = await db.query(
        `SELECT COUNT(DISTINCT user_id) as users FROM analytics_events
         WHERE (${condition}) AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        params,
      )
      results.push({
        step: step.name || step.event || step,
        users: row[0]?.users || 0,
      })
    }

    const totalUsers = results[0]?.users || 1
    const funnelData = results.map((r, i) => ({
      ...r,
      conversionRate: i === 0 ? 100 : Math.round((r.users / totalUsers) * 10000) / 100,
      dropOff:
        i === 0
          ? 0
          : Math.round(
              ((results[i - 1].users - r.users) / Math.max(results[i - 1].users, 1)) * 10000,
            ) / 100,
    }))

    res.json(success({ name, steps: funnelData }))
  } catch (err) {
    console.error('Custom funnel error:', err)
    res.status(500).json(error('获取自定义漏斗数据失败'))
  }
})

router.get('/retention', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { cohortDate, type = 'day' } = req.query

    if (type === 'day') {
      const targetDate = cohortDate || new Date().toISOString().split('T')[0]

      const [cohortUsers] = await db.query(
        `SELECT DISTINCT user_id FROM analytics_events
         WHERE DATE(created_at) = ?`,
        [targetDate],
      )

      const userIds = cohortUsers.map((u) => u.user_id)
      if (userIds.length === 0) {
        return res.success({ cohortDate: targetDate, data: [] })
      }

      const retentionData = []
      for (let i = 0; i <= 30; i++) {
        const checkDate = new Date(targetDate)
        checkDate.setDate(checkDate.getDate() + i)
        const dateStr = checkDate.toISOString().split('T')[0]

        const [returned] = await db.query(
          `SELECT COUNT(DISTINCT user_id) as count FROM analytics_events
           WHERE user_id IN (?) AND DATE(created_at) = ?`,
          [userIds, dateStr],
        )

        retentionData.push({
          day: i,
          date: dateStr,
          returned: returned[0]?.count || 0,
          rate: Math.round((returned[0]?.count / userIds.length) * 10000) / 100,
        })
      }

      res.json(success({ cohortDate: targetDate, cohortSize: userIds.length, data: retentionData }))
    } else {
      const [cohorts] = await db.query(
        `SELECT DATE_FORMAT(MIN(created_at), '%Y-%m-01') as month,
                COUNT(DISTINCT user_id) as cohort_size
         FROM analytics_events
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(created_at), user_id
         HAVING cohort_size > 0
         ORDER BY month DESC LIMIT 6`,
      )

      res.json(success(cohorts))
    }
  } catch (err) {
    console.error('Retention error:', err)
    res.status(500).json(error('获取留存数据失败'))
  }
})

export default router
