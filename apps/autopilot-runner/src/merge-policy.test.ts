import { describe, it, expect } from 'vitest'
import { decideMerge, AUTONOMOUS_LABELS, type MergeContext } from './merge-policy'

/** A fully-cleared context: every safety condition met. */
const cleared: MergeContext = {
  ci: 'success',
  review: 'approved',
  labels: ['mesh:auto'],
  baseBranch: 'main',
  linearHistory: true,
  liveGate: true,
  authoredByRunner: true,
}

describe('decideMerge — the all-clear', () => {
  it('merges when every safety condition is met', () => {
    expect(decideMerge(cleared)).toEqual({ action: 'merge' })
  })

  it('accepts either autonomous-contract label', () => {
    for (const label of AUTONOMOUS_LABELS) {
      expect(decideMerge({ ...cleared, labels: [label] })).toEqual({ action: 'merge' })
    }
  })

  it('is case-insensitive on labels', () => {
    expect(decideMerge({ ...cleared, labels: ['MESH:AUTO'] })).toEqual({ action: 'merge' })
  })
})

describe('decideMerge — hard gates (fail closed to a human)', () => {
  const cases: Array<[string, Partial<MergeContext>, string]> = [
    ['kill switch off', { liveGate: false }, 'kill-switch-off'],
    ['not runner-authored', { authoredByRunner: false }, 'not-runner-authored'],
    ['wrong base branch', { baseBranch: 'develop' }, 'wrong-base'],
    ['no autonomous label', { labels: ['chore'] }, 'not-autonomous'],
    ['empty labels', { labels: [] }, 'not-autonomous'],
    ['non-linear history', { linearHistory: false }, 'non-linear-history'],
    ['CI failed', { ci: 'failure' }, 'ci-failed'],
    ['changes requested', { review: 'changes_requested' }, 'changes-requested'],
  ]

  it.each(cases)('leaves for human: %s', (_label, patch, reason) => {
    const decision = decideMerge({ ...cleared, ...patch })
    expect(decision.action).toBe('leave_for_human')
    expect(decision).toMatchObject({ reason })
  })
})

describe('decideMerge — transient waits', () => {
  it('waits while CI is pending', () => {
    expect(decideMerge({ ...cleared, ci: 'pending' })).toEqual({ action: 'wait', reason: 'ci-pending' })
  })

  it('waits while no review has been posted yet', () => {
    expect(decideMerge({ ...cleared, review: 'none' })).toEqual({ action: 'wait', reason: 'awaiting-review' })
  })
})

describe('decideMerge — precedence', () => {
  it('prefers a hard human gate over a transient wait', () => {
    // Kill switch off AND CI pending → the hard gate wins.
    expect(decideMerge({ ...cleared, liveGate: false, ci: 'pending' })).toEqual({
      action: 'leave_for_human',
      reason: 'kill-switch-off',
    })
  })

  it('never merges a changes_requested PR even with green CI', () => {
    expect(decideMerge({ ...cleared, review: 'changes_requested' }).action).toBe('leave_for_human')
  })
})
