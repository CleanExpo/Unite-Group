// src/app/(founder)/founder/campaigns/page.tsx
export const dynamic = 'force-dynamic'

import { CampaignsView } from '@/components/founder/campaigns/CampaignsView'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { Campaign, CampaignObjective, CampaignStatus } from '@/lib/campaigns/types'

// ─── DB Row ──────────────────────────────────────────────────────────────────

interface CampaignRow {
  id: string
  theme: string
  objective: string
  platforms: string[]
  post_count: number
  status: string
  created_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapRow(row: CampaignRow): Pick<Campaign, 'id' | 'theme' | 'objective' | 'platforms' | 'postCount' | 'status' | 'createdAt'> {
  return {
    id: row.id,
    theme: row.theme,
    objective: row.objective as CampaignObjective,
    platforms: row.platforms as Campaign['platforms'],
    postCount: row.post_count,
    status: row.status as CampaignStatus,
    createdAt: row.created_at,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CampaignsPage() {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createServiceClient()

  const { data: rows, error } = await supabase
    .from('campaigns')
    .select('id, theme, objective, platforms, post_count, status, created_at')
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })

  // No-Invaders #1: a query FAILURE must never render as an empty CRM.
  // Throw so the route's error.tsx boundary catches it and shows an honest
  // error state — only render EmptyState when the request genuinely succeeded
  // with zero rows.
  if (error) {
    throw new Error(`Failed to load campaigns: ${error.message}`)
  }

  const campaigns = (rows ?? []).map(r => mapRow(r as CampaignRow))

  return <CampaignsView campaigns={campaigns} />
}
