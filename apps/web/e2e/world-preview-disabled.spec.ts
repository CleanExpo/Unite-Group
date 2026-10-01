import { test, expect } from '@playwright/test'
import { loginAsFounder } from './fixtures/auth'

test.use({ trace: 'off', screenshot: 'off' })

test.beforeEach(async ({ baseURL }) => {
  expect(baseURL, 'World acceptance is local test-process only').toBeTruthy()
  expect(['localhost', '127.0.0.1']).toContain(new URL(baseURL!).hostname)
  expect(process.env.MISSION_CONTROL_VNEXT_PREVIEW).not.toBe('true')
})

test('World preview remains founder-protected while the flag is off', async ({ page }) => {
  await page.goto('/founder/mission-control-next?tab=world')
  await expect(page).toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('button', { name: 'Start fictional playtest' })).toHaveCount(0)
})

test('authenticated founder receives 404 while World preview is disabled', async ({ page }) => {
  await loginAsFounder(page)
  const response = await page.goto('/founder/mission-control-next?tab=world')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('button', { name: 'Start fictional playtest' })).toHaveCount(0)
})
