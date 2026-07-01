import { describe, expect, it } from 'vitest'
import {
  isAal2,
  isMfaRequired,
  mfaGateDecision,
  mfaSatisfied,
  resolveMfaDecision,
} from '../mfa'

describe('mfa enforcement (B7 / L4)', () => {
  it('isMfaRequired is off by default and on for 1/true', () => {
    expect(isMfaRequired({} as NodeJS.ProcessEnv)).toBe(false)
    expect(isMfaRequired({ MFA_REQUIRED: '0' } as never)).toBe(false)
    expect(isMfaRequired({ MFA_REQUIRED: '1' } as never)).toBe(true)
    expect(isMfaRequired({ MFA_REQUIRED: 'true' } as never)).toBe(true)
  })

  it('isAal2 only true for aal2', () => {
    expect(isAal2('aal2')).toBe(true)
    expect(isAal2('aal1')).toBe(false)
    expect(isAal2(null)).toBe(false)
  })

  it('mfaGateDecision: not required -> not-required (proceeds)', () => {
    const d = mfaGateDecision({
      required: false,
      currentLevel: 'aal1',
      hasVerifiedTotpFactor: false,
    })
    expect(d).toBe('not-required')
    expect(mfaSatisfied(d)).toBe(true)
  })

  it('mfaGateDecision: required + aal2 -> satisfied', () => {
    const d = mfaGateDecision({
      required: true,
      currentLevel: 'aal2',
      hasVerifiedTotpFactor: true,
    })
    expect(d).toBe('satisfied')
    expect(mfaSatisfied(d)).toBe(true)
  })

  it('mfaGateDecision: required + factor but aal1 -> needs-verification', () => {
    const d = mfaGateDecision({
      required: true,
      currentLevel: 'aal1',
      hasVerifiedTotpFactor: true,
    })
    expect(d).toBe('needs-verification')
    expect(mfaSatisfied(d)).toBe(false)
  })

  it('mfaGateDecision: required + no factor -> needs-enrollment', () => {
    const d = mfaGateDecision({
      required: true,
      currentLevel: 'aal1',
      hasVerifiedTotpFactor: false,
    })
    expect(d).toBe('needs-enrollment')
    expect(mfaSatisfied(d)).toBe(false)
  })

  const fakeClient = (level: 'aal1' | 'aal2' | null, totp: Array<{ status: string }>) => ({
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: level } }),
        listFactors: async () => ({ data: { totp } }),
      },
    },
  })

  it('resolveMfaDecision short-circuits to not-required when off', async () => {
    const d = await resolveMfaDecision(fakeClient('aal1', []), {} as never)
    expect(d).toBe('not-required')
  })

  it('resolveMfaDecision: on + verified factor + aal1 -> needs-verification', async () => {
    const d = await resolveMfaDecision(
      fakeClient('aal1', [{ status: 'verified' }]),
      { MFA_REQUIRED: '1' } as never,
    )
    expect(d).toBe('needs-verification')
  })

  it('resolveMfaDecision: on + aal2 -> satisfied', async () => {
    const d = await resolveMfaDecision(
      fakeClient('aal2', [{ status: 'verified' }]),
      { MFA_REQUIRED: '1' } as never,
    )
    expect(d).toBe('satisfied')
  })

  it('resolveMfaDecision: on + only unverified factor -> needs-enrollment', async () => {
    const d = await resolveMfaDecision(
      fakeClient('aal1', [{ status: 'unverified' }]),
      { MFA_REQUIRED: '1' } as never,
    )
    expect(d).toBe('needs-enrollment')
  })
})
