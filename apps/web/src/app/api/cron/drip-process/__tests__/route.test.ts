import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Supabase service mock ------------------------------------------------
let campaignsResponse: { data: any; error: any }

const chain: Record<string, any> = {
  select: vi.fn(),
  eq: vi.fn(),
  then(onFulfilled: any, onRejected: any) {
    return Promise.resolve(campaignsResponse).then(onFulfilled, onRejected)
  },
}
chain.select.mockReturnValue(chain)
chain.eq.mockReturnValue(chain)

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: vi.fn(() => chain) })),
}))

// The real switch is kept so the dormant tests exercise the shipped env check.
vi.mock('@/lib/campaigns/drip-processor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/campaigns/drip-processor')>()
  return { isDripLiveSendEnabled: actual.isDripLiveSendEnabled, processCampaignDrip: vi.fn() }
})

import { processCampaignDrip } from '@/lib/campaigns/drip-processor'
import { GET } from '../route'

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test/api/cron/drip-process', {
    headers: { authorization: auth },
  }) as any
}

describe('GET /api/cron/drip-process', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CRON_SECRET', 'test-secret')
    vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
    vi.stubEnv('DRIP_LIVE_SEND_ENABLED', 'true')
    campaignsResponse = { data: [], error: null }
  })

  it('is dormant without DRIP_LIVE_SEND_ENABLED=true: reads nothing, sends nothing (UNI-2918)', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    for (const value of ['', 'false', '1', 'TRUE']) {
      vi.stubEnv('DRIP_LIVE_SEND_ENABLED', value)
      const res = await GET(req())
      expect(res.status, JSON.stringify(value)).toBe(200)
      expect(await res.json()).toMatchObject({ dormant: true })
    }
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(processCampaignDrip).not.toHaveBeenCalled()
  })

  it('still refuses an unauthenticated caller while dormant', async () => {
    vi.stubEnv('DRIP_LIVE_SEND_ENABLED', '')
    const res = await GET(req('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('returns 401 without a valid CRON_SECRET', async () => {
    const res = await GET(req('Bearer wrong'))
    expect(res.status).toBe(401)
  })

  it('returns 500 when FOUNDER_USER_ID is not configured', async () => {
    vi.stubEnv('FOUNDER_USER_ID', '')
    const res = await GET(req())
    expect(res.status).toBe(500)
  })

  it('live-processes each active campaign and aggregates the summary', async () => {
    campaignsResponse = {
      data: [
        { id: 'camp-1', business_key: 'dr', name: 'DR welcome' },
        { id: 'camp-2', business_key: 'nrpg', name: 'NRPG onboarding' },
      ],
      error: null,
    }
    vi.mocked(processCampaignDrip)
      .mockResolvedValueOnce({ processed: 2, skipped: 0, failed: 0, dryRun: false, providerSend: 'attempted' })
      .mockResolvedValueOnce({ processed: 1, skipped: 1, failed: 1, dryRun: false, providerSend: 'attempted' })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ campaigns: 2, failedCampaigns: 0, processed: 3, skipped: 1, failed: 1 })
    expect(processCampaignDrip).toHaveBeenCalledTimes(2)
    expect(vi.mocked(processCampaignDrip).mock.calls[0][0]).toMatchObject({
      founderId: 'founder-1',
      campaignId: 'camp-1',
      businessKey: 'dr',
      dryRun: false,
    })
  })

  it('continues past a campaign whose processing throws', async () => {
    campaignsResponse = {
      data: [
        { id: 'camp-1', business_key: 'dr', name: 'DR welcome' },
        { id: 'camp-2', business_key: 'nrpg', name: 'NRPG onboarding' },
      ],
      error: null,
    }
    vi.mocked(processCampaignDrip)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ processed: 1, skipped: 0, failed: 0, dryRun: false, providerSend: 'attempted' })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ campaigns: 2, failedCampaigns: 1, processed: 1 })
  })
})
