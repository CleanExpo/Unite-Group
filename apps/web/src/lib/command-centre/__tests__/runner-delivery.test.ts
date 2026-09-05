import { beforeEach, describe, expect, it, vi } from 'vitest'
import { claimNextQueuedTask, releaseClaimedTask, type RunnerClaimClientLike } from '../runner-claim'
import { getApprovedDelivery, verifyDeliveryApproval } from '../delivery-store'

vi.mock('../delivery-store', () => ({
  getApprovedDelivery: vi.fn(), verifyDeliveryApproval: vi.fn(),
}))

const specVersion = 'a'.repeat(64)
const delivery = {
  schemaVersion: 1, kind: 'software_delivery', revision: 2, inputHash: 'b'.repeat(64),
  lane: 'software', projectKey: 'unite-group', originalIdea: 'Let customers manage bookings', presetIds: [], recipeVersions: {},
  answers: {}, questions: [], phase: 'ready',
  spec: { title: 'Bookings', summary: 'Customer bookings', requirements: ['Save edits'], acceptanceCriteria: ['Reload keeps edits'], steps: ['Implement edit flow'], presetIds: [] },
  specVersion, harness: [], sourceRefs: [],
  board: { verdict: 'APPROVED', rationale: 'Scoped', decisionId: 'board-1' },
  lease: null, approval: { id: 'approval-1', founderId: 'f1', specVersion, revision: 2, scope: 'branch_preview_only', approvedAt: '2026-09-05T00:00:00.000Z' },
  error: null, scope: 'branch_preview_only',
}
const task = {
  id: 'task-1', founder_id: 'f1', status: 'queued', external_ref: 'delivery:request-1',
  project_key: 'unite-group', updated_at: '2026-09-05T00:00:00.000Z',
  metadata: { unrelated: { retained: true }, delivery },
}

function clientFor(rows: unknown[], updatesResult?: unknown[]) {
  const updates: Array<{ values: Record<string, unknown>; filters: Array<[string, unknown]> }> = []
  const reads: Array<[string, unknown]> = []
  const client = {
    from: () => ({
      select: () => {
        const chain = {
          eq: (key: string, value: unknown) => { reads.push([key, value]); return chain },
          order: () => chain,
          limit: async () => ({ data: rows, error: null }),
        }
        return chain
      },
      update: (values: Record<string, unknown>) => {
        const filters: Array<[string, unknown]> = []
        const chain = {
          eq: (key: string, value: unknown) => { filters.push([key, value]); return chain },
          select: async () => {
            updates.push({ values, filters })
            return { data: updatesResult ?? [{ ...rows[0] as object, ...values }], error: null }
          },
        }
        return chain
      },
    }),
  } as RunnerClaimClientLike
  return { client, updates, reads }
}

describe('delivery mission runner lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getApprovedDelivery).mockReturnValue(delivery as never)
    vi.mocked(verifyDeliveryApproval).mockResolvedValue(true)
  })

  it('refuses a queued mission whose approval receipt was never durably saved', async () => {
    vi.mocked(verifyDeliveryApproval).mockResolvedValue(false)
    const { client, updates } = clientFor([task])
    expect(await claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-1' })).toBeNull()
    expect(updates).toHaveLength(0)
  })

  it('refuses changed specifications and damaged envelopes before any claim', async () => {
    vi.mocked(getApprovedDelivery).mockReturnValue(null)
    for (const metadata of [task.metadata, {}]) {
      const { client, updates } = clientFor([{ ...task, metadata }])
      expect(await claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-1' })).toBeNull()
      expect(updates).toHaveLength(0)
    }
  })

  it('claims only the read revision and returns the exact validated frozen payload', async () => {
    const { client, updates } = clientFor([task])
    const result = await claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-1' })
    expect(result).toMatchObject({ status: 'running', approvedDelivery: delivery })
    expect(updates[0].values.metadata).toMatchObject({ delivery: { executionAssignment: {
      role: 'build_spm', runnerId: 'runner-1', scope: 'branch_preview_only', specRevision: 2,
    } } })
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      ['founder_id', 'f1'], ['status', 'queued'], ['updated_at', task.updated_at],
      ['metadata->delivery->>revision', '2'],
    ]))
  })

  it('does not claim a review-stage specification even when accidentally queued again', async () => {
    const { client, updates } = clientFor([{ ...task, metadata: { delivery: { ...delivery, build: { status: 'awaiting_review' } } } }])
    expect(await claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-1' })).toBeNull()
    expect(updates).toHaveLength(0)
  })

  it('a lost claim race never returns the frozen packet for execution', async () => {
    const { client } = clientFor([task], [])
    expect(await claimNextQueuedTask(client, { founderId: 'f1', runnerId: 'runner-1' })).toBeNull()
  })

  it('hands the draft PR to review, clears claim, and preserves unrelated metadata', async () => {
    const { client, updates } = clientFor([{ ...task, status: 'running', claimed_by: 'runner-1' }])
    const result = await releaseClaimedTask(client, {
      founderId: 'f1', taskId: task.id, runnerId: 'runner-1', outcome: 'done',
      prRef: 'https://github.com/CleanExpo/Unite-Group/pull/123',
    })
    expect(result.task).toMatchObject({ status: 'awaiting_approval', claimed_by: null, claimed_at: null })
    expect(updates[0].values.metadata).toMatchObject({ unrelated: { retained: true }, delivery: {
      build: { status: 'awaiting_review', specRevision: 2, specFingerprint: specVersion, runnerId: 'runner-1' },
    } })
    expect(updates[0].filters).toContainEqual(['updated_at', task.updated_at])
    expect(updates[0].filters).toContainEqual(['metadata->delivery->>revision', '2'])
  })

  it.each(['failed', 'requeue'] as const)('clears the reserved build owner when lane refusal releases %s', async (outcome) => {
    const { client, updates } = clientFor([{ ...task, status: 'running', claimed_by: 'runner-1', metadata: {
      ...task.metadata, delivery: { ...delivery, executionAssignment: {
        role: 'build_spm', runnerId: 'runner-1', specRevision: 2, specFingerprint: specVersion,
        scope: 'branch_preview_only', acceptedAt: '2026-09-05T00:00:00.000Z',
      } },
    } }])
    await releaseClaimedTask(client, { founderId: 'f1', taskId: task.id, runnerId: 'runner-1', outcome })
    const metadata = updates[0].values.metadata as Record<string, Record<string, unknown>>
    expect(metadata.delivery).not.toHaveProperty('executionAssignment')
    expect(metadata.unrelated).toEqual({ retained: true })
  })

  it('refuses a non-PR result and does not write completion', async () => {
    const { client, updates } = clientFor([{ ...task, status: 'running', claimed_by: 'runner-1' }])
    await expect(releaseClaimedTask(client, {
      founderId: 'f1', taskId: task.id, runnerId: 'runner-1', outcome: 'done', prRef: 'javascript:alert(1)',
    })).rejects.toThrow(/draft PR/i)
    expect(updates).toHaveLength(0)
  })

  it('refuses a PR from a different repository', async () => {
    const { client, updates } = clientFor([{ ...task, status: 'running', claimed_by: 'runner-1' }])
    await expect(releaseClaimedTask(client, {
      founderId: 'f1', taskId: task.id, runnerId: 'runner-1', outcome: 'done',
      prRef: 'https://github.com/CleanExpo/Other/pull/123',
    })).rejects.toThrow(/approved repository/)
    expect(updates).toHaveLength(0)
  })

  it('a repeated release cannot overwrite the review handoff', async () => {
    const { client, updates } = clientFor([])
    expect((await releaseClaimedTask(client, {
      founderId: 'f1', taskId: task.id, runnerId: 'runner-1', outcome: 'done',
      prRef: 'https://github.com/CleanExpo/Unite-Group/pull/123',
    })).task).toBeNull()
    expect(updates).toHaveLength(0)
  })

  it('a concurrent metadata change makes release retryable without overwriting it', async () => {
    const { client } = clientFor([{ ...task, status: 'running', claimed_by: 'runner-1' }], [])
    await expect(releaseClaimedTask(client, {
      founderId: 'f1', taskId: task.id, runnerId: 'runner-1', outcome: 'done',
      prRef: 'https://github.com/CleanExpo/Unite-Group/pull/123',
    })).rejects.toThrow(/concurrently/)
  })
})
