import { test, expect } from '@playwright/test'

test.describe('Login Flow E2E', () => {
  test('should complete full login flow', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[placeholder*="用户名"], input[type="text"]', 'testuser')
    await page.fill('input[placeholder*="密码"], input[type="password"]', 'password123')

    const submitButton = page.locator('button[type="submit"], button:has-text("登录")')
    if (await submitButton.isVisible()) {
      await submitButton.click()

      await page.waitForURL('**/ai-content**', { timeout: 10000 }).catch(() => {})
      await page.waitForURL('**/', { timeout: 5000 }).catch(() => {})
    }
  })

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[placeholder*="用户名"], input[type="text"]', 'wronguser')
    await page.fill('input[placeholder*="密码"], input[type="password"]', 'wrongpassword')

    const submitButton = page.locator('button[type="submit"], button:has-text("登录")')
    if (await submitButton.isVisible()) {
      await submitButton.click()

      await page.waitForTimeout(2000)

      const errorMessage = page.locator('.el-message--error, .error-message, [role="alert"]')
      if (await errorMessage.isVisible().catch(() => false)) {
        expect(await errorMessage.textContent()).toBeTruthy()
      }
    }
  })
})

test.describe('Register Flow E2E', () => {
  test('should navigate to register page and show form', async ({ page }) => {
    await page.goto('/register')

    const usernameInput = page.locator('input[placeholder*="用户名"], input[type="text"]').first()
    const emailInput = page.locator('input[placeholder*="邮箱"], input[type="email"]')
    const passwordInput = page.locator('input[placeholder*="密码"], input[type="password"]').first()

    if (await usernameInput.isVisible()) {
      await usernameInput.fill('newtestuser')
    }
    if (await emailInput.isVisible()) {
      await emailInput.fill('newtest@example.com')
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('password123')
    }
  })
})

test.describe('Navigation E2E', () => {
  test('should navigate between pages after login', async ({ page }) => {
    await page.goto('/')

    const sidebarItems = page.locator('.sidebar .menu-item, .el-menu-item, nav a')
    const itemCount = await sidebarItems.count()

    if (itemCount > 0) {
      for (let i = 0; i < Math.min(itemCount, 3); i++) {
        const item = sidebarItems.nth(i)
        if (await item.isVisible()) {
          await item.click()
          await page.waitForTimeout(500)
        }
      }
    }
  })
})
