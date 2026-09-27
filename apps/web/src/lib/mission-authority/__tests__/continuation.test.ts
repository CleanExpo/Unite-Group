import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import policy from '../../../../../../scripts/nexus-runner/mission-authority.json'
import { DeliveryConflict, deliveryFingerprint, hashDeliveryInput, signDeliveryApproval, type DeliveryStoreClient } from '@/lib/command-centre/delivery-store'
import type { DeliveryMetadata } from '@/lib/command-centre/delivery-types'
import type { CommandCentreTask } from '@/lib/command-centre/tasks'
import type { MissionAuthority } from '../may'
import { hashIntentMarkdown } from '../intent-binding'
import {
  authorityFromApprovedDelivery,
  loadContinuation,
  nextStep,
  saveContinuation,
  validateContinuation,
  type ContinuationInput,
  type MissionContinuation,
} from '../continuation'

// UNI-2779 — a mission's next step is persisted on its row, so a fresh runner
// resumes from the row and gets the same may() verdict, and a stale writer can
// never clobber newer state.

const INTENT_HASH = 'b'.repeat(64)
const SHA = 'c'.repeat(40)

function plainTask(metadata: Record<string, unknown> = { unrelated: { kept: true } }): CommandCentreTask {
  return {
    id: 'task-1', founder_id: 'founder-1', external_ref: null, queue_id: null, project_id: null, project_key: null,
    title: 'Mission', objective: 'Do the thing', priority: 'P2', status: 'running', agent_owner: null, risk_level: 'low',
    execution_mode: 'branch-preview', origin: 'idea', dependencies: [], human_approval_required: true, evidence_path: null,
    validation_required: [], linear_id: null, preview_url: null, metadata,
    created_at: '2026-09-27T00:00:00.000Z', updated_at: '2026-09-27T00:00:00.000Z',
  }
}

function proposal(overrides: Partial<ContinuationInput> = {}): ContinuationInput {
  return {
    mission_id: 'task-1', intent_hash: INTENT_HASH, authority_version: policy.schema, phase: 'BUILD_CONTINUE',
    status: 'active', candidate_sha: SHA, last_verified_sha: null, next_action: 'test', blocked_reason: null,
    attempt_count: 1, receipts: [{ kind: 'commit', ref: 'uni-2779-s2-u2', sha: SHA, at: '2026-09-27T01:00:00.000Z' }],
    ...overrides,
  }
}

const AUTHORITY: MissionAuthority = {
  missionId: 'task-1', intentHash: INTENT_HASH, intentVersion: 1, admissionReceipt: 'approval-1',
  authorityVersion: policy.schema, allowedActions: Object.keys(policy.build),
  releaseMandate: { classes: [], maxRisk: 'low' }, expiresAt: null, revokedAt: null,
}

/** In-memory cc_tasks row honouring every eq() filter, like the intent-store test double. */
function database(task: CommandCentreTask) {
  let row = structuredClone(task)
  const writes: Array<{ values: Record<string, unknown>; filters: Array<[string, unknown]> }> = []
  const valueAt = (column: string): unknown =>
    column === 'metadata->delivery->>revision'
      ? String((row.metadata.delivery as { revision?: number } | undefined)?.revision)
      : (row as unknown as Record<string, unknown>)[column]
  const update = vi.fn((values: Record<string, unknown>) => {
    const filters: Array<[string, unknown]> = []
    writes.push({ values, filters })
    const mutation = {
      eq: (column: string, value: unknown) => { filters.push([column, value]); return mutation },
      select: async () => {
        if (!filters.every(([column, value]) => valueAt(column) === value)) return { data: [], error: null }
        row = structuredClone({ ...row, ...values }) as CommandCentreTask
        return { data: [row], error: null }
      },
    }
    return mutation
  })
  const read = { eq: () => read, single: async () => ({ data: structuredClone(row), error: null }) }
  const client = { from: () => ({ update, select: () => read }) } as unknown as DeliveryStoreClient
  return { client, writes, current: () => row }
}

describe('validateContinuation', () => {
  it('refuses a next_action the policy does not map, and an unknown phase', () => {
    expect(validateContinuation(proposal())).toMatchObject({ ok: true })
    expect(validateContinuation(proposal({ next_action: 'rm_rf_everything' }))).toMatchObject({ ok: false, field: 'next_action' })
    expect(validateContinuation(proposal({ next_action: 'constructor' }))).toMatchObject({ ok: false, field: 'next_action' })
    expect(validateContinuation(proposal({ phase: 'SHIPPED' }))).toMatchObject({ ok: false, field: 'phase' })
    expect(validateContinuation({ ...proposal(), extra: 1 })).toMatchObject({ ok: false })
  })
})

describe('saveContinuation / loadContinuation', () => {
  it('round-trips: what is saved is what a later load returns, beside untouched metadata', async () => {
    const db = database(plainTask())
    const saved = await saveContinuation(plainTask(), proposal(), null, { client: db.client })
    expect(db.writes[0].filters).toEqual([['founder_id', 'founder-1'], ['id', 'task-1'], ['status', 'running'], ['updated_at', '2026-09-27T00:00:00.000Z']])
    const loaded = await loadContinuation({ founderId: 'founder-1', taskId: 'task-1' }, db.client)
    expect(loaded?.continuation).toEqual({ ...proposal(), updated_at: saved.continuation.updated_at })
    expect(loaded?.task.metadata.unrelated).toEqual({ kept: true })
    expect(Date.parse(saved.continuation.updated_at)).toBeGreaterThan(Date.parse('2026-09-27T00:00:00.000Z'))
  })

  it('refuses a stale expected updated_at and leaves the stored continuation unchanged', async () => {
    const db = database(plainTask())
    const first = await saveContinuation(plainTask(), proposal(), null, { client: db.client })
    const before = structuredClone(db.current())
    // A second runner that loaded nothing (or an older record) tries to write.
    await expect(saveContinuation(first.task, proposal({ next_action: 'commit' }), null, { client: db.client }))
      .rejects.toBeInstanceOf(DeliveryConflict)
    await expect(saveContinuation(first.task, proposal({ next_action: 'commit' }), '2026-09-27T00:00:00.500Z', { client: db.client }))
      .rejects.toBeInstanceOf(DeliveryConflict)
    expect(db.current()).toEqual(before)
    expect(db.writes).toHaveLength(1)
  })

  it('refuses a lost row CAS (row changed after the caller read it) without clobbering', async () => {
    const db = database({ ...plainTask(), updated_at: '2026-09-27T00:05:00.000Z' })
    const before = structuredClone(db.current())
    await expect(saveContinuation(plainTask(), proposal(), null, { client: db.client })).rejects.toBeInstanceOf(DeliveryConflict)
    expect(db.current()).toEqual(before)
  })

  it('refuses an unmapped next_action before any write', async () => {
    const db = database(plainTask())
    await expect(saveContinuation(plainTask(), proposal({ next_action: 'rename_repository' }), null, { client: db.client }))
      .rejects.toThrow(/next_action/)
    expect(db.writes).toHaveLength(0)
  })
})

describe('delivery missions', () => {
  beforeEach(() => vi.stubEnv('MISSION_PROVENANCE_SECRET', 'test-provenance-key'))
  afterEach(() => vi.unstubAllEnvs())

  function approvedDeliveryTask(): CommandCentreTask {
    const delivery: DeliveryMetadata = {
      schemaVersion: 1, kind: 'software_delivery', revision: 2, inputHash: 'a'.repeat(64), lane: 'software',
      projectKey: 'unite-group', originalIdea: 'Do the thing', presetIds: [], recipeVersions: {}, answers: {}, questions: [],
      phase: 'ready', spec: { title: 'T', summary: 'S', requirements: [], acceptanceCriteria: ['A'], steps: ['B'], presetIds: [] },
      specVersion: null, harness: [], sourceRefs: [], board: { verdict: 'APPROVED', rationale: 'ok', decisionId: 'b-1' },
      lease: null, approval: null, error: null, scope: 'branch_preview_only',
    }
    delivery.specVersion = deliveryFingerprint(delivery)
    delivery.approval = {
      id: 'approval-1', founderId: 'founder-1', specVersion: delivery.specVersion, revision: 2, scope: 'branch_preview_only',
      approvedAt: '2026-09-27T00:00:00.000Z', intent: { hash: hashIntentMarkdown('x'), version: 1, acceptedAt: null },
    }
    const task = { ...plainTask({ delivery, intent: { status: 'accepted', markdown: 'x' } }), external_ref: 'delivery:r-1', project_key: 'unite-group' }
    delivery.approval.signature = signDeliveryApproval(task, delivery.approval)!
    return task
  }

  it('writes metadata.mission through the guarded CAS and leaves delivery and intent byte-identical', async () => {
    const task = approvedDeliveryTask()
    const db = database(task)
    const saved = await saveContinuation(task, proposal(), null, { client: db.client })
    expect(db.writes[0].filters).toContainEqual(['metadata->delivery->>revision', '2'])
    expect(hashDeliveryInput(saved.task.metadata.delivery)).toBe(hashDeliveryInput(task.metadata.delivery))
    expect(saved.task.metadata.intent).toEqual(task.metadata.intent)
  })

  it('derives build authority only from a signed approval bound to an accepted intent', () => {
    const task = approvedDeliveryTask()
    expect(authorityFromApprovedDelivery(task)).toEqual({ ...AUTHORITY, intentHash: hashIntentMarkdown('x') })
    const forged = structuredClone(task)
    ;(forged.metadata.delivery as DeliveryMetadata).approval!.signature = 'f'.repeat(64)
    expect(authorityFromApprovedDelivery(forged)).toBeNull()
  })
})

describe('nextStep', () => {
  const stored = (overrides: Partial<ContinuationInput> = {}): MissionContinuation => ({ ...proposal(overrides), updated_at: '2026-09-27T01:00:00.000Z' })
  const NOW = Date.parse('2026-09-27T02:00:00.000Z')

  it('executes a build step and stops at a protected action with a founder packet', () => {
    expect(nextStep(stored(), AUTHORITY, {}, NOW)).toMatchObject({ execute: true, action: 'test' })
    const merge = nextStep(stored({ next_action: 'merge', phase: 'RELEASE_CANDIDATE' }), AUTHORITY, {}, NOW)
    expect(merge).toMatchObject({ execute: false, boundary: 'PROTECTED_RELEASE' })
    expect(merge.execute === false && merge.founderPacket).toMatch(/merge/)
  })

  it('refuses a continuation bound to a different intent, and runs nothing without authority', () => {
    expect(nextStep(stored({ intent_hash: 'd'.repeat(64) }), AUTHORITY, {}, NOW)).toMatchObject({ execute: false, boundary: 'NO_AUTHORITY' })
    expect(nextStep(stored(), null, {}, NOW)).toMatchObject({ execute: false, boundary: 'NO_AUTHORITY' })
    expect(nextStep(stored({ status: 'blocked', blocked_reason: 'CI red' }), AUTHORITY, {}, NOW)).toMatchObject({ execute: false, boundary: 'HALTED' })
  })

  it('a fresh process loading the same persisted continuation gets the same verdict', async () => {
    const actions = ['discover', 'test', 'commit', 'draft_pr', 'merge', 'promote_production']
    const db = database(plainTask())
    let task = plainTask()
    let expected: string | null = null
    const rows: CommandCentreTask[] = []
    for (const next_action of actions) {
      const saved = await saveContinuation(task, proposal({ next_action }), expected, { client: db.client })
      task = saved.task
      expected = saved.continuation.updated_at
      rows.push(structuredClone(saved.task))
    }
    const dir = mkdtempSync(path.join(tmpdir(), 'continuation-fresh-'))
    try {
      const rowsFile = path.join(dir, 'rows.json')
      writeFileSync(rowsFile, JSON.stringify({ rows, authority: AUTHORITY, now: NOW }))
      const here = path.dirname(fileURLToPath(import.meta.url))
      const modulePath = path.resolve(here, '..', 'continuation.ts')
      const tsx = path.resolve(here, '../../../../node_modules/.bin/tsx')
      const script = [
        `import { readFileSync } from 'node:fs'`,
        `import { readContinuation, nextStep } from ${JSON.stringify(modulePath)}`,
        `const { rows, authority, now } = JSON.parse(readFileSync(${JSON.stringify(rowsFile)}, 'utf8'))`,
        `process.stdout.write(JSON.stringify(rows.map((row) => { const s = readContinuation(row); return s.state === 'ok' ? nextStep(s.continuation, authority, {}, now) : s })))`,
      ].join('\n')
      const scriptFile = path.join(dir, 'fresh.mts')
      writeFileSync(scriptFile, script)
      const run = spawnSync(tsx, ['--tsconfig', path.resolve(here, '../../../../tsconfig.json'), scriptFile], { encoding: 'utf8' })
      expect(run.status, run.stderr).toBe(0)
      const fresh = JSON.parse(run.stdout)
      const inProcess = rows.map((row) => nextStep(row.metadata.mission as MissionContinuation, AUTHORITY, {}, NOW))
      expect(fresh).toEqual(inProcess)
      expect(fresh.map((d: { execute: boolean }) => d.execute)).toEqual([true, true, true, true, false, false])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
