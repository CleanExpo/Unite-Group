import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockStripe } = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
  const mockStripe = {
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
  }
  return { mockStripe }
})

vi.mock('stripe', () => ({ default: vi.fn(() => mockStripe) }))
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { POST } from '../route'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const AUTHED_USER = { id: 'user-123' }

function makeReq(body: object) {
  return new Request('https://app.test/api/billing/subscribe', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function makeAdmin(
  profile: object | null,
  profileErr: { code?: string; message: string } | null = null,
) {
  const single = vi.fn().mockResolvedValue({ data: profile, error: profileErr })
  const selectEq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq: selectEq })
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockReturnValue({ eq: updateEq })
  return { from: vi.fn(() => ({ select, update })) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue(AUTHED_USER as never)
  vi.mocked(createServiceClient).mockReturnValue(
    makeAdmin({
      stripe_customer_id: 'cus_test',
      stripe_subscription_id: 'sub_existing',
    }) as never,
  )
  mockStripe.subscriptions.retrieve.mockResolvedValue({
    id: 'sub_existing',
    items: { data: [{ id: 'si_test123' }] },
  })
  mockStripe.subscriptions.update.mockResolvedValue({ id: 'sub_test', status: 'active' })
})

describe('POST /api/billing/subscribe', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(makeReq({ priceId: 'price_abc' }) as never)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorised')
  })

  it('returns 400 when priceId is missing', async () => {
    const res = await POST(makeReq({}) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when priceId is empty string', async () => {
    const res = await POST(makeReq({ priceId: '' }) as never)
    expect(res.status).toBe(400)
  })

  it('returns 503 when profiles table not migrated (42P01)', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeAdmin(null, { code: '42P01', message: 'relation not found' }) as never,
    )
    const res = await POST(makeReq({ priceId: 'price_abc' }) as never)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('not_connected')
  })

  it('returns 404 when profile not found', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeAdmin(null, { message: 'PGRST116' }) as never,
    )
    const res = await POST(makeReq({ priceId: 'price_abc' }) as never)
    expect(res.status).toBe(404)
  })

  it('returns 404 when profile has no active subscription', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeAdmin({ stripe_customer_id: 'cus_test', stripe_subscription_id: null }) as never,
    )
    const res = await POST(makeReq({ priceId: 'price_abc' }) as never)
    expect(res.status).toBe(404)
  })

  it('returns 200 with updated subscription on success', async () => {
    const res = await POST(makeReq({ priceId: 'price_new' }) as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.subscription.id).toBe('sub_test')
    expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
      'sub_existing',
      expect.objectContaining({ proration_behavior: 'create_prorations' }),
    )
  })
})
