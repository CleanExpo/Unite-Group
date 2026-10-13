import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (hoisted above all imports by Vitest transform) ────────────────────

const mockSetEnabled = vi.fn(async () => {})
const mockRemove = vi.fn(async () => {})

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('@/lib/provider-pool/repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/provider-pool/repository')>()
  return {
    ...actual,
    makeSupabaseStore: vi.fn(() => ({
      setAccountEnabled: mockSetEnabled,
      removeAccount: mockRemove,
    })),
  }
})

// ── Static imports ──────────────────────────────────────────────────────────

import { getUser, createClient } from '@/lib/supabase/server'
import { PATCH, DELETE, POST } from '../route'

function patchReq(body: unknown) {
  return new Request('https://app.test/api/command-centre/provider-accounts', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as never
}
function deleteReq(body: unknown) {
  return new Request('https://app.test/api/command-centre/provider-accounts', {
    method: 'DELETE',
    body: JSON.stringify(body),
  }) as never
}

describe('PATCH /api/command-centre/provider-accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({} as never)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await PATCH(patchReq({ accountId: 'a1', enabled: false }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when accountId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await PATCH(patchReq({ enabled: false }))
    expect(res.status).toBe(400)
    expect(mockSetEnabled).not.toHaveBeenCalled()
  })

  it('returns 400 when enabled is not a boolean', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await PATCH(patchReq({ accountId: 'a1', enabled: 'yes' }))
    expect(res.status).toBe(400)
    expect(mockSetEnabled).not.toHaveBeenCalled()
  })

  it('toggles enabled, founder-scoped, returns 200', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await PATCH(patchReq({ accountId: 'a1', enabled: false }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockSetEnabled).toHaveBeenCalledWith('u1', 'a1', false)
  })

  it('returns 500 when the store throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockSetEnabled.mockRejectedValueOnce(new Error('db down'))
    const res = await PATCH(patchReq({ accountId: 'a1', enabled: true }))
    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/command-centre/provider-accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({} as never)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await DELETE(deleteReq({ accountId: 'a1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when accountId is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await DELETE(deleteReq({}))
    expect(res.status).toBe(400)
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('removes the account, founder-scoped, returns 200', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    const res = await DELETE(deleteReq({ accountId: 'a1' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(mockRemove).toHaveBeenCalledWith('u1', 'a1')
  })

  it('returns 500 when the store throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    mockRemove.mockRejectedValueOnce(new Error('db down'))
    const res = await DELETE(deleteReq({ accountId: 'a1' }))
    expect(res.status).toBe(500)
  })
})

// ── POST: works whether or not the UNI-2780 migration is applied ─────────────
function postReq(body: unknown) {
  return new Request('https://app.test/api/command-centre/provider-accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never
}

/** Fake session client: probe select on provider_accounts + capture inserts. */
function fakeClient(probeError: unknown) {
  const inserts: Array<Record<string, unknown>> = []
  const client = {
    from: (table: string) => ({
      select: () => ({ limit: async () => ({ data: [], error: probeError }) }),
      insert: (row: Record<string, unknown>) => {
        inserts.push({ __table: table, ...row })
        return { select: () => ({ single: async () => ({ data: { id: 'new-1' }, error: null }) }) }
      },
    }),
  }
  return { client, inserts }
}
const MISSING = { code: '42703', message: 'column provider_accounts.billing_kind does not exist' }

describe('POST /api/command-centre/provider-accounts — migration-agnostic (UNI-2780)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
  })

  it('migration NOT applied: a legacy metered registration succeeds with the legacy column set', async () => {
    const f = fakeClient(MISSING)
    vi.mocked(createClient).mockResolvedValue(f.client as never)
    const res = await POST(postReq({ provider: 'minimax', label: 'MiniMax (env)' }))
    expect(res.status).toBe(201)
    expect(f.inserts).toHaveLength(1)
    expect(f.inserts[0]).not.toHaveProperty('billing_kind')
    expect(f.inserts[0]).not.toHaveProperty('routable')
    expect(f.inserts[0]).toMatchObject({ __table: 'provider_accounts', founder_id: 'u1', provider: 'minimax' })
  })

  it('migration NOT applied: a subscription registration is refused (409) and nothing is written', async () => {
    const f = fakeClient(MISSING)
    vi.mocked(createClient).mockResolvedValue(f.client as never)
    const res = await POST(postReq({ provider: 'claude_max', label: 'Claude Max — seat A' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/migration .*not yet applied/i)
    expect(f.inserts).toHaveLength(0)
  })

  it('migration applied: a subscription registration persists billing_kind and routable=false', async () => {
    const f = fakeClient(null)
    vi.mocked(createClient).mockResolvedValue(f.client as never)
    const res = await POST(postReq({ provider: 'claude_max', label: 'Claude Max — seat A', planPriceAud: 320 }))
    expect(res.status).toBe(201)
    expect(f.inserts[0]).toMatchObject({ provider: 'claude_max', billing_kind: 'subscription', routable: false, plan_price_aud: 320 })
  })

  it('probe fails for another reason: 500, nothing written (fail closed)', async () => {
    const f = fakeClient({ code: '42501', message: 'permission denied' })
    vi.mocked(createClient).mockResolvedValue(f.client as never)
    const res = await POST(postReq({ provider: 'minimax', label: 'MiniMax' }))
    expect(res.status).toBe(500)
    expect(f.inserts).toHaveLength(0)
  })
})
