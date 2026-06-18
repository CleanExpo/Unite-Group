import { describe, it, expect, vi, beforeEach } from 'vitest'

// Define mockStripe inside vi.hoisted so it exists before vi.mock factories run
// and before the route module loads (which evaluates `new Stripe(STRIPE_KEY, ...)`)
const { mockStripe } = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
  const mockStripe = {
    billingPortal: { sessions: { create: vi.fn() } },
  }
  return { mockStripe }
})

vi.mock('stripe', () => ({ default: vi.fn(() => mockStripe) }))
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { POST } from '../route'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const AUTHED_USER = { id: 'user-123', email: 'founder@test.com' }
const PORTAL_URL = 'https://billing.stripe.com/session/test123'
const makeReq = () =>
  new Request('https://app.test/api/billing/portal', { method: 'POST' })

function makeAdmin(
  profile: object | null,
  error: { code?: string; message: string } | null = null,
) {
  const single = vi.fn().mockResolvedValue({ data: profile, error })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  return { from: vi.fn(() => ({ select })) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue(AUTHED_USER as never)
  vi.mocked(createServiceClient).mockReturnValue(
    makeAdmin({ stripe_customer_id: 'cus_test123' }) as never,
  )
  mockStripe.billingPortal.sessions.create.mockResolvedValue({ url: PORTAL_URL })
})

describe('POST /api/billing/portal', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(makeReq() as never)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorised')
  })

  it('returns 503 when profiles table not yet migrated (42P01)', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeAdmin(null, { code: '42P01', message: 'relation not found' }) as never,
    )
    const res = await POST(makeReq() as never)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('not_connected')
  })

  it('returns 404 when profile is missing', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeAdmin(null, { message: 'PGRST116' }) as never,
    )
    const res = await POST(makeReq() as never)
    expect(res.status).toBe(404)
  })

  it('returns 404 when profile has no stripe_customer_id', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeAdmin({ stripe_customer_id: null }) as never,
    )
    const res = await POST(makeReq() as never)
    expect(res.status).toBe(404)
  })

  it('returns 200 with portal url on success', async () => {
    const res = await POST(makeReq() as never)
    expect(res.status).toBe(200)
    expect((await res.json()).url).toBe(PORTAL_URL)
    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_test123' }),
    )
  })
})
