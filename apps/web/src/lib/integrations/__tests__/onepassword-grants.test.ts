import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { createServiceClient } from '@/lib/supabase/service'
import {
  clampTtlMinutes,
  grantOpAccess,
  hasActiveOpGrant,
  revokeOpAccess,
  DEFAULT_GRANT_TTL_MINUTES,
  MAX_GRANT_TTL_MINUTES,
} from '../onepassword-grants'

const asMock = createServiceClient as unknown as ReturnType<typeof vi.fn>

describe('clampTtlMinutes', () => {
  it('defaults when absent or non-positive', () => {
    expect(clampTtlMinutes()).toBe(DEFAULT_GRANT_TTL_MINUTES)
    expect(clampTtlMinutes(0)).toBe(DEFAULT_GRANT_TTL_MINUTES)
    expect(clampTtlMinutes(-5)).toBe(DEFAULT_GRANT_TTL_MINUTES)
    expect(clampTtlMinutes(Number.NaN)).toBe(DEFAULT_GRANT_TTL_MINUTES)
  })
  it('clamps to the max and floors fractions', () => {
    expect(clampTtlMinutes(999)).toBe(MAX_GRANT_TTL_MINUTES)
    expect(clampTtlMinutes(10.9)).toBe(10)
  })
})

describe('grantOpAccess', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts a grant with a future expiry and returns the row', async () => {
    const insertRow = { id: 'g1', founder_id: 'f1', reason: 'test', expires_at: '2999-01-01T00:00:00Z' }
    const single = vi.fn(async () => ({ data: insertRow, error: null }))
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    asMock.mockReturnValue({ from: vi.fn(() => ({ insert })) })

    const grant = await grantOpAccess('f1', { reason: 'test', ttlMinutes: 10 })
    expect(grant).toEqual(insertRow)
    const inserted = insert.mock.calls[0][0]
    expect(inserted.founder_id).toBe('f1')
    expect(inserted.reason).toBe('test')
    expect(new Date(inserted.expires_at).getTime()).toBeGreaterThan(new Date(inserted.created_at).getTime())
  })

  it('throws when the insert errors', async () => {
    const single = vi.fn(async () => ({ data: null, error: { message: 'boom' } }))
    asMock.mockReturnValue({ from: vi.fn(() => ({ insert: vi.fn(() => ({ select: vi.fn(() => ({ single })) })) })) })
    await expect(grantOpAccess('f1')).rejects.toThrow(/boom/)
  })
})

describe('hasActiveOpGrant', () => {
  beforeEach(() => vi.clearAllMocks())

  function mockQuery(result: { data?: unknown[]; error?: unknown }) {
    const limit = vi.fn(async () => result)
    const gt = vi.fn(() => ({ limit }))
    const is = vi.fn(() => ({ gt }))
    const eq = vi.fn(() => ({ is }))
    const select = vi.fn(() => ({ eq }))
    asMock.mockReturnValue({ from: vi.fn(() => ({ select })) })
  }

  it('is true when a live grant row exists', async () => {
    mockQuery({ data: [{ id: 'g1' }], error: null })
    expect(await hasActiveOpGrant('f1')).toBe(true)
  })
  it('is false when no row exists', async () => {
    mockQuery({ data: [], error: null })
    expect(await hasActiveOpGrant('f1')).toBe(false)
  })
  it('throws on a query error', async () => {
    mockQuery({ data: null as unknown as unknown[], error: { message: 'db down' } })
    await expect(hasActiveOpGrant('f1')).rejects.toThrow(/db down/)
  })
})

describe('revokeOpAccess', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates revoked_at for the founder active grants', async () => {
    const is = vi.fn(async () => ({ error: null }))
    const eq = vi.fn(() => ({ is }))
    const update = vi.fn(() => ({ eq }))
    asMock.mockReturnValue({ from: vi.fn(() => ({ update })) })

    await revokeOpAccess('f1')
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ revoked_at: expect.any(String) }))
    expect(eq).toHaveBeenCalledWith('founder_id', 'f1')
  })
})
