// Regression guard for the multi-account requirement (UNI-2153): the Google
// OAuth callback must APPEND each distinct mailbox as its own credentials_vault
// row, never overwrite the founder's existing accounts. It does this by keying
// the upsert on (founder_id, service, label) with a per-mailbox label — so two
// different emails, even under the same businessKey, land as two rows.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET as callback } from '../callback/route'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { signOAuthState } from '@/lib/oauth-state'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

const originalEnv = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  VAULT_ENCRYPTION_KEY: process.env.VAULT_ENCRYPTION_KEY,
}

const upsertMock = vi.fn()

function makeServiceClient() {
  const maybeSingle = vi.fn().mockResolvedValue({ data: null })
  return {
    from: vi.fn((table: string) => {
      if (table === 'businesses') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle }) }) }) }
      }
      return { upsert: upsertMock }
    }),
  }
}

function signedState(email: string) {
  return signOAuthState({
    email,
    founderId: 'user-123',
    nonce: 'nonce-1',
    expiresAt: String(Date.now() + 10 * 60 * 1000),
  })
}

// The authenticated identity is now read from Google userinfo (not the requested
// state email). Track the account under test so the userinfo mock echoes it.
let currentEmail = ''
let revokeOk = true
let userinfoOk = true
let grantedScope: string | undefined = 'https://www.googleapis.com/auth/gmail.modify'

async function runCallback(email: string, authenticatedAs: string = email) {
  currentEmail = authenticatedAs
  const state = signedState(email)
  const url = `https://app.test/api/auth/google/callback?code=auth-code&state=${encodeURIComponent(state)}`
  return callback(new Request(url))
}

describe('Google callback — append-not-overwrite', () => {
  beforeEach(() => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as Awaited<ReturnType<typeof getUser>>)
    vi.mocked(createServiceClient).mockReturnValue(makeServiceClient() as never)
    upsertMock.mockResolvedValue({ error: null })
    process.env.GOOGLE_CLIENT_ID = 'valid-client.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'valid-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.test'
    process.env.VAULT_ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!'

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/revoke')) return { ok: revokeOk, status: revokeOk ? 200 : 400 } as never
        if (String(url).includes('userinfo') && !userinfoOk) return { ok: false, status: 500 } as never
        if (String(url).includes('userinfo')) {
          // Identity is confirmed from userinfo — echo the account under test.
          return { ok: true, json: async () => ({ email: currentEmail }) } as never
        }
        return {
          ok: true,
          json: async () => ({
            access_token: 'at',
            refresh_token: 'rt',
            expires_in: 3600,
            scope: grantedScope,
          }),
        } as never
      }),
    )
  })

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalEnv.GOOGLE_CLIENT_ID
    process.env.GOOGLE_CLIENT_SECRET = originalEnv.GOOGLE_CLIENT_SECRET
    process.env.NEXT_PUBLIC_APP_URL = originalEnv.NEXT_PUBLIC_APP_URL
    process.env.VAULT_ENCRYPTION_KEY = originalEnv.VAULT_ENCRYPTION_KEY
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    grantedScope = 'https://www.googleapis.com/auth/gmail.modify'
    revokeOk = true
    userinfoOk = true
  })

  it('rejects and revokes brand-only scopes granted by a non-brand account', async () => {
    grantedScope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/youtube.readonly'
    const res = await runCallback('someone-else@gmail.com')
    expect(res.headers.get('location')).toMatch(/error=brand_scope_wrong_account$/)
    expect(upsertMock).not.toHaveBeenCalled()
    const urls = vi.mocked(fetch).mock.calls.map(([u]) => String(u))
    expect(urls).toContain('https://oauth2.googleapis.com/revoke')
  })

  it('reports a failed revoke instead of claiming the grant was revoked', async () => {
    grantedScope = 'https://www.googleapis.com/auth/youtube.readonly'
    revokeOk = false
    const res = await runCallback('someone-else@gmail.com')
    expect(res.headers.get('location')).toContain('error=brand_scope_wrong_account_revoke_failed')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('revokes a brand-only grant when identity cannot be confirmed', async () => {
    grantedScope = 'https://www.googleapis.com/auth/youtube.readonly'
    userinfoOk = false
    const res = await runCallback('someone-else@gmail.com')
    expect(res.headers.get('location')).toMatch(/error=identity_unconfirmed$/)
    expect(vi.mocked(fetch).mock.calls.map(([u]) => String(u))).toContain('https://oauth2.googleapis.com/revoke')
    expect(upsertMock).not.toHaveBeenCalled()
    revokeOk = false
    const failed = await runCallback('someone-else@gmail.com')
    expect(failed.headers.get('location')).toContain('error=identity_unconfirmed_revoke_failed')
  })

  it('revokes when the token response omits scope for a non-brand account', async () => {
    grantedScope = undefined
    const res = await runCallback('someone-else@gmail.com')
    expect(res.headers.get('location')).toMatch(/error=brand_scope_wrong_account$/)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('revokes when identity is unconfirmed and the token response omits scope', async () => {
    grantedScope = undefined
    userinfoOk = false
    const res = await runCallback('someone-else@gmail.com')
    expect(res.headers.get('location')).toMatch(/error=identity_unconfirmed$/)
    expect(vi.mocked(fetch).mock.calls.map(([u]) => String(u))).toContain('https://oauth2.googleapis.com/revoke')
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('revokes when the brand account was requested but another account consented without listing brand scopes', async () => {
    grantedScope = 'https://www.googleapis.com/auth/gmail.modify'
    const res = await runCallback('contact@unite-group.in', 'someone-else@gmail.com')
    expect(res.headers.get('location')).toMatch(/error=brand_scope_wrong_account$/)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('stores brand-only scopes for the brand account', async () => {
    grantedScope = 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/webmasters.readonly'
    await runCallback('contact@unite-group.in')
    expect(upsertMock).toHaveBeenCalledTimes(1)
  })

  it('refuses to store a brand grant missing any channel-bot scope, so it never overwrites a full grant', async () => {
    for (const scope of [
      'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      undefined,
    ]) {
      upsertMock.mockClear()
      grantedScope = scope
      const res = await runCallback('contact@unite-group.in')
      expect(res.headers.get('location')).toMatch(/error=brand_scope_incomplete$/)
      expect(upsertMock).not.toHaveBeenCalled()
    }
  })

  it('upserts keyed on (founder_id, service, label) so a second account appends', async () => {
    const res = await runCallback('brand-new@gmail.com')

    expect(res.status).toBe(307)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    const [row, options] = upsertMock.mock.calls[0]
    expect(options).toEqual({ onConflict: 'founder_id,service,label' })
    // unknown mailbox → its own address is the label, so it can never collide
    // with an already-connected account's row
    expect(row.notes).toBe('brand-new@gmail.com')
    expect(row.label).toBe('brand-new@gmail.com')
    expect(row.founder_id).toBe('user-123')
    expect(row.service).toBe('google')
  })

  it('gives two same-business mailboxes distinct labels (no overwrite)', async () => {
    // Both known accounts map to businessKey "nrpg" but carry different labels.
    await runCallback('disasterrecoverynrp@gmail.com')
    await runCallback('nrpg.team@gmail.com')

    const labels = upsertMock.mock.calls.map(([row]) => row.label)
    expect(labels).toEqual(['NRPG Gmail', 'NRPG Team'])
    // distinct labels ⇒ distinct conflict keys ⇒ two rows, not one overwrite
    expect(new Set(labels).size).toBe(2)
  })
})
