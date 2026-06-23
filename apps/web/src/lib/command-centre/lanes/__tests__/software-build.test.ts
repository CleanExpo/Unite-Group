// src/lib/command-centre/lanes/__tests__/software-build.test.ts
// TDD: Unit 2 — runSoftwareBuild
import { describe, it, expect, vi } from 'vitest'
import { runSoftwareBuild } from '../software-build'
import type { BuildPlan } from '../software-plan'

const PLAN: BuildPlan = {
  title: 'Add login page',
  summary: 'Build a login page',
  acceptanceCriteria: ['User can log in'],
  steps: ['Scope', 'Implement', 'Test', 'PR'],
}

const TASK = {
  id: 'task-1',
  founder_id: 'founder-1',
  objective: 'Add login page',
  metadata: {},
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    getTaskById: vi.fn().mockResolvedValue(TASK),
    generateBuildPlan: vi.fn().mockResolvedValue(PLAN),
    mergeTaskMetadata: vi.fn().mockResolvedValue({ ...TASK, metadata: { software: { plan: PLAN, status: 'planned' } } }),
    appendTaskEvent: vi.fn().mockResolvedValue({}),
    ...overrides,
  }
}

describe('runSoftwareBuild', () => {
  it('throws "Task not found" when getTaskById returns null', async () => {
    const deps = makeDeps({ getTaskById: vi.fn().mockResolvedValue(null) })
    await expect(runSoftwareBuild({ founderId: 'f1', taskId: 'bad' }, deps as never)).rejects.toThrow('Task not found')
  })

  it('generates plan, merges metadata, appends event, returns planned result', async () => {
    const deps = makeDeps()
    const result = await runSoftwareBuild({ founderId: 'founder-1', taskId: 'task-1' }, deps as never)

    expect(deps.getTaskById).toHaveBeenCalledWith({ founderId: 'founder-1', taskId: 'task-1' }, undefined)
    expect(deps.generateBuildPlan).toHaveBeenCalledWith('Add login page', undefined)
    expect(deps.mergeTaskMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        founderId: 'founder-1',
        taskId: 'task-1',
        patch: expect.objectContaining({
          software: expect.objectContaining({
            plan: PLAN,
            status: 'planned',
            plannedAt: expect.any(String),
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
        payload: expect.objectContaining({ kind: 'software_planned' }),
      }),
      undefined,
    )
    expect(result.status).toBe('planned')
    expect(result.plan).toBe(PLAN)
  })

  it('still returns planned even if appendTaskEvent throws (best-effort)', async () => {
    const deps = makeDeps({ appendTaskEvent: vi.fn().mockRejectedValue(new Error('db error')) })
    const result = await runSoftwareBuild({ founderId: 'founder-1', taskId: 'task-1' }, deps as never)
    expect(result.status).toBe('planned')
  })

  it('throws when mergeTaskMetadata returns null (persist failed — task vanished) and does not append an event', async () => {
    const deps = makeDeps({ mergeTaskMetadata: vi.fn().mockResolvedValue(null) })
    await expect(
      runSoftwareBuild({ founderId: 'founder-1', taskId: 'task-1' }, deps as never),
    ).rejects.toThrow('Failed to persist software build plan')
    expect(deps.appendTaskEvent).not.toHaveBeenCalled()
  })
})
