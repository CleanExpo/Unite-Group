import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/integrations/heygen', () => ({
  createTalkingHeadVideo: vi.fn(),
  getVideoStatus: vi.fn(),
}))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createTalkingHeadVideo, getVideoStatus } from '@/lib/integrations/heygen'
import { makeServiceChain } from '@/test/founder-scope-chain'
import { fingerprintCampaignAssets } from '@/lib/campaigns/approval'
import type { CampaignAsset } from '@/lib/campaigns/types'
import { POST, GET } from '../route'

const readyAsset = {
  id: 'asset-1', campaign_id: 'camp-1', founder_id: 'user-123', copy: 'Hello, this is the script.',
  platform: 'youtube', headline: null, cta: null, hashtags: [], image_url: null,
  image_prompt: 'presenter', width: 1280, height: 720, variant: 1,
  social_post_id: null, status: 'ready', visual_type: 'photo', image_engine: null,
  quality_score: null, quality_status: null, created_at: '2026-08-23', updated_at: '2026-08-23',
}

function metadataFor(asset = readyAsset) {
  const mapped = {
    id: asset.id, campaignId: asset.campaign_id, founderId: asset.founder_id,
    platform: asset.platform, copy: asset.copy, headline: asset.headline, cta: asset.cta,
    hashtags: asset.hashtags, imageUrl: asset.image_url, imagePrompt: asset.image_prompt,
    width: asset.width, height: asset.height, variant: asset.variant,
    socialPostId: asset.social_post_id, status: asset.status, visualType: asset.visual_type,
    imageEngine: asset.image_engine, qualityScore: asset.quality_score,
    qualityStatus: asset.quality_status, createdAt: asset.created_at, updatedAt: asset.updated_at,
  } as CampaignAsset
  return { approval: { status: 'approved', assetFingerprint: fingerprintCampaignAssets([mapped]) } }
}

describe('POST /api/campaigns/[id]/video', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const res = await POST(
      new Request('http://localhost/video', { method: 'POST', body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(401)
    const body = await res.json() as { error?: string }
    expect(body.error).toBe('Unauthorised')
  })

  it('returns 404 when campaign not found or wrong founder', async () => {
    const chain = makeServiceChain([
      // campaign select .single() — not found
      { data: null, error: { message: 'not found' } },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)

    const res = await POST(
      new Request('http://localhost/video', { method: 'POST', body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: 'camp-missing' }) }
    )

    expect(res.status).toBe(404)
    const body = await res.json() as { error?: string }
    expect(body.error).toBe('Campaign not found')
  })

  it('returns 400 when no ready assets exist', async () => {
    const chain = makeServiceChain([
      // campaign select .single()
      { data: { id: 'camp-1', theme: 'Test Campaign', metadata: {}, brand_profile_id: 'bp-1', brand_profiles: { client_name: 'Acme', business_key: 'acme' } }, error: null },
      // campaign_assets select — empty
      { data: [], error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)

    const res = await POST(
      new Request('http://localhost/video', { method: 'POST', body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(400)
    const body = await res.json() as { error?: string }
    expect(body.error).toBe('No ready assets to generate video from')
  })

  it('returns 200 with videoId on successful generation', async () => {
    const chain = makeServiceChain([
      // campaign select .single()
      { data: { id: 'camp-1', theme: 'Test Campaign', metadata: metadataFor(), brand_profile_id: 'bp-1', brand_profiles: { client_name: 'Acme', business_key: 'acme' } }, error: null },
      // campaign_assets select (thenable, not .single())
      { data: [readyAsset], error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)
    vi.mocked(createTalkingHeadVideo).mockResolvedValue('test-video-id')

    const res = await POST(
      new Request('http://localhost/video', { method: 'POST', body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(200)
    const body = await res.json() as { videoId?: string; status?: string }
    expect(body.videoId).toBe('test-video-id')
    expect(body.status).toBe('processing')
    expect(vi.mocked(createTalkingHeadVideo)).toHaveBeenCalledWith(
      expect.objectContaining({ script: 'Hello, this is the script.' })
    )
  })
})

describe('GET /api/campaigns/[id]/video', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)

    const res = await GET(
      new Request('http://localhost/video?video_id=abc'),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(401)
    const body = await res.json() as { error?: string }
    expect(body.error).toBe('Unauthorised')
  })

  it('returns 400 when video_id param is missing', async () => {
    const res = await GET(
      new Request('http://localhost/video'),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(400)
    const body = await res.json() as { error?: string }
    expect(body.error).toBe('video_id query param required')
  })

  it('returns 200 with video status when completed', async () => {
    const completedStatus = {
      status: 'completed' as const,
      videoUrl: 'https://cdn.heygen.com/video/test.mp4',
      thumbnailUrl: 'https://cdn.heygen.com/thumb/test.jpg',
      duration: 30,
      error: null,
    }
    vi.mocked(getVideoStatus).mockResolvedValue(completedStatus)

    const res = await GET(
      new Request('http://localhost/video?video_id=test-video-id'),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(200)
    const body = await res.json() as typeof completedStatus
    expect(body.status).toBe('completed')
    expect(body.videoUrl).toBe('https://cdn.heygen.com/video/test.mp4')
    expect(vi.mocked(getVideoStatus)).toHaveBeenCalledWith('test-video-id')
  })
})
