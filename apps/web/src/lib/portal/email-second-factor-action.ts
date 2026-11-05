'use server'

import { cookies } from 'next/headers'

import { normaliseEmail } from '@/lib/portal/invites/join'
import { createClient, getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

import {
  EMAIL_FACTOR_META_KEY,
  packEmailFactor,
  unpackEmailFactor,
  withEmailFactorMetadata,
  withoutEmailFactorMetadata,
} from './email-factor-record'
import { finishEmailSecondFactor, type PortalFactor } from './email-second-factor'
import {
  classifyOtpError,
  formatFailCookie,
  nextVerifyLock,
  parseFailCookie,
  resendAllowed,
  verifyLocked,
} from './second-factor-mode'

const SEND_COOKIE = 'portal_email_otp_sent'
const FAIL_COOKIE = 'portal_email_otp_fails'

export type PortalEmailSendResult =
  | { ok: true }
  | { ok: false; outcome: 'signed_out' | 'no_email' | 'rate_limited' | 'error'; retryAfterSeconds?: number }

export type PortalEmailVerifyResult =
  | { ok: true }
  | {
    ok: false
    outcome: 'signed_out' | 'no_email' | 'bad_code' | 'needs_authenticator' | 'rate_limited' | 'error'
    retryAfterSeconds?: number
  }

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/portal',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  }
}

function sixDigits(input: string): string | null {
  const digits = input.replace(/[^0-9]/g, '')
  return digits.length === 6 ? digits : null
}

async function readMetadata(userId: string): Promise<Record<string, unknown>> {
  const admin = createServiceClient()
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) throw new Error('portal email factor lookup failed')
  return { ...(data.user.app_metadata ?? {}) }
}

async function writeMetadata(userId: string, next: Record<string, unknown>, factorId: string | null): Promise<void> {
  const admin = createServiceClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: next })
  if (error) throw new Error('portal email factor save failed')
  const { data, error: readError } = await admin.auth.admin.getUserById(userId)
  if (readError || !data.user) throw new Error('portal email factor save was not confirmed')
  const stored = data.user.app_metadata?.[EMAIL_FACTOR_META_KEY] as { factor_id?: unknown } | undefined
  const got = typeof stored?.factor_id === 'string' ? stored.factor_id : null
  if (got !== factorId) throw new Error('portal email factor save was not confirmed')
}

/**
 * Email the signed-in owner a 6-digit code. The address comes from the session,
 * never from the caller. A second ask inside one minute is refused.
 */
export async function sendPortalEmailCodeAction(): Promise<PortalEmailSendResult> {
  const user = await getUser()
  if (!user) return { ok: false, outcome: 'signed_out' }
  const email = normaliseEmail(user.email)
  if (!email) return { ok: false, outcome: 'no_email' }

  const jar = await cookies()
  const sentAt = Number(jar.get(SEND_COOKIE)?.value ?? '')
  const gate = resendAllowed(Number.isFinite(sentAt) && sentAt > 0 ? sentAt : null, Date.now())
  if (!gate.ok) return { ok: false, outcome: 'rate_limited', retryAfterSeconds: gate.retryAfterSeconds }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })
  if (error) {
    const kind = classifyOtpError(error, 'send')
    if (kind === 'rate_limited') {
      try { jar.set(SEND_COOKIE, String(Date.now()), cookieOptions(120)) } catch { /* already refused */ }
      return { ok: false, outcome: 'rate_limited', retryAfterSeconds: 60 }
    }
    return { ok: false, outcome: 'error' }
  }
  try { jar.set(SEND_COOKIE, String(Date.now()), cookieOptions(120)) } catch { /* the email is already out */ }
  return { ok: true }
}

/**
 * Check the emailed code, then raise the session to aal2. Returns ok only when
 * the assurance read says aal2. Does not remove an authenticator we did not issue.
 */
export async function verifyPortalEmailCodeAction(rawCode: string): Promise<PortalEmailVerifyResult> {
  const user = await getUser()
  if (!user) return { ok: false, outcome: 'signed_out' }
  const email = normaliseEmail(user.email)
  if (!email) return { ok: false, outcome: 'no_email' }
  const code = sixDigits(rawCode)
  if (!code) return { ok: false, outcome: 'bad_code' }

  const jar = await cookies()
  const lock = parseFailCookie(jar.get(FAIL_COOKIE)?.value)
  const now = Date.now()
  if (verifyLocked(lock.lockedUntil, now)) {
    return {
      ok: false,
      outcome: 'rate_limited',
      retryAfterSeconds: Math.max(1, Math.ceil(((lock.lockedUntil ?? now) - now) / 1000)),
    }
  }

  let lockedForSeconds: number | undefined
  const supabase = await createClient()
  const finished = await finishEmailSecondFactor({
    verifyEmail: async () => {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
      if (!error) return 'ok'
      const kind = classifyOtpError(error, 'verify')
      if (kind === 'bad_code') {
        const next = nextVerifyLock(lock.fails, Date.now())
        try { jar.set(FAIL_COOKIE, formatFailCookie(next.fails, next.lockedUntil), cookieOptions(15 * 60)) } catch { /* still refuse the code */ }
        if (next.lockedUntil) {
          lockedForSeconds = Math.max(1, Math.ceil((next.lockedUntil - Date.now()) / 1000))
          return 'rate_limited'
        }
      }
      return kind
    },
    readAal: async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) throw new Error('assurance read failed')
      if (data?.currentLevel === 'aal2') return 'aal2'
      if (data?.currentLevel === 'aal1') return 'aal1'
      return null
    },
    stepUp: {
      now: () => Date.now(),
      listFactors: async () => {
        const { data, error } = await supabase.auth.mfa.listFactors()
        if (error || !data) throw new Error('factor list failed')
        const rows = data.all.length > 0 ? data.all : data.totp
        return rows.map((factor): PortalFactor => ({
          id: factor.id,
          factorType: factor.factor_type,
          status: factor.status,
          friendlyName: factor.friendly_name ?? null,
        }))
      },
      unenroll: async (factorId) => {
        const { error } = await supabase.auth.mfa.unenroll({ factorId })
        if (error) throw new Error('factor remove failed')
      },
      enrollTotp: async (friendlyName) => {
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName })
        if (error || !data || data.type !== 'totp' || !data.totp.secret) throw new Error('factor enrol failed')
        return { factorId: data.id, secret: data.totp.secret }
      },
      loadEmailFactor: async () => unpackEmailFactor((await readMetadata(user.id))[EMAIL_FACTOR_META_KEY]),
      saveEmailFactor: async (factorId, secret) => {
        const prev = await readMetadata(user.id)
        await writeMetadata(user.id, withEmailFactorMetadata(prev, packEmailFactor(factorId, secret)), factorId)
      },
      clearEmailFactor: async () => {
        const prev = await readMetadata(user.id)
        await writeMetadata(user.id, withoutEmailFactorMetadata(prev), null)
      },
      challengeAndVerify: async (factorId, otp) => {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
        if (challengeError || !challenge) return false
        const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: otp })
        return !error
      },
    },
  })

  if (finished === 'ok') {
    try { jar.set(FAIL_COOKIE, '', cookieOptions(0)) } catch { /* the session is already raised */ }
    return { ok: true }
  }
  if (finished === 'rate_limited') {
    return { ok: false, outcome: 'rate_limited', retryAfterSeconds: lockedForSeconds ?? 60 }
  }
  if (finished === 'bad_code' || finished === 'needs_authenticator' || finished === 'signed_out' || finished === 'error') {
    return { ok: false, outcome: finished }
  }
  return { ok: false, outcome: 'error' }
}
