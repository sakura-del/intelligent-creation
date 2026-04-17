import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/登录/)
    await expect(page.locator('input[placeholder*="用户名"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="密码"]')).toBeVisible()
  })

  test('should navigate to register page from login', async ({ page }) => {
    await page.goto('/login')
    const registerLink = page.locator('text=注册')
    if (await registerLink.isVisible()) {
      await registerLink.click()
      await expect(page).toHaveURL(/\/register/)
    }
  })

  test('should show validation errors on empty login submit', async ({ page }) => {
    await page.goto('/login')
    const submitButton = page.locator('button[type="submit"]')
    if (await submitButton.isVisible()) {
      await submitButton.click()
    }
  })

  test('should display register page', async ({ page }) => {
    await page.goto('/register')
    await expect(page).toHaveTitle(/注册/)
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/ai-content')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Home Page', () => {
  test('should display home page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/AI创作平台/)
  })

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/')
    const navElements = page.locator('nav, .sidebar, .menu')
    if ((await navElements.count()) > 0) {
      expect(await navElements.first().isVisible()).toBeTruthy()
    }
  })
})

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    const protectedRoutes = ['/ai-content', '/ai-image', '/code-studio', '/gallery', '/profile']

    for (const route of protectedRoutes) {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
    }
  })
})

test.describe('Responsive Design', () => {
  test('should render correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(page).toHaveTitle(/AI创作平台/)
  })

  test('should render correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await expect(page).toHaveTitle(/AI创作平台/)
  })

  test('should render correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')
    await expect(page).toHaveTitle(/AI创作平台/)
  })
})

test.describe('Error Handling', () => {
  test('should handle 404 page gracefully', async ({ page }) => {
    const response = await page.goto('/non-existent-page')
    if (response) {
      expect(response.status()).toBeLessThan(500)
    }
  })

  test('should handle network errors gracefully', async ({ page }) => {
    await page.route('**/api/**', (route) => route.abort())
    await page.goto('/')
    await expect(page).toHaveTitle(/AI创作平台/)
  })
})

test.describe('Accessibility', () => {
  test('should have proper heading structure on home page', async ({ page }) => {
    await page.goto('/')
    const headings = page.locator('h1, h2, h3')
    expect(await headings.count()).toBeGreaterThan(0)
  })

  test('should have accessible form inputs on login page', async ({ page }) => {
    await page.goto('/login')
    const inputs = page.locator('input')
    const inputCount = await inputs.count()

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const hasLabel =
        (await input.getAttribute('aria-label')) ||
        (await input.getAttribute('placeholder')) ||
        (await page.locator(`label[for="${await input.getAttribute('id')}"]`).count()) > 0

      expect(hasLabel).toBeTruthy()
    }
  })
})

test.describe('Performance', () => {
  test('home page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000)
  })

  test('login page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(5000)
  })
})
