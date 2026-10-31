import { afterEach, describe, expect, it, vi } from 'vitest'

const createServiceClient = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => createServiceClient() }))

// The action wires in the real Mailtrap sender; a unit test must never reach the network, whatever keys the machine holds.
const sendCardEnquiryAlerts = vi.fn(async () => ({ ownerNotified: false }))
vi.mock('@/lib/card/enquiry-alert', () => ({ sendCardEnquiryAlerts: (a: unknown) => sendCardEnquiryAlerts(a as never) }))

vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '6.6.6.6' }) }))

import { submitEnquiryAction } from '../[slug]/actions'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  createServiceClient.mockReset()
  sendCardEnquiryAlerts.mockClear()
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

  it('with the flag on, a newly stored row is handed to the owner alert sender (mocked, never the network)', async () => {
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    const c = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { published_at: 'x', email: 'sam@samco.com.au' }, error: null }) }) }) }),
      rpc: () => ({ single: async () => ({ data: { id: 'id-2', created_at: new Date().toISOString() }, error: null }) }),
    }
    createServiceClient.mockReturnValue(c)
    await submitEnquiryAction('sam', guarded())
    expect(sendCardEnquiryAlerts).toHaveBeenCalledWith(expect.objectContaining({ reference: 'LC-ID2', cardSlug: 'sam', ownerEmail: 'sam@samco.com.au' }))
  })

  it('a client that cannot be created is a 500, not a receipt', async () => {
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    createServiceClient.mockImplementation(() => { throw new Error('no key') })
    expect(await submitEnquiryAction('sam', guarded())).toMatchObject({ ok: false, status: 500 })
  })
})
