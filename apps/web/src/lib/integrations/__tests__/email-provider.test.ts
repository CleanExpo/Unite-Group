import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendgrid = vi.hoisted(() => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/integrations/sendgrid', () => ({ sendEmail: sendgrid.sendEmail }))

import {
  DEFAULT_EMAIL_FROM,
  EmailSendError,
  resolveEmailSender,
  sendEmail,
} from '@/lib/integrations/email-provider'

// Not a real key. Chosen to be easy to spot if it ever reaches a log line.
const KEY_MARKER = 'test-placeholder-key-marker'

const input = {
  to: { email: 'contact@example.invalid' },
  from: { email: 'alerts@example.invalid' },
  subject: 'New enquiry',
  html: '<p>Sam</p>',
  text: 'Sam',
}

const ok = (message_ids: unknown) => ({ ok: true, status: 200, json: async () => ({ success: true, message_ids }) })

function stubMailtrap(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn(async () => response as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  for (const name of ['MAILTRAP_API_KEY', 'MAILTRAP_TRACKING_DISABLED', 'EMAIL_FROM', 'SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL']) {
    vi.stubEnv(name, '')
  }
  sendgrid.sendEmail.mockReset().mockResolvedValue('sg-id')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('resolveEmailSender', () => {
  it('chooses Mailtrap when its key is set, even if SendGrid is also set', () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    vi.stubEnv('SENDGRID_API_KEY', 'test-placeholder')
    vi.stubEnv('SENDGRID_FROM_EMAIL', 'sg@example.invalid')
    expect(resolveEmailSender()).toEqual({ provider: 'mailtrap', from: DEFAULT_EMAIL_FROM })
  })

  it('reads the sender from EMAIL_FROM (as CARSI does) and defaults it to an address on unite-group.in', () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    expect(DEFAULT_EMAIL_FROM).toBe('alerts@unite-group.in')
    vi.stubEnv('EMAIL_FROM', 'hello@example.invalid')
    expect(resolveEmailSender()?.from).toBe('hello@example.invalid')
  })

  it('falls back to SendGrid when only SendGrid is configured', () => {
    vi.stubEnv('SENDGRID_API_KEY', 'test-placeholder')
    vi.stubEnv('SENDGRID_FROM_EMAIL', 'sg@example.invalid')
    expect(resolveEmailSender()).toEqual({ provider: 'sendgrid', from: 'sg@example.invalid' })
  })

  it('is null when neither provider is configured, or SendGrid has no sender', () => {
    expect(resolveEmailSender()).toBeNull()
    vi.stubEnv('SENDGRID_API_KEY', 'test-placeholder')
    expect(resolveEmailSender()).toBeNull()
  })

  it('does not offer Mailtrap for a no-tracking message until the tracking setting is confirmed', () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    expect(resolveEmailSender({ noTracking: true })).toBeNull()
    vi.stubEnv('SENDGRID_API_KEY', 'test-placeholder')
    vi.stubEnv('SENDGRID_FROM_EMAIL', 'sg@example.invalid')
    expect(resolveEmailSender({ noTracking: true })).toEqual({ provider: 'sendgrid', from: 'sg@example.invalid' })
    vi.stubEnv('MAILTRAP_TRACKING_DISABLED', 'false')
    expect(resolveEmailSender({ noTracking: true })?.provider).toBe('sendgrid')
    vi.stubEnv('MAILTRAP_TRACKING_DISABLED', 'true')
    expect(resolveEmailSender({ noTracking: true })?.provider).toBe('mailtrap')
    // Messages that do not need tracking off are unaffected.
    vi.stubEnv('MAILTRAP_TRACKING_DISABLED', '')
    expect(resolveEmailSender()?.provider).toBe('mailtrap')
  })

  it('treats a whitespace-only Mailtrap key as not set', () => {
    vi.stubEnv('MAILTRAP_API_KEY', '   ')
    expect(resolveEmailSender()).toBeNull()
  })
})

describe('sendEmail', () => {
  it('sends through the Mailtrap Sending API, as CARSI does, and never touches SendGrid', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    const fetchMock = stubMailtrap(ok(['mt-42']))
    await expect(sendEmail({ ...input, timeoutMs: 3000 })).resolves.toBe('mt-42')
    expect(sendgrid.sendEmail).not.toHaveBeenCalled()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://send.api.mailtrap.io/api/send')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY_MARKER}`)
    expect(JSON.parse(init.body as string)).toEqual({
      from: { email: 'alerts@example.invalid' },
      to: [{ email: 'contact@example.invalid' }],
      subject: 'New enquiry',
      html: '<p>Sam</p>',
      text: 'Sam',
    })
  })

  it('splits a "Name <address>" sender the way CARSI does', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    const fetchMock = stubMailtrap(ok(['mt-1']))
    await sendEmail({ ...input, from: { email: 'Unite Group <alerts@example.invalid>' } })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).from).toEqual({ name: 'Unite Group', email: 'alerts@example.invalid' })
  })

  it.each([
    ['CR/LF in a formatted sender', { from: { email: 'Evil\r\nBcc: victim@example.invalid <alerts@example.invalid>' } }],
    ['CR/LF in a display name field', { from: { email: 'alerts@example.invalid', name: 'Evil\r\nBcc: x@example.invalid' } }],
    ['CR/LF in a recipient', { to: { email: 'contact@example.invalid\r\nBcc: victim@example.invalid' } }],
    ['nested angle brackets', { from: { email: 'A <b <alerts@example.invalid>>' } }],
    ['an address inside a formatted display name', { from: { email: 'Evil <victim@example.invalid> <alerts@example.invalid>' } }],
    ['an address inside an explicit display name', { from: { email: 'alerts@example.invalid', name: 'Evil <victim@example.invalid>' } }],
    ['a second recipient smuggled into one field', { to: { email: 'a@example.invalid, b@example.invalid' } }],
    ['no @', { to: { email: 'not-an-address' } }],
  ])('refuses to send with %s, and sends nothing', async (_label, override) => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    const fetchMock = stubMailtrap(ok(['mt-1']))
    await expect(sendEmail({ ...input, ...override })).rejects.toBeInstanceOf(EmailSendError)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sendgrid.sendEmail).not.toHaveBeenCalled()
  })

  it('uses SendGrid when Mailtrap is not configured', async () => {
    vi.stubEnv('SENDGRID_API_KEY', 'test-placeholder')
    vi.stubEnv('SENDGRID_FROM_EMAIL', 'sg@example.invalid')
    const fetchMock = stubMailtrap(ok(['mt-1']))
    await expect(sendEmail(input)).resolves.toBe('sg-id')
    expect(sendgrid.sendEmail).toHaveBeenCalledWith(input)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the not-configured behaviour when neither is set: a failure, never a sent result', async () => {
    sendgrid.sendEmail.mockRejectedValue(new Error('[SendGrid] SENDGRID_API_KEY not configured'))
    const fetchMock = stubMailtrap(ok(['mt-1']))
    await expect(sendEmail(input)).rejects.toThrow('not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces a Mailtrap non-2xx as a failure carrying the status, with no SendGrid retry', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    stubMailtrap({ ok: false, status: 422, json: async () => ({ success: false, errors: ['bad from'] }) })
    const failure = await sendEmail(input).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(EmailSendError)
    expect((failure as EmailSendError).status).toBe(422)
    expect(sendgrid.sendEmail).not.toHaveBeenCalled()
  })

  it('treats a non-2xx as a failure even when the body claims success with a message id', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    stubMailtrap({ ok: false, status: 503, json: async () => ({ success: true, message_ids: ['mt-valid-id'] }) })
    const failure = await sendEmail(input).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(EmailSendError)
    expect((failure as EmailSendError).status).toBe(503)
  })

  it('sends a no-tracking message through SendGrid, not Mailtrap, until the tracking setting is confirmed', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    vi.stubEnv('SENDGRID_API_KEY', 'test-placeholder')
    vi.stubEnv('SENDGRID_FROM_EMAIL', 'sg@example.invalid')
    const fetchMock = stubMailtrap(ok(['mt-1']))
    const message = { ...input, disableTracking: true }
    await expect(sendEmail(message)).resolves.toBe('sg-id')
    expect(fetchMock).not.toHaveBeenCalled()
    vi.stubEnv('MAILTRAP_TRACKING_DISABLED', 'true')
    await expect(sendEmail(message)).resolves.toBe('mt-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('treats success:false in a 200 body as a failure (CARSI checks the same flag)', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    stubMailtrap({ ok: true, status: 200, json: async () => ({ success: false, message_ids: ['mt-1'] }) })
    await expect(sendEmail(input)).rejects.toBeInstanceOf(EmailSendError)
  })

  it('treats a network failure as a failure, not a send', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    await expect(sendEmail(input)).rejects.toBeInstanceOf(EmailSendError)
  })

  it.each([[[]], [['']], [['   ']], [[42]], [undefined], [null]])('does not call a 2xx with unusable message ids (%j) a success', async (ids) => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    stubMailtrap(ok(ids))
    await expect(sendEmail(input)).rejects.toBeInstanceOf(EmailSendError)
  })

  it('does not call a 2xx with a non-JSON body a success', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    stubMailtrap({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json') } })
    await expect(sendEmail(input)).rejects.toBeInstanceOf(EmailSendError)
  })

  it('never puts the key in an error message, a log line or the request body', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', KEY_MARKER)
    const spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map((level) => vi.spyOn(console, level).mockImplementation(() => {}))
    const fetchMock = stubMailtrap({ ok: false, status: 401, json: async () => ({ success: false, errors: ['Unauthorized'] }) })
    const failure = await sendEmail(input).catch((error: unknown) => error as Error)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(String((failure as Error).message)).not.toContain(KEY_MARKER)
    expect(String((failure as Error).stack)).not.toContain(KEY_MARKER)
    expect(init.body as string).not.toContain(KEY_MARKER)
    expect(JSON.stringify(spies.map((spy) => spy.mock.calls))).not.toContain(KEY_MARKER)
  })
})
