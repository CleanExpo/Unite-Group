// UNI-2326: two publishes of the same campaign must not create two drafts.
// The store holds every draft write until both requests have read the assets,
// so each concurrent test runs the real race, not a lucky ordering.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { fingerprintCampaignAssets } from '@/lib/campaigns/approval'
import type { CampaignAsset } from '@/lib/campaigns/types'
import { makeCampaignStore, type CampaignStoreOptions } from '@/test/campaign-publish-store'
import { POST } from '../route'

const FOUNDER = 'user-123'
const CAMPAIGN = '7c1e9a52-0000-4000-8000-000000000001'

function asset(id: string, platform: string) {
  return {
    id, campaign_id: CAMPAIGN, founder_id: FOUNDER, platform,
    copy: `copy for ${platform}`, headline: null, cta: null, hashtags: [], image_url: null,
    image_prompt: 'clean equipment', width: 1200, height: 630, variant: 1,
    social_post_id: null, status: 'ready', visual_type: 'photo', image_engine: null,
    quality_score: null, quality_status: null, created_at: '2026-11-07', updated_at: '2026-11-07',
  }
}

function approvedCampaign(assets: ReturnType<typeof asset>[]) {
  const mapped = assets.map((a) => ({
    id: a.id, campaignId: a.campaign_id, founderId: a.founder_id, platform: a.platform,
    copy: a.copy, headline: a.headline, cta: a.cta, hashtags: a.hashtags, imageUrl: a.image_url,
    imagePrompt: a.image_prompt, width: a.width, height: a.height, variant: a.variant,
    socialPostId: a.social_post_id, status: a.status, visualType: a.visual_type,
    imageEngine: a.image_engine, qualityScore: a.quality_score, qualityStatus: a.quality_status,
    createdAt: a.created_at, updatedAt: a.updated_at,
  })) as CampaignAsset[]
  return {
    id: CAMPAIGN, founder_id: FOUNDER, status: 'approved',
    metadata: {
      approval: {
        status: 'approved', approvedBy: FOUNDER, approvedAt: '2026-11-07',
        assetFingerprint: fingerprintCampaignAssets(mapped),
      },
    },
    brand_profiles: { business_key: 'ccw', client_name: 'CCW' },
  }
}

function setup(assets: ReturnType<typeof asset>[], options: CampaignStoreOptions = {}) {
  const store = makeCampaignStore({ campaign_assets: assets, campaigns: [approvedCampaign(assets)] }, options)
  vi.mocked(createServiceClient).mockReturnValue(store.client as never)
  return store
}

async function publish() {
  const res = await POST(
    new Request('http://localhost/publish', { method: 'POST' }),
    { params: Promise.resolve({ id: CAMPAIGN }) },
  )
  return { status: res.status, body: await res.json() as Record<string, unknown> }
}

describe('POST /api/campaigns/[id]/publish insert race (UNI-2326)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: FOUNDER } as never)
  })
  afterEach(() => vi.unstubAllEnvs())

  describe('switch on', () => {
    beforeEach(() => vi.stubEnv('CAMPAIGN_PUBLISH_DEDUPE_ENABLED', 'true'))

    it('two concurrent publishes create one draft; the first insert wins and the second is ignored', async () => {
      const store = setup([asset('asset-1', 'facebook')], { assetReadsBeforeWrite: 2 })

      const results = await Promise.all([publish(), publish()])

      expect(store.tables.social_posts).toHaveLength(1)
      const winner = store.tables.social_posts[0]
      expect(winner).toMatchObject({ campaign_id: CAMPAIGN, campaign_platform: 'facebook', status: 'draft' })

      expect(results.map((r) => r.status)).toEqual([200, 200])
      const created = results.filter((r) => r.body.draftsCreated === 1)
      const ignored = results.filter((r) => r.body.draftsCreated === 0)
      expect(created).toHaveLength(1)
      expect(ignored).toHaveLength(1)
      expect(created[0].body.postIds).toEqual([winner.id])
      expect(ignored[0].body).toMatchObject({ draftsReused: 1, postIds: [], alreadyPrepared: true })

      expect(store.tables.campaign_assets[0].social_post_id).toBe(winner.id)
      expect(store.calls.inserts).toHaveLength(0)
      expect(store.calls.upserts).toHaveLength(2)
      for (const call of store.calls.upserts) {
        expect(call.opts).toEqual({ onConflict: 'campaign_id,campaign_platform', ignoreDuplicates: true })
      }
    })

    it('keeps one draft per platform when a two-platform campaign is published twice at once', async () => {
      const store = setup(
        [asset('asset-1', 'facebook'), asset('asset-2', 'linkedin')],
        { assetReadsBeforeWrite: 2 },
      )

      await Promise.all([publish(), publish()])

      const keys = store.tables.social_posts.map((p) => `${p.campaign_id}/${p.campaign_platform}`).sort()
      expect(keys).toEqual([`${CAMPAIGN}/facebook`, `${CAMPAIGN}/linkedin`])
      const byPlatform = Object.fromEntries(store.tables.social_posts.map((p) => [p.campaign_platform, p.id]))
      expect(store.tables.campaign_assets.find((a) => a.id === 'asset-1')?.social_post_id).toBe(byPlatform.facebook)
      expect(store.tables.campaign_assets.find((a) => a.id === 'asset-2')?.social_post_id).toBe(byPlatform.linkedin)
    })

    it('a retry after a failed asset link resolves to the same draft instead of inserting another', async () => {
      const store = setup([asset('asset-1', 'facebook')], { failAssetUpdates: 1 })

      const first = await publish()
      expect(first.status).toBe(500)
      expect(first.body.failedPlatforms).toEqual(['facebook'])
      expect(store.tables.social_posts).toHaveLength(1)
      expect(store.tables.campaign_assets[0].social_post_id).toBeNull()

      const retry = await publish()
      expect(retry.status).toBe(200)
      expect(retry.body).toMatchObject({ draftsCreated: 0, draftsReused: 1 })
      expect(store.tables.social_posts).toHaveLength(1)
      expect(store.tables.campaign_assets[0].social_post_id).toBe(store.tables.social_posts[0].id)
    })

    it('fails loud, not with an empty success, when the unique key is missing (migration not applied)', async () => {
      const store = setup([asset('asset-1', 'facebook')], { socialPostUniqueKeys: [] })

      const res = await publish()

      expect(res.status).toBe(500)
      expect(res.body).toMatchObject({ failedPlatforms: ['facebook'], draftsCreated: 0 })
      expect(store.tables.social_posts).toHaveLength(0)
      expect(store.tables.campaign_assets[0].social_post_id).toBeNull()
    })

    it('founder-scopes every asset link and never overwrites an existing link', async () => {
      const store = setup([asset('asset-1', 'facebook')])

      await publish()

      const links = store.calls.updates.filter((u) => u.table === 'campaign_assets')
      expect(links).toHaveLength(1)
      for (const link of links) {
        expect(link.filters).toContainEqual({ col: 'founder_id', kind: 'eq', val: FOUNDER })
        expect(link.filters).toContainEqual({ col: 'social_post_id', kind: 'is', val: null })
      }
    })
  })

  describe('switch off (prior behaviour)', () => {
    it.each([undefined, '', '1', 'TRUE'])('CAMPAIGN_PUBLISH_DEDUPE_ENABLED=%j uses the old plain insert without the new columns', async (value) => {
      vi.stubEnv('CAMPAIGN_PUBLISH_DEDUPE_ENABLED', value as unknown as string)
      const store = setup([asset('asset-1', 'facebook')])

      const res = await publish()

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ draftsCreated: 1 })
      expect(res.body).not.toHaveProperty('draftsReused')
      expect(store.calls.upserts).toHaveLength(0)
      expect(store.calls.inserts).toHaveLength(1)
      expect(Object.keys(store.calls.inserts[0]).sort()).toEqual(
        ['business_key', 'content', 'founder_id', 'media_urls', 'platforms', 'scheduled_at', 'status', 'title'],
      )
    })

    it('still has the race: two concurrent publishes create two drafts (control for the switch-on test)', async () => {
      const store = setup([asset('asset-1', 'facebook')], { assetReadsBeforeWrite: 2 })

      const results = await Promise.all([publish(), publish()])

      expect(results.map((r) => r.body.draftsCreated)).toEqual([1, 1])
      expect(store.tables.social_posts).toHaveLength(2)
    })
  })
})
