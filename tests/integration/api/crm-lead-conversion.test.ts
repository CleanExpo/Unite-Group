import { NextRequest } from 'next/server';

const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

import { POST } from '@/app/api/crm/leads/[id]/convert/route';

const leadId = '11111111-1111-4111-8111-111111111111';
const targetClientId = '22222222-2222-4222-8222-222222222222';
const otherClientId = '33333333-3333-4333-8333-333333333333';

function request(body: Record<string, unknown> = {}) {
  return new NextRequest(`https://unite-group.in/api/crm/leads/${leadId}/convert`, {
    method: 'POST',
    headers: { authorization: 'Bearer service-role-test' },
    body: JSON.stringify({
      targetClientId,
      boardApprovalId: 'BOARD-CRM-APPROVED',
      ...body,
    }),
  });
}

function context(id = leadId) {
  return { params: Promise.resolve({ id }) };
}

function makeSelectBuilder(lead: Record<string, unknown> | null) {
  const builder: any = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve({ data: lead, error: lead ? null : new Error('not found') })),
  };
  return builder;
}

function makeUpdateBuilder(updatedLead: Record<string, unknown>) {
  const builder: any = {
    update: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    is: jest.fn(() => builder),
    select: jest.fn(() => builder),
    single: jest.fn(() => Promise.resolve({ data: updatedLead, error: null })),
  };
  return builder;
}

function mockLeadConversion(lead: Record<string, unknown>, updatedLead = {}) {
  const selectBuilder = makeSelectBuilder(lead);
  const updateBuilder = makeUpdateBuilder({
    id: leadId,
    status: 'converted',
    converted_client_id: targetClientId,
    converted_at: '2026-05-23T00:00:00.000Z',
    ...updatedLead,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table !== 'crm_leads') throw new Error(`Unexpected table ${table}`);
    return mockFrom.mock.calls.length === 1 ? selectBuilder : updateBuilder;
  });

  return { selectBuilder, updateBuilder };
}

describe('POST /api/crm/leads/[id]/convert', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T00:00:00.000Z'));
    process.env = {
      ...oldEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = oldEnv;
  });

  it('returns 400 exact_lead_id_required and performs no conversion when no exact crm_leads.id is supplied', async () => {
    const res = await POST(request(), context('not-a-uuid'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'exact_lead_id_required' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 409 identity_conflict and performs no conversion when strong identifiers disagree', async () => {
    const { updateBuilder } = mockLeadConversion({
      id: leadId,
      email: 'ada@example.com',
      company: 'Analytical Engines Pty Ltd',
      status: 'new',
      matched_client_id: otherClientId,
      converted_client_id: null,
      converted_at: null,
    });

    const res = await POST(request(), context());

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'identity_conflict' });
    expect(updateBuilder.update).not.toHaveBeenCalled();
  });

  it('returns 409 lead_already_converted and performs no duplicate conversion when converted_client_id is already set', async () => {
    const { updateBuilder } = mockLeadConversion({
      id: leadId,
      email: 'ada@example.com',
      company: 'Analytical Engines Pty Ltd',
      status: 'converted',
      matched_client_id: targetClientId,
      converted_client_id: targetClientId,
      converted_at: '2026-05-22T00:00:00.000Z',
    });

    const res = await POST(request(), context());

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'lead_already_converted' });
    expect(updateBuilder.update).not.toHaveBeenCalled();
  });

  it('updates the exact lead conversion fields when identity gates and Board approval pass', async () => {
    const { updateBuilder } = mockLeadConversion({
      id: leadId,
      email: 'ada@example.com',
      company: 'Analytical Engines Pty Ltd',
      status: 'qualified',
      matched_client_id: targetClientId,
      converted_client_id: null,
      converted_at: null,
    });

    const res = await POST(request(), context());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      success: true,
      lead_id: leadId,
      target_client_id: targetClientId,
      board_approval_id: 'BOARD-CRM-APPROVED',
      converted_lead: {
        id: leadId,
        status: 'converted',
        converted_client_id: targetClientId,
      },
    });
    expect(updateBuilder.update).toHaveBeenCalledWith({
      status: 'converted',
      converted_client_id: targetClientId,
      matched_client_id: targetClientId,
      converted_at: '2026-05-23T00:00:00.000Z',
      updated_at: '2026-05-23T00:00:00.000Z',
    });
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', leadId);
    expect(updateBuilder.is).toHaveBeenCalledWith('converted_client_id', null);
  });
});
