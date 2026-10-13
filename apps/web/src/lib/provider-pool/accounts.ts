// src/lib/provider-pool/accounts.ts
//
// Multi-provider account model — PURE (no I/O, no secrets).
// Spec: apps/spec-board/projects/multi-provider-llm-routing/spec.md
//
// Bridges quota.ts (pressure math) and router.ts (decideRoute): given a stored
// account's config + its recorded usage events, produce the AccountRuntimeState
// the router consumes — reusing the cockpit's pressure→state thresholds so the
// router and the founder-facing cockpit always agree.
//
// This module also DEFINES the persisted shape (ProviderAccountRow / PlanShape),
// which is the contract the Phase-1b migration implements. No secrets here — the
// credential itself lives in the vault, referenced by `vaultEntryId`.

import { deriveProviderState } from '../command-centre/provider-usage'
import { windowedPressure, prepaidPressure, nextResetAt, type QuotaEvent, type WindowCap } from './quota'
import type { AccountRuntimeState } from './router'

/**
 * Every provider id a provider_accounts row may carry (UNI-2780). The first five
 * are the routable API providers the cockpit knows (ProviderId); the rest are
 * subscriptions/tools that are METERED but never routed — e.g. two Claude Max
 * seats held by one person must each be tracked, and must never be rotated
 * between (that would breach the subscription terms). Mirrors the DB CHECK in
 * supabase/migrations/20261013090000_ai_subscription_metering.sql.
 */
export const POOL_PROVIDERS = [
  'claude', 'openai', 'minimax', 'gemini', 'openrouter',
  'claude_max', 'chatgpt_pro', 'cursor', 'xai', 'higgsfield', 'heygen', 'artlist', 'other',
] as const
export type PoolProviderId = (typeof POOL_PROVIDERS)[number]

/** How an account is billed. A 'subscription' is never routable (DB CHECK). */
export const BILLING_KINDS = ['metered', 'subscription', 'prepaid'] as const
export type BillingKind = (typeof BILLING_KINDS)[number]

/** Unit a plan's quota_limit is expressed in. FLAGGED for founder confirmation. */
export const QUOTA_UNITS = ['tokens', 'requests', 'messages', 'credits', 'minutes', 'generations', 'usd'] as const
export type QuotaUnit = (typeof QUOTA_UNITS)[number]

/** How a plan is metered. */
export type PlanShape =
  | { kind: 'windowed'; caps: WindowCap[] } // subscriptions (Claude/OpenAI): 5h + weekly
  | { kind: 'prepaid'; purchasedUnits: number } // MiniMax / OpenRouter credits

/** The persisted account (DB row shape). The secret is in the vault, not here. */
export interface ProviderAccountRow {
  accountId: string
  provider: PoolProviderId
  label: string
  /** Vault entry holding the token/key. Presence ⇒ configured. */
  vaultEntryId: string | null
  enabled: boolean
  plan: PlanShape
  /** Opt-in to metered billing once the paid envelope is gone. Default false. */
  allowMetered?: boolean
  /** False = metered only, never selected by the router. Absent = routable. */
  routable?: boolean
}

/** Carry an explicit routable=false through to the router; absent stays absent. */
function routableOf(row: ProviderAccountRow): { routable?: false } {
  return row.routable === false ? { routable: false } : {}
}

/** Lifetime sum of usage units (for prepaid drawdown). */
export function totalSpent(events: QuotaEvent[]): number {
  return events.reduce((sum, e) => sum + e.units, 0)
}

/**
 * Compute the live router state for one account from its config + usage events.
 * Pure + deterministic. `spentUnits` overrides the events-derived spend for
 * prepaid plans (e.g. when the true balance is read from the provider).
 */
export function toRuntimeState(
  row: ProviderAccountRow,
  events: QuotaEvent[],
  now: string,
  spentUnits?: number,
  /** True when the key is present in env (for env-backed accounts with no vault entry). */
  credentialPresent?: boolean,
): AccountRuntimeState {
  const configured = row.enabled && (row.vaultEntryId !== null || credentialPresent === true)

  if (!configured) {
    return { provider: row.provider, accountId: row.accountId, configured: false, state: 'blocked', ...routableOf(row) }
  }

  if (row.plan.kind === 'prepaid') {
    const spent = spentUnits ?? totalSpent(events)
    const pressure = prepaidPressure(spent, row.plan.purchasedUnits)
    const { state } = deriveProviderState({ configured: true, usagePressure: pressure })
    return {
      provider: row.provider,
      accountId: row.accountId,
      configured: true,
      state,
      prepaidExhausted: pressure >= 1,
      allowMetered: row.allowMetered ?? false,
      ...routableOf(row),
    }
  }

  // windowed (subscription)
  const pressure = windowedPressure(events, row.plan.caps, now)
  const { state } = deriveProviderState({ configured: true, usagePressure: pressure })
  // If a window is maxed, set coolingUntil to the soonest it frees up.
  let coolingUntil: string | null = null
  for (const cap of row.plan.caps) {
    const reset = nextResetAt(events, cap, now)
    if (reset && (!coolingUntil || reset < coolingUntil)) coolingUntil = reset
  }
  return {
    provider: row.provider,
    accountId: row.accountId,
    configured: true,
    state,
    coolingUntil,
    allowMetered: row.allowMetered ?? false,
    ...routableOf(row),
  }
}
