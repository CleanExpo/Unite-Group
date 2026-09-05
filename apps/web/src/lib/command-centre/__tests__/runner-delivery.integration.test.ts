import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deliveryFingerprint, signDeliveryApproval } from '../delivery-store'
import type { DeliveryMetadata } from '../delivery-types'
import { claimNextQueuedTask, releaseClaimedTask, type RunnerClaimClientLike } from '../runner-claim'
import type { CommandCentreTask } from '../tasks'

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
    linear_id: null, preview_url: null, metadata: { delivery, preserved: 'context' },
    created_at: '2026-09-05T00:00:00.000Z', updated_at: '2026-09-05T00:00:00.000Z',
  }
  delivery.approval.signature = signDeliveryApproval(task, delivery.approval)!
  const receipt = { id: 'approval-1', founder_id: 'founder-1', task_id: 'task-1', decision: 'approve', approver: 'founder', note: `delivery:${delivery.specVersion}:branch_preview_only`, at: '2026-09-05T00:00:00.000Z' }
  return { task, delivery, receipt }
}

/** Stateful query double exercises the real fingerprint/receipt readers and CAS filters. */
function database(initial: CommandCentreTask, receipts: Record<string, unknown>[]) {
  let row = { ...initial } as unknown as Record<string, unknown>
  let writes = 0
  const valueAt = (record: Record<string, unknown>, field: string): unknown => {
    if (field === 'metadata->delivery->>revision') return String((record.metadata as { delivery?: { revision?: number } })?.delivery?.revision)
    return record[field]
  }
  const client = {
    from: (table: string) => {
      const source = () => table === 'cc_approvals' ? receipts : table === 'cc_tasks' ? [row] : []
      return {
        select: () => {
          const filters: Array<[string, unknown]> = []
          const chain = {
            eq: (key: string, value: unknown) => { filters.push([key, value]); return chain },
            order: () => chain,
            limit: async (limit: number) => ({ data: source().filter((record) => filters.every(([key, value]) => valueAt(record, key) === value)).slice(0, limit), error: null }),
          }
          return chain
        },
        update: (values: Record<string, unknown>) => {
          const filters: Array<[string, unknown]> = []
          const chain = {
            eq: (key: string, value: unknown) => { filters.push([key, value]); return chain },
            select: async () => {
              if (!filters.every(([key, value]) => valueAt(row, key) === value)) return { data: [], error: null }
              writes += 1
              row = { ...row, ...values }
              return { data: [row], error: null }
            },
          }
          return chain
        },
      }
    },
  } as RunnerClaimClientLike
  return { client, writes: () => writes, row: () => row }
}

describe('real frozen-consent reader through runner lifecycle', () => {
  beforeEach(() => vi.stubEnv('MISSION_PROVENANCE_SECRET', 'runner-delivery-test-key-no-production-authority'))
  afterEach(() => vi.unstubAllEnvs())
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

  it.each(['missing', 'revoked', 'other-founder', 'changed-spec', 'refingerprinted-spec', 'wrong-project', 'unsigned', 'forged-signature', 'missing-signing-key', 'replayed-task'] as const)('does not claim %s consent', async (fault) => {
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
