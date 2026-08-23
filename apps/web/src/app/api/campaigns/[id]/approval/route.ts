// POST /api/campaigns/[id]/approval
// Records founder approval for the exact current campaign asset set.
// Any later copy, image, CTA or hashtag change produces a new fingerprint and
// makes this receipt stale.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { fingerprintCampaignAssets } from '@/lib/campaigns/approval'
import type { CampaignAsset } from '@/lib/campaigns/types'

export const dynamic = 'force-dynamic'

function toFingerprintAsset(row: Record<string, unknown>): CampaignAsset {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    founderId: row.founder_id as string,
    platform: row.platform as CampaignAsset['platform'],
    copy: row.copy as string,
    headline: row.headline as string | null,
    cta: row.cta as string | null,
    hashtags: (row.hashtags as string[]) ?? [],
    imageUrl: row.image_url as string | null,
    imagePrompt: row.image_prompt as string,
    width: row.width as number,
    height: row.height as number,
    variant: row.variant as number,
    socialPostId: row.social_post_id as string | null,
    status: row.status as CampaignAsset['status'],
    visualType: (row.visual_type as CampaignAsset['visualType']) ?? 'photo',
    imageEngine: (row.image_engine as CampaignAsset['imageEngine']) ?? null,
    qualityScore: row.quality_score as number | null,
    qualityStatus: row.quality_status as CampaignAsset['qualityStatus'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = createServiceClient()

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, metadata, status')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const { data: assetRows, error: assetsError } = await supabase
    .from('campaign_assets')
    .select('*')
    .eq('campaign_id', id)
    .eq('founder_id', user.id)
    .order('id')

  if (assetsError) {
    return NextResponse.json({ error: 'Failed to load campaign assets' }, { status: 500 })
  }

  const assets = (assetRows ?? []).map((row) => toFingerprintAsset(row as Record<string, unknown>))
  if (assets.length === 0) {
    return NextResponse.json({ error: 'Campaign has no assets to approve' }, { status: 409 })
  }

  const unfinished = assets.filter((asset) => asset.status !== 'ready')
  if (unfinished.length > 0) {
    return NextResponse.json(
      { error: `${unfinished.length} campaign asset(s) still need review or generation` },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const assetFingerprint = fingerprintCampaignAssets(assets)
  const currentMetadata = campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
    ? campaign.metadata as Record<string, unknown>
    : {}
  const metadata = {
    ...currentMetadata,
    approval: {
      status: 'approved',
      approvedBy: user.id,
      approvedAt: now,
      assetFingerprint,
    },
  }

  const { data: confirmed, error: updateError } = await supabase
    .from('campaigns')
    .update({ metadata })
    .eq('id', id)
    .eq('founder_id', user.id)
    .select('id, metadata')
    .single()

  if (updateError || !confirmed) {
    return NextResponse.json({ error: 'Failed to record campaign approval' }, { status: 500 })
  }

  return NextResponse.json({
    approval: { status: 'approved', approvedAt: now, assetFingerprint },
  })
}
