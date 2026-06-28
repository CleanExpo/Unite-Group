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
import { PATCH, DELETE } from '../route'

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
