import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export interface CoachingEngagementRow {
  id: string
  client_id: string
  business_name: string
  client_name: string
  status: string
  consent_given: boolean
  /** "Business Name - Client Name" — the label the sidebar flyout renders. */
  label: string
}

/**
 * GET /api/coaching/engagements
 *
 * Lists the founder's coaching engagements for the sidebar flyout, sorted
 * alphabetically by business name (the label leads with it).
 *
 * Clients live in crm_contacts; this returns only the coaching relationship.
 */
export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coaching_engagements')
    .select('id, client_id, business_name, client_name, status, consent_given')
    .eq('founder_id', user.id)
    .in('status', ['active', 'paused'])
    .order('business_name', { ascending: true })
    .order('client_name', { ascending: true })

  if (error) {
    // Honest failure — the caller renders "couldn't load", never an empty list
    // that reads as "no clients". See No-Invaders #1 (no fake-as-real).
    return NextResponse.json(
      { error: 'query_failed', detail: error.message },
      { status: 500 }
    )
  }

  const engagements: CoachingEngagementRow[] = (data ?? []).map((row) => ({
    ...row,
    label: `${row.business_name} - ${row.client_name}`,
  }))

  return NextResponse.json({ engagements })
}
