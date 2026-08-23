// POST /api/social/publish/[id]
// Publishes a scheduled or draft post to all target platforms
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { decodeToken } from '@/lib/integrations/social/channels'
import { publishToPlatform } from '@/lib/integrations/social/publisher'
import { fingerprintSocialPost, findMatchingSocialApproval } from '@/lib/campaigns/social-approval'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const supabase = createServiceClient()

  const { data: post, error: postErr } = await supabase
    .from('social_posts')
    .select('*')
    .eq('id', id)
    .eq('founder_id', user.id)
    .single()

  if (postErr || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (!['draft', 'scheduled'].includes(post.status)) {
    return NextResponse.json({ error: 'Post is not in a publishable state' }, { status: 400 })
  }

  const fingerprint = fingerprintSocialPost(post)
  const { data: approvalRows, error: approvalReadError } = await supabase
    .from('approval_queue')
    .select('id, status, payload')
    .eq('founder_id', user.id)
    .eq('type', 'social_publish')
    .in('status', ['pending', 'approved'])

  if (approvalReadError) {
    return NextResponse.json({ error: 'Failed to check publishing approval' }, { status: 500 })
  }

  const approvals = approvalRows ?? []
  const approved = findMatchingSocialApproval(approvals, post.id, fingerprint, 'approved')
  if (!approved) {
    const pending = findMatchingSocialApproval(approvals, post.id, fingerprint, 'pending')
    if (pending) {
      return NextResponse.json(
        { status: 'awaiting_approval', approvalId: pending.id },
        { status: 202 },
      )
    }

    const { data: created, error: approvalError } = await supabase
      .from('approval_queue')
      .insert({
        founder_id: user.id,
        type: 'social_publish',
        title: `Publish ${post.business_key} post`,
        description: `External publication to ${(post.platforms as string[]).join(', ')}`,
        payload: {
          postId: post.id,
          businessKey: post.business_key,
          platforms: post.platforms,
          fingerprint,
        },
        status: 'pending',
      })
      .select('id')
      .single()

    if (approvalError || !created) {
      return NextResponse.json({ error: 'Failed to create publishing approval' }, { status: 500 })
    }

    return NextResponse.json(
      { status: 'awaiting_approval', approvalId: created.id },
      { status: 202 },
    )
  }

  if (post.status === 'scheduled' && post.scheduled_at && new Date(post.scheduled_at).getTime() > Date.now()) {
    return NextResponse.json({ status: 'approved_scheduled', approvalId: approved.id })
  }

  await supabase.from('social_posts').update({ status: 'publishing' }).eq('id', id).eq('founder_id', user.id)

  const platformPostIds: Record<string, string> = {}
  const errors: string[] = []

  for (const platform of post.platforms as string[]) {
    const { data: channel } = await supabase
      .from('social_channels')
      .select('access_token_encrypted, channel_id, metadata')
      .eq('founder_id', user.id)
      .eq('platform', platform)
      .eq('business_key', post.business_key)
      .eq('is_connected', true)
      .maybeSingle()

    if (!channel) {
      errors.push(`${platform}: no connected account`)
      continue
    }

    let accessToken: string
    try {
      accessToken = decodeToken(channel.access_token_encrypted)
    } catch {
      errors.push(`${platform}: token decrypt failed`)
      continue
    }

    try {
      const postId = await publishToPlatform(platform, accessToken, channel, post)
      platformPostIds[platform] = postId
    } catch (err) {
      errors.push(`${platform}: ${err instanceof Error ? err.message : 'publish failed'}`)
    }
  }

  const allFailed = errors.length === post.platforms.length
  const status = allFailed ? 'failed' : 'published'

  await supabase.from('social_posts').update({
    status,
    published_at: allFailed ? null : new Date().toISOString(),
    platform_post_ids: { ...(post.platform_post_ids ?? {}), ...platformPostIds },
    error_message: errors.length ? errors.join('; ') : null,
  }).eq('id', id).eq('founder_id', user.id)

  if (!allFailed) {
    const now = new Date().toISOString()
    await supabase
      .from('approval_queue')
      .update({ status: 'executed', executed_at: now, updated_at: now })
      .eq('id', approved.id)
      .eq('founder_id', user.id)
      .eq('status', 'approved')
  }

  return NextResponse.json({
    status,
    platformPostIds,
    errors: errors.length ? errors : undefined,
  })
}

// publishToPlatform is now imported from @/lib/integrations/social/publisher
