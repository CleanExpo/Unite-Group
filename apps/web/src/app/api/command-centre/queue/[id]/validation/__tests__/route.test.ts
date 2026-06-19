import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({ getTaskById: vi.fn() }))
vi.mock('@/lib/command-centre/validation', () => ({
  recordValidationRun: vi.fn().mockResolvedValue({ id: 'run-1', gate: 'type-check', result: 'pass' }),
  listValidationRuns: vi.fn().mockResolvedValue([]),
  summariseValidation: vi.fn().mockReturnValue({ passed: 0, failed: 0, skipped: 0, total: 0 }),
}))

import { getUser } from '@/lib/supabase/server'
import { getTaskById } from '@/lib/command-centre/tasks'
import { GET, POST } from '../route'

const params = { params: Promise.resolve({ id: 'task-1' }) }

function getReq() { return new Request('https://app.test/api/command-centre/queue/task-1/validation') }
function postReq(body: object) {
  return new Request('https://app.test/api/command-centre/queue/task-1/validation', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('/api/command-centre/queue/[id]/validation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(getReq(), params)
    expect(res.status).toBe(401)
  })

  it('GET returns 404 when task not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue(null)
    const res = await GET(getReq(), params)
    expect(res.status).toBe(404)
  })

  it('GET returns validation runs', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1' } as any)
    const res = await GET(getReq(), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.runs).toBeDefined()
    expect(body.summary).toBeDefined()
  })

  it('POST returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq({ gate: 'type-check', result: 'pass' }), params)
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when gate missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(postReq({ result: 'pass' }), params)
    expect(res.status).toBe(400)
  })

  it('POST returns 201 on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getTaskById).mockResolvedValue({ id: 'task-1' } as any)
    const res = await POST(postReq({ gate: 'type-check', result: 'pass' }), params)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.run.gate).toBe('type-check')
  })
})
