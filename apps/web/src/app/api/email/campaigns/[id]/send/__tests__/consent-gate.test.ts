import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/sendgrid', () => ({ sendCampaignEmail: vi.fn() }))
vi.mock('@/lib/campaigns/send-gate', () => ({ filterSendableRecipients: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendCampaignEmail } from '@/lib/integrations/sendgrid'
import { filterSendableRecipients } from '@/lib/campaigns/send-gate'
import { makeServiceChain } from '@/test/founder-scope-chain'
import { POST } from '../route'

const ctx = () => ({ params: Promise.resolve({ id: 'ec-1' }) })
const req = () => new Request('http://localhost/send', { method: 'POST' })
const campaign = {
  data: { id: 'ec-1', status: 'draft', recipient_list: [{ email: 'a@x.com' }, { email: 'b@x.com' }], business_key: 'synthex', subject: 's', body_html: '<p>x</p>', body_text: null },
  error: null,
}

describe('POST /api/email/campaigns/[id]/send: consent and suppression gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceChain([campaign]) as never)
  })

  it('sends only to the recipients the gate allows and reports how many it skipped', async () => {
    vi.mocked(filterSendableRecipients).mockResolvedValue({
      allowed: [{ email: 'a@x.com' }],
      skipped: { noConsent: 1, suppressed: 0, suppressionUnknown: 0 },
    })
    vi.mocked(sendCampaignEmail).mockResolvedValue({ sent: 1, failed: 0 } as never)
    const res = await POST(req(), ctx())
    expect(res.status).toBe(200)
    expect(vi.mocked(sendCampaignEmail).mock.calls[0][0]).toEqual([{ email: 'a@x.com' }])
    expect(await res.json()).toMatchObject({ sent: 1, skipped: { noConsent: 1 } })
  })

  it('sends nothing and returns 400 with the skip counts when no recipient is allowed', async () => {
    vi.mocked(filterSendableRecipients).mockResolvedValue({
      allowed: [],
      skipped: { noConsent: 2, suppressed: 0, suppressionUnknown: 0 },
    })
    const res = await POST(req(), ctx())
    expect(res.status).toBe(400)
    expect(sendCampaignEmail).not.toHaveBeenCalled()
    expect((await res.json()).skipped.noConsent).toBe(2)
  })

  it('fails closed with 503 and sends nothing when consent data cannot be read', async () => {
    vi.mocked(filterSendableRecipients).mockRejectedValue(new Error('Could not read marketing consent'))
    const res = await POST(req(), ctx())
    expect(res.status).toBe(503)
    expect(sendCampaignEmail).not.toHaveBeenCalled()
  })

  it('fails closed with 503 and sends nothing when any recipient has unknown suppression, even if others are clear', async () => {
    vi.mocked(filterSendableRecipients).mockResolvedValue({
      allowed: [{ email: 'a@x.com' }],
      skipped: { noConsent: 0, suppressed: 0, suppressionUnknown: 1 },
    })
    const res = await POST(req(), ctx())
    expect(res.status).toBe(503)
    expect(sendCampaignEmail).not.toHaveBeenCalled()
  })

  it('never marks the campaign sending when the gate refuses, so there is nothing to roll back', async () => {
    const chain = makeServiceChain([campaign])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)
    vi.mocked(filterSendableRecipients).mockRejectedValue(new Error('Could not read marketing consent'))
    await POST(req(), ctx())
    expect(chain.update).not.toHaveBeenCalled()
  })
})
