// readFleet is the server-only reader for the Nexus Mesh fleet snapshot. It
// is the canonical pipe between the Pi-CEO Railway API and the Mission
// Control dashboard; the browser never holds PI_CEO_API_KEY. These tests
// pin the read contract using global.fetch mocking, with no live network and
// no live Supabase access.

jest.mock('server-only', () => ({}), { virtual: true });

const realFetch = global.fetch;

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  // Force a known, deterministic base URL and a known API key so every test
  // inspects the same outbound request shape. PI_CEO_API_URL is required
  // (the lib has no default) — the test must always set it explicitly.
  process.env.PI_CEO_API_URL = 'https://pi-dev-ops.test.invalid';
  process.env.PI_CEO_API_KEY = 'test-pi-ceo-secret';
});

afterEach(() => {
  process.env = originalEnv;
  global.fetch = realFetch;
});

type FetchCall = {
  url: string;
  init: RequestInit | undefined;
};

function captureFetch(): jest.Mock<Promise<Partial<Response>>, []> {
  // Default fallback implementation. `mockResolvedValueOnce` overrides this
  // for the *next* call only, but jest still records the call args into
  // `mock.calls` regardless of which implementation ran. So we read calls
  // from `mock.calls` rather than maintaining a side-channel array.
  const mock = jest.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Partial<Response> as Response;
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function lastCall(mock: jest.Mock): FetchCall {
  const call = mock.mock.calls[mock.mock.calls.length - 1] as
    | [string | URL | Request, RequestInit?]
    | undefined;
  if (!call) {
    throw new Error('readFleet: no fetch calls were captured');
  }
  const [input, init] = call;
  return {
    url: typeof input === 'string' ? input : input.toString(),
    init,
  };
}

async function importReadFleet() {
  return import('@/lib/mesh/read-fleet');
}

describe('readFleet', () => {
  it('returns a populated Fleet with machines, agents, ships, and claims from a 200 upstream', async () => {
    const mock = captureFetch();
    mock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        machines: [
          { host: 'phill-mac', os: 'macOS', tailnet_ip: '100.x', status: 'online', cpu_pct: 12, mem_pct: 33, load1: 0.4, agent_runtimes: [{ runtime: 'claude-code', present: true }], version: 'v0', last_seen: '2026-06-12T01:00:00Z', is_stale: false, active_agents: 2 },
        ],
        agents: [{ machine: 'phill-mac', runtime: 'claude-code', repo: 'CleanExpo/Unite-Group', branch: 'mesh/mission-control-2026-06-11', current_task: 'read-fleet test', state: 'working' }],
        ships: [{ machine: 'phill-mac', repo: 'CleanExpo/Unite-Group', branch: 'mesh/mission-control-2026-06-11', subject: 'pin read-fleet tests', files_changed: 1, shipped_at: '2026-06-12T01:30:00Z' }],
        claims: [{ linear_id: 'UNI-9001', machine: 'phill-mac', branch: 'mesh/mission-control-2026-06-11', state: 'claimed' }],
      }),
    } as Partial<Response> as Response);

    const { readFleet } = await importReadFleet();
    const fleet = await readFleet();

    expect(fleet.ok).toBe(true);
    expect(fleet.error).toBeUndefined();
    expect(fleet.machines).toHaveLength(1);
    expect(fleet.agents).toHaveLength(1);
    expect(fleet.ships).toHaveLength(1);
    expect(fleet.claims).toHaveLength(1);
    expect(fleet.machines[0]?.host).toBe('phill-mac');
    expect(fleet.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns ok=false with a pi-ceo <status> error message on a non-OK upstream', async () => {
    const mock = captureFetch();
    mock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Partial<Response> as Response);

    const { readFleet } = await importReadFleet();
    const fleet = await readFleet();

    expect(fleet.ok).toBe(false);
    expect(fleet.error).toBe('pi-ceo 503');
    expect(fleet.machines).toEqual([]);
    expect(fleet.agents).toEqual([]);
    expect(fleet.ships).toEqual([]);
    expect(fleet.claims).toEqual([]);
    expect(fleet.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns ok=false with the thrown error message when fetch itself throws (network failure)', async () => {
    const mock = captureFetch();
    mock.mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:8443'));

    const { readFleet } = await importReadFleet();
    const fleet = await readFleet();

    expect(fleet.ok).toBe(false);
    expect(fleet.error).toBe('ECONNREFUSED 127.0.0.1:8443');
    expect(fleet.machines).toEqual([]);
    expect(fleet.agents).toEqual([]);
    expect(fleet.ships).toEqual([]);
    expect(fleet.claims).toEqual([]);
  });

  it('strips a trailing slash from PI_CEO_API_URL so the path is /api/mesh/fleet (not //api/mesh/fleet)', async () => {
    process.env.PI_CEO_API_URL = 'https://pi-dev-ops.test.invalid/';
    const mock = captureFetch();
    mock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Partial<Response> as Response);

    const { readFleet } = await importReadFleet();
    await readFleet();

    const call = lastCall(mock);
    expect(call.url).toBe('https://pi-dev-ops.test.invalid/api/mesh/fleet');
    expect(call.url).not.toContain('//api/mesh/fleet');
  });

  it('falls back to the default Pi-CEO API URL when PI_CEO_API_URL is blank whitespace', async () => {
    process.env.PI_CEO_API_URL = '   ';
    const mock = captureFetch();
    mock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Partial<Response> as Response);

    const { readFleet } = await importReadFleet();
    await readFleet();

    const call = lastCall(mock);
    expect(call.url).toBe('https://pi-dev-ops-production.up.railway.app/api/mesh/fleet');
  });

  it('sends PI_CEO_API_KEY as the literal X-Pi-CEO-Secret header value (server-side auth, never exposed to the browser)', async () => {
    const expectedSecret = 'pi-ceo-secret-for-read-fleet-test';
    process.env.PI_CEO_API_KEY = expectedSecret;
    const mock = captureFetch();
    mock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Partial<Response> as Response);

    const { readFleet } = await importReadFleet();
    await readFleet();

    const call = lastCall(mock);
    const headers = (call.init?.headers ?? {}) as Record<string, string>;
    expect(headers['X-Pi-CEO-Secret']).toBe(expectedSecret);
    // The secret must NOT be sent in the URL, body, or any other header.
    expect(call.url).not.toContain(expectedSecret);
  });

  it('fails closed without calling the Pi-CEO API when PI_CEO_API_KEY is missing', async () => {
    delete process.env.PI_CEO_API_KEY;
    const mock = captureFetch();

    const { readFleet } = await importReadFleet();
    const fleet = await readFleet();

    expect(fleet.ok).toBe(false);
    expect(fleet.error).toBe('pi-ceo api key not configured');
    expect(fleet.machines).toEqual([]);
    expect(fleet.agents).toEqual([]);
    expect(fleet.ships).toEqual([]);
    expect(fleet.claims).toEqual([]);
    expect(mock).not.toHaveBeenCalled();
  });

  it('uses cache: no-store on the outbound request so the read is always live (no stale-while-revalidate)', async () => {
    const mock = captureFetch();
    mock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Partial<Response> as Response);

    const { readFleet } = await importReadFleet();
    await readFleet();

    const call = lastCall(mock);
    expect(call.init?.cache).toBe('no-store');
  });

  it('always returns a fresh ISO fetchedAt timestamp even when the upstream body is empty (never returns undefined)', async () => {
    const mock = captureFetch();
    mock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Partial<Response> as Response);

    const before = new Date().toISOString();
    const { readFleet } = await importReadFleet();
    const fleet = await readFleet();
    const after = new Date().toISOString();

    expect(fleet.ok).toBe(true);
    expect(fleet.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // fetchedAt is the local read time, not the upstream time. Pin that it
    // sits between the before and after markers (a >=1ms wall clock range).
    expect(fleet.fetchedAt >= before).toBe(true);
    expect(fleet.fetchedAt <= after).toBe(true);
  });

  it('defaults missing machines/agents/ships/claims to empty arrays (never undefined) so the Mission Control card renders zero counts', async () => {
    const mock = captureFetch();
    mock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ machines: undefined }) } as Partial<Response> as Response);

    const { readFleet } = await importReadFleet();
    const fleet = await readFleet();

    expect(fleet.ok).toBe(true);
    expect(fleet.machines).toEqual([]);
    expect(fleet.agents).toEqual([]);
    expect(fleet.ships).toEqual([]);
    expect(fleet.claims).toEqual([]);
    expect(fleet.error).toBeUndefined();
  });
});
