import {
  buildIncidentTimeline,
  INCIDENT_WINDOW_MONTHS,
  type AgentActionRow,
  type GitHubPrRow,
  type LinearIssueRow,
} from '../incident-timeline';

const AS_OF = '2026-05-18T00:00:00.000Z';
const asOfMs = Date.parse(AS_OF);

function daysAgo(days: number): string {
  return new Date(asOfMs - days * 86_400_000).toISOString();
}

function agentAction(
  overrides: Partial<AgentActionRow> = {},
): AgentActionRow {
  return {
    id: 'aa_1',
    source: 'orchestrator',
    action_type: 'deploy',
    status: 'failed',
    business_id: null,
    created_at: daysAgo(10),
    ...overrides,
  };
}

function linearIssue(
  overrides: Partial<LinearIssueRow> = {},
): LinearIssueRow {
  return {
    id: 'UNI-100',
    title: 'Test issue',
    state_type: 'completed',
    priority: 3,
    completed_at: daysAgo(5),
    ...overrides,
  };
}

function pr(overrides: Partial<GitHubPrRow> = {}): GitHubPrRow {
  return {
    id: 'CleanExpo/Unite-Group#1',
    repo: 'CleanExpo/Unite-Group',
    number: 1,
    title: 'Test PR',
    state: 'merged',
    merged_at: daysAgo(3),
    ...overrides,
  };
}

describe('buildIncidentTimeline', () => {
  it('returns an empty timeline with no inputs and lists every source missing', () => {
    const out = buildIncidentTimeline([], [], [], AS_OF);
    expect(out.event_count).toBe(0);
    expect(out.events).toEqual([]);
    expect(out.sources_present).toEqual([]);
    expect(out.sources_missing).toEqual([
      'agent_actions',
      'linear_issues',
      'github_prs',
    ]);
  });

  it('only ingests agent_actions with status=failed', () => {
    const out = buildIncidentTimeline(
      [
        agentAction({ id: 'a1', status: 'failed' }),
        agentAction({ id: 'a2', status: 'done' }),
        agentAction({ id: 'a3', status: 'pending' }),
      ],
      [],
      [],
      AS_OF,
    );
    expect(out.events).toHaveLength(1);
    expect(out.events[0].source_id).toBe('a1');
  });

  it('filters out events outside the 24-month window', () => {
    const old = new Date(
      asOfMs - (INCIDENT_WINDOW_MONTHS * 30 + 5) * 86_400_000,
    ).toISOString();
    const out = buildIncidentTimeline(
      [
        agentAction({ id: 'recent', created_at: daysAgo(10) }),
        agentAction({ id: 'old', created_at: old }),
      ],
      [],
      [],
      AS_OF,
    );
    expect(out.events.map((e) => e.source_id)).toEqual(['recent']);
  });

  it('sorts the merged stream reverse-chronologically', () => {
    const out = buildIncidentTimeline(
      [agentAction({ id: 'a', created_at: daysAgo(20) })],
      [linearIssue({ id: 'l', title: 'P0 outage', completed_at: daysAgo(5) })],
      [pr({ id: 'p', title: 'hotfix database connection', merged_at: daysAgo(15) })],
      AS_OF,
    );
    expect(out.events.map((e) => e.source)).toEqual([
      'linear_issues',
      'github_prs',
      'agent_actions',
    ]);
  });

  it('classifies security / outage / customer_impact / internal categories', () => {
    const out = buildIncidentTimeline(
      [],
      [
        linearIssue({ id: 'sec', title: 'Fix XSS vulnerability in form' }),
        linearIssue({ id: 'out', title: 'P0 outage: 503 from API' }),
        linearIssue({ id: 'cust', title: 'CCW client onboarding broken' }),
        linearIssue({ id: 'noise', title: 'Refactor button styles' }),
      ],
      [],
      AS_OF,
    );
    const byId = (id: string) => out.events.find((e) => e.source_id === id);
    expect(byId('sec')!.category).toBe('security');
    expect(byId('out')!.category).toBe('outage');
    expect(byId('cust')!.category).toBe('customer_impact');
    // 'Refactor button styles' is not incident-ish → dropped entirely
    expect(byId('noise')).toBeUndefined();
  });

  it('drops Linear issues that are merely "completed" but not incident-ish', () => {
    const out = buildIncidentTimeline(
      [],
      [
        linearIssue({ id: 'feature', title: 'Add new dashboard widget' }),
        linearIssue({ id: 'incident', title: 'Hotfix: revert broken migration' }),
      ],
      [],
      AS_OF,
    );
    expect(out.events.map((e) => e.source_id)).toEqual(['incident']);
  });

  it('only includes GitHub PRs whose titles look incident-ish', () => {
    const out = buildIncidentTimeline(
      [],
      [],
      [
        pr({ id: 'p1', title: 'Hotfix payment webhook' }),
        pr({ id: 'p2', title: 'Revert: rollback bad deploy' }),
        pr({ id: 'p3', title: 'feat: add dark mode' }),
      ],
      AS_OF,
    );
    expect(out.events.map((e) => e.source_id).sort()).toEqual(['p1', 'p2']);
  });

  it('maps Linear priority to severity (1/2 → high, 3 → medium, 4 → low, null → null)', () => {
    const out = buildIncidentTimeline(
      [],
      [
        linearIssue({ id: 'p1', title: 'P0 security breach', priority: 1 }),
        linearIssue({ id: 'p2', title: 'security audit fix', priority: 2 }),
        linearIssue({ id: 'p3', title: 'outage retro', priority: 3 }),
        linearIssue({ id: 'p4', title: 'incident debrief', priority: 4 }),
        linearIssue({ id: 'pn', title: 'CVE patch deploy', priority: null }),
      ],
      [],
      AS_OF,
    );
    const sev = (id: string) => out.events.find((e) => e.source_id === id)!.severity;
    expect(sev('p1')).toBe('high');
    expect(sev('p2')).toBe('high');
    expect(sev('p3')).toBe('medium');
    expect(sev('p4')).toBe('low');
    expect(sev('pn')).toBeNull();
  });

  it('tallies by_category accurately', () => {
    const out = buildIncidentTimeline(
      [
        agentAction({ id: 'a1', action_type: 'security_scan' }),
        agentAction({ id: 'a2', action_type: 'deploy' }),
      ],
      [
        linearIssue({ id: 'l1', title: 'Hotfix CCW outage' }),
      ],
      [
        pr({ id: 'pr1', title: 'P1 hotfix security patch' }),
      ],
      AS_OF,
    );
    expect(out.by_category.security).toBeGreaterThanOrEqual(2);
    expect(out.by_category.outage).toBeGreaterThanOrEqual(1);
    expect(out.event_count).toBe(out.events.length);
  });

  it('skips rows with null timestamps', () => {
    const out = buildIncidentTimeline(
      [agentAction({ id: 'a', created_at: null })],
      [linearIssue({ id: 'l', title: 'P0 outage', completed_at: null })],
      [pr({ id: 'p', title: 'hotfix database', merged_at: null })],
      AS_OF,
    );
    expect(out.event_count).toBe(0);
  });
});
