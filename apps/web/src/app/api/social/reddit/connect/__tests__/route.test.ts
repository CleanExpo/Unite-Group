import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

describe('GET /api/social/reddit/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns 200 with connected:false when env vars missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('REDDIT_CLIENT_ID', '')
    vi.stubEnv('REDDIT_CLIENT_SECRET', '')
    vi.stubEnv('REDDIT_USERNAME', '')
    vi.stubEnv('REDDIT_PASSWORD', '')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.connected).toBe(false)
    expect(body.error).toContain('Missing environment variables')
  })

  it('returns 200 with connected:false when Reddit auth fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('REDDIT_CLIENT_ID', 'client-id')
    vi.stubEnv('REDDIT_CLIENT_SECRET', 'client-secret')
    vi.stubEnv('REDDIT_USERNAME', 'testuser')
    vi.stubEnv('REDDIT_PASSWORD', 'wrongpass')
    vi.mocked(global.fetch as any).mockResolvedValue({ ok: false, status: 401 })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.connected).toBe(false)
  })

  it('returns 200 with connected:true on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.stubEnv('REDDIT_CLIENT_ID', 'client-id')
    vi.stubEnv('REDDIT_CLIENT_SECRET', 'client-secret')
    vi.stubEnv('REDDIT_USERNAME', 'testuser')
    vi.stubEnv('REDDIT_PASSWORD', 'pass')
    vi.mocked(global.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: 'tok', token_type: 'bearer' }),
    })
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.connected).toBe(true)
    expect(body.username).toBe('testuser')
  })
})
