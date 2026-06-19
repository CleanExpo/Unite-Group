import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/bookkeeper/orchestrator', () => ({
  runBookkeeperForAllBusinesses: vi.fn(),
  runBookkeeperForOneBusiness: vi.fn(),
}))
vi.mock('@/lib/advisory/auto-trigger', () => ({
  triggerMacasAdvisory: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/error-reporting', () => ({ captureApiError: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { runBookkeeperForAllBusinesses, runBookkeeperForOneBusiness } from '@/lib/bookkeeper/orchestrator'
import { POST } from '../route'

const baseResult = {
  status: 'completed',
  runId: 'run-1',
  totalTransactions: 20,
  autoReconciled: 18,
  flaggedForReview: 2,
  failedCount: 0,
  gstCollectedCents: 5000,
  gstPaidCents: 2000,
  netGstCents: 3000,
  businessResults: [{
    businessKey: 'dr',
    businessName: 'Disaster Recovery',
    status: 'completed',
    transactionCount: 20,
    autoReconciled: 18,
    flaggedForReview: 2,
    totalFetched: 22,
    alreadyReconciledInXero: 2,
    invoicesFetched: 10,
    statementLinesFetched: 12,
    error: null,
  }],
}

function postReq(body: object | null = null) {
  return new NextRequest('https://app.test/api/bookkeeper/trigger', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/bookkeeper/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await POST(postReq())
    expect(res.status).toBe(401)
  })

  it('runs all businesses when no businessKey provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBookkeeperForAllBusinesses).mockResolvedValue(baseResult as any)

    const res = await POST(postReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mode).toBe('all')
    expect(body.success).toBe(true)
    expect(runBookkeeperForAllBusinesses).toHaveBeenCalledWith('user-1')
  })

  it('runs single business when businessKey is provided', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBookkeeperForOneBusiness).mockResolvedValue(baseResult as any)

    const res = await POST(postReq({ businessKey: 'dr' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mode).toBe('single')
    expect(body.businessKey).toBe('dr')
    expect(runBookkeeperForOneBusiness).toHaveBeenCalledWith('user-1', 'dr')
  })

  it('returns 500 when orchestrator throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBookkeeperForAllBusinesses).mockRejectedValue(new Error('Xero down'))

    const res = await POST(postReq())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Xero down')
  })
})
