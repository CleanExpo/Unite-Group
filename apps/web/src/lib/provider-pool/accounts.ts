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

import type { ProviderId } from '../command-centre/provider-usage'
import { deriveProviderState } from '../command-centre/provider-usage'
import { windowedPressure, prepaidPressure, nextResetAt, type QuotaEvent, type WindowCap } from './quota'
import type { AccountRuntimeState } from './router'

/** How a plan is metered. */
export type PlanShape =
  | { kind: 'windowed'; caps: WindowCap[] } // subscriptions (Claude/OpenAI): 5h + weekly
  | { kind: 'prepaid'; purchasedUnits: number } // MiniMax / OpenRouter credits

/** The persisted account (DB row shape). The secret is in the vault, not here. */
export interface ProviderAccountRow {
  accountId: string
  provider: ProviderId
  label: string
  /** Vault entry holding the token/key. Presence ⇒ configured. */
  vaultEntryId: string | null
  enabled: boolean
  plan: PlanShape
  /** Opt-in to metered billing once the paid envelope is gone. Default false. */
  allowMetered?: boolean
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
): AccountRuntimeState {
  const configured = row.enabled && row.vaultEntryId !== null

  if (!configured) {
    return { provider: row.provider, accountId: row.accountId, configured: false, state: 'blocked' }
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
  }
}
