import { NextRequest } from 'next/server';

const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

import { POST } from '@/app/api/crm/contacts/route';
import { createClient } from '@supabase/supabase-js';

type InsertCall = { table: string; row: Record<string, unknown> };

const leadId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const businessId = '33333333-3333-4333-8333-333333333333';

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

function mockContactInsert(
  calls: InsertCall[] = [],
  result: { data?: Record<string, unknown> | null; error?: Error | null } = {},
) {
  mockFrom.mockImplementation((table: string) => ({
    insert: jest.fn((row: Record<string, unknown>) => {
      calls.push({ table, row });
      return {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: result.data === undefined ? { id: 'contact-1', ...row } : result.data,
            error: result.error ?? null,
          }),
        }),
      };
    }),
  }));
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
    mockContactInsert(calls);

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
    expect(calls).toEqual([
      {
        table: 'crm_contacts',
        row: {
          display_name: 'Ada Lovelace',
          first_name: 'Ada',
          last_name: 'Lovelace',
          primary_email: 'Ada@Example.COM',
          primary_phone: '+61400000000',
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
        },
      },
    ]);
  });

  it('returns 400 contact_identity_required and does not insert when no identity fields are present', async () => {
    const res = await POST(request({ source: 'manual' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'contact_identity_required' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 403 operator_approval_required and does not insert when client and business links are supplied without approval', async () => {
    const res = await POST(request({
      displayName: 'Ada Lovelace',
      linkedClientId: clientId,
      linkedBusinessId: businessId,
    }));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'operator_approval_required' });
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

  it('returns 503 crm_not_configured before Supabase access if env is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const res = await POST(request({ displayName: 'Ada Lovelace' }));

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'crm_not_configured' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 500 crm_contact_create_failed on Supabase insert error', async () => {
    mockContactInsert([], { data: null, error: new Error('insert failed') });

    const res = await POST(request({ displayName: 'Ada Lovelace' }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_contact_create_failed' });
  });

  it('returns 400 invalid_contact_payload for invalid JSON before Supabase access', async () => {
    const res = await POST(request({}, '{bad json'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_contact_payload' });
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
