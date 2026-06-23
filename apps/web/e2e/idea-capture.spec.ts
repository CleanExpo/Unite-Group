import { test, expect, loginAsFounder } from './fixtures/auth'

test.skip(!process.env.PLAYWRIGHT_TEST_EMAIL, 'requires E2E auth env (PLAYWRIGHT_TEST_EMAIL) not configured')

test.beforeEach(async ({ page }) => {
  await loginAsFounder(page)
})

test('capture panel opens from topbar', async ({ page }) => {
  await page.click('[aria-label="Capture idea"]')
  await expect(page.getByRole('heading').filter({ hasText: /capture/i })).toBeVisible()
  await expect(page.locator('textarea')).toBeVisible()
})
