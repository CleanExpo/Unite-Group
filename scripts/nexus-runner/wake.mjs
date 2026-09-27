// scripts/nexus-runner/wake.mjs
//
// UNI-2779 (U6) — wake-ups without a webhook. No GitHub webhook targets this
// app, and adding one is a protected repository-settings change, so the runner
// polls instead: while a mission's candidate SHA waits on CI and review, it
// reads the check runs for that SHA and the independent review report, and this
// pure function turns (continuation, observed results) into the next
// continuation. Same inputs, same output; no clock, no I/O.
//
// A read that failed is passed in as null and is NEVER read as green: an
// unknown check-run list or a missing review keeps the mission waiting.

/** The next_action a mission holds while its candidate waits on CI and review. */
export const VERIFY_ACTION = 'test'
/** The first release step after verification. A SAFE_RELEASE action: may() decides, not the runner. */
export const VERIFIED_NEXT_ACTION = 'mark_pr_ready'
export const REPAIR_ACTION = 'repair'
const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure', 'stale'])
const MAX_RECEIPTS = 200

export function isAwaitingVerification(c) {
  return !!c && c.status === 'active' && typeof c.candidate_sha === 'string' && c.candidate_sha.length > 0 &&
    c.candidate_sha !== c.last_verified_sha && c.next_action === VERIFY_ACTION
}

const withReceipts = (c, receipts) => [...(Array.isArray(c.receipts) ? c.receipts : []), ...receipts].slice(-MAX_RECEIPTS)

// Same positive tests as the release controller, so the two deciders agree.
const NON_BLOCKING_SEVERITY = /^P[2-9]$/i
const AGENT_NAME = /^[a-z0-9][a-z0-9._:-]{0,127}$/
const isText = (value) => typeof value === 'string'
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Check every observed value against its declared shape once, before any decision.
 * A value of the wrong shape is unread (null), never coerced and never thrown on:
 * one malformed check run makes the whole list unreadable, so the mission waits.
 */
export function parseObserved(observed) {
  const o = isRecord(observed) ? observed : {}
  const runs = Array.isArray(o.checkRuns) &&
    o.checkRuns.every((run) => isRecord(run) && isText(run.name) && isText(run.headSha) && isText(run.status) &&
      (run.conclusion === null || isText(run.conclusion)))
    ? o.checkRuns.map(({ name, headSha, status, conclusion }) => ({ name, headSha, status, conclusion }))
    : null
  const requiredChecks = Array.isArray(o.requiredChecks) && o.requiredChecks.every(isText) ? [...o.requiredChecks] : null
  const r = o.review
  const findings = isRecord(r) && Array.isArray(r.blocking_findings) && r.blocking_findings.every(isRecord)
    ? r.blocking_findings
    : null
  const review = isRecord(r) && isText(r.head_sha) && isText(r.verdict)
    ? {
        head_sha: r.head_sha,
        verdict: r.verdict,
        reviewer_agent: isText(r.reviewer_agent) ? r.reviewer_agent : null,
        implementation_agent: isText(r.implementation_agent) ? r.implementation_agent : null,
        severities: findings && findings.every((f) => isText(f.severity)) ? findings.map((f) => f.severity) : null,
      }
    : null
  return { checkRuns: runs, requiredChecks, review }
}

/** A PASS proves the review gate only as the release controller reads it: independent, no P0/P1 left. */
function reviewProves(review) {
  if (review?.verdict !== 'PASS' || !review.severities) return false
  const reviewer = (review.reviewer_agent ?? '').trim().toLowerCase()
  const builder = (review.implementation_agent ?? '').trim().toLowerCase()
  return AGENT_NAME.test(reviewer) && AGENT_NAME.test(builder) && reviewer !== builder &&
    review.severities.every((level) => NON_BLOCKING_SEVERITY.test(level.trim()))
}

/**
 * @param {object} c the stored continuation (updated_at is carried through untouched)
 * @param {{ checkRuns: Array<{name: string, headSha: string, status: string, conclusion: string|null}> | null,
 *           requiredChecks: string[] | null,
 *           review: { head_sha: string, verdict: string, reviewer_agent: string,
 *                     implementation_agent: string, blocking_findings: Array<{severity: string}> } | null }} observed
 *   review: the reviewer's report as written (schema 2). Every field is shape-checked by parseObserved
 *   requiredChecks: the check-run names the base branch requires. null or empty keeps
 *   the mission waiting: green is only ever "every required check passed on this SHA"
 * @param {string} at ISO timestamp for any receipt written
 * @returns {{ changed: boolean, reason: string, continuation: object }}
 */
export function wake(c, observed, at) {
  if (!isAwaitingVerification(c)) return { changed: false, reason: 'not awaiting verification', continuation: c }
  const sha = c.candidate_sha
  const parsed = parseObserved(observed)
  const runs = parsed.checkRuns
  // A review for any other SHA says nothing about this candidate.
  const review = parsed.review?.head_sha === sha ? parsed.review : null

  // Only a run GitHub reports on this candidate speaks for it: a result for another
  // commit, or one naming no commit, neither fails nor passes this SHA.
  const failedRuns = (runs ?? []).filter(
    (run) => run.headSha === sha && run.status === 'completed' && FAILED_CONCLUSIONS.has(run.conclusion),
  )
  if (failedRuns.length || review?.verdict === 'FAIL') {
    const receipt = failedRuns.length
      ? { kind: 'ci_failed', ref: failedRuns.map((run) => run.name).join(', ').slice(0, 512) || 'check run', sha, at }
      : { kind: 'review_failed', ref: 'independent_review', sha, at }
    return {
      changed: true,
      reason: failedRuns.length ? `CI failed on ${sha}` : `independent review returned FAIL on ${sha}`,
      continuation: {
        ...c,
        phase: 'BUILD_CONTINUE',
        next_action: REPAIR_ACTION,
        attempt_count: c.attempt_count + 1,
        receipts: withReceipts(c, [receipt]),
      },
    }
  }

  const required = parsed.requiredChecks
  // A required name must name something: a blank one would match a blank-named run.
  // Same positive test as the release controller's RECEIPT_REF (UNI-2782).
  const namesSomething = (name) => typeof name === 'string' && /[a-z0-9]/i.test(name)
  const passed = (run) => run.headSha === sha && run.status === 'completed' && run.conclusion === 'success'
  // Every required check has a run on this SHA and all of them passed, and nothing else
  // observed on this SHA is still running or failed: a trivial green check is not CI.
  const requiredGreen =
    !!runs && !!required && required.length > 0 && required.every(namesSomething) &&
    required.every((name) => {
      const named = runs.filter((run) => run.name === name)
      return named.length > 0 && named.every(passed)
    })
  const ciGreen = requiredGreen && runs.every(passed)
  if (ciGreen && reviewProves(review)) {
    return {
      changed: true,
      reason: `CI green and independent review PASS on ${sha}`,
      continuation: {
        ...c,
        phase: 'RELEASE_CANDIDATE',
        next_action: VERIFIED_NEXT_ACTION,
        last_verified_sha: sha,
        receipts: withReceipts(c, [
          { kind: 'ci_green', ref: `${runs.length} check run(s)`, sha, at },
          { kind: 'review_pass', ref: 'independent_review', sha, at },
        ]),
      },
    }
  }

  const waitingOn = [
    runs === null ? 'check runs unreadable' : null,
    !required || required.length === 0 ? 'required checks unknown' : null,
    runs !== null && required?.length && !ciGreen ? 'CI not green yet' : null,
    review ? null : 'no review for this SHA',
    review && !reviewProves(review) ? 'review does not prove an independent PASS with no P0/P1' : null,
  ]
    .filter(Boolean)
    .join('; ')
  return { changed: false, reason: `waiting: ${waitingOn}`, continuation: c }
}
