import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/oauth-state', () => ({ verifyOAuthState: vi.fn() }))
vi.mock('@/lib/integrations/social/channels', () => ({ upsertChannel: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { verifyOAuthState } from '@/lib/oauth-state'
import { GET } from '../route'

function req(params: Record<string, string> = {}) {
  const url = new URL('https://app.test/api/auth/linkedin/callback')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString())
}

describe('GET /api/auth/linkedin/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.test')
    // Default: a valid, founder-bound, unexpired state.
    vi.mocked(verifyOAuthState).mockReturnValue({
      businessKey: 'test-biz',
      founderId: 'user-1',
      nonce: 'n',
      expiresAt: String(Date.now() + 10 * 60 * 1000),
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

  it('redirects with invalid_state when state verification fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(verifyOAuthState).mockImplementation(() => { throw new Error('invalid') })
    const res = await GET(req({ code: 'c', state: 'bad' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('invalid_state')
  })

  it('redirects with token_exchange_failed when fetch fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(global.fetch as any).mockResolvedValue({ ok: false, status: 400 })
    const res = await GET(req({ code: 'c', state: 's' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('token_exchange_failed')
  })

  it('redirects with invalid_state when state founderId != session (anti-CSRF)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(verifyOAuthState).mockReturnValue({
      businessKey: 'test-biz',
      founderId: 'attacker',
      nonce: 'n',
      expiresAt: String(Date.now() + 60_000),
    } as any)
    const res = await GET(req({ code: 'c', state: 's' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('invalid_state')
  })

  it('redirects with invalid_state when state is expired (anti-replay)', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(verifyOAuthState).mockReturnValue({
      businessKey: 'test-biz',
      founderId: 'user-1',
      nonce: 'n',
      expiresAt: String(Date.now() - 1),
    } as any)
    const res = await GET(req({ code: 'c', state: 's' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('invalid_state')
  })
})
