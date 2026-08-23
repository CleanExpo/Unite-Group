import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { makeServiceChain, everyUpdateFounderScoped } from '@/test/founder-scope-chain'
import { fingerprintCampaignAssets } from '@/lib/campaigns/approval'
import type { CampaignAsset } from '@/lib/campaigns/types'
import { POST } from '../route'

const readyAsset = {
  id: 'asset-1', campaign_id: 'camp-1', founder_id: 'user-123', platform: 'facebook',
  copy: 'hi', headline: null, cta: null, hashtags: [], image_url: null,
  image_prompt: 'clean equipment', width: 1200, height: 630, variant: 1,
  social_post_id: null, status: 'ready', visual_type: 'photo', image_engine: null,
  quality_score: null, quality_status: null, created_at: '2026-08-23', updated_at: '2026-08-23',
}

function approvedMetadata(asset = readyAsset) {
  const mapped = {
    id: asset.id, campaignId: asset.campaign_id, founderId: asset.founder_id,
    platform: asset.platform, copy: asset.copy, headline: asset.headline, cta: asset.cta,
    hashtags: asset.hashtags, imageUrl: asset.image_url, imagePrompt: asset.image_prompt,
    width: asset.width, height: asset.height, variant: asset.variant,
    socialPostId: asset.social_post_id, status: asset.status, visualType: asset.visual_type,
    imageEngine: asset.image_engine, qualityScore: asset.quality_score,
    qualityStatus: asset.quality_status, createdAt: asset.created_at, updatedAt: asset.updated_at,
  } as CampaignAsset
  return { approval: { status: 'approved', approvedBy: 'user-123', approvedAt: '2026-08-23', assetFingerprint: fingerprintCampaignAssets([mapped]) } }
}

describe('POST /api/campaigns/[id]/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('founder-scopes the campaign_assets + campaigns UPDATE chains', async () => {
    const chain = makeServiceChain([
      // ready assets guard (awaited, no .single())
      { data: [readyAsset], error: null },
      // campaign select .single() for businessKey
      { data: { metadata: approvedMetadata(), brand_profiles: { business_key: 'ccw' } }, error: null },
      // social_posts insert .select('id').single()
      { data: { id: 'post-1' }, error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)

    const res = await POST(
      new Request('http://localhost/publish', { method: 'POST', body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(200)
    expect(everyUpdateFounderScoped(chain, 'user-123')).toBe(true)
  })

  it('blocks draft preparation when the exact asset version is not approved', async () => {
    const chain = makeServiceChain([
      { data: [readyAsset], error: null },
      { data: { metadata: {}, brand_profiles: { business_key: 'ccw' } }, error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)

    const res = await POST(
      new Request('http://localhost/publish', { method: 'POST' }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )
    const body = await res.json() as { code?: string }

    expect(res.status).toBe(409)
    expect(body.code).toBe('approval_required')
    expect(chain.from).not.toHaveBeenCalledWith('social_posts')
  })

  it('rejects an approval after the approved copy is changed', async () => {
    const chain = makeServiceChain([
      { data: [{ ...readyAsset, copy: 'changed after approval' }], error: null },
      { data: { metadata: approvedMetadata(), brand_profiles: { business_key: 'ccw' } }, error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)

    const res = await POST(
      new Request('http://localhost/publish', { method: 'POST' }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )
    const body = await res.json() as { code?: string }

    expect(res.status).toBe(409)
    expect(body.code).toBe('approval_stale')
    expect(chain.from).not.toHaveBeenCalledWith('social_posts')
  })

  it('fails loud instead of falling back to Synthex when selected brand has no business key', async () => {
    const chain = makeServiceChain([
      { data: [readyAsset], error: null },
      { data: { metadata: approvedMetadata(), brand_profiles: { business_key: null } }, error: null },
    ])
    vi.mocked(createServiceClient).mockReturnValue(chain as never)

    const res = await POST(
      new Request('http://localhost/publish', { method: 'POST', body: JSON.stringify({}) }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )
    const body = await res.json() as { error?: string }

    expect(res.status).toBe(400)
    expect(body.error).toContain('falling back to Synthex')
    expect(chain.from).not.toHaveBeenCalledWith('social_posts')
  })
})
