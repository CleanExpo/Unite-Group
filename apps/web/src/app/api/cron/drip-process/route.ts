import { NextRequest, NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { createServiceClient } from '@/lib/supabase/service'
import {
  isDripLiveSendEnabled,
  processCampaignDrip,
  type DripProcessSummary,
} from '@/lib/campaigns/drip-processor'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — one live SendGrid send per due enrollment

/**
 * Machine-readable outcome of every non-error response (UNI-2931). Held stays
 * HTTP 200 (repo held-cron convention) so monitoring keys off `status`:
 * held = gate off; ok = live run, nothing failed; partial = live run where
 * at least one campaign threw or at least one enrolment failed.
 */
export type DripProcessCronStatus = 'held' | 'ok' | 'partial'

type ActiveCampaignRow = {
  id: string
  business_key: string
  name: string
}

/**
 * Drives the drip lifecycle (UNI-2356): every 30 minutes, live-process the due
 * enrollments of each ACTIVE drip campaign. Campaigns stay 'draft' until the
 * founder activates them (POST /api/campaigns/drip action=set_status), so this
 * cron can never send from an unapproved sequence.
 *
 * GET (not POST): Vercel Cron invokes the path with a GET request, matching
 * every other cron route in this app. Manual triggers use GET + CRON_SECRET.
 *
 * DORMANT unless DRIP_LIVE_SEND_ENABLED=true (UNI-2918): the cron reads and
 * writes nothing until the live-send gate is set. A held run still returns
 * HTTP 200 with `dormant: true` and `status: 'held'`.
 */
export async function GET(request: NextRequest) {
  const denied = assertCronAuth(request)
  if (denied) return denied

  if (!isDripLiveSendEnabled()) {
    return NextResponse.json({
      status: 'held' satisfies DripProcessCronStatus,
      dormant: true,
      message: 'DRIP_LIVE_SEND_ENABLED is not true — drip sends are held',
    })
  }

  const founderId = getFounderUserId()
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

  const processed = results.reduce((sum, r) => sum + r.processed, 0)
  const skipped = results.reduce((sum, r) => sum + r.skipped, 0)
  const failed = results.reduce((sum, r) => sum + r.failed, 0)
  const status: DripProcessCronStatus = failedCampaigns > 0 || failed > 0 ? 'partial' : 'ok'

  return NextResponse.json({
    status,
    dormant: false,
    campaigns: (campaigns ?? []).length,
    failedCampaigns,
    processed,
    skipped,
    failed,
    results,
  })
}
