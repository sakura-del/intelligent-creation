import os from 'os'
import { logger } from '../utils/logger.js'

const metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    byMethod: {},
    byPath: {},
    byStatusCode: {},
  },
  responseTime: {
    total: 0,
    count: 0,
    min: Infinity,
    max: 0,
    byPath: {},
  },
  activeConnections: 0,
  startTime: Date.now(),
}

const SLOW_REQUEST_THRESHOLD = 2000
const PATH_AGGREGATION_DEPTH = 3

let lastCpuUsage = process.cpuUsage()
let lastCpuTime = Date.now()

function aggregatePath(path) {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= PATH_AGGREGATION_DEPTH) return path
  return '/' + parts.slice(0, PATH_AGGREGATION_DEPTH).join('/') + '/...'
}

function getCpuUsagePercent() {
  const currentCpuUsage = process.cpuUsage(lastCpuUsage)
  const currentTime = Date.now()
  const elapsedMs = currentTime - lastCpuTime
  lastCpuUsage = process.cpuUsage()
  lastCpuTime = currentTime

  if (elapsedMs === 0) return 0

  const userPercent = (currentCpuUsage.user / 1000 / elapsedMs) * 100
  const systemPercent = (currentCpuUsage.system / 1000 / elapsedMs) * 100
  return {
    user: Math.round(userPercent * 100) / 100,
    system: Math.round(systemPercent * 100) / 100,
    total: Math.round((userPercent + systemPercent) * 100) / 100,
  }
}

function getSystemMetrics() {
  const cpus = os.cpus()
  const loadAvg = os.loadavg()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    nodeVersion: process.version,
    cpuCores: cpus.length,
    cpuModel: cpus[0]?.model || 'unknown',
    loadAverage: {
      '1m': Math.round(loadAvg[0] * 100) / 100,
      '5m': Math.round(loadAvg[1] * 100) / 100,
      '15m': Math.round(loadAvg[2] * 100) / 100,
    },
    memory: {
      total: `${Math.round(totalMem / 1024 / 1024)}MB`,
      free: `${Math.round(freeMem / 1024 / 1024)}MB`,
      used: `${Math.round((totalMem - freeMem) / 1024 / 1024)}MB`,
      usagePercent: `${Math.round(((totalMem - freeMem) / totalMem) * 100)}%`,
    },
    uptime: `${Math.round(os.uptime() / 3600)}h`,
  }
}

export const performanceMonitor = (req, res, next) => {
  const startTime = Date.now()
  metrics.activeConnections++
  metrics.requests.total++

  const method = req.method
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1

  const aggPath = aggregatePath(req.originalUrl)
  metrics.requests.byPath[aggPath] = (metrics.requests.byPath[aggPath] || 0) + 1

  let finished = false

  function onFinish(source) {
    if (finished) return
    finished = true
    metrics.activeConnections--

    const duration = Date.now() - startTime

    metrics.responseTime.total += duration
    metrics.responseTime.count++
    metrics.responseTime.min = Math.min(metrics.responseTime.min, duration)
    metrics.responseTime.max = Math.max(metrics.responseTime.max, duration)

    if (!metrics.responseTime.byPath[aggPath]) {
      metrics.responseTime.byPath[aggPath] = { total: 0, count: 0, max: 0 }
    }
    metrics.responseTime.byPath[aggPath].total += duration
    metrics.responseTime.byPath[aggPath].count++
    metrics.responseTime.byPath[aggPath].max = Math.max(
      metrics.responseTime.byPath[aggPath].max,
      duration,
    )

    const statusCode = res.statusCode
    metrics.requests.byStatusCode[statusCode] = (metrics.requests.byStatusCode[statusCode] || 0) + 1

    if (statusCode >= 400) {
      metrics.requests.errors++
    } else {
      metrics.requests.success++
    }

    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', {
        method,
        path: req.originalUrl,
        duration: `${duration}ms`,
        statusCode,
        userId: req.user?.id,
        ip: req.ip,
        source,
      })
    }
  }

  res.on('finish', () => onFinish('finish'))
  res.on('close', () => onFinish('close'))
  res.on('error', (error) => {
    onFinish('error')
    metrics.requests.errors++
    logger.error('Response error', {
      error: error.message,
      path: req.originalUrl,
      method: req.method,
    })
  })

  next()
}

export function getMetrics() {
  const uptime = Date.now() - metrics.startTime
  const avgResponseTime =
    metrics.responseTime.count > 0
      ? Math.round(metrics.responseTime.total / metrics.responseTime.count)
      : 0

  const pathStats = {}
  for (const [path, data] of Object.entries(metrics.responseTime.byPath)) {
    pathStats[path] = {
      avgTime: Math.round(data.total / data.count),
      maxTime: data.max,
      requests: data.count,
    }
  }

  return {
    uptime: `${Math.round(uptime / 1000)}s`,
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      errors: metrics.requests.errors,
      errorRate:
        metrics.requests.total > 0
          ? `${((metrics.requests.errors / metrics.requests.total) * 100).toFixed(2)}%`
          : '0%',
      byMethod: metrics.requests.byMethod,
      byStatusCode: metrics.requests.byStatusCode,
    },
    responseTime: {
      avg: `${avgResponseTime}ms`,
      min: metrics.responseTime.min === Infinity ? 'N/A' : `${metrics.responseTime.min}ms`,
      max: `${metrics.responseTime.max}ms`,
      byPath: pathStats,
    },
    activeConnections: metrics.activeConnections,
    process: {
      memory: process.memoryUsage(),
      cpu: getCpuUsagePercent(),
      pid: process.pid,
    },
    system: getSystemMetrics(),
  }
}

export function resetMetrics() {
  metrics.requests = { total: 0, success: 0, errors: 0, byMethod: {}, byPath: {}, byStatusCode: {} }
  metrics.responseTime = { total: 0, count: 0, min: Infinity, max: 0, byPath: {} }
  metrics.activeConnections = 0
  metrics.startTime = Date.now()
  lastCpuUsage = process.cpuUsage()
  lastCpuTime = Date.now()
}

const METRICS_LOG_INTERVAL = 5 * 60 * 1000
const metricsInterval = setInterval(() => {
  const currentMetrics = getMetrics()
  logger.info('Periodic metrics report', {
    totalRequests: currentMetrics.requests.total,
    errorRate: currentMetrics.requests.errorRate,
    avgResponseTime: currentMetrics.responseTime.avg,
    activeConnections: currentMetrics.activeConnections,
    memoryRSS: `${Math.round(currentMetrics.process.memory.rss / 1024 / 1024)}MB`,
    cpuPercent: `${currentMetrics.process.cpu.total}%`,
    systemMemUsage: currentMetrics.system.memory.usagePercent,
    loadAvg1m: currentMetrics.system.loadAverage['1m'],
  })
}, METRICS_LOG_INTERVAL)

metricsInterval.unref?.()
