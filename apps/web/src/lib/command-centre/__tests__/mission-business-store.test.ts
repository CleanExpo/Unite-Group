import { describe, expect, it, vi } from 'vitest'
import { saveMissionBusiness } from '../mission-business-store'
import { readMissionBusiness } from '../mission-business'
import { DeliveryConflict, type DeliveryStoreClient } from '../delivery-store'
import type { CommandCentreTask } from '../tasks'

function fixture(): CommandCentreTask {
  return {
    id: 'task', founder_id: 'founder', external_ref: 'delivery:research:request', queue_id: null,
    project_id: null, project_key: 'Unite-Group', title: 'Board', objective: 'Plan the board', priority: 'P2',
    status: 'proposed', agent_owner: null, risk_level: 'low', execution_mode: 'branch-preview', origin: 'idea',
    dependencies: [], human_approval_required: true, evidence_path: null, validation_required: [], linear_id: null,
    preview_url: null, metadata: { lifecycle: { revision: 2 }, delivery: {
      schemaVersion: 1, kind: 'software_delivery', lane: 'software', revision: 3, inputHash: 'a'.repeat(64),
      originalIdea: 'Plan the board', projectKey: 'Unite-Group', presetIds: [], recipeVersions: {},
      answers: {}, questions: [], phase: 'awaiting_answers', spec: null, specVersion: null, harness: [],
      sourceRefs: [], board: null, lease: null, approval: null, error: null, scope: 'branch_preview_only',
    }, intent: { status: 'draft' } },
    created_at: '2026-10-20T00:00:00.000Z', updated_at: '2026-10-20T00:00:00.000Z',
  }
}

function database(task: CommandCentreTask, tamper = false) {
  let row = structuredClone(task)
  const filters: Array<[string, unknown]> = []
  const mutation = {
    eq: (key: string, value: unknown) => { filters.push([key, value]); return mutation },
    select: async () => {
      if (!filters.every(([key, value]) => key === 'metadata->delivery->>revision' ? String((row.metadata.delivery as {revision:number}).revision) === value : row[key as keyof CommandCentreTask] === value)) return { data: [], error: null }
      row = { ...row, ...patch } as CommandCentreTask
      return { data: [row], error: null }
    },
  }
  let patch: Record<string, unknown> = {}
  const update = vi.fn((value: Record<string, unknown>) => { patch = value; return mutation })
  const read = { eq: () => read, single: async () => ({ data: tamper ? { ...row, metadata: { businessKey: 'dr' } } : row, error: null }) }
  const client = { from: () => ({ update, select: () => read }) } as unknown as DeliveryStoreClient
  return { client, filters, update }
}

describe('mission business filing', () => {
  it('retains lifecycle, delivery and intent while filing the mission; confirms the write', async () => {
    const task = fixture(), db = database(task)
    const saved = await saveMissionBusiness(task, 'carsi', { client: db.client })
    expect(readMissionBusiness(saved.metadata)).toBe('carsi')
    expect(saved.metadata).toEqual({ ...task.metadata, businessKey: 'carsi' })
    expect(saved.project_key).toBe('Unite-Group')
    expect(db.filters).toEqual([['founder_id', 'founder'], ['id', 'task'], ['status', 'proposed'], ['updated_at', task.updated_at], ['metadata->delivery->>revision', '3']])
    expect(db.update).toHaveBeenCalledTimes(1)
  })
  it('refuses stale rows and a readback that drops sibling context', async () => {
    const task = fixture()
    const stale = database({ ...task, updated_at: '2026-10-21T00:00:00.000Z' })
    await expect(saveMissionBusiness(task, 'dr', { client: stale.client })).rejects.toBeInstanceOf(DeliveryConflict)
    const tampered = database(task, true)
    await expect(saveMissionBusiness(task, 'dr', { client: tampered.client })).rejects.toThrow(/could not be confirmed/)
  })
  it('allows clearing a filing and refuses malformed metadata as a business identity', async () => {
    const task = fixture(), db = database(task)
    expect(readMissionBusiness({ businessKey: 'arbitrary' })).toBeNull()
    expect(readMissionBusiness({ businessKey: { key: 'dr' } })).toBeNull()
    expect(readMissionBusiness((await saveMissionBusiness(task, null, { client: db.client })).metadata)).toBeNull()
  })
})
