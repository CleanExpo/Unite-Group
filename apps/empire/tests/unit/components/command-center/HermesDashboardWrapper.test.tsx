import { renderToStaticMarkup } from 'react-dom/server';
import {
  HermesDashboardWrapper,
  type HermesDashboardWrapperPayload,
} from '../../../../src/components/command-center/hermes-dashboard/HermesDashboardWrapper';

const payload: HermesDashboardWrapperPayload = {
  source: 'local-hermes-dashboard-wrapper',
  generatedAt: '2026-06-10T04:10:00.000Z',
  docsContract: {
    mode: 'read-only wrapper',
    dashboardExtensionPath: '~/.hermes/plugins/<name>/dashboard/',
    missionControlPattern: 'Unite-Group calls local Hermes dashboard/kanban/cron probes; no secrets or .env values are exposed.',
    subscriptionProxy: 'Optional raw-model passthrough only; not used as the Mission Control agent wrapper.',
  },
  dashboard: {
    status: 'live',
    processCount: 2,
    url: 'http://127.0.0.1:9119',
    note: 'Hermes dashboard process probe succeeded.',
  },
  cron: {
    status: 'degraded',
    gatewayRunning: false,
    activeJobs: 28,
    nextRunAt: '2026-06-11 08:00:00 AEST',
    note: 'Gateway is not running, so scheduled cron jobs will not fire.',
  },
  kanban: {
    status: 'live',
    currentBoard: 'unite-group',
    taskCount: 33,
    counts: {
      blocked: 13,
      todo: 9,
      done: 11,
    },
    note: 'Hermes Kanban board read succeeded.',
  },
  context: {
    status: 'live',
    secondBrain: {
      path: '/Users/phillmcgurk/2nd-brain',
      markdownFiles: 1509,
      canonical: true,
    },
    legacyObsidian: {
      path: '/Users/phillmcgurk/Documents/Obsidian Vault',
      markdownFiles: 0,
      note: 'Legacy Obsidian folder has no markdown files.',
    },
    tailscale: {
      status: 'live',
      onlinePeers: 3,
      note: 'Tailnet reachable from local Mac.',
    },
  },
  addons: {
    status: 'live',
    goals: {
      status: 'live',
      metric: '20 turns',
      note: 'Persistent /goal loop configured with cheap judge routing.',
    },
    codeExecution: {
      status: 'live',
      metric: 'project · 50 calls',
      note: 'execute_code is enabled for mechanical multi-step work.',
    },
    hooks: {
      status: 'live',
      metric: '2 hooks',
      note: 'Gateway hooks directory has active hook manifests.',
    },
    batchProcessing: {
      status: 'live',
      metric: 'batch_runner.py',
      note: 'Batch runner is present for checkpointed trajectory runs.',
    },
  },
};

function payloadWith(
  patch: Partial<HermesDashboardWrapperPayload>,
): HermesDashboardWrapperPayload {
  return {
    ...payload,
    ...patch,
  };
}

describe('HermesDashboardWrapper', () => {
  it('renders the local Hermes dashboard wrapper without exposing secret-bearing UI', () => {
    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={payload} />);

    expect(html).toContain('aria-label="Hermes Dashboard Mission Control wrapper"');
    expect(html).toContain('Hermes Dashboard Wrapper');
    expect(html).toContain('2 process(es)');
    expect(html).toContain('28 active jobs');
    expect(html).toContain('33 tasks');
    expect(html).toContain('1509 notes');
    expect(html).toContain('Gateway is not running, so scheduled cron jobs will not fire.');
    expect(html).toContain('read-only wrapper');
    expect(html).toContain('Use Hermes dashboard plugins for deeper tabs, not a secrets-bearing iframe.');
    expect(html).toContain('Readiness overview');
    expect(html).toContain('80% ready');
    expect(html).toContain('Live 4 · Degraded 2 · Missing 0');
    expect(html).toContain('Kanban distribution');
    expect(html).toContain('blocked 13');
    expect(html).toContain('done 11');
    expect(html).toContain('source-map status dot');
    expect(html).toContain('Capability matrix');
    expect(html).toContain('Persistent Goals');
    expect(html).toContain('20 turns');
    expect(html).toContain('Code Execution');
    expect(html).toContain('project · 50 calls');
    expect(html).toContain('Event Hooks');
    expect(html).toContain('2 hooks');
    expect(html).toContain('Batch Processing');
    expect(html).toContain('batch_runner.py');
    expect(html).toContain('scheduled (not firing)');
    expect(html).toContain('2026-06-11 08:00');
    expect(html).toContain('gateway not running');
    expect(html).not.toContain('.env');
    expect(html).not.toContain('API key');
  });

  // The readiness helper weights `live` as 1, `degraded` as 0.4, and `missing`
  // as 0 across six checks (dashboard, cron, cron.gateway, kanban, context,
  // addons). Pin the math so a future refactor that flips the weights or
  // renames the check list fails the gate before it ships to the Mission
  // Control board.
  it('reads 40% ready with 0 live and 6 degraded probes (pin the 0.4 degraded weight)', () => {
    const degraded = payloadWith({
      dashboard: { ...payload.dashboard, status: 'degraded' },
      cron: { ...payload.cron, status: 'degraded' },
      kanban: { ...payload.kanban, status: 'degraded' },
      context: { ...payload.context, status: 'degraded' },
      addons: {
        ...payload.addons!,
        status: 'degraded',
      },
    });

    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={degraded} />);

    // 6 checks, all degraded → weighted = 6 * 0.4 = 2.4 → 2.4/6 = 40%.
    expect(html).toContain('40% ready');
    expect(html).toContain('Live 0 · Degraded 6 · Missing 0');
  });

  // The readiness helper weights `live` as 1, `degraded` as 0.4, and `missing`
  // as 0 across six checks (dashboard, cron, cron.gateway, kanban, context,
  // addons). The cron subcheck is `gatewayRunning ? 'live' : 'degraded'`, so
  // a fully missing payload with `gatewayRunning=false` still pins one
  // degraded slot — there is no input shape that yields a literal 0% from
  // the live branch (the 0% "warming up" copy is the `loading=true` branch,
  // which is pinned in a separate test).
  it('reads 7% ready when every probe is missing and the cron gateway is also down (1 of 6 checks is degraded)', () => {
    const missing = payloadWith({
      dashboard: { ...payload.dashboard, status: 'missing' },
      cron: { ...payload.cron, status: 'missing' },
      kanban: { ...payload.kanban, status: 'missing' },
      context: { ...payload.context, status: 'missing' },
      addons: {
        ...payload.addons!,
        status: 'missing',
      },
    });

    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={missing} />);

    // 5 missing (weight 0) + 1 degraded (weight 0.4) → 0.4 / 6 ≈ 6.67% → 7%.
    expect(html).toContain('7% ready');
    expect(html).toContain('Live 0 · Degraded 1 · Missing 5');
  });

  it('reads 17% ready when every probe is missing but the cron gateway is up (1 of 6 checks is live)', () => {
    // With cron.status='missing' but cron.gatewayRunning=true, the cron
    // subcheck resolves to 'live' (the readiness snapshot trusts the
    // gateway bit, not the cron status string). 1 live + 5 missing →
    // 1/6 ≈ 16.67% → 17%.
    const missingGatewayUp = payloadWith({
      dashboard: { ...payload.dashboard, status: 'missing' },
      cron: { ...payload.cron, status: 'missing', gatewayRunning: true },
      kanban: { ...payload.kanban, status: 'missing' },
      context: { ...payload.context, status: 'missing' },
      addons: {
        ...payload.addons!,
        status: 'missing',
      },
    });

    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={missingGatewayUp} />);

    expect(html).toContain('17% ready');
    expect(html).toContain('Live 1 · Degraded 0 · Missing 5');
  });

  it('flips the readiness label to "connected to live probes" when cron.gatewayRunning is true', () => {
    const live = payloadWith({
      dashboard: { ...payload.dashboard, status: 'live' },
      cron: { ...payload.cron, status: 'live', gatewayRunning: true },
      kanban: { ...payload.kanban, status: 'live' },
      context: { ...payload.context, status: 'live' },
      addons: {
        ...payload.addons!,
        status: 'live',
      },
    });

    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={live} />);

    expect(html).toContain('Local Hermes wrapper is read-only and connected to live probes.');
    expect(html).toContain('100% ready');
    expect(html).toContain('Live 6 · Degraded 0 · Missing 0');
    // With the gateway up, the cron card must NOT show the "scheduled (not firing)" badge.
    expect(html).not.toContain('scheduled (not firing)');
    expect(html).toContain('next run');
  });

  it('still pins the degraded "warming up" copy when the initialPayload is omitted (loading=true branch)', () => {
    // No initialPayload → loading=true → readinessSnapshot enters the
    // warming-up branch (percent=0, label="Local probe map warming up").
    const html = renderToStaticMarkup(<HermesDashboardWrapper />);

    expect(html).toContain('0% ready');
    expect(html).toContain('Local probe map warming up');
    // The cards should render the loading probe copy, not "0 process(es)".
    expect(html).toContain('probing');
  });

  // `formatCountMap` filters out non-positive counts and joins the rest with
  // a ` · ` separator. An empty count map must read "no tasks" so the kanban
  // card does not show a stray separator.
  it('renders the kanban card as "no tasks" when the counts map is empty', () => {
    const empty = payloadWith({
      kanban: { ...payload.kanban, taskCount: 0, counts: {} },
    });

    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={empty} />);

    expect(html).toContain('no tasks');
    // The distribution chart should not render when the count map is empty.
    expect(html).not.toContain('Kanban distribution');
  });

  it('filters out non-positive kanban counts so the distribution only shows positive entries', () => {
    const filtered = payloadWith({
      kanban: {
        ...payload.kanban,
        taskCount: 13,
        counts: {
          blocked: 13,
          todo: 0,
          done: -2, // negative counts must be filtered (a hostile or buggy sync must not poison the chart)
        },
      },
    });

    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={filtered} />);

    expect(html).toContain('blocked 13');
    // The hidden entries must not appear in the visible summary or distribution legend.
    expect(html).not.toMatch(/todo 0/);
    expect(html).not.toMatch(/done -2/);
  });

  // `formatNextRun` strips the seconds and trailing timezone from a cron
  // status string. It must NOT touch strings that already have no seconds,
  // and must NOT crash on a null/undefined input (the cron card hides the
  // whole badge when nextRunAt is null).
  it('strips seconds and timezone from an AEST cron string (2026-06-11 08:00:00 AEST → "2026-06-11 08:00")', () => {
    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={payload} />);

    expect(html).toContain('2026-06-11 08:00');
    expect(html).not.toContain('2026-06-11 08:00:00');
    expect(html).not.toContain('AEST');
  });

  it('strips seconds and the trailing "Z" from an ISO cron string', () => {
    const iso = payloadWith({
      cron: { ...payload.cron, nextRunAt: '2026-06-11T08:00:45.123Z' },
    });

    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={iso} />);

    expect(html).toContain('2026-06-11T08:00');
    expect(html).not.toContain('2026-06-11T08:00:45');
    expect(html).not.toContain('.123Z');
  });

  it('omits the cron next-run badge entirely when nextRunAt is undefined', () => {
    const noNext = payloadWith({
      cron: { ...payload.cron, nextRunAt: undefined },
    });

    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={noNext} />);

    // The aria-label and badge text are conditional on nextRunAt being
    // truthy. With nextRunAt=undefined the badge must not render at all.
    expect(html).not.toContain('Cron next scheduled run:');
    expect(html).not.toContain('next run');
  });

  it('omits the cron next-run badge for an empty nextRunAt string (defensive against the empty-string falsy)', () => {
    // The helper's `if (!raw) return null` covers both undefined and ''.
    // Pin that behaviour so a future refactor that uses `raw?.length` or
    // strips the guard does not silently render a "next run 0" badge.
    const empty = payloadWith({
      cron: { ...payload.cron, nextRunAt: '' },
    });

    const html = renderToStaticMarkup(<HermesDashboardWrapper initialPayload={empty} />);

    expect(html).not.toContain('Cron next scheduled run:');
    expect(html).not.toContain('next run');
  });
});
