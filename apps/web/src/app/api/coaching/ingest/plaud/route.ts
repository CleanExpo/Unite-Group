import { NextResponse } from 'next/server'
import { createClient, getUser } from '@/lib/supabase/server'
import { checkConsent } from '@/lib/coaching/consent'

export const dynamic = 'force-dynamic'

/**
 * POST /api/coaching/ingest/plaud
 *
 * Receives a finished Plaud transcription via Zapier and stores it as a
 * coaching session.
 *
 * WHY ZAPIER AND NOT PLAUD DIRECTLY: Plaud has no public API — its own
 * support article (updated 07/09/2026) says there is no sign-up or waiting
 * list for one, and the private OAuth API is closed beta returning only the 20
 * most recent recordings. Its Zapier trigger, however, is a genuine instant
 * webhook (new_ai_generation_complete, isHook: true), so this is push rather
 * than poll. Plaud also cannot transcribe live (support, updated 19/08/2026:
 * "No, Plaud does not support real-time transcription"), so a session arrives
 * minutes after the pin is synced, never during the conversation.
 *
 * The transcript is stored but NOT extracted here. Extraction is a separate,
 * reviewed step — nothing reaches the client file without the founder
 * approving it.
 */
export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }

  let body: {
    engagement_id?: string
    transcript?: string
    session_date?: string
    duration_minutes?: number
    source_ref?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { engagement_id, transcript } = body
  if (!engagement_id || typeof engagement_id !== 'string') {
    return NextResponse.json({ error: 'engagement_id_required' }, { status: 400 })
  }
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'transcript_required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: engagement, error: lookupError } = await supabase
    .from('coaching_engagements')
    .select('id, client_id, consent_given, consent_date, consent_method')
    .eq('founder_id', user.id)
    .eq('id', engagement_id)
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ error: 'lookup_failed', detail: lookupError.message }, { status: 500 })
  }

  // THE CONSENT GATE. A transcript of a private conversation is not stored
  // against a client who has not consented — see lib/coaching/consent.ts for
  // why this is a legal precondition and not a preference.
  const verdict = checkConsent(engagement)
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: 'consent_required', reason: verdict.reason },
      { status: 403 }
    )
  }

  const { data: inserted, error: insertError } = await supabase
    .from('coaching_sessions')
    .insert({
      founder_id: user.id,
      engagement_id,
      client_id: engagement!.client_id,
      transcript,
      source: 'plaud',
      source_ref: body.source_ref ?? null,
      session_date: body.session_date ?? new Date().toISOString().slice(0, 10),
      duration_minutes: body.duration_minutes ?? null,
      status: 'captured',
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'insert_failed', detail: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ session_id: inserted.id, status: 'captured' }, { status: 201 })
}
