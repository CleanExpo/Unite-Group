import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: { create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/pay/xxx', id: 'cs_test' }) },
    },
  })),
}))

import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

function req(body: object, ip = '127.0.0.1') {
  return new NextRequest('https://app.test/api/onboarding/create-checkout-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/onboarding/create-checkout-session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 503 when STRIPE_SECRET_KEY not set', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const res = await POST(req({ slug: 'test-client' }, '10.0.0.1'))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toBe('not_connected')
  })

  it('returns 400 when slug missing', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx')
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn() } as any)
    const res = await POST(req({}, '10.0.0.2'))
    expect(res.status).toBe(400)
  })

  it('returns 501 when nexus_clients table not migrated', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx')
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: '42P01', message: 'relation does not exist' } }),
    }
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) } as any)
    const res = await POST(req({ slug: 'test-client' }, '10.0.0.3'))
    expect(res.status).toBe(501)
    const body = await res.json()
    expect(body.error).toBe('not_connected')
  })

  it('returns 404 when client not found', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx')
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'no rows' } }),
    }
    vi.mocked(createServiceClient).mockReturnValue({ from: vi.fn().mockReturnValue(mockChain) } as any)
    const res = await POST(req({ slug: 'unknown' }, '10.0.0.4'))
    expect(res.status).toBe(404)
  })
})
