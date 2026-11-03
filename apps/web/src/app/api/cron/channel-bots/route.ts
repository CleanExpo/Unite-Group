// GET /api/cron/channel-bots — UNI-3223 channel bots, orchestrated for the CRM.
import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { getAccessTokenForEmail } from '@/lib/integrations/google-oauth'
import { runChannelBots } from '@/lib/channel-bots/orchestrator'
import { BRAND_ACCOUNT_EMAIL } from '@/lib/channel-bots/types'
import { persistChannelBotRun } from '@/lib/channel-bots/persist'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const denied = assertCronAuth(request)
  if (denied) return denied
  // Dormant by default: nothing runs until the founder arms it.
  if (process.env.CHANNEL_BOTS_ARMED?.trim() !== 'true') {
    return NextResponse.json({ armed: false, skipped: true })
  }
  const founderId = getFounderUserId()
  if (!founderId) return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })

  const out = await runChannelBots({
    founderId,
    accountEmail: BRAND_ACCOUNT_EMAIL,
    getGoogleToken: () => getAccessTokenForEmail(founderId, BRAND_ACCOUNT_EMAIL),
  })
  console.log('[channel-bots]', JSON.stringify(out.results.map((r) => ({ bot: r.bot, status: r.status }))))
  let insightId: string
  try {
    insightId = await persistChannelBotRun(createServiceClient(), founderId, out)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'persist failed', ...out }, { status: 500 })
  }
  // Any built bot failing is a failed run, so cron monitoring sees it.
  return NextResponse.json({ insightId, ...out }, { status: out.anyFailed ? 502 : 200 })
}
