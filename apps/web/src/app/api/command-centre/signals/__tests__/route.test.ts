// src/app/api/command-centre/signals/__tests__/route.test.ts
// TDD: GET /api/command-centre/signals — auth + founder-scoped listing of
// recently-ingested signal tasks (those carrying metadata.signalSource).
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ listTasks: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { listTasks } from '@/lib/command-centre/tasks'
import { GET } from '../route'

const signalTask = {
  id: 'task-1',
  title: 'Add a dark-mode toggle',
  status: 'proposed',
  metadata: { signalSource: 'telegram', signalSeverity: 'info', observedAt: '2026-06-23T08:00:00.000Z' },
}
const ideaTask = {
  id: 'task-2',
  title: 'A hand-typed idea',
  status: 'proposed',
  metadata: {},
}

describe('GET /api/command-centre/signals', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(listTasks).not.toHaveBeenCalled()
  })

  it('lists only signal-sourced tasks, founder-scoped', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(listTasks).mockResolvedValue([signalTask, ideaTask] as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      total: number
      signals: Array<{ taskId: string; source: string; severity: string; status: string }>
    }

    // founder-scoped query
    expect(vi.mocked(listTasks).mock.calls[0][0]).toMatchObject({ founderId: 'u1' })

    // only the signal-sourced task survives the filter
    expect(body.total).toBe(1)
    expect(body.signals).toHaveLength(1)
    expect(body.signals[0].taskId).toBe('task-1')
    expect(body.signals[0].source).toBe('telegram')
    expect(body.signals[0].severity).toBe('info')
    expect(body.signals[0].status).toBe('proposed')
  })

  it('returns an honest empty envelope when no signals exist', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(listTasks).mockResolvedValue([ideaTask] as never)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as { total: number; signals: unknown[]; source: string }
    expect(body.total).toBe(0)
    expect(body.signals).toEqual([])
    expect(body.source).toBeDefined()
  })

  it('500 when listTasks throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(listTasks).mockRejectedValue(new Error('db error'))
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
