// apps/autopilot-runner/src/merge-policy.ts
//
// The auto-merge SAFETY predicate for the Stage-3 Autopilot Runner.
//
// This is the heart of the safety model (spec §7): it decides whether a
// runner-authored PR may be squash-merged, must WAIT (transient), or must be
// LEFT FOR A HUMAN (a real gate failed). It is pure and dependency-free so it is
// fully unit-tested without secrets, network, or infrastructure.
//
// Fail-closed by construction: every hard gate is checked first and any failure
// routes to a human. The ONLY path to `merge` is every safety condition met —
// green CI, an independent adversarial-evaluator approval, an existing
// autonomous-contract label, base = main, linear history, the live gate on, and
// the PR genuinely authored by the runner.
//
// Labels mirror the live claim loop (apps/web/src/lib/command-centre/linear-claim.ts),
// which says "Do NOT invent new tags".

/** Aggregate CI status across the required checks. */
export type CiState = 'pending' | 'success' | 'failure'

/** The adversarial-evaluator (reviewer App) verdict on the PR. */
export type ReviewState = 'none' | 'approved' | 'changes_requested'

export interface MergeContext {
  /** Aggregate required-check CI status. */
  ci: CiState
  /** Reviewer App (adversarial-evaluator) verdict. */
  review: ReviewState
  /** Labels on the originating Linear issue / PR. */
  labels: string[]
  /** PR base branch. */
  baseBranch: string
  /** True when merging keeps linear history (rebased / up to date, no merge commit). */
  linearHistory: boolean
  /** Global kill switch — true only when CC_LINEAR_LIVE === '1'. */
  liveGate: boolean
  /** True only when the PR was opened by the runner identity (never a human). */
  authoredByRunner: boolean
}

export type WaitReason = 'ci-pending' | 'awaiting-review'

export type HumanReason =
  | 'kill-switch-off'
  | 'not-runner-authored'
  | 'wrong-base'
  | 'not-autonomous'
  | 'non-linear-history'
  | 'ci-failed'
  | 'changes-requested'

export type MergeDecision =
  | { action: 'merge' }
  | { action: 'wait'; reason: WaitReason }
  | { action: 'leave_for_human'; reason: HumanReason }

/**
 * The existing autonomous-work contract labels.
 * Source of truth: apps/web/src/lib/command-centre/linear-claim.ts (AUTONOMOUS_LABELS).
 * Do NOT invent new tags.
 */
export const AUTONOMOUS_LABELS = ['mesh:auto', 'pi-dev:autonomous'] as const

export const DEFAULT_BASE_BRANCH = 'main'

function hasAutonomousLabel(labels: string[]): boolean {
  const present = new Set(labels.map((l) => l.toLowerCase()))
  return AUTONOMOUS_LABELS.some((label) => present.has(label))
}

/**
 * Decide what to do with a runner-authored PR.
 *
 * Order is intentional: hard human-gates first (fail closed), then transient
 * waits, then the all-clear. Anything not explicitly cleared never merges.
 */
export function decideMerge(ctx: MergeContext): MergeDecision {
  // ── Hard gates — fail closed to a human ───────────────────────────────────
  if (!ctx.liveGate) return { action: 'leave_for_human', reason: 'kill-switch-off' }
  if (!ctx.authoredByRunner) return { action: 'leave_for_human', reason: 'not-runner-authored' }
  if (ctx.baseBranch !== DEFAULT_BASE_BRANCH) return { action: 'leave_for_human', reason: 'wrong-base' }
  if (!hasAutonomousLabel(ctx.labels)) return { action: 'leave_for_human', reason: 'not-autonomous' }
  if (!ctx.linearHistory) return { action: 'leave_for_human', reason: 'non-linear-history' }
  if (ctx.ci === 'failure') return { action: 'leave_for_human', reason: 'ci-failed' }
  if (ctx.review === 'changes_requested') return { action: 'leave_for_human', reason: 'changes-requested' }

  // ── Transient — re-evaluate on the next tick ──────────────────────────────
  if (ctx.ci === 'pending') return { action: 'wait', reason: 'ci-pending' }
  if (ctx.review !== 'approved') return { action: 'wait', reason: 'awaiting-review' }

  // ── All safety conditions met ─────────────────────────────────────────────
  return { action: 'merge' }
}
