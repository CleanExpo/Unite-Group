// UNI-2779 — the cc_tasks Done choke point. updateTaskStatusGuarded re-reads
// the row it is about to complete and refuses Done while that row's own text
// says it is not finished, before any write.
import { describe, expect, it, vi } from 'vitest'
import {
  DoneRefusedError,
  updateTaskStatusGuarded,
  type CommandCentreTask,
  type GuardedUpdateClientLike,
} from '../tasks'

function row(overrides: Partial<CommandCentreTask> = {}): CommandCentreTask {
  return {
    id: 'task-1',
    founder_id: 'founder-1',
    title: 'Ship the thing',
    objective: 'Ship it',
    status: 'running',
    metadata: {},
    updated_at: '2026-09-27T00:00:00.000Z',
    ...overrides,
  } as CommandCentreTask
}

function fakeDb(current: CommandCentreTask) {
  const filters: Array<[string, unknown]> = []
  const update = vi.fn((values: Record<string, unknown>) => {
    const chain = {
      eq(column: string, value: unknown) {
        filters.push([column, value])
        return chain
      },
      select: async () => ({ data: [{ ...current, ...values }], error: null }),
    }
    return chain
  })
  const read = {
    eq: () => read,
    single: async () => ({ data: current, error: null }),
  }
  const client = { from: () => ({ update, select: () => read }) } as unknown as GuardedUpdateClientLike
  return { client, update, filters }
}

const input = { founderId: 'founder-1', taskId: 'task-1', status: 'done' as const, expectedStatus: 'running' as const }

describe('updateTaskStatusGuarded — Done choke point (UNI-2779)', () => {
  it('refuses Done when the objective says Held back, and writes nothing', async () => {
    const db = fakeDb(row({ objective: 'Ship it\n\nHeld back: the do not ask half (needs founder)' }))
    const err = await updateTaskStatusGuarded(input, db.client).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(DoneRefusedError)
    expect((err as DoneRefusedError).blockers.join(' ')).toMatch(/HELD BACK/)
    expect(db.update).not.toHaveBeenCalled()
  })

  it('refuses Done when metadata.acceptance says NOT MET, and writes nothing', async () => {
    const db = fakeDb(row({ metadata: { acceptance: 'Live walk: NOT MET' } }))
    await expect(updateTaskStatusGuarded(input, db.client)).rejects.toBeInstanceOf(DoneRefusedError)
    expect(db.update).not.toHaveBeenCalled()
  })

  it('completes a clean row, guarded on status and the updated_at it read', async () => {
    const current = row()
    const db = fakeDb(current)
    const task = await updateTaskStatusGuarded(input, db.client)
    expect(task?.status).toBe('done')
    expect(db.filters).toEqual(expect.arrayContaining([
      ['status', 'running'],
      ['updated_at', current.updated_at],
    ]))
  })
})
