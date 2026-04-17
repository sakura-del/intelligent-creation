import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { logger } from './utils/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import { performanceMonitor, getMetrics, resetMetrics } from './middleware/performanceMonitor.js'
import routes from './routes/index.js'
import { wsService } from './services/websocket.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.openai.com', 'https://api.deepseek.com'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
)

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.CORS_ORIGIN,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
      ].filter(Boolean)

      if (!origin || allowedOrigins.includes(origin) || origin.match(/^http:\/\/localhost:\d+$/)) {
        callback(null, true)
      } else {
        logger.warn(`CORS blocked origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
    maxAge: 86400,
  }),
)

app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  next()
})

app.use('/api/', apiLimiter)

app.use(performanceMonitor)

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString()
  next()
})

app.use('/api', routes)

app.use(
  '/api/files',
  express.static(join(__dirname, UPLOAD_DIR), {
    setHeaders: (_res) => {
      res.set('Accept-Ranges', 'bytes')
      res.set('Cache-Control', 'public, max-age=86400')
    },
  }),
)

app.get('/health', async (req, res) => {
  const memUsage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()
  const result = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      arrayBuffers: `${Math.round((memUsage.arrayBuffers || 0) / 1024 / 1024)}MB`,
    },
    cpu: {
      user: `${Math.round(cpuUsage.user / 1000)}ms`,
      system: `${Math.round(cpuUsage.system / 1000)}ms`,
    },
  }

  try {
    const db = (await import('./database/connection.js')).default
    const dbHealth = await db.healthCheck()
    result.database = dbHealth
    if (dbHealth.status === 'unhealthy') {
      result.status = 'degraded'
    }
  } catch (error) {
    result.database = { status: 'unhealthy', error: error.message }
    result.status = 'degraded'
  }

  const statusCode = result.status === 'ok' ? 200 : 503
  res.status(statusCode).json(result)
})

app.get('/metrics', (req, res) => {
  const authHeader = req.headers.authorization
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.METRICS_TOKEN}`
  ) {
    return res.status(401).json({ code: 401, message: '未授权访问' })
  }
  res.json(getMetrics())
})

app.post('/metrics/reset', (req, res) => {
  const authHeader = req.headers.authorization
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.METRICS_TOKEN}`
  ) {
    return res.status(401).json({ code: 401, message: '未授权访问' })
  }
  resetMetrics()
  res.json({ code: 200, message: '指标已重置' })
})

app.use(errorHandler)

app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口地址不存在',
    data: null,
  })
})

const server = createServer(app)

wsService.initialize(server)

server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`)
  logger.info(`Health check: http://localhost:${PORT}/health`)
  logger.info(`API Base URL: http://localhost:${PORT}/api`)
  logger.info(`WebSocket: ws://localhost:${PORT}/ws`)
})

let isShuttingDown = false

async function gracefulShutdown(signal) {
  if (isShuttingDown) return
  isShuttingDown = true

  logger.info(`Received ${signal}, starting graceful shutdown...`)

  const forceTimeout = setTimeout(() => {
    logger.warn('Forcing shutdown after timeout')
    process.exit(1)
  }, 15000)

  server.close(async () => {
    logger.info('HTTP server closed')

    try {
      const db = await import('./database/connection.js')
      await db.default.close()
      logger.info('Database connections closed')
    } catch (err) {
      logger.warn('Error closing database:', err.message)
    }

    clearTimeout(forceTimeout)
    logger.info('Graceful shutdown complete')
    process.exit(0)
  })

  wsService.wss?.close(() => {
    logger.info('WebSocket server closed')
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason)
})

export default app
