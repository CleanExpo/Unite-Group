import { NextRequest } from 'next/server';

const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

import { GET } from '@/app/api/crm/daily-digest/route';
import { createClient } from '@supabase/supabase-js';

type QueryCall =
  | { method: 'select'; columns: string }
  | { method: 'order'; column: string; options: { ascending: boolean } }
  | { method: 'limit'; value: number };

type QueryResult = {
  data?: Array<Record<string, unknown>> | null;
  error?: Error | null;
};

const leadRow = {
  id: 'lead-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines Pty Ltd',
  status: 'qualified',
  qualification_score: 91,
  captured_at: '2026-05-23T00:00:00.000Z',
};

function request(query = ''): NextRequest {
  return new NextRequest(`https://unite-group.in/api/crm/daily-digest${query}`, {
    method: 'GET',
    headers: { authorization: 'Bearer service-role-test' },
  });
}

function mockLeadRead(calls: QueryCall[], result: QueryResult = { data: [leadRow], error: null }) {
  const builder: any = {
    select: jest.fn((columns: string) => {
      calls.push({ method: 'select', columns });
      return builder;
    }),
    order: jest.fn((column: string, options: { ascending: boolean }) => {
      calls.push({ method: 'order', column, options });
      return builder;
    }),
    limit: jest.fn((value: number) => {
      calls.push({ method: 'limit', value });
      return builder;
    }),
    then: jest.fn((resolve: (value: Required<QueryResult>) => unknown) =>
      Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null })),
    ),
  };

  mockFrom.mockReturnValue(builder);
  return builder;
}

describe('GET /api/crm/daily-digest', () => {
  const oldEnv = process.env;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T06:07:08.000Z'));
    process.env = {
      ...oldEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
    process.env = oldEnv;
  });

  it('returns a daily CRM digest from recent lead rows for an admin/service-role caller', async () => {
    const calls: QueryCall[] = [];
    mockLeadRead(calls);

    const res = await GET(request('?limit=5'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      leadCount: 1,
      filters: { limit: 5 },
      digest: {
        summary: { leadCount: 1, qualifiedLeadCount: 1 },
        sections: {
          operatorPriorities: [
            'Lead lead-1 (Ada Lovelace / Analytical Engines Pty Ltd): qualified score 91. Next: Review and decide next CRM action',
          ],
          verification: ['passed: GET /api/crm/daily-digest'],
        },
      },
    });
    expect(body.digest.markdown).toContain('Generated: 2026-05-23T06:07:08.000Z');
    expect(mockFrom).toHaveBeenCalledWith('crm_leads');
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-test',
      { auth: { persistSession: false } },
    );
    expect(calls).toEqual([
      {
        method: 'select',
        columns: 'id,first_name,last_name,email,company,status,qualification_score,captured_at',
      },
      { method: 'order', column: 'captured_at', options: { ascending: false } },
      { method: 'limit', value: 5 },
    ]);
  });

  it('returns a safe configuration error without Supabase access when Supabase URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await GET(request());

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'crm_not_configured' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns a safe configuration error without Supabase access when service role key is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await GET(request());

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'crm_not_configured' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns a safe validation error for invalid limit before Supabase access', async () => {
    const res = await GET(request('?limit=51'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_digest_query' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns a safe read error when Supabase lead query fails', async () => {
    const calls: QueryCall[] = [];
    mockLeadRead(calls, { data: null, error: new Error('read failed') });

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_digest_read_failed' });
  });
});
