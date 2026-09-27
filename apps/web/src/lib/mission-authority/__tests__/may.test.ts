import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import policy from '../../../../../../scripts/nexus-runner/mission-authority.json'
import { may, type MayInput, type MissionAuthority } from '../may'

// UNI-2779 — the authority envelope decides, not the conversation. A mission that
// is ACCEPTED + ADMITTED + BUILD_AUTHORISED continues through every build step;
// only PROTECTED_RELEASE actions (or a SAFE_RELEASE whose mandate/gates fail)
// reach the founder.

const GATES = Object.keys(policy.safe_release_requires)
const allGates = (value = true) => Object.fromEntries(GATES.map((g) => [g, value]))

const MISSION: MissionAuthority = {
  missionId: 'mission-uni-2779',
  intentHash: 'a'.repeat(64),
  intentVersion: 1,
  admissionReceipt: 'approval-1',
  authorityVersion: policy.schema,
  allowedActions: Object.keys(policy.build),
  releaseMandate: { classes: ['merge'], maxRisk: 'low' },
  expiresAt: '2099-01-01T00:00:00.000Z',
  revokedAt: null,
}

function input(overrides: Partial<MayInput> = {}): MayInput {
  return {
    mission: MISSION,
    actor: 'nexus-runner',
    action: 'test',
    target: 'uni-2779-mission-authority',
    risk: 'low',
    state: { gates: {}, phase: 'BUILD_CONTINUE' },
    ...overrides,
  }
}

describe('policy shape — mission-authority.json v3', () => {
  it('maps every action to exactly one class, and nothing else', () => {
    const actions = [...Object.keys(policy.build), ...Object.keys(policy.protected)]
    expect(new Set(actions).size).toBe(actions.length) // no action is both build and protected
    expect(Object.keys(policy.action_classes).sort()).toEqual([...actions].sort())
    for (const [action, cls] of Object.entries(policy.action_classes)) {
      expect(['BUILD_CONTINUE', 'SAFE_RELEASE', 'PROTECTED_RELEASE'], action).toContain(cls)
    }
    for (const action of Object.keys(policy.build)) {
      expect(policy.action_classes[action as keyof typeof policy.action_classes]).toBe('BUILD_CONTINUE')
    }
    for (const action of ['merge', 'mark_pr_ready'] as const) {
      expect(policy.action_classes[action]).toBe('SAFE_RELEASE')
    }
    for (const action of [
      'promote_production', 'public_publish', 'spend_expansion', 'destructive_action',
      'credential_change', 'authority_change', 'strategic_scope_change',
    ] as const) {
      expect(policy.action_classes[action]).toBe('PROTECTED_RELEASE')
    }
  })

  it('carries the phases, safe-release gates and interruption classes the directive names', () => {
    expect(policy.phases).toEqual([
      'DRAFT', 'ACCEPTED', 'ADMITTED', 'BUILD_AUTHORISED', 'BUILD_CONTINUE',
      'RELEASE_CANDIDATE', 'SAFE_RELEASE', 'PROTECTED_RELEASE', 'VERIFIED',
    ])
    expect(GATES).toHaveLength(12)
    expect(Object.keys(policy.interruption_classes).sort()).toEqual([
      'BROKEN_TOOL', 'FALSE_POLICY_CONFLICT', 'IMPLEMENTATION_QUESTION', 'LEGITIMATE_PROTECTED_BOUNDARY',
      'MISSING_AUTHORITY_MAPPING', 'MISSING_CONTEXT', 'MODEL_UNCERTAINTY', 'OTHER',
    ])
  })
})

describe('may() — seeded cases', () => {
  it('A: test fails → repair → retest are build steps that continue', () => {
    for (const action of ['test', 'repair', 'test']) {
      expect(may(input({ action }))).toMatchObject({ verdict: 'continue', boundary: 'BUILD_CONTINUE' })
    }
  })

  it('B: review defect → repair → review continue without a founder question', () => {
    for (const action of ['discover', 'repair', 'edit', 'commit', 'discover']) {
      const decision = may(input({ action }))
      expect(decision.verdict).toBe('continue')
      expect(decision.founderPacket).toBeUndefined()
    }
  })

  it('C: a scoped branch push continues', () => {
    expect(may(input({ action: 'push_scoped_branch' }))).toMatchObject({ verdict: 'continue', boundary: 'BUILD_CONTINUE' })
  })

  it('D: a preview deploy under the existing mandate continues', () => {
    expect(may(input({ action: 'preview_within_existing_mandate', target: 'vercel preview' }))).toMatchObject({
      verdict: 'continue',
      boundary: 'BUILD_CONTINUE',
    })
  })

  it('E: a low-risk exact-SHA merge with a mandate and every gate true continues', () => {
    const release = input({ action: 'merge', target: 'sha:abc123', state: { gates: allGates(), phase: 'RELEASE_CANDIDATE' } })
    expect(may(release)).toMatchObject({ verdict: 'continue', boundary: 'SAFE_RELEASE' })
  })

  it.each(GATES)('E: flipping gate %s false escalates and names it', (gate) => {
    const decision = may(input({
      action: 'merge',
      state: { gates: { ...allGates(), [gate]: false }, phase: 'RELEASE_CANDIDATE' },
    }))
    expect(decision.verdict).toBe('escalate')
    expect(decision.boundary).toBe('PROTECTED_RELEASE')
    expect(decision.founderPacket).toContain(gate)
    for (const other of GATES.filter((g) => g !== gate && !gate.startsWith(g) && !g.startsWith(gate))) {
      expect(decision.founderPacket).not.toContain(other)
    }
  })

  it('E: a missing gate key is not a true gate', () => {
    const { rollback_proven: _dropped, ...rest } = allGates()
    const decision = may(input({ action: 'merge', state: { gates: rest, phase: 'RELEASE_CANDIDATE' } }))
    expect(decision.verdict).toBe('escalate')
    expect(decision.founderPacket).toContain('rollback_proven')
  })

  it('E: high or critical risk never auto-continues a release, even under a high mandate', () => {
    const mission = { ...MISSION, releaseMandate: { classes: ['merge'], maxRisk: 'critical' as const } }
    for (const risk of ['high', 'critical'] as const) {
      const decision = may(input({ mission, action: 'merge', risk, state: { gates: allGates(), phase: 'RELEASE_CANDIDATE' } }))
      expect(decision).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE' })
    }
  })

  it('E: risk above the mandate maxRisk escalates', () => {
    const decision = may(input({ action: 'merge', risk: 'medium', state: { gates: allGates(), phase: 'RELEASE_CANDIDATE' } }))
    expect(decision).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE' })
  })

  it('E: a release outside a release phase escalates', () => {
    const decision = may(input({ action: 'merge', state: { gates: allGates(), phase: 'BUILD_CONTINUE' } }))
    expect(decision).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE' })
  })

  it('F: credential, authority, destructive and unmandated production actions escalate before action', () => {
    const release = { gates: allGates(), phase: 'RELEASE_CANDIDATE' }
    for (const action of ['credential_change', 'authority_change', 'destructive_action', 'spend_expansion', 'public_publish']) {
      const decision = may(input({ action, state: release }))
      expect(decision, action).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE' })
      expect(decision.founderPacket, action).toBeTruthy()
    }
    // Production promotion is PROTECTED: no mandate, gate set or phase makes it continue.
    const mandated = { ...MISSION, releaseMandate: { classes: ['merge', 'promote_production'], maxRisk: 'medium' as const } }
    const production = may(input({ mission: mandated, action: 'promote_production', risk: 'low', state: release }))
    expect(production).toMatchObject({ verdict: 'escalate', boundary: 'PROTECTED_RELEASE' })
    expect(production.founderPacket).toContain('promote_production')
  })

  it('fails closed on null, expired, revoked or malformed authority', () => {
    expect(may(input({ mission: null }))).toMatchObject({ verdict: 'escalate', boundary: 'NO_AUTHORITY' })
    expect(may(input({ mission: { ...MISSION, expiresAt: '2000-01-01T00:00:00.000Z' } }))).toMatchObject({ verdict: 'escalate', boundary: 'NO_AUTHORITY' })
    expect(may(input({ mission: { ...MISSION, revokedAt: '2026-09-01T00:00:00.000Z' } }))).toMatchObject({ verdict: 'escalate', boundary: 'NO_AUTHORITY' })
    expect(may(input({ mission: { ...MISSION, intentHash: '' } }))).toMatchObject({ verdict: 'escalate', boundary: 'NO_AUTHORITY' })
    expect(may(input({ mission: { ...MISSION, expiresAt: 'not-a-date' } }))).toMatchObject({ verdict: 'escalate', boundary: 'NO_AUTHORITY' })
  })

  it('fails closed on an unknown action, a build action outside allowedActions, or a pre-authority phase', () => {
    expect(may(input({ action: 'rewrite_history' }))).toMatchObject({ verdict: 'escalate', boundary: 'NO_AUTHORITY' })
    expect(may(input({ action: 'constructor' }))).toMatchObject({ verdict: 'escalate', boundary: 'NO_AUTHORITY' })
    expect(may(input({ mission: { ...MISSION, allowedActions: ['edit'] }, action: 'push_scoped_branch' }))).toMatchObject({ verdict: 'escalate', boundary: 'NO_AUTHORITY' })
    for (const phase of ['DRAFT', 'ACCEPTED', 'ADMITTED', 'nonsense']) {
      expect(may(input({ state: { gates: {}, phase } })), phase).toMatchObject({ verdict: 'escalate', boundary: 'NO_AUTHORITY' })
    }
  })
})

describe('may() — G: decisions come from the persisted authority, not conversation state', () => {
  it('a fresh process loading the same persisted authority object yields identical decisions', () => {
    const cases: MayInput[] = [
      ...['discover', 'edit', 'test', 'repair', 'commit', 'push_scoped_branch', 'draft_pr', 'preview_within_existing_mandate', 'update_linear']
        .map((action) => input({ action })),
      input({ action: 'merge', state: { gates: allGates(), phase: 'RELEASE_CANDIDATE' } }),
      input({ action: 'promote_production', state: { gates: allGates(), phase: 'RELEASE_CANDIDATE' } }),
      input({ action: 'credential_change' }),
    ]
    const dir = mkdtempSync(path.join(tmpdir(), 'may-fresh-'))
    try {
      const casesFile = path.join(dir, 'cases.json')
      writeFileSync(casesFile, JSON.stringify(cases))
      const mayPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'may.ts')
      const tsx = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../node_modules/.bin/tsx')
      const script = [
        `import { readFileSync } from 'node:fs'`,
        `import { may } from ${JSON.stringify(mayPath)}`,
        `const cases = JSON.parse(readFileSync(${JSON.stringify(casesFile)}, 'utf8'))`,
        `process.stdout.write(JSON.stringify(cases.map((c) => may(c))))`,
      ].join('\n')
      const scriptFile = path.join(dir, 'fresh.mts')
      writeFileSync(scriptFile, script)
      const run = spawnSync(tsx, [scriptFile], { encoding: 'utf8' })
      expect(run.status, run.stderr).toBe(0)
      const fresh = JSON.parse(run.stdout)
      const here = (JSON.parse(JSON.stringify(cases)) as MayInput[]).map((c) => may(c))
      expect(fresh).toEqual(here)
      expect(fresh.filter((d: { verdict: string }) => d.verdict === 'continue')).toHaveLength(10)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
