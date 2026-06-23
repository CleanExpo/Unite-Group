import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/lanes/content-build', () => ({ runContentBuild: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { runContentBuild } from '@/lib/command-centre/lanes/content-build'
import { POST } from '../route'

const req = (b: object) => new Request('https://app.test/x', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/command-centre/lanes/content/build', () => {
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
    vi.mocked(runContentBuild).mockResolvedValue({ status: 'built', count: 3, ids: ['id1', 'id2', 'id3'] })
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { result: { status: string } }
    expect(body.result.status).toBe('built')
    expect(runContentBuild).toHaveBeenCalledWith({ founderId: 'u1', taskId: 't1' })
  })

  it('500 on runContentBuild error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(runContentBuild).mockRejectedValue(new Error('AI failure'))
    const res = await POST(req({ taskId: 't1' }))
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch('AI failure')
  })
})
