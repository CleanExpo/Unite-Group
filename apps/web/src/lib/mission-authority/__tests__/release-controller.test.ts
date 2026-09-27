import { describe, expect, it } from 'vitest'
import policy from '../../../../../../scripts/nexus-runner/mission-authority.json'
import type { MissionAuthority } from '../may'
import { classifyRelease, deriveGates, protectedPathHits, type ReleaseEvidence, type ReleaseInput } from '../release-controller'

const SHA = 'c'.repeat(40)
const REQUIRED = ['apps/web — lint, type-check, test, build', 'gitleaks — secret scan (git commits)']

const MISSION: MissionAuthority = {
  missionId: 'mission-canary',
  intentHash: 'a'.repeat(64),
  intentVersion: 1,
  admissionReceipt: 'approval-1',
  authorityVersion: policy.schema,
  allowedActions: Object.keys(policy.build),
  releaseMandate: { classes: ['merge'], maxRisk: 'low' },
  expiresAt: '2099-01-01T00:00:00.000Z',
  revokedAt: null,
}

function evidence(overrides: Partial<ReleaseEvidence> = {}): ReleaseEvidence {
  return {
    candidateSha: SHA,
    tree: { sha: SHA, porcelain: '' },
    reviewedSha: SHA,
    reviewVerdict: 'PASS',
    reviewerAgent: 'cursor',
    builderAgent: 'claude',
    receiptSha: SHA,
    requiredChecks: REQUIRED,
    checkRuns: REQUIRED.map((name) => ({ name, status: 'completed', conclusion: 'success' })),
    changedPaths: ['apps/web/src/lib/release-canary.ts'],
    reviewBlockingSeverities: [],
    spend: { sha: SHA, newCosts: [] },
    rollbackReceipt: { sha: SHA, ref: 'vercel promote dpl_previous (rehearsed)' },
    postReleaseVerification: { sha: SHA, ref: 'unite-group.in alias unchanged; /api/health 200' },
    infrastructureReceipt: { sha: SHA, ref: 'autoAssignCustomDomains=false read back' },
    ...overrides,
  }
}

function input(overrides: Partial<ReleaseInput> = {}): ReleaseInput {
  return { mission: MISSION, actor: 'runner', action: 'merge', risk: 'low', phase: 'RELEASE_CANDIDATE', evidence: evidence(), now: 0, ...overrides }
}

describe('release controller — gates are derived from evidence', () => {
  it('a fully evidenced low-risk canary merge continues, executed by the Board release controller', () => {
    const decision = classifyRelease(input())
    expect(decision).toMatchObject({ verdict: 'continue', boundary: 'SAFE_RELEASE', executor: 'board_release_controller' })
    expect(Object.values(decision.gates).every(Boolean)).toBe(true)
  })

  it.each([
    ['review on another SHA', { reviewedSha: 'd'.repeat(40) }, ['exact_final_sha', 'independent_review_pass', 'no_unresolved_p0_p1']],
    ['reviewer is the builder', { reviewerAgent: 'claude' }, ['independent_review_pass']],
    ['review verdict FAIL', { reviewVerdict: 'FAIL' }, ['independent_review_pass']],
    ['no reviewer named', { reviewerAgent: null }, ['independent_review_pass']],
    ['a lower-case p0 left in the review report', { reviewBlockingSeverities: ['p0'] }, ['no_unresolved_p0_p1']],
    ['no receipt status on the head', { receiptSha: null }, ['exact_final_sha', 'release_gate_pass']],
    ['a required check skipped', { checkRuns: [{ name: REQUIRED[0], status: 'completed', conclusion: 'skipped' }, { name: REQUIRED[1], status: 'completed', conclusion: 'success' }] }, ['required_ci_green']],
    ['a required check never ran', { checkRuns: [{ name: REQUIRED[0], status: 'completed', conclusion: 'success' }] }, ['required_ci_green']],
    ['a dirty tree', { tree: { sha: SHA, porcelain: ' M apps/web/x.ts' } }, ['clean_tree']],
    ['tree status from another SHA', { tree: { sha: 'd'.repeat(40), porcelain: '' } }, ['clean_tree']],
    ['tree status never captured', { tree: null }, ['clean_tree']],
    ['a P1 left in the review report', { reviewBlockingSeverities: ['P2', 'P1'] }, ['no_unresolved_p0_p1']],
    ['review report never read', { reviewBlockingSeverities: null }, ['no_unresolved_p0_p1']],
    ['spend never scanned', { spend: null }, ['no_new_spend']],
    ['spend scanned on another SHA', { spend: { sha: 'd'.repeat(40), newCosts: [] } }, ['no_new_spend']],
    ['a new cost found', { spend: { sha: SHA, newCosts: ['vercel cron every minute'] } }, ['no_new_spend']],
    ['no rollback receipt', { rollbackReceipt: null }, ['rollback_proven']],
    ['rollback receipt for another SHA', { rollbackReceipt: { sha: 'd'.repeat(40), ref: 'receipt for another commit' } }, ['rollback_proven']],
    ['empty rollback receipt', { rollbackReceipt: { sha: SHA, ref: '  ' } }, ['rollback_proven']],
    ['post-release check for another SHA', { postReleaseVerification: { sha: 'd'.repeat(40), ref: 'receipt for another commit' } }, ['post_release_verification_defined']],
    ['infrastructure receipt for another SHA', { infrastructureReceipt: { sha: 'd'.repeat(40), ref: 'receipt for another commit' } }, ['infrastructure_semantics_match']],
    ['no changed paths collected', { changedPaths: [] }, ['no_auth_security_credential_change', 'no_destructive_migration']],
    ['a migration in the diff', { changedPaths: ['apps/web/supabase/migrations/2026_x.sql'] }, ['no_destructive_migration', 'no_auth_security_credential_change']],
  ] as const)('%s → that gate fails and the release escalates', (_label, override, failing) => {
    const gates = deriveGates(evidence(override as Partial<ReleaseEvidence>))
    for (const gate of failing) expect(gates[gate], gate).toBe(false)
    expect(classifyRelease(input({ evidence: evidence(override as Partial<ReleaseEvidence>) }))).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE' })
  })

  it('a candidate that is not a full 40-hex SHA fails every SHA-bound gate, even when all artefacts name it', () => {
    const ref = 'HEAD'
    const gates = deriveGates(evidence({
      candidateSha: ref,
      reviewedSha: ref,
      receiptSha: ref,
      tree: { sha: ref, porcelain: '' },
      spend: { sha: ref, newCosts: [] },
      rollbackReceipt: { sha: ref, ref: 'rollback' },
      postReleaseVerification: { sha: ref, ref: 'post-release' },
      infrastructureReceipt: { sha: ref, ref: 'infrastructure' },
    }))
    for (const gate of ['exact_final_sha', 'clean_tree', 'required_ci_green', 'release_gate_pass', 'no_unresolved_p0_p1',
      'no_new_spend', 'rollback_proven', 'post_release_verification_defined', 'infrastructure_semantics_match']) {
      expect(gates[gate], gate).toBe(false)
    }
  })

  it('an empty required-check list never counts as green', () => {
    expect(deriveGates(evidence({ requiredChecks: [] })).required_ci_green).toBe(false)
  })

  it('protected paths escalate whatever the gates say', () => {
    for (const path of ['apps/web/src/lib/auth/session.ts', '.github/workflows/ci.yml', 'scripts/nexus-runner/mission-authority.json', 'apps/web/.env.production', 'docs/constitution/x.md', 'apps/web/src/proxy.ts']) {
      expect(protectedPathHits([path]), path).toEqual([path])
      expect(classifyRelease(input({ evidence: evidence({ changedPaths: [path] }) })), path).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE' })
    }
    expect(protectedPathHits(['apps/web/src/lib/release-canary.ts', 'apps/web/src/components/author-card.tsx'])).toEqual([])
  })

  it('production promotion is PROTECTED even with every gate proven and a mandate naming it', () => {
    const mission = { ...MISSION, releaseMandate: { classes: ['merge', 'promote_production'], maxRisk: 'low' as const } }
    const decision = classifyRelease(input({ mission, action: 'promote_production' }))
    expect(decision).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE' })
    expect(decision.founderPacket).toContain('promote_production')
    expect(decision.executor).toBeUndefined()
  })
})
