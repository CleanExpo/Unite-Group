// Tests live under src/lib/auth/__tests__ so they're discovered by the
// existing roots config — the script itself sits in scripts/ which is
// outside the jest roots glob.
import { rotateVercel, rotateRailway } from '../../../../scripts/rotate-admin-jwt';

const fetchMock = jest.fn();
beforeAll(() => {
  (global as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
});

beforeEach(() => {
  fetchMock.mockReset();
  process.env.VERCEL_TOKEN = 'tok';
  process.env.VERCEL_PROJECT_ID = 'prj_abc';
  process.env.VERCEL_TEAM_ID = 'team_xyz';
});

afterEach(() => {
  delete process.env.VERCEL_TOKEN;
  delete process.env.VERCEL_PROJECT_ID;
  delete process.env.VERCEL_TEAM_ID;
  delete process.env.RAILWAY_TOKEN;
  delete process.env.RAILWAY_PROJECT_ID;
  delete process.env.RAILWAY_ENV_ID;
  delete process.env.RAILWAY_SERVICE_ID;
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('rotateVercel', () => {
  test('PATCHes existing production env entry', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          envs: [
            { id: 'env_1', key: 'PI_CEO_API_KEY', target: ['production'] },
            { id: 'env_2', key: 'OTHER', target: ['production'] },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await rotateVercel('jwt-value', false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const patchCall = fetchMock.mock.calls[1];
    expect(patchCall[0]).toContain('/v10/projects/prj_abc/env/env_1');
    expect(patchCall[1].method).toBe('PATCH');
    expect(JSON.parse(patchCall[1].body).value).toBe('jwt-value');
  });

  test('POSTs new env when no existing production entry', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          envs: [
            { id: 'env_prev', key: 'PI_CEO_API_KEY', target: ['preview'] },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await rotateVercel('jwt-value', false);
    const postCall = fetchMock.mock.calls[1];
    expect(postCall[0]).toContain('/v10/projects/prj_abc/env');
    expect(postCall[1].method).toBe('POST');
    const body = JSON.parse(postCall[1].body);
    expect(body.key).toBe('PI_CEO_API_KEY');
    expect(body.value).toBe('jwt-value');
    expect(body.target).toEqual(['production']);
  });

  test('dry-run does not mutate (only the list call fires)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        envs: [{ id: 'env_1', key: 'PI_CEO_API_KEY', target: ['production'] }],
      }),
    );
    await rotateVercel('jwt-value', true);
    expect(fetchMock).toHaveBeenCalledTimes(1); // list only, no PATCH
  });

  test('throws when VERCEL_TOKEN unset', async () => {
    delete process.env.VERCEL_TOKEN;
    await expect(rotateVercel('jwt', false)).rejects.toThrow(/VERCEL_TOKEN/);
  });

  test('throws on Vercel API error', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'forbidden' }, 403));
    await expect(rotateVercel('jwt', false)).rejects.toThrow(/HTTP 403/);
  });
});

describe('rotateRailway', () => {
  test('skipped when any Railway env var is missing', async () => {
    // VERCEL_* set but RAILWAY_* not — should no-op without calling fetch
    await rotateRailway('jwt', false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('runs variableUpsert when all four Railway env vars are set', async () => {
    process.env.RAILWAY_TOKEN = 'rt';
    process.env.RAILWAY_PROJECT_ID = 'rp';
    process.env.RAILWAY_ENV_ID = 're';
    process.env.RAILWAY_SERVICE_ID = 'rs';
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { variableUpsert: null } }));

    await rotateRailway('jwt-value', false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe('https://backboard.railway.com/graphql/v2');
    const body = JSON.parse(call[1].body);
    expect(body.query).toContain('variableUpsert');
    expect(body.variables.input.name).toBe('PI_CEO_API_KEY');
    expect(body.variables.input.value).toBe('jwt-value');
  });

  test('dry-run does not call Railway API', async () => {
    process.env.RAILWAY_TOKEN = 'rt';
    process.env.RAILWAY_PROJECT_ID = 'rp';
    process.env.RAILWAY_ENV_ID = 're';
    process.env.RAILWAY_SERVICE_ID = 'rs';
    await rotateRailway('jwt-value', true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
