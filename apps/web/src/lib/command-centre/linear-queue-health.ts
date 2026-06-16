// src/lib/command-centre/linear-queue-health.ts
//
// UNI-2145 — Linear autonomous-queue health surface + stale-loop alert.
//
// Computes a health report for the autonomous claim loop (UNI-2143) so operators
// can tell whether it is building, idle, blocked, or misconfigured — WITHOUT
// leaking any secret values (config readiness is reported as present/absent
// booleans only).
//
// Pure + dependency-free: the route injects the live inputs (config booleans,
// current candidates, last-claim timestamp). Reuses the claim loop's own
// selection logic so "next claimable" and the health verdict never drift apart.

import { selectNextClaimable, type ClaimCandidate } from './linear-claim'

export type QueueHealthState =
  | 'unconfigured' // missing Linear key / team / project — loop cannot run
  | 'idle'         // configured, no claimable work at all (genuinely empty)
  | 'healthy'      // eligible work present and recently claimed — loop is moving
  | 'stale'        // eligible work present but NOT claimed within the interval
  | 'all-blocked'  // autonomous work present but every item is blocked

/** Readiness flags — booleans only, never the secret values themselves. */
export interface QueueConfigReadiness {
  linearKeyPresent: boolean
  liveSyncEnabled: boolean
  teamConfigured: boolean
  projectConfigured: boolean
  ready: boolean
}

export interface QueueHealthInput {
  config: QueueConfigReadiness
  /** Autonomous, Todo/Backlog candidates (as returned to the claim loop). */
  candidates: ClaimCandidate[]
  /** ISO timestamp of the most recent autonomous claim, or null if never. */
  lastClaimedAt: string | null
  /** ISO "now" (injectable for deterministic tests). */
  now: string
  /** A claim older than this (ms) while work waits is considered stale. */
  staleAfterMs: number
}

export interface QueueHealthReport {
  state: QueueHealthState
  summary: string
  config: QueueConfigReadiness
  nextClaimable: { identifier: string; title: string; priority: number } | null
  lastClaimedAt: string | null
  msSinceLastClaim: number | null
  eligibleCount: number
  blockedCount: number
  candidatesTotal: number
  staleAfterMs: number
  isStale: boolean
}

/** Build the readiness flags from env presence — never reads secret values. */
export function buildConfigReadiness(env: {
  linearKey?: string | null
  live?: string | null
  teamKey?: string | null
  projectName?: string | null
}): QueueConfigReadiness {
  const linearKeyPresent = !!env.linearKey && env.linearKey.length > 0
  const teamConfigured = !!env.teamKey && env.teamKey.length > 0
  const projectConfigured = !!env.projectName && env.projectName.length > 0
  return {
    linearKeyPresent,
    liveSyncEnabled: env.live === '1',
    teamConfigured,
    projectConfigured,
    ready: linearKeyPresent && teamConfigured && projectConfigured,
  }
}

function describe(state: QueueHealthState, ctx: {
  eligibleCount: number
  blockedCount: number
  nextIdentifier: string | null
  staleAfterMs: number
  msSinceLastClaim: number | null
}): string {
  const mins = Math.round(ctx.staleAfterMs / 60000)
  switch (state) {
    case 'unconfigured':
      return 'Autonomous Linear loop is not configured (missing API key, team, or project mapping).'
    case 'idle':
      return 'No claimable autonomous work — the queue is empty. (System is working; there is simply nothing to do.)'
    case 'healthy': {
      const ago = ctx.msSinceLastClaim === null ? 'recently' : `${Math.round(ctx.msSinceLastClaim / 60000)}m ago`
      return `Queue active — ${ctx.eligibleCount} eligible, last claim ${ago}. Next: ${ctx.nextIdentifier}.`
    }
    case 'stale':
      return `STALE: ${ctx.eligibleCount} eligible task(s) waiting but no claim within ${mins}m — the loop may not be running. (Work is available; the system failed to pick it up.)`
    case 'all-blocked':
      return `${ctx.blockedCount} autonomous task(s) present but all blocked (e.g. credentials) — none claimable.`
  }
}

/**
 * Compute the autonomous-queue health verdict.
 *
 * Distinguishes "no work available" (idle) from "system failed to pick up work"
 * (stale): both have zero progress, but only stale has eligible work waiting.
 */
export function computeQueueHealth(input: QueueHealthInput): QueueHealthReport {
  const { config, candidates, lastClaimedAt, now, staleAfterMs } = input
  const { next, eligibleCount, skipped } = selectNextClaimable(candidates)
  const blockedCount = skipped.filter(s => s.reason === 'blocked').length

  const msSinceLastClaim =
    lastClaimedAt === null ? null : Math.max(0, Date.parse(now) - Date.parse(lastClaimedAt))
  const claimIsStale =
    lastClaimedAt === null || (msSinceLastClaim !== null && msSinceLastClaim > staleAfterMs)

  let state: QueueHealthState
  if (!config.ready) {
    state = 'unconfigured'
  } else if (eligibleCount > 0) {
    state = claimIsStale ? 'stale' : 'healthy'
  } else if (blockedCount > 0) {
    state = 'all-blocked'
  } else {
    state = 'idle'
  }

  return {
    state,
    summary: describe(state, {
      eligibleCount,
      blockedCount,
      nextIdentifier: next?.identifier ?? null,
      staleAfterMs,
      msSinceLastClaim,
    }),
    config,
    nextClaimable: next
      ? { identifier: next.identifier, title: next.title, priority: next.priority }
      : null,
    lastClaimedAt,
    msSinceLastClaim,
    eligibleCount,
    blockedCount,
    candidatesTotal: candidates.length,
    staleAfterMs,
    isStale: state === 'stale',
  }
}
