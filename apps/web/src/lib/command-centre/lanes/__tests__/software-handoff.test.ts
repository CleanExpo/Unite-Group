// src/lib/command-centre/lanes/__tests__/software-handoff.test.ts
// TDD: Unit 4 — runSoftwareHandoff
import { describe, it, expect, vi } from 'vitest'
import { runSoftwareHandoff } from '../software-handoff'

const PLAN = {
  title: 'Add login page',
  summary: 'Build a login page',
  acceptanceCriteria: ['User can log in'],
  steps: ['Scope', 'Implement', 'Test', 'PR'],
}

const TASK_WITH_PLAN = {
  id: 'task-1',
  founder_id: 'founder-1',
  objective: 'Add login page',
  metadata: { software: { plan: PLAN, status: 'planned', plannedAt: '2026-06-23T00:00:00.000Z' } },
}

const TASK_NO_PLAN = {
  id: 'task-2',
  founder_id: 'founder-1',
  objective: 'Something else',
  metadata: {},
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    getTaskById: vi.fn().mockResolvedValue(TASK_WITH_PLAN),
    mergeTaskMetadata: vi.fn().mockResolvedValue({}),
    appendTaskEvent: vi.fn().mockResolvedValue({}),
    ...overrides,
  }
}

describe('runSoftwareHandoff', () => {
  it('returns { status: "not_planned" } when there is no plan in metadata', async () => {
    const deps = makeDeps({ getTaskById: vi.fn().mockResolvedValue(TASK_NO_PLAN) })
    const result = await runSoftwareHandoff({ founderId: 'founder-1', taskId: 'task-2' }, deps as never)
    expect(result.status).toBe('not_planned')
    expect(deps.mergeTaskMetadata).not.toHaveBeenCalled()
  })

  it('merges awaiting_build status and appends handoff event', async () => {
    const deps = makeDeps()
    const result = await runSoftwareHandoff({ founderId: 'founder-1', taskId: 'task-1' }, deps as never)

    expect(result.status).toBe('handed_off')
    expect(deps.mergeTaskMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        founderId: 'founder-1',
        taskId: 'task-1',
        patch: expect.objectContaining({
          software: expect.objectContaining({
            status: 'awaiting_build',
            handedOffAt: expect.any(String),
          }),
        }),
      }),
      undefined,
    )
    expect(deps.appendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        founderId: 'founder-1',
        taskId: 'task-1',
        type: 'comment',
        payload: expect.objectContaining({ kind: 'software_handoff' }),
      }),
      undefined,
    )
  })

  it('preserves existing metadata fields when merging (spreads prev)', async () => {
    const deps = makeDeps()
    await runSoftwareHandoff({ founderId: 'founder-1', taskId: 'task-1' }, deps as never)
    const mergeCall = vi.mocked(deps.mergeTaskMetadata).mock.calls[0][0]
    const softwarePatch = (mergeCall as { patch: { software: { plan: object } } }).patch.software
    expect(softwarePatch.plan).toEqual(PLAN)
  })

  it('still returns handed_off even if appendTaskEvent throws (best-effort)', async () => {
    const deps = makeDeps({ appendTaskEvent: vi.fn().mockRejectedValue(new Error('db error')) })
    const result = await runSoftwareHandoff({ founderId: 'founder-1', taskId: 'task-1' }, deps as never)
    expect(result.status).toBe('handed_off')
  })
})
