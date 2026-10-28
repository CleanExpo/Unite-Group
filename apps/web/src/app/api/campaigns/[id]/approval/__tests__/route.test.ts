import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/campaigns/approval', () => ({
  fingerprintCampaignAssets: vi.fn(() => 'fp-test'),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { fingerprintCampaignAssets } from '@/lib/campaigns/approval'
import { makeServiceChain, everyUpdateFounderScoped } from '@/test/founder-scope-chain'
import { POST } from '../route'

function ctx() {
  return { params: Promise.resolve({ id: 'camp-1' }) }
}
function call() {
  return POST(new Request('http://localhost/approval', { method: 'POST' }), ctx())
}
function asset(over: Record<string, unknown> = {}) {
  return { id: 'a1', campaign_id: 'camp-1', founder_id: 'user-123', status: 'ready', hashtags: [], ...over }
}
const campaignRow = { data: { id: 'camp-1', metadata: { keep: 1 }, status: 'draft' }, error: null }

describe('POST /api/campaigns/[id]/approval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('refuses unauthenticated requests and touches no data', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await call()
    expect(res.status).toBe(401)
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  // Gap: the route takes no body and does not validate params.id, so there is
  // no 400 path. The closest real refusals are 404 (not owned) and 409 (not ready).
  it('returns 404 when the campaign is not owned by the founder', async () => {
    const chain = makeServiceChain([{ data: null, error: { message: 'none' } }])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)
    const res = await call()
    expect(res.status).toBe(404)
    expect(chain.updateChains).toHaveLength(0)
  })

  it('returns 409 when the campaign has no assets', async () => {
    const chain = makeServiceChain([campaignRow, { data: [], error: null }])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)
    const res = await call()
    expect(res.status).toBe(409)
    expect(chain.updateChains).toHaveLength(0)
  })

  it('returns 409 when any asset is not ready', async () => {
    const chain = makeServiceChain([
      campaignRow,
      { data: [asset(), asset({ id: 'a2', status: 'review' })], error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)
    const res = await call()
    expect(res.status).toBe(409)
    expect(chain.updateChains).toHaveLength(0)
  })

  it('returns 500 when loading assets fails', async () => {
    const chain = makeServiceChain([campaignRow, { data: null, error: { message: 'boom' } }])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)
    const res = await call()
    expect(res.status).toBe(500)
    expect(chain.updateChains).toHaveLength(0)
  })

  it('records approval with a founder-scoped UPDATE and returns 200', async () => {
    const chain = makeServiceChain([
      campaignRow,
      { data: [asset()], error: null },
      { data: { id: 'camp-1', metadata: {} }, error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)
    const res = await call()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.approval).toMatchObject({ status: 'approved', assetFingerprint: 'fp-test' })
    expect(fingerprintCampaignAssets).toHaveBeenCalledTimes(1)
    expect(everyUpdateFounderScoped(chain, 'user-123')).toBe(true)
    expect(chain.update).toHaveBeenCalledWith({
      metadata: expect.objectContaining({
        keep: 1,
        approval: expect.objectContaining({ status: 'approved', approvedBy: 'user-123', assetFingerprint: 'fp-test' }),
      }),
    })
  })

  it('returns 500 when the approval UPDATE fails', async () => {
    const chain = makeServiceChain([
      campaignRow,
      { data: [asset()], error: null },
      { data: null, error: { message: 'write failed' } },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)
    const res = await call()
    expect(res.status).toBe(500)
  })
})
