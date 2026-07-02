// POST /api/webhooks/heygen
// HeyGen async completion webhook — marks the job publish-ready (no compositing; see UNI-2219)
// Auth: HMAC-SHA256 verification of x-heygen-signature against HEYGEN_WEBHOOK_SECRET (UNI-2224)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'
import { verifyHeyGenSignature } from '@/lib/webhooks/verify'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-heygen-signature')
  if (!verifyHeyGenSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // HeyGen sends: { video_id, status, url, thumbnail_url, ... }
  let payload: {
    video_id: string
    status: 'completed' | 'failed' | 'processing'
    url?: string
    thumbnail_url?: string
    error?: string
  }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!payload.video_id) {
    return NextResponse.json({ error: 'Missing video_id' }, { status: 400 })
  }

  const supabase = await createClient()

  // Find video job by heygen_video_id
  const { data: job } = await supabase
    .from('video_jobs')
    .select('id, founder_id, status')
    .eq('heygen_video_id', payload.video_id)
    .eq('status', 'video_pending')
    .single()

  if (!job) {
    // Could be a retry or unknown video — log and return 200 so HeyGen stops retrying
    console.warn(`[HeyGen Webhook] No matching video job for ${payload.video_id}`)
    return NextResponse.json({ received: true, matched: false })
  }

  if (payload.status === 'completed' && payload.url) {
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
        raw_video_url: payload.url,
        final_video_url: payload.url,
        thumbnail_url: payload.thumbnail_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    if (error) {
      console.error('[HeyGen Webhook] Failed to update job:', error)
      return NextResponse.json({ error: sanitiseError(error, 'Failed to update video job', { route: '/api/webhooks/heygen' }) }, { status: 500 })
    }

    console.log(`[HeyGen Webhook] Job ${job.id} completed → queued (HeyGen URL is the deliverable)`)

    return NextResponse.json({ received: true, matched: true, next: 'queued' })
  }

  if (payload.status === 'failed') {
    const { error } = await supabase
      .from('video_jobs')
      .update({
        status: 'failed',
        error_step: 'video_pending',
        error_message: payload.error || 'HeyGen rendering failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    if (error) {
      return NextResponse.json({ error: sanitiseError(error, 'Failed to update video job', { route: '/api/webhooks/heygen' }) }, { status: 500 })
    }

    return NextResponse.json({ received: true, matched: true, status: 'failed' })
  }

  // Still processing — no action needed
  return NextResponse.json({ received: true, matched: true, status: 'processing' })
}
