import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/businesses', () => ({
  isOwnedBusinessKey: vi.fn().mockReturnValue(false),
  BUSINESSES: [],
}))
vi.mock('@/lib/bookkeeper/receipts', () => ({
  scanReceiptCandidatesDryRun: vi.fn().mockResolvedValue({ candidates: [], totalScanned: 0 }),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { isOwnedBusinessKey } from '@/lib/businesses'
import { scanReceiptCandidatesDryRun } from '@/lib/bookkeeper/receipts'
import { GET } from '../route'

function req(qs = '') {
  return new Request(`https://app.test/api/bookkeeper/receipts/dry-run${qs}`)
}

describe('GET /api/bookkeeper/receipts/dry-run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServiceClient).mockReturnValue({} as any)
  })

  it('returns 401 when unauthorized', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns 400 when businessKey is not owned', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(isOwnedBusinessKey).mockReturnValue(false)
    const res = await GET(req('?business=unknown'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/restricted/)
  })

  it('returns 200 with dry run results', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(scanReceiptCandidatesDryRun).mockResolvedValue({ candidates: [{ id: 'r1' }] as any, totalScanned: 5 } as any)
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.dryRun).toBe(true)
  })
})
