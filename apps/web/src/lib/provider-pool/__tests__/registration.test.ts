import { describe, it, expect } from 'vitest'
import { defaultPlanFor, validateNewAccount } from '../registration'

describe('defaultPlanFor', () => {
  it('gives subscriptions a windowed plan (5h + weekly)', () => {
    const p = defaultPlanFor('claude')
    expect(p.kind).toBe('windowed')
    if (p.kind === 'windowed') expect(p.caps.map((c) => c.label)).toEqual(['5-hour', 'weekly'])
  })
  it('gives prepaid providers a prepaid balance', () => {
    expect(defaultPlanFor('minimax').kind).toBe('prepaid')
    expect(defaultPlanFor('openrouter').kind).toBe('prepaid')
  })
})

describe('validateNewAccount', () => {
  const base = { provider: 'minimax', label: 'MiniMax prepaid', vaultEntryId: 'vault-1' }

  it('accepts a valid request and applies the default plan', () => {
    const r = validateNewAccount(base)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.provider).toBe('minimax')
      expect(r.value.plan.kind).toBe('prepaid')
      expect(r.value.allowMetered).toBe(false)
    }
  })

  it('rejects an unknown provider', () => {
    expect(validateNewAccount({ ...base, provider: 'grok' }).ok).toBe(false)
  })

  it('requires a label', () => {
    expect(validateNewAccount({ ...base, label: '' }).ok).toBe(false)
  })

  it('allows an env-backed account (no vault entry → key from env var)', () => {
    const r = validateNewAccount({ provider: 'minimax', label: 'MiniMax (env)' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.vaultEntryId).toBeNull()
    // empty string also means env-backed
    const r2 = validateNewAccount({ ...base, vaultEntryId: '' })
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.value.vaultEntryId).toBeNull()
  })

  it('accepts a valid plan override', () => {
    const r = validateNewAccount({ ...base, plan: { kind: 'prepaid', purchasedUnits: 500000 } })
    expect(r.ok).toBe(true)
    if (r.ok && r.value.plan.kind === 'prepaid') expect(r.value.plan.purchasedUnits).toBe(500000)
  })

  it('rejects a malformed plan', () => {
    expect(validateNewAccount({ ...base, plan: { kind: 'weird' } }).ok).toBe(false)
    expect(validateNewAccount({ ...base, plan: { kind: 'prepaid' } }).ok).toBe(false)
  })

  it('rejects a non-object body', () => {
    expect(validateNewAccount(null).ok).toBe(false)
    expect(validateNewAccount('x').ok).toBe(false)
  })
})

describe('validateNewAccount — subscription metering (UNI-2780)', () => {
  it('accepts every widened provider id', () => {
    for (const provider of ['claude_max', 'chatgpt_pro', 'cursor', 'xai', 'higgsfield', 'heygen', 'artlist', 'other']) {
      const r = validateNewAccount({ provider, label: `${provider} seat` })
      expect(r.ok, provider).toBe(true)
    }
  })

  it('forces routable=false for a subscription account', () => {
    const r = validateNewAccount({ provider: 'cursor', label: 'Cursor $200', billingKind: 'subscription', planPriceAud: 200 })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.billingKind).toBe('subscription')
      expect(r.value.routable).toBe(false)
      expect(r.value.planPriceAud).toBe(200)
    }
  })

  it('rejects subscription + routable=true', () => {
    const r = validateNewAccount({ provider: 'cursor', label: 'Cursor', billingKind: 'subscription', routable: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/routable/)
  })

  it('defaults Claude Max and ChatGPT Pro to a non-routable subscription and refuses any other billing kind', () => {
    for (const provider of ['claude_max', 'chatgpt_pro']) {
      const r = validateNewAccount({ provider, label: 'seat' })
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.billingKind).toBe('subscription')
        expect(r.value.routable).toBe(false)
      }
      expect(validateNewAccount({ provider, label: 'seat', billingKind: 'metered' }).ok).toBe(false)
      expect(validateNewAccount({ provider, label: 'seat', billingKind: 'metered', routable: true }).ok).toBe(false)
    }
  })

  it('keeps two Claude Max seats as distinct, non-routable registrations', () => {
    const a = validateNewAccount({ provider: 'claude_max', label: 'Claude Max — seat A' })
    const b = validateNewAccount({ provider: 'claude_max', label: 'Claude Max — seat B' })
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) {
      expect(a.value.label).not.toBe(b.value.label)
      expect([a.value.routable, b.value.routable]).toEqual([false, false])
    }
  })

  it('rejects a negative or non-numeric plan price', () => {
    for (const planPriceAud of [-1, '60', Number.POSITIVE_INFINITY]) {
      const r = validateNewAccount({ provider: 'cursor', label: 'c', planPriceAud })
      expect(r.ok).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/planPriceAud/)
    }
  })

  it('validates billingKind, renewalDate, quotaUnit and quotaLimit', () => {
    expect(validateNewAccount({ provider: 'xai', label: 'x', billingKind: 'free' }).ok).toBe(false)
    expect(validateNewAccount({ provider: 'xai', label: 'x', renewalDate: '13/10/2026' }).ok).toBe(false)
    expect(validateNewAccount({ provider: 'xai', label: 'x', renewalDate: '2026-02-30' }).ok).toBe(false)
    expect(validateNewAccount({ provider: 'xai', label: 'x', quotaUnit: 'bananas' }).ok).toBe(false)
    expect(validateNewAccount({ provider: 'xai', label: 'x', quotaLimit: -3 }).ok).toBe(false)
    const ok = validateNewAccount({ provider: 'heygen', label: 'HeyGen', billingKind: 'subscription', renewalDate: '2026-11-01', quotaUnit: 'credits', quotaLimit: 600 })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.value).toMatchObject({ renewalDate: '2026-11-01', quotaUnit: 'credits', quotaLimit: 600, routable: false })
  })

  it('leaves existing metered registrations routable with billingKind metered', () => {
    const r = validateNewAccount({ provider: 'minimax', label: 'MiniMax' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toMatchObject({ billingKind: 'metered', routable: true, planPriceAud: null })
  })
})
