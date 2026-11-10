// Campaign publish insert-race guard (UNI-2326).
//
// Two publish requests for the same campaign can both read "no draft yet" and
// both insert a social_posts row. With the switch on, the database decides:
// social_posts has UNIQUE (campaign_id, campaign_platform), and the insert is
// ON CONFLICT DO NOTHING. The first insert wins; every later one is a no-op
// that resolves to the winner's row.
//
// Migration: supabase/migrations/20261107120000_campaign_publish_dedupe.sql

import type { createServiceClient } from '@/lib/supabase/service'

type ServiceClient = ReturnType<typeof createServiceClient>

/** The one owner of the conflict target. A test pins it to the migration. */
export const CAMPAIGN_DRAFT_CONFLICT_COLUMNS = ['campaign_id', 'campaign_platform'] as const

/**
 * Master switch. The guarded path runs only when CAMPAIGN_PUBLISH_DEDUPE_ENABLED
 * is exactly 'true'. It must stay off until the migration above is applied,
 * because the guarded insert writes the two new columns.
 */
export function isCampaignPublishDedupeEnabled(): boolean {
  return process.env.CAMPAIGN_PUBLISH_DEDUPE_ENABLED === 'true'
}

export interface CampaignDraftRow {
  founder_id: string
  business_key: string
  title: null
  content: string
  media_urls: string[]
  platforms: string[]
  status: 'draft'
  scheduled_at: null
  campaign_id: string
  campaign_platform: string
}

export type CampaignDraftResult =
  | { ok: true; postId: string; created: boolean }
  | { ok: false; error: string }

/**
 * Insert the draft for (campaign_id, campaign_platform), or resolve to the row
 * that already holds that key. Never inserts a second row for the same key.
 * Every failure is returned, never reported as an empty success.
 */
export async function insertCampaignDraftOnce(
  supabase: ServiceClient,
  row: CampaignDraftRow,
): Promise<CampaignDraftResult> {
  const { data, error } = await supabase
    .from('social_posts')
    .upsert(row, {
      onConflict: CAMPAIGN_DRAFT_CONFLICT_COLUMNS.join(','),
      ignoreDuplicates: true,
    })
    .select('id')

  if (error) return { ok: false, error: error.message }

  const inserted = Array.isArray(data) ? (data[0] as { id?: string } | undefined) : undefined
  if (inserted?.id) return { ok: true, postId: inserted.id, created: true }

  // Ignored: another request already holds this key. Resolve to its row.
  const { data: existing, error: readError } = await supabase
    .from('social_posts')
    .select('id')
    .eq('campaign_id', row.campaign_id)
    .eq('campaign_platform', row.campaign_platform)
    .eq('founder_id', row.founder_id)
    .maybeSingle()

  if (readError) return { ok: false, error: readError.message }
  const existingId = (existing as { id?: string } | null)?.id
  if (!existingId) {
    return { ok: false, error: 'Insert was ignored but no draft holds this campaign and platform' }
  }
  return { ok: true, postId: existingId, created: false }
}
