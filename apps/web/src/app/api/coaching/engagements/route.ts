import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'
import { sortEngagements } from '@/lib/coaching/sort'

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
    //
    // The detail is LOGGED, not returned. `error.message` from PostgREST can
    // carry column names, constraint names and fragments of the statement;
    // a 500 body is not redacted the way a Server Component error is, so
    // echoing it hands internals to the caller. The log keeps it diagnosable.
    console.error('[coaching/engagements] query failed:', error.message)
    return NextResponse.json(
      { error: 'query_failed' },
      { status: 500 }
    )
  }

  // Re-sorted in application code so the rendered order does not depend on the
  // database column's collation. See lib/coaching/sort.ts.
  const engagements: CoachingEngagementRow[] = sortEngagements(data ?? []).map((row) => ({
    ...row,
    label: `${row.business_name} - ${row.client_name}`,
  }))

  return NextResponse.json({ engagements })
}
