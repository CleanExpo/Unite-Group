import { NextRequest } from 'next/server';

const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

import { GET } from '@/app/api/crm/leads/route';
import { createClient } from '@supabase/supabase-js';

type QueryCall =
  | { method: 'select'; columns: string }
  | { method: 'order'; column: string; options: { ascending: boolean } }
  | { method: 'limit'; value: number }
  | { method: 'eq'; column: string; value: string };

type QueryResult = {
  data?: Array<Record<string, unknown>> | null;
  error?: Error | null;
};

const leadRow = {
  id: 'lead-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone: '+61400000000',
  company: 'Analytical Engines Pty Ltd',
  job_title: 'Founder',
  message: 'I want to discuss CRM buildout.',
  interests: 'CRM, automation',
  referral_source: 'website',
  marketing_consent: true,
  email_list_id: 'list-1',
  source: 'website_form',
  status: 'new',
  qualification_score: null,
  assigned_owner: 'Margot',
  matched_client_id: null,
  matched_business_id: null,
  converted_client_id: null,
  captured_at: '2026-05-23T00:00:00.000Z',
  created_at: '2026-05-23T00:00:00.000Z',
  updated_at: '2026-05-23T00:00:00.000Z',
  converted_at: null,
};

function request(query = ''): NextRequest {
  return new NextRequest(`https://unite-group.in/api/crm/leads${query}`, {
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
    eq: jest.fn((column: string, value: string) => {
      calls.push({ method: 'eq', column, value });
      return builder;
    }),
    then: jest.fn((resolve: (value: Required<QueryResult>) => unknown) =>
      Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null })),
    ),
  };

  mockFrom.mockReturnValue(builder);
  return builder;
}

describe('GET /api/crm/leads', () => {
  const oldEnv = process.env;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...oldEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env = oldEnv;
  });

  it('returns recent CRM leads for an admin/service-role caller', async () => {
    const calls: QueryCall[] = [];
    mockLeadRead(calls);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      leads: [leadRow],
      count: 1,
      filters: { status: null, owner: null, source: null, limit: 25 },
    });
    expect(mockFrom).toHaveBeenCalledWith('crm_leads');
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-test',
      { auth: { persistSession: false } },
    );
    expect(calls).toEqual([
      { method: 'select', columns: expect.stringContaining('first_name') },
      { method: 'order', column: 'captured_at', options: { ascending: false } },
      { method: 'limit', value: 25 },
    ]);
  });

  it('returns a safe configuration error when Supabase URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await GET(request());

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'crm_not_configured' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns a safe read error when Supabase lead query fails', async () => {
    const calls: QueryCall[] = [];
    mockLeadRead(calls, { data: null, error: new Error('read failed') });

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_leads_read_failed' });
  });

  it('returns a safe validation error for invalid query parameters before Supabase access', async () => {
    const res = await GET(request('?status=bad&limit=999'));

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid_lead_query' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('applies status, owner, source, and limit filters', async () => {
    const calls: QueryCall[] = [];
    mockLeadRead(calls, { data: [], error: null });

    const res = await GET(request('?status=qualified&owner=Margot&source=website_form&limit=10'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      leads: [],
      count: 0,
      filters: { status: 'qualified', owner: 'Margot', source: 'website_form', limit: 10 },
    });
    expect(calls).toEqual([
      { method: 'select', columns: expect.stringContaining('assigned_owner') },
      { method: 'eq', column: 'status', value: 'qualified' },
      { method: 'eq', column: 'assigned_owner', value: 'Margot' },
      { method: 'eq', column: 'source', value: 'website_form' },
      { method: 'order', column: 'captured_at', options: { ascending: false } },
      { method: 'limit', value: 10 },
    ]);
  });
});
