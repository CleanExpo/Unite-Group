// src/app/api/cron/synthex-monitor/route.ts
// Vercel CRON — runs every 15 minutes
// Checks for SYN Linear issues in 'In Review' (Synthex created a PR) and notifies via Slack

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { checkSynthexProgress } from '@/lib/integrations/linear-monitor'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const denied = assertCronAuth(request)
  if (denied) return denied

  try {
    const result = await checkSynthexProgress()
    return NextResponse.json({ status: 'ok', inReviewCount: result.inReviewCount })
  } catch (error) {
    console.error('[Synthex Monitor] Failed:', error)
    return NextResponse.json(
      { status: 'error', error: sanitiseError(error, 'Unknown') },
      { status: 500 }
    )
  }
}
