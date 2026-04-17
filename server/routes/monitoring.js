import { Router } from 'express'
import { logger } from '../utils/logger.js'

const router = Router()

const MAX_ERRORS_PER_REQUEST = 50

router.post('/error-report', (req, res) => {
  try {
    const { errors } = req.body

    if (!errors || !Array.isArray(errors)) {
      return res.status(400).json({ code: 400, message: 'Invalid error report format' })
    }

    const errorsToProcess = errors.slice(0, MAX_ERRORS_PER_REQUEST)

    for (const error of errorsToProcess) {
      const logLevel = getErrorLogLevel(error.category)
      logger[logLevel]('Frontend Error', {
        category: error.category,
        message: error.message,
        name: error.name,
        url: error.url,
        userAgent: error.userAgent,
        screenSize: error.screenSize,
        timestamp: error.timestamp,
        stack: error.stack ? error.stack.substring(0, 500) : null,
        extra: error.extra || {},
      })
    }

    return res.json({ code: 200, message: 'Error report received', count: errorsToProcess.length })
  } catch (error) {
    logger.error('Error processing error report:', error.message)
    return res.status(500).json({ code: 500, message: 'Internal server error' })
  }
})

router.post('/metrics-report', (req, res) => {
  try {
    const { metrics } = req.body

    if (!metrics || !Array.isArray(metrics)) {
      return res.status(400).json({ code: 400, message: 'Invalid metrics report format' })
    }

    const metricsToProcess = metrics.slice(0, 100)

    for (const metric of metricsToProcess) {
      if (metric.type === 'web_vital') {
        logger.info('WebVital', {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          path: metric.path,
          sessionId: metric.sessionId,
        })
      } else if (metric.type === 'page_load') {
        logger.info('PageLoad', {
          path: metric.path,
          fullLoad: metric.fullLoad,
          ttfb: metric.ttfb,
          domReady: metric.domReady,
        })
      } else if (metric.type === 'api_call') {
        const logLevel = metric.duration > 3000 ? 'warn' : 'debug'
        logger[logLevel]('ApiCall', {
          url: metric.url,
          method: metric.method,
          duration: metric.duration,
          status: metric.status,
        })
      } else if (metric.type === 'route_change') {
        logger.debug('RouteChange', {
          from: metric.from,
          to: metric.to,
        })
      }
    }

    return res.json({
      code: 200,
      message: 'Metrics report received',
      count: metricsToProcess.length,
    })
  } catch (error) {
    logger.error('Error processing metrics report:', error.message)
    return res.status(500).json({ code: 500, message: 'Internal server error' })
  }
})

function getErrorLogLevel(category) {
  switch (category) {
    case 'network':
    case 'chunk_load':
      return 'warn'
    case 'auth':
      return 'warn'
    case 'syntax':
      return 'error'
    default:
      return 'error'
  }
}

router.post('/track', (req, res) => {
  try {
    const { events } = req.body

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ code: 400, message: 'Invalid track data format' })
    }

    const eventsToProcess = events.slice(0, 200)

    const eventCounts = {}
    for (const event of eventsToProcess) {
      const name = event.event || 'unknown'
      eventCounts[name] = (eventCounts[name] || 0) + 1

      if (name === 'feature_usage' || name === 'ai_generate' || name === 'ai_image_generate') {
        logger.info('UserEvent', {
          event: name,
          userId: event.userId,
          sessionId: event.sessionId,
          path: event.path,
          properties: event.properties || {},
        })
      }
    }

    logger.debug('TrackBatch', {
      total: eventsToProcess.length,
      events: eventCounts,
    })

    return res.json({ code: 200, message: 'Track data received', count: eventsToProcess.length })
  } catch (error) {
    logger.error('Error processing track data:', error.message)
    return res.status(500).json({ code: 500, message: 'Internal server error' })
  }
})

export default router
