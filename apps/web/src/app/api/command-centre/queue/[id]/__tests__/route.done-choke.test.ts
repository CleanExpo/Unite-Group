// UNI-2779 — the queue PATCH runs its own Done check on the row it read, then
// writes through the store's Done choke point, which re-reads the row. When the
// acceptance text changed in between, the store refuses and the route answers
// 409 (not 500) with nothing written. Uses the REAL updateTaskStatusGuarded.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({ row: null as Record<string, unknown> | null, updates: 0 }))

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(async () => ({ id: 'user-1' })),
  createClient: vi.fn(async () => {
    const read = { eq: () => read, single: async () => ({ data: state.row, error: null }) }
    return {
      from: () => ({
        select: () => read,
        update: (values: Record<string, unknown>) => {
          const chain = {
            eq: () => chain,
            select: async () => {
              state.updates += 1
              return { data: [{ ...state.row, ...values }], error: null }
            },
          }
          return chain
        },
      }),
    }
  }),
}))
vi.mock('@/lib/command-centre/tasks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/command-centre/tasks')>()),
  getTaskById: vi.fn(),
  appendTaskEvent: vi.fn(),
}))
vi.mock('@/lib/command-centre/approvals', () => ({ listApprovalsForTask: vi.fn() }))
vi.mock('@/lib/command-centre/validation', () => ({
  getValidationSummary: vi.fn(async () => ({ canComplete: true, failed: [], pending: [], byGate: {} })),
}))

import { getTaskById } from '@/lib/command-centre/tasks'
import { PATCH } from '../route'

const params = Promise.resolve({ id: 'task-1' })
const clean = {
  id: 'task-1', founder_id: 'user-1', title: 'Ship it', objective: 'Ship it',
  status: 'running', metadata: {}, updated_at: '2026-09-27T00:00:00.000Z',
}
const patchDone = () =>
  new Request('https://app.test/api/command-centre/queue/task-1', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'done' }),
  })

describe('PATCH /api/command-centre/queue/[id] — store Done choke point', () => {
  beforeEach(() => {
    vi.mocked(getTaskById).mockReset()
    state.updates = 0
  })

  it('returns 409 and writes nothing when the row says Held back at write time', async () => {
    vi.mocked(getTaskById).mockResolvedValue(clean as never)
    state.row = { ...clean, objective: 'Ship it\n\nHeld back: the do not ask half' }

    const res = await PATCH(patchDone(), { params })

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.blockers.join(' ')).toMatch(/HELD BACK/)
    expect(state.updates).toBe(0)
  })

  it('completes a clean row', async () => {
    vi.mocked(getTaskById).mockResolvedValue(clean as never)
    state.row = { ...clean }

    const res = await PATCH(patchDone(), { params })

    expect(res.status).toBe(200)
    expect(state.updates).toBe(1)
  })
})
