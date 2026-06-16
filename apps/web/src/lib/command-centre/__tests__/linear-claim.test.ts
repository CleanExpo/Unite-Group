import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  claimNextEligibleIssue,
  selectNextClaimable,
  evaluateEligibility,
  hasAutonomousLabel,
  isEligibleState,
  isBlocked,
  hasAcceptanceCriteria,
  buildClaimReceipt,
  AUTONOMOUS_LABELS,
  BLOCKED_LABEL_PREFIX,
  type ClaimCandidate,
  type ClaimLoopDeps,
} from '@/lib/command-centre/linear-claim'

const ACCEPTANCE = '## Acceptance Criteria\n* A scheduled runner claims the next issue.'

function makeCandidate(overrides: Partial<ClaimCandidate> = {}): ClaimCandidate {
  return {
    id: 'uuid-1',
    identifier: 'UNI-1000',
    title: 'Do the autonomous thing',
    priority: 2,
    description: ACCEPTANCE,
    createdAt: '2026-06-16T07:48:00.000Z',
    url: 'https://linear.app/unite-group/issue/UNI-1000',
    stateName: 'Todo',
    stateType: 'unstarted',
    labels: ['pi-dev:autonomous'],
    blockedByOpenCount: 0,
    ...overrides,
  }
}

const originalEnv = process.env.CC_LINEAR_LIVE

beforeEach(() => {
  delete process.env.CC_LINEAR_LIVE
})

afterEach(() => {
  if (originalEnv === undefined) delete process.env.CC_LINEAR_LIVE
  else process.env.CC_LINEAR_LIVE = originalEnv
})

describe('predicates', () => {
  it('hasAutonomousLabel matches either contract label, case-insensitively', () => {
    expect(hasAutonomousLabel({ labels: ['pi-dev:autonomous'] })).toBe(true)
    expect(hasAutonomousLabel({ labels: ['MESH:AUTO'] })).toBe(true)
    expect(hasAutonomousLabel({ labels: ['production-readiness'] })).toBe(false)
    expect(hasAutonomousLabel({ labels: [] })).toBe(false)
    // Guard: the exported contract labels are exactly the two expected.
    expect([...AUTONOMOUS_LABELS]).toEqual(['mesh:auto', 'pi-dev:autonomous'])
  })

  it('isEligibleState only allows unstarted (Todo) and backlog', () => {
    expect(isEligibleState({ stateType: 'unstarted' })).toBe(true)
    expect(isEligibleState({ stateType: 'backlog' })).toBe(true)
    expect(isEligibleState({ stateType: 'started' })).toBe(false)
    expect(isEligibleState({ stateType: 'completed' })).toBe(false)
    expect(isEligibleState({ stateType: 'canceled' })).toBe(false)
  })

  it('isBlocked flags blocker-reason labels and open blockedBy relations', () => {
    expect(isBlocked({ labels: [`${BLOCKED_LABEL_PREFIX}credentials`], blockedByOpenCount: 0 })).toBe(true)
    expect(isBlocked({ labels: [`${BLOCKED_LABEL_PREFIX}external-dependency`], blockedByOpenCount: 0 })).toBe(true)
    expect(isBlocked({ labels: ['pi-dev:autonomous'], blockedByOpenCount: 1 })).toBe(true)
    expect(isBlocked({ labels: ['pi-dev:autonomous'], blockedByOpenCount: 0 })).toBe(false)
  })

  it('hasAcceptanceCriteria requires an Acceptance Criteria heading', () => {
    expect(hasAcceptanceCriteria({ description: ACCEPTANCE })).toBe(true)
    expect(hasAcceptanceCriteria({ description: 'acceptance criteria: ship it' })).toBe(true)
    expect(hasAcceptanceCriteria({ description: 'Just a description, no criteria.' })).toBe(false)
    expect(hasAcceptanceCriteria({ description: null })).toBe(false)
  })
})

describe('evaluateEligibility — claim filtering', () => {
  it('accepts a well-formed autonomous Todo with acceptance criteria', () => {
    expect(evaluateEligibility(makeCandidate())).toEqual({ claimable: true, reason: 'eligible' })
  })

  it('rejects issues without an autonomous label', () => {
    expect(evaluateEligibility(makeCandidate({ labels: ['production-readiness'] })))
      .toEqual({ claimable: false, reason: 'not-autonomous' })
  })

  it('rejects issues not in Todo/Backlog', () => {
    expect(evaluateEligibility(makeCandidate({ stateType: 'started', stateName: 'In Progress' })))
      .toEqual({ claimable: false, reason: 'ineligible-state' })
  })

  it('rejects credential/external-dependency blocked issues', () => {
    expect(evaluateEligibility(makeCandidate({ labels: ['pi-dev:autonomous', `${BLOCKED_LABEL_PREFIX}credentials`] })))
      .toEqual({ claimable: false, reason: 'blocked' })
  })

  it('rejects issues with no acceptance criteria', () => {
    expect(evaluateEligibility(makeCandidate({ description: 'No criteria here.' })))
      .toEqual({ claimable: false, reason: 'no-acceptance-criteria' })
  })
})

describe('selectNextClaimable — prioritisation', () => {
  it('picks the highest priority claimable issue (Urgent over High)', () => {
    const urgent = makeCandidate({ identifier: 'UNI-2143', priority: 1 })
    const high = makeCandidate({ identifier: 'UNI-2145', priority: 3 })
    const result = selectNextClaimable([high, urgent])
    expect(result.next?.identifier).toBe('UNI-2143')
    expect(result.eligibleCount).toBe(2)
  })

  it('breaks ties by oldest createdAt (FIFO)', () => {
    const older = makeCandidate({ identifier: 'UNI-A', priority: 2, createdAt: '2026-06-16T07:00:00.000Z' })
    const newer = makeCandidate({ identifier: 'UNI-B', priority: 2, createdAt: '2026-06-16T09:00:00.000Z' })
    expect(selectNextClaimable([newer, older]).next?.identifier).toBe('UNI-A')
  })

  it('ranks "no priority" (0) last', () => {
    const none = makeCandidate({ identifier: 'UNI-NONE', priority: 0 })
    const low = makeCandidate({ identifier: 'UNI-LOW', priority: 4 })
    expect(selectNextClaimable([none, low]).next?.identifier).toBe('UNI-LOW')
  })

  it('records skip reasons for the non-claimable issues', () => {
    const good = makeCandidate({ identifier: 'UNI-GOOD' })
    const blocked = makeCandidate({ identifier: 'UNI-BLK', labels: ['pi-dev:autonomous', `${BLOCKED_LABEL_PREFIX}credentials`] })
    const result = selectNextClaimable([good, blocked])
    expect(result.next?.identifier).toBe('UNI-GOOD')
    expect(result.skipped).toEqual([{ identifier: 'UNI-BLK', reason: 'blocked' }])
  })
})

describe('buildClaimReceipt', () => {
  it('writes a receipt with the transition and no secret values', () => {
    const receipt = buildClaimReceipt(makeCandidate({ stateName: 'Todo', priority: 1 }), {
      runner: 'pi-dev-autopilot',
      runId: 'claim-test-1',
      at: '2026-06-16T08:00:00.000Z',
    })
    expect(receipt).toContain('Claimed by pi-dev-autopilot')
    expect(receipt).toContain('UNI-2143')
    expect(receipt).toContain('Todo → In Progress')
    expect(receipt).toContain('claim-test-1')
    expect(receipt).toContain('Priority: Urgent')
  })
})

describe('claimNextEligibleIssue — orchestration', () => {
  function makeDeps(candidates: ClaimCandidate[]): ClaimLoopDeps & {
    moveToInProgress: ReturnType<typeof vi.fn>
    postComment: ReturnType<typeof vi.fn>
  } {
    return {
      listCandidates: vi.fn(async () => candidates),
      moveToInProgress: vi.fn(async () => {}),
      postComment: vi.fn(async () => {}),
    }
  }

  const fixedNow = () => '2026-06-16T08:00:00.000Z'

  it('DRY-RUN by default: selects + builds receipt, makes NO mutating call', async () => {
    const deps = makeDeps([makeCandidate({ identifier: 'UNI-2143', priority: 1 })])
    const result = await claimNextEligibleIssue(deps, { now: fixedNow })

    expect(result.mode).toBe('dry-run')
    expect(result.stop_reason).toBe('dry-run')
    expect(result.claimed).toBeNull()
    expect(result.receipt).toContain('UNI-2143')
    expect(result.eligible_total).toBe(1)
    expect(deps.moveToInProgress).not.toHaveBeenCalled()
    expect(deps.postComment).not.toHaveBeenCalled()
  })

  it('no-work exit: returns no-eligible-work and makes no call when nothing is claimable', async () => {
    process.env.CC_LINEAR_LIVE = '1'
    const deps = makeDeps([
      makeCandidate({ identifier: 'UNI-BLK', labels: ['pi-dev:autonomous', `${BLOCKED_LABEL_PREFIX}credentials`] }),
      makeCandidate({ identifier: 'UNI-NOLABEL', labels: ['production-readiness'] }),
    ])
    const result = await claimNextEligibleIssue(deps, { live: true, now: fixedNow })

    expect(result.stop_reason).toBe('no-eligible-work')
    expect(result.claimed).toBeNull()
    expect(result.eligible_total).toBe(0)
    expect(result.skipped).toHaveLength(2)
    expect(deps.moveToInProgress).not.toHaveBeenCalled()
    expect(deps.postComment).not.toHaveBeenCalled()
  })

  it('stays dry-run when live:true but the env flag is NOT set', async () => {
    delete process.env.CC_LINEAR_LIVE
    const deps = makeDeps([makeCandidate()])
    const result = await claimNextEligibleIssue(deps, { live: true, now: fixedNow })

    expect(result.mode).toBe('dry-run')
    expect(deps.moveToInProgress).not.toHaveBeenCalled()
  })

  it('stays dry-run when env flag set but live NOT requested', async () => {
    process.env.CC_LINEAR_LIVE = '1'
    const deps = makeDeps([makeCandidate()])
    const result = await claimNextEligibleIssue(deps, { now: fixedNow })

    expect(result.mode).toBe('dry-run')
    expect(deps.moveToInProgress).not.toHaveBeenCalled()
  })

  it('LIVE path (both gates): moves to In Progress THEN writes the claim receipt', async () => {
    process.env.CC_LINEAR_LIVE = '1'
    const issue = makeCandidate({ id: 'uuid-9', identifier: 'UNI-2143', priority: 1 })
    const deps = makeDeps([issue])
    const result = await claimNextEligibleIssue(deps, { live: true, runner: 'pi-dev-autopilot', runId: 'run-1', now: fixedNow })

    expect(result.mode).toBe('live')
    expect(result.stop_reason).toBe('claimed')
    expect(result.claimed).toEqual({
      id: 'uuid-9',
      identifier: 'UNI-2143',
      title: issue.title,
      url: issue.url,
      from_state: 'Todo',
    })
    expect(deps.moveToInProgress).toHaveBeenCalledOnce()
    expect(deps.moveToInProgress).toHaveBeenCalledWith('uuid-9')
    expect(deps.postComment).toHaveBeenCalledOnce()
    expect(deps.postComment.mock.calls[0][0]).toBe('uuid-9')
    expect(deps.postComment.mock.calls[0][1]).toContain('Claimed by pi-dev-autopilot')

    // Ordering: state moves before the receipt is written.
    const moveOrder = deps.moveToInProgress.mock.invocationCallOrder[0]
    const commentOrder = deps.postComment.mock.invocationCallOrder[0]
    expect(moveOrder).toBeLessThan(commentOrder)
  })

  it('claims exactly ONE issue even when several are eligible', async () => {
    process.env.CC_LINEAR_LIVE = '1'
    const deps = makeDeps([
      makeCandidate({ id: 'u1', identifier: 'UNI-1', priority: 2 }),
      makeCandidate({ id: 'u2', identifier: 'UNI-2', priority: 1 }),
      makeCandidate({ id: 'u3', identifier: 'UNI-3', priority: 3 }),
    ])
    const result = await claimNextEligibleIssue(deps, { live: true, now: fixedNow })

    expect(result.claimed?.identifier).toBe('UNI-2') // urgent
    expect(deps.moveToInProgress).toHaveBeenCalledOnce()
    expect(deps.postComment).toHaveBeenCalledOnce()
  })

  it('idempotency: an already-claimed (In Progress) issue is not re-claimed', async () => {
    process.env.CC_LINEAR_LIVE = '1'
    // Simulate a second run after the first claim moved UNI-2 to "In Progress".
    const deps = makeDeps([
      makeCandidate({ id: 'u2', identifier: 'UNI-2', stateType: 'started', stateName: 'In Progress', priority: 1 }),
      makeCandidate({ id: 'u3', identifier: 'UNI-3', priority: 3 }),
    ])
    const result = await claimNextEligibleIssue(deps, { live: true, now: fixedNow })

    expect(result.claimed?.identifier).toBe('UNI-3') // not the already-started UNI-2
    expect(result.skipped).toContainEqual({ identifier: 'UNI-2', reason: 'ineligible-state' })
    expect(deps.moveToInProgress).toHaveBeenCalledOnce()
    expect(deps.moveToInProgress).toHaveBeenCalledWith('u3')
  })
})
