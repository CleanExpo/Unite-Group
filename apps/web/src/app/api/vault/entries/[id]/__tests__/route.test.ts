import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))
vi.mock('@/lib/vault', () => ({
  encrypt: vi.fn().mockReturnValue({ encryptedValue: 'enc', iv: 'iv', salt: 'salt' }),
  decrypt: vi.fn().mockReturnValue('sk_live_decrypted'),
}))

import { GET, DELETE, PATCH } from '../route'
import { getUser, createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/vault'

const AUTHED_USER = { id: 'founder-1' }
const VAULT_ROW = {
  id: 'vault-1',
  label: 'Stripe prod',
  service: 'stripe',
  encrypted_value: 'enc',
  iv: 'iv',
  salt: 'salt',
  notes: 'production key',
  created_at: '2026-06-18T00:00:00Z',
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeSupabase(singleResult: object, updateResult?: object, deleteResult?: object) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(singleResult),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }
  if (updateResult) {
    // PATCH fetches current metadata first (one select), then updates
    let selectCallCount = 0
    chain.single = vi.fn().mockImplementation(() => {
      selectCallCount++
      return selectCallCount === 1
        ? Promise.resolve({ data: { metadata: {} }, error: null })
        : Promise.resolve(singleResult)
    })
    ;(chain.update as ReturnType<typeof vi.fn>).mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      ...({ then: (_: unknown, r: unknown) => Promise.resolve(updateResult).then(_ as never, r as never) }),
    })
    chain.eq = vi.fn().mockReturnValue({ ...chain, ...updateResult })
  }
  if (deleteResult) {
    chain.delete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      ...({ then: (_: unknown, r: unknown) => Promise.resolve(deleteResult).then(_ as never, r as never) }),
    })
  }
  return { from: vi.fn(() => chain) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue(AUTHED_USER as never)
})

describe('GET /api/vault/entries/[id]', () => {
  it('unauthenticated -> 401', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: null, error: null }) as never)
    const res = await GET(new Request('https://app.test') as never, makeParams('vault-1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when entry not found or belongs to another founder', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: null, error: { message: 'not found' } }) as never)
    const res = await GET(new Request('https://app.test') as never, makeParams('vault-1'))
    expect(res.status).toBe(404)
  })

  it('returns decrypted secret for authenticated founder', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: VAULT_ROW, error: null }) as never)
    const res = await GET(new Request('https://app.test') as never, makeParams('vault-1'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.id).toBe('vault-1')
    expect(json.secret).toBe('sk_live_decrypted')
    expect(decrypt).toHaveBeenCalledWith({ encryptedValue: 'enc', iv: 'iv', salt: 'salt' })
  })

  it('returns 500 when decryption fails', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabase({ data: VAULT_ROW, error: null }) as never)
    vi.mocked(decrypt).mockImplementationOnce(() => { throw new Error('bad key') })
    const res = await GET(new Request('https://app.test') as never, makeParams('vault-1'))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Decryption failed')
  })
})

function makeDeleteSupabase(error: null | { message: string }) {
  // Route: supabase.from('credentials_vault').delete().eq('id', id).eq('founder_id', user.id)
  // Each .eq() must return a chainable object; the second resolves to { error }.
  const innerEq = vi.fn().mockResolvedValue({ error })
  const outerEq = vi.fn().mockReturnValue({ eq: innerEq })
  return {
    from: vi.fn(() => ({ delete: vi.fn().mockReturnValue({ eq: outerEq }) })),
  }
}

describe('DELETE /api/vault/entries/[id]', () => {
  it('unauthenticated -> 401', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    vi.mocked(createClient).mockResolvedValue(makeDeleteSupabase(null) as never)
    const res = await DELETE(new Request('https://app.test') as never, makeParams('vault-1'))
    expect(res.status).toBe(401)
  })

  it('returns 204 on successful delete', async () => {
    vi.mocked(createClient).mockResolvedValue(makeDeleteSupabase(null) as never)
    const res = await DELETE(new Request('https://app.test') as never, makeParams('vault-1'))
    expect(res.status).toBe(204)
  })

  it('returns 500 on DB error', async () => {
    vi.mocked(createClient).mockResolvedValue(makeDeleteSupabase({ message: 'constraint violation' }) as never)
    const res = await DELETE(new Request('https://app.test') as never, makeParams('vault-1'))
    expect(res.status).toBe(500)
  })
})
