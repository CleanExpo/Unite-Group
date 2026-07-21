import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  getUser: vi.fn(),
}))

vi.mock('@/lib/integrations/disconnect-email-account', () => ({
  disconnectEmailAccount: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { disconnectEmailAccount } from '@/lib/integrations/disconnect-email-account'
import { POST } from '../route'

function post(body: unknown) {
  return new Request('https://app.test/api/settings/integrations/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/settings/integrations/disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const res = await POST(post({ service: 'google', email: 'x@y.com' }))

    expect(res.status).toBe(401)
    expect(disconnectEmailAccount).not.toHaveBeenCalled()
  })

  it('rejects an unknown service', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)

    const res = await POST(post({ service: 'yahoo', email: 'x@y.com' }))

    expect(res.status).toBe(400)
    expect(disconnectEmailAccount).not.toHaveBeenCalled()
  })

  it('rejects a missing email', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)

    const res = await POST(post({ service: 'google' }))

    expect(res.status).toBe(400)
    expect(disconnectEmailAccount).not.toHaveBeenCalled()
  })

  it('removes exactly the one founder-scoped mailbox and returns success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(disconnectEmailAccount).mockResolvedValue(undefined)

    const res = await POST(post({ service: 'microsoft', email: 'drop@outlook.com' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(disconnectEmailAccount).toHaveBeenCalledWith('founder-1', 'microsoft', 'drop@outlook.com')
  })

  it('returns 500 when the delete fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'founder-1' } as never)
    vi.mocked(disconnectEmailAccount).mockRejectedValue(new Error('db down'))

    const res = await POST(post({ service: 'google', email: 'x@y.com' }))

    expect(res.status).toBe(500)
  })
})
