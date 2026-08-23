// POST /api/campaigns/[id]/publish
// Prepares founder-approved campaign assets as social_posts drafts.
// This route never contacts an external social network and never schedules an
// automatic publish. External publication has its own protected approval gate.

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { scorePOET, checkSurvivalFactors } from '@/lib/content/quality-gate'
import { packageForGEO } from '@/lib/content/geo-schema'
import type { POETScore, SurvivalCheck } from '@/lib/content/quality-gate'
import { getCampaignApprovalState } from '@/lib/campaigns/approval'
import type { CampaignAsset } from '@/lib/campaigns/types'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params

  const supabase = createServiceClient()

  // Load the complete asset set. Approval applies to this exact version.
  const { data: assets, error: assetsError } = await supabase
    .from('campaign_assets')
    .select('*')
    .eq('campaign_id', id)
    .eq('founder_id', user.id)

  if (assetsError) {
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 })
  }

  if (!assets || assets.length === 0) {
    return NextResponse.json({ error: 'No campaign assets to prepare' }, { status: 400 })
  }

  const unfinished = assets.filter((asset) => asset.status !== 'ready')
  if (unfinished.length > 0) {
    return NextResponse.json(
      { error: `${unfinished.length} campaign asset(s) still need review or generation` },
      { status: 409 },
    )
  }

  // Load campaign for businessKey and exact-version approval metadata.
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('status, metadata, brand_profile_id, brand_profiles(business_key, client_name)')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const brandProfileRaw = campaign?.['brand_profiles'] as unknown
  const brandProfile = Array.isArray(brandProfileRaw)
    ? (brandProfileRaw[0] as Record<string, unknown> | undefined) ?? null
    : (brandProfileRaw as Record<string, unknown> | null)
  const businessKey = brandProfile?.['business_key'] as string | null

  if (!businessKey) {
    return NextResponse.json(
      { error: 'Selected brand is missing business_key; publish aborted instead of falling back to Synthex' },
      { status: 400 }
    )
  }

  const approvalAssets = assets.map((asset) => ({
    id: asset.id,
    campaignId: asset.campaign_id,
    founderId: asset.founder_id,
    platform: asset.platform,
    copy: asset.copy,
    headline: asset.headline,
    cta: asset.cta,
    hashtags: asset.hashtags ?? [],
    imageUrl: asset.image_url,
    imagePrompt: asset.image_prompt,
    width: asset.width,
    height: asset.height,
    variant: asset.variant,
    socialPostId: asset.social_post_id,
    status: asset.status,
    visualType: asset.visual_type ?? 'photo',
    imageEngine: asset.image_engine,
    qualityScore: asset.quality_score,
    qualityStatus: asset.quality_status,
    createdAt: asset.created_at,
    updatedAt: asset.updated_at,
  })) as CampaignAsset[]
  const metadata = campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata)
    ? campaign.metadata as Record<string, unknown>
    : {}
  const approval = getCampaignApprovalState(metadata, approvalAssets)
  if (approval.status !== 'approved') {
    return NextResponse.json(
      {
        error: approval.status === 'stale'
          ? 'Campaign changed after approval. Review and approve the new version.'
          : 'Campaign approval is required before preparing channel drafts.',
        code: approval.status === 'stale' ? 'approval_stale' : 'approval_required',
      },
      { status: 409 },
    )
  }

  // Idempotency: linked assets already have their channel drafts.
  const unpreparedAssets = assets.filter((asset) => !asset.social_post_id)
  if (unpreparedAssets.length === 0) {
    return NextResponse.json({ draftsCreated: 0, postIds: [], alreadyPrepared: true })
  }

  // Group assets by platform — create one social_post per platform with all assets as variants
  const byPlatform = new Map<string, typeof assets>()
  for (const asset of unpreparedAssets) {
    const platform = asset['platform'] as string
    if (!byPlatform.has(platform)) byPlatform.set(platform, [])
    byPlatform.get(platform)!.push(asset)
  }

  // Quality gate — POET + GEO (warn only, non-blocking)
  const primaryContent = assets[0]?.['copy'] as string | undefined
  let qualityGate: { poet: POETScore; survival: SurvivalCheck; geo: ReturnType<typeof packageForGEO> } | null = null
  if (primaryContent) {
    const [poet, survival] = await Promise.all([
      scorePOET({ content: primaryContent, contentType: 'social_post', topic: (campaign as Record<string, unknown> | null)?.['client_name'] as string ?? 'brand' }),
      Promise.resolve(checkSurvivalFactors(primaryContent)),
    ])
    const geo = packageForGEO(primaryContent, {
      title: (campaign as Record<string, unknown> | null)?.['title'] as string ?? brandProfile?.['client_name'] as string ?? 'Brand Post',
      description: primaryContent.slice(0, 160),
      author: brandProfile?.['client_name'] as string ?? 'Unite Group',
      organisation: brandProfile?.['client_name'] as string ?? undefined,
      datePublished: new Date().toISOString(),
      topics: [],
    })
    qualityGate = { poet, survival, geo }
    if (!poet.pass) {
      console.warn('[Publish] POET score below threshold:', poet.total, poet.failReasons)
    }
    if (!survival.pass) {
      console.warn('[Publish] Survival check failed:', survival.issues)
    }
  }

  let draftsCreated = 0
  const postIds: string[] = []

  for (const [platform, platformAssets] of byPlatform.entries()) {
    // Use the first variant's copy as the primary content
    const primary = platformAssets[0]
    const mediaUrls = platformAssets
      .map(a => a['image_url'] as string | null)
      .filter((u): u is string => u !== null)

    const { data: post, error: postError } = await supabase
      .from('social_posts')
      .insert({
        founder_id: user.id,
        business_key: businessKey,
        title: null,
        content: primary['copy'] as string,
        media_urls: mediaUrls,
        platforms: [platform],
        status: 'draft',
        scheduled_at: null,
      })
      .select('id')
      .single()

    if (postError || !post) {
      console.error(`[Publish] Failed to create social post for ${platform}:`, postError?.message)
      continue
    }

    postIds.push(post.id)
    draftsCreated++

    // Link assets to the social post
    await supabase
      .from('campaign_assets')
      .update({ social_post_id: post.id })
      .in('id', platformAssets.map(a => a['id'] as string))
      .eq('founder_id', user.id)
  }

  return NextResponse.json({
    draftsCreated,
    postIds,
    approvalStatus: approval.status,
    ...(qualityGate ? {
      qualityGate: {
        poetScore: qualityGate.poet.total,
        poetPass: qualityGate.poet.pass,
        survivalPass: qualityGate.survival.pass,
        geoAiSnippet: qualityGate.geo.aiSnippet,
      },
    } : {}),
  })
}
