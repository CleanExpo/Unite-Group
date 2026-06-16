// src/lib/command-centre/linear-claim.ts
//
// UNI-2143 — Autonomous Linear claim-loop core.
//
// Selects the next eligible autonomous task from a Linear project and claims it
// (moves it to "In Progress" and writes a claim receipt comment).
//
// SAFETY (hard guardrail, mirrors linear-sync.ts):
//   - DRY-RUN by DEFAULT. The default path makes ZERO mutating Linear calls; it
//     only reads candidates and returns the operation it *would* perform.
//   - A live claim happens ONLY when BOTH:
//       opts.live === true   AND   process.env.CC_LINEAR_LIVE === '1'
//     Either missing → dry-run.
//   - No remote calls happen at import time.
//
// The eligibility/selection logic is pure and dependency-free (fully unit
// tested); the live Linear wiring is injected via ClaimLoopDeps so the loop is
// testable without network access.
//
// Uses the EXISTING autonomous-work contract labels — nothing new is invented:
//   - mesh:auto
//   - pi-dev:autonomous
// Blocked work is recognised by the EXISTING blocker-reason label convention
// (e.g. pi-dev:blocked-reason:credentials) and/or open blockedBy relations.

export type LinearStateType =
  | 'triage'
  | 'backlog'
  | 'unstarted'
  | 'started'
  | 'completed'
  | 'canceled'

/** Autonomous-work contract labels. Do NOT invent new tags. */
export const AUTONOMOUS_LABELS = ['mesh:auto', 'pi-dev:autonomous'] as const

/** Existing blocker-reason label convention (e.g. pi-dev:blocked-reason:credentials). */
export const BLOCKED_LABEL_PREFIX = 'pi-dev:blocked-reason:'

/** An "Acceptance Criteria" heading must be present in the description. */
const ACCEPTANCE_HEADING = /(^|\n)\s*#{0,6}\s*acceptance criteria/i

/** Normalised candidate shape the pure logic operates on. */
export interface ClaimCandidate {
  id: string
  identifier: string
  title: string
  /** Linear priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low. */
  priority: number
  description: string | null
  createdAt: string
  url?: string
  stateName: string
  stateType: LinearStateType
  /** Label names attached to the issue. */
  labels: string[]
  /** Count of OPEN issues that block this one (0 when none/unknown). */
  blockedByOpenCount: number
}

export type SkipReason =
  | 'not-autonomous'
  | 'ineligible-state'
  | 'blocked'
  | 'no-acceptance-criteria'

export interface Eligibility {
  claimable: boolean
  reason: SkipReason | 'eligible'
}

// ─── Pure predicates ───────────────────────────────────────────────────────────

export function hasAutonomousLabel(issue: Pick<ClaimCandidate, 'labels'>): boolean {
  const present = new Set(issue.labels.map(l => l.toLowerCase()))
  return AUTONOMOUS_LABELS.some(label => present.has(label))
}

/** Only Todo (unstarted) and Backlog issues are claimable. */
export function isEligibleState(issue: Pick<ClaimCandidate, 'stateType'>): boolean {
  return issue.stateType === 'unstarted' || issue.stateType === 'backlog'
}

/** Blocked by an open blocker relation OR carrying any blocker-reason label. */
export function isBlocked(
  issue: Pick<ClaimCandidate, 'labels' | 'blockedByOpenCount'>,
): boolean {
  if (issue.blockedByOpenCount > 0) return true
  return issue.labels.some(l => l.toLowerCase().startsWith(BLOCKED_LABEL_PREFIX))
}

/** A claimable task must carry an explicit "Acceptance Criteria" section. */
export function hasAcceptanceCriteria(issue: Pick<ClaimCandidate, 'description'>): boolean {
  return !!issue.description && ACCEPTANCE_HEADING.test(issue.description)
}

/** Combined eligibility, returning the first failing reason for transparency. */
export function evaluateEligibility(issue: ClaimCandidate): Eligibility {
  if (!hasAutonomousLabel(issue)) return { claimable: false, reason: 'not-autonomous' }
  if (!isEligibleState(issue)) return { claimable: false, reason: 'ineligible-state' }
  if (isBlocked(issue)) return { claimable: false, reason: 'blocked' }
  if (!hasAcceptanceCriteria(issue)) return { claimable: false, reason: 'no-acceptance-criteria' }
  return { claimable: true, reason: 'eligible' }
}

// ─── Selection ───────────────────────────────────────────────────────────────

// Linear priority 0 means "no priority" — rank it LAST. Otherwise lower = higher
// priority (1=urgent is the most urgent).
function priorityRank(priority: number): number {
  return priority === 0 ? Number.MAX_SAFE_INTEGER : priority
}

const PRIORITY_LABEL: Record<number, string> = {
  0: 'No priority',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
}

export interface SelectionResult {
  next: ClaimCandidate | null
  eligibleCount: number
  skipped: { identifier: string; reason: SkipReason }[]
}

/**
 * Partition candidates into claimable vs skipped and pick the single highest
 * priority claimable issue (ties broken by oldest createdAt — FIFO fairness).
 */
export function selectNextClaimable(issues: ClaimCandidate[]): SelectionResult {
  const eligible: ClaimCandidate[] = []
  const skipped: { identifier: string; reason: SkipReason }[] = []

  for (const issue of issues) {
    const verdict = evaluateEligibility(issue)
    if (verdict.claimable) eligible.push(issue)
    else skipped.push({ identifier: issue.identifier, reason: verdict.reason as SkipReason })
  }

  eligible.sort((a, b) => {
    const byPriority = priorityRank(a.priority) - priorityRank(b.priority)
    if (byPriority !== 0) return byPriority
    return a.createdAt.localeCompare(b.createdAt)
  })

  return { next: eligible[0] ?? null, eligibleCount: eligible.length, skipped }
}

// ─── Claim receipt ─────────────────────────────────────────────────────────────

export interface ClaimReceiptInput {
  runner: string
  runId: string
  at: string
}

/** The receipt comment written when an issue is claimed. No secret values. */
export function buildClaimReceipt(issue: ClaimCandidate, input: ClaimReceiptInput): string {
  return [
    `🤖 **Claimed by ${input.runner}** — autonomous Linear loop (UNI-2143).`,
    '',
    `- Run ID: \`${input.runId}\``,
    `- Claimed at: ${input.at}`,
    `- Transition: **${issue.stateName} → In Progress**`,
    `- Priority: ${PRIORITY_LABEL[issue.priority] ?? 'Unknown'}`,
    '',
    'Passed the autonomous claim filter (autonomous label · eligible state · not ' +
      'blocked · acceptance criteria present) and is now being worked. Evidence, ' +
      'branch/PR links, and test results will follow on completion. No secrets logged.',
  ].join('\n')
}

// ─── Orchestration (dependency-injected, double-gated) ──────────────────────────

export interface ClaimLoopDeps {
  /** Read claimable candidates (already scoped to team/project/labels). */
  listCandidates: () => Promise<ClaimCandidate[]>
  /** Move an issue to "In Progress". Only called on the live path. */
  moveToInProgress: (issueId: string) => Promise<void>
  /** Write the claim receipt comment. Only called on the live path. */
  postComment: (issueId: string, body: string) => Promise<void>
}

export interface ClaimLoopOptions {
  /** Opt in to a real claim. A write only happens if CC_LINEAR_LIVE === '1' too. */
  live?: boolean
  runner?: string
  runId?: string
  /** Injectable clock for deterministic tests. */
  now?: () => string
}

export type StopReason = 'claimed' | 'no-eligible-work' | 'dry-run'

export interface ClaimLoopResult {
  ran_at: string
  mode: 'live' | 'dry-run'
  stop_reason: StopReason
  candidates_total: number
  eligible_total: number
  claimed: {
    id: string
    identifier: string
    title: string
    url?: string
    from_state: string
  } | null
  /** The receipt that was (live) or would be (dry-run) posted. */
  receipt: string | null
  skipped: { identifier: string; reason: SkipReason }[]
}

/**
 * Claim the next eligible autonomous issue.
 *
 * DRY-RUN by default: selects + builds the receipt, makes NO mutating call.
 * LIVE only when opts.live === true AND process.env.CC_LINEAR_LIVE === '1'.
 *
 * Idempotency: a live claim moves the issue out of the unstarted/backlog state
 * set BEFORE writing the receipt. Because selection only ever considers
 * unstarted/backlog issues, a concurrent or repeated run cannot re-select an
 * already-claimed ("In Progress") issue — it is filtered as `ineligible-state`.
 */
export async function claimNextEligibleIssue(
  deps: ClaimLoopDeps,
  opts: ClaimLoopOptions = {},
): Promise<ClaimLoopResult> {
  const now = opts.now ?? (() => new Date().toISOString())
  const ranAt = now()
  const isLive = opts.live === true && process.env.CC_LINEAR_LIVE === '1'
  const runner = opts.runner ?? 'pi-dev-autopilot'
  const runId = opts.runId ?? `claim-${ranAt}`

  const candidates = await deps.listCandidates()
  const { next, eligibleCount, skipped } = selectNextClaimable(candidates)

  if (!next) {
    return {
      ran_at: ranAt,
      mode: isLive ? 'live' : 'dry-run',
      stop_reason: 'no-eligible-work',
      candidates_total: candidates.length,
      eligible_total: 0,
      claimed: null,
      receipt: null,
      skipped,
    }
  }

  const receipt = buildClaimReceipt(next, { runner, runId, at: ranAt })

  if (!isLive) {
    return {
      ran_at: ranAt,
      mode: 'dry-run',
      stop_reason: 'dry-run',
      candidates_total: candidates.length,
      eligible_total: eligibleCount,
      claimed: null,
      receipt,
      skipped,
    }
  }

  // Live claim. Move state first (the idempotency gate), then write the receipt.
  await deps.moveToInProgress(next.id)
  await deps.postComment(next.id, receipt)

  return {
    ran_at: ranAt,
    mode: 'live',
    stop_reason: 'claimed',
    candidates_total: candidates.length,
    eligible_total: eligibleCount,
    claimed: {
      id: next.id,
      identifier: next.identifier,
      title: next.title,
      url: next.url,
      from_state: next.stateName,
    },
    receipt,
    skipped,
  }
}
