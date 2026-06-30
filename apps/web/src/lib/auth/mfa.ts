// B7 — TOTP MFA enforcement (Board mandate P4 / L4 distribution).
//
// The TOTP primitives (enroll/challenge/verify/AAL2) already exist via Supabase
// auth.mfa (see components/founder/xero/MFAGate.tsx). This is the *general*
// enforcement layer any sensitive surface — especially the button-only L4
// distribution opened to non-founder identities — can require before acting.
//
// Staged rollout: enforcement is OFF until MFA_REQUIRED=1 so enabling it is a
// deliberate founder switch (no accidental lockout), matching the fail-safe
// posture of private-access.ts.

export type AalLevel = 'aal1' | 'aal2' | null

export type MfaDecision =
  | 'not-required' // enforcement off (staged) — proceed
  | 'satisfied' // session already at AAL2 — proceed
  | 'needs-verification' // has a TOTP factor, must enter a code this session
  | 'needs-enrollment' // no TOTP factor yet — must enrol first

/** Whether MFA enforcement is switched on (staged; default off). */
export function isMfaRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.MFA_REQUIRED === '1' || env.MFA_REQUIRED === 'true'
}

/** Pure: is the session at the highest assurance level. */
export function isAal2(currentLevel: AalLevel): boolean {
  return currentLevel === 'aal2'
}

/**
 * Pure decision used by both server guards and the client gate. Kept free of the
 * Supabase client so it is fully unit-testable.
 */
export function mfaGateDecision(input: {
  required: boolean
  currentLevel: AalLevel
  hasVerifiedTotpFactor: boolean
}): MfaDecision {
  if (!input.required) return 'not-required'
  if (isAal2(input.currentLevel)) return 'satisfied'
  return input.hasVerifiedTotpFactor ? 'needs-verification' : 'needs-enrollment'
}

/** True only when the caller may proceed past the MFA gate. */
export function mfaSatisfied(decision: MfaDecision): boolean {
  return decision === 'not-required' || decision === 'satisfied'
}

type MfaCapableClient = {
  auth: {
    mfa: {
      getAuthenticatorAssuranceLevel: () => Promise<{
        data: { currentLevel: AalLevel } | null
      }>
      listFactors: () => Promise<{
        data: { totp?: Array<{ status: string }> } | null
      }>
    }
  }
}

/**
 * Resolve the MFA decision for the current session. Wraps the Supabase client;
 * the logic lives in mfaGateDecision so it can be tested without a live client.
 */
export async function resolveMfaDecision(
  supabase: MfaCapableClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MfaDecision> {
  const required = isMfaRequired(env)
  if (!required) return 'not-required'
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const hasVerifiedTotpFactor = Boolean(
    factors?.totp?.some((f) => f.status === 'verified'),
  )
  return mfaGateDecision({
    required,
    currentLevel: aal?.currentLevel ?? null,
    hasVerifiedTotpFactor,
  })
}
