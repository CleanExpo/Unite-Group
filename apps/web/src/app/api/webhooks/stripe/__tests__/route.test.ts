import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/integrations/stripe/client', () => ({
  getStripe: vi.fn(),
}))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { getStripe } from '@/lib/integrations/stripe/client'
import { createServiceClient } from '@/lib/supabase/service'
import { POST } from '../route'

function req(body = '{}', signature?: string | null): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (signature) headers['stripe-signature'] = signature
  return new NextRequest('http://localhost/api/webhooks/stripe', { method: 'POST', headers, body })
}

function mockStripe(constructEvent: () => unknown) {
  ;(getStripe as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    webhooks: { constructEvent },
  })
}

function mockInsert(result: { error?: unknown }) {
  const insert = vi.fn(async () => result)
  ;(createServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn(() => ({ insert })),
  })
  return insert
}

const EVENT = { id: 'evt_123', type: 'checkout.session.completed', api_version: '2024-01-01', livemode: false }

describe('POST /api/webhooks/stripe', () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })
  afterEach(() => {
    if (original === undefined) delete process.env.STRIPE_WEBHOOK_SECRET
    else process.env.STRIPE_WEBHOOK_SECRET = original
  })

  it('returns 503 when Stripe is not configured', async () => {
    ;(getStripe as unknown as ReturnType<typeof vi.fn>).mockReturnValue(null)
    const res = await POST(req())
    expect(res.status).toBe(503)
  })

  it('returns 503 when the webhook secret is unset', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    mockStripe(() => EVENT)
    const res = await POST(req())
    expect(res.status).toBe(503)
  })

  it('returns 400 when the signature header is missing', async () => {
    mockStripe(() => EVENT)
    const res = await POST(req('{}', null))
    expect(res.status).toBe(400)
  })

  it('returns 400 on an invalid signature', async () => {
    mockStripe(() => {
      throw new Error('bad sig')
    })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(400)
  })

  it('persists the event and returns 200 on a valid signature', async () => {
    mockStripe(() => EVENT)
    const insert = mockInsert({ error: null })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_event_id: 'evt_123', type: 'checkout.session.completed' }),
    )
  })

  it('is idempotent — returns 200 on a duplicate (unique violation)', async () => {
    mockStripe(() => EVENT)
    mockInsert({ error: { code: '23505' } })
    const res = await POST(req('{}', 'sig'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true, idempotent: true })
  })
})
