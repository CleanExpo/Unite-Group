import { describe, expect, it, vi } from 'vitest'
import type { MissionAuthority } from '../may'

// may() is replaced by one that always continues, standing in for a policy whose
// gate list lost no_auth_security_credential_change. Only classifyRelease's own
// protected-path check is left between a protected path and a SAFE_RELEASE merge.
vi.mock('../may', () => ({
  may: () => ({ verdict: 'continue', boundary: 'SAFE_RELEASE', reason: 'mocked: every gate passed' }),
}))

const { classifyRelease } = await import('../release-controller')

const SHA = 'c'.repeat(40)
const MISSION = { missionId: 'mission-belt' } as MissionAuthority

function input(changedPaths: string[], action = 'merge') {
  return {
    mission: MISSION,
    actor: 'runner',
    action,
    risk: 'low' as const,
    phase: 'RELEASE_CANDIDATE',
    now: 0,
    evidence: {
      candidateSha: SHA,
      tree: null,
      reviewedSha: null,
      reviewVerdict: null,
      reviewerAgent: null,
      builderAgent: 'claude',
      receiptSha: null,
      requiredChecks: [],
      checkRuns: [],
      changedPaths,
      reviewBlockingSeverities: null,
      spend: null,
      rollbackReceipt: null,
      postReleaseVerification: null,
      infrastructureReceipt: null,
    },
  }
}

describe('release controller — protected paths escalate even when may() continues', () => {
  it('a protected path escalates to PROTECTED_RELEASE with no executor', () => {
    const decision = classifyRelease(input(['apps/web/src/lib/auth/session.ts', 'apps/web/src/lib/release-canary.ts']))
    expect(decision).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE', protectedPaths: ['apps/web/src/lib/auth/session.ts'] })
    expect(decision.reason).toContain('apps/web/src/lib/auth/session.ts')
    expect(decision.executor).toBeUndefined()
  })

  it('without a protected path the continued merge goes to the Board release controller', () => {
    expect(classifyRelease(input(['apps/web/src/lib/release-canary.ts']))).toMatchObject({
      verdict: 'continue',
      boundary: 'SAFE_RELEASE',
      executor: 'board_release_controller',
      protectedPaths: [],
    })
  })

  it('a continued action other than merge is never handed to the Board release controller', () => {
    const decision = classifyRelease(input(['apps/web/src/lib/release-canary.ts'], 'mark_pr_ready'))
    expect(decision).toMatchObject({ verdict: 'continue' })
    expect(decision.executor).toBeUndefined()
  })
})
