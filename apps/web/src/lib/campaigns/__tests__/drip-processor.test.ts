import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- SendGrid mock -------------------------------------------------------
vi.mock('@/lib/integrations/sendgrid', () => ({
  sendEmail: vi.fn(),
}))

import { sendEmail } from '@/lib/integrations/sendgrid'
import { isDripLiveSendEnabled, processCampaignDrip, resolveDripFromAddress } from '../drip-processor'
import { verifyUnsubscribeToken } from '../drip-unsubscribe'

// --- Supabase mock: per-table FIFO response queues + write capture -------
let responses: Record<string, any[]>
let inserts: Array<{ table: string; payload: any }>
let updates: Array<{ table: string; payload: any }>

function makeChain(table: string) {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    lte: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      const queue = responses[table] ?? []
      const next = queue.shift() ?? { data: null, error: null }
      return Promise.resolve(next).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.lte.mockReturnValue(b)
  b.in.mockReturnValue(b)
  b.order.mockReturnValue(b)
  b.insert.mockImplementation((payload: any) => {
    inserts.push({ table, payload })
    return b
  })
  b.update.mockImplementation((payload: any) => {
    updates.push({ table, payload })
    return b
  })
  return b
}

const supabase = { from: vi.fn((table: string) => makeChain(table)) }

const STEP_1 = {
  id: 'step-1',
  step_order: 1,
  subject: 'Welcome',
  body_html: '<p>Hi</p>',
  body_text: null,
  delay_minutes: 0,
}

const STEP_2 = { ...STEP_1, id: 'step-2', step_order: 2, delay_minutes: 60 }

function enrollment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'enr-1',
    contact_id: 'c-1',
    email: 'lead@example.com',
    name: 'Lead Person',
    status: 'active',
    current_step_order: 1,
    next_run_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// Live-send gate config (UNI-2291). Stubbed for every processCampaignDrip
// test so the pre-existing live-lane tests run with the gates satisfied;
// the gate tests below override individual values.
function stubLiveGates() {
  // The UNI-2918 master switch sits in front of these gates; it must be on to reach them.
  vi.stubEnv('DRIP_LIVE_SEND_ENABLED', 'true')
  vi.stubEnv('SENDGRID_FROM_EMAIL', 'hello@unite-group.in')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.test')
  vi.stubEnv('DRIP_UNSUBSCRIBE_SECRET', 'test-unsubscribe-secret')
  vi.stubEnv('DRIP_RECIPIENT_ALLOWLIST', 'Lead@Example.com, other@example.com')
  vi.stubEnv('DRIP_ALLOWLIST_DISABLED', '')
}

function baseInput(dryRun: boolean) {
  return {
    supabase,
    founderId: 'founder-1',
    campaignId: 'camp-1',
    businessKey: 'dr',
    dryRun,
  }
}

describe('processCampaignDrip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    stubLiveGates()
    // The live-lane cases below exercise the send path, so the master switch
    // is on for them; the UNI-2918 block at the end turns it off.
    vi.stubEnv('DRIP_LIVE_SEND_ENABLED', 'true')
    responses = {}
    inserts = []
    updates = []
  })

  it('live-sends a due step, records a sent event, and advances the enrollment', async () => {
    responses.drip_steps = [{ data: [STEP_1, STEP_2], error: null }]
    responses.drip_enrollments = [
      { data: [enrollment()], error: null }, // due enrollments
      { error: null }, // advance update
    ]
    responses.drip_events = [{ error: null }]
    vi.mocked(sendEmail).mockResolvedValue('sg-msg-1')

    const summary = await processCampaignDrip(baseInput(false))

    expect(summary).toMatchObject({ processed: 1, skipped: 0, failed: 0, providerSend: 'attempted' })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { email: 'lead@example.com', name: 'Lead Person' },
        subject: 'Welcome',
        // UNI-2291 appends the unsubscribe footer after the step body.
        html: expect.stringMatching(/^<p>Hi<\/p>\n/),
      })
    )
    const event = inserts.find((i) => i.table === 'drip_events')
    expect(event?.payload).toMatchObject({
      event_type: 'sent',
      provider_send: 'sent',
      metadata: { dryRun: false, messageId: 'sg-msg-1' },
    })
    const advance = updates.find((u) => u.table === 'drip_enrollments')
    expect(advance?.payload).toMatchObject({ current_step_order: 2 })
  })

  it('marks the enrollment failed and records a failed event when the provider send throws', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [
      { data: [enrollment()], error: null },
      { error: null }, // failure update
    ]
    responses.drip_events = [{ error: null }]
    responses.drip_campaigns = [{ error: null }]
    vi.mocked(sendEmail).mockRejectedValue(new Error('sendgrid down'))

    const summary = await processCampaignDrip(baseInput(false))

    expect(summary).toMatchObject({ processed: 0, failed: 1, providerSend: 'attempted' })
    const failUpdate = updates.find((u) => u.table === 'drip_enrollments')
    expect(failUpdate?.payload).toMatchObject({ status: 'failed' })
    const event = inserts.find((i) => i.table === 'drip_events')
    expect(event?.payload).toMatchObject({ event_type: 'failed', provider_send: 'error' })
    // failed > 0 flips the campaign to partial
    expect(updates.find((u) => u.table === 'drip_campaigns')?.payload).toMatchObject({
      status: 'partial',
    })
  })

  it('keeps dry-run semantics: unsafe recipients are blocked, never sent', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [
      { data: [enrollment()], error: null },
      { error: null }, // blocked update
    ]
    responses.drip_events = [{ error: null }]
    responses.drip_campaigns = [{ error: null }]

    const summary = await processCampaignDrip(baseInput(true))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ processed: 0, failed: 1, providerSend: 'not_attempted' })
    const event = inserts.find((i) => i.table === 'drip_events')
    expect(event?.payload).toMatchObject({
      event_type: 'failed',
      provider_send: 'not_attempted',
      metadata: expect.objectContaining({ reason: 'unsafe_or_live_send_blocked' }),
    })
  })

  it('dry-run processes safe test recipients without touching the provider', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [
      { data: [enrollment({ email: 'demo@unite-hub.test' })], error: null },
      { error: null }, // advance update
    ]
    responses.drip_events = [{ error: null }]

    const summary = await processCampaignDrip(baseInput(true))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ processed: 1, failed: 0, providerSend: 'not_attempted' })
    expect(inserts.find((i) => i.table === 'drip_events')?.payload).toMatchObject({
      event_type: 'dry_run_processed',
    })
  })

  it('completes enrollments whose step no longer exists', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [
      { data: [enrollment({ current_step_order: 5 })], error: null },
      { error: null }, // complete update
    ]

    const summary = await processCampaignDrip(baseInput(false))

    expect(summary).toMatchObject({ processed: 0, skipped: 1, failed: 0 })
    expect(updates.find((u) => u.table === 'drip_enrollments')?.payload).toMatchObject({
      status: 'completed',
    })
  })
})

describe('processCampaignDrip live-send gates (UNI-2291)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    stubLiveGates()
    responses = {}
    inserts = []
    updates = []
  })

  function dueOne(email = 'lead@example.com') {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [
      { data: [enrollment({ email })], error: null },
      { error: null }, // bookkeeping update
    ]
    responses.drip_events = [{ error: null }]
  }

  it('sends to an allowlisted, unsuppressed recipient with the unsubscribe link in html + text and RFC 8058 headers', async () => {
    dueOne()
    responses.drip_suppressions = [{ data: [], error: null }]
    vi.mocked(sendEmail).mockResolvedValue('sg-msg-2')

    const summary = await processCampaignDrip(baseInput(false))

    expect(summary).toMatchObject({ processed: 1, providerSend: 'attempted' })
    expect(summary.blockedReason).toBeUndefined()
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const sent = vi.mocked(sendEmail).mock.calls[0][0]
    expect(sent.from).toEqual({ email: 'hello@unite-group.in', name: 'DR' })
    const url = sent.headers?.['List-Unsubscribe']?.slice(1, -1) ?? ''
    expect(url).toMatch(/^https:\/\/app\.example\.test\/api\/drip\/unsubscribe\?token=.+/)
    expect(sent.headers).toEqual({
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
    expect(sent.html).toContain('<p>Hi</p>')
    expect(sent.html).toContain(`href="${url}"`)
    expect(sent.text).toContain(url)
    // The link's token round-trips to this founder + recipient.
    const token = new URL(url).searchParams.get('token')
    expect(verifyUnsubscribeToken(token)).toEqual({
      founderId: 'founder-1',
      email: 'lead@example.com',
    })
  })

  it('does not send to a suppressed recipient: cancelled + skipped event, provider never called', async () => {
    dueOne('LEAD@example.com')
    responses.drip_suppressions = [{ data: [{ email: 'lead@example.com' }], error: null }]

    const summary = await processCampaignDrip(baseInput(false))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ processed: 0, skipped: 1, failed: 0 })
    expect(updates.find((u) => u.table === 'drip_enrollments')?.payload).toMatchObject({
      status: 'cancelled',
      metadata: expect.objectContaining({ blockedReason: 'suppressed' }),
    })
    expect(inserts.find((i) => i.table === 'drip_events')?.payload).toMatchObject({
      event_type: 'skipped',
      provider_send: 'not_attempted',
      metadata: expect.objectContaining({ reason: 'suppressed' }),
    })
  })

  it('does not send to a recipient outside the allowlist: paused (reversible) + skipped event', async () => {
    dueOne('stranger@example.com')
    responses.drip_suppressions = [{ data: [], error: null }]

    const summary = await processCampaignDrip(baseInput(false))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ processed: 0, skipped: 1, failed: 0 })
    expect(updates.find((u) => u.table === 'drip_enrollments')?.payload).toMatchObject({
      status: 'paused',
      metadata: expect.objectContaining({ blockedReason: 'not_allowlisted' }),
    })
    expect(inserts.find((i) => i.table === 'drip_events')?.payload).toMatchObject({
      event_type: 'skipped',
      provider_send: 'not_attempted',
      metadata: expect.objectContaining({ reason: 'not_allowlisted' }),
    })
  })

  it('sends nothing and touches nothing when the allowlist is empty and not explicitly disabled', async () => {
    vi.stubEnv('DRIP_RECIPIENT_ALLOWLIST', ' , ')
    dueOne()

    const summary = await processCampaignDrip(baseInput(false))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ blockedReason: 'allowlist_empty', providerSend: 'not_attempted' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('DRIP_ALLOWLIST_DISABLED=true lifts the allowlist (suppression still read)', async () => {
    vi.stubEnv('DRIP_RECIPIENT_ALLOWLIST', '')
    vi.stubEnv('DRIP_ALLOWLIST_DISABLED', 'true')
    dueOne('stranger@example.com')
    responses.drip_suppressions = [{ data: [], error: null }]
    vi.mocked(sendEmail).mockResolvedValue('sg-msg-3')

    const summary = await processCampaignDrip(baseInput(false))

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(summary).toMatchObject({ processed: 1 })
    expect(supabase.from).toHaveBeenCalledWith('drip_suppressions')
  })

  it('sends nothing and writes nothing when the suppression lookup errors (fail closed)', async () => {
    dueOne()
    responses.drip_suppressions = [{ data: null, error: { message: 'relation does not exist' } }]

    const summary = await processCampaignDrip(baseInput(false))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(summary).toMatchObject({
      blockedReason: 'suppression_lookup_failed',
      processed: 0,
      providerSend: 'not_attempted',
    })
    expect(updates).toEqual([])
    expect(inserts).toEqual([])
  })

  it('sends nothing when SENDGRID_FROM_EMAIL is unset — no default sender', async () => {
    vi.stubEnv('SENDGRID_FROM_EMAIL', '')
    dueOne()

    const summary = await processCampaignDrip(baseInput(false))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ blockedReason: 'sender_not_configured' })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('sends nothing when the unsubscribe link cannot be built', async () => {
    vi.stubEnv('DRIP_UNSUBSCRIBE_SECRET', '')
    dueOne()

    const summary = await processCampaignDrip(baseInput(false))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ blockedReason: 'unsubscribe_not_configured' })
  })
})

describe('live-send master switch (UNI-2918)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    responses = {}
    inserts = []
    updates = []
  })

  it('refuses a live run before any read, write or provider call when the switch is unset', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [{ data: [enrollment()], error: null }]
    vi.mocked(sendEmail).mockResolvedValue('sg-msg-1')

    const summary = await processCampaignDrip(baseInput(false))

    expect(summary).toEqual({
      processed: 0,
      skipped: 0,
      failed: 0,
      dryRun: false,
      providerSend: 'not_attempted',
      liveSendDisabled: true,
    })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
    expect(inserts).toEqual([])
    expect(updates).toEqual([])
  })

  it('accepts only the exact string "true"', () => {
    for (const value of ['', 'TRUE', 'True', '1', 'yes', ' true']) {
      vi.stubEnv('DRIP_LIVE_SEND_ENABLED', value)
      expect(isDripLiveSendEnabled(), JSON.stringify(value)).toBe(false)
    }
    vi.stubEnv('DRIP_LIVE_SEND_ENABLED', 'true')
    expect(isDripLiveSendEnabled()).toBe(true)
  })

  it('still runs the dry-run lane with the switch unset', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [
      { data: [enrollment({ email: 'safe__PW_TEST__@example.com' })], error: null },
      { error: null },
    ]
    responses.drip_events = [{ error: null }]

    const summary = await processCampaignDrip(baseInput(true))

    expect(summary.liveSendDisabled).toBeUndefined()
    expect(supabase.from).toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('resolveDripFromAddress', () => {
  beforeEach(() => vi.unstubAllEnvs())

  it('prefers the explicit env sender', () => {
    vi.stubEnv('SENDGRID_FROM_EMAIL', 'hello@unite-group.in')
    expect(resolveDripFromAddress('dr').email).toBe('hello@unite-group.in')
  })

  it('never defaults a sender when SENDGRID_FROM_EMAIL is unset (UNI-2291)', () => {
    vi.stubEnv('SENDGRID_FROM_EMAIL', '')
    vi.stubEnv('DEFAULT_FROM', 'fallback@example.com')
    expect(resolveDripFromAddress('nrpg')).toBeNull()
  })
})
