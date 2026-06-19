import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Shared chain for service client ──────────────────────────────────────────
const mockSingle = vi.fn()
const mockDeleteEq2 = vi.fn()
const mockDeleteEq1 = vi.fn(() => ({ eq: mockDeleteEq2 }))
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq1 }))

function makeCampaignChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    delete: mockDelete,
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

function makeAssetsChain() {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
  return b
}

let campaignChain: ReturnType<typeof makeCampaignChain>
let assetsChain: ReturnType<typeof makeAssetsChain>
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({ captureApiError: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET, DELETE } from '../route'

describe('GET /api/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    campaignChain = makeCampaignChain()
    assetsChain = makeAssetsChain()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') return campaignChain
      if (table === 'campaign_assets') return assetsChain
      return {}
    })
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/campaigns/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when campaign is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const res = await GET(new Request('https://app.test/api/campaigns/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    expect(res.status).toBe(404)
  })

  it('returns campaign with assets', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    const campaign = {
      id: 'c-1', founder_id: 'user-1', brand_profile_id: 'bp-1',
      brand_profiles: { business_key: 'synthex', client_name: 'Synthex' },
      theme: 'summer', objective: 'awareness', platforms: ['instagram'],
      post_count: 3, date_range_start: null, date_range_end: null,
      status: 'draft', metadata: {}, created_at: '2026-01-01', updated_at: '2026-01-01',
    }
    mockSingle.mockResolvedValue({ data: campaign, error: null })
    assetsChain.order.mockReturnValueOnce(assetsChain)
    assetsChain.order.mockReturnValueOnce({ data: [], error: null })

    const res = await GET(new Request('https://app.test/api/campaigns/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.campaign.id).toBe('c-1')
    expect(body.assets).toEqual([])
  })
})

describe('DELETE /api/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    campaignChain = makeCampaignChain()
    mockDeleteEq2.mockResolvedValue({ error: null })
    mockFrom.mockReturnValue(campaignChain)
    vi.mocked(createServiceClient).mockReturnValue({ from: mockFrom } as any)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await DELETE(new Request('https://app.test/api/campaigns/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 500 on delete error', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockDeleteEq2.mockResolvedValue({ error: { message: 'FK violation' } })
    const res = await DELETE(new Request('https://app.test/api/campaigns/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(500)
  })

  it('deletes a campaign and returns success', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockDeleteEq2.mockResolvedValue({ error: null })
    const res = await DELETE(new Request('https://app.test/api/campaigns/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })
})
