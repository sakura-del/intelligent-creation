import { onLCP, onCLS, onTTFB, onINP } from 'web-vitals'

const METRICS_REPORT_URL = '/api/metrics-report'
const MAX_METRICS_QUEUE = 100
const FLUSH_INTERVAL = 60000

const metricsQueue = []
let isFlushing = false
let pageLoadTime = performance.now()
let apiAvailable = true
let consecutiveFailures = 0
const MAX_CONSECUTIVE_FAILURES = 3

function getPageContext() {
  return {
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  }
}

let _sessionId = null
function getSessionId() {
  if (_sessionId) return _sessionId
  try {
    _sessionId = sessionStorage.getItem('_sid')
    if (!_sessionId) {
      _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      sessionStorage.setItem('_sid', _sessionId)
    }
    return _sessionId
  } catch {
    return 'unknown'
  }
}

function addToQueue(metricData) {
  if (metricsQueue.length >= MAX_METRICS_QUEUE) {
    metricsQueue.shift()
  }
  metricsQueue.push(metricData)
}

async function flushMetrics() {
  if (isFlushing || metricsQueue.length === 0) return

  isFlushing = true
  const toSend = [...metricsQueue]
  metricsQueue.length = 0

  try {
    let sent = false
    if (navigator.sendBeacon && apiAvailable) {
      const blob = new Blob([JSON.stringify({ metrics: toSend })], {
        type: 'application/json',
      })
      sent = navigator.sendBeacon(METRICS_REPORT_URL, blob)
    }

    if (!sent && apiAvailable) {
      await fetch(METRICS_REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: toSend }),
        keepalive: true,
      }).catch(() => {
        throw new Error('fetch failed')
      })
    }
    consecutiveFailures = 0
  } catch {
    consecutiveFailures++
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      apiAvailable = false
      setTimeout(
        () => {
          apiAvailable = true
          consecutiveFailures = 0
        },
        5 * 60 * 1000,
      )
    }
  } finally {
    isFlushing = false
  }
}

setInterval(flushMetrics, FLUSH_INTERVAL)

window.addEventListener('beforeunload', () => {
  if (metricsQueue.length > 0) {
    flushMetrics()
  }
})

function handleWebVital(metric) {
  const data = {
    ...getPageContext(),
    type: 'web_vital',
    name: metric.name,
    value: Math.round(metric.value),
    rating: metric.rating,
    delta: Math.round(metric.delta),
    navigationType: metric.navigationType,
  }

  addToQueue(data)

  if (import.meta.env.DEV) {
    const color =
      metric.rating === 'good' ? 'green' : metric.rating === 'needs-improvement' ? 'orange' : 'red'
    console.log(
      `%c[WebVital] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`,
      `color: ${color}`,
    )
  }
}

export function initPerformanceMonitor() {
  onLCP(handleWebVital)
  onCLS(handleWebVital)
  onTTFB(handleWebVital)
  onINP(handleWebVital)

  measurePageLoad()

  if (import.meta.env.DEV) {
    console.log('[APM] Performance monitor initialized')
  }
}

function measurePageLoad() {
  if (document.readyState === 'complete') {
    reportPageLoad()
  } else {
    window.addEventListener('load', reportPageLoad)
  }
}

function reportPageLoad() {
  setTimeout(() => {
    const [nav] = performance.getEntriesByType('navigation') || []
    if (!nav) return

    addToQueue({
      ...getPageContext(),
      type: 'page_load',
      dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcp: Math.round(nav.connectEnd - nav.connectStart),
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      download: Math.round(nav.responseEnd - nav.responseStart),
      domParsing: Math.round(nav.domInteractive - nav.responseEnd),
      domReady: Math.round(nav.domContentLoadedEventEnd - nav.fetchStart),
      fullLoad: Math.round(nav.loadEventEnd - nav.fetchStart),
      transferSize: nav.transferSize,
      decodedBodySize: nav.decodedBodySize,
    })
  }, 0)
}

export function trackCustomMetric(name, value, extra = {}) {
  addToQueue({
    ...getPageContext(),
    type: 'custom',
    name,
    value,
    ...extra,
  })
}

export function trackRouteChange(from, to) {
  addToQueue({
    ...getPageContext(),
    type: 'route_change',
    from,
    to,
    duration: Math.round(performance.now() - pageLoadTime),
  })
}

export function trackApiCall(url, method, duration, status, extra = {}) {
  addToQueue({
    ...getPageContext(),
    type: 'api_call',
    url,
    method,
    duration: Math.round(duration),
    status,
    ...extra,
  })
}

export function trackResourceLoad(resourceType, url, duration, size) {
  addToQueue({
    ...getPageContext(),
    type: 'resource_load',
    resourceType,
    url,
    duration: Math.round(duration),
    size,
  })
}

export function getMetricsStats() {
  return {
    queueSize: metricsQueue.length,
    types: metricsQueue.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1
      return acc
    }, {}),
  }
}
