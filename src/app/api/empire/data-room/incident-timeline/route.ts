// POST /api/empire/data-room/incident-timeline
//
// Generates the incident_timeline document for the M&A data room (UNI-1988).
// Reads failed agent_actions + completed linear_issues + merged github_prs
// over the last 24 months and classifies each event into a category.

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/security/require-admin';
import {
  buildIncidentTimeline,
  INCIDENT_WINDOW_MONTHS,
  type AgentActionRow,
  type GitHubPrRow,
  type LinearIssueRow,
} from '@/lib/data-room/generators/incident-timeline';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (gate instanceof NextResponse) return gate;

  const supabase = getAdminClient();
  const asOf = new Date();
  const windowStart = new Date(
    asOf.getTime() - INCIDENT_WINDOW_MONTHS * 30 * 86_400_000,
  );
  const windowStartIso = windowStart.toISOString();

  const [agentRes, linearRes, prRes] = await Promise.all([
    supabase
      .from('agent_actions')
      .select('id, source, action_type, status, business_id, created_at')
      .eq('status', 'failed')
      .gte('created_at', windowStartIso)
      .order('created_at', { ascending: false })
      .limit(5_000),
    supabase
      .from('integration_linear_issues')
      .select('id, title, state_type, priority, completed_at')
      .eq('state_type', 'completed')
      .gte('completed_at', windowStartIso)
      .order('completed_at', { ascending: false })
      .limit(5_000),
    supabase
      .from('integration_github_prs')
      .select('id, repo, number, title, state, merged_at')
      .in('state', ['merged', 'closed'])
      .gte('merged_at', windowStartIso)
      .order('merged_at', { ascending: false })
      .limit(5_000),
  ]);

  if (agentRes.error) {
    return NextResponse.json(
      { error: 'agent_actions_query_failed', detail: agentRes.error.message },
      { status: 500 },
    );
  }
  if (linearRes.error) {
    return NextResponse.json(
      { error: 'linear_issues_query_failed', detail: linearRes.error.message },
      { status: 500 },
    );
  }
  if (prRes.error) {
    return NextResponse.json(
      { error: 'github_prs_query_failed', detail: prRes.error.message },
      { status: 500 },
    );
  }

  const payload = buildIncidentTimeline(
    (agentRes.data ?? []) as AgentActionRow[],
    (linearRes.data ?? []) as LinearIssueRow[],
    (prRes.data ?? []) as GitHubPrRow[],
    asOf.toISOString(),
  );

  const inserted = await supabase
    .from('data_room_documents')
    .insert({
      kind: 'incident_timeline',
      business_id: null,
      period_start: windowStartIso.slice(0, 10),
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
