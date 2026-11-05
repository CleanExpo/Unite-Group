// Pure decisions for the portal second step. Safe to import from a client component:
// no Node crypto, no Supabase client, no secrets.

export const PORTAL_EMAIL_FACTOR_NAME = 'Business portal email'

/** Supabase refuses a second email OTP inside this window. The button follows the same gap. */
export const EMAIL_CODE_RESEND_MS = 60_000

/** Wrong emailed codes before we pause, matching the invite check's 15 minute pause. */
export const EMAIL_CODE_FAILS_BEFORE_LOCK = 5
export const EMAIL_CODE_LOCK_MS = 15 * 60 * 1000

export type SecondFactorStart = 'choose' | 'verify' | 'email'

export type ListedFactor = {
  status: string
  friendlyName?: string | null
}

/**
 * What to show first.
 * No verified authenticator: offer the app or an emailed code.
 * A verified app we did not issue for email: ask for that app, with a way to switch.
 * Only the email factor we issued: ask for the emailed code.
 */
export function initialSecondFactorMode(factors: readonly ListedFactor[]): SecondFactorStart {
  const verified = factors.filter((factor) => factor.status === 'verified')
  if (verified.length === 0) return 'choose'
  const foreign = verified.some((factor) => factor.friendlyName !== PORTAL_EMAIL_FACTOR_NAME)
  return foreign ? 'verify' : 'email'
}

export function resendAllowed(
  lastSentAt: number | null,
  now: number,
  windowMs: number = EMAIL_CODE_RESEND_MS,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  if (lastSentAt == null || !Number.isFinite(lastSentAt)) return { ok: true }
  const waitMs = lastSentAt + windowMs - now
  if (waitMs <= 0) return { ok: true }
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)) }
}

export function parseFailCookie(value: string | undefined): { fails: number; lockedUntil: number | null } {
  if (!value) return { fails: 0, lockedUntil: null }
  const [failsText, lockedText] = value.split(':')
  const fails = Number(failsText)
  const locked = Number(lockedText)
  return {
    fails: Number.isFinite(fails) && fails > 0 ? Math.floor(fails) : 0,
    lockedUntil: Number.isFinite(locked) && locked > 0 ? locked : null,
  }
}

export function formatFailCookie(fails: number, lockedUntil: number | null): string {
  return `${Math.max(0, Math.floor(fails))}:${lockedUntil ?? 0}`
}

export function verifyLocked(lockedUntil: number | null, now: number): boolean {
  return lockedUntil != null && Number.isFinite(lockedUntil) && lockedUntil > now
}

export function nextVerifyLock(fails: number, now: number): { fails: number; lockedUntil: number | null } {
  const next = Math.max(0, Math.floor(fails)) + 1
  if (next >= EMAIL_CODE_FAILS_BEFORE_LOCK) return { fails: next, lockedUntil: now + EMAIL_CODE_LOCK_MS }
  return { fails: next, lockedUntil: null }
}

export type OtpErrorKind = 'rate_limited' | 'bad_code' | 'error'

/** Map a Supabase auth error onto a fixed outcome. The raw message is never shown. */
export function classifyOtpError(
  error: { code?: string | null; status?: number | null },
  kind: 'send' | 'verify',
): OtpErrorKind {
  const code = error.code ?? ''
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error.status === 429) {
    return 'rate_limited'
  }
  if (kind === 'send') return 'error'
  if (code === 'otp_disabled' || code === 'email_provider_disabled') return 'error'
  if (!code && (error.status == null || error.status >= 500)) return 'error'
  return 'bad_code'
}
