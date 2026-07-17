// src/lib/command-centre/task-transitions.ts
//
// UNI-2417 — Server-side task-lifecycle transition matrix (governance guard).
//
// The Command Centre runner claims `queued` tasks and executes them, so the
// promotion of a task INTO `queued` (or `running`) is the governance boundary of
// the whole plane. Before this module, the queue PATCH route accepted any status
// enum and wrote it directly, letting an authenticated caller push a `proposed`
// or `awaiting_approval` task straight to `queued`/`running` and bypass the
// Board/approval path entirely.
//
// The matrix below is the single, explicit, default-deny source of truth for
// which lifecycle edges are legal, scoped by the ACTOR performing them:
//   - `founder`  — a direct client PATCH via the queue route. Benign edits only
//                  (park / unblock / cancel / mark-done). MUST NOT promote to
//                  `queued` or `running` — those require the approval / runner
//                  paths respectively.
//   - `approval` — the approve route (`applyApproval` → decisionToStatus). The
//                  ONLY actor that may promote a task to `queued`.
//   - `runner`   — the Nexus runner claim/release (queued→running→done/failed/
//                  requeue). Documented here for a truthful lifecycle model; the
//                  runner enforces its own atomic conditional updates.
//
// Enforcement lives in the routes that set status from client input (queue
// PATCH). The approval and runner paths are the legitimate promoters and are
// modelled here so the boundary is one auditable table, not scattered checks.

import type { TaskStatus } from './tasks'

export type TransitionActor = 'founder' | 'approval' | 'runner'

/** All known task statuses — an edge touching anything outside this set is denied. */
export const TASK_STATUSES: readonly TaskStatus[] = [
  'proposed',
  'awaiting_approval',
  'queued',
  'running',
  'blocked',
  'done',
  'failed',
]

const IS_STATUS = new Set<string>(TASK_STATUSES)

// Explicit allowed edges per actor. Anything not listed is denied (default-deny).
// A same-state (from === to) transition is treated as a legal no-op separately.
const TRANSITIONS: Record<TransitionActor, Partial<Record<TaskStatus, readonly TaskStatus[]>>> = {
  // Direct client PATCH — benign edits only; never promotes to queued/running.
  founder: {
    proposed: ['awaiting_approval', 'blocked', 'failed'],
    awaiting_approval: ['proposed', 'blocked', 'failed'],
    queued: ['blocked', 'failed'], // pull back / cancel an approved-but-unclaimed task
    running: ['blocked', 'done', 'failed'], // pause / mark-done (validation-gated) / abort
    blocked: ['proposed', 'failed'],
    failed: ['proposed'], // retry re-enters the pipeline (and must be re-approved)
    // done is terminal — no direct edits out of it.
  },
  // Approval path — the ONLY promoter to `queued` (mirrors decisionToStatus:
  // approve→queued, reject→failed, defer→blocked).
  approval: {
    proposed: ['queued', 'failed', 'blocked'],
    awaiting_approval: ['queued', 'failed', 'blocked'],
  },
  // Nexus runner claim/release (mirrors runner-claim.ts). Not enforced here; the
  // runner uses atomic conditional updates. Present for lifecycle completeness.
  runner: {
    queued: ['running'],
    running: ['done', 'failed', 'queued'], // done / failed / requeue
  },
}

/**
 * Is `from → to` a legal lifecycle transition for `actor`? Default-deny: unknown
 * states and any edge not explicitly listed return false. A same-state
 * transition is a legal no-op. `actor` defaults to `founder` (the direct-PATCH
 * caller), the surface this guard exists to constrain.
 */
export function isLegalTransition(
  from: unknown,
  to: unknown,
  actor: TransitionActor = 'founder',
): boolean {
  if (typeof from !== 'string' || typeof to !== 'string') return false
  if (!IS_STATUS.has(from) || !IS_STATUS.has(to)) return false
  if (from === to) return true
  const allowed = TRANSITIONS[actor][from as TaskStatus]
  return allowed ? allowed.includes(to as TaskStatus) : false
}
