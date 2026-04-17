const ERROR_REPORT_URL = '/api/error-report'
const MAX_ERROR_QUEUE = 50
const FLUSH_INTERVAL = 30000

const errorQueue = []
let isFlushing = false

function getErrorContext() {
  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    screenSize: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
  }
}

function categorizeError(error) {
  const message = error.message || String(error)
  if (message.includes('Network') || message.includes('fetch')) return 'network'
  if (message.includes('ChunkLoadError') || message.includes('Loading chunk')) return 'chunk_load'
  if (message.includes('TypeError')) return 'runtime'
  if (message.includes('SyntaxError')) return 'syntax'
  if (message.includes('Unauthorized') || message.includes('401')) return 'auth'
  return 'unknown'
}

function addToQueue(errorData) {
  if (errorQueue.length >= MAX_ERROR_QUEUE) {
    errorQueue.shift()
  }
  errorQueue.push(errorData)
}

async function flushErrors() {
  if (isFlushing || errorQueue.length === 0) return

  isFlushing = true
  const errorsToSend = [...errorQueue]
  errorQueue.length = 0

  try {
    let sent = false
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ errors: errorsToSend })], {
        type: 'application/json',
      })
      sent = navigator.sendBeacon(ERROR_REPORT_URL, blob)
    }

    if (!sent) {
      await fetch(ERROR_REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: errorsToSend }),
        keepalive: true,
      })
    }
  } catch {
    // 静默降级：后端不可达时不阻塞用户
  } finally {
    isFlushing = false
  }
}

setInterval(flushErrors, FLUSH_INTERVAL)

window.addEventListener('beforeunload', () => {
  if (errorQueue.length > 0) {
    flushErrors()
  }
})

export function captureError(error, extra = {}) {
  const errorData = {
    ...getErrorContext(),
    category: categorizeError(error),
    message: error.message || String(error),
    stack: error.stack || null,
    name: error.name || 'Error',
    extra,
  }

  addToQueue(errorData)

  if (import.meta.env.DEV) {
    console.error('[ErrorMonitor]', errorData)
  }

  return errorData
}

export function captureVueError(err, vm, info) {
  return captureError(err, {
    component: vm?.$options?.name || vm?.$options?.__name || 'Anonymous',
    lifecycleHook: info,
    props: vm?.$props ? Object.keys(vm.$props) : [],
  })
}

export function initErrorMonitor(app) {
  window.onerror = (message, source, lineno, colno, error) => {
    captureError(error || new Error(message), {
      source,
      lineno,
      colno,
    })
    return false
  }

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason || new Error('Unhandled Promise Rejection'), {
      type: 'unhandledrejection',
    })
  })

  if (app) {
    app.config.errorHandler = (err, vm, info) => {
      captureVueError(err, vm, info)
    }
  }
}

export function getErrorStats() {
  return {
    queueSize: errorQueue.length,
    categories: errorQueue.reduce((acc, err) => {
      acc[err.category] = (acc[err.category] || 0) + 1
      return acc
    }, {}),
  }
}
