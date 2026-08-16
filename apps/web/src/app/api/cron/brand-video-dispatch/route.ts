// GET /api/cron/brand-video-dispatch — UNI-2373 P5
//
// Thin Vercel cron processor for Brand Video Studio. Jobs enqueue into
// `brand_video_jobs`; ffmpeg rendering cannot run on Vercel, so this cron
// counts queued rows and (when armed) workflow_dispatches
// `brand-video-render.yml` on GitHub Actions.
//
// Arming: BRAND_VIDEO_DISPATCH_LIVE=1 AND GITHUB_TOKEN set. Without arming,
// the route still authenticates and reports honest queue depth (never fake
// "rendered"). Schedule: every 30 minutes (vercel.json).

import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { sanitiseError } from '@/lib/error-reporting'
import {
  decideBrandVideoDispatch,
  dispatchBrandVideoWorkflow,
  isBrandVideoDispatchLive,
} from '@/lib/brand-video/dispatch'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const NO_STORE = { 'Cache-Control': 'no-store' } as const

export async function GET(request: Request) {
  const denied = assertCronAuth(request)
  if (denied) return denied

  try {
    const supabase = createServiceClient()
    const { count, error } = await supabase
      .from('brand_video_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'queued')

    if (error) {
      return NextResponse.json(
        {
          error: sanitiseError(error, 'Failed to count queued brand-video jobs', {
            route: '/api/cron/brand-video-dispatch',
          }),
        },
        { status: 500, headers: NO_STORE },
      )
    }

    const queued = count ?? 0
    const token = process.env.GITHUB_TOKEN?.trim() ?? ''
    const decision = decideBrandVideoDispatch({
      queued,
      githubTokenConfigured: token.length > 10,
      dispatchEnabled: isBrandVideoDispatchLive(),
    })

    if (decision.action === 'skip') {
      return NextResponse.json(
        {
          queued: decision.queued,
          dispatched: false,
          reason: decision.reason,
          workflow: 'brand-video-render.yml',
        },
        { headers: NO_STORE },
      )
    }

    const result = await dispatchBrandVideoWorkflow({ token })
    if (!result.ok) {
      return NextResponse.json(
        {
          queued: decision.queued,
          dispatched: false,
          reason: 'github_dispatch_failed',
          error: result.message,
          status: result.status,
          workflow: 'brand-video-render.yml',
        },
        { status: 502, headers: NO_STORE },
      )
    }

    return NextResponse.json(
      {
        queued: decision.queued,
        dispatched: true,
        reason: 'workflow_dispatched',
        githubStatus: result.status,
        workflow: 'brand-video-render.yml',
      },
      { headers: NO_STORE },
    )
  } catch (err) {
    return NextResponse.json(
      {
        error: sanitiseError(err, 'Brand-video dispatch cron failed', {
          route: '/api/cron/brand-video-dispatch',
        }),
      },
      { status: 500, headers: NO_STORE },
    )
  }
}
