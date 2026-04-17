import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import i18n from '@/i18n'
import MainLayout from '@/layouts/MainLayout.vue'
import HomePage from '@/views/home/HomePage.vue'
import { trackRouteChange } from '@/utils/performanceMonitor'
import { trackPageView } from '@/utils/analytics'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: HomePage,
        meta: { titleKey: 'route.home' },
      },
      {
        path: '/ai-content',
        name: 'AIContent',
        component: () => import('@/views/ai-content/AIContentPage.vue'),
        meta: { titleKey: 'route.aiContent', requiresAuth: true },
      },
      {
        path: '/ai-image',
        name: 'AIImage',
        component: () => import('@/views/ai-image/AIImagePage.vue'),
        meta: { titleKey: 'route.aiImage', requiresAuth: true },
      },
      {
        path: '/prompt-library',
        name: 'PromptLibrary',
        component: () => import('@/views/prompt-library/PromptLibraryPage.vue'),
        meta: { titleKey: 'route.promptLibrary', requiresAuth: true },
      },
      {
        path: '/gallery',
        name: 'UserGallery',
        component: () => import('@/views/user-gallery/UserGalleryPage.vue'),
        meta: { titleKey: 'route.gallery', requiresAuth: true },
      },
      {
        path: '/code-studio',
        name: 'CodeStudio',
        component: () => import('@/views/code-studio/CodeStudioPage.vue'),
        meta: { titleKey: 'route.codeStudio', requiresAuth: true },
      },
      {
        path: '/app-builder',
        name: 'AppBuilder',
        component: () => import('@/views/app-builder/AppBuilderPage.vue'),
        meta: { titleKey: 'route.appBuilder', requiresAuth: true },
      },
      {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/profile/ProfilePage.vue'),
        meta: { titleKey: 'route.profile', requiresAuth: true },
      },
      {
        path: '/analytics',
        name: 'Analytics',
        component: () => import('@/views/analytics/AnalyticsDashboard.vue'),
        meta: { titleKey: 'route.analytics', requiresAuth: true, requiresRole: ['admin'] },
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginPage.vue'),
    meta: { titleKey: 'route.login' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterPage.vue'),
    meta: { titleKey: 'route.register' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: HomePage,
    meta: { titleKey: 'route.notFound' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

NProgress.configure({ showSpinner: false })

function isTokenExpired(token) {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

router.beforeEach(async (to) => {
  NProgress.start()

  if (to.meta.titleKey) {
    const { t } = i18n.global
    document.title = `${t(to.meta.titleKey)} - ${t('common.appName')}`
  }

  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth) {
    if (!token) {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }

    if (isTokenExpired(token)) {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken && !isTokenExpired(refreshToken)) {
        try {
          const { useUserStore } = await import('@/stores/modules/user')
          const userStore = useUserStore()
          const success = await userStore.refreshAccessToken()
          if (!success) {
            userStore.clearAuth()
            return { name: 'Login', query: { redirect: to.fullPath } }
          }
        } catch {
          return { name: 'Login', query: { redirect: to.fullPath } }
        }
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userInfo')
        return { name: 'Login', query: { redirect: to.fullPath } }
      }
    }

    if (to.meta.requiresRole) {
      try {
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
        if (!to.meta.requiresRole.includes(userInfo.role)) {
          return { name: 'Home' }
        }
      } catch {
        return { name: 'Login', query: { redirect: to.fullPath } }
      }
    }
  }

  if ((to.name === 'Login' || to.name === 'Register') && token && !isTokenExpired(token)) {
    const redirect = to.query.redirect || '/'
    return redirect
  }
})

router.afterEach((to, from) => {
  NProgress.done()
  if (from.path !== to.path) {
    trackRouteChange(from.path, to.path)
    trackPageView(to.name || to.path, { from: from.path })
  }
})

export default router
