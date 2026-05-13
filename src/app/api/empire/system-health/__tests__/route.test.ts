// System Health aggregator tests.
//
// Strategy: import `computeSystemHealth` directly so we don't have to mock the
// 30s cache or NextResponse. Mock `getAdminClient` and global fetch for every
// downstream signal so we can drive each one to ok / warn / err independently
// and then assert the overall roll-up.

import { computeSystemHealth } from '../route';

// ---- Supabase mock plumbing ----

const businessesLimitChain = jest.fn();
const snapshotsOrderChain = jest.fn();

jest.mock('@/lib/supabase/admin', () => {
  return {
    getAdminClient: () => ({
      from: (table: string) => {
        if (table === 'businesses') {
          return {
            select: () => ({
              limit: businessesLimitChain,
            }),
          };
        }
        if (table === 'pi_ceo_health_snapshots') {
          return {
            select: () => ({
              order: snapshotsOrderChain,
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    }),
  };
});

const realFetch = global.fetch;

beforeEach(() => {
  businessesLimitChain.mockReset();
  snapshotsOrderChain.mockReset();
  // Default: every downstream API call returns a happy response.
  // Individual tests override per-URL.
  global.fetch = jest.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;

  // Default env: every integration has a token so probeIntegrations returns ok.
  process.env.VERCEL_INTEGRATION_TOKEN = 'tk';
  process.env.RAILWAY_API_TOKEN = 'tk';
  process.env.SUPABASE_ACCESS_TOKEN = 'tk';
  process.env.PI_CEO_API_KEY = 'tk';
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env.VERCEL_INTEGRATION_TOKEN;
  delete process.env.RAILWAY_API_TOKEN;
  delete process.env.SUPABASE_ACCESS_TOKEN;
  delete process.env.PI_CEO_API_KEY;
});

// ---- Helpers ----

function happyDatabase() {
  // Supabase head:true query returns { error: null }
  businessesLimitChain.mockResolvedValue({ error: null });
}

function brokenDatabase() {
  businessesLimitChain.mockResolvedValue({ error: { message: 'connection refused' } });
}

function happyScanner() {
  // Fresh snapshot now → ok
  const now = new Date().toISOString();
  snapshotsOrderChain.mockResolvedValue({
    data: [
      { project_id: 'synthex', snapshot_at: now },
      { project_id: 'ccw-crm', snapshot_at: now },
    ],
    error: null,
  });
}

function staleScanner() {
  // 10-day-old snapshot → err
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
  snapshotsOrderChain.mockResolvedValue({
    data: [{ project_id: 'synthex', snapshot_at: tenDaysAgo }],
    error: null,
  });
}

function warnScanner() {
  // 2-day-old snapshot → warn (>24h, <7d)
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
  snapshotsOrderChain.mockResolvedValue({
    data: [{ project_id: 'synthex', snapshot_at: twoDaysAgo }],
    error: null,
  });
}

function setupFetch(overrides: Record<string, (url: string) => Response | Promise<Response>>) {
  global.fetch = jest.fn(async (url: string | URL | Request) => {
    const u = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    for (const [pattern, fn] of Object.entries(overrides)) {
      if (u.includes(pattern)) return fn(u);
    }
    // Default: ok response with an adapter-shaped body for sources.
    if (u.includes('/api/empire/sources/')) {
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    }
    if (u.includes('/api/empire/businesses')) {
      return new Response(JSON.stringify({ businesses: [{ overall_health: 90 }, { overall_health: 85 }] }), { status: 200 });
    }
    // Vercel deployments default → a single READY deployment, so deploys signal = ok.
    if (u.includes('api.vercel.com/v6/deployments')) {
      return new Response(
        JSON.stringify({ deployments: [{ uid: 'd1', url: 'x', state: 'READY', created: Date.now() }] }),
        { status: 200 },
      );
    }
    return new Response('{}', { status: 200 });
  }) as unknown as typeof fetch;
}

// ---- Test cases ----

describe('computeSystemHealth', () => {
  it('returns overall ok when every signal is healthy', async () => {
    happyDatabase();
    happyScanner();
    setupFetch({});

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.overall).toBe('ok');
    expect(result.signals.database.status).toBe('ok');
    expect(result.signals.api.status).toBe('ok');
    expect(result.signals.integrations.status).toBe('ok');
    expect(result.signals.businesses.status).toBe('ok');
    expect(result.signals.pi_ceo_scanner.status).toBe('ok');
    expect(result.signals.deploys.status).toBe('ok');
    expect(result.computed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('rolls up to err when one signal errors', async () => {
    brokenDatabase(); // DB returns err
    happyScanner();
    setupFetch({});

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.signals.database.status).toBe('err');
    expect(result.overall).toBe('err');
  });

  it('rolls up to warn when one signal warns and rest ok', async () => {
    happyDatabase();
    warnScanner(); // scanner 2d old → warn
    setupFetch({});

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.signals.pi_ceo_scanner.status).toBe('warn');
    expect(result.overall).toBe('warn');
  });

  it('marks deploys err when Vercel returns ERROR state', async () => {
    happyDatabase();
    happyScanner();
    setupFetch({
      'api.vercel.com/v6/deployments': () =>
        new Response(
          JSON.stringify({ deployments: [{ uid: 'd1', url: 'x', state: 'ERROR', created: Date.now() }] }),
          { status: 200 },
        ),
    });

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.signals.deploys.status).toBe('err');
    expect(result.signals.deploys.state).toBe('ERROR');
    expect(result.overall).toBe('err');
  });

  it('marks deploys warn when Vercel returns BUILDING state', async () => {
    happyDatabase();
    happyScanner();
    setupFetch({
      'api.vercel.com/v6/deployments': () =>
        new Response(
          JSON.stringify({ deployments: [{ uid: 'd1', url: 'x', state: 'BUILDING', created: Date.now() }] }),
          { status: 200 },
        ),
    });

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.signals.deploys.status).toBe('warn');
    expect(result.signals.deploys.summary).toContain('deploying now');
  });

  it('rolls up integrations to err when one source adapter fails', async () => {
    happyDatabase();
    happyScanner();
    setupFetch({
      // Every github probe across the 6 brands returns err status.
      '/api/empire/sources/github/': () =>
        new Response(JSON.stringify({ status: 'err' }), { status: 200 }),
    });

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.signals.integrations.github).toBe('err');
    expect(result.signals.integrations.status).toBe('err');
  });

  it('classifies businesses by health buckets', async () => {
    happyDatabase();
    happyScanner();
    setupFetch({
      '/api/empire/businesses': () =>
        new Response(
          JSON.stringify({
            businesses: [
              { overall_health: 90 }, // ok
              { overall_health: 75 }, // warn
              { overall_health: 40 }, // err
              { overall_health: null }, // skipped
            ],
          }),
          { status: 200 },
        ),
    });

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.signals.businesses.total).toBe(4);
    expect(result.signals.businesses.ok_count).toBe(1);
    expect(result.signals.businesses.warn_count).toBe(1);
    expect(result.signals.businesses.err_count).toBe(1);
    expect(result.signals.businesses.status).toBe('err');
  });

  it('marks an integration unknown when every adapter probe returns unknown', async () => {
    // Vercel adapter route returns { status: 'unknown' } for every brand → roll-up = unknown.
    happyDatabase();
    happyScanner();
    setupFetch({
      '/api/empire/sources/vercel/': () =>
        new Response(JSON.stringify({ status: 'unknown' }), { status: 200 }),
    });

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.signals.integrations.vercel).toBe('unknown');
  });

  it('marks scanner err when snapshots are >7d old', async () => {
    happyDatabase();
    staleScanner();
    setupFetch({});

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.signals.pi_ceo_scanner.status).toBe('err');
    expect(result.signals.pi_ceo_scanner.stale_brands).toBeGreaterThan(0);
    expect(result.overall).toBe('err');
  });

  it('flags database warn at 200-1000ms latency', async () => {
    // Simulate latency by delaying the mocked supabase response.
    businessesLimitChain.mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve({ error: null }), 250);
        }),
    );
    happyScanner();
    setupFetch({});

    const result = await computeSystemHealth('http://localhost:3000');
    expect(result.signals.database.status).toBe('warn');
    expect(result.signals.database.latency_ms).toBeGreaterThanOrEqual(200);
  });
});
