// src/app/api/auth/meta/__tests__/callback.test.ts
import { describe, it, expect, vi } from 'vitest'
import { GET as callback } from '../callback/route'
import { signOAuthState } from '@/lib/oauth-state'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
}))

const ORIGINAL_META_ID = process.env.FACEBOOK_APP_ID
const ORIGINAL_META_SECRET = process.env.FACEBOOK_APP_SECRET
const ORIGINAL_OAUTH_STATE = process.env.VAULT_ENCRYPTION_KEY
const ORIGINAL_NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL

function restoreEnv(): void {
  if (ORIGINAL_META_ID === undefined) delete process.env.FACEBOOK_APP_ID
  else process.env.FACEBOOK_APP_ID = ORIGINAL_META_ID
  if (ORIGINAL_META_SECRET === undefined) delete process.env.FACEBOOK_APP_SECRET
  else process.env.FACEBOOK_APP_SECRET = ORIGINAL_META_SECRET
  if (ORIGINAL_OAUTH_STATE === undefined) delete process.env.VAULT_ENCRYPTION_KEY
  else process.env.VAULT_ENCRYPTION_KEY = ORIGINAL_OAUTH_STATE
  if (ORIGINAL_NEXT_PUBLIC_APP_URL === undefined) delete process.env.NEXT_PUBLIC_APP_URL
  else process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_NEXT_PUBLIC_APP_URL
}

describe('Meta callback route', () => {
  it('redirects to /founder/social?error=missing_params if code is missing', async () => {
    process.env.FACEBOOK_APP_ID = 'test-meta-id'
    process.env.FACEBOOK_APP_SECRET = 'test-meta-secret'
    process.env.VAULT_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'

    const req = new Request('https://app.test/api/auth/meta/callback?state=valid-state')
    const res = await callback(req)
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/founder/social?error=missing_params')
  })

  it('redirects to /founder/social?error=missing_params if state is missing', async () => {
    process.env.FACEBOOK_APP_ID = 'test-meta-id'
    process.env.FACEBOOK_APP_SECRET = 'test-meta-secret'
    process.env.VAULT_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'

    const req = new Request('https://app.test/api/auth/meta/callback?code=some-code')
    const res = await callback(req)
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/founder/social?error=missing_params')
  })

  it('redirects to /founder/social?error=invalid_state when state signature is bad', async () => {
    process.env.FACEBOOK_APP_ID = 'test-meta-id'
    process.env.FACEBOOK_APP_SECRET = 'test-meta-secret'
    process.env.VAULT_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'

    const req = new Request(
      'https://app.test/api/auth/meta/callback?code=some-code&state=garbage-state-that-fails-verify',
    )
    const res = await callback(req)
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/founder/social?error=invalid_state')
  })

  it('redirects to invalid_state when state has wrong founderId (anti-CSRF)', async () => {
    process.env.VAULT_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
    const state = signOAuthState({
      businessKey: 'synthex',
      founderId: 'attacker-id',
      nonce: 'abc',
      expiresAt: String(Date.now() + 60_000),
    })
    const req = new Request(`https://app.test/api/auth/meta/callback?code=c&state=${state}`)
    const res = await callback(req)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('redirects to invalid_state when state is expired (anti-replay)', async () => {
    process.env.VAULT_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
    const state = signOAuthState({
      businessKey: 'synthex',
      founderId: 'user-123',
      nonce: 'abc',
      expiresAt: String(Date.now() - 1),
    })
    const req = new Request(`https://app.test/api/auth/meta/callback?code=c&state=${state}`)
    const res = await callback(req)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  afterEach(() => {
    restoreEnv()
  })
})
