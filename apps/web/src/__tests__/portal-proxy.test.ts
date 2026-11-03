import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }))
vi.mock('@/lib/middleware/rate-limit', () => ({ checkRateLimit: vi.fn(() => null) }))
// Only the founder's id is on the allow-list; any other signed-in user is a business owner (or nobody yet).
vi.mock('@/lib/auth/private-access', () => ({
  hasPrivateAccess: vi.fn((user: { id?: string } | null) => user?.id === 'founder-1'),
  isPrivateAccessConfigured: vi.fn(() => true),
}))

import { updateSession } from '@/lib/supabase/middleware'
import { isPortalPath, isPublicPath, proxy } from '../proxy'
import robots, { PRIVATE_PATHS } from '../app/robots'

type Session = Awaited<ReturnType<typeof updateSession>>
const as = (user: { id: string; email: string } | null) =>
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user } as unknown as Session)
const owner = { id: 'owner-1', email: 'owner@example.test' }
const founder = { id: 'founder-1', email: 'founder@example.test' }
const get = (pathname: string) => proxy(new NextRequest(`https://app.test${pathname}`))
const served = (res: Response) => res.headers.get('location') === null && res.status === 200 && res.headers.get('x-middleware-rewrite') === null

beforeEach(() => {
  vi.clearAllMocks()
  as(null)
})

describe('portal proxy guard', () => {
  it('sends a signed-out visitor at /portal to sign in, returning to /portal', async () => {
    for (const path of ['/portal', '/portal/anything']) {
      const loc = new URL((await get(path)).headers.get('location') ?? 'https://none.test/')
      expect(loc.pathname).toBe('/auth/login')
      expect(loc.searchParams.get('redirectTo')).toBe(path)
    }
    expect(isPublicPath('/portal')).toBe(false)
  })

  // Each of these pages then checks the owner itself (lib/portal/owner.ts: her portal_tenant_members row, aal2).
  it('lets a signed-in business owner (not on the founder allow-list) reach the home, changes, setup and verify pages', async () => {
    as(owner)
    for (const path of ['/portal', '/portal/changes', '/portal/setup', '/portal/verify']) {
      expect(served(await get(path)), path).toBe(true)
    }
  })

  it('still lets the founder reach /portal', async () => {
    as(founder)
    expect(served(await get('/portal'))).toBe(true)
  })

  it('blocks a business owner from every founder page', async () => {
    as(owner)
    for (const path of ['/founder', '/founder/command-centre', '/founder/card-reviews', '/founder/command-centre.png']) {
      const loc = new URL((await get(path)).headers.get('location') ?? 'https://none.test/')
      expect(loc.pathname, path).toBe('/auth/login')
      expect(loc.searchParams.get('access'), path).toBe('denied')
    }
  })

  it('blocks a business owner from founder APIs with a 403', async () => {
    as(owner)
    for (const path of ['/api/contacts', '/api/founder/anything', '/api/portal', '/api/portal/x']) {
      const res = await get(path)
      expect(res.status, path).toBe(403)
    }
  })

  it('does not hand the portal exemption to look-alike paths', async () => {
    as(owner)
    for (const path of ['/portalx', '/portal-admin', '/portals', '/founder/portal', '/docs/portal']) {
      expect(isPortalPath(path), path).toBe(false)
      expect(served(await get(path)), path).toBe(false)
    }
  })

  it('keeps the founder unchanged at founder pages', async () => {
    as(founder)
    expect(served(await get('/founder/command-centre'))).toBe(true)
  })

  it('asks crawlers to stay out of the portal', () => {
    expect(PRIVATE_PATHS).toContain('/portal')
    for (const rule of [robots().rules].flat().slice(0, 2)) {
      expect([rule.disallow].flat()).toContain('/portal')
    }
  })
})
