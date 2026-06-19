import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/google', () => ({
  batchModify: vi.fn().mockResolvedValue(undefined),
  deleteThread: vi.fn().mockResolvedValue(undefined),
}))

import { getUser } from '@/lib/supabase/server'
import { POST } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/email/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/email/bulk', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ account: 'test@test.com', threadIds: ['t1'], action: 'archive' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ threadIds: ['t1'], action: 'archive' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when unknown action', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ account: 'test@test.com', threadIds: ['t1'], action: 'unknown' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unknown action/)
  })

  it('returns success for archive action', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ account: 'test@test.com', threadIds: ['t1', 't2'], action: 'archive' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(2)
  })
})
