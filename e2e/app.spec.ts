import { test, expect } from '@playwright/test'

test.describe('USRA PLUS - Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login page when not authenticated', async ({ page }) => {
    await expect(page).toHaveTitle(/USRA PLUS/)
  })

  test('should show language selector', async ({ page }) => {
    await expect(page.getByRole('button', { name: /language/i })).toBeVisible()
  })
})

test.describe('USRA PLUS - Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/')
    // Navigation items should be visible
    const navItems = page.getByRole('navigation')
    await expect(navItems).toBeVisible()
  })
})

test.describe('USRA PLUS - Responsive Design', () => {
  test('should render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(page).toHaveTitle(/USRA PLUS/)
  })

  test('should render correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    await expect(page).toHaveTitle(/USRA PLUS/)
  })
})

test.describe('USRA PLUS - Accessibility', () => {
  test('should have skip to content link', async ({ page }) => {
    await page.goto('/')
    const skipLink = page.getByText('Skip to main content')
    await expect(skipLink).toBeVisible()
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
  })
})

test.describe('USRA PLUS - Legal Pages', () => {
  test('should load privacy policy page', async ({ page }) => {
    await page.goto('/?page=privacy')
    await expect(page).toHaveTitle(/USRA PLUS/)
  })

  test('should load terms of service page', async ({ page }) => {
    await page.goto('/?page=terms')
    await expect(page).toHaveTitle(/USRA PLUS/)
  })

  test('should load cookie policy page', async ({ page }) => {
    await page.goto('/?page=cookies')
    await expect(page).toHaveTitle(/USRA PLUS/)
  })
})
