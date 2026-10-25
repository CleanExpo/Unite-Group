import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }))
vi.mock('@/lib/middleware/rate-limit', () => ({ checkRateLimit: vi.fn(() => null) }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: vi.fn(() => false), isPrivateAccessConfigured: vi.fn(() => true) }))

import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { isPublicPath, proxy } from '../proxy'

const get = (pathname: string, method = 'GET') => proxy(new NextRequest(`https://app.test${pathname}`, { method }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockReturnValue(null)
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: null } as Awaited<ReturnType<typeof updateSession>>)
})

describe('paid card order thank-you page and intake route (UNI-2996)', () => {
  it.each(['/cards/thanks', '/api/cards/intake'])('lets a signed-out visitor reach %s', async (path) => {
    expect(isPublicPath(path)).toBe(true)
    const res = await get(path, path.startsWith('/api') ? 'POST' : 'GET')
    expect(res.headers.get('location')).toBeNull()
  })

  it.each([
    '/cards/thanks/x',
    '/cards/thanks/',
    '/cards/Thanks',
    '/cards/thanksx',
    '/cards/thank-you',
    '/api/cards/intake/x',
    '/api/cards/intakes',
    '/api/cards',
    '/api/cards/orders',
  ])('keeps %s private', async (path) => {
    expect(isPublicPath(path)).toBe(false)
    const res = await get(path)
    // unauthenticated: a page goes to login, an API path is refused; never passed through
    const location = res.headers.get('location')
    expect(location !== null ? new URL(location).pathname : String(res.status)).toMatch(/^\/auth\/login\/?$|^40[13]$/)
  })
})
