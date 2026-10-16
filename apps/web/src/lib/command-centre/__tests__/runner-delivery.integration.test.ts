import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deliveryFingerprint, signDeliveryApproval } from '../delivery-store'
import type { DeliveryMetadata } from '../delivery-types'
import { claimNextQueuedTask, releaseClaimedTask, resumeOwnMission, type RunnerClaimClientLike } from '../runner-claim'
import type { CommandCentreTask } from '../tasks'
import { acceptedIntentBinding } from '@/lib/mission-authority/intent-binding'

function fixture() {
  const delivery: DeliveryMetadata = {
    schemaVersion: 1, kind: 'software_delivery', revision: 1, inputHash: 'a'.repeat(64),
    lane: 'software', projectKey: 'unite-group', originalIdea: 'Let customers edit their bookings',
    presetIds: [], recipeVersions: {}, answers: {}, questions: [], phase: 'ready',
    spec: { title: 'Bookings', summary: 'Customer booking changes', requirements: ['Persist edits'], acceptanceCriteria: ['Reload retains the booking change'], steps: ['Implement and verify booking edit flow'], presetIds: [] },
    specVersion: null, harness: [{ id: 'senior-engineer', label: 'Senior engineer', purpose: 'Implement and verify the scoped change', status: 'recommended', assignmentRef: null }],
    sourceRefs: [], board: { verdict: 'APPROVED', rationale: 'Scoped change', decisionId: 'board-1' },
    lease: null, approval: null, error: null, scope: 'branch_preview_only',
  }
  delivery.specVersion = deliveryFingerprint(delivery)
  delivery.approval = { id: 'approval-1', founderId: 'founder-1', specVersion: delivery.specVersion, revision: 1, scope: 'branch_preview_only', approvedAt: '2026-09-05T00:00:00.000Z' }
  const task: CommandCentreTask = {
    id: 'task-1', founder_id: 'founder-1', external_ref: 'delivery:request-1', queue_id: null,
    project_id: null, project_key: 'unite-group', title: 'Bookings', objective: delivery.originalIdea,
    priority: 'P1', status: 'queued', agent_owner: null, risk_level: 'medium', execution_mode: 'branch-preview',
    origin: 'idea', dependencies: [], human_approval_required: true, evidence_path: null, validation_required: [],
    linear_id: null, preview_url: null,
    metadata: { delivery, preserved: 'context', intent: { status: 'accepted', markdown: '# Intent\nLet customers edit their bookings', acceptedAt: '2026-09-05T00:00:00.000Z' } },
    created_at: '2026-09-05T00:00:00.000Z', updated_at: '2026-09-05T00:00:00.000Z',
  }
  // UNI-2779: build authority is an approval bound to an accepted intent.
  delivery.approval.intent = acceptedIntentBinding(task)!
  delivery.approval.signature = signDeliveryApproval(task, delivery.approval)!
  const receipt = { id: 'approval-1', founder_id: 'founder-1', task_id: 'task-1', decision: 'approve', approver: 'founder', note: `delivery:${delivery.specVersion}:branch_preview_only`, at: '2026-09-05T00:00:00.000Z' }
  return { task, delivery, receipt }
}

/** Stateful query double exercises the real fingerprint/receipt readers and CAS filters. */
function database(initial: CommandCentreTask | CommandCentreTask[], receipts: Record<string, unknown>[]) {
  const rows = (Array.isArray(initial) ? initial : [initial]).map(row => ({ ...row })) as unknown as Record<string, unknown>[]
  let writes = 0
  const reads: Array<{ table: string; filters: Array<[string, unknown]>; limit: number }> = []
  const valueAt = (record: Record<string, unknown>, field: string): unknown => {
    if (field === 'metadata->delivery->>revision') return String((record.metadata as { delivery?: { revision?: number } })?.delivery?.revision)
    return record[field]
  }
  const client = {
    from: (table: string) => {
      const source = () => table === 'cc_approvals' ? receipts : table === 'cc_tasks' ? rows : []
      return {
        select: () => {
          const filters: Array<[string, unknown]> = []
          const chain = {
            eq: (key: string, value: unknown) => { filters.push([key, value]); return chain },
            order: () => chain,
            limit: async (limit: number) => {
              reads.push({ table, filters: [...filters], limit })
              return { data: source().filter((record) => filters.every(([key, value]) => valueAt(record, key) === value)).slice(0, limit), error: null }
            },
          }
          return chain
        },
        update: (values: Record<string, unknown>) => {
          const filters: Array<[string, unknown]> = []
          const chain = {
            eq: (key: string, value: unknown) => { filters.push([key, value]); return chain },
            select: async () => {
              const index = rows.findIndex(row => filters.every(([key, value]) => valueAt(row, key) === value))
              if (index < 0) return { data: [], error: null }
              writes += 1
              rows[index] = { ...rows[index], ...values }
              return { data: [rows[index]], error: null }
            },
          }
          return chain
        },
      }
    },
  } as RunnerClaimClientLike
  return { client, writes: () => writes, row: () => rows[0], reads }
}

describe('real frozen-consent reader through runner lifecycle', () => {
  beforeEach(() => vi.stubEnv('MISSION_PROVENANCE_SECRET', 'runner-delivery-test-key-no-production-authority'))
  afterEach(() => vi.unstubAllEnvs())
  it('filters the requested queued task before the candidate limit and never consumes older unrelated work', async () => {
    const { task, receipt } = fixture()
    const unrelated = Array.from({ length: 6 }, (_, index) => ({ ...task, id: `unrelated-${index}`, external_ref: null, metadata: {} }))
    const db = database([...unrelated, task], [receipt])
    const claimed = await claimNextQueuedTask(db.client, { founderId: task.founder_id, runnerId: 'contained-1', taskId: task.id })
    expect(claimed?.id).toBe(task.id)
    expect(db.reads[0]).toMatchObject({ table: 'cc_tasks', filters: expect.arrayContaining([['id', task.id], ['founder_id', task.founder_id], ['status', 'queued']]) })
    expect(db.writes()).toBe(1)
  })

  it.each(['wrong-task', 'wrong-founder'] as const)('cannot claim a queued task for an exact %s selector', async fault => {
    const { task, receipt } = fixture()
    const db = database(task, [receipt])
    expect(await claimNextQueuedTask(db.client, {
      founderId: fault === 'wrong-founder' ? 'other-founder' : task.founder_id,
      runnerId: 'contained-1', taskId: fault === 'wrong-task' ? 'other-task' : task.id,
    })).toBeNull()
    expect(db.writes()).toBe(0)
    expect(db.row().status).toBe('queued')
  })

  it('revalidates a fresh owned claim without a continuation or timestamp mutation, while legacy polling still skips it', async () => {
    const { task, receipt } = fixture()
    const db = database(task, [receipt])
    const claimed = await claimNextQueuedTask(db.client, { founderId: task.founder_id, runnerId: 'contained-1', taskId: task.id })
    expect(claimed).not.toBeNull()
    expect(claimed!.metadata.mission).toBeUndefined()
    expect(await resumeOwnMission(db.client, { founderId: task.founder_id, runnerId: 'contained-1' })).toBeNull()
    const resumed = await resumeOwnMission(db.client, { founderId: task.founder_id, runnerId: 'contained-1', taskId: task.id })
    expect(resumed).toEqual(claimed)
    expect(resumed!.claimed_at).toBe(claimed!.claimed_at)
    expect((resumed!.metadata.delivery as DeliveryMetadata).executionAssignment!.acceptedAt).toBe((claimed!.metadata.delivery as DeliveryMetadata).executionAssignment!.acceptedAt)
    expect(db.writes()).toBe(1)
    expect(db.reads.filter(read => read.table === 'cc_tasks').at(-1)!.filters).toEqual(expect.arrayContaining([
      ['id', task.id], ['founder_id', task.founder_id], ['status', 'running'], ['claimed_by', 'contained-1'],
    ]))
  })

  it.each(['wrong-task', 'wrong-founder', 'wrong-claimant', 'requeued', 'missing-assignment', 'role', 'runnerId', 'specRevision', 'specFingerprint', 'scope', 'acceptedAt', 'missing-claimed-at', 'existing-build', 'revoked', 'changed-spec', 'damaged-intent', 'non-delivery'] as const)('refuses exact resume after %s without writing or selecting queued work', async fault => {
    const { task, receipt } = fixture()
    const receipts: Record<string, unknown>[] = [receipt]
    const db = database(task, receipts)
    await claimNextQueuedTask(db.client, { founderId: task.founder_id, runnerId: 'contained-1' })
    const row = db.row()
    const metadata = row.metadata as CommandCentreTask['metadata']
    const d = metadata.delivery as DeliveryMetadata
    const assignment = d.executionAssignment! as unknown as Record<string, unknown>
    if (fault === 'requeued') row.status = 'queued'
    if (fault === 'missing-assignment') delete d.executionAssignment
    if (fault === 'role') assignment.role = 'publisher'
    if (fault === 'runnerId') assignment.runnerId = 'other-runner'
    if (fault === 'specRevision') assignment.specRevision = 99
    if (fault === 'specFingerprint') assignment.specFingerprint = '0'.repeat(64)
    if (fault === 'scope') assignment.scope = 'production'
    if (fault === 'acceptedAt') assignment.acceptedAt = 'invalid'
    if (fault === 'missing-claimed-at') row.claimed_at = null
    if (fault === 'existing-build') d.build = { status: 'awaiting_review', prRef: 'https://github.com/CleanExpo/Unite-Group/pull/321', runnerId: 'contained-1', specRevision: d.revision, specFingerprint: d.specVersion!, completedAt: new Date().toISOString() }
    if (fault === 'revoked') receipts.unshift({ ...receipt, id: 'reject', decision: 'reject' })
    if (fault === 'changed-spec') d.spec!.requirements.push('Unapproved extra work')
    if (fault === 'damaged-intent') metadata.intent = { status: 'accepted', markdown: 'Changed accepted intent' }
    if (fault === 'non-delivery') { row.external_ref = null; delete metadata.delivery }
    const beforeReads = db.reads.length
    expect(await resumeOwnMission(db.client, {
      founderId: fault === 'wrong-founder' ? 'other-founder' : task.founder_id,
      runnerId: fault === 'wrong-claimant' ? 'other-runner' : 'contained-1',
      taskId: fault === 'wrong-task' ? 'other-task' : task.id,
    })).toBeNull()
    expect(db.writes()).toBe(1)
    expect(db.reads.slice(beforeReads).filter(read => read.table === 'cc_tasks').every(read => read.filters.some(([key, value]) => key === 'status' && value === 'running'))).toBe(true)
  })

  it('applies the exact resume selector before its limit even behind older owned rows', async () => {
    const { task, receipt } = fixture()
    const first = database(task, [receipt])
    const claimed = await claimNextQueuedTask(first.client, { founderId: task.founder_id, runnerId: 'contained-1' })
    const unrelated = Array.from({ length: 6 }, (_, index) => ({ ...task, id: `older-${index}`, status: 'running' as const, claimed_by: 'contained-1' }))
    const db = database([...unrelated, claimed!], [receipt])
    expect((await resumeOwnMission(db.client, { founderId: task.founder_id, runnerId: 'contained-1', taskId: task.id }))?.id).toBe(task.id)
    expect(db.reads[0].filters).toContainEqual(['id', task.id])
    expect(db.writes()).toBe(0)
  })
  it('valid consent claims its exact spec and releases a draft PR into review', async () => {
    const { task, receipt, delivery } = fixture()
    const db = database(task, [receipt])
    const claimed = await claimNextQueuedTask(db.client, { founderId: task.founder_id, runnerId: 'contained-1' })
    expect(claimed?.approvedDelivery).toMatchObject({ repository: 'CleanExpo/Unite-Group', specVersion: delivery.specVersion, spec: delivery.spec, harness: delivery.harness })
    expect(claimed?.metadata).toMatchObject({ preserved: 'context', delivery: { executionAssignment: { role: 'build_spm', runnerId: 'contained-1' } } })
    const released = await releaseClaimedTask(db.client, { founderId: task.founder_id, taskId: task.id, runnerId: 'contained-1', outcome: 'done', prRef: 'https://github.com/CleanExpo/Unite-Group/pull/321' })
    expect(released.task).toMatchObject({ status: 'awaiting_approval', claimed_by: null, claimed_at: null })
    expect(await claimNextQueuedTask(db.client, { founderId: task.founder_id, runnerId: 'contained-2' })).toBeNull()
    expect(db.writes()).toBe(2)
  })

  it.each(['missing', 'revoked', 'other-founder', 'changed-spec', 'refingerprinted-spec', 'wrong-project', 'unsigned', 'forged-signature', 'missing-signing-key', 'replayed-task', 'intent-unbound'] as const)('does not claim %s consent', async (fault) => {
    const { task, receipt, delivery } = fixture()
    let receipts: Record<string, unknown>[] = [receipt]
    if (fault === 'missing') receipts = []
    if (fault === 'revoked') receipts = [{ ...receipt, id: 'later-reject', decision: 'reject' }, receipt]
    if (fault === 'other-founder') receipts = [{ ...receipt, founder_id: 'someone-else' }]
    if (fault === 'changed-spec') delivery.spec!.requirements.push('A different capability without approval')
    if (fault === 'refingerprinted-spec') {
      delivery.spec!.requirements.push('A different capability without approval')
      delivery.specVersion = deliveryFingerprint(delivery)
      delivery.approval!.specVersion = delivery.specVersion
      receipts = [{ ...receipt, note: `delivery:${delivery.specVersion}:branch_preview_only` }]
      // An attacker can compute a new SHA and forge a matching receipt body;
      // neither authorises changing the server-signed approval envelope.
    }
    if (fault === 'wrong-project') task.project_key = 'other-project'
    if (fault === 'unsigned') delete delivery.approval!.signature
    if (fault === 'forged-signature') delivery.approval!.signature = '0'.repeat(64)
    if (fault === 'missing-signing-key') vi.stubEnv('MISSION_PROVENANCE_SECRET', '')
    if (fault === 'intent-unbound') {
      // UNI-2779 bypass: a genuinely signed, ledger-current approval that was
      // never bound to an accepted intent resolves no mission authority.
      delete delivery.approval!.intent
      delivery.approval!.signature = signDeliveryApproval(task, delivery.approval!)!
    }
    if (fault === 'replayed-task') {
      task.id = 'different-mission'
      receipts = [{ ...receipt, task_id: task.id }]
    }
    const db = database(task, receipts)
    expect(await claimNextQueuedTask(db.client, { founderId: task.founder_id, runnerId: 'contained-1' })).toBeNull()
    expect(db.writes()).toBe(0)
    expect(db.row().status).toBe('queued')
  })
})
