import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/auth/private-access', () => ({ hasPrivateAccess: vi.fn() }))
vi.mock('@/lib/vault', () => ({ encrypt: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/social/channels', () => ({ upsertChannel: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { hasPrivateAccess } from '@/lib/auth/private-access'
import { encrypt } from '@/lib/vault'
import { createServiceClient } from '@/lib/supabase/service'
import { upsertChannel } from '@/lib/integrations/social/channels'
import { POST } from '../route'

function postReq(body: unknown) {
  return new Request('https://app.test/api/founder/credentials/seed', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// A service-client stub whose vault upsert resolves to a chosen result and whose
// social read-back resolves to a chosen row.
function stubClient(opts: {
  vaultResult?: { data: unknown; error: unknown }
  socialConfirm?: { data: unknown }
}) {
  const vaultChain = {
    upsert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(opts.vaultResult ?? { data: { id: 'v1', service: 's', label: 'l' }, error: null }),
  }
  const socialChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(opts.socialConfirm ?? { data: { id: 'c1' } }),
  }
  return {
    from: vi.fn((table: string) => (table === 'social_channels' ? socialChain : vaultChain)),
  }
}

const ARMED = process.env.CREDENTIAL_SEED_ENABLED

describe('POST /api/founder/credentials/seed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CREDENTIAL_SEED_ENABLED = 'true'
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1', email: 'founder@x.test' } as any)
    vi.mocked(hasPrivateAccess).mockReturnValue(true)
    vi.mocked(encrypt).mockReturnValue({ encryptedValue: 'ct', iv: 'iv', salt: 'salt' })
  })
  afterEach(() => {
    if (ARMED === undefined) delete process.env.CREDENTIAL_SEED_ENABLED
    else process.env.CREDENTIAL_SEED_ENABLED = ARMED
  })

  it('404s when the arming flag is unset (dormant by default)', async () => {
    delete process.env.CREDENTIAL_SEED_ENABLED
    const res = await POST(postReq({ target: 'vault', service: 'google', label: 'a', value: 'k' }))
    expect(res.status).toBe(404)
    // Auth must not even be consulted for a disabled endpoint.
    expect(getUser).not.toHaveBeenCalled()
  })

  it('401s when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as any)
    const res = await POST(postReq({ target: 'vault', service: 'google', label: 'a', value: 'k' }))
    expect(res.status).toBe(401)
  })

  it('403s when the user is not an allow-listed founder', async () => {
    vi.mocked(hasPrivateAccess).mockReturnValue(false)
    const res = await POST(postReq({ target: 'vault', service: 'google', label: 'a', value: 'k' }))
    expect(res.status).toBe(403)
  })

  it('400s on an unknown target', async () => {
    const res = await POST(postReq({ target: 'nope', service: 'google' }))
    expect(res.status).toBe(400)
  })

  it('400s when a vault seed omits the value', async () => {
    const res = await POST(postReq({ target: 'vault', service: 'google', label: 'a' }))
    expect(res.status).toBe(400)
  })

  it('seeds a vault credential server-side and confirms the write (201)', async () => {
    const client = stubClient({ vaultResult: { data: { id: 'v1', service: 'google', label: 'gmail' }, error: null } })
    vi.mocked(createServiceClient).mockReturnValue(client as any)

    const tokens = { access_token: 'a', refresh_token: 'r', expires_at: 0, scope: 's' }
    const res = await POST(postReq({ target: 'vault', service: 'google', label: 'gmail', notes: 'me@x.test', value: tokens }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.seeded).toEqual({ target: 'vault', service: 'google', label: 'gmail' })
    // Encryption happened server-side over the serialised token object.
    expect(encrypt).toHaveBeenCalledWith(JSON.stringify(tokens))
  })

  it('does not echo the seeded value in the response (no secret leak)', async () => {
    const client = stubClient({})
    vi.mocked(createServiceClient).mockReturnValue(client as any)
    const res = await POST(postReq({ target: 'vault', service: 'semrush', label: 'api', value: 'super-secret-key' }))
    const text = await res.text()
    expect(text).not.toContain('super-secret-key')
  })

  it('500s when the vault write cannot be confirmed (no green 200 over nothing)', async () => {
    const client = stubClient({ vaultResult: { data: null, error: null } })
    vi.mocked(createServiceClient).mockReturnValue(client as any)
    const res = await POST(postReq({ target: 'vault', service: 'google', label: 'a', value: 'k' }))
    expect(res.status).toBe(500)
  })

  it('500s when the vault upsert errors', async () => {
    const client = stubClient({ vaultResult: { data: null, error: { message: 'boom' } } })
    vi.mocked(createServiceClient).mockReturnValue(client as any)
    const res = await POST(postReq({ target: 'vault', service: 'google', label: 'a', value: 'k' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toContain('boom') // sanitised
  })

  it('seeds a social channel via the shared upsert path and confirms it (201)', async () => {
    const client = stubClient({ socialConfirm: { data: { id: 'c1' } } })
    vi.mocked(createServiceClient).mockReturnValue(client as any)
    vi.mocked(upsertChannel).mockResolvedValue(undefined as any)

    const res = await POST(postReq({
      target: 'social',
      platform: 'linkedin',
      businessKey: 'unite',
      channelId: 'chan-1',
      channelName: 'Unite Group',
      accessToken: 'tok',
      refreshToken: 'ref',
      expiresAt: 1_800_000_000_000,
    }))
    expect(res.status).toBe(201)
    expect(upsertChannel).toHaveBeenCalledWith(
      expect.objectContaining({ founderId: 'user-1', platform: 'linkedin', channelId: 'chan-1' }),
    )
  })

  it('500s when a seeded social channel cannot be read back', async () => {
    const client = stubClient({ socialConfirm: { data: null } })
    vi.mocked(createServiceClient).mockReturnValue(client as any)
    vi.mocked(upsertChannel).mockResolvedValue(undefined as any)

    const res = await POST(postReq({
      target: 'social',
      platform: 'linkedin',
      businessKey: 'unite',
      channelId: 'chan-1',
      channelName: 'Unite Group',
      accessToken: 'tok',
      expiresAt: 1_800_000_000_000,
    }))
    expect(res.status).toBe(500)
  })
})
