// UNI-3002: proxy and /api/events route together. The real rate limiter runs (not mocked), so this
// fails if analytics shares the 30/min standard bucket: the proxy would 429 the 31st beacon before the
// route's silent-204 contract, and a following /api/leads call would be throttled by the same budget.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: vi.fn(() => false), isPrivateAccessConfigured: vi.fn(() => true) }))
vi.mock('@/lib/supabase/service', () => ({
  hasSupabaseServiceConfig: vi.fn(() => true),
  createServiceClient: vi.fn(() => ({
    rpc: () => Promise.resolve({ data: 0, error: null }),
    from: () => ({ insert: () => Promise.resolve({ error: null }) }),
  })),
}))

import { updateSession } from '@/lib/supabase/middleware'
import { proxy } from '../proxy'
import { POST, __resetRateLimitForTests } from '../app/api/events/route'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const beacon = (ip: string) =>
  new NextRequest('https://unite-group.in/api/events', {
    method: 'POST',
    body: JSON.stringify({ event_type: 'page_view', path: '/cards', session_id: 's1' }),
    headers: { 'user-agent': UA, 'x-forwarded-for': ip, 'content-type': 'application/json' },
  })

beforeEach(() => {
  vi.clearAllMocks()
  __resetRateLimitForTests()
  vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: null } as Awaited<ReturnType<typeof updateSession>>)
})

describe('UNI-3002 /api/events through the proxy and the route', () => {
  it('70 beacons in a minute never meet a proxy 429; the route answers 204 each time; /api/leads keeps its budget', async () => {
    const ip = '203.0.113.42'
    for (let i = 0; i < 70; i++) {
      const passed = await proxy(beacon(ip))
      expect(passed.status).not.toBe(429)
      expect(passed.headers.get('location')).toBeNull()
      const res = await POST(beacon(ip))
      expect(res.status).toBe(204)
    }
    const leads = await proxy(new NextRequest('https://unite-group.in/api/leads', { method: 'POST', headers: { 'x-forwarded-for': ip } }))
    expect(leads.status).not.toBe(429)
    expect(leads.headers.get('x-ratelimit-limit')).toBe('30')
    expect(leads.headers.get('x-ratelimit-remaining')).toBe('29')
  })
})
