import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero', () => ({ getXeroCredentials: vi.fn() }))
vi.mock('@/lib/oauth-state', () => ({ signOAuthState: vi.fn().mockReturnValue('signed-state') }))

import { getUser } from '@/lib/supabase/server'
import { getXeroCredentials } from '@/lib/integrations/xero'
import { GET } from '../route'

function req(business?: string) {
  const url = business
    ? `https://app.test/api/xero/connect?business=${business}`
    : 'https://app.test/api/xero/connect'
  return new Request(url)
}

describe('GET /api/xero/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
    vi.mocked(getXeroCredentials).mockReturnValue({ clientId: 'xero-client-id' } as any)
  })

  it('redirects with not_configured when Xero not set up', async () => {
    vi.mocked(getXeroCredentials).mockReturnValue({ clientId: null } as any)
    const res = await GET(req('dr'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('not_configured')
  })

  it('redirects to login when no user session', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req('dr'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('redirects to Xero OAuth when user is authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req('dr'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('xero.com')
  })

  it('redirects to Xero OAuth with signed state in URL', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req('carsi'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('state=signed-state')
  })
})
