// src/lib/mission-authority/runner-boundary.ts
//
// UNI-2779 — the service boundary between the runner and the task row. The
// claim and release routes ask these questions server-side, so a runner whose
// PATH shims were bypassed still cannot claim a mission it holds no authority
// for, or report an outcome may() would not continue.
//
// Pure: the answers depend only on the row (and a clock). Callers that need the
// approval ledger re-checked (claim, release) do that before calling in.

import type { CommandCentreTask } from '@/lib/command-centre/tasks'
import { isDeliveryMission } from '@/lib/command-centre/delivery-types'
import { authorityFromApprovedDelivery, nextStep, readContinuation, type MissionContinuation, type NextStep } from './continuation'
import { may, type MissionAuthority } from './may'

/**
 * The policy has no "claim" action and this module may not add one (the policy
 * is a protected path). Claiming a mission is its first build step: discover.
 */
export const CLAIM_ACTION = 'discover'

/** The action a release outcome asserts the runner took. null = not a mission outcome. */
export const RELEASE_OUTCOME_ACTION = { done: 'draft_pr', failed: null, requeue: null } as const

/** A task the mission authority governs: a delivery mission, or any row carrying a continuation. */
export function isMissionScoped(task: Pick<CommandCentreTask, 'external_ref' | 'metadata'>): boolean {
  const mission = task.metadata?.mission
  return isDeliveryMission(task) || (mission !== undefined && mission !== null)
}

export interface MissionClaim {
  binding: { mission_id: string; intent_hash: string; authority_version: string }
  continuation: MissionContinuation | null
  nextStep: NextStep | null
}

export type ClaimVerdict = { claimable: true; mission: MissionClaim | null } | { claimable: false; reason: string }

/**
 * May a runner claim (or resume) this row? Legacy rows are unaffected. A
 * mission-scoped row is claimable only when may() continues its first build
 * step against the authority the row holds; the continuation and the verdict on
 * its next_action travel with the claim so the runner resumes without asking.
 */
export function missionClaimVerdict(task: CommandCentreTask, now: number = Date.now()): ClaimVerdict {
  if (!isMissionScoped(task)) return { claimable: true, mission: null }
  const stored = readContinuation(task)
  if (stored.state === 'invalid') return { claimable: false, reason: `continuation unreadable: ${stored.error}` }
  const continuation = stored.state === 'ok' ? stored.continuation : null
  const authority = authorityFromApprovedDelivery(task)
  const decision = may({
    mission: authority,
    actor: 'nexus-runner',
    action: CLAIM_ACTION,
    target: task.id,
    risk: task.risk_level,
    state: { gates: {}, phase: continuation?.phase ?? 'BUILD_AUTHORISED' },
    now,
  })
  if (decision.verdict !== 'continue' || !authority) return { claimable: false, reason: decision.reason }
  return {
    claimable: true,
    mission: {
      binding: { mission_id: authority.missionId, intent_hash: authority.intentHash, authority_version: authority.authorityVersion },
      continuation,
      nextStep: continuation ? nextStep(continuation, authority, {}, now, task.risk_level) : null,
    },
  }
}

export type ReleaseVerdict = { allowed: true; action: string | null } | { allowed: false; reason: string }

/**
 * May the runner report this outcome? An explicit `action` is always judged by
 * may(). Without one, a legacy row keeps its old contract and a failure is
 * always accepted (it only ever moves a task toward 'failed'); a mission's
 * 'done' is judged as draft_pr, and a mission never requeues to ask — that is
 * what RUNNER_BLOCKED is for.
 */
export function releaseVerdict(input: {
  task: CommandCentreTask
  authority: MissionAuthority | null
  runnerId: string
  outcome: keyof typeof RELEASE_OUTCOME_ACTION
  action?: string
  target?: string | null
  now?: number
}): ReleaseVerdict {
  const scoped = isMissionScoped(input.task)
  if (input.action === undefined && (!scoped || input.outcome === 'failed')) return { allowed: true, action: null }
  const action = input.action ?? RELEASE_OUTCOME_ACTION[input.outcome]
  if (action === null) {
    return { allowed: false, reason: `a mission never reports "${input.outcome}"; report RUNNER_BLOCKED: <INTERRUPTION_CLASS>: <reason>` }
  }
  const stored = readContinuation(input.task)
  if (stored.state === 'invalid') return { allowed: false, reason: `continuation unreadable: ${stored.error}` }
  const decision = may({
    mission: input.authority,
    actor: input.runnerId,
    action,
    target: input.target ?? input.task.id,
    risk: input.task.risk_level,
    state: { gates: {}, phase: stored.state === 'ok' ? stored.continuation.phase : 'BUILD_AUTHORISED' },
    now: input.now,
  })
  return decision.verdict === 'continue' ? { allowed: true, action } : { allowed: false, reason: decision.reason }
}
