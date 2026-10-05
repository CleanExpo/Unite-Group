import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  captchaRequired,
  verifyCaptcha,
  captchaErrorCode,
  HCAPTCHA_SITEVERIFY_URL,
} from '../captcha'

const REAL_FETCH = globalThis.fetch

function siteverifyReply(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
  )
}

describe('captchaRequired', () => {
  afterEach(() => {
    delete process.env.SITE_AGENT_CAPTCHA_ENABLED
  })

  it('is on only for the exact string "true"', () => {
    expect(captchaRequired()).toBe(false)
    for (const value of ['1', 'TRUE', 'yes', ' true', '']) {
      process.env.SITE_AGENT_CAPTCHA_ENABLED = value
      expect(captchaRequired()).toBe(false)
    }
    process.env.SITE_AGENT_CAPTCHA_ENABLED = 'true'
    expect(captchaRequired()).toBe(true)
  })
})

describe('verifyCaptcha (fail closed)', () => {
  beforeEach(() => {
    process.env.HCAPTCHA_SECRET = 'test-hcaptcha-secret'
  })

  afterEach(() => {
    globalThis.fetch = REAL_FETCH
    delete process.env.HCAPTCHA_SECRET
    delete process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY
  })

  it('refuses a missing or empty token without calling siteverify', async () => {
    const fetchMock = siteverifyReply({ success: true })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    expect(await verifyCaptcha(undefined, '1.2.3.4')).toEqual({ ok: false, reason: 'missing_token' })
    expect(await verifyCaptcha('   ', '1.2.3.4')).toEqual({ ok: false, reason: 'missing_token' })
    expect(await verifyCaptcha(42, '1.2.3.4')).toEqual({ ok: false, reason: 'missing_token' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses when HCAPTCHA_SECRET is unset', async () => {
    delete process.env.HCAPTCHA_SECRET
    const fetchMock = siteverifyReply({ success: true })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    expect(await verifyCaptcha('tok', '1.2.3.4')).toEqual({ ok: false, reason: 'missing_secret' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses on a non-2xx siteverify reply', async () => {
    globalThis.fetch = siteverifyReply({ success: true }, 500) as unknown as typeof fetch
    expect(await verifyCaptcha('tok', '1.2.3.4')).toEqual({ ok: false, reason: 'http_error' })
  })

  it('refuses when the siteverify fetch rejects (network error / timeout)', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    }) as unknown as typeof fetch
    expect(await verifyCaptcha('tok', '1.2.3.4')).toEqual({ ok: false, reason: 'network_error' })
  })

  it('refuses on malformed JSON', async () => {
    globalThis.fetch = siteverifyReply('<html>nope') as unknown as typeof fetch
    expect(await verifyCaptcha('tok', '1.2.3.4')).toEqual({ ok: false, reason: 'malformed_response' })
  })

  it('refuses success:false and any non-boolean-true success', async () => {
    globalThis.fetch = siteverifyReply({
      success: false,
      'error-codes': ['invalid-input-response'],
    }) as unknown as typeof fetch
    expect(await verifyCaptcha('tok', '1.2.3.4')).toEqual({ ok: false, reason: 'rejected' })

    globalThis.fetch = siteverifyReply({ success: 'true' }) as unknown as typeof fetch
    expect(await verifyCaptcha('tok', '1.2.3.4')).toEqual({ ok: false, reason: 'rejected' })
  })

  it('accepts success:true and posts a form-encoded body to siteverify', async () => {
    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = 'site-key-public'
    const fetchMock = siteverifyReply({ success: true })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    expect(await verifyCaptcha('tok-abc', '1.2.3.4')).toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(HCAPTCHA_SITEVERIFY_URL)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    )
    const form = new URLSearchParams(String(init.body))
    expect(form.get('secret')).toBe('test-hcaptcha-secret')
    expect(form.get('response')).toBe('tok-abc')
    expect(form.get('remoteip')).toBe('1.2.3.4')
    expect(form.get('sitekey')).toBe('site-key-public')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('never logs the secret or the token', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    globalThis.fetch = siteverifyReply({ success: false, 'error-codes': ['bad-request'] }) as unknown as typeof fetch
    await verifyCaptcha('tok-secret-ish', '1.2.3.4')
    const logged = warn.mock.calls.flat().join(' ')
    expect(logged).not.toContain('test-hcaptcha-secret')
    expect(logged).not.toContain('tok-secret-ish')
    warn.mockRestore()
  })
})

describe('captchaErrorCode', () => {
  it('maps missing_token to captcha_required and every other reason to captcha_failed', () => {
    expect(captchaErrorCode('missing_token')).toBe('captcha_required')
    for (const reason of ['missing_secret', 'http_error', 'network_error', 'malformed_response', 'rejected'] as const) {
      expect(captchaErrorCode(reason)).toBe('captcha_failed')
    }
  })
})
