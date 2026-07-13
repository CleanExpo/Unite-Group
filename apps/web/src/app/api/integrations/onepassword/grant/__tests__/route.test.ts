import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/integrations/onepassword-grants', () => ({
  grantOpAccess: vi.fn(),
  hasActiveOpGrant: vi.fn(),
  revokeOpAccess: vi.fn(),
}))
vi.mock('@/lib/integrations/onepassword', () => ({ isOpConfigured: vi.fn(() => true) }))

import { getUser } from '@/lib/supabase/server'
import { grantOpAccess, hasActiveOpGrant, revokeOpAccess } from '@/lib/integrations/onepassword-grants'
import { GET, POST, DELETE } from '../route'

const user = getUser as unknown as ReturnType<typeof vi.fn>
const grant = grantOpAccess as unknown as ReturnType<typeof vi.fn>
const hasGrant = hasActiveOpGrant as unknown as ReturnType<typeof vi.fn>
const revoke = revokeOpAccess as unknown as ReturnType<typeof vi.fn>

function post(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/integrations/onepassword/grant', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('/api/integrations/onepassword/grant', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET returns 401 without a user', async () => {
    user.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
  })

  it('POST returns 401 without a user', async () => {
    user.mockResolvedValue(null)
    expect((await POST(post({}))).status).toBe(401)
  })

  it('GET reports configured + active state', async () => {
    user.mockResolvedValue({ id: 'f1' })
    hasGrant.mockResolvedValue(true)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ configured: true, active: true })
  })

  it('POST creates a grant and returns 201 with the expiry', async () => {
    user.mockResolvedValue({ id: 'f1' })
    grant.mockResolvedValue({ expires_at: '2999-01-01T00:00:00Z' })
    const res = await POST(post({ reason: 'audit run', ttlMinutes: 10 }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ granted: true, expiresAt: '2999-01-01T00:00:00Z' })
    expect(grant).toHaveBeenCalledWith('f1', { reason: 'audit run', ttlMinutes: 10 })
  })

  it('DELETE revokes and returns 200', async () => {
    user.mockResolvedValue({ id: 'f1' })
    revoke.mockResolvedValue(undefined)
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ revoked: true })
    expect(revoke).toHaveBeenCalledWith('f1')
  })
})
