import { NextRequest } from 'next/server';

const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

import { GET } from '@/app/api/crm/daily-digest/route';
import { createClient } from '@supabase/supabase-js';

type QueryCall =
  | { method: 'select'; columns: string }
  | { method: 'eq'; column: string; value: string }
  | { method: 'in'; column: string; values: string[] }
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

const taskRow = {
  id: 'task-approval-1',
  title: 'Approve Margot escalation for qualified lead follow-up',
  status: 'blocked',
  priority: 'high',
  assignee_name: 'Phill approval',
  created_at: '2026-05-23T01:00:00.000Z',
};

const opportunityRow = {
  id: 'opp-forecast-1',
  name: 'EOFY CRM follow-up package',
  stage: 'proposal_needed',
  status: 'open',
  value_amount: 18000,
  probability: 40,
  approval_required: true,
  next_action: 'Draft proposal for Phill approval',
  updated_at: '2026-05-23T02:00:00.000Z',
};

function request(query = ''): NextRequest {
  return new NextRequest(`https://unite-group.in/api/crm/daily-digest${query}`, {
    method: 'GET',
    headers: { authorization: 'Bearer service-role-test' },
  });
}

function createReadBuilder(calls: QueryCall[], result: QueryResult) {
  const builder: any = {
    select: jest.fn((columns: string) => {
      calls.push({ method: 'select', columns });
      return builder;
    }),
    eq: jest.fn((column: string, value: string) => {
      calls.push({ method: 'eq', column, value });
      return builder;
    }),
    in: jest.fn((column: string, values: string[]) => {
      calls.push({ method: 'in', column, values });
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

  return builder;
}

function mockLeadRead(calls: QueryCall[], result: QueryResult = { data: [leadRow], error: null }) {
  const builder = createReadBuilder(calls, result);

  mockFrom.mockReturnValue(builder);
  return builder;
}

function mockDigestReads({
  leadCalls,
  taskCalls,
  opportunityCalls,
  leadResult = { data: [leadRow], error: null },
  taskResult = { data: [], error: null },
  opportunityResult = { data: [], error: null },
}: {
  leadCalls: QueryCall[];
  taskCalls: QueryCall[];
  opportunityCalls?: QueryCall[];
  leadResult?: QueryResult;
  taskResult?: QueryResult;
  opportunityResult?: QueryResult;
}) {
  const leadBuilder = createReadBuilder(leadCalls, leadResult);
  const taskBuilder = createReadBuilder(taskCalls, taskResult);
  const opportunityBuilder = createReadBuilder(opportunityCalls ?? [], opportunityResult);

  mockFrom.mockImplementation((table: string) => {
    if (table === 'crm_leads') return leadBuilder;
    if (table === 'tasks') return taskBuilder;
    if (table === 'crm_opportunities') return opportunityBuilder;
    throw new Error(`Unexpected table read: ${table}`);
  });

  return { leadBuilder, taskBuilder, opportunityBuilder };
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
      UNITE_CRM_WORKSPACE_ID: 'workspace-crm',
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
    const taskCalls: QueryCall[] = [];
    mockDigestReads({ leadCalls: calls, taskCalls });

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

  it('includes blocked high Margot task rows in the digest after reading leads and tasks', async () => {
    const leadCalls: QueryCall[] = [];
    const taskCalls: QueryCall[] = [];
    mockDigestReads({
      leadCalls,
      taskCalls,
      taskResult: { data: [taskRow], error: null },
    });

    const res = await GET(request('?limit=5'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.digest.summary).toMatchObject({
      leadCount: 1,
      qualifiedLeadCount: 1,
      approvalRequiredCount: 1,
      blockedTaskCount: 1,
    });
    expect(body.digest.sections.operatorPriorities).toContain(
      'Task task-approval-1 (Approve Margot escalation for qualified lead follow-up): owner Phill approval, status blocked, priority high.',
    );
    expect(body.digest.sections.approvals).toContain(
      'Task task-approval-1 (Approve Margot escalation for qualified lead follow-up): blocked for Phill approval. Priority: high',
    );
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'crm_leads');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'tasks');
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(leadCalls).toEqual([
      {
        method: 'select',
        columns: 'id,first_name,last_name,email,company,status,qualification_score,captured_at',
      },
      { method: 'order', column: 'captured_at', options: { ascending: false } },
      { method: 'limit', value: 5 },
    ]);
    expect(taskCalls).toEqual([
      { method: 'select', columns: 'id,title,status,priority,assignee_name,created_at' },
      { method: 'eq', column: 'workspace_id', value: 'workspace-crm' },
      { method: 'in', column: 'status', values: ['blocked', 'todo'] },
      { method: 'order', column: 'created_at', options: { ascending: false } },
      { method: 'limit', value: 5 },
    ]);
  });

  it('includes opportunity rows in the digest only when the opportunity digest flag is enabled', async () => {
    process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED = 'true';
    const leadCalls: QueryCall[] = [];
    const taskCalls: QueryCall[] = [];
    const opportunityCalls: QueryCall[] = [];
    mockDigestReads({
      leadCalls,
      taskCalls,
      opportunityCalls,
      opportunityResult: { data: [opportunityRow], error: null },
    });

    const res = await GET(request('?limit=5'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.digest.summary).toMatchObject({
      leadCount: 1,
      qualifiedLeadCount: 1,
      opportunityCount: 1,
      approvalRequiredCount: 1,
    });
    expect(body.opportunityCount).toBe(1);
    expect(body.digest.sections.operatorPriorities).toContain(
      'Opportunity opp-forecast-1 (EOFY CRM follow-up package): stage proposal_needed, $18,000, 40%. Next: Draft proposal for Phill approval',
    );
    expect(body.digest.sections.approvals).toContain(
      'Opportunity opp-forecast-1 (EOFY CRM follow-up package): approval required before commercial commitment. Next: Draft proposal for Phill approval',
    );
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'crm_leads');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'tasks');
    expect(mockFrom).toHaveBeenNthCalledWith(3, 'crm_opportunities');
    expect(opportunityCalls).toEqual([
      {
        method: 'select',
        columns: 'id,name,stage,status,value_amount,probability,approval_required,next_action,updated_at',
      },
      { method: 'in', column: 'status', values: ['open', 'won', 'blocked_review'] },
      { method: 'order', column: 'updated_at', options: { ascending: false } },
      { method: 'limit', value: 5 },
    ]);
  });

  it('returns the lead digest and skips task reads when CRM workspace scope is missing', async () => {
    delete process.env.UNITE_CRM_WORKSPACE_ID;
    const leadCalls: QueryCall[] = [];
    const taskCalls: QueryCall[] = [];
    mockDigestReads({
      leadCalls,
      taskCalls,
      taskResult: { data: [taskRow], error: null },
    });

    const res = await GET(request('?limit=5'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      leadCount: 1,
      digest: {
        summary: {
          leadCount: 1,
          qualifiedLeadCount: 1,
          approvalRequiredCount: 0,
          blockedTaskCount: 0,
        },
      },
    });
    expect(body.digest.sections.operatorPriorities).toEqual([
      'Lead lead-1 (Ada Lovelace / Analytical Engines Pty Ltd): qualified score 91. Next: Review and decide next CRM action',
    ]);
    expect(body.digest.sections.approvals).not.toContain(
      'Task task-approval-1 (Approve Margot escalation for qualified lead follow-up): blocked for Phill approval. Priority: high',
    );
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('crm_leads');
    expect(taskCalls).toEqual([]);
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

  it('returns a safe read error when Supabase task query fails after leads succeed', async () => {
    const leadCalls: QueryCall[] = [];
    const taskCalls: QueryCall[] = [];
    mockDigestReads({
      leadCalls,
      taskCalls,
      taskResult: { data: null, error: new Error('task read failed') },
    });

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_digest_tasks_read_failed' });
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'crm_leads');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'tasks');
  });

  it('returns a safe read error when enabled opportunity reads fail after leads and tasks succeed', async () => {
    process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED = 'true';
    const leadCalls: QueryCall[] = [];
    const taskCalls: QueryCall[] = [];
    const opportunityCalls: QueryCall[] = [];
    mockDigestReads({
      leadCalls,
      taskCalls,
      opportunityCalls,
      opportunityResult: { data: null, error: new Error('opportunity read failed') },
    });

    const res = await GET(request());

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_digest_opportunities_read_failed' });
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'crm_leads');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'tasks');
    expect(mockFrom).toHaveBeenNthCalledWith(3, 'crm_opportunities');
  });
});
