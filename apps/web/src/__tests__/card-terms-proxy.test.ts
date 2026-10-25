import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }))
vi.mock('@/lib/middleware/rate-limit', () => ({ checkRateLimit: vi.fn(() => null) }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: vi.fn(() => false), isPrivateAccessConfigured: vi.fn(() => true) }))

import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit } from '@/lib/middleware/rate-limit'
import { isPublicPath, proxy } from '../proxy'
import { deniedTo } from './proxy-denied'

const get = (pathname: string) => proxy(new NextRequest(`https://app.test${pathname}`))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockReturnValue(null)
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: null } as Awaited<ReturnType<typeof updateSession>>)
})

describe('/cards/terms for signed-out visitors', () => {
  it('lets a signed-out visitor reach exactly /cards/terms', async () => {
    expect(isPublicPath('/cards/terms')).toBe(true)
    const res = await get('/cards/terms')
    expect(res.headers.get('location')).toBeNull()
  })

  it.each(['/cards/terms/x', '/cards/Terms', '/cards/termsx', '/cards/terms/order', '/cards/other', '/cards/order/x'])(
    'does not open %s',
    async (path) => {
      expect(isPublicPath(path)).toBe(false)
      expect(deniedTo(await get(path))).not.toBe('served')
    },
  )

  it('keeps /cards and /cards/order public exactly as before', () => {
    expect(isPublicPath('/cards')).toBe(true)
    expect(isPublicPath('/cards/order')).toBe(true)
  })
})
