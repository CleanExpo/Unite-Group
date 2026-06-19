import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/vault', () => ({ encrypt: vi.fn() }))
vi.mock('@/lib/email-accounts', () => ({ accountByEmail: vi.fn() }))
vi.mock('imapflow', () => ({
  ImapFlow: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { encrypt } from '@/lib/vault'
import { accountByEmail } from '@/lib/email-accounts'
import { ImapFlow } from 'imapflow'
import { POST } from '../route'

function req(body: object) {
  return new NextRequest('https://app.test/api/auth/imap/connect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/imap/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(encrypt).mockReturnValue({ encryptedValue: 'enc', iv: 'iv', salt: 'salt' })
    vi.mocked(accountByEmail).mockReturnValue({ businessKey: 'carsi', label: 'carsi' } as any)
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'biz-1' }, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(createServiceClient).mockReturnValue({
      from: vi.fn().mockReturnValue(mockChain),
    } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(req({ email: 'x@carsi.com.au', password: 'pass' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when email missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ password: 'pass' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when domain has no IMAP config', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await POST(req({ email: 'x@unknown-domain.com', password: 'pass' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('No IMAP config')
  })

  it('returns 401 when IMAP connection fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(ImapFlow).mockImplementation(() => ({
      connect: vi.fn().mockRejectedValue(new Error('Connection refused')),
      logout: vi.fn(),
    }) as any)
    const res = await POST(req({ email: 'x@carsi.com.au', password: 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('returns 200 on successful connection and storage', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(ImapFlow).mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
    }) as any)
    const mockSc = {
      from: vi.fn(),
    }
    const businessChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'biz-1' }, error: null }),
    }
    const vaultChain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }
    mockSc.from.mockReturnValueOnce(businessChain).mockReturnValueOnce(vaultChain)
    vi.mocked(createServiceClient).mockReturnValue(mockSc as any)

    const res = await POST(req({ email: 'x@carsi.com.au', password: 'pass' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
