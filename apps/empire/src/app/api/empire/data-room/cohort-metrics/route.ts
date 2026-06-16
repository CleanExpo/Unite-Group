// POST /api/empire/data-room/cohort-metrics
//
// Generates the cohort_metrics document for the M&A data room (UNI-1984).
// Reads pi_ceo_health_snapshots, calls the pure builder, persists the result
// into public.data_room_documents with kind='cohort_metrics' + audit_status
// 'pending', and returns the payload to the caller.
//
// Auth: founder-only (mirrors data_room_documents RLS — service_role goes
// through requireAdmin in this codebase).
//
// Idempotency: the route does NOT dedupe by (kind, period_end). UNI-1989's
// admin UI will mark older docs `superseded` when a new one lands; for now,
// every POST creates a fresh row. Callers needing a single canonical doc
// should pick `ORDER BY generated_at DESC LIMIT 1`.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import {
  buildCohortMetrics,
  COHORT_WINDOWS,
  type HealthSnapshotRow,
} from '@/lib/data-room/generators/cohort-metrics';

export const dynamic = 'force-dynamic';

const LARGEST_WINDOW_DAYS = Math.max(...COHORT_WINDOWS);

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const supabase = getAdminClient();
  const asOf = new Date();
  const sinceIso = new Date(
    asOf.getTime() - LARGEST_WINDOW_DAYS * 86_400_000,
  ).toISOString();

  const snapshotsRes = await supabase
    .from('pi_ceo_health_snapshots')
    .select('project_id, overall_health, security_score, security_findings, dependencies, snapshot_at')
    .gte('snapshot_at', sinceIso)
    .order('snapshot_at', { ascending: true })
    .limit(10_000);

  if (snapshotsRes.error) {
    return NextResponse.json(
      { error: 'snapshots_query_failed', detail: snapshotsRes.error.message },
      { status: 500 },
    );
  }

  const payload = buildCohortMetrics(
    (snapshotsRes.data ?? []) as HealthSnapshotRow[],
    asOf.toISOString(),
  );

  const inserted = await supabase
    .from('data_room_documents')
    .insert({
      kind: 'cohort_metrics',
      business_id: null,
      period_start: sinceIso.slice(0, 10),
      period_end: asOf.toISOString().slice(0, 10),
      payload,
      audit_status: 'pending',
    })
    .select('id, generated_at, audit_status')
    .single();

  if (inserted.error || !inserted.data) {
    return NextResponse.json(
      { error: 'data_room_insert_failed', detail: inserted.error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      document_id: inserted.data.id,
      generated_at: inserted.data.generated_at,
      audit_status: inserted.data.audit_status,
      payload,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
