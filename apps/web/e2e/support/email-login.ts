import { expect, type Page } from '@playwright/test'

export async function revealEmailLogin(page: Page) {
  const emailToggle = page.getByRole('button', { name: /use email instead/i })
  const emailInput = page.locator('input[type="email"]')

  // The login page's first paint shows Google only; the email fallback (or its toggle) appears once the browser has
  // read the return path (UNI-3174). So wait for whichever arrives, instead of a one-shot isVisible() that races it.
  await expect(emailToggle.or(emailInput).first()).toBeVisible()
  if (await emailToggle.isVisible()) {
    await emailToggle.click()
  }

  await expect(emailInput).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
}
