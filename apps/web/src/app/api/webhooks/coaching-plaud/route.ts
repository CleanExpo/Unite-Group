import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assertCronAuth } from '@/lib/cron-auth'
import { getFounderUserId } from '@/lib/auth/founder-user-id'
import { checkConsent } from '@/lib/coaching/consent'

export const dynamic = 'force-dynamic'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

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

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (!isRecord(parsed)) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }
    body = parsed
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const engagementId = body.engagement_id
  const transcript = body.transcript
  if (typeof body.source_ref !== 'string' || !body.source_ref.trim()) {
    return NextResponse.json({ error: 'source_ref_required' }, { status: 400 })
  }
  const sourceRef = body.source_ref.trim()

  if (body.session_date !== undefined && !isIsoDate(body.session_date)) {
    return NextResponse.json({ error: 'session_date_invalid' }, { status: 400 })
  }
  if (
    body.duration_minutes !== undefined &&
    (typeof body.duration_minutes !== 'number' ||
      !Number.isInteger(body.duration_minutes) ||
      body.duration_minutes < 0)
  ) {
    return NextResponse.json({ error: 'duration_minutes_invalid' }, { status: 400 })
  }

  if (!engagementId || typeof engagementId !== 'string') {
    return NextResponse.json({ error: 'engagement_id_required' }, { status: 400 })
  }
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'transcript_required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: engagement, error: lookupError } = await supabase
    .from('coaching_engagements')
    .select('id, client_id, consent_given, consent_date, consent_method, consent_disclosure')
    .eq('founder_id', founderId)
    .eq('id', engagementId)
    .maybeSingle()

  if (lookupError) {
    console.error('[coaching webhook] lookup failed:', lookupError.message)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
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

  const payload = {
    founder_id: founderId,
    engagement_id: engagementId,
    client_id: engagement.client_id,
    transcript,
    source: 'plaud' as const,
    source_ref: sourceRef,
    session_date: body.session_date === undefined
      ? new Date().toISOString().slice(0, 10)
      : body.session_date,
    duration_minutes: body.duration_minutes === undefined ? null : body.duration_minutes,
    status: 'captured' as const,
  }

  // The database trigger re-checks consent under a row lock at insert time;
  // this earlier check keeps the common refusal fast and readable.
  const { data: inserted, error: insertError } = await supabase
    .from('coaching_sessions')
    .upsert(payload, { onConflict: 'founder_id,source_ref', ignoreDuplicates: true })
    .select('id')
    .maybeSingle()

  if (insertError) {
    console.error('[coaching webhook] insert failed:', insertError.message)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  if (inserted) {
    return NextResponse.json({ session_id: inserted.id, status: 'captured' }, { status: 201 })
  }

  const { data: existing, error: existingError } = await supabase
    .from('coaching_sessions')
    .select('id')
    .eq('founder_id', founderId)
    .eq('source_ref', sourceRef)
    .maybeSingle()

  if (existingError || !existing) {
    console.error('[coaching webhook] duplicate lookup failed:', existingError?.message ?? 'row missing')
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ session_id: existing.id, status: 'captured', duplicate: true }, { status: 200 })
}
