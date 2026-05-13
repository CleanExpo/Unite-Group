// BUG-12 — Consumer worker for the public.scan_requests queue.
//
// /api/empire/rescan/[slug] enqueues a 'pending' row into public.scan_requests.
// This route — fired by a Vercel cron every 5 minutes (see vercel.json) —
// claims the oldest pending row, attempts the actual Pi-CEO scan, and writes
// the outcome back to the queue.
//
// Auth: Bearer ${CRON_SECRET}. Vercel cron supplies this header automatically
// against the same secret that protects every other cron route in this repo.
//
// Pi-CEO scan invocation: the Pi-CEO Railway service does NOT yet expose a
// scan-by-slug endpoint (only /api/swarm/health and /api/projects/health,
// which are read-only aggregates). Until that endpoint exists, the worker
// marks the request 'failed' with a clear error message so the operator can
// see an honest queue state instead of rows queued forever. Per the no-mock
// rule, the worker does NOT fabricate a snapshot.

import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ScanRequestRow {
  id: string;
  slug: string;
  requested_at: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

async function invokePiCeoScan(_slug: string): Promise<
  | { ok: true; snapshot_id: number }
  | { ok: false; error: string }
> {
  // The Pi-CEO Railway service currently exposes only read-only health
  // aggregate endpoints (/api/swarm/health, /api/projects/health). There is
  // no /api/scan/{slug} or equivalent that mutates pi_ceo_health_snapshots
  // on demand. Until that endpoint exists, return an honest failure so the
  // queue surfaces the gap instead of accumulating stuck rows.
  //
  // TODO(UNI-1948): land the Pi-CEO scan endpoint, then call:
  //   const apiUrl = process.env.PI_CEO_API_URL;
  //   const apiKey = process.env.PI_CEO_API_KEY;
  //   const res = await fetch(`${apiUrl}/api/scan/${slug}`, { ... })
  //   …
  //   then INSERT into pi_ceo_health_snapshots and return { ok: true, snapshot_id }.
  return { ok: false, error: 'Pi-CEO scan worker not yet implemented' };
}

export async function GET(req: Request) {
  // Vercel cron auth — matches every other cron route in this repo.
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Claim the oldest pending row. Flip to 'running' first so a second worker
  // tick (or a stuck previous run) can't double-process. We DO NOT use a
  // database-level lock here — the cron runs every 5 min and the row count
  // per tick is 1, so the simple 'pending → running' transition is enough.
  const { data: pending, error: pendingErr } = await supabase
    .from('scan_requests')
    .select('id, slug, requested_at, status')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingErr) {
    return NextResponse.json(
      { ok: false, error: `pending lookup failed: ${pendingErr.message}` },
      { status: 500 }
    );
  }

  if (!pending) {
    return NextResponse.json({ ok: true, processed: 0, message: 'queue empty' });
  }

  const row = pending as ScanRequestRow;

  // Transition pending → running.
  const { error: claimErr } = await supabase
    .from('scan_requests')
    .update({ status: 'running' })
    .eq('id', row.id)
    .eq('status', 'pending'); // optimistic guard

  if (claimErr) {
    return NextResponse.json(
      { ok: false, error: `claim failed: ${claimErr.message}` },
      { status: 500 }
    );
  }

  // Attempt the scan.
  const result = await invokePiCeoScan(row.slug);

  if (result.ok) {
    const { error: completeErr } = await supabase
      .from('scan_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        snapshot_id: result.snapshot_id,
        error: null,
      })
      .eq('id', row.id);

    if (completeErr) {
      return NextResponse.json(
        { ok: false, error: `complete write failed: ${completeErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      processed: 1,
      id: row.id,
      slug: row.slug,
      status: 'completed',
    });
  }

  // Failure path.
  const { error: failErr } = await supabase
    .from('scan_requests')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error: result.error.slice(0, 500),
    })
    .eq('id', row.id);

  if (failErr) {
    return NextResponse.json(
      { ok: false, error: `fail write failed: ${failErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    processed: 1,
    id: row.id,
    slug: row.slug,
    status: 'failed',
    reason: result.error,
  });
}
