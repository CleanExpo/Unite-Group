import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/cleanup-loop', () => ({
  runCleanup: vi.fn().mockResolvedValue({ dryRun: true, toClose: [], toSummarise: [] }),
}))

import { getUser } from '@/lib/supabase/server'
import { POST } from '../route'

function req(body: object | null = { scopeId: 'scope-1', issues: ['i1'] }) {
  return new Request('https://app.test/api/command-centre/cleanup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body !== null ? JSON.stringify(body) : 'not-json',
  })
}

describe('POST /api/command-centre/cleanup', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req())
    expect(res.status).toBe(401)
  })

  it('returns 400 when batch missing scopeId', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ issues: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when batch missing issues array', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ scopeId: 'scope-1' }))
    expect(res.status).toBe(400)
  })

  it('returns cleanup result on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dryRun).toBe(true)
  })
})
