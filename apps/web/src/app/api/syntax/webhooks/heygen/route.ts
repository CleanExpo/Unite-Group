// POST /api/syntax/webhooks/heygen
// HeyGen async completion webhook — triggers FFMPEG compositing step
// Auth: HeyGen webhook signature verification (optional for Phase 0)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitiseError } from '@/lib/error-reporting'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // HeyGen sends: { video_id, status, url, thumbnail_url, ... }
  let payload: {
    video_id: string
    status: 'completed' | 'failed' | 'processing'
    url?: string
    thumbnail_url?: string
    error?: string
  }
  try {
    payload = await req.json()
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
    // Advance to COMPOSING
    const { error } = await supabase
      .from('video_jobs')
      .update({
        status: 'composing',
        raw_video_url: payload.url,
        thumbnail_url: payload.thumbnail_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    if (error) {
      console.error('[HeyGen Webhook] Failed to update job:', error)
      return NextResponse.json({ error: sanitiseError(error, 'Failed to update video job', { route: '/api/syntax/webhooks/heygen' }) }, { status: 500 })
    }

    // TODO: Trigger FFMPEG compositing (Phase 1)
    // For now, auto-advance to QUEUED after a delay
    // In production, this would enqueue a background job
    console.log(`[HeyGen Webhook] Job ${job.id} advanced to composing`)

    return NextResponse.json({ received: true, matched: true, next: 'composing' })
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
      return NextResponse.json({ error: sanitiseError(error, 'Failed to update video job', { route: '/api/syntax/webhooks/heygen' }) }, { status: 500 })
    }

    return NextResponse.json({ received: true, matched: true, status: 'failed' })
  }

  // Still processing — no action needed
  return NextResponse.json({ received: true, matched: true, status: 'processing' })
}
