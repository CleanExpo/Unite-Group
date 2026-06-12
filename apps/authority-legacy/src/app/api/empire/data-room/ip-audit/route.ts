// POST /api/empire/data-room/ip-audit
//
// Generates the ip_audit document for the M&A data room (UNI-1987).
// Reads integration_github_repos (live) and, when the table grows the
// metadata column, businesses.metadata.trademarks. Until then trademarks
// come back empty and the payload declares supabase_trademarks in
// sources_missing.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import {
  buildIpAudit,
  type GitHubRepoRow,
  type TrademarkRecord,
} from '@/lib/data-room/generators/ip-audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const supabase = getAdminClient();
  const asOf = new Date();

  const reposRes = await supabase
    .from('integration_github_repos')
    .select('id, name, owner, default_branch, is_private, last_pushed_at, open_prs_count, open_issues_count')
    .order('last_pushed_at', { ascending: false })
    .limit(1_000);

  if (reposRes.error) {
    return NextResponse.json(
      { error: 'github_repos_query_failed', detail: reposRes.error.message },
      { status: 500 },
    );
  }

  // Trademarks: no `businesses.metadata.trademarks` column exists yet.
  // Pass an empty array; the builder will declare supabase_trademarks as a
  // missing source. When the column lands we read it here and pass through.
  const trademarks: TrademarkRecord[] = [];

  const payload = buildIpAudit(
    (reposRes.data ?? []) as GitHubRepoRow[],
    trademarks,
    asOf.toISOString(),
  );

  const inserted = await supabase
    .from('data_room_documents')
    .insert({
      kind: 'ip_audit',
      business_id: null,
      period_start: null,
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
