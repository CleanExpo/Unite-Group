import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/cache', () => ({
  getCached: () => null,
  setCache: () => {},
  invalidateCache: () => {},
}))

vi.mock('../google-oauth', () => ({
  isGoogleConfigured: () => true,
  getValidToken: vi.fn(async () => 'tok'),
  getAccessTokenForEmail: vi.fn(async () => 'access-token'),
}))

// Keep escapeHtml REAL (sendReply relies on it) but control getAccountSignature.
vi.mock('@/lib/email/signature', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/email/signature')>()
  return { ...actual, getAccountSignature: vi.fn() }
})

import { sendReply } from '../gmail'
import { getAccountSignature } from '@/lib/email/signature'

/** Decode the Gmail `raw` (base64url) POST body back to the MIME string. */
function decodeSentMime(fetchMock: ReturnType<typeof vi.fn>): { mime: string; body: string } {
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/messages/send'))!
  const init = call[1] as RequestInit
  const { raw } = JSON.parse(init.body as string) as { raw: string }
  const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
  const mime = Buffer.from(b64, 'base64').toString('utf8')
  const idx = mime.indexOf('\r\n\r\n')
  const bodyPart = mime.slice(idx + 4).replace(/\r\n/g, '')
  const body = Buffer.from(bodyPart, 'base64').toString('utf8')
  return { mime, body }
}

function okSend() {
  return { ok: true, status: 200, json: async () => ({ id: 'sent-1' }) } as Response
}

describe('gmail.sendReply — hardening (UNI-2153 §2/§4/§6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAccountSignature).mockResolvedValue('')
  })

  it('emits MIME-Version and Content-Transfer-Encoding: base64 headers', async () => {
    const fetchMock = vi.fn(async () => okSend())
    global.fetch = fetchMock as never
    await sendReply('f1', 'me@biz.com', 't1', { to: 'a@b.com', subject: 'Hi', body: 'Hello' })
    const { mime } = decodeSentMime(fetchMock)
    expect(mime).toContain('\r\nMIME-Version: 1.0')
    expect(mime).toContain('\r\nContent-Transfer-Encoding: base64')
    expect(mime).toContain('Content-Type: text/html; charset=UTF-8')
  })

  it('base64 body round-trips non-ASCII AU text', async () => {
    const fetchMock = vi.fn(async () => okSend())
    global.fetch = fetchMock as never
    await sendReply('f1', 'me@biz.com', 't1', { to: 'a@b.com', subject: 'Café', body: 'Café façade — €50' })
    const { body } = decodeSentMime(fetchMock)
    expect(body).toContain('Café façade — €50')
  })

  it('strips CRLF from `from` and `inReplyToMessageId` — no header injection', async () => {
    const fetchMock = vi.fn(async () => okSend())
    global.fetch = fetchMock as never
    await sendReply(
      'f1',
      'me@biz.com\r\nBcc: evil@x.com',
      't1',
      {
        to: 'a@b.com\r\nCc: sneaky@x.com',
        subject: 'Hi\r\nX-Sub: 1',
        body: 'Body',
        inReplyToMessageId: 'mid\r\nX-Injected: yes',
      },
    )
    const { mime } = decodeSentMime(fetchMock)
    // No injected value ever begins a new header line (the only CRLFs are ours).
    expect(mime).not.toContain('\r\nBcc: evil@x.com')
    expect(mime).not.toContain('\r\nCc: sneaky@x.com')
    expect(mime).not.toContain('\r\nX-Sub: 1')
    expect(mime).not.toContain('\r\nX-Injected: yes')
  })

  it('escapes the untrusted body so it cannot inject HTML or hide the footer', async () => {
    vi.mocked(getAccountSignature).mockResolvedValue('<table>FOOTER</table>')
    const fetchMock = vi.fn(async () => okSend())
    global.fetch = fetchMock as never
    await sendReply('f1', 'me@biz.com', 't1', {
      to: 'a@b.com',
      subject: 'Hi',
      body: 'Hi</table><script>alert(1)</script>\nLine two',
    })
    const { body } = decodeSentMime(fetchMock)
    // Hostile markup is neutralised…
    expect(body).not.toContain('<script>')
    expect(body).toContain('&lt;script&gt;')
    // …newlines became <br>…
    expect(body).toContain('Line two')
    expect(body).toContain('<br>')
    // …and the TRUSTED footer is appended intact, exactly once, AFTER the body.
    expect(body).toContain('<table>FOOTER</table>')
    expect(body.match(/<table>FOOTER<\/table>/g)).toHaveLength(1)
    expect(body.indexOf('FOOTER')).toBeGreaterThan(body.indexOf('Line two'))
  })

  it('a signature-lookup failure NEVER blocks the send (sends without footer)', async () => {
    vi.mocked(getAccountSignature).mockRejectedValue(new Error('voice store down'))
    const fetchMock = vi.fn(async () => okSend())
    global.fetch = fetchMock as never
    const res = await sendReply('f1', 'me@biz.com', 't1', { to: 'a@b.com', subject: 'Hi', body: 'Hello' })
    expect(res.messageId).toBe('sent-1')
    const { body } = decodeSentMime(fetchMock)
    expect(body).toContain('Hello')
  })
})
