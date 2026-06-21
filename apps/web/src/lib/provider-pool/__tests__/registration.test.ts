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
