import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/oauth-state', () => ({ signOAuthState: vi.fn().mockReturnValue('signed-state') }))
vi.mock('@/lib/integrations/microsoft-oauth', () => ({
  MICROSOFT_OAUTH_SCOPES: 'Mail.ReadWrite offline_access',
  isMicrosoftConfigured: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { isMicrosoftConfigured } from '@/lib/integrations/microsoft-oauth'
import { GET } from '../route'

function req(email?: string) {
  const url = email
    ? `https://app.test/api/auth/microsoft/authorize?email=${encodeURIComponent(email)}`
    : 'https://app.test/api/auth/microsoft/authorize'
  return new Request(url)
}

describe('GET /api/auth/microsoft/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isMicrosoftConfigured).mockReturnValue(true)
    vi.stubEnv('MICROSOFT_CLIENT_ID', 'ms-client-id')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req('user@test.com'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when email param missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req())
    expect(res.status).toBe(400)
  })

  it('returns 503 when Microsoft not configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isMicrosoftConfigured).mockReturnValue(false)
    const res = await GET(req('user@test.com'))
    expect(res.status).toBe(503)
  })

  it('returns 307 redirect to Microsoft when configured', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req('user@test.com'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('microsoftonline.com')
  })
})
