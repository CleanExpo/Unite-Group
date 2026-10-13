import { describe, it, expect } from 'vitest'
import { buildProviderAccountInsert, isMissingColumnError, probeMeteringColumns } from '../metering-schema'
import { validateNewAccount, type ValidatedAccount } from '../registration'

function valid(input: Record<string, unknown>): ValidatedAccount {
  const r = validateNewAccount(input)
  if (!r.ok) throw new Error(r.error)
  return r.value
}

/** Minimal fake of supabase.from(t).select(c).limit(n) resolving to { error }. */
function fakeProbe(error: unknown) {
  const calls: string[] = []
  return {
    calls,
    client: {
      from: (table: string) => ({
        select: (cols: string) => {
          calls.push(`${table}:${cols}`)
          return { limit: async () => ({ data: [], error }) }
        },
      }),
    },
  }
}

describe('isMissingColumnError', () => {
  it('recognises Postgres 42703 and PostgREST schema-cache misses', () => {
    expect(isMissingColumnError({ code: '42703', message: 'column provider_accounts.routable does not exist' })).toBe(true)
    expect(isMissingColumnError({ code: 'PGRST204', message: "Could not find the 'billing_kind' column of 'provider_accounts' in the schema cache" })).toBe(true)
  })
  it('does not swallow other failures', () => {
    expect(isMissingColumnError({ code: '42501', message: 'permission denied for table provider_accounts' })).toBe(false)
    expect(isMissingColumnError(null)).toBe(false)
  })
})

describe('probeMeteringColumns', () => {
  it('reports present when the metering columns can be selected', async () => {
    const f = fakeProbe(null)
    await expect(probeMeteringColumns(f.client)).resolves.toBe('present')
    expect(f.calls[0]).toMatch(/^provider_accounts:.*billing_kind.*routable/)
  })
  it('reports absent on an undefined-column error (migration not applied)', async () => {
    await expect(probeMeteringColumns(fakeProbe({ code: '42703', message: 'column provider_accounts.billing_kind does not exist' }).client)).resolves.toBe('absent')
  })
  it('throws on any other probe failure (fail closed, never guess)', async () => {
    await expect(probeMeteringColumns(fakeProbe({ code: '42501', message: 'permission denied' }).client)).rejects.toThrow(/permission denied/)
  })
})

describe('buildProviderAccountInsert — works with and without the migration', () => {
  const F = 'founder-1'

  it('columns present: writes the full metering column set, routable persisted explicitly', () => {
    const r = buildProviderAccountInsert(F, valid({ provider: 'claude_max', label: 'Seat A', planPriceAud: 320 }), 'present')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.row).toMatchObject({ founder_id: F, provider: 'claude_max', billing_kind: 'subscription', routable: false, plan_price_aud: 320 })
  })

  it('columns absent: a legacy metered registration is written with the legacy column set only', () => {
    const r = buildProviderAccountInsert(F, valid({ provider: 'minimax', label: 'MiniMax' }), 'absent')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(Object.keys(r.row).sort()).toEqual(['allow_metered', 'enabled', 'founder_id', 'label', 'plan', 'provider', 'vault_entry_id'])
    }
  })

  it('columns absent: refuses subscriptions and metering-only accounts with a clear migration error', () => {
    for (const input of [
      { provider: 'claude_max', label: 'Seat A' },
      { provider: 'cursor', label: 'Cursor', billingKind: 'subscription' },
      { provider: 'openai', label: 'o', routable: false },
    ]) {
      const r = buildProviderAccountInsert(F, valid(input), 'absent')
      expect(r.ok, JSON.stringify(input)).toBe(false)
      if (!r.ok) expect(r.error).toMatch(/migration .*not yet applied/i)
    }
  })

  it('columns absent: refuses a widened provider or billing metadata rather than silently dropping it', () => {
    expect(buildProviderAccountInsert(F, valid({ provider: 'xai', label: 'Grok' }), 'absent').ok).toBe(false)
    expect(buildProviderAccountInsert(F, valid({ provider: 'minimax', label: 'm', planPriceAud: 10 }), 'absent').ok).toBe(false)
    expect(buildProviderAccountInsert(F, valid({ provider: 'minimax', label: 'm', billingKind: 'prepaid' }), 'absent').ok).toBe(false)
  })
})
