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

  it('stores the REAL authenticated account from userinfo, not the requested email', async () => {
    // The requested email in state is one thing; the account that actually
    // authenticates (per Google userinfo) is another — e.g. Google rode the
    // admin session. The stored identity MUST be the real authenticated email,
    // else additional accounts collide on the label upsert key and never connect.
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(verifyOAuthState).mockReturnValue({
      email: 'requested@test.com',
      founderId: 'user-1',
      nonce: 'n',
      expiresAt: String(Date.now() + 60_000),
    })
    const upsert = vi.fn().mockReturnValue({ error: null })
    const chain: Record<string, any> = { select: vi.fn(), eq: vi.fn(), upsert }
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null })
    mockFrom.mockReturnValue(chain)
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return { ok: true, json: async () => ({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 's' }) } as any
      }
      if (String(url).includes('userinfo')) {
        return { ok: true, json: async () => ({ email: 'real-admin@gmail.com' }) } as any
      }
      return { ok: false, text: async () => 'unexpected' } as any
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET(req('?code=abc&state=xyz'))

    const upsertArg = upsert.mock.calls[0]?.[0]
    expect(upsertArg.notes).toBe('real-admin@gmail.com')
    expect(upsertArg.metadata.email).toBe('real-admin@gmail.com')
    expect(res.headers.get('location')).toContain('connected=real-admin%40gmail.com')
  })

  it('FAILS CLOSED when userinfo fails — no vault upsert, identity_unconfirmed redirect (§11)', async () => {
    // If we cannot confirm the REAL authenticated email, tokens must NOT be
    // persisted under the unverified requested address.
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(verifyOAuthState).mockReturnValue({
      email: 'requested@test.com',
      founderId: 'user-1',
      nonce: 'n',
      expiresAt: String(Date.now() + 60_000),
    })
    const upsert = vi.fn().mockReturnValue({ error: null })
    const chain: Record<string, any> = { select: vi.fn(), eq: vi.fn(), upsert }
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null })
    mockFrom.mockReturnValue(chain)
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)

    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return { ok: true, json: async () => ({ access_token: 'at', refresh_token: 'rt', expires_in: 3600, scope: 's' }) } as any
      }
      if (String(url).includes('userinfo')) {
        // userinfo unreachable / non-OK — identity cannot be confirmed.
        return { ok: false, status: 503, json: async () => ({}) } as any
      }
      return { ok: false, text: async () => 'unexpected' } as any
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET(req('?code=abc&state=xyz'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=identity_unconfirmed')
    // Fail-closed: nothing persisted.
    expect(upsert).not.toHaveBeenCalled()
  })
})
