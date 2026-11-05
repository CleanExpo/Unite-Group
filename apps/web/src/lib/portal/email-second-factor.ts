import { PORTAL_EMAIL_FACTOR_NAME } from './second-factor-mode'
import { totpAttemptTimes, totpCode } from './totp'

// Portal second factor (UNI-3285).
//
// Supabase email OTP (signInWithOtp + verifyOtp type 'email') is a first factor.
// It leaves the session at aal1. Founder MFAGate uses that pair and then continues;
// the portal cannot, because public.portal_session_is_aal2() is the JWT aal claim
// (migration 20261102190000). Verified live 05/11/2026: email one-time codes are
// assurance level 1, and only MFA verify promotes the session to aal2.
// https://supabase.com/docs/guides/auth/auth-mfa
//
// After the emailed code checks out, this module steps the same session up with
// Supabase MFA verify, which is what writes aal2. The code submitted there is a
// TOTP we just enrolled (or one we enrolled on an earlier visit), computed here.
// It is never returned to the browser.
//
// An authenticator the owner already verified, which we did not issue, is not
// removed and is not replaced. The result is needs_authenticator and the session
// stays below aal2.
//
// ok is returned only after a fresh assurance read says aal2. A verify call with
// no error is not enough on its own.

export type PortalFactor = {
  id: string
  factorType: string
  status: string
  friendlyName: string | null
}

export type StepUpDeps = {
  listFactors: () => Promise<PortalFactor[]>
  unenroll: (factorId: string) => Promise<void>
  enrollTotp: (friendlyName: string) => Promise<{ factorId: string; secret: string }>
  loadEmailFactor: () => Promise<{ factorId: string; secret: string } | null>
  saveEmailFactor: (factorId: string, secret: string) => Promise<void>
  clearEmailFactor: () => Promise<void>
  challengeAndVerify: (factorId: string, code: string) => Promise<boolean>
  now: () => number
}

export type EmailProof = 'ok' | 'bad_code' | 'rate_limited' | 'error'
export type FinishResult = EmailProof | 'needs_authenticator' | 'signed_out'

async function verifyFactor(deps: StepUpDeps, factorId: string, secret: string): Promise<boolean> {
  for (const at of totpAttemptTimes(deps.now())) {
    const code = totpCode(secret, at)
    const ok = await deps.challengeAndVerify(factorId, code)
    if (ok) return true
  }
  return false
}

export async function stepUpAfterEmailProof(deps: StepUpDeps): Promise<'ok' | 'needs_authenticator' | 'error'> {
  let factors: PortalFactor[]
  try {
    factors = await deps.listFactors()
  } catch {
    return 'error'
  }

  const verified = factors.filter((factor) => factor.status === 'verified')
  const verifiedTotp = verified.filter((factor) => factor.factorType === 'totp')

  let stored: { factorId: string; secret: string } | null
  try {
    stored = await deps.loadEmailFactor()
  } catch {
    return 'error'
  }

  const owned = stored && verifiedTotp.some((factor) => factor.id === stored.factorId) ? stored : null
  if (owned) {
    try {
      return (await verifyFactor(deps, owned.factorId, owned.secret)) ? 'ok' : 'error'
    } catch {
      return 'error'
    }
  }

  if (verified.length > 0) {
    const ours = verifiedTotp.filter((factor) => factor.friendlyName === PORTAL_EMAIL_FACTOR_NAME)
    if (ours.length > 0) return 'error'
    return 'needs_authenticator'
  }

  const stale = factors.filter((factor) => factor.factorType === 'totp' && factor.status !== 'verified')
  let enrolledId: string | null = null
  try {
    for (const factor of stale) await deps.unenroll(factor.id)
    const enrolled = await deps.enrollTotp(PORTAL_EMAIL_FACTOR_NAME)
    enrolledId = enrolled.factorId
    try {
      await deps.saveEmailFactor(enrolled.factorId, enrolled.secret)
    } catch {
      await deps.unenroll(enrolled.factorId).catch(() => undefined)
      return 'error'
    }
    const verifiedCode = await verifyFactor(deps, enrolled.factorId, enrolled.secret)
    if (!verifiedCode) {
      await deps.unenroll(enrolled.factorId).catch(() => undefined)
      await deps.clearEmailFactor().catch(() => undefined)
      return 'error'
    }
    return 'ok'
  } catch {
    if (enrolledId) {
      await deps.unenroll(enrolledId).catch(() => undefined)
      await deps.clearEmailFactor().catch(() => undefined)
    }
    return 'error'
  }
}

/**
 * Prove the emailed code, then step up. ok means the assurance read came back aal2.
 * The email proof is not itself treated as aal2.
 */
export async function finishEmailSecondFactor(args: {
  verifyEmail: () => Promise<EmailProof>
  readAal: () => Promise<'aal1' | 'aal2' | null>
  stepUp: StepUpDeps
}): Promise<FinishResult> {
  let proof: EmailProof
  try {
    proof = await args.verifyEmail()
  } catch {
    return 'error'
  }
  if (proof !== 'ok') return proof

  try {
    if ((await args.readAal()) === 'aal2') return 'ok'
  } catch {
    return 'error'
  }

  const stepped = await stepUpAfterEmailProof(args.stepUp)
  if (stepped !== 'ok') return stepped

  try {
    return (await args.readAal()) === 'aal2' ? 'ok' : 'error'
  } catch {
    return 'error'
  }
}
