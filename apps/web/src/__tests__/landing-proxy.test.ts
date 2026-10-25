import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }))
vi.mock('@/lib/middleware/rate-limit', () => ({ checkRateLimit: vi.fn(() => null) }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: vi.fn(() => false), isPrivateAccessConfigured: vi.fn(() => true) }))

import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { isPublicPath, proxy } from '../proxy'

const get = (pathname: string) => proxy(new NextRequest(`https://app.test${pathname}`))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockReturnValue(null)
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: null } as Awaited<ReturnType<typeof updateSession>>)
})

describe('pillar pages and hero media for signed-out visitors', () => {
  it.each(['visibility', 'experience', 'conversion', 'intelligence'])('lets a signed-out visitor reach /solutions/%s', async (p) => {
    expect(isPublicPath(`/solutions/${p}`)).toBe(true)
    const res = await get(`/solutions/${p}`)
    expect(res.headers.get('location')).toBeNull()
  })

  it.each(['/solutions', '/solutions/Visibility', '/solutions/visibility/x', '/solutions/other', '/solutions/visibility.png'])(
    'still sends a signed-out visitor at %s to the login page',
    async (path) => {
      expect(isPublicPath(path)).toBe(false)
      if (path.endsWith('.png')) return // static-asset paths skip the proxy by matcher; covered by proxy-matcher.test.ts
      expect(new URL((await get(path)).headers.get('location') ?? '').pathname).toBe('/auth/login')
    },
  )

  it('lets a signed-out GET of /landing/media/<file> through, but not /landing/other', async () => {
    for (const f of ['unite-group-hero-loop-16x9.mp4', 'unite-group-hero-loop-16x9.webm']) {
      expect(isPublicPath(`/landing/media/${f}`)).toBe(true)
      expect((await get(`/landing/media/${f}`)).headers.get('location')).toBeNull()
    }
    expect(isPublicPath('/landing/other')).toBe(false)
    expect(new URL((await get('/landing/other')).headers.get('location') ?? '').pathname).toBe('/auth/login')
    expect(new URL((await get('/landing/mediax')).headers.get('location') ?? '').pathname).toBe('/auth/login')
  })
})

describe('Vercel Web Analytics paths', () => {
  // Phill 25/10/2026: the proxy sent /_vercel/insights/script.js to the login page, so analytics never loaded.
  // Only the two Vercel analytics prefixes open; segment-aware, so neighbours and look-alikes stay closed.
  it.each(['/_vercel/insights/script.js', '/_vercel/insights/view', '/_vercel/speed-insights/script.js', '/_vercel/speed-insights/vitals'])(
    'lets a signed-out request for %s through',
    async (path) => {
      expect(isPublicPath(path)).toBe(true)
      expect((await get(path)).headers.get('location')).toBeNull()
    },
  )

  it.each(['/_vercel/other', '/_vercel/other/insights', '/_vercelx', '/_vercel', '/_vercel/insightsx/script.js', '/_vercel/speed-insightsx', '/x/_vercel/insights/script.js'])(
    'still sends a signed-out request for %s to the login page',
    async (path) => {
      expect(isPublicPath(path)).toBe(false)
      expect(new URL((await get(path)).headers.get('location') ?? '').pathname).toBe('/auth/login')
    },
  )
})

describe('signed-out visitors and the public landing page', () => {
  it('lets a signed-out visitor reach exactly /', async () => {
    expect(isPublicPath('/')).toBe(true)
    const res = await get('/')
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it.each(['/founder/command-centre', '/contacts', '/api/contacts', '/founder', '/x'])(
    'still sends a signed-out visitor at %s to the login page',
    async (path) => {
      expect(isPublicPath(path)).toBe(false)
      const location = (await get(path)).headers.get('location') ?? ''
      expect(new URL(location).pathname).toBe('/auth/login')
    },
  )
})
