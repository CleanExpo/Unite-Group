// src/lib/provider-pool/router.ts
//
// Multi-provider LLM router — PURE decision core (no I/O, no secrets).
// Spec: apps/spec-board/projects/multi-provider-llm-routing/spec.md
//
// Given the kind of work + the live runtime state of each provider account,
// decide which provider account should run it — walking a per-lane preference
// order and skipping anything near-limit / blocked / cooling / prepaid-exhausted.
//
// SPEND GUARDRAIL (load-bearing): there is NO path that selects a metered
// provider once its prepaid/subscription envelope is exhausted unless that
// account explicitly opts in (`allowMetered`). When nothing is usable, the
// decision is `queue` — never a surprise API charge. This is the structural
// answer to "use the plans I've paid for, don't burn API credits".

import type { ProviderId, ProviderState } from '../command-centre/provider-usage'

/** The kind of work being routed. Maps to a provider-preference order below. */
export type WorkKind =
  | 'deep_reasoning' // premium analysis / planning
  | 'coding' // autopilot + code authoring
  | 'video' // MiniMax Hailuo
  | 'voice' // MiniMax Speech / TTS
  | 'music' // MiniMax Music
  | 'bulk_text' // posts, emails, promotions, course copy — high volume
  | 'fast_draft' // quick drafts
  | 'scout' // light research / exploration agents

/** Live state of one provider account, as the router sees it. */
export interface AccountRuntimeState {
  provider: ProviderId
  /** Stable id (e.g. the provider_accounts row id). */
  accountId: string
  /** Whether a credential is present + the account is enabled. */
  configured: boolean
  /** Derived usage state (from quota.ts / cockpit). */
  state: ProviderState
  /** ISO timestamp the account is cooling until (rate-limited); past = not cooling. */
  coolingUntil?: string | null
  /** For prepaid providers (MiniMax/OpenRouter): true when the balance is spent. */
  prepaidExhausted?: boolean
  /** Opt-in to metered billing once the paid envelope is gone. Default false. */
  allowMetered?: boolean
}

export type RouteDecision =
  | { action: 'route'; provider: ProviderId; accountId: string; reason: string; fallbackUsed: boolean }
  | { action: 'queue'; reason: string; skipped: Array<{ provider: ProviderId; why: string }> }

export interface RouteInput {
  kind: WorkKind
  accounts: AccountRuntimeState[]
  /** ISO 'now' for cooling comparison. */
  now: string
  /** Optional founder override: try these providers first, in order. */
  preferenceOverride?: ProviderId[]
}

/**
 * Per-lane provider preference (compliant single-account design):
 * - media lanes are MiniMax-only (no other provider in the pool does video/voice/music)
 * - premium reasoning/coding lead with the subscriptions, fall back to prepaid
 * - bulk/fast/scout lead with prepaid MiniMax (spend-safe) then OpenRouter/Gemini
 * - every chain ends at OpenRouter (credits) — the final aggregator/scout fallback
 */
export const PROVIDER_PREFERENCE: Record<WorkKind, ProviderId[]> = {
  deep_reasoning: ['claude', 'openai', 'minimax', 'openrouter'],
  coding: ['claude', 'openai', 'minimax', 'openrouter'],
  video: ['minimax'],
  voice: ['minimax'],
  music: ['minimax'],
  bulk_text: ['minimax', 'gemini', 'openrouter', 'claude'],
  fast_draft: ['minimax', 'gemini', 'openrouter'],
  scout: ['minimax', 'openrouter', 'gemini'],
}

/** States in which an account can take new work (mirrors the cockpit). */
const USABLE: ReadonlySet<ProviderState> = new Set<ProviderState>(['available', 'watching', 'unknown'])

function isCooling(account: AccountRuntimeState, now: string): boolean {
  if (!account.coolingUntil) return false
  return new Date(account.coolingUntil).getTime() > new Date(now).getTime()
}

/** Why an account can't take work right now (null = it can). */
function unusableReason(account: AccountRuntimeState, now: string): string | null {
  if (!account.configured) return 'not configured'
  if (account.prepaidExhausted && !account.allowMetered) return 'prepaid balance exhausted (metered overflow off)'
  if (isCooling(account, now)) return `cooling until ${account.coolingUntil}`
  if (account.state === 'blocked') return 'blocked'
  if (account.state === 'near_limit') return 'near limit'
  if (!USABLE.has(account.state)) return `state ${account.state}`
  return null
}

/**
 * Decide where to run a unit of work. Pure + deterministic.
 * Returns a `route` to the first usable account in the lane's preference order,
 * or `queue` (with the skip reasons) when nothing is usable — never an
 * unbudgeted metered call.
 */
export function decideRoute(input: RouteInput): RouteDecision {
  const order = input.preferenceOverride?.length
    ? input.preferenceOverride
    : PROVIDER_PREFERENCE[input.kind]

  const byProvider = new Map<ProviderId, AccountRuntimeState>()
  for (const a of input.accounts) {
    // First account per provider wins (single-account design); deterministic.
    if (!byProvider.has(a.provider)) byProvider.set(a.provider, a)
  }

  const skipped: Array<{ provider: ProviderId; why: string }> = []
  let index = 0
  for (const provider of order) {
    const account = byProvider.get(provider)
    if (!account) {
      skipped.push({ provider, why: 'no account in pool' })
      index += 1
      continue
    }
    const why = unusableReason(account, input.now)
    if (why) {
      skipped.push({ provider, why })
      index += 1
      continue
    }
    return {
      action: 'route',
      provider,
      accountId: account.accountId,
      reason: index === 0 ? 'primary for lane' : `fallback #${index} for ${input.kind}`,
      fallbackUsed: index > 0,
    }
  }

  return {
    action: 'queue',
    reason: `no usable provider for ${input.kind} — all candidates unavailable; queued rather than spending on a metered key`,
    skipped,
  }
}
