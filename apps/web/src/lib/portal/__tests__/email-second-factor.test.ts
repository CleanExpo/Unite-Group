import { afterEach, describe, expect, it } from 'vitest'

import {
  packEmailFactor,
  unpackEmailFactor,
  withEmailFactorMetadata,
  withoutEmailFactorMetadata,
} from '../email-factor-record'
import { finishEmailSecondFactor, stepUpAfterEmailProof, type StepUpDeps } from '../email-second-factor'
import {
  classifyOtpError,
  EMAIL_CODE_FAILS_BEFORE_LOCK,
  EMAIL_FACTOR_META_KEY,
  emailFactorIdFrom,
  emailFactorVerified,
  initialSecondFactorMode,
  nextVerifyLock,
  parseFailCookie,
  PORTAL_EMAIL_FACTOR_NAME,
  resendAllowed,
  verifyLocked,
} from '../second-factor-mode'
import { totpCode } from '../totp'

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

afterEach(() => {
  delete process.env.VAULT_ENCRYPTION_KEY
})

describe('totp codes match the authenticator check Supabase runs', () => {
  it.each([
    [59_000, '287082'],
    [1_111_111_109_000, '081804'],
    [1_111_111_111_000, '050471'],
    [1_234_567_890_000, '005924'],
    [2_000_000_000_000, '279037'],
  ])('unix %s -> %s', (unixMs, code) => {
    expect(totpCode(SECRET, unixMs)).toBe(code)
  })
})

describe('second-factor decisions', () => {
  it('offers a choice when nothing is verified', () => {
    expect(initialSecondFactorMode([], null)).toBe('choose')
    expect(initialSecondFactorMode([{ id: 'app', status: 'unverified' }], null)).toBe('choose')
  })

  it('asks for the app when a verified authenticator is not the email factor', () => {
    expect(initialSecondFactorMode([{ id: 'app', status: 'verified' }], null)).toBe('verify')
    expect(initialSecondFactorMode([{ id: 'app', status: 'verified' }], 'mail')).toBe('verify')
  })

  it('asks for email when the only verified factor is the one we issued, matched by id', () => {
    expect(initialSecondFactorMode([{ id: 'mail', status: 'verified' }], 'mail')).toBe('email')
  })

  it('treats a verified factor as the owner\'s own app when its id is not our stored id', () => {
    // An owner's own app can carry our display name; the stored id decides.
    expect(initialSecondFactorMode([{ id: 'their-app', status: 'verified' }], null)).toBe('verify')
    expect(emailFactorVerified([{ id: 'their-app', status: 'verified' }], null)).toBe(false)
    expect(emailFactorVerified([{ id: 'mail', status: 'verified' }, { id: 'app', status: 'verified' }], 'mail')).toBe(true)
    expect(emailFactorVerified([{ id: 'mail', status: 'unverified' }], 'mail')).toBe(false)
  })

  it('reads the issued factor id from app_metadata only when it is well formed', () => {
    expect(emailFactorIdFrom({ [EMAIL_FACTOR_META_KEY]: { factor_id: 'mail', secret: {} } })).toBe('mail')
    expect(emailFactorIdFrom({ [EMAIL_FACTOR_META_KEY]: { factor_id: '' } })).toBeNull()
    expect(emailFactorIdFrom({ [EMAIL_FACTOR_META_KEY]: { factor_id: 7 } })).toBeNull()
    expect(emailFactorIdFrom({})).toBeNull()
    expect(emailFactorIdFrom(null)).toBeNull()
  })

  it('refuses a resend inside the window and allows it after', () => {
    expect(resendAllowed(1_000, 1_000 + 59_000).ok).toBe(false)
    expect(resendAllowed(1_000, 1_000 + 60_000)).toEqual({ ok: true })
    expect(resendAllowed(null, 1_000)).toEqual({ ok: true })
  })

  it('locks after five wrong codes and remembers the pause', () => {
    let state = { fails: 0, lockedUntil: null as number | null }
    for (let i = 0; i < EMAIL_CODE_FAILS_BEFORE_LOCK - 1; i += 1) {
      state = nextVerifyLock(state.fails, 10_000)
      expect(state.lockedUntil).toBeNull()
    }
    state = nextVerifyLock(state.fails, 10_000)
    expect(state.lockedUntil).toBe(10_000 + 15 * 60 * 1000)
    expect(verifyLocked(state.lockedUntil, state.lockedUntil - 1)).toBe(true)
    expect(verifyLocked(state.lockedUntil, state.lockedUntil)).toBe(false)
    expect(parseFailCookie(`${state.fails}:${state.lockedUntil}`)).toEqual(state)
  })

  it('classifies send and verify failures without echoing the provider message', () => {
    expect(classifyOtpError({ code: 'over_email_send_rate_limit' }, 'send')).toBe('rate_limited')
    expect(classifyOtpError({ status: 429 }, 'verify')).toBe('rate_limited')
    expect(classifyOtpError({ code: 'otp_expired' }, 'verify')).toBe('bad_code')
    expect(classifyOtpError({ status: 500 }, 'verify')).toBe('error')
    expect(classifyOtpError({ code: 'otp_disabled' }, 'verify')).toBe('error')
  })
})

describe('email factor record', () => {
  it('stores ciphertext only and keeps the other metadata keys', () => {
    process.env.VAULT_ENCRYPTION_KEY = 'test-vault-encryption-key-0123456789'
    const packed = packEmailFactor('factor-1', SECRET)
    expect(JSON.stringify(packed)).not.toContain(SECRET)
    expect(unpackEmailFactor(packed)).toEqual({ factorId: 'factor-1', secret: SECRET })
    const merged = withEmailFactorMetadata({ portal_tenant_slug: 'iaq' }, packed)
    expect(merged.portal_tenant_slug).toBe('iaq')
    expect(unpackEmailFactor(merged.portal_email_factor)).toEqual({ factorId: 'factor-1', secret: SECRET })
    expect(withoutEmailFactorMetadata(merged)).toEqual({ portal_tenant_slug: 'iaq' })
  })
})

function harness(over: Partial<StepUpDeps> = {}) {
  const calls = {
    unenroll: [] as string[],
    enroll: 0,
    save: [] as string[],
    clear: 0,
    codes: [] as string[],
  }
  const deps: StepUpDeps = {
    listFactors: async () => [],
    unenroll: async (id) => { calls.unenroll.push(id) },
    enrollTotp: async () => { calls.enroll += 1; return { factorId: 'new-factor', secret: SECRET } },
    loadEmailFactor: async () => null,
    saveEmailFactor: async (_id, secret) => { calls.save.push(secret) },
    clearEmailFactor: async () => { calls.clear += 1 },
    challengeAndVerify: async (_id, code) => { calls.codes.push(code); return code === totpCode(SECRET, 59_000) },
    now: () => 59_000,
    ...over,
  }
  return { deps, calls }
}

describe('step up after the emailed code', () => {
  it('enrolls, keeps the secret, and checks the current code when the owner has no app', async () => {
    const { deps, calls } = harness()
    expect(await stepUpAfterEmailProof(deps)).toBe('ok')
    expect(calls.enroll).toBe(1)
    expect(calls.save).toEqual([SECRET])
    expect(calls.codes).toEqual([totpCode(SECRET, 59_000)])
    expect(calls.clear).toBe(0)
  })

  it('does not enrol or remove an authenticator we did not issue', async () => {
    const { deps, calls } = harness({
      listFactors: async () => [{ id: 'app', factorType: 'totp', status: 'verified', friendlyName: 'Business portal' }],
    })
    expect(await stepUpAfterEmailProof(deps)).toBe('needs_authenticator')
    expect(calls.enroll).toBe(0)
    expect(calls.unenroll).toEqual([])
    expect(calls.codes).toEqual([])
  })

  it('does not treat an authenticator as ours because of its display name', async () => {
    const { deps, calls } = harness({
      listFactors: async () => [{ id: 'their-app', factorType: 'totp', status: 'verified', friendlyName: PORTAL_EMAIL_FACTOR_NAME }],
      loadEmailFactor: async () => null,
    })
    expect(await stepUpAfterEmailProof(deps)).toBe('needs_authenticator')
    expect(calls.enroll).toBe(0)
    expect(calls.unenroll).toEqual([])
    expect(calls.codes).toEqual([])
  })

  it('asks for the app when the stored email factor id does not match any verified factor', async () => {
    const { deps, calls } = harness({
      listFactors: async () => [{ id: 'their-app', factorType: 'totp', status: 'verified', friendlyName: PORTAL_EMAIL_FACTOR_NAME }],
      loadEmailFactor: async () => ({ factorId: 'old-mail', secret: SECRET }),
    })
    expect(await stepUpAfterEmailProof(deps)).toBe('needs_authenticator')
    expect(calls.codes).toEqual([])
    expect(calls.unenroll).toEqual([])
  })

  it('removes the new factor when the secret cannot be saved', async () => {
    const { deps, calls } = harness({
      saveEmailFactor: async () => { throw new Error('save failed') },
    })
    expect(await stepUpAfterEmailProof(deps)).toBe('error')
    expect(calls.unenroll).toEqual(['new-factor'])
    expect(calls.codes).toEqual([])
  })

  it('uses the stored secret for a later visit and does not enrol again', async () => {
    const { deps, calls } = harness({
      listFactors: async () => [{ id: 'new-factor', factorType: 'totp', status: 'verified', friendlyName: PORTAL_EMAIL_FACTOR_NAME }],
      loadEmailFactor: async () => ({ factorId: 'new-factor', secret: SECRET }),
    })
    expect(await stepUpAfterEmailProof(deps)).toBe('ok')
    expect(calls.enroll).toBe(0)
    expect(calls.codes).toEqual([totpCode(SECRET, 59_000)])
  })

  it('does not report success when the assurance read stays below aal2', async () => {
    const { deps, calls } = harness()
    const result = await finishEmailSecondFactor({
      verifyEmail: async () => 'ok',
      readAal: async () => 'aal1',
      stepUp: deps,
    })
    expect(result).toBe('error')
    expect(calls.enroll).toBe(1)
  })

  it('does not step up when the emailed code is refused', async () => {
    const { deps, calls } = harness()
    const result = await finishEmailSecondFactor({
      verifyEmail: async () => 'bad_code',
      readAal: async () => 'aal1',
      stepUp: deps,
    })
    expect(result).toBe('bad_code')
    expect(calls.enroll).toBe(0)
  })

  it('reports ok only after the assurance read says aal2', async () => {
    const { deps } = harness()
    const levels = ['aal1', 'aal2'] as const
    const result = await finishEmailSecondFactor({
      verifyEmail: async () => 'ok',
      readAal: async () => levels.shift() ?? 'aal1',
      stepUp: deps,
    })
    expect(result).toBe('ok')
  })
})
