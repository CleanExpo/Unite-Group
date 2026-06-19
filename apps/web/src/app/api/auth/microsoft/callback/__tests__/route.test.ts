import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/oauth-state', () => ({ verifyOAuthState: vi.fn() }))
vi.mock('@/lib/vault', () => ({ encrypt: vi.fn() }))
vi.mock('@/lib/email-accounts', () => ({ accountByEmail: vi.fn() }))
vi.mock('@/lib/integrations/microsoft-oauth', () => ({
  MICROSOFT_OAUTH_SCOPES: 'Mail.ReadWrite offline_access',
  isMicrosoftConfigured: vi.fn(),
  fetchMicrosoftSender: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { isMicrosoftConfigured, verifyOAuthState as _v } from '@/lib/integrations/microsoft-oauth'
import { verifyOAuthState } from '@/lib/oauth-state'
import { GET } from '../route'

function req(params: Record<string, string> = {}) {
  const url = new URL('https://app.test/api/auth/microsoft/callback')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString())
}

describe('GET /api/auth/microsoft/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
    vi.mocked(isMicrosoftConfigured).mockReturnValue(true)
    vi.mocked(verifyOAuthState).mockReturnValue({
      email: 'user@test.com',
      founderId: 'user-1',
      nonce: 'nonce',
      expiresAt: String(Date.now() + 600_000),
    } as any)
    global.fetch = vi.fn()
  })

  it('redirects to login when no user', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req({ code: 'c', state: 's' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('redirects with error when error param present', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req({ error: 'access_denied' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=access_denied')
  })

  it('redirects with missing_params when no code/state', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('missing_params')
  })

  it('redirects with microsoft_not_configured when not set up', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isMicrosoftConfigured).mockReturnValue(false)
    const res = await GET(req({ code: 'c', state: 's' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('microsoft_not_configured')
  })

  it('redirects with invalid_state when state verification fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(verifyOAuthState).mockImplementation(() => { throw new Error('invalid') })
    const res = await GET(req({ code: 'c', state: 'bad' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('invalid_state')
  })
})
