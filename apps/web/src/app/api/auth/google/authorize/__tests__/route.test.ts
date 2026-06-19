import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/oauth-state', () => ({ signOAuthState: vi.fn().mockReturnValue('signed-state') }))
vi.mock('@/lib/integrations/google-oauth', () => ({ isGoogleConfigured: vi.fn().mockReturnValue(false) }))

import { getUser } from '@/lib/supabase/server'
import { isGoogleConfigured } from '@/lib/integrations/google-oauth'
import { GET } from '../route'

function req(qs = '') {
  return new Request(`https://app.test/api/auth/google/authorize${qs}`)
}

describe('GET /api/auth/google/authorize', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req('?email=test@test.com'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when email missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req())
    expect(res.status).toBe(400)
  })

  it('returns 503 when Google not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isGoogleConfigured).mockReturnValue(false)
    const res = await GET(req('?email=test@test.com'))
    expect(res.status).toBe(503)
  })

  it('redirects to Google OAuth when configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isGoogleConfigured).mockReturnValue(true)
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id')
    const res = await GET(req('?email=test@test.com'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('accounts.google.com')
  })
})
