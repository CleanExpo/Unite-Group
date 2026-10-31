import { afterEach, describe, expect, it, vi } from 'vitest'

const createServiceClient = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => createServiceClient() }))

vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '6.6.6.6' }) }))

import { submitEnquiryAction } from '../[slug]/actions'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  createServiceClient.mockReset()
})

// Flag-on calls must clear the pre-database guard: consent, empty honeypot, a fill time past the minimum.
const guarded = () => ({ firstName: 'Jo', ask: 'hi', consent: true, website: '', startedAt: Date.now() - 10_000 })

describe('submitEnquiryAction is off unless explicitly enabled', () => {
  it('does not create a database client and reports unavailable (503) by default', async () => {
    const r = await submitEnquiryAction('sam', { firstName: 'Jo', ask: 'hi' })
    expect(r).toMatchObject({ ok: false, status: 503 })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('with the flag on, uses the service client and returns the receipt from the inserted row', async () => {
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    const c = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { card_slug: 'sam', published_at: 'x' }, error: null }) }) }) }),
      rpc: () => ({ single: async () => ({ data: { id: 'id-1', created_at: 't' }, error: null }) }),
    }
    createServiceClient.mockReturnValue(c)
    const r = await submitEnquiryAction('sam', guarded())
    expect(r).toEqual({ ok: true, receipt: { id: 'id-1', reference: 'LC-ID1', status: 'received', acceptedAt: 't', ownerNotified: false } })
  })

  it('a client that cannot be created is a 500, not a receipt', async () => {
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    createServiceClient.mockImplementation(() => { throw new Error('no key') })
    expect(await submitEnquiryAction('sam', guarded())).toMatchObject({ ok: false, status: 500 })
  })
})
