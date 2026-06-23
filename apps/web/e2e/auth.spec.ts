import { test, expect } from '@playwright/test'

// Unauthenticated requests to these founder/AI API routes must be rejected —
// either a 401 from the route's own guard or a redirect to /auth/login from
// middleware. We use maxRedirects: 0 so the redirect status is observed rather
// than followed to the (200) login page. The security property under test is
// "not processed for an anonymous caller", i.e. never a 2xx.
const REJECTED = [301, 302, 307, 308, 401]

test('unauthenticated request to /api/strategy/analyze is rejected', async ({ page }) => {
  const res = await page.request.post('/api/strategy/analyze', {
    data: { prompt: 'test' },
    maxRedirects: 0,
  })
  expect(REJECTED).toContain(res.status())
})

test('unauthenticated request to /api/bron/chat is rejected', async ({ page }) => {
  const res = await page.request.post('/api/bron/chat', {
    data: { messages: [{ role: 'user', content: 'test' }] },
    maxRedirects: 0,
  })
  expect(REJECTED).toContain(res.status())
})

test('unauthenticated request to /api/ideas/capture is rejected', async ({ page }) => {
  const res = await page.request.post('/api/ideas/capture', {
    data: { rawIdea: 'test idea' },
    maxRedirects: 0,
  })
  expect(REJECTED).toContain(res.status())
})
