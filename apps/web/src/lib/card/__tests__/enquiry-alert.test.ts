import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sendEmail = vi.fn()
vi.mock('@/lib/integrations/mailtrap', async (orig) => ({
  ...(await orig<typeof import('@/lib/integrations/mailtrap')>()),
  sendEmail: (...a: unknown[]) => sendEmail(...a),
}))

import { canEmailCardOwner, sendCardEnquiryAlerts, type CardEnquiryAlert } from '../enquiry-alert'
import { submitCardEnquiry } from '../enquiry'

const alert: CardEnquiryAlert = {
  reference: 'LC-F3A1C0DE0000',
  cardSlug: 'sam',
  ownerEmail: 'sam@samco.com.au',
  firstName: 'Jo <b>',
  business: 'Jo & Co',
  ask: 'Can you call me?\n<script>x</script>',
  replyEmail: 'jo@example.com',
}

beforeEach(() => {
  sendEmail.mockReset()
  vi.stubEnv('MAILTRAP_API_KEY', 'test-placeholder-not-a-key')
  vi.stubEnv('LEAD_ALERT_EMAIL_TO', 'alerts@unite-group.in')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sendCardEnquiryAlerts (UNI-3021)', () => {
  it('emails the full enquiry to the card owner, with the visitor as reply-to and the message escaped', async () => {
    sendEmail.mockResolvedValue('msg-1')
    const r = await sendCardEnquiryAlerts(alert)
    expect(r).toEqual({ ownerNotified: true })
    const owner = sendEmail.mock.calls.map((c) => c[0]).find((m) => m.to.email === 'sam@samco.com.au')
    expect(owner).toBeTruthy()
    expect(owner.replyTo).toEqual({ email: 'jo@example.com' })
    expect(owner.subject).toBe('New enquiry from your Living Business Card (LC-F3A1C0DE0000)')
    expect(owner.html).toContain('&lt;script&gt;x&lt;/script&gt;')
    expect(owner.html).not.toContain('<script>')
    expect(owner.html).toContain('Jo &amp; Co')
    expect(owner.text).toContain('Can you call me?')
  })

  it('sends Unite Group a minimal alert: slug, first name and reference only, never the message or reply email', async () => {
    sendEmail.mockResolvedValue('msg-1')
    await sendCardEnquiryAlerts(alert)
    const internal = sendEmail.mock.calls.map((c) => c[0]).find((m) => m.to.email === 'alerts@unite-group.in')
    expect(internal).toBeTruthy()
    const all = `${internal.subject}${internal.html}${internal.text}`
    expect(all).toContain('LC-F3A1C0DE0000')
    expect(all).toContain('sam')
    expect(all).not.toContain('Can you call me')
    expect(all).not.toContain('jo@example.com')
    expect(internal.replyTo).toBeUndefined()
  })

  it('reports the owner not notified when the card has no usable owner email, and still alerts Unite Group', async () => {
    sendEmail.mockResolvedValue('msg-1')
    for (const ownerEmail of [null, '', 'not an email']) {
      sendEmail.mockClear()
      expect(await sendCardEnquiryAlerts({ ...alert, ownerEmail })).toEqual({ ownerNotified: false })
      expect(sendEmail.mock.calls.map((c) => c[0].to.email)).toEqual(['alerts@unite-group.in'])
    }
  })

  it('reports the owner not notified when Mailtrap is not configured (sendEmail returns null)', async () => {
    sendEmail.mockResolvedValue(null)
    expect(await sendCardEnquiryAlerts(alert)).toEqual({ ownerNotified: false })
  })

  it('never throws: an owner send failure is logged without the message and reported as not notified', async () => {
    sendEmail.mockImplementation(async (m: { to: { email: string } }) => {
      if (m.to.email === 'sam@samco.com.au') throw new Error('[mailtrap] send failed: HTTP 500')
      return 'msg-2'
    })
    await expect(sendCardEnquiryAlerts(alert)).resolves.toEqual({ ownerNotified: false })
    const logged = vi.mocked(console.error).mock.calls.flat().join(' ')
    expect(logged).toContain('HTTP 500')
    expect(logged).not.toContain('Can you call me')
    expect(logged).not.toContain('jo@example.com')
  })

  it('an internal alert failure does not change the owner result', async () => {
    sendEmail.mockImplementation(async (m: { to: { email: string } }) => {
      if (m.to.email === 'alerts@unite-group.in') throw new Error('boom')
      return 'msg-3'
    })
    await expect(sendCardEnquiryAlerts(alert)).resolves.toEqual({ ownerNotified: true })
  })

  it('does not send Unite Group a second email when the owner address is the alert mailbox', async () => {
    sendEmail.mockResolvedValue('msg-1')
    await sendCardEnquiryAlerts({ ...alert, ownerEmail: 'Alerts@Unite-Group.in' })
    expect(sendEmail).toHaveBeenCalledTimes(1)
  })
})

describe('canEmailCardOwner (decides whether the form may promise an owner email)', () => {
  it('needs both a Mailtrap key and a usable owner address', () => {
    expect(canEmailCardOwner('sam@samco.com.au')).toBe(true)
    expect(canEmailCardOwner(null)).toBe(false)
    expect(canEmailCardOwner('not an email')).toBe(false)
    vi.stubEnv('MAILTRAP_API_KEY', '')
    expect(canEmailCardOwner('sam@samco.com.au')).toBe(false)
  })
})

type R = { data: unknown; error: { message: string } | null }
function client(profile: R = { data: { published_at: '2026-10-25T00:00:00Z', email: 'sam@samco.com.au' }, error: null }) {
  const rpcResult: R = { data: { id: 'f3a1c0de-0000-4000-8000-000000000001', created_at: '2026-10-25T01:02:03Z' }, error: null }
  const select = vi.fn()
  return {
    select,
    c: {
      from: () => ({ select: (cols: string) => { select(cols); return { eq: () => ({ maybeSingle: () => Promise.resolve(profile) }) } } }),
      rpc: () => ({ single: () => Promise.resolve(rpcResult) }),
    } as never,
  }
}
const good = { firstName: 'Jo', ask: 'Can you call me?', business: 'Jo Co', replyEmail: 'jo@example.com' }

describe('submitCardEnquiry with an owner alert (UNI-3021)', () => {
  it('passes the stored row reference and the card owner email to the alert', async () => {
    const m = client()
    const notify = vi.fn().mockResolvedValue({ ownerNotified: true })
    const r = await submitCardEnquiry(m.c, 'sam', good, notify)
    expect(m.select).toHaveBeenCalledWith('published_at, email')
    expect(notify).toHaveBeenCalledWith({
      reference: 'LC-F3A1C0DE0000', cardSlug: 'sam', ownerEmail: 'sam@samco.com.au',
      firstName: 'Jo', business: 'Jo Co', ask: 'Can you call me?', replyEmail: 'jo@example.com',
    })
    expect(r).toMatchObject({ ok: true, receipt: { reference: 'LC-F3A1C0DE0000', ownerNotified: true } })
  })

  it('the stored enquiry survives a throwing alert: the receipt is still returned, marked not notified, and the failure is logged', async () => {
    const m = client()
    const notify = vi.fn().mockRejectedValue(new Error('mail down'))
    const r = await submitCardEnquiry(m.c, 'sam', good, notify)
    expect(r).toEqual({
      ok: true,
      receipt: { id: 'f3a1c0de-0000-4000-8000-000000000001', reference: 'LC-F3A1C0DE0000', status: 'received', acceptedAt: '2026-10-25T01:02:03Z', ownerNotified: false },
    })
    expect(vi.mocked(console.error).mock.calls.flat().join(' ')).toContain('mail down')
  })

  it('never alerts when the enquiry was not stored', async () => {
    const notify = vi.fn()
    await submitCardEnquiry(client({ data: null, error: null }).c, 'sam', good, notify)
    await submitCardEnquiry(client().c, '../x', good, notify)
    expect(notify).not.toHaveBeenCalled()
  })
})
