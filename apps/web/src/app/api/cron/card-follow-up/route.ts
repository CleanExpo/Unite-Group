import { NextRequest, NextResponse } from 'next/server'

import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { isFollowUpSendEnabled, processCardFollowUps } from '@/lib/cards/follow-up'
import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Daily card follow-ups (UNI-3057): details reminder and review request, once each per paid order.
 * DORMANT unless CARD_FOLLOWUP_EMAILS_ENABLED=true and MAILTRAP_API_KEY is set: a held run reads and
 * writes nothing and answers 200 { status: 'held' }.
 */
export async function GET(request: NextRequest) {
  const denied = assertCronAuth(request)
  if (denied) return denied

  if (!isFollowUpSendEnabled()) {
    return NextResponse.json({
      status: 'held',
      dormant: true,
      message: 'CARD_FOLLOWUP_EMAILS_ENABLED is not true or MAILTRAP_API_KEY is not set: follow-ups are held',
    })
  }

  const founderId = getFounderUserId()
  if (!founderId) return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })

  try {
    const summary = await processCardFollowUps(createServiceClient(), founderId)
    return NextResponse.json({ status: summary.failed > 0 ? 'partial' : 'ok', ...summary })
  } catch (err) {
    console.error('[cron/card-follow-up]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Card follow-up run failed' }, { status: 500 })
  }
}
