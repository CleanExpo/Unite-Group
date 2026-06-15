import { NextRequest } from 'next/server';

const mockFrom = jest.fn();
const mockServerGetUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: mockServerGetUser,
    },
  })),
}));

import { PATCH, POST } from '@/app/api/crm/contacts/route';
import { createClient } from '@supabase/supabase-js';

type InsertCall = { table: string; row: Record<string, unknown> };
type UpdateCall = { table: string; row: Record<string, unknown> };
type SelectCall = { table: string; columns?: string };
type QueryCall =
  | { table: string; method: 'select'; columns?: string }
  | { table: string; method: 'update'; row: Record<string, unknown> }
  | { table: string; method: 'eq'; column: string; value: unknown }
  | { table: string; method: 'limit'; count: number }
  | { table: string; method: 'maybeSingle' }
  | { table: string; method: 'single' };
type SupabaseQueryMock = {
  eq: jest.Mock;
  limit: jest.Mock;
  maybeSingle: jest.Mock;
};

const leadId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const businessId = '33333333-3333-4333-8333-333333333333';
const CONTACT_SELECT_COLUMNS = 'id,display_name,first_name,last_name,primary_email,primary_phone,role_title,company_name,linked_lead_id,linked_client_id,linked_business_id,source,source_detail,marketing_consent,relationship_owner,status,privacy_scope,dedupe_email_key,dedupe_domain_key,additional_data,created_at,updated_at';
const CONTACT_PATCH_SELECT_COLUMNS = 'id,display_name,role_title,primary_email,primary_phone,relationship_owner,source,updated_at';

function request(body: unknown, rawBody?: string): NextRequest {
  return new NextRequest('https://unite-group.in/api/crm/contacts', {
    method: 'POST',
    headers: {
      authorization: 'Bearer service-role-test',
      'content-type': 'application/json',
    },
    body: rawBody ?? JSON.stringify(body),
  });
}

function patchRequest(body: unknown, rawBody?: string): NextRequest {
  return new NextRequest('https://unite-group.in/api/crm/contacts', {
    method: 'PATCH',
    headers: {
      authorization: 'Bearer service-role-test',
      'content-type': 'application/json',
    },
    body: rawBody ?? JSON.stringify(body),
  });
}

function unauthenticatedPatchRequest(body: unknown, rawBody?: string): NextRequest {
  return new NextRequest('https://unite-group.in/api/crm/contacts', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
    body: rawBody ?? JSON.stringify(body),
  });
}

function mockContactInsert(
  calls: InsertCall[] = [],
  selectCalls: SelectCall[] = [],
  result: { data?: Record<string, unknown> | null; error?: Error | null } = {},
  options: {
    timelineError?: Error | null;
    throwTimelineInsert?: boolean;
    throwPrimaryInsert?: Error;
    existingContact?: Record<string, unknown> | null;
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
            data: options.existingContact ?? null,
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
              if (table === 'crm_contacts' && options.throwPrimaryInsert) {
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
                data: result.data === undefined ? { id: 'contact-1', ...row } : result.data,
                error: result.error ?? null,
              };
            }),
          };
        }),
      };
    }),
  }));
}

function mockContactUpdate(
  updateCalls: UpdateCall[] = [],
  insertCalls: InsertCall[] = [],
  selectCalls: SelectCall[] = [],
  result: { data?: Record<string, unknown> | null; error?: Error | null } = {},
  options: {
    timelineError?: Error | null;
    throwTimelineInsert?: boolean;
    throwPrimaryUpdate?: Error;
    queryCalls?: QueryCall[];
  } = {},
) {
  mockFrom.mockImplementation((table: string) => ({
    update: jest.fn((row: Record<string, unknown>) => {
      updateCalls.push({ table, row });
      options.queryCalls?.push({ table, method: 'update', row });
      let updateQuery: {
        eq: jest.Mock;
        select: jest.Mock;
      };
      updateQuery = {
        eq: jest.fn((column: string, value: unknown) => {
          options.queryCalls?.push({ table, method: 'eq', column, value });
          return updateQuery;
        }),
        select: jest.fn((columns?: string) => {
          selectCalls.push({ table, columns });
          options.queryCalls?.push({ table, method: 'select', columns });
          return {
            single: jest.fn(async () => {
              options.queryCalls?.push({ table, method: 'single' });
              if (options.throwPrimaryUpdate) throw options.throwPrimaryUpdate;

              return {
                data: result.data === undefined ? { id: '44444444-4444-4444-8444-444444444444', ...row } : result.data,
                error: result.error ?? null,
              };
            }),
          };
        }),
      };
      return updateQuery;
    }),
    insert: jest.fn((row: Record<string, unknown>) => {
      insertCalls.push({ table, row });
      return {
        select: jest.fn((columns?: string) => {
          selectCalls.push({ table, columns });
          return {
            single: jest.fn(async () => {
              if (options.throwTimelineInsert) throw new Error('timeline insert exploded');

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

describe('POST /api/crm/contacts', () => {
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

  it('creates a lead-scoped contact for an admin caller with derived identity, dedupe keys, and safe defaults', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    mockContactInsert(calls, selectCalls);

    const res = await POST(request({
      firstName: ' Ada ',
      lastName: ' Lovelace ',
      primaryEmail: ' Ada@Example.COM ',
      primaryPhone: ' +61400000000 ',
      roleTitle: ' Founder ',
      companyName: ' Analytical Engines Pty Ltd ',
      linkedLeadId: leadId,
    }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      success: true,
      contact: expect.objectContaining({
        id: 'contact-1',
        display_name: 'Ada Lovelace',
        first_name: 'Ada',
        last_name: 'Lovelace',
        primary_email: 'Ada@Example.COM',
        dedupe_email_key: 'ada@example.com',
        dedupe_domain_key: 'example.com',
      }),
    });
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-test',
      { auth: { persistSession: false } },
    );
    expect(mockFrom).toHaveBeenCalledWith('crm_contacts');
    expect(mockFrom).toHaveBeenCalledWith('agent_actions');
    expect(calls[0]).toEqual({
      table: 'crm_contacts',
      row: expect.objectContaining({
        display_name: 'Ada Lovelace',
        first_name: 'Ada',
        last_name: 'Lovelace',
        primary_email: 'Ada@Example.COM',
        role_title: 'Founder',
        company_name: 'Analytical Engines Pty Ltd',
        linked_lead_id: leadId,
        linked_client_id: null,
        linked_business_id: null,
        source: 'manual',
        source_detail: null,
        marketing_consent: false,
        relationship_owner: 'Margot',
        status: 'lead_only',
        privacy_scope: 'lead_scoped',
        dedupe_email_key: 'ada@example.com',
        dedupe_domain_key: 'example.com',
        additional_data: {},
      }),
    });
    expect(calls[1]).toEqual({
      table: 'agent_actions',
      row: expect.objectContaining({
        source: 'margot',
        action_type: 'crm_timeline_contact_created',
        status: 'done',
        client_id: null,
        business_id: null,
        linear_ticket_id: null,
        parent_id: null,
        payload: expect.objectContaining({
          type: 'contact_created',
          category: 'contact',
          actionClass: 'auto',
          subjectId: 'contact-1',
          subjectLabel: 'Ada Lovelace',
          source: 'crm_contacts_route',
          metadata: {
            status: 'lead_only',
            privacyScope: 'lead_scoped',
            linkedLead: true,
            linkedClient: false,
            linkedBusiness: false,
          },
        }),
      }),
    });
    expect(calls[1].row.payload).not.toHaveProperty('boardApprovalId');
    expect(calls).toHaveLength(2);
    expect(selectCalls).toEqual([
      { table: 'crm_contacts', columns: 'id' },
      { table: 'crm_contacts', columns: CONTACT_SELECT_COLUMNS },
      { table: 'agent_actions', columns: 'id' },
    ]);
    expect(selectCalls[0].columns).not.toBe('*');
    expect(selectCalls[1].columns).not.toBe('*');
  });

  it('still returns 201 when contact timeline insert throws after primary contact insert succeeds', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    mockContactInsert(calls, selectCalls, {}, { throwTimelineInsert: true });

    const res = await POST(request({ displayName: 'Ada Lovelace' }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      success: true,
      contact: expect.objectContaining({
        id: 'contact-1',
        display_name: 'Ada Lovelace',
      }),
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].table).toBe('crm_contacts');
    expect(calls[1].table).toBe('agent_actions');
    expect(selectCalls[0]).toEqual({ table: 'crm_contacts', columns: CONTACT_SELECT_COLUMNS });
    expectGenericTimelineLogOnly(consoleErrorSpy, 'Error recording CRM contact timeline event');
  });

  it('still returns 201 and logs generically when contact timeline insert returns an error after primary contact insert succeeds', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    mockContactInsert(calls, selectCalls, {}, { timelineError: new Error('returned timeline failure') });

    const res = await POST(request({ displayName: 'Ada Lovelace' }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      success: true,
      contact: expect.objectContaining({
        id: 'contact-1',
        display_name: 'Ada Lovelace',
      }),
    });
    expect(calls).toHaveLength(2);
    expect(calls[0].table).toBe('crm_contacts');
    expect(calls[1].table).toBe('agent_actions');
    expect(selectCalls[0]).toEqual({ table: 'crm_contacts', columns: CONTACT_SELECT_COLUMNS });
    expectGenericTimelineLogOnly(consoleErrorSpy, 'Error recording CRM contact timeline event');
  });

  it('applies source and relationship owner defaults when explicit blank strings are supplied', async () => {
    const calls: InsertCall[] = [];
    mockContactInsert(calls);

    const res = await POST(request({
      displayName: 'Ada Lovelace',
      source: '   ',
      relationshipOwner: '',
    }));

    expect(res.status).toBe(201);
    expect(calls[0].row).toEqual(expect.objectContaining({
      source: 'manual',
      relationship_owner: 'Margot',
    }));
  });

  it('returns 400 contact_identity_required and does not insert when no identity fields are present', async () => {
    const res = await POST(request({ source: 'manual' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'contact_identity_required' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 403 operator_approval_required and does not access Supabase when client and business links are supplied without approval', async () => {
    const res = await POST(request({
      displayName: 'Ada Lovelace',
      linkedClientId: clientId,
      linkedBusinessId: businessId,
    }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'operator_approval_required' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('allows multiple links with board approval but does not store boardApprovalId in the insert payload', async () => {
    const calls: InsertCall[] = [];
    mockContactInsert(calls);

    const res = await POST(request({
      displayName: 'Ada Lovelace',
      linkedClientId: clientId,
      linkedBusinessId: businessId,
      boardApprovalId: 'BOARD-CRM-APPROVED',
    }));

    expect(res.status).toBe(201);
    expect(calls[0].row).toEqual(expect.objectContaining({
      linked_client_id: clientId,
      linked_business_id: businessId,
    }));
    expect(calls[0].row).not.toHaveProperty('boardApprovalId');
    expect(calls[0].row).not.toHaveProperty('board_approval_id');
  });

  it('returns 400 invalid_contact_payload and does not insert when multiple links have a too-short board approval id', async () => {
    const res = await POST(request({
      displayName: 'Ada Lovelace',
      linkedClientId: clientId,
      linkedBusinessId: businessId,
      boardApprovalId: '12345',
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_contact_payload' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 503 crm_not_configured before Supabase access if env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await POST(request({ displayName: 'Ada Lovelace' }));

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'crm_not_configured' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 500 crm_contact_create_failed on Supabase insert error', async () => {
    mockContactInsert([], [], { data: null, error: new Error('insert failed') });

    const res = await POST(request({ displayName: 'Ada Lovelace' }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_contact_create_failed' });
  });

  it('returns 409 crm_contact_conflict before insert when email duplicate lookup finds an existing contact', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    const queryCalls: QueryCall[] = [];
    mockContactInsert(calls, selectCalls, {}, {
      existingContact: { id: 'existing-contact-1' },
      queryCalls,
    });

    const res = await POST(request({
      displayName: 'Ada Lovelace',
      primaryEmail: 'ada@example.com',
    }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'crm_contact_conflict' });
    expect(calls).toHaveLength(0);
    expect(selectCalls).toEqual([{ table: 'crm_contacts', columns: 'id' }]);
    expect(queryCalls).toEqual([
      { table: 'crm_contacts', method: 'select', columns: 'id' },
      { table: 'crm_contacts', method: 'eq', column: 'dedupe_email_key', value: 'ada@example.com' },
      { table: 'crm_contacts', method: 'limit', count: 1 },
      { table: 'crm_contacts', method: 'maybeSingle' },
    ]);
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns 500 crm_contact_duplicate_check_failed when duplicate lookup errors before insert without raw error logging', async () => {
    const calls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    const queryCalls: QueryCall[] = [];
    mockContactInsert(calls, selectCalls, {}, {
      lookupError: new Error('raw duplicate lookup failure should not be logged'),
      queryCalls,
    });

    const res = await POST(request({
      displayName: 'Ada Lovelace',
      primaryEmail: 'ada@example.com',
    }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_contact_duplicate_check_failed' });
    expect(calls).toHaveLength(0);
    expect(selectCalls).toEqual([{ table: 'crm_contacts', columns: 'id' }]);
    expect(queryCalls).toEqual([
      { table: 'crm_contacts', method: 'select', columns: 'id' },
      { table: 'crm_contacts', method: 'eq', column: 'dedupe_email_key', value: 'ada@example.com' },
      { table: 'crm_contacts', method: 'limit', count: 1 },
      { table: 'crm_contacts', method: 'maybeSingle' },
    ]);
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking CRM contact duplicate');
    for (const call of consoleErrorSpy.mock.calls) {
      expect(call).toEqual([expect.any(String)]);
      expect(call[0]).not.toContain('raw duplicate lookup failure');
    }
  });

  it('returns 409 crm_contact_conflict on duplicate contact unique-constraint errors without timeline insert', async () => {
    const calls: InsertCall[] = [];
    const duplicateError = Object.assign(new Error('duplicate contact'), { code: '23505' });
    mockContactInsert(calls, [], { data: null, error: duplicateError });

    const res = await POST(request({
      displayName: 'Ada Lovelace',
      primaryEmail: 'ada@example.com',
    }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'crm_contact_conflict' });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('crm_contacts');
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns 409 crm_contact_conflict when Supabase throws a duplicate contact unique-constraint error without timeline insert or raw duplicate logging', async () => {
    const calls: InsertCall[] = [];
    const duplicateError = Object.assign(new Error('raw duplicate contact should not be logged'), { code: '23505' });
    mockContactInsert(calls, [], {}, { throwPrimaryInsert: duplicateError });

    const res = await POST(request({
      displayName: 'Ada Lovelace',
      primaryEmail: 'ada@example.com',
    }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'crm_contact_conflict' });
    expect(calls).toHaveLength(1);
    expect(calls[0].table).toBe('crm_contacts');
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_contact_payload for invalid JSON before Supabase access', async () => {
    const res = await POST(request({}, '{bad json'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_contact_payload' });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/crm/contacts', () => {
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

  it('updates the spec PATCH fields for an admin caller and writes exactly one sanitized contact_updated timeline action after the primary update', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    const selectCalls: SelectCall[] = [];
    const queryCalls: QueryCall[] = [];
    const contactId = '44444444-4444-4444-8444-444444444444';
    mockContactUpdate(updateCalls, insertCalls, selectCalls, {
      data: {
        id: contactId,
        display_name: 'Ada Byron',
        role_title: 'Chief Analyst',
        primary_email: 'ada@example.com',
        primary_phone: '+61400000000',
        relationship_owner: 'Margot',
        source: 'referral',
        updated_at: '2026-05-24T00:00:00.000Z',
      },
    }, { queryCalls });

    const res = await PATCH(patchRequest({
      id: contactId,
      displayName: ' Ada Byron ',
      roleTitle: ' Chief Analyst ',
      email: ' ada@example.com ',
      phone: ' +61400000000 ',
      relationshipOwner: ' Margot ',
      source: ' referral ',
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      contact: expect.objectContaining({
        id: contactId,
        display_name: 'Ada Byron',
        role_title: 'Chief Analyst',
        primary_email: 'ada@example.com',
        primary_phone: '+61400000000',
        relationship_owner: 'Margot',
        source: 'referral',
      }),
    });
    expect(updateCalls).toEqual([{
      table: 'crm_contacts',
      row: expect.objectContaining({
        display_name: 'Ada Byron',
        role_title: 'Chief Analyst',
        primary_email: 'ada@example.com',
        primary_phone: '+61400000000',
        relationship_owner: 'Margot',
        source: 'referral',
        updated_at: expect.any(String),
      }),
    }]);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toEqual({
      table: 'agent_actions',
      row: expect.objectContaining({
        source: 'margot',
        action_type: 'crm_timeline_contact_updated',
        status: 'done',
        payload: expect.objectContaining({
          type: 'contact_updated',
          category: 'contact',
          actionClass: 'auto',
          subjectId: contactId,
          subjectLabel: 'Ada Byron',
          source: 'crm_contacts_route',
          metadata: {
            changedDisplayName: true,
            changedRoleTitle: true,
            changedEmail: true,
            changedPhone: true,
            changedRelationshipOwner: true,
            changedSource: true,
          },
        }),
      }),
    });
    expect(insertCalls[0].row.payload).not.toHaveProperty('boardApprovalId');
    expect(insertCalls[0].row.payload).not.toHaveProperty('email');
    expect(insertCalls[0].row.payload).not.toHaveProperty('phone');
    expect(selectCalls).toEqual([
      { table: 'crm_contacts', columns: CONTACT_PATCH_SELECT_COLUMNS },
      { table: 'agent_actions', columns: 'id' },
    ]);
    expect(queryCalls).toEqual([
      { table: 'crm_contacts', method: 'update', row: expect.any(Object) },
      { table: 'crm_contacts', method: 'eq', column: 'id', value: contactId },
      { table: 'crm_contacts', method: 'select', columns: CONTACT_PATCH_SELECT_COLUMNS },
      { table: 'crm_contacts', method: 'single' },
    ]);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('refreshes contact dedupe keys when a PATCH updates the primary email', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    const contactId = '44444444-4444-4444-8444-444444444444';
    mockContactUpdate(updateCalls, insertCalls, [], {
      data: {
        id: contactId,
        display_name: 'Ada Byron',
        primary_email: 'ada@analytical.example',
        updated_at: '2026-05-24T00:00:00.000Z',
      },
    });

    const res = await PATCH(patchRequest({
      id: contactId,
      email: ' Ada@Analytical.Example ',
    }));

    expect(res.status).toBe(200);
    expect(updateCalls).toEqual([{
      table: 'crm_contacts',
      row: expect.objectContaining({
        primary_email: 'Ada@Analytical.Example',
        dedupe_email_key: 'ada@analytical.example',
        dedupe_domain_key: 'analytical.example',
        updated_at: expect.any(String),
      }),
    }]);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].row).toEqual(expect.objectContaining({
      action_type: 'crm_timeline_contact_updated',
      payload: expect.objectContaining({
        metadata: { changedEmail: true },
      }),
    }));
    expect(JSON.stringify(insertCalls[0].row)).not.toContain('Ada@Analytical.Example');
  });

  it('rejects out-of-scope PATCH fields mixed with valid spec fields before CRM Supabase access', async () => {
    const res = await PATCH(patchRequest({
      id: '44444444-4444-4444-8444-444444444444',
      displayName: 'Ada Byron',
      status: 'active',
      sourceDetail: 'legacy unsafe patch field',
      firstName: 'Ada',
      linkedClientId: clientId,
      linkedBusinessId: businessId,
      privacyScope: 'client_scoped',
      companyName: 'Analytical Engines',
      boardApprovalId: 'BOARD-CRM-APPROVED',
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_contact_update_payload' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('writes exactly one timeline action with an opaque label when the updated row has an id but blank display_name', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    const contactId = '44444444-4444-4444-8444-444444444444';
    mockContactUpdate(updateCalls, insertCalls, [], {
      data: {
        id: contactId,
        display_name: '   ',
        relationship_owner: 'Margot',
        updated_at: '2026-05-24T00:00:00.000Z',
      },
    });

    const res = await PATCH(patchRequest({
      id: contactId,
      relationshipOwner: 'Margot',
    }));

    expect(res.status).toBe(200);
    expect(updateCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].row).toEqual(expect.objectContaining({
      action_type: 'crm_timeline_contact_updated',
      idea_text: `Contact updated: contact ${contactId} via crm_contacts_route.`,
      payload: expect.objectContaining({
        subjectId: contactId,
        subjectLabel: `contact ${contactId}`,
        summary: `Contact updated: contact ${contactId} via crm_contacts_route.`,
        metadata: { changedRelationshipOwner: true },
      }),
    }));
  });

  it('uses an opaque contact label in timeline payloads when updated displayName is sensitive-looking', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    const contactId = '44444444-4444-4444-8444-444444444444';
    mockContactUpdate(updateCalls, insertCalls, [], {
      data: {
        id: contactId,
        display_name: 'ada@example.com bearer secret-token',
        status: 'active',
        updated_at: '2026-05-24T00:00:00.000Z',
      },
    });

    const res = await PATCH(patchRequest({
      id: contactId,
      displayName: 'ada@example.com bearer secret-token',
    }));

    expect(res.status).toBe(200);
    expect(updateCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].row).toEqual(expect.objectContaining({
      action_type: 'crm_timeline_contact_updated',
      idea_text: `Contact updated: contact ${contactId} via crm_contacts_route.`,
      payload: expect.objectContaining({
        subjectLabel: `contact ${contactId}`,
        summary: `Contact updated: contact ${contactId} via crm_contacts_route.`,
      }),
    }));
    expect(JSON.stringify(insertCalls[0].row)).not.toContain('ada@example.com');
    expect(JSON.stringify(insertCalls[0].row)).not.toContain('secret-token');
  });

  it('returns 401 from the admin gate before env, body parsing, or CRM Supabase access', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    mockServerGetUser.mockResolvedValue({ data: { user: null } });

    const res = await PATCH(unauthenticatedPatchRequest({}, '{bad json'));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 503 crm_not_configured before CRM Supabase access if env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await PATCH(patchRequest({
      id: '44444444-4444-4444-8444-444444444444',
      displayName: 'Ada Byron',
    }));

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'crm_not_configured' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_contact_update_payload for invalid JSON before CRM Supabase access', async () => {
    const res = await PATCH(patchRequest({}, '{bad json'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_contact_update_payload' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it.each([
    ['missing id', { displayName: 'Ada Byron' }],
    ['invalid id', { id: 'not-a-uuid', displayName: 'Ada Byron' }],
  ])('returns 400 invalid_contact_update_payload for %s before CRM Supabase access', async (_label, body) => {
    const res = await PATCH(patchRequest(body));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_contact_update_payload' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_contact_update_payload and does not access Supabase when mutable text fields are blank', async () => {
    const res = await PATCH(patchRequest({
      id: '44444444-4444-4444-8444-444444444444',
      displayName: '   ',
      relationshipOwner: '   ',
      roleTitle: '   ',
      email: '   ',
      phone: '   ',
      source: '   ',
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_contact_update_payload' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_contact_update_payload when blank displayName is mixed with another valid update field', async () => {
    const res = await PATCH(patchRequest({
      id: '44444444-4444-4444-8444-444444444444',
      displayName: '   ',
      source: 'manual',
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_contact_update_payload' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_contact_update_payload when no safe mutable update fields are supplied', async () => {
    const res = await PATCH(patchRequest({
      id: '44444444-4444-4444-8444-444444444444',
      boardApprovalId: 'BOARD-CRM-APPROVED',
    }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_contact_update_payload' });
    expect(createClient).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 500 crm_contact_update_failed and does not insert a timeline action when the primary update fails', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    mockContactUpdate(updateCalls, insertCalls, [], {
      data: null,
      error: new Error('update failed'),
    });

    const res = await PATCH(patchRequest({
      id: '44444444-4444-4444-8444-444444444444',
      displayName: 'Ada Byron',
    }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_contact_update_failed' });
    expect(updateCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(0);
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
  });

  it('returns 500 crm_contact_update_failed and does not insert a timeline action when the primary update throws', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    mockContactUpdate(updateCalls, insertCalls, [], {}, {
      throwPrimaryUpdate: new Error('update exploded'),
    });

    const res = await PATCH(patchRequest({
      id: '44444444-4444-4444-8444-444444444444',
      displayName: 'Ada Byron',
    }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_contact_update_failed' });
    expect(updateCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(0);
    expect(mockFrom).not.toHaveBeenCalledWith('agent_actions');
  });

  it('still returns 200 and logs generically when update timeline insert returns an error after primary update succeeds', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    mockContactUpdate(updateCalls, insertCalls, [], {}, {
      timelineError: new Error('returned timeline failure'),
    });

    const res = await PATCH(patchRequest({
      id: '44444444-4444-4444-8444-444444444444',
      displayName: 'Ada Byron',
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      contact: expect.objectContaining({
        id: '44444444-4444-4444-8444-444444444444',
        display_name: 'Ada Byron',
      }),
    });
    expect(updateCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    expectGenericTimelineLogOnly(consoleErrorSpy, 'Error recording CRM contact timeline event');
  });

  it('still returns 200 and logs generically when update timeline insert throws after primary update succeeds', async () => {
    const updateCalls: UpdateCall[] = [];
    const insertCalls: InsertCall[] = [];
    mockContactUpdate(updateCalls, insertCalls, [], {}, { throwTimelineInsert: true });

    const res = await PATCH(patchRequest({
      id: '44444444-4444-4444-8444-444444444444',
      displayName: 'Ada Byron',
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      contact: expect.objectContaining({
        id: '44444444-4444-4444-8444-444444444444',
        display_name: 'Ada Byron',
      }),
    });
    expect(updateCalls).toHaveLength(1);
    expect(insertCalls).toHaveLength(1);
    expectGenericTimelineLogOnly(consoleErrorSpy, 'Error recording CRM contact timeline event');
  });
});
