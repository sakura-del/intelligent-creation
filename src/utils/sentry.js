import * as Sentry from '@sentry/vue'
import { browserTracingIntegration } from '@sentry/vue'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''
const SENTRY_ENABLED = import.meta.env.VITE_SENTRY_ENABLED === 'true'
const SENTRY_ENVIRONMENT = import.meta.env.MODE || 'development'
const SENTRY_RELEASE = import.meta.env.VITE_APP_VERSION || '1.0.0'

export function initSentry(app, router) {
  if (!SENTRY_ENABLED || !SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] Disabled or no DSN configured, skipping initialization')
    }
    return
  }

  Sentry.init({
    app,
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    integrations: [
      browserTracingIntegration({
        router,
      }),
    ],
    tracesSampleRate: SENTRY_ENVIRONMENT === 'production' ? 0.2 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    maxBreadcrumbs: 30,
    attachStacktrace: true,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      if (event.exception) {
        const error = hint.originalException
        if (error && error.message) {
          if (error.message.includes('ResizeObserver loop')) return null
          if (error.message.includes('Network Error')) return null
          if (error.message.includes('NavigationDuplicated')) return null
          if (error.message.includes('ChunkLoadError')) return null
        }
      }
      return event
    },
  })

  if (import.meta.env.DEV) {
    console.log('[Sentry] Initialized with DSN:', SENTRY_DSN.substring(0, 20) + '...')
  }
}

export function captureException(error, context = {}) {
  if (SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => scope.setTag(key, value))
      }
      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => scope.setExtra(key, value))
      }
      if (context.user) {
        scope.setUser(context.user)
      }
      Sentry.captureException(error)
    })
  }
}

export function captureMessage(message, level = 'info', context = {}) {
  if (SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => scope.setTag(key, value))
      }
      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => scope.setExtra(key, value))
      }
      Sentry.captureMessage(message, level)
    })
  }
}

export function setUserContext(user) {
  if (SENTRY_ENABLED && SENTRY_DSN && user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username || user.nickname,
    })
  }
}

export function clearUserContext() {
  if (SENTRY_ENABLED && SENTRY_DSN) {
    Sentry.setUser(null)
  }
}

export { Sentry }
