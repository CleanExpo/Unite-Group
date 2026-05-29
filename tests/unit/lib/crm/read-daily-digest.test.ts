import { createClient } from '@supabase/supabase-js';

const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

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

function createDeferredReadBuilder(calls: QueryCall[]) {
  let resolveRead: (value: Required<QueryResult>) => void = () => undefined;
  const promise = new Promise<Required<QueryResult>>((resolve) => {
    resolveRead = resolve;
  });
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
    then: jest.fn((resolve: (value: Required<QueryResult>) => unknown, reject: (reason?: unknown) => unknown) =>
      promise.then(resolve, reject),
    ),
  };

  return {
    builder,
    resolve: (result: QueryResult = { data: [], error: null }) =>
      resolveRead({ data: result.data ?? null, error: result.error ?? null }),
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

import { readCrmDailyDigestForCommandCenter } from '@/lib/crm/read-daily-digest';

describe('readCrmDailyDigestForCommandCenter', () => {
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
    delete process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
    process.env = oldEnv;
  });

  it('degrades safely without constructing a service-role client when Supabase service config is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const digest = await readCrmDailyDigestForCommandCenter();

    expect(digest).toBeUndefined();
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('scopes task reads by workspace_id before status, order, and limit filters', async () => {
    const leadCalls: QueryCall[] = [];
    const taskCalls: QueryCall[] = [];
    const leadBuilder = createReadBuilder(leadCalls, {
      data: [
        {
          id: 'lead-1',
          first_name: 'Ada',
          last_name: 'Lovelace',
          company: 'Analytical Engines Pty Ltd',
          status: 'qualified',
          qualification_score: 91,
          captured_at: '2026-05-23T00:00:00.000Z',
        },
      ],
      error: null,
    });
    const taskBuilder = createReadBuilder(taskCalls, {
      data: [
        {
          id: 'task-1',
          title: 'Approve follow-up',
          status: 'blocked',
          priority: 'high',
          assignee_name: 'Phill',
          created_at: '2026-05-23T01:00:00.000Z',
        },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'crm_leads') return leadBuilder;
      if (table === 'tasks') return taskBuilder;
      throw new Error(`Unexpected table read: ${table}`);
    });

    const digest = await readCrmDailyDigestForCommandCenter();

    expect(digest?.summary).toMatchObject({
      leadCount: 1,
      qualifiedLeadCount: 1,
      blockedTaskCount: 1,
      approvalRequiredCount: 1,
    });
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'crm_leads');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'tasks');
    expect(leadCalls).toEqual([
      { method: 'select', columns: 'id,first_name,last_name,company,status,qualification_score,captured_at' },
      { method: 'eq', column: 'assigned_owner', value: 'Margot' },
      { method: 'order', column: 'captured_at', options: { ascending: false } },
      { method: 'limit', value: 10 },
    ]);
    expect(leadCalls.find((call) => call.method === 'select')?.columns).not.toContain('email');
    expect(taskCalls).toEqual([
      { method: 'select', columns: 'id,title,status,priority,assignee_name,created_at' },
      { method: 'eq', column: 'workspace_id', value: 'workspace-crm' },
      { method: 'in', column: 'status', values: ['blocked', 'todo'] },
      { method: 'order', column: 'created_at', options: { ascending: false } },
      { method: 'limit', value: 10 },
    ]);
  });

  it('uses a minimized opportunities query shape when the opportunities digest flag is enabled', async () => {
    process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED = 'true';
    process.env.UNITE_CRM_DIGEST_OWNER = ' Phill ';
    const leadCalls: QueryCall[] = [];
    const taskCalls: QueryCall[] = [];
    const opportunityCalls: QueryCall[] = [];
    const leadBuilder = createReadBuilder(leadCalls, { data: [], error: null });
    const taskBuilder = createReadBuilder(taskCalls, { data: [], error: null });
    const opportunityBuilder = createReadBuilder(opportunityCalls, {
      data: [
        {
          id: 'opp-1',
          name: 'Expansion',
          stage: 'proposal',
          status: 'open',
          value_amount: '25000',
          probability: 75,
          approval_required: true,
          next_action: 'Approve discount',
          updated_at: '2026-05-23T02:00:00.000Z',
        },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'crm_leads') return leadBuilder;
      if (table === 'tasks') return taskBuilder;
      if (table === 'crm_opportunities') return opportunityBuilder;
      throw new Error(`Unexpected table read: ${table}`);
    });

    const digest = await readCrmDailyDigestForCommandCenter(5);

    expect(digest?.summary).toMatchObject({
      opportunityCount: 1,
      approvalRequiredCount: 1,
    });
    expect(leadCalls).toEqual([
      { method: 'select', columns: 'id,first_name,last_name,company,status,qualification_score,captured_at' },
      { method: 'eq', column: 'assigned_owner', value: 'Phill' },
      { method: 'order', column: 'captured_at', options: { ascending: false } },
      { method: 'limit', value: 5 },
    ]);
    expect(mockFrom).toHaveBeenNthCalledWith(3, 'crm_opportunities');
    expect(opportunityCalls).toEqual([
      { method: 'select', columns: 'id,name,stage,status,value_amount,probability,approval_required,next_action,updated_at' },
      { method: 'eq', column: 'owner', value: 'Phill' },
      { method: 'in', column: 'status', values: ['open', 'won', 'blocked_review'] },
      { method: 'order', column: 'updated_at', options: { ascending: false } },
      { method: 'limit', value: 5 },
    ]);
  });

  it('launches enabled lead, task, and opportunity reads before the first read promise resolves', async () => {
    process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED = 'true';
    const leadCalls: QueryCall[] = [];
    const taskCalls: QueryCall[] = [];
    const opportunityCalls: QueryCall[] = [];
    const leadRead = createDeferredReadBuilder(leadCalls);
    const taskRead = createDeferredReadBuilder(taskCalls);
    const opportunityRead = createDeferredReadBuilder(opportunityCalls);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'crm_leads') return leadRead.builder;
      if (table === 'tasks') return taskRead.builder;
      if (table === 'crm_opportunities') return opportunityRead.builder;
      throw new Error(`Unexpected table read: ${table}`);
    });

    const digestPromise = readCrmDailyDigestForCommandCenter(3);
    await flushMicrotasks();

    expect(mockFrom).toHaveBeenCalledWith('crm_leads');
    expect(mockFrom).toHaveBeenCalledWith('tasks');
    expect(mockFrom).toHaveBeenCalledWith('crm_opportunities');
    expect(leadRead.builder.then).toHaveBeenCalledTimes(1);
    expect(taskRead.builder.then).toHaveBeenCalledTimes(1);
    expect(opportunityRead.builder.then).toHaveBeenCalledTimes(1);

    leadRead.resolve();
    taskRead.resolve();
    opportunityRead.resolve();

    await expect(digestPromise).resolves.toMatchObject({
      summary: { leadCount: 0, opportunityCount: 0, blockedTaskCount: 0 },
    });
  });
});
