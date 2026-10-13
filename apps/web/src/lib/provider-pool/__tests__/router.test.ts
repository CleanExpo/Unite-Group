import { describe, it, expect } from 'vitest'
import { decideRoute, PROVIDER_PREFERENCE, type AccountRuntimeState } from '../router'
import type { ProviderId } from '../../command-centre/provider-usage'
import { makeSupabaseStore, loadAccounts } from '../repository'

const NOW = '2026-06-21T00:00:00.000Z'

function acct(provider: ProviderId, over: Partial<AccountRuntimeState> = {}): AccountRuntimeState {
  return { provider, accountId: `${provider}-1`, configured: true, state: 'available', ...over }
}

/** A full pool with every provider available unless overridden. */
function pool(over: Partial<Record<ProviderId, Partial<AccountRuntimeState>>> = {}): AccountRuntimeState[] {
  const ids: ProviderId[] = ['claude', 'openai', 'minimax', 'gemini', 'openrouter']
  return ids.map((id) => acct(id, over[id] ?? {}))
}

describe('decideRoute — primary selection', () => {
  it('routes deep_reasoning to claude (primary)', () => {
    const r = decideRoute({ kind: 'deep_reasoning', accounts: pool(), now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'claude', fallbackUsed: false })
  })

  it('routes media lanes to minimax only', () => {
    for (const kind of ['video', 'voice', 'music'] as const) {
      const r = decideRoute({ kind, accounts: pool(), now: NOW })
      expect(r).toMatchObject({ action: 'route', provider: 'minimax' })
    }
  })

  it('routes bulk_text to prepaid minimax first (spend-safe)', () => {
    const r = decideRoute({ kind: 'bulk_text', accounts: pool(), now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'minimax', fallbackUsed: false })
  })

  it('routes scout to minimax then openrouter', () => {
    expect(PROVIDER_PREFERENCE.scout[0]).toBe('minimax')
    const r = decideRoute({ kind: 'scout', accounts: pool({ minimax: { state: 'blocked' } }), now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'openrouter', fallbackUsed: true })
  })
})

describe('decideRoute — fallback', () => {
  it('falls back claude → openai when claude is near_limit', () => {
    const r = decideRoute({ kind: 'coding', accounts: pool({ claude: { state: 'near_limit' } }), now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'openai', fallbackUsed: true })
  })

  it('skips a cooling account', () => {
    const future = '2026-06-21T05:00:00.000Z'
    const r = decideRoute({ kind: 'coding', accounts: pool({ claude: { coolingUntil: future } }), now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'openai' })
  })

  it('treats a past coolingUntil as no longer cooling', () => {
    const past = '2026-06-20T23:00:00.000Z'
    const r = decideRoute({ kind: 'coding', accounts: pool({ claude: { coolingUntil: past } }), now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'claude' })
  })

  it('honours a preference override', () => {
    const r = decideRoute({ kind: 'coding', accounts: pool(), now: NOW, preferenceOverride: ['minimax', 'claude'] })
    expect(r).toMatchObject({ action: 'route', provider: 'minimax' })
  })
})

describe('decideRoute — spend guardrail (queue, never overspend)', () => {
  it('skips a prepaid-exhausted account unless metered allowed', () => {
    const r = decideRoute({ kind: 'bulk_text', accounts: pool({ minimax: { prepaidExhausted: true } }), now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'gemini' }) // not minimax
  })

  it('uses an exhausted prepaid account only when allowMetered is set', () => {
    const r = decideRoute({
      kind: 'bulk_text',
      accounts: pool({ minimax: { prepaidExhausted: true, allowMetered: true } }),
      now: NOW,
    })
    expect(r).toMatchObject({ action: 'route', provider: 'minimax' })
  })

  it('queues (does not overspend) when every candidate is unavailable', () => {
    const r = decideRoute({
      kind: 'video', // minimax-only lane
      accounts: pool({ minimax: { state: 'blocked' } }),
      now: NOW,
    })
    expect(r.action).toBe('queue')
    if (r.action === 'queue') {
      expect(r.skipped).toEqual([{ provider: 'minimax', why: 'blocked' }])
      expect(r.reason).toContain('metered')
    }
  })

  it('queues with skip reasons when the whole chain is down', () => {
    const r = decideRoute({
      kind: 'coding',
      accounts: pool({
        claude: { state: 'near_limit' },
        openai: { state: 'blocked' },
        minimax: { prepaidExhausted: true },
        openrouter: { configured: false },
      }),
      now: NOW,
    })
    expect(r.action).toBe('queue')
    if (r.action === 'queue') {
      const whys = Object.fromEntries(r.skipped.map((s) => [s.provider, s.why]))
      expect(whys.claude).toBe('near limit')
      expect(whys.openai).toBe('blocked')
      expect(whys.minimax).toContain('prepaid')
      expect(whys.openrouter).toBe('not configured')
    }
  })
})

describe('decideRoute — routable=false accounts are never selected (UNI-2780)', () => {
  it('skips a non-routable account and takes the next account of the same provider', () => {
    const accounts = [
      acct('claude', { accountId: 'claude-max-a', routable: false }),
      acct('claude', { accountId: 'claude-api' }),
      ...pool().filter((a) => a.provider !== 'claude'),
    ]
    const r = decideRoute({ kind: 'coding', accounts, now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'claude', accountId: 'claude-api' })
  })

  it('falls back to the next provider when the only account of a provider is non-routable', () => {
    const r = decideRoute({ kind: 'coding', accounts: pool({ claude: { routable: false } }), now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'openai', fallbackUsed: true })
  })

  it('never returns a routable=false account for any lane, even via override — queues instead', () => {
    const accounts = pool({
      claude: { routable: false },
      openai: { routable: false },
      minimax: { routable: false },
      gemini: { routable: false },
      openrouter: { routable: false },
    })
    for (const kind of Object.keys(PROVIDER_PREFERENCE) as Array<keyof typeof PROVIDER_PREFERENCE>) {
      const r = decideRoute({ kind, accounts, now: NOW })
      expect(r.action).toBe('queue')
    }
    const o = decideRoute({ kind: 'coding', accounts, now: NOW, preferenceOverride: ['claude', 'openai'] })
    expect(o.action).toBe('queue')
  })

  it('treats an absent routable flag as routable (existing rows unchanged)', () => {
    const r = decideRoute({ kind: 'coding', accounts: pool(), now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'claude' })
  })
})

describe('routable=false survives the DB → router path (UNI-2780)', () => {
  function fakeSupabase(rows: Array<Record<string, unknown>>) {
    const q = (data: unknown) => {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.gte = () => chain
      chain.then = (res: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(res)
      return chain
    }
    return { from: (table: string) => q(table === 'provider_accounts' ? rows : []) }
  }
  const base = { vault_entry_id: 'vault-1', enabled: true, allow_metered: false, label: '' }
  const windowed = { kind: 'windowed', caps: [{ label: '5-hour', seconds: 18000, cap: 200 }] }

  it('a provider_accounts row with routable=false is never routed', async () => {
    const store = makeSupabaseStore(fakeSupabase([
      { ...base, id: 'seat-a', provider: 'claude', plan: windowed, routable: false },
      { ...base, id: 'openai-1', provider: 'openai', plan: windowed, routable: true },
    ]))
    const accounts = await loadAccounts(store, 'founder-1', NOW, {})
    expect(accounts.find((a) => a.accountId === 'seat-a')?.routable).toBe(false)
    const r = decideRoute({ kind: 'coding', accounts, now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'openai', accountId: 'openai-1' })
  })

  it('a pre-migration row (no routable column) stays routable', async () => {
    const store = makeSupabaseStore(fakeSupabase([{ ...base, id: 'claude-1', provider: 'claude', plan: windowed }]))
    const accounts = await loadAccounts(store, 'founder-1', NOW, {})
    const r = decideRoute({ kind: 'coding', accounts, now: NOW })
    expect(r).toMatchObject({ action: 'route', provider: 'claude', accountId: 'claude-1' })
  })
})
