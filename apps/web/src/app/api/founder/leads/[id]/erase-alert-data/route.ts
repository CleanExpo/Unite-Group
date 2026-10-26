// Founder-only erasure of what the app keeps about an enquiry outside crm_leads:
// its alert delivery log rows (by lead id and by keyed duplicate hash) and its
// crm_timeline agent_actions rows, for every enquiry made with the same email.
// Matching every enquiry from the address happens in ONE founder-scoped SQL call
// (erase_lead_alert_data_for_email: exact lower(email) equality, no API row cap,
// one transaction), never in the API layer, where PostgREST's ilike treats '*' as a
// wildcard and a select stops at the row cap.
// It does NOT delete crm_leads and it cannot delete the alert email in the mailbox;
// both stay manual steps named in the privacy policy.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { dedupKey } from '@/lib/notifications/dedup-key'
import { allPackageLabels } from '@/lib/notifications/lead-alert'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await createClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await params
  const founder = getFounderUserId()
  if (!founder || user.id !== founder || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const client = createServiceClient()
    const { data: lead, error: leadError } = await client.from('crm_leads')
      .select('id, email').eq('founder_id', founder).eq('id', id).maybeSingle()
    if (leadError) throw leadError
    if (!lead?.email) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // The keyed hash lower-cases the email, so one key per package covers every enquiry
    // from this address, including log rows whose lead was already deleted.
    const keys = allPackageLabels().map((label) => dedupKey(founder, String(lead.email), label))
      .filter((value): value is string => value !== null)
    const { data: result, error } = await client.rpc('erase_lead_alert_data_for_email', {
      p_founder: founder, p_lead_id: id, p_dedup_keys: keys,
    })
    if (error) throw error
    const row = Array.isArray(result) ? result[0] : null
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const erased = Number(row.leads_erased)
    if (!Number.isInteger(erased) || erased < 1) throw new Error('UnexpectedEraseResult')
    return NextResponse.redirect(new URL(`/founder/leads/${id}?erased=${erased}`, request.url), 303)
  } catch (error) {
    const detail = error as { name?: unknown } | null
    console.error('[erase-alert-data] failed:', typeof detail?.name === 'string' ? detail.name : 'Error')
    return NextResponse.json({ error: 'Erasure failed; nothing was reported as erased' }, { status: 500 })
  }
}
