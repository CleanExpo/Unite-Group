// src/app/api/command-centre/lanes/software/handoff/__tests__/route.test.ts
// TDD: Unit 5 — POST /api/command-centre/lanes/software/handoff
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/lanes/software-handoff', () => ({ runSoftwareHandoff: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { runSoftwareHandoff } from '@/lib/command-centre/lanes/software-handoff'
import { POST } from '../route'

const req = (b: object) =>
  new Request('https://app.test/api/command-centre/lanes/software/handoff', {
    method: 'POST',
    body: JSON.stringify(b),
  })

describe('POST /api/command-centre/lanes/software/handoff', () => {
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
    const res = await POST(req({ taskId: 42 }))
    expect(res.status).toBe(400)
  })

  it('200 with handed_off result on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(runSoftwareHandoff).mockResolvedValue({ status: 'handed_off' })
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { result: { status: string } }
    expect(body.result.status).toBe('handed_off')
    expect(runSoftwareHandoff).toHaveBeenCalledWith({ founderId: 'u1', taskId: 't1' })
  })

  it('200 with not_planned result (gated — not a 4xx)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(runSoftwareHandoff).mockResolvedValue({ status: 'not_planned' })
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { result: { status: string } }
    expect(body.result.status).toBe('not_planned')
  })

  it('500 when runSoftwareHandoff throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(runSoftwareHandoff).mockRejectedValue(new Error('db error'))
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(500)
  })
})
