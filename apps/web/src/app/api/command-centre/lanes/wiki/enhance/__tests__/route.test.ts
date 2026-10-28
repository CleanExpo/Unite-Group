import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/lanes/wiki-enhance', () => ({
  enqueueWikiEnhance: vi.fn(),
  latestWikiEnhance: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { enqueueWikiEnhance, latestWikiEnhance } from '@/lib/command-centre/lanes/wiki-enhance'
import { POST, GET } from '../route'

// Gap: POST takes no request body, so there is no input-validation (400) path.

describe('POST /api/command-centre/lanes/wiki/enhance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('refuses unauthenticated requests and enqueues nothing', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST()
    expect(res.status).toBe(401)
    expect(enqueueWikiEnhance).not.toHaveBeenCalled()
  })

  it('enqueues a new job for the founder and returns 201', async () => {
    vi.mocked(enqueueWikiEnhance).mockResolvedValue({ jobId: 'j1', deduped: false } as never)
    const res = await POST()
    expect(res.status).toBe(201)
    expect(enqueueWikiEnhance).toHaveBeenCalledWith('user-123')
    expect(await res.json()).toEqual({ jobId: 'j1', deduped: false })
  })

  it('returns 200 when deduped onto an active job', async () => {
    vi.mocked(enqueueWikiEnhance).mockResolvedValue({ jobId: 'j0', deduped: true } as never)
    const res = await POST()
    expect(res.status).toBe(200)
  })

  it('returns 500 with the message when enqueue throws', async () => {
    vi.mocked(enqueueWikiEnhance).mockRejectedValue(new Error('queue down'))
    const res = await POST()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'queue down' })
  })
})

describe('GET /api/command-centre/lanes/wiki/enhance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('refuses unauthenticated requests and reads nothing', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(latestWikiEnhance).not.toHaveBeenCalled()
  })

  it('returns the latest status for the founder with 200', async () => {
    vi.mocked(latestWikiEnhance).mockResolvedValue({ job: null, events: [] } as never)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(latestWikiEnhance).toHaveBeenCalledWith('user-123')
  })

  it('returns 500 when the status read throws', async () => {
    vi.mocked(latestWikiEnhance).mockRejectedValue(new Error('read failed'))
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
