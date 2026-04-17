const TRACK_URL = '/api/analytics/track'
const MAX_QUEUE = 200
const FLUSH_INTERVAL = 30000

const eventQueue = []
let isFlushing = false
let userId = null
let apiAvailable = true
let consecutiveFailures = 0
const MAX_CONSECUTIVE_FAILURES = 3

function getCommonProperties() {
  return {
    url: window.location.href,
    path: window.location.pathname,
    referrer: document.referrer,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    language: navigator.language,
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

function addToQueue(event) {
  if (eventQueue.length >= MAX_QUEUE) {
    eventQueue.shift()
  }
  eventQueue.push(event)
}

async function flushEvents() {
  if (isFlushing || eventQueue.length === 0) return

  isFlushing = true
  const toSend = [...eventQueue]
  eventQueue.length = 0

  try {
    const formattedEvents = toSend.map((e) => ({
      user_id: e.userId,
      session_id: e.sessionId,
      event_type: e.eventType || 'custom',
      event_name: e.event,
      properties: e.properties,
      url: e.url,
      path: e.path,
      referrer: e.referrer,
      viewportWidth: e.viewportWidth,
      viewportHeight: e.viewportHeight,
      clientX: e.clientX,
      clientY: e.clientY,
      scrollDepth: e.scrollDepth,
      dwellTimeMs: e.dwellTimeMs,
    }))

    if (navigator.sendBeacon && apiAvailable) {
      const blob = new Blob([JSON.stringify({ events: formattedEvents })], {
        type: 'application/json',
      })
      const sent = navigator.sendBeacon(TRACK_URL, blob)
      if (!sent) {
        throw new Error('sendBeacon failed')
      }
    } else if (apiAvailable) {
      await fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: formattedEvents }),
        keepalive: true,
      }).catch(() => {
        throw new Error('fetch failed')
      })
    }
    consecutiveFailures = 0
  } catch (e) {
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
    eventQueue.unshift(...toSend.slice(0, 20))
  } finally {
    isFlushing = false
  }
}

setInterval(flushEvents, FLUSH_INTERVAL)
window.addEventListener('beforeunload', () => {
  if (eventQueue.length > 0) flushEvents()
})

export function trackEvent(eventName, properties = {}, eventType = 'custom') {
  const event = {
    ...getCommonProperties(),
    event: eventName,
    eventType,
    properties,
  }

  addToQueue(event)

  if (import.meta.env.DEV) {
    console.log(`[Track] ${eventName}`, properties)
  }
}

export function trackPageView(pageName, properties = {}) {
  trackEvent('page_view', { pageName, title: document.title, ...properties }, 'page_view')
}

export function trackUserAction(action, target, properties = {}) {
  trackEvent('user_action', { action, target, ...properties }, 'user_action')
}

export function trackFeatureUsage(feature, properties = {}) {
  trackEvent(feature, { feature, ...properties }, 'feature_usage')
}

export function trackError(errorType, errorMessage, properties = {}) {
  trackEvent('error', { errorType, errorMessage, ...properties }, 'error')
}

export function trackClick(element, properties = {}) {
  const rect = element.getBoundingClientRect()
  const x = Math.round(rect.left + rect.width / 2)
  const y = Math.round(rect.top + rect.height / 2)
  const event = trackEvent(
    'click',
    {
      tag: element.tagName.toLowerCase(),
      id: element.id || undefined,
      class: element.className || undefined,
      text: element.textContent?.slice(0, 50) || undefined,
      href: element.href || undefined,
      x,
      y,
      ...properties,
    },
    'click',
  )
  event.clientX = x
  event.clientY = y
}

export function trackScroll(depth) {
  trackEvent('scroll', { depth: Math.round(depth * 100) / 100 }, 'scroll').scrollDepth =
    Math.round(depth * 100) / 100
}

export function trackDwellTime(pagePath, duration) {
  trackEvent('dwell_time', { pagePath, duration: Math.round(duration) }, 'dwell_time').dwellTimeMs =
    Math.round(duration)
}

export function trackAICall(model, callType, options = {}) {
  trackEvent(
    `ai_${callType}`,
    {
      model,
      callType,
      promptLength: options.promptLength,
      success: options.success !== false,
      duration: options.duration,
      error: options.error,
      tokensUsed: options.tokensUsed,
    },
    'ai_call',
  )
}

export function trackFunnelStep(funnelName, stepName, properties = {}) {
  trackEvent('funnel_step', { funnelName, stepName, ...properties }, 'funnel')
}

function initHeatmapTracker() {
  let lastScrollDepth = 0
  let scrollTimeout = null
  let pageEntryTime = Date.now()
  let lastPath = window.location.pathname

  document.addEventListener(
    'click',
    (e) => {
      const target = e.target.closest('a, button, [data-track], input, select, textarea')
      if (target) {
        trackClick(target)
      } else {
        trackEvent('click', { x: e.clientX, y: e.clientY }, 'click').clientX = e.clientX
        trackEvent('click', { x: e.clientX, y: e.clientY }, 'click').clientY = e.clientY
      }
    },
    { passive: true },
  )

  window.addEventListener(
    'scroll',
    () => {
      if (scrollTimeout) return
      scrollTimeout = setTimeout(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const depth = docHeight > 0 ? scrollTop / docHeight : 0

        if (Math.abs(depth - lastScrollDepth) >= 0.05) {
          trackScroll(depth)
          lastScrollDepth = depth
        }
        scrollTimeout = null
      }, 300)
    },
    { passive: true },
  )

  setInterval(() => {
    const currentPath = window.location.pathname
    if (currentPath !== lastPath) {
      if (lastPath) {
        const dwellTime = Date.now() - pageEntryTime
        trackDwellTime(lastPath, dwellTime)
      }
      lastPath = currentPath
      pageEntryTime = Date.now()
      lastScrollDepth = 0
    }
  }, 1000)

  window.addEventListener('beforeunload', () => {
    const dwellTime = Date.now() - pageEntryTime
    trackDwellTime(window.location.pathname, dwellTime)
  })
}

let heatmapInitialized = false
export function initAnalytics(options = {}) {
  if (heatmapInitialized) return
  heatmapInitialized = true

  if (options.userId) {
    userId = options.userId
  }

  if (options.enableHeatmap !== false) {
    initHeatmapTracker()
  }

  trackPageView(window.location.pathname)

  if (import.meta.env.DEV) {
    console.log('[Analytics] Initialized with options:', options)
  }
}

export function setTrackingUserId(id) {
  userId = id
}

export function getTrackingStats() {
  return {
    queueSize: eventQueue.length,
    events: eventQueue.reduce((acc, e) => {
      acc[e.event] = (acc[e.event] || 0) + 1
      return acc
    }, {}),
  }
}

export const EVENTS = {
  PAGE_VIEW: 'page_view',
  USER_ACTION: 'user_action',
  FEATURE_USAGE: 'feature_usage',
  AI_GENERATE: 'ai_generate',
  AI_CODE_GENERATE: 'ai_code_generate',
  AI_IMAGE_GENERATE: 'ai_image_generate',
  PROMPT_USE: 'prompt_use',
  GALLERY_SAVE: 'gallery_save',
  GALLERY_SHARE: 'gallery_share',
  PROJECT_CREATE: 'project_create',
  PROJECT_SAVE: 'project_save',
  PROJECT_SHARE: 'project_share',
  APP_CREATE: 'app_create',
  APP_DEPLOY: 'app_deploy',
  FILE_UPLOAD: 'file_upload',
  EXPORT: 'export',
  SEARCH: 'search',
  LOGIN: 'login',
  REGISTER: 'register',
  LOGOUT: 'logout',
}

export const FUNNEL_STEPS = {
  VISIT: 'visit_website',
  REGISTER: 'register_account',
  FIRST_AI_CALL: 'first_ai_call',
  SAVE_CONTENT: 'save_content',
  SHARE_WORK: 'share_work',
  UPGRADE_VIP: 'upgrade_vip',
}
