import { describe, expect, it } from 'vitest'
import { isAwaitingVerification, wake } from '../../../../../../scripts/nexus-runner/wake.mjs'
import { parseOutcome } from '../../../../../../scripts/nexus-runner/runner.mjs'

// UNI-2779 (U6) — wake-ups without a webhook: (continuation, observed CI +
// review) → next continuation. A read that failed is never read as green.

const SHA = 'a'.repeat(40)
const AT = '2026-09-27T03:00:00.000Z'
const waiting = {
  mission_id: 'task-1', intent_hash: 'b'.repeat(64), authority_version: 'nexus-mission-authority/3', phase: 'BUILD_CONTINUE',
  status: 'active', candidate_sha: SHA, last_verified_sha: null, next_action: 'test', blocked_reason: null,
  attempt_count: 1, receipts: [], updated_at: '2026-09-27T02:00:00.000Z',
}
const green = [{ name: 'test', headSha: SHA, status: 'completed', conclusion: 'success' }, { name: 'lint', headSha: SHA, status: 'completed', conclusion: 'success' }]
const pass = { head_sha: SHA, verdict: 'PASS' }
const REQUIRED = ['test', 'lint']

describe('wake', () => {
  it('sends a failed check run to repair, counting the attempt and recording which check', () => {
    const out = wake(waiting, { checkRuns: [green[0], { name: 'lint', headSha: SHA, status: 'completed', conclusion: 'failure' }], review: pass, requiredChecks: REQUIRED }, AT)
    expect(out.changed).toBe(true)
    expect(out.continuation).toMatchObject({ next_action: 'repair', attempt_count: 2, phase: 'BUILD_CONTINUE' })
    expect(out.continuation.receipts.at(-1)).toEqual({ kind: 'ci_failed', ref: 'lint', sha: SHA, at: AT })
  })

  it('sends an independent review FAIL on this SHA to repair', () => {
    const out = wake(waiting, { checkRuns: green, review: { head_sha: SHA, verdict: 'FAIL' }, requiredChecks: REQUIRED }, AT)
    expect(out.continuation).toMatchObject({ next_action: 'repair', receipts: [{ kind: 'review_failed' }] })
  })

  it('advances to the release boundary only on green CI AND a PASS for this exact SHA', () => {
    const out = wake(waiting, { checkRuns: green, review: pass, requiredChecks: REQUIRED }, AT)
    expect(out.continuation).toMatchObject({ phase: 'RELEASE_CANDIDATE', next_action: 'mark_pr_ready', last_verified_sha: SHA })
    expect(isAwaitingVerification(out.continuation)).toBe(false)
  })

  it.each([
    ['check runs unreadable', { checkRuns: null, review: pass, requiredChecks: REQUIRED }],
    ['no check runs at all', { checkRuns: [], review: pass, requiredChecks: REQUIRED }],
    ['a check still running', { checkRuns: [{ name: 'test', headSha: SHA, status: 'in_progress', conclusion: null }], review: pass, requiredChecks: REQUIRED }],
    ['a required check marked success but still in progress', { checkRuns: [green[0], { name: 'lint', headSha: SHA, status: 'in_progress', conclusion: 'success' }], review: pass, requiredChecks: REQUIRED }],
    ['a skipped check', { checkRuns: [{ name: 'test', headSha: SHA, status: 'completed', conclusion: 'skipped' }], review: pass, requiredChecks: REQUIRED }],
    ['no review', { checkRuns: green, review: null, requiredChecks: REQUIRED }],
    ['a PASS for a different SHA', { checkRuns: green, review: { head_sha: 'f'.repeat(40), verdict: 'PASS' }, requiredChecks: REQUIRED }],
    ['green runs from another commit', { checkRuns: green.map((run) => ({ ...run, headSha: 'f'.repeat(40) })), review: pass, requiredChecks: REQUIRED }],
    ['green runs naming no commit', { checkRuns: green.map(({ headSha: _omit, ...run }) => run), review: pass, requiredChecks: REQUIRED }],
    ['only a non-required check green', { checkRuns: [{ name: 'trivial', headSha: SHA, status: 'completed', conclusion: 'success' }], review: pass, requiredChecks: REQUIRED }],
    ['one required check never ran', { checkRuns: [green[0]], review: pass, requiredChecks: REQUIRED }],
    ['required checks unknown', { checkRuns: green, review: pass, requiredChecks: null }],
    ['no required checks named', { checkRuns: green, review: pass, requiredChecks: [] }],
    ['required green but another check still running', { checkRuns: [...green, { name: 'e2e', headSha: SHA, status: 'in_progress', conclusion: null }], review: pass, requiredChecks: REQUIRED }],
    ['a failure on another commit, nothing on this one', { checkRuns: [{ name: 'lint', headSha: 'f'.repeat(40), status: 'completed', conclusion: 'failure' }], review: pass, requiredChecks: REQUIRED }],
  ])('keeps waiting on %s', (_label, observed) => {
    const out = wake(waiting, observed, AT)
    expect(out.changed).toBe(false)
    expect(out.continuation).toBe(waiting)
  })

  it('leaves a continuation that is not waiting on verification untouched', () => {
    const repairing = { ...waiting, next_action: 'repair' }
    expect(wake(repairing, { checkRuns: green, review: pass, requiredChecks: REQUIRED }, AT)).toMatchObject({ changed: false, continuation: repairing })
  })
})

describe('parseOutcome — no bare requeue-to-ask', () => {
  it('reads RUNNER_BLOCKED with a policy class and reason', () => {
    expect(parseOutcome('work…\nRUNNER_BLOCKED: LEGITIMATE_PROTECTED_BOUNDARY: next step is merge')).toEqual({
      kind: 'blocked', interruptionClass: 'LEGITIMATE_PROTECTED_BOUNDARY', reason: 'next step is merge',
    })
  })

  it('fails a RUNNER_BLOCKED whose class the policy does not name', () => {
    expect(parseOutcome('RUNNER_BLOCKED: ASK_FOUNDER: may I continue')).toEqual({ kind: 'failed', code: 'unknown_interruption_class' })
  })

  it('turns the legacy RUNNER_REQUEUE marker into a recorded OTHER interruption, never a silent requeue', () => {
    expect(parseOutcome('RUNNER_REQUEUE: too_big')).toEqual({ kind: 'blocked', interruptionClass: 'OTHER', reason: 'requeue_marker: too_big' })
  })
})
