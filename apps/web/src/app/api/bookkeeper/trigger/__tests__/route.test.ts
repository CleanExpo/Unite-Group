import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/bookkeeper/orchestrator', () => ({
  runBookkeeperForAllBusinesses: vi.fn(),
  runBookkeeperForOneBusiness: vi.fn(),
}))
vi.mock('@/lib/bookkeeper/run-control', () => ({
  prepareBookkeeperRun: vi.fn(),
}))
vi.mock('@/lib/advisory/auto-trigger', () => ({
  triggerMacasAdvisory: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/error-reporting', () => ({ captureApiError: vi.fn(), sanitiseError: (_e: unknown, msg: string) => msg }))

import { getUser } from '@/lib/supabase/server'
import { runBookkeeperForAllBusinesses, runBookkeeperForOneBusiness } from '@/lib/bookkeeper/orchestrator'
import { prepareBookkeeperRun } from '@/lib/bookkeeper/run-control'
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
    vi.mocked(prepareBookkeeperRun).mockResolvedValue({
      activeRun: null,
      recoveredStaleRunIds: [],
    })
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

  it('returns 409 without invoking all-business orchestration when a run is active', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(prepareBookkeeperRun).mockResolvedValue({
      activeRun: { id: 'active-1', startedAt: '2026-07-10T06:00:00.000Z' },
      recoveredStaleRunIds: [],
    })

    const res = await POST(postReq())
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({
      success: false,
      activeRunId: 'active-1',
    })
    expect(runBookkeeperForAllBusinesses).not.toHaveBeenCalled()
    expect(runBookkeeperForOneBusiness).not.toHaveBeenCalled()
  })

  it('returns 409 without invoking single-business orchestration when a run is active', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(prepareBookkeeperRun).mockResolvedValue({
      activeRun: { id: 'active-2', startedAt: '2026-07-10T06:01:00.000Z' },
      recoveredStaleRunIds: [],
    })

    const res = await POST(postReq({ businessKey: 'dr' }))
    expect(res.status).toBe(409)
    expect(runBookkeeperForAllBusinesses).not.toHaveBeenCalled()
    expect(runBookkeeperForOneBusiness).not.toHaveBeenCalled()
  })

  it('returns 500 when orchestrator reports a failed manual run', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBookkeeperForAllBusinesses).mockResolvedValue({
      ...baseResult,
      status: 'failed',
    } as any)

    const res = await POST(postReq())
    expect(res.status).toBe(500)
    expect((await res.json()).success).toBe(false)
  })

  it('returns 207 with a non-green body for a partial manual run', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBookkeeperForOneBusiness).mockResolvedValue({
      ...baseResult,
      status: 'partial',
    } as any)

    const res = await POST(postReq({ businessKey: 'dr' }))
    expect(res.status).toBe(207)
    expect((await res.json()).success).toBe(false)
  })

  it('returns 500 when orchestrator throws', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(runBookkeeperForAllBusinesses).mockRejectedValue(new Error('Xero down'))

    const res = await POST(postReq())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('Unknown error') // sanitised — raw error not leaked
    expect(body.error).not.toContain('Xero down')
  })
})
