// src/app/api/command-centre/lanes/software/build/__tests__/route.test.ts
// TDD: Unit 3 — POST /api/command-centre/lanes/software/build
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/lanes/software-build', () => ({ runSoftwareBuild: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { runSoftwareBuild } from '@/lib/command-centre/lanes/software-build'
import { POST } from '../route'

const req = (b: object) =>
  new Request('https://app.test/api/command-centre/lanes/software/build', {
    method: 'POST',
    body: JSON.stringify(b),
  })

describe('POST /api/command-centre/lanes/software/build', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/unauthorised/i)
  })

  it('400 when taskId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('400 when taskId is not a string', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await POST(req({ taskId: 123 }))
    expect(res.status).toBe(400)
  })

  it('200 with result on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const plan = { title: 'T', summary: 'S', acceptanceCriteria: ['a'], steps: ['b'] }
    vi.mocked(runSoftwareBuild).mockResolvedValue({ status: 'planned', plan })
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { result: { status: string; plan: object } }
    expect(body.result.status).toBe('planned')
    expect(runSoftwareBuild).toHaveBeenCalledWith({ founderId: 'u1', taskId: 't1' })
  })

  it('500 when runSoftwareBuild throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(runSoftwareBuild).mockRejectedValue(new Error('db error'))
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(500)
  })
})
