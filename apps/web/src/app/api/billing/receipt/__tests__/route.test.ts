import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockStripe } = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
  process.env.RECEIPT_FROM_EMAIL = 'receipts@test.com'
  const mockStripe = {
    invoices: { retrieve: vi.fn() },
    charges: { retrieve: vi.fn() },
  }
  return { mockStripe }
})

vi.mock('stripe', () => ({ default: vi.fn(() => mockStripe) }))
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/sendgrid', () => ({ sendEmail: vi.fn() }))

import { POST } from '../route'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/integrations/sendgrid'

const AUTHED_USER = { id: 'user-123', email: 'founder@test.com' }
const INVOICE = {
  id: 'inv_test',
  number: 'INV-001',
  customer: 'cus_test123',
  created: 1700000000,
  subtotal: 9900,
  total: 9900,
  tax: 0,
  currency: 'aud',
  lines: { data: [{ description: 'Subscription', amount: 9900, quantity: 1 }] },
  charge: 'ch_test',
}

function makeReq(body: object) {
  return new Request('https://app.test/api/billing/receipt', {
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
  const insert = vi.fn().mockResolvedValue({ error: null })
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return { select }
      if (table === 'stripe_events') return { insert }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue(AUTHED_USER as never)
  vi.mocked(createServiceClient).mockReturnValue(
    makeAdmin({ stripe_customer_id: 'cus_test123', email: 'founder@test.com' }) as never,
  )
  mockStripe.invoices.retrieve.mockResolvedValue(INVOICE)
  mockStripe.charges.retrieve.mockResolvedValue({
    payment_method_details: { card: { last4: '4242', brand: 'visa' } },
  })
  vi.mocked(sendEmail).mockResolvedValue('msg_id_123')
})

describe('POST /api/billing/receipt', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(makeReq({ stripeInvoiceId: 'inv_test' }) as never)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorised')
  })

  it('returns 400 when stripeInvoiceId is missing', async () => {
    const res = await POST(makeReq({}) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when body is invalid JSON', async () => {
    const res = await POST(
      new Request('https://app.test/api/billing/receipt', {
        method: 'POST',
        body: 'not-json',
      }) as never,
    )
    expect(res.status).toBe(400)
  })

  it('returns 503 when profiles table not migrated (42P01)', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeAdmin(null, { code: '42P01', message: 'relation not found' }) as never,
    )
    const res = await POST(makeReq({ stripeInvoiceId: 'inv_test' }) as never)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('not_connected')
  })

  it('returns 403 when invoice customer does not match caller profile', async () => {
    vi.mocked(createServiceClient).mockReturnValue(
      makeAdmin({ stripe_customer_id: 'cus_different', email: 'other@test.com' }) as never,
    )
    const res = await POST(makeReq({ stripeInvoiceId: 'inv_test' }) as never)
    expect(res.status).toBe(403)
  })

  it('returns 200 and sends receipt email on success', async () => {
    const res = await POST(makeReq({ stripeInvoiceId: 'inv_test' }) as never)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.objectContaining({ email: 'founder@test.com' }),
        from: expect.objectContaining({ email: 'receipts@test.com' }),
        subject: expect.stringContaining('INV-001'),
      }),
    )
  })
})
