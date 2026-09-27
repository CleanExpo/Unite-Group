// src/lib/mission-authority/release-controller.ts
//
// UNI-2779 — decide what a release candidate may do next. Every safe-release
// gate is DERIVED from an artefact that names the SHA it was produced at (check
// runs, review, receipt, tree status, spend scan, rollback, post-release and
// infrastructure receipts); an artefact for any other SHA counts as missing, and
// no gate takes a bare yes/no. The verdict comes from may() so the release path
// reads the same policy as every build step.
//
// This function is pure: it cannot tell a genuine artefact from a forged one, so
// it is wired to no route. Whatever executes a release must collect the artefacts
// itself and never accept them from the caller asking to release. This module
// never merges or deploys: a SAFE_RELEASE merge is handed to the Board release
// controller (tools/board-release-verifier/controller.py), and production
// promotion is always PROTECTED_RELEASE.

import policy from '../../../../../scripts/nexus-runner/mission-authority.json'
import { may, type MayDecision, type MissionAuthority, type Risk } from './may'

export interface CheckRun {
  name: string
  /** The commit GitHub ran this check on (its head_sha). */
  headSha: string
  status: string
  conclusion: string | null
}

/** A receipt and the SHA it was produced at. */
export interface ShaArtefact {
  sha: string
  ref: string
}

export interface ReleaseEvidence {
  candidateSha: string
  /** Porcelain tree status captured at `sha`; '' means clean. */
  tree: { sha: string; porcelain: string } | null
  reviewedSha: string | null
  reviewVerdict: string | null
  reviewerAgent: string | null
  builderAgent: string
  /** Head SHA carrying a success `nexus/release-receipt` status, if any. */
  receiptSha: string | null
  requiredChecks: string[]
  checkRuns: CheckRun[]
  changedPaths: string[]
  /** Severities of the blocking findings in the review report at reviewedSha. null = report unread. */
  reviewBlockingSeverities: string[] | null
  /** Cost-bearing additions found by a spend scan at `sha`. null = not scanned, never "no new spend". */
  spend: { sha: string; newCosts: string[] } | null
  rollbackReceipt: ShaArtefact | null
  postReleaseVerification: ShaArtefact | null
  /** Receipt proving the target behaves as assumed (e.g. the merge-stays-staged canary). */
  infrastructureReceipt: ShaArtefact | null
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
/** A blocking finding that does not stop a release. Anything else, padded or unrecognised, does. */
const NON_BLOCKING_SEVERITY = /^P[2-9]$/i
/** An agent name is a plain identifier. Invisible or exotic characters cannot make a name, so they cannot make a reviewer. */
const AGENT_NAME = /^[a-z0-9][a-z0-9._:-]{0,127}$/
/**
 * A receipt ref is a machine receipt (deployment id, command read-back, alias check), so it names
 * something in ASCII. Requiring one ASCII letter or digit is a positive test: no invisible, combining
 * or default-ignorable character can pass it, however many Unicode categories there are.
 */
const RECEIPT_REF = /[a-z0-9]/i
const PREFIXES: readonly string[] = policy.protected_paths.prefixes
// Policy entries are lower case (pinned by a test), so only the path needs folding.
const SEGMENTS: readonly string[] = policy.protected_paths.segments
/** Code and config extensions a named file may also be written in (middleware.js, next.config.ts). */
const CODE_EXT = /\.(?:[cm]?[jt]sx?|json[c5]?)$/

export function protectedPathHits(paths: readonly string[]): string[] {
  return paths.filter((original) => {
    // Case-folded: Auth/ and SECURITY/ are the same surface on a case-insensitive checkout.
    const path = original.toLowerCase()
    const named = path.replace(CODE_EXT, '')
    const hitsPrefix = PREFIXES.some((prefix) =>
      prefix.endsWith('/') ? path.startsWith(prefix) : named === prefix.replace(CODE_EXT, ''),
    )
    if (hitsPrefix) return true
    return path.split('/').some((part) => {
      // Up to the first dot, so auth.config.ts and security.test.ts match as well as auth.ts.
      const stem = part.split('.')[0]
      return part.startsWith('.env') || SEGMENTS.includes(stem)
    })
  })
}

function requiredChecksGreen(required: readonly string[], runs: readonly CheckRun[], sha: string): boolean {
  // A blank required name would be satisfied by a blank-named run: same positive test as a receipt ref (UNI-2782).
  if (required.length === 0 || !required.every((name) => RECEIPT_REF.test(name))) return false
  return required.every((name) => {
    const named = runs.filter((run) => run.name === name)
    return (
      named.length > 0 &&
      named.every((run) => run.headSha === sha && run.status === 'completed' && run.conclusion === 'success')
    )
  })
}

function atSha(artefact: ShaArtefact | null, sha: string): boolean {
  return !!artefact && artefact.sha === sha && RECEIPT_REF.test(artefact.ref)
}

export function deriveGates(evidence: ReleaseEvidence): Record<string, boolean> {
  const sha = evidence.candidateSha
  const exact = SHA.test(sha)
  const paths = evidence.changedPaths
  const severities = evidence.reviewBlockingSeverities
  // An agent name that is blank, or the builder's under another case or padding, is not a reviewer.
  const reviewer = (evidence.reviewerAgent ?? '').trim().toLowerCase()
  const builder = evidence.builderAgent.trim().toLowerCase()
  return {
    exact_final_sha: exact && evidence.reviewedSha === sha && evidence.receiptSha === sha,
    clean_tree: exact && evidence.tree?.sha === sha && evidence.tree.porcelain === '',
    required_ci_green: exact && requiredChecksGreen(evidence.requiredChecks, evidence.checkRuns, sha),
    independent_review_pass:
      exact &&
      evidence.reviewVerdict === 'PASS' &&
      evidence.reviewedSha === sha &&
      AGENT_NAME.test(reviewer) &&
      AGENT_NAME.test(builder) &&
      reviewer !== builder,
    release_gate_pass: exact && evidence.receiptSha === sha,
    no_unresolved_p0_p1:
      exact && evidence.reviewedSha === sha && Array.isArray(severities) && severities.every((level) => NON_BLOCKING_SEVERITY.test(String(level).trim())),
    no_auth_security_credential_change: paths.length > 0 && protectedPathHits(paths).length === 0,
    no_destructive_migration: paths.length > 0 && !paths.some((path) => path.toLowerCase().split('/').includes('migrations')),
    no_new_spend: exact && evidence.spend?.sha === sha && evidence.spend.newCosts.length === 0,
    rollback_proven: exact && atSha(evidence.rollbackReceipt, sha),
    post_release_verification_defined: exact && atSha(evidence.postReleaseVerification, sha),
    infrastructure_semantics_match: exact && atSha(evidence.infrastructureReceipt, sha),
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
