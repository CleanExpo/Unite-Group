import { NextRequest, NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { processCampaignDrip, type DripProcessSummary } from '@/lib/campaigns/drip-processor'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — one live SendGrid send per due enrollment

type ActiveCampaignRow = {
  id: string
  business_key: string
  name: string
}

/**
 * Drives the drip lifecycle (UNI-2356): every 15 minutes, live-process the due
 * enrollments of each ACTIVE drip campaign. Campaigns stay 'draft' until the
 * founder activates them (POST /api/campaigns/drip action=set_status), so this
 * cron can never send from an unapproved sequence.
 *
 * GET (not POST): Vercel Cron invokes the path with a GET request, matching
 * every other cron route in this app. Manual triggers use GET + CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const denied = assertCronAuth(request)
  if (denied) return denied

  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })
  }

  const supabase = createServiceClient()

  const { data: campaigns, error } = await supabase
    .from('drip_campaigns')
    .select('id, business_key, name')
    .eq('founder_id', founderId)
    .eq('status', 'active')

  if (error) {
    console.error('[cron/drip-process] load campaigns failed:', error.message)
    return NextResponse.json({ error: 'Failed to load active drip campaigns' }, { status: 500 })
  }

  const results: Array<{ campaignId: string; name: string } & DripProcessSummary> = []
  let failedCampaigns = 0

  for (const campaign of (campaigns ?? []) as ActiveCampaignRow[]) {
    try {
      const summary = await processCampaignDrip({
        supabase,
        founderId,
        campaignId: campaign.id,
        businessKey: campaign.business_key,
        dryRun: false,
      })
      results.push({ campaignId: campaign.id, name: campaign.name, ...summary })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[cron/drip-process] campaign ${campaign.id} failed:`, message)
      failedCampaigns++
    }
  }

  return NextResponse.json({
    campaigns: (campaigns ?? []).length,
    failedCampaigns,
    processed: results.reduce((sum, r) => sum + r.processed, 0),
    skipped: results.reduce((sum, r) => sum + r.skipped, 0),
    failed: results.reduce((sum, r) => sum + r.failed, 0),
    results,
  })
}
