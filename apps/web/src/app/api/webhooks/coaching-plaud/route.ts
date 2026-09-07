import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assertCronAuth } from '@/lib/cron-auth'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { checkConsent } from '@/lib/coaching/consent'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/coaching-plaud
 *
 * Receives a finished Plaud transcription via Zapier and stores it as a
 * coaching session.
 *
 * WHY IT LIVES UNDER /api/webhooks — corrected after independent review (P1,
 * round 3). It was at /api/coaching/ingest/plaud, which is NOT a public path.
 * proxy.ts:135 redirects every unauthenticated non-public request to
 * /auth/login BEFORE the handler runs, so a genuine Zapier delivery carrying
 * CRON_SECRET was 307'd away and never reached assertCronAuth() below. Fixing
 * the handler's auth mechanism (round 1) could not fix that, because the
 * rejection happens in middleware, one layer up. /api/webhooks is already in
 * PUBLIC_PATHS for exactly this case — "External provider callbacks verify
 * their own signatures/secrets" — which is what assertCronAuth does.
 *
 * WHY ZAPIER AND NOT PLAUD DIRECTLY: Plaud has no public API — its own support
 * article (updated 07/09/2026) says there is no sign-up or waiting list for one,
 * and the private OAuth API is closed beta returning only the 20 most recent
 * recordings. Its Zapier trigger, however, is a genuine instant webhook
 * (new_ai_generation_complete, isHook: true), so this is push rather than poll.
 * Plaud also cannot transcribe live (support, updated 19/08/2026: "No, Plaud
 * does not support real-time transcription"), so a session arrives minutes after
 * the pin is synced, never during the conversation.
 *
 * AUTHENTICATION — corrected after independent review (P1).
 * This first shipped gated on `getUser()`, a browser session. Zapier calls
 * server-to-server and carries no Supabase session cookie, so EVERY real
 * delivery would have returned 401 and ingestion would never have run once.
 * The route was documented as a webhook receiver and implemented as a
 * session-only endpoint. It now follows the house pattern for trusted
 * non-session callers (src/app/api/CLAUDE.md §5): CRON_SECRET for the caller,
 * FOUNDER_USER_ID for the owner.
 *
 * Because the service client bypasses RLS, `founder_id` scoping here is the
 * ONLY thing enforcing tenancy — it is written explicitly on every query.
 *
 * The transcript is stored but NOT extracted here. Extraction is a separate,
 * reviewed step; nothing reaches the client file without the founder approving it.
 */
export async function POST(request: Request) {
  const denied = assertCronAuth(request)
  if (denied) return denied

  const founderId = getFounderUserId()
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })
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

  const supabase = createServiceClient()

  const { data: engagement, error: lookupError } = await supabase
    .from('coaching_engagements')
    .select('id, client_id, consent_given, consent_date, consent_method')
    .eq('founder_id', founderId)
    .eq('id', engagement_id)
    .maybeSingle()

  if (lookupError) {
    return NextResponse.json({ error: 'lookup_failed', detail: lookupError.message }, { status: 500 })
  }

  // THE CONSENT GATE. A transcript of a private conversation is not stored
  // against a client who has not consented — see lib/coaching/consent.ts for why
  // this is a legal precondition and not a preference. checkConsent(null)
  // refuses with engagement_not_found, so a missing engagement cannot pass.
  const verdict = checkConsent(engagement)
  if (!verdict.allowed) {
    return NextResponse.json({ error: 'consent_required', reason: verdict.reason }, { status: 403 })
  }
  if (!engagement) {
    // Unreachable: checkConsent refuses null. Explicit so the narrowing below
    // does not rely on a non-null assertion (flagged in review).
    return NextResponse.json({ error: 'engagement_not_found' }, { status: 404 })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('coaching_sessions')
    .insert({
      founder_id: founderId,
      engagement_id,
      client_id: engagement.client_id,
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
