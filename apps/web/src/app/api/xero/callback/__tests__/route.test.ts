import { describe, it, expect, vi, beforeEach } from 'vitest'

// oauth-state's secret() reads this at call time.
process.env.VAULT_ENCRYPTION_KEY = 'test-vault-encryption-key-0123456789'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/xero', () => ({
  getXeroCredentials: vi.fn(() => ({ clientId: 'cid', clientSecret: 'secret' })),
  selectXeroTenantForBusiness: vi.fn(() => null),
}))

import { GET } from '../route'
import { getUser } from '@/lib/supabase/server'
import { signOAuthState } from '@/lib/oauth-state'

function callbackRequest(state?: string) {
  const url = new URL('https://app.test/api/xero/callback')
  url.searchParams.set('code', 'auth-code')
  if (state !== undefined) url.searchParams.set('state', state)
  return new Request(url)
}

const future = () => String(Date.now() + 10 * 60 * 1000)

beforeEach(() => {
  vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
  // Token exchange fails fast on the valid path (we only assert it got PAST the CSRF check).
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'x', json: async () => ({}) } as Response)
})

describe('xero callback — OAuth CSRF protection', () => {
  it('rejects a missing state', async () => {
    const res = await GET(callbackRequest())
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('rejects an unsigned/raw businessKey state (the old vulnerable form)', async () => {
    const res = await GET(callbackRequest('default'))
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('rejects a state bound to a different founder', async () => {
    const state = signOAuthState({ businessKey: 'default', founderId: 'attacker', nonce: 'n', expiresAt: future() })
    const res = await GET(callbackRequest(state))
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('rejects an expired state', async () => {
    const state = signOAuthState({ businessKey: 'default', founderId: 'founder-1', nonce: 'n', expiresAt: String(Date.now() - 1000) })
    const res = await GET(callbackRequest(state))
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('accepts a valid founder-bound state (passes the CSRF check)', async () => {
    const state = signOAuthState({ businessKey: 'default', founderId: 'founder-1', nonce: 'n', expiresAt: future() })
    const res = await GET(callbackRequest(state))
    // It proceeds past state validation (then fails the mocked token exchange) — NOT an invalid_state rejection.
    expect(res.headers.get('location')).not.toContain('error=invalid_state')
  })
})
