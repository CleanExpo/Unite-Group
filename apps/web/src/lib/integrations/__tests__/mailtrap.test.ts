import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAILTRAP_SEND_URL, mailtrapFromEmail, sendEmail } from '../mailtrap'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('mailtrap sendEmail', () => {
  it('is a no-op without MAILTRAP_API_KEY', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', '')
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await sendEmail({ to: { email: 'a@example.invalid' }, from: { email: 'b@example.invalid' }, subject: 's', html: 'h' })).toBeNull()
    expect(f).not.toHaveBeenCalled()
  })

  it('posts to the Mailtrap send API with a bearer token', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', 'test-key')
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, message_ids: ['m1'] }), { status: 200 }))
    vi.stubGlobal('fetch', f)
    const id = await sendEmail({ to: { email: 'a@example.invalid' }, from: { email: 'b@example.invalid', name: 'Margot' }, subject: 's', html: 'h', text: 't', categories: ['card-order-alert'] })
    expect(id).toBe('m1')
    const [url, init] = f.mock.calls[0]
    expect(url).toBe(MAILTRAP_SEND_URL)
    expect(init.headers.Authorization).toBe('Bearer test-key')
    expect(JSON.parse(init.body)).toMatchObject({ to: [{ email: 'a@example.invalid' }], category: 'card-order-alert', text: 't' })
  })

  it('sends exactly the Mailtrap body: from, to, content, category and no tracking fields', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', 'test-key')
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message_ids: ['m2'] }), { status: 200 }))
    vi.stubGlobal('fetch', f)
    await sendEmail({ to: { email: 'buyer@example.invalid' }, from: { email: 'contact@unite-group.in', name: 'Margot at Unite-Group' }, subject: 's', html: '<p>h</p>', text: 't', categories: ['card-order-welcome'] })
    const body = JSON.parse(f.mock.calls[0][1].body)
    expect(body).toEqual({
      from: { email: 'contact@unite-group.in', name: 'Margot at Unite-Group' },
      to: [{ email: 'buyer@example.invalid' }],
      subject: 's',
      html: '<p>h</p>',
      text: 't',
      category: 'card-order-welcome',
    })
    expect(JSON.stringify(body)).not.toMatch(/track/i)
  })

  it('throws on an HTTP error', async () => {
    vi.stubEnv('MAILTRAP_API_KEY', 'test-key')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
    await expect(sendEmail({ to: { email: 'a@example.invalid' }, from: { email: 'b@example.invalid' }, subject: 's', html: 'h' })).rejects.toThrow('HTTP 401')
  })

  it('defaults the sender to contact@unite-group.in', () => {
    vi.stubEnv('MAILTRAP_FROM_EMAIL', '')
    expect(mailtrapFromEmail()).toBe('contact@unite-group.in')
  })
})
