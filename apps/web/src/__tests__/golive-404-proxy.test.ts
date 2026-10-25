import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }))
vi.mock('@/lib/middleware/rate-limit', () => ({ checkRateLimit: vi.fn(() => null) }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: vi.fn(() => true), isPrivateAccessConfigured: vi.fn(() => true) }))

import { updateSession } from '@/lib/supabase/middleware'
import { isPublicPath, proxy } from '../proxy'

type Session = Awaited<ReturnType<typeof updateSession>>
const signedOut = () =>
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: null } as Session)
const signedIn = () =>
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: { id: 'u1', email: 'f@x.test' } } as unknown as Session)
const get = (pathname: string) => proxy(new NextRequest(`https://app.test${pathname}`))

beforeEach(() => {
  vi.clearAllMocks()
  signedOut()
})

/** What a signed-out visitor gets for an unknown public path: never the sign-in wall, always the not-found page. */
const isNotFound = (res: Response) =>
  res.headers.get('location') === null &&
  res.status === 404 &&
  (res.headers.get('x-middleware-rewrite') ?? '').length > 0 &&
  !(res.headers.get('x-middleware-rewrite') ?? '').includes('/auth/login')

describe('D11: unknown public paths 404 instead of the founder sign-in', () => {
  it.each(['/about', '/contact', '/terms', '/plans', '/pricingx', '/pricing/secret', '/signatures/extra', '/privacy', '/cookies', '/login', '/zzz', '/cards/zzz', '/solutions/zzz', '/solutions', '/landing/other'])(
    'returns the not-found page for a signed-out visitor at %s',
    async (path) => {
      expect(isPublicPath(path)).toBe(false)
      expect(isNotFound(await get(path))).toBe(true)
    },
  )

  it('still carries a CSP with a nonce on the not-found response', async () => {
    const csp = (await get('/zzz')).headers.get('content-security-policy') ?? ''
    expect(csp).toMatch(/nonce-/)
  })
})

describe('D11: real protected routes still require sign-in', () => {
  it.each([
    '/founder',
    '/founder/command-centre',
    '/founder/anything/deeper',
    '/api/contacts/probe',
    '/api/agents/runner/other',
    '/docs',
    '/preview/knowledge-console',
    '/preview/other',
    '/c',
    '/c/UPPER',
    '/c/some-slug/other',
  ])('redirects a signed-out visitor at %s to /auth/login with redirectTo', async (path) => {
    const res = await get(path)
    const loc = new URL(res.headers.get('location') ?? 'https://none.test/')
    expect(loc.pathname).toBe('/auth/login')
    expect(loc.searchParams.get('redirectTo')).toBe(path)
  })

  it('does not 404 a signed-in founder at a protected route', async () => {
    signedIn()
    const res = await get('/founder/command-centre')
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
  })

  it('leaves public pages alone', async () => {
    for (const p of ['/', '/cards', '/cards/order', '/cards/terms', '/grow', '/privacy-policy', '/terms-of-service', '/solutions/visibility', '/c/phill-mcgurk']) {
      const res = await get(p)
      expect(res.headers.get('location'), p).toBeNull()
      expect(res.headers.get('x-middleware-rewrite'), p).toBeNull()
    }
  })
})

describe('D11: no real route can be hidden behind the not-found rule', () => {
  // Every top-level folder that holds a page or a route handler must be either public (so the 404 rule never sees it)
  // or protected (so a signed-out visitor still gets the sign-in redirect). A new top-level route that is neither would
  // silently 404 for signed-out founders instead of asking them to sign in.
  const appDir = join(__dirname, '..', 'app')
  const routes = (dir: string, prefix = ''): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) {
        if (f === '__tests__') return []
        if (f.startsWith('(')) return routes(p, prefix) // route group: not part of the URL
        return routes(p, `${prefix}/${f.replace(/^\[.*\]$/, 'phill-mcgurk')}`)
      }
      return /^(page|route)\.(t|j)sx?$/.test(f) ? [prefix || '/'] : []
    })

  it('sends a signed-out visitor at every real non-public route to sign-in, never to a 404', async () => {
    const found = routes(appDir)
    expect(found.length).toBeGreaterThan(40) // positive control: the scan really sees the app
    expect(found).toContain('/founder/command-centre')
    for (const route of found) {
      if (isPublicPath(route)) continue
      const res = await get(route)
      expect(res.headers.get('location') ?? '', `${route} must redirect to sign-in, not 404`).toContain('/auth/login')
    }
  })

  it('fails the scan when a protected folder is not classified (negative control)', async () => {
    const res = await get('/brand-new-private-area')
    expect(res.headers.get('location')).toBeNull() // unknown root 404s, which is why the scan above must catch real ones
  })
})
