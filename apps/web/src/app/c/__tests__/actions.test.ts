import { afterEach, describe, expect, it, vi } from 'vitest'

const createServiceClient = vi.fn()
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => createServiceClient() }))

import { submitEnquiryAction } from '../[slug]/actions'

afterEach(() => {
  vi.unstubAllEnvs()
  createServiceClient.mockReset()
})

describe('submitEnquiryAction is off unless explicitly enabled', () => {
  it('does not create a database client and reports unavailable (503) by default', async () => {
    const r = await submitEnquiryAction('sam', { firstName: 'Jo', ask: 'hi' })
    expect(r).toMatchObject({ ok: false, status: 503 })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('with the flag on, uses the service client and returns the receipt from the inserted row', async () => {
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    const c = {
      from: (t: string) =>
        t === 'card_profiles'
          ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { card_slug: 'sam', published_at: 'x' }, error: null }) }) }) }
          : { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'id-1', created_at: 't' }, error: null }) }) }) },
    }
    createServiceClient.mockReturnValue(c)
    const r = await submitEnquiryAction('sam', { firstName: 'Jo', ask: 'hi' })
    expect(r).toEqual({ ok: true, receipt: { id: 'id-1', status: 'received', acceptedAt: 't' } })
  })

  it('a client that cannot be created is a 500, not a receipt', async () => {
    vi.stubEnv('CARD_ENQUIRY_RECEIPT_ENABLED', '1')
    createServiceClient.mockImplementation(() => { throw new Error('no key') })
    expect(await submitEnquiryAction('sam', { firstName: 'Jo', ask: 'hi' })).toMatchObject({ ok: false, status: 500 })
  })
})
