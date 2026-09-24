import { describe, expect, it, vi } from 'vitest'
import { saveDelivery, hashDeliveryInput, DeliveryConflict, type DeliveryStoreClient } from '../delivery-store'
import { saveMissionIntent, readMissionIntent, isPreparationLeaseActive, type MissionIntent } from '../intent-store'
import { readDeliveryMetadata, type DeliveryMetadata } from '../delivery-types'
import { toDeliveryMissionView } from '../delivery-view'
import type { CommandCentreTask } from '../tasks'

function fixture(): { task: CommandCentreTask; delivery: DeliveryMetadata } {
  const delivery: DeliveryMetadata = {
    schemaVersion: 1, kind: 'software_delivery', lane: 'software', revision: 3, inputHash: 'a'.repeat(64),
    originalIdea: 'Build a portal', projectKey: 'Unite-Group', presetIds: [], recipeVersions: {},
    answers: { audience: 'Contractors' }, questions: [{ id: 'audience', label: 'Who is it for?' }],
    phase: 'awaiting_answers', spec: null, specVersion: null, harness: [], sourceRefs: [], board: null,
    lease: null, approval: null, error: null, scope: 'branch_preview_only',
  }
  const task: CommandCentreTask = {
    id: 'task', founder_id: 'owner', external_ref: 'delivery:request', queue_id: null, project_id: null,
    project_key: 'Unite-Group', title: 'Portal', objective: 'Build a portal', priority: 'P2', status: 'proposed',
    agent_owner: null, risk_level: 'low', execution_mode: 'branch-preview', origin: 'idea', dependencies: [],
    human_approval_required: true, evidence_path: null, validation_required: [], linear_id: null, preview_url: null,
    metadata: { unrelated: { retained: true }, delivery }, created_at: '2026-09-05T00:00:00.000Z',
    updated_at: '2026-09-05T00:00:00.000Z',
  }
  return { task, delivery }
}

/** In-memory cc_tasks row honouring the eq() filters, like the delivery-store test double. */
function database(task: CommandCentreTask, options: { tamperDelivery?: boolean; emptyWrite?: boolean } = {}) {
  let row = structuredClone(task)
  const writes: Array<{ values: Record<string, unknown>; filters: Array<[string, unknown]> }> = []
  const update = vi.fn((values: Record<string, unknown>) => {
    const filters: Array<[string, unknown]> = []
    writes.push({ values, filters })
    const mutation = {
      eq: (column: string, value: unknown) => { filters.push([column, value]); return mutation },
      select: async () => {
        const matches = !options.emptyWrite && filters.every(([column, value]) => {
          if (column === 'metadata->delivery->>revision') return String((row.metadata.delivery as { revision: number }).revision) === value
          return (row as unknown as Record<string, unknown>)[column] === value
        })
        if (!matches) return { data: [], error: null }
        row = structuredClone({ ...row, ...values }) as CommandCentreTask
        if (options.tamperDelivery) row.metadata.delivery = { ...(row.metadata.delivery as object), revision: 99 }
        // JSONB may return the same content with a different key order.
        row.metadata = Object.fromEntries(Object.entries(row.metadata).reverse())
        return { data: [row], error: null }
      },
    }
    return mutation
  })
  const read = { eq: () => read, single: async () => ({ data: row, error: null }) }
  const client = { from: () => ({ update, select: () => read }) } as unknown as DeliveryStoreClient
  return { client, writes, current: () => row }
}

const INTENT: MissionIntent = { status: 'accepted', markdown: '---\nstatus: accepted\n---\n# Intent: X\n', acceptedAt: '2026-09-24T00:00:00.000Z', author: 'phill@example.com' }

describe('saveMissionIntent (guarded sibling writer)', () => {
  it('writes metadata.intent beside an untouched delivery with the same CAS filters as saveDelivery', async () => {
    const { task, delivery } = fixture()
    const db = database(task)
    const saved = await saveMissionIntent(task, INTENT, { client: db.client })
    expect(db.writes[0].filters).toEqual([
      ['founder_id', 'owner'], ['id', 'task'], ['status', 'proposed'],
      ['updated_at', task.updated_at], ['metadata->delivery->>revision', '3'],
    ])
    expect(Date.parse(db.writes[0].values.updated_at as string)).toBeGreaterThan(Date.parse(task.updated_at))
    expect(hashDeliveryInput(saved.metadata.delivery)).toBe(hashDeliveryInput(delivery))
    expect(saved.metadata.intent).toEqual(INTENT)
    expect(saved.metadata.unrelated).toEqual({ retained: true })
    expect(readMissionIntent(saved)).toEqual(INTENT)
  })

  it('refuses a lost CAS (stale updated_at) instead of overwriting newer mission state', async () => {
    const { task } = fixture()
    const db = database({ ...task, updated_at: '2026-09-06T00:00:00.000Z' })
    await expect(saveMissionIntent(task, INTENT, { client: db.client })).rejects.toBeInstanceOf(DeliveryConflict)
  })

  it('refuses when zero rows are written', async () => {
    const { task } = fixture()
    const db = database(task, { emptyWrite: true })
    await expect(saveMissionIntent(task, INTENT, { client: db.client })).rejects.toBeInstanceOf(DeliveryConflict)
  })

  it('refuses when the confirmed delivery envelope differs from before', async () => {
    const { task } = fixture()
    const db = database(task, { tamperDelivery: true })
    await expect(saveMissionIntent(task, INTENT, { client: db.client })).rejects.toThrow(/could not be confirmed/)
  })

  it('a later saveDelivery on the re-read task preserves metadata.intent (the sibling survives)', async () => {
    const { task, delivery } = fixture()
    const db = database(task)
    const afterIntent = await saveMissionIntent(task, INTENT, { client: db.client })
    const next: DeliveryMetadata = { ...delivery, revision: delivery.revision + 1, phase: 'plan' }
    const afterDelivery = await saveDelivery(afterIntent, next, { client: db.client })
    expect(afterDelivery.metadata.intent).toEqual(INTENT)
    expect(readDeliveryMetadata(afterDelivery)?.phase).toBe('plan')
  })

  it('an existing mission WITHOUT intent still parses and renders (additive)', () => {
    const { task, delivery } = fixture()
    expect(task.metadata.intent).toBeUndefined()
    expect(readDeliveryMetadata(task)).toEqual(delivery)
    const view = toDeliveryMissionView(task, Date.parse('2026-09-05T00:00:00.000Z'))
    expect(view.intent).toBeNull()
    expect(view.intentReady).toBe(true)
  })

  it('intentReady is false while questions are unanswered or a preparation lease is live', () => {
    const { task, delivery } = fixture()
    const now = Date.parse('2026-09-05T00:00:00.000Z')
    const unanswered = { ...task, metadata: { ...task.metadata, delivery: { ...delivery, answers: {} } } }
    expect(toDeliveryMissionView(unanswered, now).intentReady).toBe(false)
    const leased = { ...task, metadata: { ...task.metadata, delivery: { ...delivery, lease: { token: '00000000-0000-4000-8000-000000000000', phase: 'plan', expiresAt: '2026-09-05T00:05:00.000Z', revision: 3 } } } }
    expect(isPreparationLeaseActive(leased, now)).toBe(true)
    expect(toDeliveryMissionView(leased, now).intentReady).toBe(false)
    const captured = { ...task, metadata: { ...task.metadata, delivery: { ...delivery, phase: 'captured' } } }
    expect(toDeliveryMissionView(captured, now).intentReady).toBe(false)
  })
})
