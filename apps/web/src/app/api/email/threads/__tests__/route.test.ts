import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/google', () => ({ fetchThreadsPaginated: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { fetchThreadsPaginated } from '@/lib/integrations/google'
import { GET } from '../route'

describe('GET /api/email/threads', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/email/threads'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when account param is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(new Request('https://app.test/api/email/threads'))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'account param required' })
  })

  it('returns thread list for authenticated user', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const result = { threads: [{ id: 't-1', snippet: 'Hello' }], nextPageToken: null, resultSizeEstimate: 1 }
    vi.mocked(fetchThreadsPaginated).mockResolvedValue(result as any)

    const res = await GET(new Request('https://app.test/api/email/threads?account=test@example.com'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(result)
    expect(fetchThreadsPaginated).toHaveBeenCalledWith('user-1', 'test@example.com', expect.objectContaining({ maxResults: 25 }))
  })

  it('caps maxResults at 50', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchThreadsPaginated).mockResolvedValue({ threads: [] } as any)

    await GET(new Request('https://app.test/api/email/threads?account=a@b.com&maxResults=999'))
    expect(fetchThreadsPaginated).toHaveBeenCalledWith('user-1', 'a@b.com', expect.objectContaining({ maxResults: 50 }))
  })

  it('returns 500 when fetchThreadsPaginated throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(fetchThreadsPaginated).mockRejectedValue(new Error('Gmail error'))

    const res = await GET(new Request('https://app.test/api/email/threads?account=a@b.com'))
    expect(res.status).toBe(500)
  })
})
