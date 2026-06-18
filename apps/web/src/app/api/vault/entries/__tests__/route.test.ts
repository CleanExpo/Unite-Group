import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/vault', () => ({
  encrypt: vi.fn().mockReturnValue({
    encryptedValue: 'enc',
    iv: 'iv',
    salt: 'salt',
  }),
}))

import { GET, POST } from '../route'
import { getUser, createClient } from '@/lib/supabase/server'

const AUTHED_USER = { id: 'founder-1' }

const ENTRY_ROW = {
  id: 'vault-1',
  label: 'Stripe key',
  service: 'stripe',
  notes: 'prod key',
  metadata: { businessKey: 'dr', username: '' },
  created_at: '2026-06-18T00:00:00Z',
}

function makeSupabase(selectResult: object, insertResult?: object) {
  const selectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(selectResult),
  }
  const insertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(insertResult ?? { data: { id: 'vault-new' }, error: null }),
  }
  return {
    from: vi.fn((table: string) => (table === 'credentials_vault' ? { ...selectChain, ...insertChain } : selectChain)),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue(AUTHED_USER as never)
})

describe('GET /api/vault/entries', () => {
  it('unauthenticated -> 401', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorised')
  })

  it('returns mapped entries for authenticated founder', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: [ENTRY_ROW], error: null }) as never)
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json[0].id).toBe('vault-1')
    expect(json[0].label).toBe('Stripe key')
    expect(json[0].businessKey).toBe('dr')
    // Secrets are NOT in the list response (only metadata)
    expect(json[0].secret).toBeUndefined()
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: null, error: { message: 'db-fail' } }) as never)
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

describe('POST /api/vault/entries', () => {
  it('unauthenticated -> 401', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const req = new Request('https://app.test/api/vault/entries', {
      method: 'POST',
      body: JSON.stringify({ label: 'X', service: 'stripe', secret: 's' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('returns 400 when label is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: [], error: null }) as never)
    const req = new Request('https://app.test/api/vault/entries', {
      method: 'POST',
      body: JSON.stringify({ service: 'stripe', secret: 's' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('label')
  })

  it('returns 400 when secret is missing', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: [], error: null }) as never)
    const req = new Request('https://app.test/api/vault/entries', {
      method: 'POST',
      body: JSON.stringify({ label: 'X', service: 'stripe' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('encrypts secret and returns 201 with new id', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase(
      { data: [], error: null },
      { data: { id: 'vault-new' }, error: null },
    ) as never)
    const req = new Request('https://app.test/api/vault/entries', {
      method: 'POST',
      body: JSON.stringify({ businessKey: 'dr', label: 'Stripe key', service: 'stripe', secret: 'sk_live_xxx' }),
    })
    const res = await POST(req as never)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe('vault-new')
  })
})
