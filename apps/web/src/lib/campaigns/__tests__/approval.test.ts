import { describe, expect, it } from 'vitest'
import { fingerprintCampaignAssets, getCampaignApprovalState } from '../approval'
import type { CampaignAsset } from '../types'

const asset: CampaignAsset = {
  id: 'asset-1', campaignId: 'campaign-1', founderId: 'founder-1', platform: 'facebook',
  copy: 'Original copy', headline: 'Original headline', cta: 'Learn more', hashtags: ['cleaning'],
  imageUrl: 'https://cdn.example/image.png', imagePrompt: 'equipment in a workshop',
  width: 1200, height: 630, variant: 1, socialPostId: null, status: 'ready',
  visualType: 'photo', imageEngine: 'gemini', qualityScore: 90, qualityStatus: 'approved',
  createdAt: '2026-08-23T00:00:00Z', updatedAt: '2026-08-23T00:00:00Z',
}

describe('campaign exact-version approval', () => {
  it('accepts the unchanged approved asset set', () => {
    const fingerprint = fingerprintCampaignAssets([asset])
    const state = getCampaignApprovalState({
      approval: { status: 'approved', approvedAt: '2026-08-23', assetFingerprint: fingerprint },
    }, [asset])

    expect(state.status).toBe('approved')
  })

  it('makes approval stale when copy changes', () => {
    const fingerprint = fingerprintCampaignAssets([asset])
    const state = getCampaignApprovalState({
      approval: { status: 'approved', approvedAt: '2026-08-23', assetFingerprint: fingerprint },
    }, [{ ...asset, copy: 'Changed after approval' }])

    expect(state.status).toBe('stale')
  })

  it('is stable when the database returns assets in a different order', () => {
    const other = { ...asset, id: 'asset-2', platform: 'linkedin' as const }
    expect(fingerprintCampaignAssets([asset, other])).toBe(fingerprintCampaignAssets([other, asset]))
  })
})
