// Pillar 3 (UNI-1947) — Linear adapter tests.

import { GET } from '../route';

const supabaseSingle = jest.fn();

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: supabaseSingle,
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

const realFetch = global.fetch;

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

beforeEach(() => {
  supabaseSingle.mockReset();
  process.env.LINEAR_API_KEY = 'lin_test_xxx';
});

afterEach(() => {
  global.fetch = realFetch;
});

describe('GET /api/empire/sources/linear/[slug]', () => {
  it('returns unknown when linear_team_id is NULL', async () => {
    supabaseSingle.mockResolvedValue({ data: { linear_team_id: null }, error: null });
    const res = await GET(new Request('http://x'), makeParams('synthex'));
    const body = await res.json();
    expect(body.source).toBe('linear');
    expect(body.status).toBe('unknown');
    expect(body.summary).toBe('Linear not configured');
    expect(body.last_update).toBeNull();
  });

  it('returns err when LINEAR_API_KEY is missing', async () => {
    delete process.env.LINEAR_API_KEY;
    supabaseSingle.mockResolvedValue({
      data: { linear_team_id: 'team-uuid' },
      error: null,
    });
    const res = await GET(new Request('http://x'), makeParams('synthex'));
    const body = await res.json();
    expect(body.status).toBe('err');
    expect(body.summary).toMatch(/LINEAR_API_KEY missing/);
  });

  it('returns ok with human-readable summary on success', async () => {
    supabaseSingle.mockResolvedValue({
      data: { linear_team_id: 'team-uuid' },
      error: null,
    });

    global.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              team: {
                id: 'team-uuid',
                key: 'SYN',
                name: 'Synthex',
                organization: { urlKey: 'unite-group' },
                activeIssues: { nodes: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }] },
                backlogIssues: { nodes: Array.from({ length: 12 }, (_, i) => ({ id: `b${i}` })) },
                doneIssues: { nodes: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }] },
              },
            },
          }),
          { status: 200 }
        )
    ) as unknown as typeof fetch;

    const res = await GET(new Request('http://x'), makeParams('synthex'));
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.summary).toBe('5 in progress · 12 backlog · 3 done this week');
    expect(body.url).toBe('https://linear.app/unite-group/team/SYN/active');
    expect(body.details).toMatchObject({
      in_progress: 5,
      backlog: 12,
      done_last_7d: 3,
    });
  });

  it('returns warn when in-progress > 10', async () => {
    supabaseSingle.mockResolvedValue({
      data: { linear_team_id: 'team-uuid' },
      error: null,
    });
    global.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              team: {
                id: 'team-uuid',
                key: 'UNI',
                name: 'Unite-Group',
                organization: { urlKey: 'unite-group' },
                activeIssues: { nodes: Array.from({ length: 15 }, (_, i) => ({ id: `a${i}` })) },
                backlogIssues: { nodes: [] },
                doneIssues: { nodes: [] },
              },
            },
          }),
          { status: 200 }
        )
    ) as unknown as typeof fetch;

    const res = await GET(new Request('http://x'), makeParams('ccw-crm'));
    const body = await res.json();
    expect(body.status).toBe('warn');
  });

  it('returns err on GraphQL-level error', async () => {
    supabaseSingle.mockResolvedValue({
      data: { linear_team_id: 'team-uuid' },
      error: null,
    });
    global.fetch = jest.fn(
      async () =>
        new Response(
          JSON.stringify({ errors: [{ message: 'team not found' }] }),
          { status: 200 }
        )
    ) as unknown as typeof fetch;

    const res = await GET(new Request('http://x'), makeParams('synthex'));
    const body = await res.json();
    expect(body.status).toBe('err');
    expect(body.summary).toBe('Linear GraphQL error');
    expect(body.error).toContain('team not found');
  });

  it('returns err with helpful summary on network error', async () => {
    supabaseSingle.mockResolvedValue({
      data: { linear_team_id: 'team-uuid' },
      error: null,
    });
    global.fetch = jest.fn(async () => {
      throw new Error('ETIMEDOUT');
    }) as unknown as typeof fetch;

    const res = await GET(new Request('http://x'), makeParams('synthex'));
    const body = await res.json();
    expect(body.status).toBe('err');
    expect(body.summary).toBe('Linear unreachable');
    expect(body.error).toContain('ETIMEDOUT');
  });

  it('returns err on HTTP 4xx/5xx', async () => {
    supabaseSingle.mockResolvedValue({
      data: { linear_team_id: 'team-uuid' },
      error: null,
    });
    global.fetch = jest.fn(
      async () => new Response('forbidden', { status: 403 })
    ) as unknown as typeof fetch;

    const res = await GET(new Request('http://x'), makeParams('synthex'));
    const body = await res.json();
    expect(body.status).toBe('err');
    expect(body.summary).toContain('403');
  });
});
