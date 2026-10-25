// UNI-3017 review round 3: the drip sender must pass through the same consent, suppression and unsubscribe
// path as the campaign sender, so privacy policy section 10 stays true even when DRIP_LIVE_SEND_ENABLED=true.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/integrations/sendgrid', () => ({ sendEmail: vi.fn() }))
vi.mock('../send-gate', () => ({ filterSendableRecipients: vi.fn() }))
vi.mock('@/lib/notifications/sendgrid-suppression', () => ({ checkSuppression: vi.fn() }))

import { sendEmail } from '@/lib/integrations/sendgrid'
import { filterSendableRecipients } from '../send-gate'
import { DripSendBlockedError } from '../drip-errors'
import { processCampaignDrip } from '../drip-processor'

let responses: Record<string, any[]>
const inserts: Array<{ table: string; payload: any }> = []

function chainFor(table: string) {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    insert: vi.fn((payload: any) => (inserts.push({ table, payload }), b)),
    update: vi.fn(() => b),
    then(onF: any, onR: any) {
      return Promise.resolve((responses[table] ?? []).shift() ?? { data: null, error: null }).then(onF, onR)
    },
  }
  for (const k of ['select', 'eq', 'lte', 'order']) b[k].mockReturnValue(b)
  return b
}
const supabase = { from: vi.fn((t: string) => chainFor(t)) }

const STEP = { id: 'step-1', step_order: 1, subject: 'Welcome', body_html: '<p>Hi</p>', body_text: null, delay_minutes: 0 }
const enr = (id: string, email: string) => ({ id, contact_id: `c-${id}`, email, name: null, current_step_order: 1, status: 'active', next_run_at: '2026-01-01T00:00:00.000Z' })
const input = { supabase: supabase as never, founderId: 'f1', campaignId: 'camp-1', businessKey: 'dr', dryRun: false }

describe('drip live send: consent, suppression and unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('DRIP_LIVE_SEND_ENABLED', 'true')
    inserts.length = 0
    responses = {
      drip_steps: [{ data: [STEP], error: null }],
      drip_enrollments: [{ data: [enr('e1', 'yes@x.com'), enr('e2', 'no@x.com')], error: null }, { error: null }],
      drip_events: [{ error: null }],
    }
    vi.mocked(sendEmail).mockResolvedValue('sg-1')
  })

  it('sends only to enrollments the gate allows; an unconsented enrollment is skipped and nothing is sent to it', async () => {
    vi.mocked(filterSendableRecipients).mockResolvedValue({
      allowed: [{ email: 'yes@x.com', id: 'e1' }],
      skipped: { noConsent: 1, suppressed: 0, suppressionUnknown: 0 },
    } as never)
    const summary = await processCampaignDrip(input)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toMatchObject({ email: 'yes@x.com' })
    expect(summary).toMatchObject({ processed: 1, skipped: 1, failed: 0 })
  })

  it('fails closed, sending nothing, when suppression state is unknown', async () => {
    vi.mocked(filterSendableRecipients).mockResolvedValue({
      allowed: [],
      skipped: { noConsent: 0, suppressed: 0, suppressionUnknown: 2 },
    } as never)
    await expect(processCampaignDrip(input)).rejects.toBeInstanceOf(DripSendBlockedError)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('fails closed when the consent data cannot be read', async () => {
    vi.mocked(filterSendableRecipients).mockRejectedValue(new Error('Could not read marketing consent from crm_leads: boom'))
    await expect(processCampaignDrip(input)).rejects.toThrow(DripSendBlockedError)
    await expect(processCampaignDrip(input)).rejects.toThrow(/consent/i)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('asks for the unsubscribe link on every drip message', async () => {
    vi.mocked(filterSendableRecipients).mockResolvedValue({
      allowed: [{ email: 'yes@x.com', id: 'e1' }, { email: 'no@x.com', id: 'e2' }],
      skipped: { noConsent: 0, suppressed: 0, suppressionUnknown: 0 },
    } as never)
    responses.drip_enrollments.push({ error: null })
    responses.drip_events.push({ error: null })
    await processCampaignDrip(input)
    expect(vi.mocked(sendEmail).mock.calls.length).toBe(2)
    for (const [arg] of vi.mocked(sendEmail).mock.calls) expect(arg.unsubscribeLink).toBe(true)
  })

  // Records every drip_enrollments update with the enrollment id it was aimed at.
  function recordUpdates() {
    const updates: Array<{ id?: string; payload: Record<string, unknown> }> = []
    const realFrom = supabase.from.getMockImplementation()!
    supabase.from.mockImplementation((t: string) => {
      const b = realFrom(t)
      const u = b.update
      const e = b.eq
      let current: { id?: string; payload: Record<string, unknown> } | null = null
      b.update = vi.fn((payload: Record<string, unknown>) => {
        if (t === 'drip_enrollments') updates.push((current = { payload }))
        return u(payload)
      })
      b.eq = vi.fn((k: string, v: string) => {
        if (k === 'id' && current) current.id = v
        return e(k, v)
      })
      return b
    })
    return { updates, restore: () => supabase.from.mockImplementation(realFrom) }
  }
  const dupes = () => {
    responses.drip_enrollments = [{ data: [enr('e1', 'Dup@x.com'), enr('e2', 'dup@x.com')], error: null }, { error: null }, { error: null }]
    vi.mocked(filterSendableRecipients).mockResolvedValue({
      allowed: [{ email: 'Dup@x.com', id: 'e1' }],
      skipped: { noConsent: 0, suppressed: 0, suppressionUnknown: 0 },
    } as never)
  }

  it('closes the duplicate enrollment e2 once e1 has really been sent, so a later run cannot send it twice', async () => {
    dupes()
    const rec = recordUpdates()
    const summary = await processCampaignDrip(input)
    rec.restore()
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(rec.updates.find((u) => u.id === 'e2')?.payload).toMatchObject({ status: 'completed' })
    expect(summary).toMatchObject({ processed: 1, skipped: 1, failed: 0 })
  })

  it('leaves the duplicate e2 untouched and due when the send to e1 fails', async () => {
    dupes()
    vi.mocked(sendEmail).mockRejectedValue(new Error('provider down'))
    const rec = recordUpdates()
    const summary = await processCampaignDrip(input)
    rec.restore()
    expect(rec.updates.find((u) => u.id === 'e1')?.payload).toMatchObject({ status: 'failed' })
    expect(rec.updates.find((u) => u.id === 'e2')).toBeUndefined()
    expect(summary).toMatchObject({ processed: 0, failed: 1 })
  })
})
