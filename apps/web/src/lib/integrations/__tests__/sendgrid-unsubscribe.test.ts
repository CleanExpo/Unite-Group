import { describe, it, expect, vi, beforeEach } from 'vitest'

const { send } = vi.hoisted(() => ({ send: vi.fn(async (..._args: unknown[]) => [{ statusCode: 202, headers: {} }]) }))
vi.mock('@sendgrid/mail', () => ({ default: { setApiKey: vi.fn(), send }, MailService: class {} }))

import { sendBatchEmails, sendEmail } from '../sendgrid'

describe('sendBatchEmails: every campaign message carries an unsubscribe link', () => {
  beforeEach(() => {
    send.mockClear()
    process.env.SENDGRID_API_KEY = 'test-key-not-real'
  })
  it('enables SendGrid subscription tracking on every message', async () => {
    await sendBatchEmails([
      { to: { email: 'a@x.com' }, from: { email: 'f@x.com' }, subject: 's', html: '<p>x</p>' },
      { to: { email: 'b@x.com' }, from: { email: 'f@x.com' }, subject: 's', html: '<p>x</p>' },
    ])
    const messages = (send.mock.calls[0] as unknown[])[0] as Array<{ trackingSettings?: { subscriptionTracking?: { enable?: boolean } } }>
    expect(messages).toHaveLength(2)
    for (const m of messages) expect(m.trackingSettings?.subscriptionTracking?.enable).toBe(true)
  })

  it('keeps the unsubscribe link when click and open tracking are also turned off', async () => {
    await sendEmail({ to: { email: 'a@x.com' }, from: { email: 'f@x.com' }, subject: 's', html: '<p>x</p>', unsubscribeLink: true, disableTracking: true })
    const m = (send.mock.calls[0] as unknown[])[0] as { trackingSettings?: Record<string, { enable?: boolean }> }
    expect(m.trackingSettings?.subscriptionTracking?.enable).toBe(true)
    expect(m.trackingSettings?.clickTracking?.enable).toBe(false)
    expect(m.trackingSettings?.openTracking?.enable).toBe(false)
  })
  it('adds no unsubscribe link to a message that did not ask for one', async () => {
    await sendEmail({ to: { email: 'a@x.com' }, from: { email: 'f@x.com' }, subject: 's', html: '<p>x</p>', disableTracking: true })
    const m = (send.mock.calls[0] as unknown[])[0] as { trackingSettings?: Record<string, unknown> }
    expect(m.trackingSettings?.subscriptionTracking).toBeUndefined()
  })
})
