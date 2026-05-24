import { NextRequest } from 'next/server';

const mockFrom = jest.fn();
const mockServerSupabaseUser = jest.fn(async () => ({ data: { user: null } }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: mockServerSupabaseUser,
    },
  })),
}));

import { POST, PATCH } from '@/app/api/crm/opportunities/route';
import { createClient } from '@supabase/supabase-js';

type InsertCall = { table: string; row: Record<string, unknown> };
type UpdateCall = { table: string; row: Record<string, unknown>; eq?: { column: string; value: unknown } };
type SelectCall = { table: string; columns?: string };
type QueryCall =
  | { table: string; method: 'select'; columns?: string }
  | { table: string; method: 'eq'; column: string; value: unknown }
  | { table: string; method: 'limit'; count: number }
  | { table: string; method: 'maybeSingle' };
type SupabaseQueryMock = {
  eq: jest.Mock;
  limit: jest.Mock;
  maybeSingle: jest.Mock;
};

const leadId = '11111111-1111-4111-8111-111111111111';
const contactId = '22222222-2222-4222-8222-222222222222';
const clientId = '33333333-3333-4333-8333-333333333333';
const businessId = '44444444-4444-4444-8444-444444444444';

const OPPORTUNITY_SELECT_COLUMNS = 'id,name,stage,status,value_amount,value_currency,probability,expected_close_at,next_action_due_at,next_action,decision_needed,risk,source,owner,campaign_source,campaign_medium,campaign_name,source_detail,lost_reason,linked_lead_id,linked_contact_id,linked_client_id,linked_business_id,approval_required,approval_status,additional_data,created_at,updated_at';
const OPPORTUNITY_PATCH_SELECT_COLUMNS = 'id,name,stage,status,value_amount,value_currency,probability,expected_close_at,next_action_due_at,next_action,decision_needed,risk,owner,lost_reason,approval_required,approval_status,updated_at';

function request(body: unknown, rawBody?: string): NextRequest {
  return new NextRequest('https://unite-group.in/api/crm/opportunities', {
    method: 'POST',
    headers: {
      authorization: 'Bearer service-role-test',
      'content-type': 'application/json',
    },
    body: rawBody ?? JSON.stringify(body),
  });
}

function patchRequest(body: unknown, rawBody?: string): NextRequest {
  return new NextRequest('https://unite-group.in/api/crm/opportunities', {
    method: 'PATCH',
    headers: {
      authorization: 'Bearer service-role-test',
      'content-type': 'application/json',
    },
    body: rawBody ?? JSON.stringify(body),
  });
}

function unauthenticatedRequest(body: unknown): NextRequest {
  return new NextRequest('https://unite-group.in/api/crm/opportunities', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function mockOpportunityInsert(
  calls: InsertCall[] = [],
  selectCalls: SelectCall[] = [],
  result: { data?: Record<string, unknown> | null; error?: Error | null } = {},
  options: {
    timelineError?: Error | null;
    throwTimelineInsert?: boolean;
    throwPrimaryInsert?: Error;
    existingOpportunity?: Record<string, unknown> | null;
    lookupError?: Error | null;
    queryCalls?: QueryCall[];
  } = {},
) {
  mockFrom.mockImplementation((table: string) => ({
    select: jest.fn((columns?: string) => {
      selectCalls.push({ table, columns });
      options.queryCalls?.push({ table, method: 'select', columns });
      let query: SupabaseQueryMock;
      query = {
        eq: jest.fn((column: string, value: unknown) => {
          options.queryCalls?.push({ table, method: 'eq', column, value });
          return query;
        }),
        limit: jest.fn((count: number) => {
          options.queryCalls?.push({ table, method: 'limit', count });
          return query;
        }),
        maybeSingle: jest.fn(async () => {
          options.queryCalls?.push({ table, method: 'maybeSingle' });
          return {
            data: options.existingOpportunity ?? null,
            error: options.lookupError ?? null,
          };
        }),
      };
      return query;
    }),
    insert: jest.fn((row: Record<string, unknown>) => {
      calls.push({ table, row });
      return {
        select: jest.fn((columns?: string) => {
          selectCalls.push({ table, columns });
          return {
            single: jest.fn(async () => {
              if (table === 'crm_opportunities' && options.throwPrimaryInsert) {
                throw options.throwPrimaryInsert;
              }

              if (table === 'agent_actions' && options.throwTimelineInsert) {
                throw new Error('timeline insert exploded');
              }

              if (table === 'agent_actions') {
                return {
                  data: result.data === undefined ? { id: 'timeline-1', ...row } : result.data,
                  error: options.timelineError ?? null,
                };
              }

              return {
                data: result.data === undefined ? { id: 'opportunity-1', ...row } : result.data,
                error: result.error ?? null,
              };
            }),
          };
        }),
      };
    }),
  }));
}

function mockOpportunityUpdate(
  updateCalls: UpdateCall[] = [],
  insertCalls: InsertCall[] = [],
  selectCalls: SelectCall[] = [],
  result: { data?: Record<string, unknown> | null; error?: Error | null } = {},
  options: {
    timelineError?: Error | null;
    throwTimelineInsert?: boolean;
    throwPrimaryUpdate?: Error;
  } = {},
) {
  mockFrom.mockImplementation((table: string) => ({
    update: jest.fn((row: Record<string, unknown>) => {
      const updateCall: UpdateCall = { table, row };
      updateCalls.push(updateCall);
      return {
        eq: jest.fn((column: string, value: unknown) => {
          updateCall.eq = { column, value };
          return {
            select: jest.fn((columns?: string) => {
              selectCalls.push({ table, columns });
              return {
                single: jest.fn(async () => {
                  if (options.throwPrimaryUpdate) {
                    throw options.throwPrimaryUpdate;
                  }

                  return {
                    data: result.data === undefined ? { id: 'opportunity-1', name: 'Margot CRM Buildout', ...row } : result.data,
                    error: result.error ?? null,
                  };
                }),
              };
            }),
          };
        }),
      };
    }),
    insert: jest.fn((row: Record<string, unknown>) => {
      insertCalls.push({ table, row });
      return {
        select: jest.fn((columns?: string) => {
          selectCalls.push({ table, columns });
          return {
            single: jest.fn(async () => {
              if (options.throwTimelineInsert) {
                throw new Error('timeline insert exploded');
              }

              return {
                data: { id: 'timeline-1', ...row },
                error: options.timelineError ?? null,
              };
            }),
          };
        }),
      };
    }),
  }));
}

function expectGenericTimelineLogOnly(spy: jest.SpyInstance, message: string) {
  expect(spy).toHaveBeenCalledWith(message);
  for (const call of spy.mock.calls) {
    expect(call).toEqual([expect.any(String)]);
    expect(call[0]).not.toContain('timeline insert exploded');
    expect(call[0]).not.toContain('returned timeline failure');
  }
}

describe('POST /api/crm/opportunities', () => {
  const oldEnv = process.env;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockServerSupabaseUser.mockResolvedValue({ data: { user: null } });
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

  it('creates an open opportunity for an admin caller with safe snake_case payload, defaults, links, and no boardApprovalId stored', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    mockOpportunityInsert(calls, selectCalls);

    const res = await POST(request({
      name: '  Margot CRM Buildout  ',
      valueAmount: 12000.5,
      probability: 40,
      expectedCloseAt: '2026-06-30T10:00:00.000Z',
      nextActionDueAt: '2026-05-24T09:00:00.000Z',
      nextAction: ' Send proposal ',
      decisionNeeded: ' Choose package ',
      risk: ' Procurement delay ',
      campaignSource: ' Newsletter ',
      campaignMedium: ' Email ',
      campaignName: ' Autumn CRM ',
      sourceDetail: ' Warm inbound ',
      linkedLeadId: leadId,
      linkedContactId: contactId,
      linkedClientId: clientId,
      linkedBusinessId: businessId,
      additionalData: { priority: 'high' },
      boardApprovalId: 'BOARD-SHOULD-NOT-BE-STORED',
    }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      success: true,
      opportunity: expect.objectContaining({
        id: 'opportunity-1',
        name: 'Margot CRM Buildout',
        stage: 'new_signal',
        status: 'open',
      }),
    });
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-test',
      { auth: { persistSession: false } },
    );
    expect(mockFrom).toHaveBeenCalledWith('crm_opportunities');
    expect(calls[0]).toEqual(
      {
        table: 'crm_opportunities',
        row: {
          name: 'Margot CRM Buildout',
          stage: 'new_signal',
          status: 'open',
          value_amount: 12000.5,
          value_currency: 'AUD',
          probability: 40,
          expected_close_at: '2026-06-30T10:00:00.000Z',
          next_action_due_at: '2026-05-24T09:00:00.000Z',
          next_action: 'Send proposal',
          decision_needed: 'Choose package',
          risk: 'Procurement delay',
          source: 'manual',
          owner: 'Margot',
          campaign_source: 'Newsletter',
          campaign_medium: 'Email',
          campaign_name: 'Autumn CRM',
          source_detail: 'Warm inbound',
          lost_reason: null,
          linked_lead_id: leadId,
          linked_contact_id: contactId,
          linked_client_id: clientId,
          linked_business_id: businessId,
          approval_required: false,
          approval_status: 'not_required',
          additional_data: { priority: 'high' },
        },
      },
    );
    expect(calls[1]).toEqual({
      table: 'agent_actions',
      row: expect.objectContaining({
        source: 'margot',
        action_type: 'crm_timeline_opportunity_created',
        status: 'done',
        client_id: null,
        business_id: null,
        linear_ticket_id: null,
        parent_id: null,
        payload: expect.objectContaining({
          type: 'opportunity_created',
          category: 'opportunity',
          actionClass: 'auto',
          subjectId: 'opportunity-1',
          subjectLabel: 'Margot CRM Buildout',
          source: 'crm_opportunities_route',
          metadata: {
            stage: 'new_signal',
            status: 'open',
            valueCurrency: 'AUD',
            hasValueAmount: true,
            linkedLead: true,
            linkedContact: true,
            linkedClient: true,
            linkedBusiness: true,
          },
        }),
      }),
    });
    expect(calls[0].row).not.toHaveProperty('boardApprovalId');
    expect(calls[0].row).not.toHaveProperty('board_approval_id');
    expect(selectCalls).toEqual([
      { table: 'crm_opportunities', columns: 'id' },
      { table: 'crm_opportunities', columns: OPPORTUNITY_SELECT_COLUMNS },
      { table: 'agent_actions', columns: 'id' },
    ]);
    expect(selectCalls[0].columns).not.toBe('*');
    expect(selectCalls[1].columns).not.toBe('*');
  });

  it('still returns 201 when opportunity timeline insert throws after primary opportunity insert succeeds', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    mockOpportunityInsert(calls, selectCalls, {}, { throwTimelineInsert: true });

    const res = await POST(request({ name: 'Margot CRM Buildout' }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      success: true,
      opportunity: expect.objectContaining({
        id: 'opportunity-1',
        name: 'Margot CRM Buildout',
      }),
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].table).toBe('crm_opportunities');
    expect(calls[1].table).toBe('agent_actions');
    expect(selectCalls[0]).toEqual({ table: 'crm_opportunities', columns: OPPORTUNITY_SELECT_COLUMNS });
    expectGenericTimelineLogOnly(consoleErrorSpy, 'Error recording CRM opportunity timeline event');
  });

  it('still returns 201 and logs generically when opportunity timeline insert returns an error after primary opportunity insert succeeds', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    mockOpportunityInsert(calls, selectCalls, {}, { timelineError: new Error('returned timeline failure') });

    const res = await POST(request({ name: 'Margot CRM Buildout' }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      success: true,
      opportunity: expect.objectContaining({
        id: 'opportunity-1',
        name: 'Margot CRM Buildout',
      }),
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].table).toBe('crm_opportunities');
    expect(calls[1].table).toBe('agent_actions');
    expect(selectCalls[0]).toEqual({ table: 'crm_opportunities', columns: OPPORTUNITY_SELECT_COLUMNS });
    expectGenericTimelineLogOnly(consoleErrorSpy, 'Error recording CRM opportunity timeline event');
  });

  it('stores an explicit safe valueCurrency when valueAmount is provided', async () => {
    const calls: InsertCall[] = [];
    mockOpportunityInsert(calls);

    const res = await POST(request({
      name: 'Margot CRM Buildout',
      valueAmount: 12000.5,
      valueCurrency: 'USD',
    }));

    expect(res.status).toBe(201);
    expect(calls[0].row).toEqual(expect.objectContaining({
      value_amount: 12000.5,
      value_currency: 'USD',
    }));
  });

  it('returns 401 or 403 before CRM Supabase access for non-admin callers', async () => {
    const res = await POST(unauthenticatedRequest({ name: 'Margot CRM Buildout' }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('returns 403 before CRM Supabase access for authenticated non-admin callers', async () => {
    mockServerSupabaseUser.mockResolvedValue({
      data: { user: { email: 'not-admin@example.com' } },
    } as any);

    const res = await POST(unauthenticatedRequest({ name: 'Margot CRM Buildout' }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('returns 503 crm_not_configured before Supabase access if env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await POST(request({ name: 'Margot CRM Buildout' }));

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'crm_not_configured' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_opportunity_payload for invalid JSON before Supabase access', async () => {
    const res = await POST(request({}, '{bad json'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_opportunity_payload' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_opportunity_payload for invalid value and probability before Supabase access', async () => {
    const res = await POST(request({
      name: 'Margot CRM Buildout',
      valueAmount: -1,
      probability: 101,
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_opportunity_payload' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_opportunity_payload for sensitive additionalData before Supabase access', async () => {
    const res = await POST(request({
      name: 'Margot CRM Buildout',
      additionalData: {
        safeNote: 'local CRM metadata',
        nested: { apiToken: 'should-not-be-accepted' },
      },
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_opportunity_payload' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_opportunity_payload for oversized additionalData before Supabase access', async () => {
    const res = await POST(request({
      name: 'Margot CRM Buildout',
      additionalData: { note: 'x'.repeat(4097) },
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_opportunity_payload' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 403 operator_approval_required and does not access Supabase when multiple entity links are supplied without Board approval', async () => {
    const res = await POST(request({
      name: 'Margot CRM Buildout',
      linkedLeadId: leadId,
      linkedClientId: clientId,
    }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'operator_approval_required' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 403 operator_approval_required and does not insert for won status without approval', async () => {
    const res = await POST(request({
      name: 'Margot CRM Buildout',
      status: 'won',
    }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'operator_approval_required' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 403 operator_approval_required and does not insert for conversion-like stage without approval', async () => {
    const res = await POST(request({
      name: 'Margot CRM Buildout',
      stage: 'won_converted',
      approvalRequired: true,
      approvalStatus: 'approved',
    }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'operator_approval_required' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 403 operator_approval_required when won approval has a too-short boardApprovalId', async () => {
    const res = await POST(request({
      name: 'Margot CRM Buildout',
      status: 'won',
      approvalRequired: true,
      approvalStatus: 'approved',
      boardApprovalId: '12345',
    }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'operator_approval_required' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('inserts an approved won/convert-like opportunity with approval flags and both timeline actions but no boardApprovalId', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    mockOpportunityInsert(calls, selectCalls);

    const res = await POST(request({
      name: 'Margot CRM Buildout',
      stage: 'won_pending_client_conversion',
      status: 'won',
      approvalRequired: true,
      approvalStatus: 'approved',
      boardApprovalId: 'BOARD-CRM-APPROVED',
    }));

    expect(res.status).toBe(201);
    expect(calls).toHaveLength(3);
    expect(calls[0].row).toEqual(expect.objectContaining({
      stage: 'won_pending_client_conversion',
      status: 'won',
      approval_required: true,
      approval_status: 'approved',
    }));
    expect(calls[0].row).not.toHaveProperty('boardApprovalId');
    expect(calls[0].row).not.toHaveProperty('board_approval_id');

    expect(calls[1]).toEqual({
      table: 'agent_actions',
      row: expect.objectContaining({
        action_type: 'crm_timeline_opportunity_created',
        payload: expect.objectContaining({
          type: 'opportunity_created',
          category: 'opportunity',
          subjectId: 'opportunity-1',
          subjectLabel: 'Margot CRM Buildout',
          metadata: expect.objectContaining({
            stage: 'won_pending_client_conversion',
            status: 'won',
          }),
        }),
      }),
    });
    expect(calls[2]).toEqual({
      table: 'agent_actions',
      row: expect.objectContaining({
        action_type: 'crm_timeline_approval_requested',
        payload: expect.objectContaining({
          type: 'approval_requested',
          category: 'approval',
          actionClass: 'approval_required',
          requiresApproval: true,
          subjectId: 'opportunity-1',
          subjectLabel: 'Margot CRM Buildout',
          metadata: expect.objectContaining({
            stage: 'won_pending_client_conversion',
            status: 'won',
          }),
        }),
      }),
    });
    expect(calls[1].row.payload).not.toHaveProperty('boardApprovalId');
    expect(calls[2].row.payload).not.toHaveProperty('boardApprovalId');
    expect(selectCalls).toEqual([
      { table: 'crm_opportunities', columns: OPPORTUNITY_SELECT_COLUMNS },
      { table: 'agent_actions', columns: 'id' },
      { table: 'agent_actions', columns: 'id' },
    ]);
  });

  it('returns 500 crm_opportunity_create_failed on Supabase insert error', async () => {
    mockOpportunityInsert([], [], { data: null, error: new Error('insert failed') });

    const res = await POST(request({ name: 'Margot CRM Buildout' }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_opportunity_create_failed' });
  });

  it('returns 409 crm_opportunity_conflict before insert when scoped duplicate lookup finds an existing opportunity', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    const queryCalls: QueryCall[] = [];
    mockOpportunityInsert(calls, selectCalls, {}, {
      existingOpportunity: { id: 'existing-opportunity-1' },
      queryCalls,
    });

    const res = await POST(request({
      name: 'Margot CRM Buildout',
      linkedLeadId: leadId,
    }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'crm_opportunity_conflict' });
    expect(calls).toHaveLength(0);
    expect(selectCalls).toEqual([{ table: 'crm_opportunities', columns: 'id' }]);
    expect(queryCalls).toEqual([
      { table: 'crm_opportunities', method: 'select', columns: 'id' },
      { table: 'crm_opportunities', method: 'eq', column: 'name', value: 'Margot CRM Buildout' },
      { table: 'crm_opportunities', method: 'eq', column: 'linked_lead_id', value: leadId },
      { table: 'crm_opportunities', method: 'limit', count: 1 },
      { table: 'crm_opportunities', method: 'maybeSingle' },
    ]);
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns 500 crm_opportunity_duplicate_check_failed when duplicate lookup errors before insert without raw error logging', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    const queryCalls: QueryCall[] = [];
    mockOpportunityInsert(calls, selectCalls, {}, {
      lookupError: new Error('raw opportunity duplicate lookup failure should not be logged'),
      queryCalls,
    });

    const res = await POST(request({
      name: '  Margot CRM Buildout  ',
      linkedLeadId: leadId,
    }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_opportunity_duplicate_check_failed' });
    expect(calls).toHaveLength(0);
    expect(selectCalls).toEqual([{ table: 'crm_opportunities', columns: 'id' }]);
    expect(queryCalls).toEqual([
      { table: 'crm_opportunities', method: 'select', columns: 'id' },
      { table: 'crm_opportunities', method: 'eq', column: 'name', value: 'Margot CRM Buildout' },
      { table: 'crm_opportunities', method: 'eq', column: 'linked_lead_id', value: leadId },
      { table: 'crm_opportunities', method: 'limit', count: 1 },
      { table: 'crm_opportunities', method: 'maybeSingle' },
    ]);
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking CRM opportunity duplicate');
    for (const call of consoleErrorSpy.mock.calls) {
      expect(call).toEqual([expect.any(String)]);
      expect(call[0]).not.toContain('raw opportunity duplicate lookup failure');
    }
  });

  it('returns 409 crm_opportunity_conflict on duplicate opportunity unique-constraint errors without timeline insert', async () => {
    const calls: InsertCall[] = [];
    const duplicateError = Object.assign(new Error('duplicate opportunity'), { code: '23505' });
    mockOpportunityInsert(calls, [], { data: null, error: duplicateError });

    const res = await POST(request({
      name: 'Margot CRM Buildout',
      linkedLeadId: leadId,
    }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'crm_opportunity_conflict' });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('crm_opportunities');
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns 409 crm_opportunity_conflict when Supabase throws a duplicate opportunity unique-constraint error without timeline insert or raw duplicate logging', async () => {
    const calls: InsertCall[] = [];
    const duplicateError = Object.assign(new Error('raw duplicate opportunity should not be logged'), { code: '23505' });
    mockOpportunityInsert(calls, [], {}, { throwPrimaryInsert: duplicateError });

    const res = await POST(request({
      name: 'Margot CRM Buildout',
      linkedLeadId: leadId,
    }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'crm_opportunity_conflict' });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('crm_opportunities');
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('updates an opportunity and writes a sanitized close timeline event only after the primary update succeeds', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    mockOpportunityUpdate(updateCalls, insertCalls, selectCalls, {
      data: {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Website CRM Retainer',
        stage: 'decision_needed',
        status: 'lost',
        lost_reason: 'Timing mismatch',
      },
      error: null,
    });

    const res = await PATCH(patchRequest({
      id: '55555555-5555-4555-8555-555555555555',
      status: 'lost',
      lostReason: ' Timing mismatch ',
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      opportunity: expect.objectContaining({
        id: '55555555-5555-4555-8555-555555555555',
        status: 'lost',
      }),
    });
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toEqual({
      table: 'crm_opportunities',
      row: expect.objectContaining({
        status: 'lost',
        lost_reason: 'Timing mismatch',
        updated_at: expect.any(String),
      }),
      eq: { column: 'id', value: '55555555-5555-4555-8555-555555555555' },
    });
    expect(selectCalls).toEqual([
      { table: 'crm_opportunities', columns: OPPORTUNITY_PATCH_SELECT_COLUMNS },
      { table: 'agent_actions', columns: 'id' },
    ]);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toEqual({
      table: 'agent_actions',
      row: expect.objectContaining({
        action_type: 'crm_timeline_opportunity_closed',
        status: 'pending',
        payload: expect.objectContaining({
          type: 'opportunity_closed',
          category: 'opportunity',
          actionClass: 'approval_required',
          requiresApproval: true,
          subjectId: '55555555-5555-4555-8555-555555555555',
          subjectLabel: 'Website CRM Retainer',
          metadata: expect.objectContaining({
            changedStatus: true,
            changedLostReason: true,
            status: 'lost',
          }),
        }),
      }),
    });
    expect(insertCalls[0].row.payload).not.toHaveProperty('boardApprovalId');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns 400 for unknown opportunity update fields before CRM Supabase access', async () => {
    const res = await PATCH(patchRequest({
      id: '55555555-5555-4555-8555-555555555555',
      linkedClientId: clientId,
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_opportunity_update_payload' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 for client-supplied opportunity update name before CRM Supabase access', async () => {
    const res = await PATCH(patchRequest({
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Client supplied rename',
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_opportunity_update_payload' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 for approval-only opportunity updates before CRM Supabase access', async () => {
    const res = await PATCH(patchRequest({
      id: '55555555-5555-4555-8555-555555555555',
      approvalRequired: true,
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_opportunity_update_payload' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does not write an opportunity update timeline event when the primary update fails', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    mockOpportunityUpdate(updateCalls, insertCalls, [], {
      data: null,
      error: new Error('raw primary update failure should not be logged'),
    });

    const res = await PATCH(patchRequest({
      id: '55555555-5555-4555-8555-555555555555',
      stage: 'proposal_sent',
    }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_opportunity_update_failed' });
    expect(updateCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating CRM opportunity');
    for (const call of consoleErrorSpy.mock.calls) {
      expect(call).toEqual([expect.any(String)]);
      expect(call[0]).not.toContain('raw primary update failure');
    }
  });

  it('still returns 200 and logs generically when opportunity update timeline insert fails after primary success', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    mockOpportunityUpdate(updateCalls, insertCalls, [], {}, { throwTimelineInsert: true });

    const res = await PATCH(patchRequest({
      id: '55555555-5555-4555-8555-555555555555',
      stage: 'proposal_sent',
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      opportunity: expect.objectContaining({
        id: 'opportunity-1',
        stage: 'proposal_sent',
      }),
    });
    expect(updateCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    expectGenericTimelineLogOnly(consoleErrorSpy, 'Error recording CRM opportunity timeline event');
  });

  it('rejects won opportunity updates without explicit Board approval before CRM Supabase access', async () => {
    const res = await PATCH(patchRequest({
      id: '55555555-5555-4555-8555-555555555555',
      status: 'won',
    }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'operator_approval_required' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('allows approved won opportunity updates without persisting or emitting the Board approval id', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    mockOpportunityUpdate(updateCalls, insertCalls, [], {
      data: {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Approved CRM Retainer',
        stage: 'won_pending_client_conversion',
        status: 'won',
        approval_required: true,
        approval_status: 'approved',
      },
      error: null,
    });

    const res = await PATCH(patchRequest({
      id: '55555555-5555-4555-8555-555555555555',
      stage: 'won_pending_client_conversion',
      status: 'won',
      approvalRequired: true,
      approvalStatus: 'approved',
      boardApprovalId: 'BOARD-CRM-APPROVED',
    }));

    expect(res.status).toBe(200);
    expect(updateCalls[0].row).toEqual(expect.objectContaining({
      stage: 'won_pending_client_conversion',
      status: 'won',
      approval_required: true,
      approval_status: 'approved',
    }));
    expect(updateCalls[0].row).not.toHaveProperty('boardApprovalId');
    expect(updateCalls[0].row).not.toHaveProperty('board_approval_id');
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].row).toEqual(expect.objectContaining({
      action_type: 'crm_timeline_opportunity_closed',
      status: 'pending',
    }));
    const serializedTimeline = JSON.stringify(insertCalls[0].row);
    expect(serializedTimeline).not.toContain('BOARD-CRM-APPROVED');
    expect(serializedTimeline).not.toContain('boardApprovalId');
    expect(serializedTimeline).not.toContain('board_approval_id');
  });

  it('redacts all selected free-text opportunity update response columns and keeps timeline metadata value-minimized', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    const sensitiveNextAction = 'passport number X1234567 needs renewal';
    const sensitiveDecision = 'TFN needs verification before Medicare card follow-up';
    const sensitiveRisk = 'IBAN/account number collection blocked';
    const sensitiveLostReason = 'DOB 1990-01-02 and birth date mismatch';
    const sensitiveOwner = 'owner stripe sk_live_1234567890abcdef';
    mockOpportunityUpdate(updateCalls, insertCalls, [], {
      data: {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'password hunter2 for client@example.com',
        stage: 'proposal_sent',
        status: 'open',
        next_action: sensitiveNextAction,
        decision_needed: sensitiveDecision,
        risk: sensitiveRisk,
        lost_reason: sensitiveLostReason,
        owner: sensitiveOwner,
      },
      error: null,
    });

    const res = await PATCH(patchRequest({
      id: '55555555-5555-4555-8555-555555555555',
      status: 'open',
      nextAction: sensitiveNextAction,
      decisionNeeded: sensitiveDecision,
      risk: sensitiveRisk,
      lostReason: sensitiveLostReason,
      owner: sensitiveOwner,
      valueAmount: 12345,
    }));

    expect(res.status).toBe(200);
    const responseJson = await res.json();
    expect(responseJson).toEqual({
      success: true,
      opportunity: expect.objectContaining({
        id: '55555555-5555-4555-8555-555555555555',
        name: 'opportunity 55555555-5555-4555-8555-555555555555',
        next_action: '[REDACTED]',
        decision_needed: '[REDACTED]',
        risk: '[REDACTED]',
        lost_reason: '[REDACTED]',
        owner: '[REDACTED]',
      }),
    });
    expect(updateCalls[0].row).toEqual(expect.objectContaining({
      next_action: sensitiveNextAction,
      decision_needed: sensitiveDecision,
      risk: sensitiveRisk,
      lost_reason: sensitiveLostReason,
      owner: sensitiveOwner,
    }));
    const serializedResponse = JSON.stringify(responseJson);
    expect(serializedResponse).not.toContain('passport number X1234567');
    expect(serializedResponse).not.toContain('TFN needs verification');
    expect(serializedResponse).not.toContain('Medicare card');
    expect(serializedResponse).not.toContain('IBAN/account number');
    expect(serializedResponse).not.toContain('DOB 1990-01-02');
    expect(serializedResponse).not.toContain('birth date');
    expect(serializedResponse).not.toContain('sk_live_1234567890abcdef');
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].row).toEqual(expect.objectContaining({
      action_type: 'crm_timeline_opportunity_reopened',
      payload: expect.objectContaining({
        subjectLabel: 'opportunity 55555555-5555-4555-8555-555555555555',
        metadata: {
          changedStatus: true,
          changedValue: true,
          changedNextAction: true,
          changedDecisionNeeded: true,
          changedRisk: true,
          changedOwner: true,
          changedLostReason: true,
          stage: 'proposal_sent',
          status: 'open',
        },
      }),
    }));
    const serializedTimeline = JSON.stringify(insertCalls[0].row);
    expect(serializedTimeline).not.toContain('password hunter2');
    expect(serializedTimeline).not.toContain('client@example.com');
    expect(serializedTimeline).not.toContain(sensitiveNextAction);
    expect(serializedTimeline).not.toContain(sensitiveDecision);
    expect(serializedTimeline).not.toContain(sensitiveRisk);
    expect(serializedTimeline).not.toContain(sensitiveLostReason);
    expect(serializedTimeline).not.toContain(sensitiveOwner);
    expect(serializedTimeline).not.toContain('12345');
  });
});
