import { test, expect } from '@playwright/test';

import { revealEmailLogin } from './support/email-login';

/**
 * Smoke Tests — Nexus 2.0 (Task 11C)
 *
 * 3 canonical smoke tests verifying the core application shell.
 * Tests 1–3 run without authentication.
 *
 * Run: pnpm test:e2e --grep "Smoke"
 */

test.describe('Smoke — No Auth Required', () => {
  /**
   * Test 1: Health endpoint returns a successful HTTP status.
   * Uses the `request` fixture (pure HTTP — no browser overhead).
   * Accepts 200 (healthy) or 503 (degraded, e.g. Supabase unreachable in local dev).
   */
  test('health endpoint returns 200', async ({ request }) => {
    // The dev server compiles routes lazily; tolerate a brief cold start.
    let response = await request.get('/api/health');
    for (let i = 0; i < 10 && ![200, 503].includes(response.status()); i++) {
      await new Promise((r) => setTimeout(r, 1000));
      response = await request.get('/api/health');
    }

    // 200 = fully healthy; 503 = degraded but endpoint itself is alive.
    // Both are valid responses — the endpoint must at least respond.
    const status = response.status();
    expect([200, 503]).toContain(status);

    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(['ok', 'degraded']).toContain(body.status);
  });

  /**
   * Test 2: Unauthenticated root request redirects to the login page.
   * The root page performs a server-side redirect when no session is present.
   */
  test('root redirect — visiting / redirects to /auth/login', async ({ page }) => {
    await page.goto('/');

    // Middleware or root page.tsx redirects unauthenticated visitors to login.
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  /**
   * Test 3: Login page loads and renders the sign-in form.
   * Verifies the page is reachable and contains the expected form fields.
   */
  test('login page loads with email/password form', async ({ page }) => {
    await page.goto('/auth/login');

    // Must land on /auth/login without further redirect.
    await expect(page).toHaveURL(/\/auth\/login/);

    // Page must not render a Next.js error boundary.
    await expect(page.locator('body')).not.toContainText('Application error');
    await expect(page.locator('body')).not.toContainText('500');
    await revealEmailLogin(page);

    // Core form elements must be visible.
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
