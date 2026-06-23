import { describe, it, expect, vi } from 'vitest'
import { loadAccounts, logUsage, makeSupabaseStore, type ProviderPoolStore, type QuotaEventInput } from '../repository'
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
    setAccountEnabled: async () => {},
    removeAccount: async () => {},
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

// ── makeSupabaseStore lifecycle: setAccountEnabled + removeAccount ────────────
// A chained-builder fake captures the calls each method makes so we can assert
// the founder-scoped UPDATE / DELETE shape without a real Supabase client.

describe('makeSupabaseStore.setAccountEnabled', () => {
  it('UPDATEs enabled, scoped to id AND founder_id', async () => {
    const calls: Record<string, unknown> = {}
    const eqFounder = vi.fn(async () => ({ error: null }))
    const eqId = vi.fn(() => ({ eq: eqFounder }))
    const update = vi.fn(() => ({ eq: eqId }))
    const supabase = { from: vi.fn((t: string) => { calls.table = t; return { update } }) }

    const store = makeSupabaseStore(supabase as never)
    await store.setAccountEnabled('f1', 'acc-1', false)

    expect(calls.table).toBe('provider_accounts')
    expect(update).toHaveBeenCalledWith({ enabled: false })
    expect(eqId).toHaveBeenCalledWith('id', 'acc-1')
    expect(eqFounder).toHaveBeenCalledWith('founder_id', 'f1')
  })

  it('throws on a Supabase error', async () => {
    const eqFounder = vi.fn(async () => ({ error: { message: 'nope' } }))
    const supabase = { from: () => ({ update: () => ({ eq: () => ({ eq: eqFounder }) }) }) }
    const store = makeSupabaseStore(supabase as never)
    await expect(store.setAccountEnabled('f1', 'acc-1', true)).rejects.toThrow(/setAccountEnabled.*nope/)
  })
})

describe('makeSupabaseStore.removeAccount', () => {
  it('DELETEs scoped to id AND founder_id', async () => {
    const calls: Record<string, unknown> = {}
    const eqFounder = vi.fn(async () => ({ error: null }))
    const eqId = vi.fn(() => ({ eq: eqFounder }))
    const del = vi.fn(() => ({ eq: eqId }))
    const supabase = { from: vi.fn((t: string) => { calls.table = t; return { delete: del } }) }

    const store = makeSupabaseStore(supabase as never)
    await store.removeAccount('f1', 'acc-1')

    expect(calls.table).toBe('provider_accounts')
    expect(del).toHaveBeenCalled()
    expect(eqId).toHaveBeenCalledWith('id', 'acc-1')
    expect(eqFounder).toHaveBeenCalledWith('founder_id', 'f1')
  })

  it('throws on a Supabase error', async () => {
    const eqFounder = vi.fn(async () => ({ error: { message: 'boom' } }))
    const supabase = { from: () => ({ delete: () => ({ eq: () => ({ eq: eqFounder }) }) }) }
    const store = makeSupabaseStore(supabase as never)
    await expect(store.removeAccount('f1', 'acc-1')).rejects.toThrow(/removeAccount.*boom/)
  })
})
