import { describe, it, expect, vi, beforeEach } from 'vitest'

// oauth-state's secret() reads this at call time.
process.env.VAULT_ENCRYPTION_KEY = 'test-vault-encryption-key-0123456789'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/social', () => ({
  exchangeCode: vi.fn(async () => ({ access_token: 'tok', refresh_token: 'r', expires_in: 3600 })),
  savePlatformTokens: vi.fn(async () => {}),
}))

import { GET } from '../route'
import { getUser } from '@/lib/supabase/server'
import { savePlatformTokens } from '@/lib/integrations/social'
import { signOAuthState } from '@/lib/oauth-state'

const PLATFORM = 'linkedin'
const params = Promise.resolve({ platform: PLATFORM })

function callbackRequest(state?: string, code = 'auth-code') {
  const url = new URL(`https://app.test/api/social/${PLATFORM}/callback`)
  url.searchParams.set('code', code)
  if (state !== undefined) url.searchParams.set('state', state)
  return new Request(url)
}

const future = () => String(Date.now() + 10 * 60 * 1000)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
})

describe('social callback — OAuth CSRF protection', () => {
  it('rejects a missing state', async () => {
    const res = await GET(callbackRequest(undefined), { params })
    expect(res.headers.get('location')).toContain('error=missing_params')
  })

  it('redirects to login when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET(callbackRequest('whatever'), { params })
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('rejects an unsigned/raw base64url state (the old vulnerable form)', async () => {
    const raw = Buffer.from(JSON.stringify({ founderId: 'attacker', platform: PLATFORM, nonce: 'n' })).toString('base64url')
    const res = await GET(callbackRequest(raw), { params })
    expect(res.headers.get('location')).toContain('error=invalid_state')
    expect(savePlatformTokens).not.toHaveBeenCalled()
  })

  it('rejects a signed state bound to a different founder', async () => {
    const state = signOAuthState({ founderId: 'attacker', platform: PLATFORM, nonce: 'n', expiresAt: future() })
    const res = await GET(callbackRequest(state), { params })
    expect(res.headers.get('location')).toContain('error=invalid_state')
    expect(savePlatformTokens).not.toHaveBeenCalled()
  })

  it('rejects a state for a different platform', async () => {
    const state = signOAuthState({ founderId: 'founder-1', platform: 'facebook', nonce: 'n', expiresAt: future() })
    const res = await GET(callbackRequest(state), { params })
    expect(res.headers.get('location')).toContain('error=invalid_state')
    expect(savePlatformTokens).not.toHaveBeenCalled()
  })

  it('rejects an expired state', async () => {
    const state = signOAuthState({ founderId: 'founder-1', platform: PLATFORM, nonce: 'n', expiresAt: String(Date.now() - 1000) })
    const res = await GET(callbackRequest(state), { params })
    expect(res.headers.get('location')).toContain('error=invalid_state')
    expect(savePlatformTokens).not.toHaveBeenCalled()
  })

  it('accepts a valid founder-bound state and saves tokens against the session id', async () => {
    const state = signOAuthState({ founderId: 'founder-1', platform: PLATFORM, nonce: 'n', expiresAt: future() })
    const res = await GET(callbackRequest(state), { params })
    expect(res.headers.get('location')).toContain(`connected=${PLATFORM}`)
    // Tokens bound to the verified session id, not the state blob.
    expect(savePlatformTokens).toHaveBeenCalledWith('founder-1', PLATFORM, expect.any(Object))
  })
})
