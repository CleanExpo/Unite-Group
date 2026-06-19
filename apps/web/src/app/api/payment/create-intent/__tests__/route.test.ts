import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/api/stripe/client', () => ({
  StripeApiClient: vi.fn().mockImplementation(() => ({
    createPaymentIntent: vi.fn().mockResolvedValue({ client_secret: 'pi_xxx_secret', id: 'pi_xxx' }),
  })),
}))

import { getUser } from '@/lib/supabase/server'
import { POST } from '../route'

function req(body: object) {
  return new NextRequest('https://app.test/api/payment/create-intent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/payment/create-intent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ amount: 1000 }))
    expect(res.status).toBe(401)
  })

  it('returns 503 when STRIPE_SECRET_KEY not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const res = await POST(req({ amount: 1000 }))
    expect(res.status).toBe(503)
  })

  it('returns 400 when request data invalid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx')
    const res = await POST(req({ amount: -1 }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with clientSecret on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_xxx')
    const res = await POST(req({ amount: 5000, currency: 'aud' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.clientSecret).toBe('pi_xxx_secret')
    expect(body.paymentIntentId).toBe('pi_xxx')
  })
})
