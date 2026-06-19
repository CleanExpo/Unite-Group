import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/social', () => ({ buildOAuthUrl: vi.fn() }))
vi.mock('@/lib/oauth-state', () => ({ signOAuthState: vi.fn().mockReturnValue('signed-state') }))

import { getUser } from '@/lib/supabase/server'
import { buildOAuthUrl } from '@/lib/integrations/social'
import { GET } from '../route'

const ctx = (platform: string) => ({ params: Promise.resolve({ platform }) })

function req(platform: string) {
  return new Request(`https://app.test/api/social/${platform}/connect`)
}

describe('GET /api/social/[platform]/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
    vi.mocked(buildOAuthUrl).mockReturnValue('https://instagram.com/oauth/authorize?...')
  })

  it('redirects to login when no user', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req('instagram'), ctx('instagram'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('redirects to error when platform not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(buildOAuthUrl).mockReturnValue(null)
    const res = await GET(req('instagram'), ctx('instagram'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('not_configured')
  })

  it('redirects to OAuth URL when platform configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req('instagram'), ctx('instagram'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('instagram.com')
  })
})
