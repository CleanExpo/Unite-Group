const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

import { createClient } from '@supabase/supabase-js';
import { readDailyCrmDigest } from '@/lib/crm/read-daily-digest';

type QueryCall =
  | { method: 'select'; columns: string }
  | { method: 'order'; column: string; options: { ascending: boolean } }
  | { method: 'limit'; value: number };

function createReadBuilder(
  calls: QueryCall[],
  result: { data?: Array<Record<string, unknown>> | null; error?: Error | null },
) {
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
    then: jest.fn((resolve: (value: { data: Array<Record<string, unknown>> | null; error: Error | null }) => unknown) =>
      Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null })),
    ),
  };

  return builder;
}

describe('readDailyCrmDigest', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...oldEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    };
    delete process.env.UNITE_CRM_OPPORTUNITIES_DIGEST_ENABLED;
    delete process.env.UNITE_CRM_WORKSPACE_ID;
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = oldEnv;
  });

  it('degrades to undefined without Supabase URL and never creates a service-role client', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(readDailyCrmDigest()).resolves.toBeUndefined();

    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('degrades to undefined without service-role key and never creates a service-role client', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(readDailyCrmDigest()).resolves.toBeUndefined();

    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('maps successful lead reads into DailyCrmDigestPanelProps without selecting unused email PII', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T06:07:08.000Z'));
    const calls: QueryCall[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'crm_leads') throw new Error(`Unexpected table read: ${table}`);
      return createReadBuilder(calls, {
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
    });

    await expect(readDailyCrmDigest(5)).resolves.toMatchObject({
      generatedAt: '2026-05-23T06:07:08.000Z',
      sourceLiveAt: '2026-05-23T06:07:08.000Z',
      summary: { leadCount: 1, qualifiedLeadCount: 1, opportunityCount: 0 },
      operatorPriorities: [
        'Lead lead-1 (Ada Lovelace / Analytical Engines Pty Ltd): qualified score 91. Next: Review and decide next CRM action',
      ],
      approvals: ['No approval-required items supplied for this digest window.'],
      blockers: ['No blockers supplied for this digest window.'],
    });
    expect(calls).toEqual([
      { method: 'select', columns: 'id,first_name,last_name,company,status,qualification_score,captured_at' },
      { method: 'order', column: 'captured_at', options: { ascending: false } },
      { method: 'limit', value: 5 },
    ]);
  });
});
