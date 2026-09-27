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

/**
 * @param {object} c the stored continuation (updated_at is carried through untouched)
 * @param {{ checkRuns: Array<{name: string, headSha: string, status: string, conclusion: string|null}> | null,
 *           review: { head_sha: string, verdict: string } | null }} observed
 * @param {string} at ISO timestamp for any receipt written
 * @returns {{ changed: boolean, reason: string, continuation: object }}
 */
export function wake(c, observed, at) {
  if (!isAwaitingVerification(c)) return { changed: false, reason: 'not awaiting verification', continuation: c }
  const sha = c.candidate_sha
  const runs = Array.isArray(observed?.checkRuns) ? observed.checkRuns : null
  // A review for any other SHA says nothing about this candidate.
  const review = observed?.review && observed.review.head_sha === sha ? observed.review : null

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

  const ciGreen =
    !!runs && runs.length > 0 && runs.every((run) => run.headSha === sha && run.status === 'completed' && run.conclusion === 'success')
  if (ciGreen && review?.verdict === 'PASS') {
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

  const waitingOn = [runs === null ? 'check runs unreadable' : !ciGreen ? 'CI not green yet' : null, review ? null : 'no review for this SHA']
    .filter(Boolean)
    .join('; ')
  return { changed: false, reason: `waiting: ${waitingOn}`, continuation: c }
}
