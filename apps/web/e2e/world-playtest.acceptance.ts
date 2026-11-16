import { test, expect } from '@playwright/test'
import { loginAsFounder } from './fixtures/auth'
import { expectWorldPreviewDenied } from './support/world-preview-denial'

test('enabled World preview still denies an unauthenticated visitor', async ({ page }) => {
  await page.goto('/founder/mission-control-next?tab=world')
  await expect(page).toHaveURL(/\/auth\/login/)
  await expect(page.getByRole('button', { name: 'Start fictional playtest' })).toHaveCount(0)
})

for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 900 }]) {
  test(`founder completes the fictional World flow at ${viewport.width}px without saved or professional progress`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await loginAsFounder(page)
    const errors: string[] = []
    const writes: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      const url = new URL(request.url())
      if (url.origin === 'http://localhost:3003' && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        writes.push(`${request.method()} ${url.pathname}`)
      }
    })
    const response = await page.goto('/founder/mission-control-next?tab=world')
    expect(response?.status()).toBe(200)
    if (viewport.width < 768) {
      // Fresh founder sessions open mobile navigation. Dismiss it as a user
      // would, outside the 240px drawer, before interacting with the game.
      const backdrop = page.locator('div.fixed.inset-0.z-40')
      await expect(backdrop).toBeVisible()
      await backdrop.click({ position: { x: viewport.width - 12, y: 12 } })
      await expect(backdrop).toHaveCount(0)
    }
    const live = page.getByRole('region', { name: 'Restoration World', exact: true })
    const simulation = page.getByRole('region', { name: 'Fictional Restoration World playtest' })
    await expect(live).toHaveAttribute('data-state', 'unavailable')
    await expect(simulation).toHaveAttribute('data-state', 'test')
    await expect(simulation.getByText('Fictional playtest · not saved')).toBeVisible()
    // Real negative control: the exact disabled-view checker must reject an
    // already-rendered authenticated game, even though its HTTP status is 200.
    await expect(expectWorldPreviewDenied(page, response?.status(), 250)).rejects.toThrow(/Page Not Found/)
    const start = simulation.getByRole('button', { name: 'Start fictional playtest' })
    await start.focus()
    await start.press('Enter')
    const heading = simulation.getByRole('heading', { name: 'Warehouse playtest' })
    await expect(heading).toBeFocused()
    await heading.press('Tab')
    const decision = simulation.getByRole('button', { name: 'Request qualified support and explain the delay' })
    await expect(decision).toBeFocused()
    await decision.press('Enter')
    await expect(simulation.getByRole('status')).toContainText('qualified support')
    await simulation.getByRole('button', { name: 'Acknowledge the reflection' }).click()
    await simulation.getByRole('button', { name: 'Finish fictional scenario' }).click()
    await expect(simulation.getByText('Fictional scenario complete', { exact: true })).toBeVisible()
    await simulation.locator('summary').click()
    const snapshot = JSON.parse(await simulation.locator('pre').innerText())
    expect(snapshot.source).toBe('simulation')
    expect(snapshot.revision).toBe(3)
    expect(snapshot.professionalEvidence).toBe('not-assessed')
    expect(snapshot.history).toHaveLength(3)
    expect(snapshot.progression).toEqual({ reflections: 1, completedScenarios: 1 })
    await expect(live).toHaveAttribute('data-state', 'unavailable')
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    // FounderShell scrolls inside <main>; the document alone can conceal clipping.
    for (const main of await page.getByRole('main').all()) {
      expect(await main.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
    }
    await testInfo.attach(`world-${viewport.width}`, { body: await simulation.screenshot(), contentType: 'image/png' })
    await simulation.getByRole('button', { name: 'Restart fictional playtest' }).click()
    await expect(simulation.getByText(/Simulation only: 0 reflection, 0 completed scenario/)).toBeVisible()
    await simulation.getByRole('button', { name: 'Explore the consequence of rushing' }).click()
    await expect(simulation.getByRole('status')).toContainText('response is stopped')
    await simulation.getByRole('button', { name: 'Close playtest' }).click()
    await expect(start).toBeFocused()
    await start.click()
    await page.reload()
    await expect(start).toBeVisible()
    await expect(simulation.getByText(/Available capacity:/)).toHaveCount(0)
    expect(writes).toEqual([])
    expect(errors).toEqual([])
  })
}
