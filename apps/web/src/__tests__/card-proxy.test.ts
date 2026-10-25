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

describe('owner card routes for signed-out visitors', () => {
  it.each(['/c/sam', '/c/sam-cleaning-2', '/c/sam/contact.vcf'])('lets a signed-out visitor reach %s', async (p) => {
    expect(isPublicPath(p)).toBe(true)
    expect((await get(p)).headers.get('location')).toBeNull()
  })

  it.each([
    '/c', '/c/', '/c/sam/other', '/c/sam/contact.vcf/x', '/c/sam/', '/c/Sam', '/c/sam%2Fcontact.vcf', '/c/a/b/c',
    '/c/' + 'a'.repeat(65), '/c/sam/CONTACT.VCF', '/cx/sam', '/c/sam/contact.vcf.js',
  ])('still sends a signed-out visitor at %s to the login page', async (p) => {
    expect(isPublicPath(p)).toBe(false)
    expect(deniedTo(await get(p))).not.toBe('served')
  })

  it('does not change the neighbours', () => {
    expect(isPublicPath('/cards')).toBe(true)
    expect(isPublicPath('/cards/order')).toBe(true)
    expect(isPublicPath('/api/agents/runner/claim')).toBe(false)
    expect(isPublicPath('/founder')).toBe(false)
  })
})
