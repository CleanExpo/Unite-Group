import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/lanes/content-distribute', () => ({ runContentDistribute: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { runContentDistribute } from '@/lib/command-centre/lanes/content-distribute'
import { POST } from '../route'

const req = (b: object) => new Request('https://app.test/x', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/command-centre/lanes/content/distribute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await POST(req({ taskId: 't1' }))).status).toBe(401)
  })

  it('400 when taskId missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    expect((await POST(req({}))).status).toBe(400)
  })

  it('200 with result on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(runContentDistribute).mockResolvedValue({ status: 'distributed', postsCreated: 3 })
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { result: { status: string; postsCreated: number } }
    expect(body.result.status).toBe('distributed')
    expect(body.result.postsCreated).toBe(3)
    expect(runContentDistribute).toHaveBeenCalledWith({ founderId: 'u1', taskId: 't1', scheduledAt: undefined })
  })

  it('passes scheduledAt when provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(runContentDistribute).mockResolvedValue({ status: 'distributed', postsCreated: 1 })
    await POST(req({ taskId: 't1', scheduledAt: '2026-07-01T10:00:00Z' }))
    expect(runContentDistribute).toHaveBeenCalledWith({
      founderId: 'u1',
      taskId: 't1',
      scheduledAt: '2026-07-01T10:00:00Z',
    })
  })

  it('500 on runContentDistribute error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(runContentDistribute).mockRejectedValue(new Error('DB write failed'))
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Content distribute failed') // sanitised — raw error not leaked
    expect(body.error).not.toContain('DB write failed')
  })
})
