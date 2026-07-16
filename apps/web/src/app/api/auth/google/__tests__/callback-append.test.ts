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

async function runCallback(email: string) {
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
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/gmail.modify',
        }),
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
