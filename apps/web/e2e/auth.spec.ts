import { test, expect } from '@playwright/test'

test('unauthenticated request to /api/strategy/analyze returns 401', async ({ page }) => {
  test.skip(!process.env.E2E_SUPABASE_URL, 'requires a dedicated non-prod E2E Supabase backend (E2E_SUPABASE_URL) — not configured')
  const res = await page.request.post('/api/strategy/analyze', {
    data: { prompt: 'test' },
  })
  expect(res.status()).toBe(401)
})

test('unauthenticated request to /api/bron/chat returns 401', async ({ page }) => {
  test.skip(!process.env.E2E_SUPABASE_URL, 'requires a dedicated non-prod E2E Supabase backend (E2E_SUPABASE_URL) — not configured')
  const res = await page.request.post('/api/bron/chat', {
    data: { messages: [{ role: 'user', content: 'test' }] },
  })
  expect(res.status()).toBe(401)
})

test('unauthenticated request to /api/ideas/capture returns 401', async ({ page }) => {
  test.skip(!process.env.E2E_SUPABASE_URL, 'requires a dedicated non-prod E2E Supabase backend (E2E_SUPABASE_URL) — not configured')
  const res = await page.request.post('/api/ideas/capture', {
    data: { rawIdea: 'test idea' },
  })
  expect(res.status()).toBe(401)
})
