import { describe, it, expect } from 'vitest'
import { toRuntimeState, totalSpent, type ProviderAccountRow } from '../accounts'
import { WINDOW, type QuotaEvent } from '../quota'

const NOW = '2026-06-21T10:00:00.000Z'

const claudeRow: ProviderAccountRow = {
  accountId: 'claude-1',
  provider: 'claude',
  label: 'Claude Max',
  vaultEntryId: 'vault-claude',
  enabled: true,
  plan: { kind: 'windowed', caps: [{ label: '5h', seconds: WINDOW.fiveHour, cap: 100 }, { label: 'weekly', seconds: WINDOW.weekly, cap: 1000 }] },
}

const minimaxRow: ProviderAccountRow = {
  accountId: 'minimax-1',
  provider: 'minimax',
  label: 'MiniMax',
  vaultEntryId: 'vault-mm',
  enabled: true,
  plan: { kind: 'prepaid', purchasedUnits: 1000 },
}

describe('totalSpent', () => {
  it('sums event units', () => {
    expect(totalSpent([{ at: NOW, units: 3 }, { at: NOW, units: 4 }])).toBe(7)
  })
})

describe('toRuntimeState — not configured', () => {
  it('is blocked when disabled', () => {
    const r = toRuntimeState({ ...claudeRow, enabled: false }, [], NOW)
    expect(r).toMatchObject({ configured: false, state: 'blocked' })
  })
  it('is blocked when no vault entry', () => {
    const r = toRuntimeState({ ...claudeRow, vaultEntryId: null }, [], NOW)
    expect(r.configured).toBe(false)
  })
})

describe('toRuntimeState — windowed (subscription)', () => {
  it('is available when usage is light', () => {
    const events: QuotaEvent[] = [{ at: '2026-06-21T09:00:00.000Z', units: 10 }]
    const r = toRuntimeState(claudeRow, events, NOW)
    expect(r).toMatchObject({ configured: true, state: 'available' })
    expect(r.coolingUntil).toBeNull()
  })

  it('blocks + sets coolingUntil when the 5h window is maxed', () => {
    // 100 at cap in last 5h; oldest in-window event at 08:00 → reset 13:00.
    const events: QuotaEvent[] = [{ at: '2026-06-21T08:00:00.000Z', units: 100 }]
    const r = toRuntimeState(claudeRow, events, NOW)
    expect(r.state).toBe('blocked')
    expect(r.coolingUntil).toBe('2026-06-21T13:00:00.000Z')
  })

  it('reflects the weekly cap dominating', () => {
    // 850 a day ago → 0 in 5h, 0.85 weekly → near_limit.
    const events: QuotaEvent[] = [{ at: '2026-06-20T10:00:00.000Z', units: 850 }]
    const r = toRuntimeState(claudeRow, events, NOW)
    expect(r.state).toBe('near_limit')
  })
})

describe('toRuntimeState — prepaid', () => {
  it('is available with budget left and not exhausted', () => {
    const r = toRuntimeState(minimaxRow, [{ at: NOW, units: 200 }], NOW)
    expect(r).toMatchObject({ configured: true, state: 'available', prepaidExhausted: false })
  })

  it('is blocked + exhausted when the balance is spent', () => {
    const r = toRuntimeState(minimaxRow, [{ at: NOW, units: 1000 }], NOW)
    expect(r.state).toBe('blocked')
    expect(r.prepaidExhausted).toBe(true)
  })

  it('honours an explicit spentUnits override', () => {
    const r = toRuntimeState(minimaxRow, [], NOW, 950)
    expect(r.state).toBe('blocked') // 0.95 pressure
    expect(r.prepaidExhausted).toBe(false)
  })

  it('carries allowMetered through', () => {
    const r = toRuntimeState({ ...minimaxRow, allowMetered: true }, [{ at: NOW, units: 1000 }], NOW)
    expect(r.allowMetered).toBe(true)
    expect(r.prepaidExhausted).toBe(true)
  })
})
