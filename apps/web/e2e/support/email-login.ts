import { expect, type Page } from '@playwright/test'

export async function revealEmailLogin(page: Page) {
  const emailToggle = page.getByRole('button', { name: /use email instead/i })

  if (await emailToggle.isVisible().catch(() => false)) {
    await emailToggle.click()
  }

  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
}
