// src/lib/mission-authority/release-controller.ts
//
// UNI-2779 — decide what a release candidate may do next. The safe-release
// gates are DERIVED from evidence (SHAs, check runs, review verdict, receipt,
// changed paths), never accepted as caller-asserted booleans, and the verdict
// comes from may() so the release path reads the same policy as every build
// step. This module never merges or deploys: a SAFE_RELEASE merge is handed to
// the Board release controller (tools/board-release-verifier/controller.py),
// and production promotion is always PROTECTED_RELEASE.

import policy from '../../../../../scripts/nexus-runner/mission-authority.json'
import { may, type MayDecision, type MissionAuthority, type Risk } from './may'

export interface CheckRun {
  name: string
  status: string
  conclusion: string | null
}

export interface ReleaseEvidence {
  candidateSha: string
  treeClean: boolean
  reviewedSha: string | null
  reviewVerdict: string | null
  reviewerAgent: string | null
  builderAgent: string
  /** Head SHA carrying a success `nexus/release-receipt` status, if any. */
  receiptSha: string | null
  requiredChecks: string[]
  checkRuns: CheckRun[]
  changedPaths: string[]
  unresolvedP0P1: number
  /** null = unknown, which never counts as "no new spend". */
  addsSpend: boolean | null
  rollbackReceipt: string | null
  postReleaseVerification: string | null
  /** Receipt proving the target behaves as assumed (e.g. the merge-stays-staged canary). */
  infrastructureReceipt: string | null
}

export interface ReleaseInput {
  mission: MissionAuthority | null
  actor: string
  action: string
  risk: Risk
  phase: string
  evidence: ReleaseEvidence
  now?: number
}

export interface ReleaseDecision extends MayDecision {
  gates: Record<string, boolean>
  protectedPaths: string[]
  /** Who executes a continued SAFE_RELEASE merge. Never this module. */
  executor?: 'board_release_controller'
}

const SHA = /^[0-9a-f]{40}$/
const PREFIXES: readonly string[] = policy.protected_paths.prefixes
const SEGMENTS: readonly string[] = policy.protected_paths.segments

export function protectedPathHits(paths: readonly string[]): string[] {
  return paths.filter((path) => {
    if (PREFIXES.some((prefix) => (prefix.endsWith('/') ? path.startsWith(prefix) : path === prefix))) return true
    return path.split('/').some((part) => {
      const stem = part.replace(/\.[^.]+$/, '')
      return part.startsWith('.env') || SEGMENTS.includes(part) || SEGMENTS.includes(stem)
    })
  })
}

function requiredChecksGreen(required: readonly string[], runs: readonly CheckRun[]): boolean {
  if (required.length === 0) return false
  return required.every((name) => {
    const named = runs.filter((run) => run.name === name)
    return named.length > 0 && named.every((run) => run.status === 'completed' && run.conclusion === 'success')
  })
}

export function deriveGates(evidence: ReleaseEvidence): Record<string, boolean> {
  const sha = evidence.candidateSha
  const exact = SHA.test(sha)
  const paths = evidence.changedPaths
  return {
    exact_final_sha: exact && evidence.reviewedSha === sha && evidence.receiptSha === sha,
    clean_tree: evidence.treeClean === true,
    required_ci_green: exact && requiredChecksGreen(evidence.requiredChecks, evidence.checkRuns),
    independent_review_pass:
      evidence.reviewVerdict === 'PASS' &&
      evidence.reviewedSha === sha &&
      !!evidence.reviewerAgent &&
      evidence.reviewerAgent !== evidence.builderAgent,
    release_gate_pass: exact && evidence.receiptSha === sha,
    no_unresolved_p0_p1: evidence.unresolvedP0P1 === 0,
    no_auth_security_credential_change: paths.length > 0 && protectedPathHits(paths).length === 0,
    no_destructive_migration: paths.length > 0 && !paths.some((path) => path.includes('/migrations/')),
    no_new_spend: evidence.addsSpend === false,
    rollback_proven: !!evidence.rollbackReceipt,
    post_release_verification_defined: !!evidence.postReleaseVerification,
    infrastructure_semantics_match: !!evidence.infrastructureReceipt,
  }
}

export function classifyRelease(input: ReleaseInput): ReleaseDecision {
  const gates = deriveGates(input.evidence)
  const hits = protectedPathHits(input.evidence.changedPaths)
  const decision = may({
    mission: input.mission,
    actor: input.actor,
    action: input.action,
    target: input.evidence.candidateSha,
    risk: input.risk,
    state: { gates, phase: input.phase },
    now: input.now,
  })
  if (decision.verdict === 'continue' && hits.length > 0) {
    // may() already refuses through no_auth_security_credential_change; this is
    // the belt to that brace, so a gate-list edit can never let a protected path through.
    return {
      verdict: 'escalate',
      boundary: 'PROTECTED_RELEASE',
      reason: `release touches protected paths: ${hits.join(', ')}`,
      gates,
      protectedPaths: hits,
    }
  }
  return {
    ...decision,
    gates,
    protectedPaths: hits,
    ...(decision.verdict === 'continue' && input.action === 'merge' ? { executor: 'board_release_controller' as const } : {}),
  }
}
