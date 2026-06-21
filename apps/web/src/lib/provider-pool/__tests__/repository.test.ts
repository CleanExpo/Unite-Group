import { describe, it, expect, vi } from 'vitest'
import { loadAccounts, logUsage, type ProviderPoolStore, type QuotaEventInput } from '../repository'
import { WINDOW } from '../quota'
import type { ProviderAccountRow } from '../accounts'

const NOW = '2026-06-21T10:00:00.000Z'

const claude: ProviderAccountRow = {
  accountId: 'claude-1', provider: 'claude', label: 'Claude', vaultEntryId: 'v1', enabled: true,
  plan: { kind: 'windowed', caps: [{ label: '5h', seconds: WINDOW.fiveHour, cap: 100 }] },
}
const minimax: ProviderAccountRow = {
  accountId: 'mm-1', provider: 'minimax', label: 'MiniMax', vaultEntryId: 'v2', enabled: true,
  plan: { kind: 'prepaid', purchasedUnits: 1000 },
}

function fakeStore(over: Partial<ProviderPoolStore> = {}): ProviderPoolStore {
  return {
    listAccounts: async () => [claude, minimax],
    listRecentEvents: async () => [{ accountId: 'claude-1', at: '2026-06-21T09:00:00.000Z', units: 90 }],
    lifetimeSpend: async () => ({ 'mm-1': 950 }),
    insertEvent: async () => {},
    ...over,
  }
}

describe('loadAccounts', () => {
  it('maps windowed account pressure from recent events', async () => {
    const states = await loadAccounts(fakeStore(), 'f1', NOW)
    const c = states.find((s) => s.accountId === 'claude-1')!
    expect(c.state).toBe('near_limit') // 90/100 = 0.9
  })

  it('maps prepaid account from lifetime spend (not the 8-day window)', async () => {
    const states = await loadAccounts(fakeStore(), 'f1', NOW)
    const m = states.find((s) => s.accountId === 'mm-1')!
    expect(m.state).toBe('blocked') // 950/1000 = 0.95
    expect(m.prepaidExhausted).toBe(false)
  })

  it('returns [] with no accounts (no event queries needed)', async () => {
    const events = vi.fn()
    const states = await loadAccounts(fakeStore({ listAccounts: async () => [], listRecentEvents: events as never }), 'f1', NOW)
    expect(states).toEqual([])
    expect(events).not.toHaveBeenCalled()
  })
})

describe('logUsage', () => {
  it('forwards the event to the store', async () => {
    const insert = vi.fn(async () => {})
    const ev: QuotaEventInput = { accountId: 'mm-1', inputTokens: 10, outputTokens: 20, lane: 'bulk_text', outcome: 'ok' }
    await logUsage(fakeStore({ insertEvent: insert }), 'f1', ev)
    expect(insert).toHaveBeenCalledWith('f1', ev)
  })
})
