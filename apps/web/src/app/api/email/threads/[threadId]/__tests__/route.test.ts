import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/google', () => ({ fetchFullThread: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { fetchFullThread } from '@/lib/integrations/google'
import { GET } from '../route'

describe('GET /api/email/threads/[threadId]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/email/threads/t-1'), {
      params: Promise.resolve({ threadId: 't-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when account param is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(new Request('https://app.test/api/email/threads/t-1'), {
      params: Promise.resolve({ threadId: 't-1' }),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'account param required' })
  })

  it('returns full thread for authenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const thread = { id: 't-1', messages: [{ id: 'm-1', body: 'Hello' }] }
    vi.mocked(fetchFullThread).mockResolvedValue(thread as any)

    const res = await GET(
      new Request('https://app.test/api/email/threads/t-1?account=test@example.com'),
      { params: Promise.resolve({ threadId: 't-1' }) },
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(thread)
    expect(fetchFullThread).toHaveBeenCalledWith('user-1', 'test@example.com', 't-1')
  })

  it('returns 500 when fetchFullThread throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchFullThread).mockRejectedValue(new Error('Not found'))

    const res = await GET(
      new Request('https://app.test/api/email/threads/missing?account=a@b.com'),
      { params: Promise.resolve({ threadId: 'missing' }) },
    )
    expect(res.status).toBe(500)
  })
})
