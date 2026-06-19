import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDelete = vi.fn()
const mockDeleteUser = vi.fn().mockResolvedValue({ error: null })
const mockFrom = vi.fn().mockReturnValue({ delete: () => ({ eq: vi.fn().mockReturnValue(undefined) }) })

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { DELETE } from '../route'

function req(body: object) {
  return new Request('https://app.test/api/founder/delete-account', {
    method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('DELETE /api/founder/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteUser.mockResolvedValue({ error: null })
    vi.mocked(createServiceClient).mockReturnValue({
      from: mockFrom,
      auth: { admin: { deleteUser: mockDeleteUser } },
    } as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await DELETE(req({ confirm: 'DELETE MY ACCOUNT' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when confirm string wrong', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await DELETE(req({ confirm: 'wrong' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 and deleted: true on success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const res = await DELETE(req({ confirm: 'DELETE MY ACCOUNT' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.deleted).toBe(true)
  })

  it('returns 500 when auth user deletion fails', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockDeleteUser.mockResolvedValue({ error: { message: 'Cannot delete' } })
    const res = await DELETE(req({ confirm: 'DELETE MY ACCOUNT' }))
    expect(res.status).toBe(500)
  })
})
