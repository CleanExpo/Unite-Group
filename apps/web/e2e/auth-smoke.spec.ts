import { test, expect } from '@playwright/test';

/**
 * Auth Smoke Tests — Nexus 2.0
 *
 * Verifies the PKCE middleware redirects unauthenticated requests correctly.
 * Founder-only routes live under /founder/* (middleware-protected).
 */

test.describe('Auth middleware', () => {
  // Phill 25/10/2026 (UNI-3001): a signed-out visitor on / sees the public home; sign-in is the footer link
  test('unauthenticated root shows the public home, with the founder login in the footer', async ({ page }) => {
    await page.goto('/');

    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator('h1')).toContainText('Every business');
    await expect(page.locator('footer a[href="/auth/login"]')).toHaveCount(1);
  });

  test('/auth/login page renders without error', async ({ page }) => {
    await page.goto('/auth/login');

    // Should land on login (not another redirect)
    await expect(page).toHaveURL(/\/auth\/login/);

    // Page should not be an error page
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('protected /founder route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/founder');

    // Middleware redirects unauthenticated /founder/* requests to /auth/login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
