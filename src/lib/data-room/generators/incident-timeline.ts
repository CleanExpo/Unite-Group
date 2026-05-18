// Incident history timeline generator (UNI-1988, DataRoom 6/7).
//
// Inputs per ticket spec:
//   1. public.agent_actions             — status='failed' rows
//   2. public.integration_linear_issues — completed issues; heuristic match
//                                         on title for security/outage/incident
//   3. public.integration_github_prs    — merged PRs whose title implies an
//                                         incident response (revert, hotfix,
//                                         "incident", "outage", "rollback")
//
// Each input row is normalised into the same IncidentEvent shape, all events
// are merged into a single reverse-chronological timeline, and each event
// gets a category classification based on text heuristics.
//
// Pure function: no I/O. The route does the Supabase reads + insert into
// data_room_documents.

export interface AgentActionRow {
  id: string;
  source: string | null;
  action_type: string | null;
  status: string | null;
  business_id: string | null;
  created_at: string | null;
}

export interface LinearIssueRow {
  id: string;
  title: string;
  state_type: string | null;
  priority: number | null;
  completed_at: string | null;
}

export interface GitHubPrRow {
  id: string;
  repo: string;
  number: number;
  title: string;
  state: string | null;
  merged_at: string | null;
}

export type IncidentCategory =
  | 'security'
  | 'outage'
  | 'customer_impact'
  | 'internal';

export type IncidentSource = 'agent_actions' | 'linear_issues' | 'github_prs';

export interface IncidentEvent {
  occurred_at: string;
  source: IncidentSource;
  source_id: string;
  title: string;
  category: IncidentCategory;
  /**
   * Lightweight severity hint when the source carries one (Linear priority
   * 1/2 → high, 3 → medium, else low). Null when unknown.
   */
  severity: 'high' | 'medium' | 'low' | null;
}

export interface IncidentTimelinePayload {
  generated_at: string;
  as_of: string;
  window_start: string;
  event_count: number;
  by_category: Record<IncidentCategory, number>;
  sources_present: IncidentSource[];
  sources_missing: IncidentSource[];
  events: IncidentEvent[];
}

export const INCIDENT_WINDOW_MONTHS = 24;

const SECURITY_TERMS = ['security', 'cve', 'vuln', 'xss', 'csrf', 'injection', 'leak', 'breach', 'unauthor', 'rls', 'permission'];
const OUTAGE_TERMS = ['outage', 'down', 'unavailable', '5xx', '502', '503', '504', 'incident', 'rollback', 'revert'];
const CUSTOMER_TERMS = ['customer', 'client', 'paying', 'ccw', 'support ticket', 'p0', 'p1'];

export function buildIncidentTimeline(
  agentActions: AgentActionRow[],
  linearIssues: LinearIssueRow[],
  githubPrs: GitHubPrRow[],
  asOf: string,
): IncidentTimelinePayload {
  const asOfMs = Date.parse(asOf);
  const windowStartMs = asOfMs - INCIDENT_WINDOW_MONTHS * 30 * 86_400_000;
  const windowStart = new Date(windowStartMs).toISOString();

  const events: IncidentEvent[] = [];
  const sourcesPresent: IncidentSource[] = [];
  const sourcesMissing: IncidentSource[] = [];

  if (agentActions.length > 0) sourcesPresent.push('agent_actions');
  else sourcesMissing.push('agent_actions');

  if (linearIssues.length > 0) sourcesPresent.push('linear_issues');
  else sourcesMissing.push('linear_issues');

  if (githubPrs.length > 0) sourcesPresent.push('github_prs');
  else sourcesMissing.push('github_prs');

  // agent_actions: failed runs only — successful actions aren't incidents.
  for (const row of agentActions) {
    if (row.status !== 'failed') continue;
    if (!withinWindow(row.created_at, windowStartMs, asOfMs)) continue;
    const title = row.action_type
      ? `Agent action failed: ${row.action_type}`
      : 'Agent action failed';
    events.push({
      occurred_at: row.created_at as string,
      source: 'agent_actions',
      source_id: row.id,
      title,
      category: classifyCategory(title),
      severity: null,
    });
  }

  // linear_issues: completed issues whose title implies an incident.
  for (const row of linearIssues) {
    if (row.state_type !== 'completed') continue;
    if (!withinWindow(row.completed_at, windowStartMs, asOfMs)) continue;
    const category = classifyCategory(row.title);
    if (category === 'internal' && !isIncidentish(row.title)) continue;
    events.push({
      occurred_at: row.completed_at as string,
      source: 'linear_issues',
      source_id: row.id,
      title: row.title,
      category,
      severity: linearPriorityToSeverity(row.priority),
    });
  }

  // github_prs: merged PRs whose title implies an incident response.
  for (const row of githubPrs) {
    if (row.state !== 'merged' && row.state !== 'closed') continue;
    if (!withinWindow(row.merged_at, windowStartMs, asOfMs)) continue;
    if (!isIncidentish(row.title)) continue;
    events.push({
      occurred_at: row.merged_at as string,
      source: 'github_prs',
      source_id: row.id,
      title: row.title,
      category: classifyCategory(row.title),
      severity: null,
    });
  }

  events.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : a.occurred_at > b.occurred_at ? -1 : 0));

  const by_category: Record<IncidentCategory, number> = {
    security: 0,
    outage: 0,
    customer_impact: 0,
    internal: 0,
  };
  for (const e of events) {
    by_category[e.category] += 1;
  }

  return {
    generated_at: asOf,
    as_of: asOf,
    window_start: windowStart,
    event_count: events.length,
    by_category,
    sources_present: sourcesPresent,
    sources_missing: sourcesMissing,
    events,
  };
}

function withinWindow(
  iso: string | null,
  windowStartMs: number,
  asOfMs: number,
): boolean {
  if (!iso) return false;
  const ts = Date.parse(iso);
  return Number.isFinite(ts) && ts >= windowStartMs && ts <= asOfMs;
}

function classifyCategory(text: string): IncidentCategory {
  const haystack = text.toLowerCase();
  if (SECURITY_TERMS.some((t) => haystack.includes(t))) return 'security';
  if (OUTAGE_TERMS.some((t) => haystack.includes(t))) return 'outage';
  if (CUSTOMER_TERMS.some((t) => haystack.includes(t))) return 'customer_impact';
  return 'internal';
}

/**
 * "Incident-ish" titles get included from sources where every row is otherwise
 * legitimate (Linear DONE issues, merged PRs). Without this filter the timeline
 * would be flooded with routine feature work.
 */
function isIncidentish(text: string): boolean {
  const haystack = text.toLowerCase();
  return (
    SECURITY_TERMS.some((t) => haystack.includes(t)) ||
    OUTAGE_TERMS.some((t) => haystack.includes(t)) ||
    haystack.includes('hotfix') ||
    haystack.includes('p0') ||
    haystack.includes('p1') ||
    haystack.includes('postmortem')
  );
}

function linearPriorityToSeverity(
  priority: number | null,
): IncidentEvent['severity'] {
  if (priority === 1 || priority === 2) return 'high';
  if (priority === 3) return 'medium';
  if (priority === 4) return 'low';
  return null;
}
