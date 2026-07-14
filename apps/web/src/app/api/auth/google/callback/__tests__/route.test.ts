import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/vault', () => ({ encrypt: vi.fn().mockReturnValue({ encryptedValue: 'enc', iv: 'iv', salt: 'salt' }) }))
vi.mock('@/lib/email-accounts', () => ({ accountByEmail: vi.fn().mockReturnValue(null) }))
vi.mock('@/lib/oauth-state', () => ({
  verifyOAuthState: vi.fn(),
}))

const mockFrom = vi.fn()
const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null })
const mockUpsert = vi.fn().mockResolvedValue({ error: null })

function makeChain() {
  const b: Record<string, any> = { select: vi.fn(), eq: vi.fn(), upsert: vi.fn() }
  b.select.mockReturnValue(b); b.eq.mockReturnValue(b)
  b.maybeSingle = mockMaybeSingle
  b.upsert.mockReturnValue({ error: null })
  return b
}

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyOAuthState } from '@/lib/oauth-state'
import { GET } from '../route'

function req(qs: string) {
  return new Request(`https://app.test/api/auth/google/callback${qs}`)
}

describe('GET /api/auth/google/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(makeChain())
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
    vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'client-secret')
    // Default: a valid, founder-bound, unexpired state.
    vi.mocked(verifyOAuthState).mockReturnValue({
      email: 'test@test.com',
      founderId: 'user-1',
      nonce: 'n',
      expiresAt: String(Date.now() + 10 * 60 * 1000),
    })
  })

  it('redirects to login when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req('?code=abc&state=xyz'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('redirects with error when provider returns error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req('?error=access_denied'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=access_denied')
  })

  it('redirects with missing_params when code or state absent', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await GET(req(''))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('missing_params')
  })

  it('redirects with invalid_state when state check fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(verifyOAuthState).mockImplementation(() => { throw new Error('invalid') })
    const res = await GET(req('?code=abc&state=bad'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('invalid_state')
  })

  it('redirects with invalid_state when state founderId != session (anti-CSRF)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(verifyOAuthState).mockReturnValue({
      email: 'test@test.com',
      founderId: 'attacker',
      nonce: 'n',
      expiresAt: String(Date.now() + 60_000),
    })
    const res = await GET(req('?code=abc&state=xyz'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('invalid_state')
  })

  it('redirects with invalid_state when state is expired (anti-replay)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(verifyOAuthState).mockReturnValue({
      email: 'test@test.com',
      founderId: 'user-1',
      nonce: 'n',
      expiresAt: String(Date.now() - 1),
    })
    const res = await GET(req('?code=abc&state=xyz'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('invalid_state')
  })
})
