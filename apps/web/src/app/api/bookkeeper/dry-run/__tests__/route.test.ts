import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/bookkeeper/dry-run', () => ({
  runBookkeeperDryRun: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { runBookkeeperDryRun } from '@/lib/bookkeeper/dry-run'
import { GET } from '../route'

function req(qs = '') {
  return new NextRequest(`https://app.test/api/bookkeeper/dry-run${qs}`)
}

describe('GET /api/bookkeeper/dry-run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('runs dry run and returns result', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const result = {
      businesses: [{ businessKey: 'dr', transactionCount: 10, newTransactions: 3 }],
      totalTransactions: 10,
    }
    vi.mocked(runBookkeeperDryRun).mockResolvedValue(result as any)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalTransactions).toBe(10)
  })

  it('passes businessKey filter when provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBookkeeperDryRun).mockResolvedValue({ businesses: [], totalTransactions: 0 } as any)

    await GET(req('?business=dr'))
    expect(runBookkeeperDryRun).toHaveBeenCalledWith('user-1', 'dr')
  })

  it('returns 500 when dry run throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBookkeeperDryRun).mockRejectedValue(new Error('Xero error'))

    const res = await GET(req())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Xero error')
  })
})
