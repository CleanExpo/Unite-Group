// src/app/api/auth/youtube/__tests__/oauth.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { GET as authorize } from '../authorize/route'
import { GET as callback } from '../callback/route'
import { signOAuthState } from '@/lib/oauth-state'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 'user-123' }),
}))

const ORIGINAL_ENV = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  VAULT_ENCRYPTION_KEY: process.env.VAULT_ENCRYPTION_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
}

function restoreEnv(): void {
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
}

describe('YouTube authorize route', () => {
  it('redirects to Google OAuth with youtube scopes when env is configured', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-id'
    process.env.VAULT_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'

    const req = new Request('https://app.test/api/auth/youtube/authorize?business=synthex')
    const res = await authorize(req)
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('accounts.google.com/o/oauth2/v2/auth')
    expect(location).toContain('youtube.upload')
  })

  it('returns 400 if business param missing', async () => {
    const req = new Request('https://app.test/api/auth/youtube/authorize')
    const res = await authorize(req)
    expect(res.status).toBe(400)
  })

  afterEach(restoreEnv)
})

describe('YouTube callback route', () => {
  it('redirects to missing_params if code is missing', async () => {
    process.env.VAULT_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
    const req = new Request('https://app.test/api/auth/youtube/callback?state=some-state')
    const res = await callback(req)
    expect(res.headers.get('location')).toContain('error=missing_params')
  })

  it('redirects to invalid_state when state signature is bad', async () => {
    process.env.VAULT_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
    const req = new Request('https://app.test/api/auth/youtube/callback?code=c&state=garbage')
    const res = await callback(req)
    expect(res.headers.get('location')).toContain('error=invalid_state')
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
    const req = new Request(`https://app.test/api/auth/youtube/callback?code=c&state=${state}`)
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
    const req = new Request(`https://app.test/api/auth/youtube/callback?code=c&state=${state}`)
    const res = await callback(req)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  afterEach(restoreEnv)
})
