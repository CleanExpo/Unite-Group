// GET /api/cron/channel-bots — UNI-3223 channel bots, orchestrated for the CRM.
import { NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { getAccessTokenForEmail } from '@/lib/integrations/google-oauth'
import { runChannelBots } from '@/lib/channel-bots/orchestrator'
import { BRAND_ACCOUNT_EMAIL } from '@/lib/channel-bots/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const denied = assertCronAuth(request)
  if (denied) return denied
  const founderId = getFounderUserId()
  if (!founderId) return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })

  const out = await runChannelBots({
    founderId,
    accountEmail: BRAND_ACCOUNT_EMAIL,
    getGoogleToken: () => getAccessTokenForEmail(founderId, BRAND_ACCOUNT_EMAIL),
  })
  console.log('[channel-bots]', JSON.stringify(out.results.map((r) => ({ bot: r.bot, status: r.status }))))
  return NextResponse.json(out)
}
