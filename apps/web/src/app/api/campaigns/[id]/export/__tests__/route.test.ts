import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.fn()
let assetsResolve: any = { data: [], error: null }

function makeCampaignChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  ;(b as any).single = mockSingle
  return b
}

function makeAssetsChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then(onFulfilled: any, onRejected: any) {
      return Promise.resolve(assetsResolve).then(onFulfilled, onRejected)
    },
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.order.mockReturnValue(b)
  return b
}

const mockFromImpl = vi.fn()
const mockServiceClient = { from: mockFromImpl }

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { GET } from '../route'

const params = Promise.resolve({ id: 'camp-1' })

const campaignRow = {
  id: 'camp-1',
  founder_id: 'user-1',
  brand_profile_id: 'bp-1',
  brand_profiles: [{ client_name: 'Acme', business_key: 'dr' }],
  theme: 'Summer Sale',
  objective: 'awareness',
  platforms: ['instagram', 'facebook'],
  post_count: 5,
  date_range_start: null,
  date_range_end: null,
  status: 'completed',
  metadata: {},
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-01-15T00:00:00.000Z',
}

const assetRow = {
  id: 'asset-1',
  campaign_id: 'camp-1',
  founder_id: 'user-1',
  platform: 'instagram',
  copy: 'Check our summer sale!',
  headline: 'Big savings',
  cta: 'Shop now',
  hashtags: ['#sale', '#summer'],
  image_url: 'https://cdn.example.com/img.jpg',
  image_prompt: 'A sunny beach',
  width: 1080,
  height: 1080,
  variant: 1,
  social_post_id: null,
  status: 'approved',
  visual_type: 'photo',
  image_engine: null,
  quality_score: null,
  quality_status: null,
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-01-15T00:00:00.000Z',
}

describe('GET /api/campaigns/[id]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assetsResolve = { data: [], error: null }
    vi.mocked(createServiceClient).mockReturnValue(mockServiceClient as any)

    let callCount = 0
    mockFromImpl.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeCampaignChain()
      return makeAssetsChain()
    })
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    const res = await GET(new Request('https://app.test/api/campaigns/camp-1/export'), { params })
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid format', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: campaignRow, error: null })

    const res = await GET(new Request('https://app.test/api/campaigns/camp-1/export?format=csv'), { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Unsupported format/)
  })

  it('returns 404 when campaign not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const res = await GET(new Request('https://app.test/api/campaigns/camp-1/export'), { params })
    expect(res.status).toBe(404)
  })

  it('exports campaign as JSON by default', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: campaignRow, error: null })
    assetsResolve = { data: [assetRow], error: null }

    const res = await GET(new Request('https://app.test/api/campaigns/camp-1/export'), { params })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    expect(res.headers.get('Content-Disposition')).toContain('.json')
    const text = await res.text()
    const body = JSON.parse(text)
    expect(body.campaign.id).toBe('camp-1')
    expect(body.assets).toHaveLength(1)
  })

  it('exports campaign as markdown', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'user-1' } as any)
    mockSingle.mockResolvedValue({ data: campaignRow, error: null })
    assetsResolve = { data: [assetRow], error: null }

    const res = await GET(
      new Request('https://app.test/api/campaigns/camp-1/export?format=markdown'),
      { params }
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/markdown')
    expect(res.headers.get('Content-Disposition')).toContain('.md')
    const text = await res.text()
    expect(text).toContain('# Campaign: Summer Sale')
    expect(text).toContain('## Assets')
  })
})
