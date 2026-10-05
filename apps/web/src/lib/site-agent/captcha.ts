// src/lib/site-agent/captcha.ts
// hCaptcha bot mitigation for the public site agent routes (UNI-2929).
//
// Dark by default: only `SITE_AGENT_CAPTCHA_ENABLED === 'true'` turns it on.
// When on, verification FAILS CLOSED — a missing token, a missing secret, a
// non-2xx reply, a network error or timeout, a malformed body, or anything
// other than `success: true` is a refusal.
//
// Server-side verification per https://docs.hcaptcha.com/#verify-the-user-response-server-side:
// POST application/x-www-form-urlencoded to https://api.hcaptcha.com/siteverify
// with `secret` (required), `response` (required), `remoteip` (recommended)
// and `sitekey` (optional, "the sitekey you expect to see"). The reply is JSON
// carrying `success` (boolean) and `error-codes` (array). Plain fetch — no
// dependency. The secret and the token are never logged.

export const HCAPTCHA_SITEVERIFY_URL = 'https://api.hcaptcha.com/siteverify'

const VERIFY_TIMEOUT_MS = 5000

export type CaptchaFailureReason =
  | 'missing_token'
  | 'missing_secret'
  | 'http_error'
  | 'network_error'
  | 'malformed_response'
  | 'rejected'

export type CaptchaVerification = { ok: true } | { ok: false; reason: CaptchaFailureReason }

/** True only when the flag is exactly the string 'true'. Read at call time. */
export function captchaRequired(): boolean {
  return process.env.SITE_AGENT_CAPTCHA_ENABLED === 'true'
}

/**
 * Verifies an hCaptcha response token server-side. `token` is `unknown` so
 * callers can pass the raw body field; anything other than a non-empty string
 * is `missing_token`.
 */
export async function verifyCaptcha(token: unknown, ip?: string | null): Promise<CaptchaVerification> {
  if (typeof token !== 'string' || token.trim() === '') {
    return { ok: false, reason: 'missing_token' }
  }

  const secret = process.env.HCAPTCHA_SECRET?.trim()
  if (!secret) {
    console.warn('[site-agent/captcha] HCAPTCHA_SECRET is not set; refusing (fail closed)')
    return { ok: false, reason: 'missing_secret' }
  }

  const form = new URLSearchParams({ secret, response: token.trim() })
  if (ip) form.set('remoteip', ip)
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim()
  if (siteKey) form.set('sitekey', siteKey)

  let res: Response
  try {
    res = await fetch(HCAPTCHA_SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    })
  } catch {
    console.warn('[site-agent/captcha] siteverify unreachable or timed out')
    return { ok: false, reason: 'network_error' }
  }

  if (!res.ok) {
    console.warn(`[site-agent/captcha] siteverify returned HTTP ${res.status}`)
    return { ok: false, reason: 'http_error' }
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    console.warn('[site-agent/captcha] siteverify returned malformed JSON')
    return { ok: false, reason: 'malformed_response' }
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: 'malformed_response' }
  }

  const body = data as { success?: unknown; 'error-codes'?: unknown }
  if (body.success !== true) {
    const codes = Array.isArray(body['error-codes'])
      ? body['error-codes'].filter((c): c is string => typeof c === 'string').join(',')
      : ''
    console.warn(`[site-agent/captcha] siteverify rejected the token${codes ? ` (${codes})` : ''}`)
    return { ok: false, reason: 'rejected' }
  }

  return { ok: true }
}

/** Maps a failure to the public 403 error code — never leaks the detailed reason. */
export function captchaErrorCode(reason: CaptchaFailureReason): 'captcha_required' | 'captcha_failed' {
  return reason === 'missing_token' ? 'captcha_required' : 'captcha_failed'
}
