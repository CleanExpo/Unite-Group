import { test, expect } from '@playwright/test'

/**
 * Sidebar Navigation — E2E Smoke Tests
 *
 * Verifies the sidebar renders and contains links to all major sections.
 * Requires authentication since the sidebar is part of the /founder layout.
 */

test.describe('Sidebar Navigation', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/founder/dashboard')

    await expect(page).toHaveURL(/\/auth\/login/)
  })

  // TODO: Add auth fixture setup for authenticated sidebar tests
  // The sidebar is only rendered within the authenticated (founder) layout.
  // Once PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD env vars are set,
  // use loginAsFounder() from ./fixtures/auth to test sidebar content.
  test.describe('authenticated', () => {
    test.skip(
      !process.env.PLAYWRIGHT_TEST_EMAIL,
      'Skipped: PLAYWRIGHT_TEST_EMAIL not set — auth fixture required'
    )

    test.beforeEach(async ({ page }) => {
      const { loginAsFounder } = await import('./fixtures/auth')
      await loginAsFounder(page)
    })

    test('sidebar renders with Nexus branding', async ({ page }) => {
      await expect(page.locator('aside')).toBeVisible()
      await expect(page.getByText('NEXUS')).toBeVisible()
    })

    test('sidebar contains links to major sections', async ({ page }) => {
      const expectedLinks = [
        { href: '/founder/command-centre', label: 'Command Centre' },
        { href: '/founder/kanban', label: 'Kanban' },
        { href: '/founder/vault', label: 'Vault' },
        { href: '/founder/approvals', label: 'Approvals' },
        { href: '/founder/advisory', label: 'Advisory' },
        { href: '/founder/campaigns', label: 'Campaigns' },
        { href: '/founder/contacts', label: 'Contacts' },
        { href: '/founder/settings', label: 'Settings' },
      ]

      for (const { href, label } of expectedLinks) {
        const link = page.locator(`a[href="${href}"]`)
        await expect(link, `Sidebar link "${label}" should exist`).toBeVisible()
      }
    })

    test('sidebar navigation links are clickable', async ({ page }) => {
      const kanbanLink = page.locator('a[href="/founder/kanban"]')
      await kanbanLink.click()
      // UNI-2278: /founder/kanban is not visited by any other test in this suite, so
      // against the Playwright webServer (`pnpm dev`) this is the first-ever hit and
      // Next.js JIT-compiles the route (KanbanBoard + @dnd-kit + 5 sibling components)
      // on demand. Under CI load that compile can outrun the default 5s expect
      // timeout even though the click and navigation are correct — confirmed via a
      // captured failure snapshot showing the sidebar link already marked active
      // (client router had committed to the transition) while Next Dev Tools still
      // read "Compiling…". Wait on the navigation itself with a timeout sized for a
      // cold compile, instead of the default expect timeout.
      await page.waitForURL(/\/founder\/kanban/, { timeout: 15_000 })
    })
  })
})
