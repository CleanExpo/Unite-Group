// POST /api/campaigns/[id]/video
// Generates a HeyGen talking-head video from the campaign's primary ready asset.
// Returns immediately with video_id for async polling.
// Poll status via: GET /api/campaigns/[id]/video?video_id=<id>

import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createTalkingHeadVideo, getVideoStatus } from '@/lib/integrations/heygen'

export const dynamic = 'force-dynamic'

const DEFAULT_AVATAR_ID = 'Daisy-inskirt-20220818'  // HeyGen default avatar
const DEFAULT_ASPECT_RATIO = '9:16' as const          // Vertical for social

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = createServiceClient()

  // Parse optional body — avatarId, voiceId, aspectRatio
  let avatarId = DEFAULT_AVATAR_ID
  let voiceId: string | undefined
  let aspectRatio: '16:9' | '9:16' | '1:1' = DEFAULT_ASPECT_RATIO
  try {
    const body = await request.json() as { avatarId?: string; voiceId?: string; aspectRatio?: '16:9' | '9:16' | '1:1' }
    if (body.avatarId) avatarId = body.avatarId
    if (body.voiceId) voiceId = body.voiceId
    if (body.aspectRatio) aspectRatio = body.aspectRatio
  } catch {
    // all fields optional
  }

  // Load campaign + brand profile for client name
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, title, brand_profile_id, brand_profiles(client_name, business_key)')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Load the primary ready asset (first video_script or social_post type with copy)
  const { data: assets } = await supabase
    .from('campaign_assets')
    .select('id, copy, platform')
    .eq('campaign_id', id)
    .eq('founder_id', user.id)
    .eq('status', 'ready')
    .limit(5)

  if (!assets || assets.length === 0) {
    return NextResponse.json({ error: 'No ready assets to generate video from' }, { status: 400 })
  }

  // Prefer a video_script asset, fall back to first asset with copy
  const primary = assets.find(a => (a.platform as string) === 'video_script') ?? assets[0]
  const script = primary?.['copy'] as string | null

  if (!script?.trim()) {
    return NextResponse.json({ error: 'Primary asset has no copy to use as script' }, { status: 400 })
  }

  const brandProfileRaw = campaign['brand_profiles'] as unknown
  const brandProfile = Array.isArray(brandProfileRaw)
    ? (brandProfileRaw[0] as Record<string, unknown> | undefined)
    : (brandProfileRaw as Record<string, unknown> | null)
  const clientName = brandProfile?.['client_name'] as string | null

  try {
    const videoId = await createTalkingHeadVideo({
      avatarId,
      script,
      voiceId,
      aspectRatio,
      title: campaign.title ?? (clientName ? `${clientName} — Video` : 'Campaign Video'),
    })

    return NextResponse.json({
      videoId,
      status: 'processing',
      message: 'Video generation started. Poll GET /api/campaigns/[id]/video?video_id=<id> for status.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[HeyGen] Video generation failed:', msg)
    return NextResponse.json({ error: `HeyGen error: ${msg}` }, { status: 502 })
  }
}

export async function GET(
  request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('video_id')

  if (!videoId) {
    return NextResponse.json({ error: 'video_id query param required' }, { status: 400 })
  }

  try {
    const status = await getVideoStatus(videoId)
    return NextResponse.json(status)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `HeyGen error: ${msg}` }, { status: 502 })
  }
}
