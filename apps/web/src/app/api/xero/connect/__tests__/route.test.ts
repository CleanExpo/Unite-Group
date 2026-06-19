import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/integrations/xero', () => ({ getXeroCredentials: vi.fn() }))
vi.mock('@/lib/oauth-state', () => ({ signOAuthState: vi.fn().mockReturnValue('signed-state') }))

import { getUser, createClient } from '@/lib/supabase/server'
import { getXeroCredentials } from '@/lib/integrations/xero'
import { GET } from '../route'

function req(business?: string) {
  const url = business
    ? `https://app.test/api/xero/connect?business=${business}`
    : 'https://app.test/api/xero/connect'
  return new Request(url)
}

function makeSupabaseClient(totpFactors: any[] = [], aalLevel = 'aal1') {
  return {
    auth: {
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { totp: totpFactors }, error: null }),
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: aalLevel }, error: null }),
      },
    },
  }
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

  it('redirects to login when no user', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient() as any)
    const res = await GET(req('dr'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('redirects with mfa_required when AAL2 needed but not satisfied', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient([{ status: 'verified' }], 'aal1') as any)
    const res = await GET(req('dr'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('mfa_required')
  })

  it('redirects to Xero OAuth when no TOTP enrolled', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient([]) as any)
    const res = await GET(req('dr'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('xero.com')
  })

  it('redirects to Xero OAuth when AAL2 satisfied', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient([{ status: 'verified' }], 'aal2') as any)
    const res = await GET(req('dr'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('xero.com')
  })
})
