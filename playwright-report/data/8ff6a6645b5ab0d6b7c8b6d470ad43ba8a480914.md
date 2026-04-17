# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.js >> Accessibility >> should have proper heading structure on home page
- Location: e2e\app.spec.js:105:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic "Toggle devtools panel" [ref=e4] [cursor=pointer]:
    - img [ref=e5]
  - generic "Toggle Component Inspector" [ref=e10] [cursor=pointer]:
    - img [ref=e11]
```

# Test source

```ts
  8   |   test('should display login page', async ({ page }) => {
  9   |     await page.goto('/login')
  10  |     await expect(page).toHaveTitle(/登录/)
  11  |     await expect(page.locator('input[placeholder*="用户名"]')).toBeVisible()
  12  |     await expect(page.locator('input[placeholder*="密码"]')).toBeVisible()
  13  |   })
  14  | 
  15  |   test('should navigate to register page from login', async ({ page }) => {
  16  |     await page.goto('/login')
  17  |     const registerLink = page.locator('text=注册')
  18  |     if (await registerLink.isVisible()) {
  19  |       await registerLink.click()
  20  |       await expect(page).toHaveURL(/\/register/)
  21  |     }
  22  |   })
  23  | 
  24  |   test('should show validation errors on empty login submit', async ({ page }) => {
  25  |     await page.goto('/login')
  26  |     const submitButton = page.locator('button[type="submit"]')
  27  |     if (await submitButton.isVisible()) {
  28  |       await submitButton.click()
  29  |     }
  30  |   })
  31  | 
  32  |   test('should display register page', async ({ page }) => {
  33  |     await page.goto('/register')
  34  |     await expect(page).toHaveTitle(/注册/)
  35  |   })
  36  | 
  37  |   test('should redirect to login when accessing protected route', async ({ page }) => {
  38  |     await page.goto('/ai-content')
  39  |     await expect(page).toHaveURL(/\/login/)
  40  |   })
  41  | })
  42  | 
  43  | test.describe('Home Page', () => {
  44  |   test('should display home page', async ({ page }) => {
  45  |     await page.goto('/')
  46  |     await expect(page).toHaveTitle(/AI创作平台/)
  47  |   })
  48  | 
  49  |   test('should have navigation elements', async ({ page }) => {
  50  |     await page.goto('/')
  51  |     const navElements = page.locator('nav, .sidebar, .menu')
  52  |     if ((await navElements.count()) > 0) {
  53  |       expect(await navElements.first().isVisible()).toBeTruthy()
  54  |     }
  55  |   })
  56  | })
  57  | 
  58  | test.describe('Protected Routes', () => {
  59  |   test('should redirect unauthenticated users to login', async ({ page }) => {
  60  |     const protectedRoutes = ['/ai-content', '/ai-image', '/code-studio', '/gallery', '/profile']
  61  | 
  62  |     for (const route of protectedRoutes) {
  63  |       await page.goto(route)
  64  |       await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  65  |     }
  66  |   })
  67  | })
  68  | 
  69  | test.describe('Responsive Design', () => {
  70  |   test('should render correctly on mobile viewport', async ({ page }) => {
  71  |     await page.setViewportSize({ width: 375, height: 667 })
  72  |     await page.goto('/')
  73  |     await expect(page).toHaveTitle(/AI创作平台/)
  74  |   })
  75  | 
  76  |   test('should render correctly on tablet viewport', async ({ page }) => {
  77  |     await page.setViewportSize({ width: 768, height: 1024 })
  78  |     await page.goto('/')
  79  |     await expect(page).toHaveTitle(/AI创作平台/)
  80  |   })
  81  | 
  82  |   test('should render correctly on desktop viewport', async ({ page }) => {
  83  |     await page.setViewportSize({ width: 1440, height: 900 })
  84  |     await page.goto('/')
  85  |     await expect(page).toHaveTitle(/AI创作平台/)
  86  |   })
  87  | })
  88  | 
  89  | test.describe('Error Handling', () => {
  90  |   test('should handle 404 page gracefully', async ({ page }) => {
  91  |     const response = await page.goto('/non-existent-page')
  92  |     if (response) {
  93  |       expect(response.status()).toBeLessThan(500)
  94  |     }
  95  |   })
  96  | 
  97  |   test('should handle network errors gracefully', async ({ page }) => {
  98  |     await page.route('**/api/**', (route) => route.abort())
  99  |     await page.goto('/')
  100 |     await expect(page).toHaveTitle(/AI创作平台/)
  101 |   })
  102 | })
  103 | 
  104 | test.describe('Accessibility', () => {
  105 |   test('should have proper heading structure on home page', async ({ page }) => {
  106 |     await page.goto('/')
  107 |     const headings = page.locator('h1, h2, h3')
> 108 |     expect(await headings.count()).toBeGreaterThan(0)
      |                                    ^ Error: expect(received).toBeGreaterThan(expected)
  109 |   })
  110 | 
  111 |   test('should have accessible form inputs on login page', async ({ page }) => {
  112 |     await page.goto('/login')
  113 |     const inputs = page.locator('input')
  114 |     const inputCount = await inputs.count()
  115 | 
  116 |     for (let i = 0; i < inputCount; i++) {
  117 |       const input = inputs.nth(i)
  118 |       const hasLabel =
  119 |         (await input.getAttribute('aria-label')) ||
  120 |         (await input.getAttribute('placeholder')) ||
  121 |         (await page.locator(`label[for="${await input.getAttribute('id')}"]`).count()) > 0
  122 | 
  123 |       expect(hasLabel).toBeTruthy()
  124 |     }
  125 |   })
  126 | })
  127 | 
  128 | test.describe('Performance', () => {
  129 |   test('home page should load within acceptable time', async ({ page }) => {
  130 |     const startTime = Date.now()
  131 |     await page.goto('/')
  132 |     await page.waitForLoadState('networkidle')
  133 |     const loadTime = Date.now() - startTime
  134 | 
  135 |     expect(loadTime).toBeLessThan(10000)
  136 |   })
  137 | 
  138 |   test('login page should load within acceptable time', async ({ page }) => {
  139 |     const startTime = Date.now()
  140 |     await page.goto('/login')
  141 |     await page.waitForLoadState('networkidle')
  142 |     const loadTime = Date.now() - startTime
  143 | 
  144 |     expect(loadTime).toBeLessThan(5000)
  145 |   })
  146 | })
  147 | 
```