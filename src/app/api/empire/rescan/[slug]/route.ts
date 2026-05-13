export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

// POST /api/empire/rescan/[slug]
//
// Queues a Pi-CEO health scan for the given business slug by inserting a row
// into public.scan_requests. A separate worker (out of scope for this PR)
// consumes pending rows and writes the resulting snapshot back.
//
// Replaces the cosmetic "Trigger Pi-CEO Scan" button that previously called
// the read-only /api/pi-ceo/health endpoint and silently lied to the operator.
//
// Responses:
//   200  { request_id, status: 'queued' }       — accepted, queue insert succeeded
//   400  { error: 'Invalid slug' }              — slug missing or empty
//   404  { error: 'Unknown business' }          — slug not present in businesses table
//   500  { error: <message> }                   — DB insert failed
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Validate the slug exists in the businesses table — the FK constraint we
  // would have liked can't exist because businesses.slug is not globally unique.
  const { data: biz, error: bizErr } = await supabase
    .from('businesses')
    .select('slug')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();

  if (bizErr) {
    console.error('[empire/rescan] business lookup error:', bizErr.message);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
  if (!biz) {
    return NextResponse.json({ error: 'Unknown business' }, { status: 404 });
  }

  // Best-effort: capture the requester if a session is present in the request.
  // We don't hard-fail on missing auth — the action is operator-only behind
  // the empire layout, and the worker doesn't gate on requested_by.
  const requestedBy =
    req.headers.get('x-user-email') ??
    req.headers.get('x-session-email') ??
    null;

  const { data: inserted, error: insertErr } = await supabase
    .from('scan_requests')
    .insert({
      slug,
      requested_by: requestedBy,
      status: 'pending',
    })
    .select('id, status')
    .single();

  if (insertErr || !inserted) {
    console.error('[empire/rescan] insert error:', insertErr?.message);
    return NextResponse.json(
      { error: insertErr?.message ?? 'Insert failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    request_id: inserted.id,
    status: 'queued',
  });
}

// GET /api/empire/rescan/[slug]
//
// Polling endpoint — returns the most recent scan request for this slug so
// the UI can show "Scanning…" / "Completed" / "Failed" without lying.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!slug) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });

  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from('scan_requests')
    .select('id, status, requested_at, completed_at, error')
    .eq('slug', slug)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[empire/rescan] poll error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ latest: data ?? null });
}
