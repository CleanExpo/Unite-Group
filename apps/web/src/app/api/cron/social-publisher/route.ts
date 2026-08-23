// src/app/api/cron/social-publisher/route.ts
// GET /api/cron/social-publisher
// Runs every 15 minutes — publishes scheduled social posts whose scheduled_at <= now().
// KEPT AT 15 MIN DELIBERATELY (PR #1005). Every other sub-hourly cron was stepped
// down for cost; this one was not. It claims each row (status -> 'publishing') BEFORE
// attempting the platforms, and maxDuration is 60s. A batch killed at the limit strands
// any claimed row: the next run selects status = 'scheduled' and will never see it
// again, and nothing re-claims stale 'publishing' rows. Halving the cadence doubles the
// batch, so it raises that risk instead of lowering it. Before slowing this route, give
// it a bounded claim with recovery (or a per-run limit) — not a bigger batch.
// Authenticates via CRON_SECRET (set by Vercel CRON).

import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { createServiceClient } from '@/lib/supabase/service'
import { decodeToken } from '@/lib/integrations/social/channels'
import { publishToPlatform } from '@/lib/integrations/social/publisher'
import { notify } from '@/lib/notifications'
import { fingerprintSocialPost, findMatchingSocialApproval } from '@/lib/campaigns/social-approval'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface SocialPostRow {
  id: string
  founder_id: string
  business_key: string
  content: string
  media_urls: string[]
  platforms: string[]
  status: string
  scheduled_at: string
  platform_post_ids: Record<string, string>
  error_message: string | null
}

interface SocialChannelRow {
  id: string
  channel_id: string
  access_token_encrypted: string
  metadata: Record<string, unknown> | null
}

export async function GET(request: Request) {
  const startTime = Date.now()

  // 1. Verify CRON_SECRET from Authorization header
  const denied = assertCronAuth(request)
  if (denied) return denied

  const founderId = getFounderUserId()
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()

  // 2. Query social_posts where status = 'scheduled' AND scheduled_at <= now()
  const { data: posts, error: queryError } = await supabase
    .from('social_posts')
    .select('*')
    .eq('status', 'scheduled')
    .eq('founder_id', founderId)
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })

  if (queryError) {
    console.error('[Social CRON] Failed to query scheduled posts:', queryError.message)
    return NextResponse.json(
      { error: 'Failed to query scheduled posts', detail: queryError.message },
      { status: 500 }
    )
  }

  const scheduledPosts = (posts ?? []) as SocialPostRow[]

  if (scheduledPosts.length === 0) {
    return NextResponse.json({ published: 0, failed: 0, skipped: 0, duration_ms: Date.now() - startTime })
  }

  let publishedCount = 0
  let failedCount = 0
  let skippedCount = 0

  // 3. Process each scheduled post
  for (const post of scheduledPosts) {
    const fingerprint = fingerprintSocialPost(post)
    const { data: approvalRows, error: approvalError } = await supabase
      .from('approval_queue')
      .select('id, status, payload')
      .eq('founder_id', post.founder_id)
      .eq('type', 'social_publish')
      .eq('status', 'approved')

    const approved = approvalError
      ? null
      : findMatchingSocialApproval(approvalRows ?? [], post.id, fingerprint, 'approved')
    if (!approved) {
      skippedCount++
      console.warn(`[Social CRON] Skipping post ${post.id}: exact-version founder approval required`)
      continue
    }

    // 3a. Update status to 'publishing'
    await supabase
      .from('social_posts')
      .update({ status: 'publishing', updated_at: new Date().toISOString() })
      .eq('id', post.id)
      .eq('founder_id', post.founder_id)

    const platformPostIds: Record<string, string> = { ...post.platform_post_ids }
    const errors: string[] = []
    let successCount = 0

    // 3b. For each platform in post.platforms
    for (const platform of post.platforms) {
      try {
        // Load social_channel for the business + platform
        const { data: channelRow, error: channelError } = await supabase
          .from('social_channels')
          .select('id, channel_id, access_token_encrypted, metadata')
          .eq('founder_id', post.founder_id)
          .eq('business_key', post.business_key)
          .eq('platform', platform)
          .eq('is_connected', true)
          .single()

        if (channelError || !channelRow) {
          errors.push(`${platform}: No connected channel found`)
          continue
        }

        const channel = channelRow as SocialChannelRow

        // Decrypt access token
        const accessToken = decodeToken(channel.access_token_encrypted)

        // Publish
        const postId = await publishToPlatform(
          platform,
          accessToken,
          {
            channel_id: channel.channel_id,
            metadata: channel.metadata ?? undefined,
          },
          {
            content: post.content,
            media_urls: post.media_urls ?? [],
          }
        )

        platformPostIds[platform] = postId
        successCount++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${platform}: ${message}`)
        console.error(`[Social CRON] ${platform} publish failed for post ${post.id}:`, message)
      }
    }

    // 3c. Determine final status
    const allFailed = successCount === 0
    const finalStatus = allFailed ? 'failed' : 'published'
    const errorMessage = errors.length > 0 ? errors.join('; ') : null

    // 3d. Update post with result
    await supabase
      .from('social_posts')
      .update({
        status: finalStatus,
        published_at: allFailed ? null : new Date().toISOString(),
        platform_post_ids: platformPostIds,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)
      .eq('founder_id', post.founder_id)

    // 4. Update linked generated_content rows to 'published'
    if (finalStatus === 'published') {
      await supabase
        .from('generated_content')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('social_post_id', post.id)
        .eq('founder_id', post.founder_id)

      publishedCount++

      const now = new Date().toISOString()
      await supabase
        .from('approval_queue')
        .update({ status: 'executed', executed_at: now, updated_at: now })
        .eq('id', approved.id)
        .eq('founder_id', post.founder_id)
        .eq('status', 'approved')
    } else {
      failedCount++
    }
  }

  const durationMs = Date.now() - startTime

  // 5. Send notification summary
  await notify({
    type: 'cron_complete',
    title: 'Social Publisher CRON',
    body: `Published ${publishedCount}, failed ${failedCount}, skipped ${skippedCount} of ${scheduledPosts.length} scheduled posts (${durationMs}ms)`,
    severity: failedCount > 0 ? 'warning' : 'info',
    metadata: {
      published: publishedCount,
      failed: failedCount,
      skipped: skippedCount,
      total: scheduledPosts.length,
      duration_ms: durationMs,
    },
  })

  return NextResponse.json({
    published: publishedCount,
    failed: failedCount,
    skipped: skippedCount,
    total: scheduledPosts.length,
    duration_ms: durationMs,
  })
}
