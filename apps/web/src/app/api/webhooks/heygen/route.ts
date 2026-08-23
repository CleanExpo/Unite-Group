// POST /api/webhooks/heygen
// HeyGen v3 async completion webhook — marks the job ready for Remotion assembly.
// Auth: raw-body HMAC plus five-minute timestamp replay protection.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import { verifyHeyGenSignature } from '@/lib/webhooks/verify'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('heygen-signature') ?? req.headers.get('x-heygen-signature')
  const timestamp = req.headers.get('heygen-timestamp')
  if (!verifyHeyGenSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let rawPayload: {
    event_type?: string
    event_data?: Record<string, unknown>
    video_id?: string
    status?: 'completed' | 'failed' | 'processing'
    url?: string
    thumbnail_url?: string
    error?: string
  }
  try {
    rawPayload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const eventData = (rawPayload.event_data ?? rawPayload) as Record<string, unknown>
  const videoId = eventData.video_id as string | undefined
  const eventType = rawPayload.event_type
  const status = eventType === 'avatar_video.success'
    ? 'completed'
    : eventType === 'avatar_video.fail'
      ? 'failed'
      : rawPayload.status
  const url = eventData.url as string | undefined
  const thumbnailUrl = eventData.thumbnail_url as string | undefined
  const errorMessage = (eventData.error ?? eventData.failure_message ?? rawPayload.error) as string | undefined

  if (!videoId) {
    return NextResponse.json({ error: 'Missing video_id' }, { status: 400 })
  }

  const supabase = await createClient()

  // Find video job by heygen_video_id
  const { data: job } = await supabase
    .from('video_jobs')
    .select('id, founder_id, status')
    .eq('heygen_video_id', videoId)
    .eq('status', 'video_pending')
    .single()

  if (!job) {
    // Could be a retry or unknown video — log and return 200 so HeyGen stops retrying
    console.warn(`[HeyGen Webhook] No matching video job for ${videoId}`)
    return NextResponse.json({ received: true, matched: false })
  }

  if (status === 'completed' && url) {
    // No server-side compositing exists: FFMPEG can't run on Vercel serverless,
    // and nothing consumes the 'composing' state, so parking the job there left
    // every render stuck forever (UNI-2219). Treat the HeyGen render as the
    // deliverable and advance straight to the publish-ready 'queued' state,
    // mirroring the working video_assets path. If real overlay/subtitle
    // compositing is ever needed, it belongs in an out-of-band worker (see
    // brand-video-worker.mjs), not this serverless webhook.
    const { error } = await supabase
      .from('video_jobs')
      .update({
        status: 'queued',
        raw_video_url: url,
        final_video_url: url,
        thumbnail_url: thumbnailUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('founder_id', job.founder_id)

    if (error) {
      console.error('[HeyGen Webhook] Failed to update job:', error)
      return NextResponse.json({ error: sanitiseError(error, 'Failed to update video job', { route: '/api/webhooks/heygen' }) }, { status: 500 })
    }

    console.log(`[HeyGen Webhook] Job ${job.id} completed → queued (HeyGen URL is the deliverable)`)

    return NextResponse.json({ received: true, matched: true, next: 'queued' })
  }

  if (status === 'failed') {
    const { error } = await supabase
      .from('video_jobs')
      .update({
        status: 'failed',
        error_step: 'video_pending',
        error_message: errorMessage || 'HeyGen rendering failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('founder_id', job.founder_id)

    if (error) {
      return NextResponse.json({ error: sanitiseError(error, 'Failed to update video job', { route: '/api/webhooks/heygen' }) }, { status: 500 })
    }

    return NextResponse.json({ received: true, matched: true, status: 'failed' })
  }

  // Still processing — no action needed
  return NextResponse.json({ received: true, matched: true, status: status ?? 'processing' })
}
