import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/oauth-state', () => ({ signOAuthState: vi.fn().mockReturnValue('signed-state') }))

import { getUser } from '@/lib/supabase/server'
import { GET } from '../route'

function req(business?: string) {
  const url = business
    ? `https://app.test/api/auth/youtube/authorize?business=${business}`
    : 'https://app.test/api/auth/youtube/authorize'
  return new Request(url)
}

describe('GET /api/auth/youtube/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req('biz'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when business param missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req())
    expect(res.status).toBe(400)
  })

  it('returns 307 redirect to Google for YouTube', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req('biz'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('accounts.google.com')
  })
})
