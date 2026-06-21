// src/lib/provider-pool/repository.ts
//
// DB ↔ router bridge for the multi-provider pool. Reads provider_accounts +
// recent provider_quota_events and turns them into the AccountRuntimeState[]
// that decideRoute() consumes; and appends usage events after a call.
//
// The DB is reached through a small `ProviderPoolStore` seam so the mapping
// (group events per account, windowed vs prepaid spend) is unit-tested with a
// fake — `makeSupabaseStore` is the thin concrete wiring. Founder-scoped: every
// query takes founderId (RLS enforces it too).

import type { AccountRuntimeState } from './router'
import { toRuntimeState, type ProviderAccountRow } from './accounts'
import type { QuotaEvent } from './quota'
import { hasEnvKey } from './credentials'

/** A usage event to record after a provider call. */
export interface QuotaEventInput {
  accountId: string
  model?: string | null
  inputTokens?: number
  outputTokens?: number
  runUnit?: number
  lane?: string | null
  outcome?: 'ok' | 'rate_limited' | 'error'
  resetAt?: string | null
}

/** The persistence seam (DI). Concrete impl = makeSupabaseStore. */
export interface ProviderPoolStore {
  listAccounts(founderId: string): Promise<ProviderAccountRow[]>
  /** Events at-or-after `sinceIso`, with their accountId, for windowed pressure. */
  listRecentEvents(founderId: string, sinceIso: string): Promise<Array<{ accountId: string } & QuotaEvent>>
  /** Lifetime units spent per account (for prepaid drawdown). */
  lifetimeSpend(founderId: string): Promise<Record<string, number>>
  insertEvent(founderId: string, event: QuotaEventInput): Promise<void>
}

/** Lookback covering the weekly window (with a day's slack). */
const LOOKBACK_DAYS = 8

/** units for one event: tokens if present, else the run_unit. */
function eventUnits(inputTokens: number, outputTokens: number, runUnit: number): number {
  const tokens = inputTokens + outputTokens
  return tokens > 0 ? tokens : runUnit
}

/** Read every account + its usage → the runtime states the router consumes. */
export async function loadAccounts(
  store: ProviderPoolStore,
  founderId: string,
  now: string,
  /** Env for resolving env-backed account keys (presence only). Defaults to process.env. */
  env: Record<string, string | undefined> = process.env,
): Promise<AccountRuntimeState[]> {
  const accounts = await store.listAccounts(founderId)
  if (accounts.length === 0) return []

  const since = new Date(new Date(now).getTime() - LOOKBACK_DAYS * 86400000).toISOString()
  const [events, spend] = await Promise.all([store.listRecentEvents(founderId, since), store.lifetimeSpend(founderId)])

  const byAccount = new Map<string, QuotaEvent[]>()
  for (const e of events) {
    const list = byAccount.get(e.accountId) ?? []
    list.push({ at: e.at, units: e.units })
    byAccount.set(e.accountId, list)
  }

  // Env-backed accounts (no vault entry) are "present" when their provider key is in env.
  const present = (a: ProviderAccountRow): boolean => a.vaultEntryId !== null || hasEnvKey(a.provider, env)

  return accounts.map((a) =>
    a.plan.kind === 'prepaid'
      ? toRuntimeState(a, [], now, spend[a.accountId] ?? 0, present(a))
      : toRuntimeState(a, byAccount.get(a.accountId) ?? [], now, undefined, present(a)),
  )
}

/** Record a usage event (founder-scoped). */
export async function logUsage(store: ProviderPoolStore, founderId: string, event: QuotaEventInput): Promise<void> {
  await store.insertEvent(founderId, event)
}

// ── Concrete Supabase store ──────────────────────────────────────────────────

/**
 * Build a store over a Supabase client. Kept deliberately thin — the testable
 * logic is in loadAccounts; this only shapes rows. Reads are founder-scoped.
 */
export function makeSupabaseStore(supabase: {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}): ProviderPoolStore {
  return {
    async listAccounts(founderId) {
      const { data, error } = await supabase.from('provider_accounts').select('*').eq('founder_id', founderId)
      if (error) throw new Error(`listAccounts: ${String((error as { message?: string }).message ?? error)}`)
      return (data ?? []).map((r: Record<string, unknown>) => ({
        accountId: String(r.id),
        provider: r.provider as ProviderAccountRow['provider'],
        label: String(r.label ?? ''),
        vaultEntryId: r.vault_entry_id ? String(r.vault_entry_id) : null,
        enabled: Boolean(r.enabled),
        plan: r.plan as ProviderAccountRow['plan'],
        allowMetered: Boolean(r.allow_metered),
      }))
    },
    async listRecentEvents(founderId, sinceIso) {
      const { data, error } = await supabase
        .from('provider_quota_events')
        .select('account_id, at, input_tokens, output_tokens, run_unit')
        .eq('founder_id', founderId)
        .gte('at', sinceIso)
      if (error) throw new Error(`listRecentEvents: ${String((error as { message?: string }).message ?? error)}`)
      return (data ?? []).map((r: Record<string, unknown>) => ({
        accountId: String(r.account_id),
        at: String(r.at),
        units: eventUnits(Number(r.input_tokens ?? 0), Number(r.output_tokens ?? 0), Number(r.run_unit ?? 0)),
      }))
    },
    async lifetimeSpend(founderId) {
      const { data, error } = await supabase
        .from('provider_quota_events')
        .select('account_id, input_tokens, output_tokens, run_unit')
        .eq('founder_id', founderId)
      if (error) throw new Error(`lifetimeSpend: ${String((error as { message?: string }).message ?? error)}`)
      const totals: Record<string, number> = {}
      for (const r of (data ?? []) as Record<string, unknown>[]) {
        const id = String(r.account_id)
        totals[id] = (totals[id] ?? 0) + eventUnits(Number(r.input_tokens ?? 0), Number(r.output_tokens ?? 0), Number(r.run_unit ?? 0))
      }
      return totals
    },
    async insertEvent(founderId, event) {
      const { error } = await supabase.from('provider_quota_events').insert({
        founder_id: founderId,
        account_id: event.accountId,
        model: event.model ?? null,
        input_tokens: event.inputTokens ?? 0,
        output_tokens: event.outputTokens ?? 0,
        run_unit: event.runUnit ?? 0,
        lane: event.lane ?? null,
        outcome: event.outcome ?? 'ok',
        reset_at: event.resetAt ?? null,
      })
      if (error) throw new Error(`insertEvent: ${String((error as { message?: string }).message ?? error)}`)
    },
  }
}
