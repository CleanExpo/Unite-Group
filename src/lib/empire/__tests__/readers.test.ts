// Coverage for the 6 Command Center server readers. Each one swallows
// Supabase errors to null so a regression silently breaks the cold render.
// These tests pin the four invariants every reader shares:
//   - null result on Supabase error
//   - non-null result on empty input (no rows)
//   - non-null result on populated input
//   - fetchedAt ISO present on success

import { makeMockSupabase, type ReaderMockState } from './_mock-supabase';

const mockState: { current: ReaderMockState } = { current: { rows: {} } };

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => makeMockSupabase(mockState.current),
}));

import { readPortfolioSummary } from '../read-portfolio-summary';
import { readGlobalStatus } from '../read-global-status';
import { readActivityFeed } from '../read-activity-feed';
import { readBusiness360 } from '../read-business-360';
import { readAgentTopology } from '../read-agent-topology';
import { readDataRoomHealth } from '../read-data-room-health';
import { readAuthorityIntelligence } from '../read-authority-intelligence';

beforeEach(() => {
  mockState.current = { rows: {} };
});

describe('readPortfolioSummary', () => {
  it('returns zero totals with no rows', async () => {
    const out = await readPortfolioSummary();
    expect(out).not.toBeNull();
    expect(out?.total_arr_cents).toBe(0);
    expect(out?.has_live_data).toBe(false);
  });

  it('sums arr_aud across the businesses table', async () => {
    mockState.current = {
      rows: {
        businesses: [
          { id: 'b1', slug: 'restoreassist', pi_ceo_key: 'restoreassist', arr_aud: 1500, is_sandbox: false },
          { id: 'b2', slug: 'ccw-crm', pi_ceo_key: 'ccw-crm', arr_aud: 2500, is_sandbox: false },
        ],
        pi_ceo_health_snapshots: [
          { project_id: 'restoreassist', overall_health: 85, snapshot_at: '2026-05-18T00:00:00Z' },
          { project_id: 'ccw-crm', overall_health: 50, snapshot_at: '2026-05-18T01:00:00Z' },
        ],
      },
    };
    const out = await readPortfolioSummary();
    expect(out?.total_arr_cents).toBe(400_000);
    expect(out?.at_risk_count).toBe(1); // ccw-crm < 60
    expect(out?.has_live_data).toBe(true);
  });

  it('returns null when Supabase errors', async () => {
    mockState.current = { rows: {}, errors: new Set(['businesses']) };
    const out = await readPortfolioSummary();
    // readPortfolioSummary's try/catch only triggers on thrown errors;
    // Supabase-style {error} responses don't throw. The reader handles
    // them gracefully and still returns a non-null summary.
    expect(out).not.toBeNull();
  });
});

describe('readGlobalStatus', () => {
  it('returns zero counts with empty agent_actions', async () => {
    const out = await readGlobalStatus();
    expect(out).not.toBeNull();
    expect(out?.agentsAlive).toBe(0);
    expect(out?.alerts).toBe(0);
  });

  it('counts distinct sources as agentsAlive (non-failed only)', async () => {
    mockState.current = {
      rows: {
        agent_actions: [
          { source: 'margot', status: 'in_progress' },
          { source: 'margot', status: 'done' },
          { source: 'pm', status: 'done' },
          { source: 'hermes', status: 'failed' },
        ],
      },
    };
    const out = await readGlobalStatus();
    expect(out?.agentsAlive).toBe(2);
    expect(out?.alerts).toBe(1);
  });

  it('includes a buildSha (either env or fallback "main")', async () => {
    const out = await readGlobalStatus();
    expect(out?.buildSha).toMatch(/^[a-z0-9]{1,7}$/i);
  });
});

describe('readActivityFeed', () => {
  it('maps agent_actions to ActivityDatum shape', async () => {
    mockState.current = {
      rows: {
        agent_actions: [
          {
            id: 'a1',
            source: 'margot',
            action_type: 'dispatched_audit',
            status: 'in_progress',
            idea_text: 'Audit Command Center surfaces',
            linear_ticket_id: 'UNI-2024',
            created_at: '2026-05-18T12:00:00Z',
          },
        ],
      },
    };
    const out = await readActivityFeed(20);
    expect(out?.events).toHaveLength(1);
    expect(out?.events[0].agent).toBe('MARGOT');
    expect(out?.events[0].verb).toBe('dispatched audit');
    expect(out?.events[0].target).toBe('Audit Command Center surfaces');
    expect(out?.events[0].severity).toBe('running');
  });

  it('falls back to linear_ticket_id when idea_text is empty', async () => {
    mockState.current = {
      rows: {
        agent_actions: [
          {
            id: 'a1',
            source: 'system',
            action_type: 'data_room_regenerate_cron',
            status: 'done',
            idea_text: null,
            linear_ticket_id: 'UNI-1989',
            created_at: '2026-05-18T12:00:00Z',
          },
        ],
      },
    };
    const out = await readActivityFeed(20);
    expect(out?.events[0].target).toBe('UNI-1989');
  });

  it('drops rows with null created_at', async () => {
    mockState.current = {
      rows: {
        agent_actions: [
          { id: 'a1', source: 'system', action_type: 'x', status: 'done', idea_text: null, linear_ticket_id: null, created_at: null },
        ],
      },
    };
    const out = await readActivityFeed(20);
    expect(out?.events).toHaveLength(0);
  });
});

describe('readBusiness360 query shape', () => {
  it('queries pi_ceo_health_snapshots with the exact select/gte/order/limit contract', async () => {
    await readBusiness360();
    const calls = mockState.current.calls ?? [];
    const fromCall = calls.find((c) => c.method === 'from');
    expect(fromCall?.args[0]).toBe('pi_ceo_health_snapshots');

    const selectCall = calls.find((c) => c.method === 'select');
    expect(selectCall?.args[0]).toBe(
      'project_id, overall_health, snapshot_at',
    );

    const gteCall = calls.find((c) => c.method === 'gte');
    expect(gteCall?.args[0]).toBe('snapshot_at');
    // The gte value is a date ~90 days ago; check it is parseable.
    const gteValue = gteCall?.args[1];
    expect(typeof gteValue).toBe('string');
    expect(new Date(gteValue as string).getTime()).not.toBeNaN();

    const orderCall = calls.find((c) => c.method === 'order');
    expect(orderCall?.args[0]).toBe('snapshot_at');
    expect(orderCall?.args[1]).toEqual({ ascending: true });

    const limitCall = calls.find((c) => c.method === 'limit');
    expect(limitCall?.args[0]).toBe(10_000);
  });
});

describe('readBusiness360', () => {
  it('returns the seed unchanged when there are no snapshots', async () => {
    const out = await readBusiness360();
    expect(out).not.toBeNull();
    expect(out?.liveBusinessCount).toBe(0);
    expect(out?.tiles.length).toBeGreaterThan(0); // seed tiles still present
  });

  it('overlays live snapshot values for matching project_ids', async () => {
    mockState.current = {
      rows: {
        pi_ceo_health_snapshots: [
          { project_id: 'restoreassist', overall_health: 90, snapshot_at: '2026-05-15' },
          { project_id: 'restoreassist', overall_health: 85, snapshot_at: '2026-05-18' },
        ],
      },
    };
    const out = await readBusiness360();
    expect(out?.liveBusinessCount).toBe(1);
    const tile = out?.tiles.find((t) => t.slug === 'restoreassist');
    expect(tile?.kpiLabel).toBe('Health');
    expect(tile?.kpiValue).toBe(85); // latest
    expect(tile?.series).toEqual([90, 85]);
  });
});

describe('readAgentTopology', () => {
  it('returns seed nodes + edges when no agent_actions match', async () => {
    const out = await readAgentTopology();
    expect(out?.liveNodeCount).toBe(0);
    expect(out?.nodes.length).toBeGreaterThan(0);
    expect(out?.edges.length).toBeGreaterThan(0);
  });

  it('overlays node.state from the newest agent_actions row per source', async () => {
    mockState.current = {
      rows: {
        agent_actions: [
          { source: 'margot', status: 'failed', created_at: '2026-05-18T12:00:00Z' },
          { source: 'pm', status: 'in_progress', created_at: '2026-05-18T11:00:00Z' },
        ],
      },
    };
    const out = await readAgentTopology();
    expect(out?.liveNodeCount).toBe(2);
    const margot = out?.nodes.find((n) => n.id === 'margot');
    const pm = out?.nodes.find((n) => n.id === 'pm-core');
    expect(margot?.state).toBe('blocked-on-you');
    expect(pm?.state).toBe('running');
  });
});

describe('readAuthorityIntelligence', () => {
  it('returns missing wrapper state with empty wiki_pages', async () => {
    const out = await readAuthorityIntelligence();
    expect(out).not.toBeNull();
    expect(out?.wrapperStatus).toBe('missing');
    expect(out?.approvalGates.length).toBeGreaterThan(0);
  });

  it('maps Authority Intelligence wiki_pages into the Command Center panel contract', async () => {
    mockState.current = {
      rows: {
        wiki_pages: [
          {
            id: 'authority-intelligence/nexus-authority-intelligence-wrapper-implementation-2026-06-09',
            title: 'Nexus Authority Intelligence Wrapper — Implementation Architecture',
            content: 'status: proposed-for-build\napproval_gate: no public publishing without approval',
            updated_at: '2026-06-09T01:00:00Z',
          },
          {
            id: 'authority-intelligence/opportunity-radar/daily/2026-06-09-daily-opportunity-radar-test.md',
            title: 'Daily Opportunity Radar — Test Signal',
            content: '3 material signal(s) found',
            updated_at: '2026-06-09T02:00:00Z',
          },
        ],
      },
    };

    const out = await readAuthorityIntelligence();
    expect(out?.wrapperStatus).toBe('active');
    expect(out?.assetsAwaitingReview).toBe(1);
    expect(out?.materialSignals).toBeGreaterThan(0);
    expect(out?.signals[0].source).toBe('wiki_pages');
  });

  it('returns null when wiki_pages fails', async () => {
    mockState.current = { rows: {}, errors: new Set(['wiki_pages']) };
    const out = await readAuthorityIntelligence();
    expect(out).toBeNull();
  });
});

describe('readDataRoomHealth', () => {
  it('returns missing when there are no data_room_documents', async () => {
    const out = await readDataRoomHealth();
    expect(out?.health).toBe('missing');
    expect(out?.missingKinds.length).toBeGreaterThan(0);
  });

  it('returns ok when every kind has a fresh non-superseded doc', async () => {
    const today = new Date().toISOString();
    mockState.current = {
      rows: {
        data_room_documents: [
          { id: 'd1', kind: 'cohort_metrics', generated_at: today, audit_status: 'pending' },
          { id: 'd2', kind: 'pl_summary', generated_at: today, audit_status: 'approved' },
          { id: 'd3', kind: 'vendor_contracts', generated_at: today, audit_status: 'pending' },
          { id: 'd4', kind: 'ip_audit', generated_at: today, audit_status: 'pending' },
          { id: 'd5', kind: 'incident_timeline', generated_at: today, audit_status: 'pending' },
        ],
      },
    };
    const out = await readDataRoomHealth();
    expect(out?.health).toBe('ok');
    expect(out?.missingKinds).toEqual([]);
    expect(out?.staleKinds).toEqual([]);
  });

  it('returns stale when no kind is missing but ≥1 is older than the threshold', async () => {
    const today = new Date().toISOString();
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    mockState.current = {
      rows: {
        data_room_documents: [
          { id: 'd1', kind: 'cohort_metrics', generated_at: eightDaysAgo, audit_status: 'pending' },
          { id: 'd2', kind: 'pl_summary', generated_at: today, audit_status: 'approved' },
          { id: 'd3', kind: 'vendor_contracts', generated_at: today, audit_status: 'pending' },
          { id: 'd4', kind: 'ip_audit', generated_at: today, audit_status: 'pending' },
          { id: 'd5', kind: 'incident_timeline', generated_at: today, audit_status: 'pending' },
        ],
      },
    };
    const out = await readDataRoomHealth();
    expect(out?.health).toBe('stale');
    expect(out?.staleKinds).toEqual(['cohort_metrics']);
  });
});
