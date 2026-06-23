import { test, expect } from '@playwright/test'
import { hasSupabaseAdminProvisioning } from './support/supabase-admin-config'

test('unauthenticated request to /api/strategy/analyze returns 401', async ({ page }) => {
  test.skip(!hasSupabaseAdminProvisioning().ok, 'requires Supabase backend — E2E backend not configured')
  const res = await page.request.post('/api/strategy/analyze', {
    data: { prompt: 'test' },
  })
  expect(res.status()).toBe(401)
})

test('unauthenticated request to /api/bron/chat returns 401', async ({ page }) => {
  test.skip(!hasSupabaseAdminProvisioning().ok, 'requires Supabase backend — E2E backend not configured')
  const res = await page.request.post('/api/bron/chat', {
    data: { messages: [{ role: 'user', content: 'test' }] },
  })
  expect(res.status()).toBe(401)
})

test('unauthenticated request to /api/ideas/capture returns 401', async ({ page }) => {
  test.skip(!hasSupabaseAdminProvisioning().ok, 'requires Supabase backend — E2E backend not configured')
  const res = await page.request.post('/api/ideas/capture', {
    data: { rawIdea: 'test idea' },
  })
  expect(res.status()).toBe(401)
})
