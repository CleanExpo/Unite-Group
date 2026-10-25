import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- SendGrid mock -------------------------------------------------------
vi.mock('@/lib/integrations/sendgrid', () => ({
  sendEmail: vi.fn(),
}))

import { sendEmail } from '@/lib/integrations/sendgrid'
import { isDripLiveSendEnabled, processCampaignDrip, resolveDripFromAddress } from '../drip-processor'

// --- Supabase mock: per-table FIFO response queues + write capture -------
let responses: Record<string, any[]>
let inserts: Array<{ table: string; payload: any }>
let updates: Array<{ table: string; payload: any }>

function makeChain(table: string) {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    lte: vi.fn(),
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
        html: '<p>Hi</p>',
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

  it('UNI-2931 dry run over a non-test and a test recipient performs zero writes and reports blocked', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [
      {
        data: [
          enrollment({ id: 'enr-real', email: 'real@example.com' }),
          enrollment({ id: 'enr-test', email: 'x@unite-hub.test' }),
        ],
        error: null,
      },
    ]

    const summary = await processCampaignDrip(baseInput(true))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(updates).toEqual([])
    expect(inserts).toEqual([])
    // only reads: drip_steps and drip_enrollments; no write table touched
    expect(supabase.from.mock.calls.map((c) => c[0])).toEqual(['drip_steps', 'drip_enrollments'])
    expect(summary).toEqual({
      processed: 1,
      skipped: 0,
      failed: 0,
      blocked: 1,
      dryRun: true,
      providerSend: 'not_attempted',
    })
  })

  it('UNI-2931 dry run never flips the campaign to partial', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [{ data: [enrollment()], error: null }]

    await processCampaignDrip(baseInput(true))

    expect(updates.filter((u) => u.table === 'drip_campaigns')).toEqual([])
    expect(updates.filter((u) => u.table === 'drip_enrollments')).toEqual([])
    expect(inserts.filter((i) => i.table === 'drip_events')).toEqual([])
  })

  it('UNI-2931 dry run over safe test recipients writes nothing and does not touch the provider', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [
      { data: [enrollment({ email: 'demo@unite-hub.test' })], error: null },
    ]

    const summary = await processCampaignDrip(baseInput(true))

    expect(sendEmail).not.toHaveBeenCalled()
    expect(updates).toEqual([])
    expect(inserts).toEqual([])
    expect(summary).toMatchObject({ processed: 1, failed: 0, blocked: 0, providerSend: 'not_attempted' })
  })

  it('UNI-2931 dry run counts a missing-step enrollment as skipped without completing it', async () => {
    responses.drip_steps = [{ data: [STEP_1], error: null }]
    responses.drip_enrollments = [
      { data: [enrollment({ current_step_order: 5 })], error: null },
    ]

    const summary = await processCampaignDrip(baseInput(true))

    expect(updates).toEqual([])
    expect(inserts).toEqual([])
    expect(sendEmail).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ processed: 0, skipped: 1, failed: 0, blocked: 0, dryRun: true })
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

  it('falls back to the business noreply convention', () => {
    vi.stubEnv('SENDGRID_FROM_EMAIL', '')
    vi.stubEnv('DEFAULT_FROM', '')
    expect(resolveDripFromAddress('nrpg')).toEqual({
      email: 'noreply@nrpg.com.au',
      name: 'NRPG',
    })
  })
})
