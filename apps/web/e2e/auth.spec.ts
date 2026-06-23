import { test, expect } from '@playwright/test'

// Fail-closed contract for unauthenticated API access.
//
// `src/proxy.ts` (the Next.js 16 middleware) redirects any unauthenticated
// request to a non-public path to `/auth/login` with a 307 BEFORE the route
// handler runs. The route handlers themselves also guard with a 401
// (`getUser()` → `if (!user) return 401`), which is what is returned for the
// `/api/auth/*` paths the middleware treats as public.
//
// So the genuine fail-closed status is EITHER 307 (middleware redirect) or 401
// (route/middleware guard). `{ maxRedirects: 0 }` is mandatory — without it
// Playwright follows the 307 to the `/auth/login` page and observes its 200,
// masking the redirect. This mirrors every other "fails closed before
// authentication" test in this suite (core-journeys, transcription,
// email-import, drip-campaign).

test('unauthenticated request to /api/strategy/analyze fails closed', async ({ request }) => {
  const res = await request.post('/api/strategy/analyze', {
    data: { prompt: 'test' },
    maxRedirects: 0,
  })
  expect(
    [307, 401],
    `/api/strategy/analyze should redirect to login or return 401 before auth; got ${res.status()}`
  ).toContain(res.status())
})

test('unauthenticated request to /api/bron/chat fails closed', async ({ request }) => {
  // NOTE: /api/bron/chat is not yet implemented. The middleware guards the path
  // before routing, so this asserts the auth boundary covers it (307/401), not a
  // route handler. If the Bron chat endpoint is built, it must keep this contract.
  const res = await request.post('/api/bron/chat', {
    data: { messages: [{ role: 'user', content: 'test' }] },
    maxRedirects: 0,
  })
  expect(
    [307, 401],
    `/api/bron/chat should redirect to login or return 401 before auth; got ${res.status()}`
  ).toContain(res.status())
})

test('unauthenticated request to /api/ideas/capture fails closed', async ({ request }) => {
  const res = await request.post('/api/ideas/capture', {
    data: { rawIdea: 'test idea' },
    maxRedirects: 0,
  })
  expect(
    [307, 401],
    `/api/ideas/capture should redirect to login or return 401 before auth; got ${res.status()}`
  ).toContain(res.status())
})
