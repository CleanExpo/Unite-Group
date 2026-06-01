// GET /api/empire/data-room/export — bundle the latest APPROVED document of
// every kind into a single ZIP. Falls back to the latest non-superseded doc
// of a kind if no approved doc exists, and lists missing kinds in the
// manifest so the acquirer's diligence team can see the gap explicitly.
//
// Founder-only. UNI-1989.

import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';

export const dynamic = 'force-dynamic';

const EXPECTED_KINDS = [
  'cohort_metrics',
  'pl_summary',
  'vendor_contracts',
  'ip_audit',
  'incident_timeline',
] as const;

type ExpectedKind = typeof EXPECTED_KINDS[number];

interface DataRoomRow {
  id: string;
  kind: string;
  period_start: string | null;
  period_end: string | null;
  generated_at: string;
  payload: unknown;
  audit_status: string;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const supabase = getAdminClient();
  const docsRes = await supabase
    .from('data_room_documents')
    .select('id, kind, period_start, period_end, generated_at, payload, audit_status')
    .in('kind', EXPECTED_KINDS as readonly string[])
    .neq('audit_status', 'superseded')
    .order('generated_at', { ascending: false })
    .limit(1_000);

  if (docsRes.error) {
    return NextResponse.json(
      { error: 'data_room_query_failed', detail: docsRes.error.message },
      { status: 500 },
    );
  }

  // Per kind: prefer the latest 'approved' doc; fall back to the latest
  // non-superseded doc; flag the kind as missing if none. The Supabase
  // query returns rows newest-first so the first match per kind wins.
  // Contract: a kind appears in either `chosen` or `fallback`, never both.
  const docs = (docsRes.data ?? []) as DataRoomRow[];
  const chosen: Partial<Record<ExpectedKind, DataRoomRow>> = {};
  const fallback: Partial<Record<ExpectedKind, DataRoomRow>> = {};
  for (const doc of docs) {
    const kind = doc.kind as ExpectedKind;
    if (!EXPECTED_KINDS.includes(kind)) continue;
    if (doc.audit_status === 'approved') {
      if (!chosen[kind]) chosen[kind] = doc;
      delete fallback[kind];
    } else if (!chosen[kind] && !fallback[kind]) {
      fallback[kind] = doc;
    }
  }

  const zip = new JSZip();
  const manifest = {
    generated_at: new Date().toISOString(),
    actor_email: gate.actorEmail,
    kinds_approved: [] as ExpectedKind[],
    kinds_fallback: [] as ExpectedKind[],
    kinds_missing: [] as ExpectedKind[],
    documents: [] as Array<{
      kind: ExpectedKind;
      id: string;
      audit_status: string;
      generated_at: string;
      file: string;
    }>,
  };

  for (const kind of EXPECTED_KINDS) {
    const doc = chosen[kind] ?? fallback[kind];
    if (!doc) {
      manifest.kinds_missing.push(kind);
      continue;
    }
    if (doc.audit_status === 'approved') manifest.kinds_approved.push(kind);
    else manifest.kinds_fallback.push(kind);

    const file = `${kind}/${doc.id}.json`;
    zip.file(
      file,
      JSON.stringify(
        {
          id: doc.id,
          kind: doc.kind,
          period_start: doc.period_start,
          period_end: doc.period_end,
          generated_at: doc.generated_at,
          audit_status: doc.audit_status,
          payload: doc.payload,
        },
        null,
        2,
      ),
    );
    manifest.documents.push({
      kind,
      id: doc.id,
      audit_status: doc.audit_status,
      generated_at: doc.generated_at,
      file,
    });
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: 'uint8array' });
  const filename = `data-room-${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(blob as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
