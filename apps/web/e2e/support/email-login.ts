import { expect, type Page } from '@playwright/test'

export async function revealEmailLogin(page: Page) {
  const emailToggle = page.getByRole('button', { name: /use email instead/i })
  const emailInput = page.locator('input[type="email"]')

  // The sign-in page reads its return path in the browser, so its first paint shows Google only. The email choice
  // appears once the page has hydrated: wait for it (or an already-open form) instead of checking once at first paint.
  await expect(emailToggle.or(emailInput).first()).toBeVisible()
  if (await emailToggle.isVisible()) {
    await emailToggle.click()
  }

  await expect(emailInput).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
}
