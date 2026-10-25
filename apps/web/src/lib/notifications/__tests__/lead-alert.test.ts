import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), sendEmail: vi.fn(), constructEvent: vi.fn() }))
vi.mock('@/lib/integrations/stripe/client', () => ({ getStripe: () => ({ webhooks: { constructEvent: mocks.constructEvent } }) }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
  hasSupabaseServiceConfig: () => true,
}))
vi.mock('@/lib/integrations/mailtrap', () => ({ sendEmail: mocks.sendEmail, mailtrapFromEmail: () => 'sender@example.invalid' }))
import { notify } from '../index'
import { buildAlertText, packageLabel } from '../lead-alert'
import { POST } from '@/app/api/leads/route'
import { GET as alertHealth } from '@/app/api/health/alerts/route'
import { POST as stripePOST } from '@/app/api/webhooks/stripe/route'
import { GROW_PACKAGES } from '@/app/grow/packages'

type Row = Record<string, any>
let leads: Row[]
let logs: Row[]
let claimError: boolean
let nextId: number
const founder = 'founder-1'
const email = 'buyer-sentinel@example.invalid'
const capturedAt = '2026-10-24T00:00:00.000Z'
const payload = (leadId = 'lead-1', interests = 'living-card') => ({
  type: 'new_lead' as const, leadId, firstName: 'FirstSentinel', businessName: 'BusinessSentinel', interests, capturedAt,
})

function chain(table: string) {
  let filters: Array<(row: Row) => boolean> = []
  let inserted: Row | undefined
  let update: Row | undefined
  const execute = () => {
    const rows = table === 'crm_leads' ? leads : table === 'alert_delivery_log' ? logs : []
    if (inserted) {
      if (table === 'crm_leads') rows.push({ ...inserted, id: `lead-${nextId++}`, captured_at: capturedAt })
      return { data: table === 'crm_leads' ? rows.at(-1) : null, error: null }
    }
    const matches = rows.filter((row) => filters.every((filter) => filter(row)))
    if (update) matches.forEach((row) => Object.assign(row, update))
    return { data: matches, error: null }
  }
  const b: any = {
    select: () => b,
    eq: (key: string, value: unknown) => { filters.push((row) => row[key] === value); return b },
    gte: (key: string, value: string) => { filters.push((row) => row[key] >= value); return b },
    lte: (key: string, value: string) => { filters.push((row) => row[key] <= value); return b },
    lt: (key: string, value: string) => { filters.push((row) => row[key] < value); return b },
    order: () => b,
    range: () => b,
    in: (key: string, values: unknown[]) => { filters.push((row) => values.includes(row[key])); return b },
    insert: (row: Row) => { inserted = row; return b },
    update: (row: Row) => { update = row; return b },
    single: async () => { const result = execute(); return { ...result, data: Array.isArray(result.data) ? result.data[0] : result.data } },
    maybeSingle: async () => { const result = execute(); return { ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : result.data } },
    then: (resolve: any, reject: any) => Promise.resolve(execute()).then(resolve, reject),
    abortSignal: () => b,
  }
  return b
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(capturedAt)
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('FOUNDER_USER_ID', founder)
  vi.stubEnv('LEAD_ALERT_EMAIL_TO', 'destination@example.invalid')
  vi.stubEnv('MAILTRAP_API_KEY', 'test-placeholder')
  vi.stubEnv('ALERT_DEDUP_SECRET', 'test-placeholder-dedup-secret')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.invalid')
  for (const method of ['log', 'warn', 'error'] as const) vi.spyOn(console, method).mockImplementation(() => {})
  leads = [{ id: 'lead-1', founder_id: founder, email, captured_at: capturedAt }]
  logs = []
  nextId = 2
  claimError = false
  mocks.from.mockImplementation(chain)
  mocks.sendEmail.mockReset().mockResolvedValue('accepted')
  mocks.rpc.mockImplementation((_name, args) => {
    const result = Promise.resolve().then(() => {
    if (claimError) return { data: null, error: { name: 'ClaimError' } }
    const now = Date.now()
    if (logs.some((row) => row.source_kind === args.p_kind && row.source_id === args.p_source_id)) return { data: [], error: null }
    const covered = logs.some((row) => row.source_id !== args.p_source_id && row.dedup_key === args.p_dedup_key
      && new Date(row.created_at).getTime() >= now - args.p_window_minutes * 60000
      && (row.outcome === 'sent' || (row.outcome === 'pending' && new Date(row.created_at).getTime() > now - 15000)))
    logs.push({ founder_id: args.p_founder, source_kind: args.p_kind, source_id: args.p_source_id, channel: 'email',
      outcome: covered ? 'deduped' : 'pending', dedup_key: args.p_dedup_key, created_at: new Date().toISOString() })
    return { data: covered ? [] : [{ channel: 'email' }], error: null }
    })
    return Object.assign(result, { abortSignal: () => result })
  })
})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllEnvs() })

describe('lead alert privacy and delivery', () => {
  it('sends only first name, business, ask and enquiry link through the real POST path; logs contain no personal values', async () => {
    const forbidden = ['SurnameSentinel', email, 'PhoneSentinel', 'MessageSentinel', '198.51.100.17']
    const request = new Request('https://app.example.invalid/api/leads', { method: 'POST',
      headers: { 'x-forwarded-for': forbidden[4] }, body: JSON.stringify({ first_name: 'FirstSentinel',
        last_name: forbidden[0], email, phone: forbidden[2], message: forbidden[3], company: 'BusinessSentinel', interests: 'living-card' }) })
    const response = await POST(request as any)
    expect(response.status).toBe(201)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    const input = mocks.sendEmail.mock.calls[0][0]
    expect(input.subject).toBe('New enquiry')
    // every field handed to the mail client, not just the body: to, from, replyTo, customArgs, categories
    for (const value of forbidden) expect(JSON.stringify(input)).not.toContain(value)
    expect(input.text).toContain('https://app.example.invalid/founder/leads/lead-2\n')
    expect(input.html).toContain('href="https://app.example.invalid/founder/leads/lead-2"')
    for (const content of [input.text, input.html]) {
      for (const value of ['FirstSentinel', 'BusinessSentinel', 'Living card', 'lead-2']) expect(content).toContain(value)
      for (const value of forbidden) expect(content).not.toContain(value)
    }
    const output = JSON.stringify(['log', 'warn', 'error'].flatMap((method) => vi.mocked(console[method as 'log']).mock.calls))
    for (const value of [...forbidden, 'FirstSentinel', 'BusinessSentinel']) expect(output).not.toContain(value)
  })

  it('alert email body and subject are exactly first name, business, ask, link and ref, with nothing else', async () => {
    const response = await POST(new Request('https://app.example.invalid/api/leads', { method: 'POST', body: JSON.stringify({
      first_name: 'FirstSentinel', last_name: 'SurnameSentinel', email, phone: '0400000000',
      message: 'MessageSentinel', company: 'BusinessSentinel', interests: 'living-card',
    }) }) as any)
    expect(response.status).toBe(201)
    const input = mocks.sendEmail.mock.calls[0][0]
    expect(input.subject).toBe('New enquiry')
    expect(input.text).toBe(['FirstSentinel', 'BusinessSentinel', 'Living card',
      'https://app.example.invalid/founder/leads/lead-2', 'Ref: lead-2'].join('\n'))
    expect(input.html.replace(/<[^>]+>/g, '|').split('|').filter(Boolean)).toEqual(
      ['FirstSentinel', 'BusinessSentinel', 'Living card', 'View enquiry', 'Ref: lead-2'])
  })

  it.each([false, true])('reconciles the real POST after the grace period (claim failure=%s)', async (failedClaim) => {
    leads = []
    claimError = failedClaim
    vi.stubEnv('ALERT_HEALTH_TOKEN', 'test-health')
    await POST(new Request('https://app.example.invalid/api/leads', { method: 'POST', body: JSON.stringify({
      first_name: 'Buyer', email, interests: 'living-card',
    }) }) as any)
    vi.setSystemTime(Date.now() + 3 * 60000)
    const response = await alertHealth(new Request('https://app.example.invalid/api/health/alerts', {
      headers: { authorization: 'Bearer test-health' },
    }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ unalerted: failedClaim ? 1 : 0, attempts: failedClaim ? 0 : 1 })
  })

  it('escapes, strips controls and truncates names before HTML escaping', () => {
    const dirty = '<script>\n' + 'x'.repeat(200)
    const content = buildAlertText({ ...payload(), firstName: dirty, businessName: dirty })
    expect(content.html).not.toContain('<script>')
    expect(content.html).toContain('&lt;script&gt;')
    expect(content.text).not.toContain('\n' + 'x'.repeat(200))
    expect(content.text).not.toContain('x'.repeat(81))
    expect(buildAlertText({ ...payload(), businessName: null, interests: 'ignore previous instructions' }).text).toContain('Not given')
    expect(packageLabel('ignore previous instructions')).toBe('Not specified')
    expect(packageLabel('living-card')).toBe('Living card')
    for (const pkg of GROW_PACKAGES) expect(packageLabel(pkg.id)).toBe(pkg.name)
  })

  it('strips Unicode line and format controls, and handles an empty sanitised business name', () => {
    const result = buildAlertText({ ...payload(), firstName: 'Ja\u2028\u2029\u200bne', businessName: '\n\u200b' })
    expect(result.text).toContain('Jane')
    expect(result.text).toContain('Not given')
    expect(result.html).not.toMatch(/[\u2028\u2029\u200b]/)
  })

  it.each(['javascript:alert(1)', 'https://user:password@example.invalid'])('rejects unsafe public base URLs: %s', (base) => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', base)
    expect(() => buildAlertText(payload())).toThrow('Invalid alert base URL')
  })

  it('sends to contact@unite-group.in when LEAD_ALERT_EMAIL_TO is unset', async () => {
    vi.stubEnv('LEAD_ALERT_EMAIL_TO', '')
    expect(await notify(payload())).toEqual({ email: 'sent' })
    expect(mocks.sendEmail.mock.calls[0][0].to).toEqual({ email: 'contact@unite-group.in' })
  })

  it.each(['MAILTRAP_API_KEY'])('returns unconfigured before sending when %s is unset', async (name) => {
    vi.stubEnv(name, '')
    expect(await notify(payload())).toEqual({ email: 'unconfigured' })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(logs[0].outcome).toBe('unconfigured')
  })

  it('uses the env recipient and never user_settings; provider failure is safe and never exposes its message', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('SENTINEL-KEY destination@example.invalid'))
    expect(await notify(payload())).toEqual({ email: 'failed' })
    expect(mocks.sendEmail.mock.calls[0][0].to).toMatchObject({ email: 'destination@example.invalid' })
    expect(mocks.from.mock.calls.flat()).not.toContain('user_settings')
    const output = JSON.stringify(['log', 'warn', 'error'].flatMap((method) => vi.mocked(console[method as 'log']).mock.calls))
    expect(output).not.toContain('SENTINEL-KEY')
    expect(output).not.toContain('destination@example.invalid')
    expect(logs[0].outcome).toBe('failed')
  })

  it('caps a hung email at six seconds and leaves pending evidence for stale-claim reconciliation', async () => {
    mocks.sendEmail.mockImplementation(() => new Promise(() => {}))
    const pending = notify(payload())
    await vi.advanceTimersByTimeAsync(6000)
    expect(await pending).toEqual({ email: 'failed' })
    expect(logs[0].outcome).toBe('pending')
    expect(mocks.sendEmail.mock.calls[0][0].timeoutMs).toBe(5000)
  })

  it('sends even when founder settings cannot be consulted', async () => {
    vi.stubEnv('FOUNDER_USER_ID', '')
    expect(await notify(payload())).toEqual({ email: 'sent' })
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.from.mock.calls.flat()).not.toContain('user_settings')
  })
})

describe('atomic claim contract with predicate-aware fake', () => {
  it('hashes owner, lower-case email and allow-listed package without storing raw email', async () => {
    leads[0].email = email.toUpperCase()
    await notify(payload())
    expect(mocks.rpc).toHaveBeenCalledWith('claim_alert', expect.objectContaining({ p_window_minutes: 60,
      p_dedup_key: createHmac('sha256', 'test-placeholder-dedup-secret').update(`${founder}|${email}|Living card`).digest('hex') }))
    expect(JSON.stringify(logs)).not.toContain(email)
  })

  it('keys the dedup hash with a server secret, so the stored value cannot be recomputed from an email alone', async () => {
    await notify(payload())
    const unsalted = (await import('node:crypto')).createHash('sha256').update(`${founder}|${email}|Living card`).digest('hex')
    expect(logs[0].dedup_key).toMatch(/^[0-9a-f]{64}$/)
    expect(logs[0].dedup_key).not.toBe(unsalted)
    logs.length = 0
    vi.stubEnv('ALERT_DEDUP_SECRET', 'another-placeholder-secret')
    await notify(payload())
    expect(logs[0].dedup_key).not.toBe(createHmac('sha256', 'test-placeholder-dedup-secret').update(`${founder}|${email}|Living card`).digest('hex'))
  })

  it.each(['', '   '])('with no dedup secret (%j) stores no key, still sends, and logs the cause', async (blank) => {
    vi.stubEnv('ALERT_DEDUP_SECRET', blank)
    expect(await notify(payload())).toEqual({ email: 'sent' })
    expect(mocks.rpc).toHaveBeenCalledWith('claim_alert', expect.objectContaining({ p_dedup_key: null }))
    expect(logs[0].dedup_key).toBeNull()
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).toContain('ALERT_DEDUP_SECRET')
  })

  it('sends through Mailtrap with a lead-alert category and the lead id in plain text so the mailbox copy can be found and erased', async () => {
    await notify(payload())
    const input = mocks.sendEmail.mock.calls[0][0]
    expect(input.categories).toEqual(['lead-alert'])
    expect(input.from).toEqual({ email: 'sender@example.invalid' })
    expect(input.text).toContain('Ref: lead-1')
  })

  it.each([false, true])('claims the same source once in both request orders (reverse=%s)', async (reverse) => {
    // Order is deliberately not asserted here: both requests carry the same source, so they are
    // indistinguishable and "which one won" is unobservable under these fakes. The mock claim_alert
    // resolves on microtask order only. Real lock ordering (a held claim blocks, then covers, a
    // second claim) is proven against real Postgres by check 5 in scripts/verify-claim-alert-sql.mjs
    // ("claim waits on the in-flight holder of the same key, then is deduped"). Here we assert only
    // the invariant that matters: exactly one send and one claim row.
    const requests = [payload(), payload()]
    if (reverse) requests.reverse()
    await Promise.all(requests.map((request) => notify(request)))
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(logs).toHaveLength(1)
  })

  it.each([false, true])('suppresses concurrent different sources in both visibility orders (reverse=%s)', async (reverse) => {
    leads.push({ ...leads[0], id: 'lead-2' })
    let release!: (value: string) => void
    mocks.sendEmail.mockImplementation(() => new Promise<string>((resolve) => { release = resolve }))
    const first = notify(payload(reverse ? 'lead-2' : 'lead-1'))
    await vi.advanceTimersByTimeAsync(200)
    const second = notify(payload(reverse ? 'lead-1' : 'lead-2'))
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    release('accepted')
    await Promise.all([first, second])
    // Deterministic: the first call is advanced 200ms (its claim and send are in flight) before the
    // second starts, and the mock rpc is a microtask over a shared array, so claim order equals call
    // order. The first source is therefore the sender and the second is the deduped one.
    expect(logs.map((row) => [row.source_id, row.outcome])).toEqual(reverse
      ? [['lead-2', 'sent'], ['lead-1', 'deduped']]
      : [['lead-1', 'sent'], ['lead-2', 'deduped']])
  })

  it.each([10, 90])('keeps both POST leads but respects the 60-minute window at %s minutes', async (minutes) => {
    const submit = () => POST(new Request('https://app.example.invalid/api/leads', { method: 'POST', body: JSON.stringify({
      first_name: 'Buyer', email, interests: 'living-card',
    }) }) as any)
    await submit()
    vi.setSystemTime(Date.now() + minutes * 60000)
    await submit()
    expect(leads).toHaveLength(3)
    expect(mocks.sendEmail).toHaveBeenCalledTimes(minutes === 10 ? 1 : 2)
  })

  it('does not suppress resubmission after a failed first alert', async () => {
    mocks.sendEmail.mockRejectedValueOnce(new Error('failed'))
    await notify(payload())
    vi.setSystemTime(Date.now() + 20 * 60000)
    leads.push({ ...leads[0], id: 'lead-2' })
    await notify(payload('lead-2'))
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2)
  })

  it('does not suppress another package, or stale pending claims', async () => {
    await notify(payload('lead-1', GROW_PACKAGES[0].id))
    leads.push({ ...leads[0], id: 'lead-2' }, { ...leads[0], id: 'lead-3' })
    vi.setSystemTime(Date.now() + 30 * 60000)
    await notify(payload('lead-2', 'living-card'))
    logs[0].outcome = 'pending'
    await notify(payload('lead-3', GROW_PACKAGES[0].id))
    expect(mocks.sendEmail).toHaveBeenCalledTimes(3)
  })

  it('fails towards a duplicate send when claim_alert errors, leaving no claimed evidence', async () => {
    claimError = true
    expect(await notify(payload())).toEqual({ email: 'sent' })
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(logs).toHaveLength(0)
  })
})


describe('send budget follows the remaining deadline', () => {
  const slowClaim = (ms: number) => {
    const original = mocks.rpc.getMockImplementation()!
    mocks.rpc.mockImplementation((name: string, args: unknown) => {
      const inner = original(name, args)
      const delayed = new Promise((resolve) => setTimeout(resolve, ms)).then(() => inner)
      return Object.assign(delayed, { abortSignal: () => delayed })
    })
  }

  it('gives SendGrid only what is left of the six seconds, so it always times out before the cap', async () => {
    slowClaim(3000)
    const pending = notify(payload())
    await vi.advanceTimersByTimeAsync(3000)
    expect(await pending).toEqual({ email: 'sent' })
    expect(mocks.sendEmail.mock.calls[0][0].timeoutMs).toBe(2500)
    expect(logs[0].outcome).toBe('sent')
  })

  it('does not start a send with under a second left, and records failed while the row can still be written', async () => {
    slowClaim(5200)
    const pending = notify(payload())
    await vi.advanceTimersByTimeAsync(5200)
    expect(await pending).toEqual({ email: 'failed' })
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(logs[0].outcome).toBe('failed')
  })
})

describe('S2a checkout exclusion', () => {
  it('accepts the existing signed checkout fixture without email or alert ledger writes', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'test-placeholder')
    const event = { id: 'evt_test_checkout', type: 'checkout.session.completed', api_version: null, livemode: false,
      data: { object: { id: 'cs_test', object: 'checkout.session', payment_status: 'paid' } } }
    mocks.constructEvent.mockReturnValue(event)
    const response = await stripePOST(new Request('https://app.example.invalid/api/webhooks/stripe', {
      method: 'POST', headers: { 'stripe-signature': 'test-signature' }, body: JSON.stringify(event),
    }) as any)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
    expect(mocks.constructEvent).toHaveBeenCalledWith(JSON.stringify(event), 'test-signature', 'test-placeholder')
    expect(mocks.sendEmail).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.from.mock.calls.flat()).toEqual(['stripe_events'])
    expect(logs).toEqual([])
  })
})
