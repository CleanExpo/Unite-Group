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
    checkRuns: REQUIRED.map((name) => ({ name, headSha: SHA, status: 'completed', conclusion: 'success' })),
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
    ['a blank reviewer name', { reviewerAgent: ' \t\n' }, ['independent_review_pass']],
    ['the builder under another case and padding', { reviewerAgent: ' Claude ' }, ['independent_review_pass']],
    ['a reviewer name made of \u200b', { reviewerAgent: '\u200b' }, ['independent_review_pass']],
    ['a reviewer name made of \u200c', { reviewerAgent: '\u200c' }, ['independent_review_pass']],
    ['a reviewer name made of \u200d', { reviewerAgent: '\u200d' }, ['independent_review_pass']],
    ['a reviewer name made of \u180e', { reviewerAgent: '\u180e' }, ['independent_review_pass']],
    ['a builder name made of \u200b', { builderAgent: '\u200b' }, ['independent_review_pass']],
    ['the builder hidden behind a zero-width space', { reviewerAgent: 'claude\u200b' }, ['independent_review_pass']],
    ['a reviewer name made of a Hangul filler', { reviewerAgent: '\u3164' }, ['independent_review_pass']],
    ['a rollbackReceipt ref of invisible characters (\u200b)', { rollbackReceipt: { sha: SHA, ref: '\u200b' } }, ['rollback_proven']],
    ['a rollbackReceipt ref of invisible characters (\u200d \u180e)', { rollbackReceipt: { sha: SHA, ref: '\u200d \u180e' } }, ['rollback_proven']],
    ['a rollbackReceipt ref of invisible characters (\u2800)', { rollbackReceipt: { sha: SHA, ref: '\u2800' } }, ['rollback_proven']],
    ['a postReleaseVerification ref of invisible characters (\u200b)', { postReleaseVerification: { sha: SHA, ref: '\u200b' } }, ['post_release_verification_defined']],
    ['a postReleaseVerification ref of invisible characters (\u200d \u180e)', { postReleaseVerification: { sha: SHA, ref: '\u200d \u180e' } }, ['post_release_verification_defined']],
    ['a postReleaseVerification ref of invisible characters (\u2800)', { postReleaseVerification: { sha: SHA, ref: '\u2800' } }, ['post_release_verification_defined']],
    ['a infrastructureReceipt ref of invisible characters (\u200b)', { infrastructureReceipt: { sha: SHA, ref: '\u200b' } }, ['infrastructure_semantics_match']],
    ['a infrastructureReceipt ref of invisible characters (\u200d \u180e)', { infrastructureReceipt: { sha: SHA, ref: '\u200d \u180e' } }, ['infrastructure_semantics_match']],
    ['a infrastructureReceipt ref of invisible characters (\u2800)', { infrastructureReceipt: { sha: SHA, ref: '\u2800' } }, ['infrastructure_semantics_match']],
    ['a rollbackReceipt ref of combining or ignorable marks (\u034f)', { rollbackReceipt: { sha: SHA, ref: '\u034f' } }, ['rollback_proven']],
    ['a rollbackReceipt ref of combining or ignorable marks (\ufe0f)', { rollbackReceipt: { sha: SHA, ref: '\ufe0f' } }, ['rollback_proven']],
    ['a rollbackReceipt ref of combining or ignorable marks (\u17b4)', { rollbackReceipt: { sha: SHA, ref: '\u17b4' } }, ['rollback_proven']],
    ['a rollbackReceipt ref of combining or ignorable marks (\u200b\u034f)', { rollbackReceipt: { sha: SHA, ref: '\u200b\u034f' } }, ['rollback_proven']],
    ['a rollbackReceipt ref of combining or ignorable marks (\ufe0e)', { rollbackReceipt: { sha: SHA, ref: '\ufe0e' } }, ['rollback_proven']],
    ['a rollbackReceipt ref of punctuation only', { rollbackReceipt: { sha: SHA, ref: '-- . --' } }, ['rollback_proven']],
    ['a postReleaseVerification ref of combining or ignorable marks (\u034f)', { postReleaseVerification: { sha: SHA, ref: '\u034f' } }, ['post_release_verification_defined']],
    ['a postReleaseVerification ref of combining or ignorable marks (\ufe0f)', { postReleaseVerification: { sha: SHA, ref: '\ufe0f' } }, ['post_release_verification_defined']],
    ['a postReleaseVerification ref of combining or ignorable marks (\u17b4)', { postReleaseVerification: { sha: SHA, ref: '\u17b4' } }, ['post_release_verification_defined']],
    ['a postReleaseVerification ref of combining or ignorable marks (\u200b\u034f)', { postReleaseVerification: { sha: SHA, ref: '\u200b\u034f' } }, ['post_release_verification_defined']],
    ['a postReleaseVerification ref of combining or ignorable marks (\ufe0e)', { postReleaseVerification: { sha: SHA, ref: '\ufe0e' } }, ['post_release_verification_defined']],
    ['a postReleaseVerification ref of punctuation only', { postReleaseVerification: { sha: SHA, ref: '-- . --' } }, ['post_release_verification_defined']],
    ['a infrastructureReceipt ref of combining or ignorable marks (\u034f)', { infrastructureReceipt: { sha: SHA, ref: '\u034f' } }, ['infrastructure_semantics_match']],
    ['a infrastructureReceipt ref of combining or ignorable marks (\ufe0f)', { infrastructureReceipt: { sha: SHA, ref: '\ufe0f' } }, ['infrastructure_semantics_match']],
    ['a infrastructureReceipt ref of combining or ignorable marks (\u17b4)', { infrastructureReceipt: { sha: SHA, ref: '\u17b4' } }, ['infrastructure_semantics_match']],
    ['a infrastructureReceipt ref of combining or ignorable marks (\u200b\u034f)', { infrastructureReceipt: { sha: SHA, ref: '\u200b\u034f' } }, ['infrastructure_semantics_match']],
    ['a infrastructureReceipt ref of combining or ignorable marks (\ufe0e)', { infrastructureReceipt: { sha: SHA, ref: '\ufe0e' } }, ['infrastructure_semantics_match']],
    ['a infrastructureReceipt ref of punctuation only', { infrastructureReceipt: { sha: SHA, ref: '-- . --' } }, ['infrastructure_semantics_match']],
    ['a blank builder name', { builderAgent: '  ' }, ['independent_review_pass']],
    ['a lower-case p0 left in the review report', { reviewBlockingSeverities: ['p0'] }, ['no_unresolved_p0_p1']],
    ['no receipt status on the head', { receiptSha: null }, ['exact_final_sha', 'release_gate_pass']],
    ['a required check skipped', { checkRuns: [{ name: REQUIRED[0], headSha: SHA, status: 'completed', conclusion: 'skipped' }, { name: REQUIRED[1], headSha: SHA, status: 'completed', conclusion: 'success' }] }, ['required_ci_green']],
    ['a required check still in progress', { checkRuns: [{ name: REQUIRED[0], headSha: SHA, status: 'in_progress', conclusion: 'success' }, { name: REQUIRED[1], headSha: SHA, status: 'completed', conclusion: 'success' }] }, ['required_ci_green']],
    ['a required check green on another SHA', { checkRuns: [{ name: REQUIRED[0], headSha: 'd'.repeat(40), status: 'completed', conclusion: 'success' }, { name: REQUIRED[1], headSha: SHA, status: 'completed', conclusion: 'success' }] }, ['required_ci_green']],
    ['a required check never ran', { checkRuns: [{ name: REQUIRED[0], headSha: SHA, status: 'completed', conclusion: 'success' }] }, ['required_ci_green']],
    ['a dirty tree', { tree: { sha: SHA, porcelain: ' M apps/web/x.ts' } }, ['clean_tree']],
    ['tree status from another SHA', { tree: { sha: 'd'.repeat(40), porcelain: '' } }, ['clean_tree']],
    ['tree status never captured', { tree: null }, ['clean_tree']],
    ['a P1 left in the review report', { reviewBlockingSeverities: ['P2', 'P1'] }, ['no_unresolved_p0_p1']],
    ['a padded P0 left in the review report', { reviewBlockingSeverities: [' P0'] }, ['no_unresolved_p0_p1']],
    ['a P0 with a trailing newline', { reviewBlockingSeverities: ['P0\n'] }, ['no_unresolved_p0_p1']],
    ['a tab-prefixed P1', { reviewBlockingSeverities: ['\tP1'] }, ['no_unresolved_p0_p1']],
    ['two severities run together', { reviewBlockingSeverities: ['P2, P0'] }, ['no_unresolved_p0_p1']],
    ['an unrecognised severity', { reviewBlockingSeverities: ['critical'] }, ['no_unresolved_p0_p1']],
    ['a severity written with a space', { reviewBlockingSeverities: ['P 1'] }, ['no_unresolved_p0_p1']],
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
    ['a migration directory in another case', { changedPaths: ['apps/empire/supabase/Migrations/20260101_drop.sql'] }, ['no_destructive_migration']],
    ['a migration directory at the repo root', { changedPaths: ['migrations/foo.sql'] }, ['no_destructive_migration']],
    ['an upper-case migration directory', { changedPaths: ['FOO/MIGRATIONS/bar.sql'] }, ['no_destructive_migration']],
    ['a migration in the diff', { changedPaths: ['apps/web/supabase/migrations/2026_x.sql'] }, ['no_destructive_migration', 'no_auth_security_credential_change']],
  ] as const)('%s → that gate fails and the release escalates', (_label, override, failing) => {
    const gates = deriveGates(evidence(override as Partial<ReleaseEvidence>))
    for (const gate of failing) expect(gates[gate], gate).toBe(false)
    const decision = classifyRelease(input({ evidence: evidence(override as Partial<ReleaseEvidence>) }))
    expect(decision).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE' })
    expect(decision.executor).toBeUndefined()
  })

  it.each(['HEAD', 'c'.repeat(41), 'C'.repeat(40), `x${'c'.repeat(40)}`])('candidate %s is not a full 40-hex SHA: every SHA-bound gate fails, even when all artefacts name it', (ref) => {
    const gates = deriveGates(evidence({
      candidateSha: ref,
      reviewedSha: ref,
      receiptSha: ref,
      tree: { sha: ref, porcelain: '' },
      spend: { sha: ref, newCosts: [] },
      rollbackReceipt: { sha: ref, ref: 'rollback' },
      postReleaseVerification: { sha: ref, ref: 'post-release' },
      infrastructureReceipt: { sha: ref, ref: 'infrastructure' },
      checkRuns: REQUIRED.map((name) => ({ name, headSha: ref, status: 'completed', conclusion: 'success' })),
    }))
    for (const gate of ['exact_final_sha', 'clean_tree', 'required_ci_green', 'independent_review_pass', 'release_gate_pass', 'no_unresolved_p0_p1',
      'no_new_spend', 'rollback_proven', 'post_release_verification_defined', 'infrastructure_semantics_match']) {
      expect(gates[gate], gate).toBe(false)
    }
  })

  it('policy path entries are lower case, because only the changed path is case-folded', () => {
    for (const entry of [...policy.protected_paths.prefixes, ...policy.protected_paths.segments]) {
      expect(entry, entry).toBe(entry.toLowerCase())
    }
  })

  it('an upper-case receipt ref still proves its gate', () => {
    expect(deriveGates(evidence({ rollbackReceipt: { sha: SHA, ref: 'DPL OK' } })).rollback_proven).toBe(true)
  })

  it('real agent names with dots, colons and dashes still count as independent', () => {
    const gates = deriveGates(evidence({ reviewerAgent: 'Cursor-Independent', builderAgent: 'claude:opus-5.5' }))
    expect(gates.independent_review_pass).toBe(true)
  })

  it('padded or lower-case P2/P3 findings do not block a release', () => {
    expect(deriveGates(evidence({ reviewBlockingSeverities: [' P2', 'p3\n'] })).no_unresolved_p0_p1).toBe(true)
  })

  it('a blank required-check name never counts as green, even against a blank-named passing run (UNI-2782)', () => {
    for (const blank of ['', '  ', '\u200b']) {
      const gates = deriveGates(
        evidence({
          requiredChecks: [blank],
          checkRuns: [{ name: blank, headSha: SHA, status: 'completed', conclusion: 'success' }],
        }),
      )
      expect(gates.required_ci_green).toBe(false)
    }
  })

  it('an empty required-check list never counts as green', () => {
    expect(deriveGates(evidence({ requiredChecks: [] })).required_ci_green).toBe(false)
  })

  it('protected paths escalate whatever the gates say', () => {
    for (const path of ['apps/web/src/lib/auth/session.ts', 'apps/web/src/lib/credentials.ts', 'apps/web/src/security.test.ts', 'apps/web/src/lib/auth.config.ts', 'apps/web/src/lib/Auth/session.ts', 'apps/web/src/SECURITY/x.ts', 'apps/web/src/lib/Credentials.ts', 'apps/web/src/middleware.js', 'apps/web/src/proxy.js', 'apps/web/src/Proxy.ts', 'apps/web/next.config.ts', 'apps/web/next.config.js', 'apps/web/vercel.ts', 'Vercel.json', '.GitHub/workflows/ci.yml', 'Scripts/nexus-runner/runner.mjs', 'apps/web/.env.development.local', '.env', '.github/workflows/ci.yml', 'scripts/nexus-runner/mission-authority.json', 'apps/web/.env.production', 'docs/constitution/x.md', 'apps/web/src/proxy.ts']) {
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
