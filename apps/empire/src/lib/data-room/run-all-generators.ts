// Composes all 5 DataRoom generators into one transaction-ish operation.
// Reads all source tables in parallel, runs every builder, writes one
// data_room_documents row per kind. Returns a per-kind result so callers
// (cron + admin "Regenerate all" button) can render which kinds succeeded.
//
// Pure orchestration — no HTTP. The cron route and the admin route both
// call this. The five generator routes still exist for one-off use.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildCohortMetrics,
  type HealthSnapshotRow,
} from './generators/cohort-metrics';
import {
  buildPlSummary,
  type StripeInvoiceMonthRow,
  type StripeSubscriptionRow,
} from './generators/pl-summary';
import {
  buildVendorContracts,
  type StripeSubscriptionWithProductRow,
} from './generators/vendor-contracts';
import {
  buildIpAudit,
  type GitHubRepoRow,
  type TrademarkRecord,
} from './generators/ip-audit';
import {
  buildIncidentTimeline,
  INCIDENT_WINDOW_MONTHS,
  type AgentActionRow,
  type GitHubPrRow,
  type LinearIssueRow,
} from './generators/incident-timeline';

export type GeneratorKind =
  | 'cohort_metrics'
  | 'pl_summary'
  | 'vendor_contracts'
  | 'ip_audit'
  | 'incident_timeline';

export const ALL_GENERATOR_KINDS: readonly GeneratorKind[] = [
  'cohort_metrics',
  'pl_summary',
  'vendor_contracts',
  'ip_audit',
  'incident_timeline',
] as const;

export interface RunAllResult {
  ok: boolean;
  kind: GeneratorKind;
  document_id?: string;
  error?: string;
}

interface RunAllInput {
  supabase: SupabaseClient;
  asOf?: Date;
}

const COHORT_MAX_WINDOW_DAYS = 365;

export async function runAllGenerators({
  supabase,
  asOf = new Date(),
}: RunAllInput): Promise<RunAllResult[]> {
  const asOfIso = asOf.toISOString();
  const cohortSinceIso = new Date(
    asOf.getTime() - COHORT_MAX_WINDOW_DAYS * 86_400_000,
  ).toISOString();
  const incidentSinceIso = new Date(
    asOf.getTime() - INCIDENT_WINDOW_MONTHS * 30 * 86_400_000,
  ).toISOString();

  const [
    healthSnapshotsRes,
    subscriptionsRes,
    invoicesRes,
    githubReposRes,
    agentActionsRes,
    linearIssuesRes,
    githubPrsRes,
  ] = await Promise.all([
    supabase
      .from('pi_ceo_health_snapshots')
      .select('project_id, overall_health, security_score, security_findings, dependencies, snapshot_at')
      .gte('snapshot_at', cohortSinceIso)
      .order('snapshot_at', { ascending: true })
      .limit(10_000),
    supabase
      .from('integration_stripe_subscriptions')
      .select('id, customer_id, status, monthly_amount_aud, product_name, current_period_end')
      .limit(5_000),
    supabase
      .from('integration_stripe_invoices_mtd')
      .select('yyyymm, total_aud, paid_aud, outstanding_aud')
      .order('yyyymm', { ascending: true })
      .limit(60),
    supabase
      .from('integration_github_repos')
      .select('id, name, owner, default_branch, is_private, last_pushed_at, open_prs_count, open_issues_count')
      .order('last_pushed_at', { ascending: false })
      .limit(1_000),
    supabase
      .from('agent_actions')
      .select('id, source, action_type, status, business_id, created_at')
      .eq('status', 'failed')
      .gte('created_at', incidentSinceIso)
      .order('created_at', { ascending: false })
      .limit(5_000),
    supabase
      .from('integration_linear_issues')
      .select('id, title, state_type, priority, completed_at')
      .eq('state_type', 'completed')
      .gte('completed_at', incidentSinceIso)
      .order('completed_at', { ascending: false })
      .limit(5_000),
    supabase
      .from('integration_github_prs')
      .select('id, repo, number, title, state, merged_at')
      .in('state', ['merged', 'closed'])
      .gte('merged_at', incidentSinceIso)
      .order('merged_at', { ascending: false })
      .limit(5_000),
  ]);

  const trademarks: TrademarkRecord[] = [];

  const cohortPayload = buildCohortMetrics(
    (healthSnapshotsRes.data ?? []) as HealthSnapshotRow[],
    asOfIso,
  );
  const plPayload = buildPlSummary(
    (subscriptionsRes.data ?? []) as StripeSubscriptionRow[],
    (invoicesRes.data ?? []) as StripeInvoiceMonthRow[],
    asOfIso,
  );
  const vendorPayload = buildVendorContracts(
    (subscriptionsRes.data ?? []) as StripeSubscriptionWithProductRow[],
    asOfIso,
  );
  const ipPayload = buildIpAudit(
    (githubReposRes.data ?? []) as GitHubRepoRow[],
    trademarks,
    asOfIso,
  );
  const incidentPayload = buildIncidentTimeline(
    (agentActionsRes.data ?? []) as AgentActionRow[],
    (linearIssuesRes.data ?? []) as LinearIssueRow[],
    (githubPrsRes.data ?? []) as GitHubPrRow[],
    asOfIso,
  );

  const periodEnd = asOfIso.slice(0, 10);
  const cohortPeriodStart = cohortSinceIso.slice(0, 10);
  const incidentPeriodStart = incidentSinceIso.slice(0, 10);
  const firstInvoiceMonth = plPayload.monthly_revenue.at(0)?.yyyymm;
  const plPeriodStart = firstInvoiceMonth
    ? `${firstInvoiceMonth.slice(0, 4)}-${firstInvoiceMonth.slice(4, 6)}-01`
    : periodEnd;

  const inserts: Array<{
    kind: GeneratorKind;
    period_start: string | null;
    period_end: string;
    payload: unknown;
  }> = [
    { kind: 'cohort_metrics', period_start: cohortPeriodStart, period_end: periodEnd, payload: cohortPayload },
    { kind: 'pl_summary', period_start: plPeriodStart, period_end: periodEnd, payload: plPayload },
    { kind: 'vendor_contracts', period_start: null, period_end: periodEnd, payload: vendorPayload },
    { kind: 'ip_audit', period_start: null, period_end: periodEnd, payload: ipPayload },
    { kind: 'incident_timeline', period_start: incidentPeriodStart, period_end: periodEnd, payload: incidentPayload },
  ];

  const results: RunAllResult[] = await Promise.all(
    inserts.map(async ({ kind, period_start, period_end, payload }) => {
      // Mark any earlier pending OR approved doc of this kind as superseded.
      // The fresh insert below is the new source of truth; older approvals
      // are stale by definition. 'rejected' is preserved as a historical
      // record — the founder explicitly rejected those for a reason.
      // Per-row failures here aren't fatal: we still attempt the insert.
      await supabase
        .from('data_room_documents')
        .update({ audit_status: 'superseded' })
        .eq('kind', kind)
        .in('audit_status', ['pending', 'approved']);

      const res = await supabase
        .from('data_room_documents')
        .insert({
          kind,
          business_id: null,
          period_start,
          period_end,
          payload,
          audit_status: 'pending',
        })
        .select('id')
        .single();

      if (res.error || !res.data?.id) {
        return { ok: false, kind, error: res.error?.message ?? 'insert_failed' };
      }
      return { ok: true, kind, document_id: res.data.id };
    }),
  );

  return results;
}
