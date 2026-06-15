import { NextRequest } from 'next/server';

import { POST } from '@/app/api/integrations/dr-nrpg/crm/leads/route';

const mockCreateClient = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('https://unite-group.in/api/integrations/dr-nrpg/crm/leads', {
    method: 'POST',
    headers: {
      authorization: 'Bearer pi-dev-ops-only-token',
      'x-integration-flow': 'dr-nrpg-crm-lead-integration',
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  sourceType: 'public_claim',
  sourceId: 'claim-123',
  customer: {
    name: 'Ada Lovelace',
    email: ' Ada@Example.COM ',
    phone: '+61400000000',
  },
  location: {
    suburb: 'Lismore',
    state: 'NSW',
    postcode: '2480',
    propertyAddress: '1 Flood St',
  },
  service: {
    type: 'water_damage',
    description: 'Kitchen flooding after storm',
  },
  urgency: {
    original: 'critical',
    normalised: 'URGENT',
  },
  insurance: {
    hasInsurance: true,
    provider: 'NRMA',
    claimNumber: 'CLM-SECRET-123',
    policyNumber: 'POL-SECRET-456',
  },
  marketing: {
    consent: true,
    source: 'dr_nrpg_public_claim',
    referrer: 'https://dr.example/claims',
  },
  audit: {
    correlationId: 'corr-123',
  },
};

describe('POST /api/integrations/dr-nrpg/crm/leads', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...oldEnv };
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ENABLED = 'true';
    process.env.PI_DEV_OPS_CRM_LEAD_INTEGRATION_TOKEN = 'pi-dev-ops-only-token';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    delete process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES;
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('honours dry-run mode by validating and shaping the lead without creating a Supabase client or writes', async () => {
    const res = await POST(request(validPayload));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      status: 'dry_run',
      dryRunOnly: true,
      dedupeKey: 'public_claim:claim-123',
      sourceType: 'public_claim',
      sourceId: 'claim-123',
      customerEmailHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      retryable: false,
    });
    expect(json.leadPreview).toMatchObject({
      email: 'ada@example.com',
      source: 'dr_contractor_portal',
      status: 'new',
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('keeps the route in dry-run mode when prod writes are enabled but board approval is whitespace-only', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES = 'true';

    const res = await POST(request(validPayload, { 'x-board-approval-id': '   ' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      status: 'dry_run',
      dryRunOnly: true,
      dedupeKey: 'public_claim:claim-123',
      sourceType: 'public_claim',
      sourceId: 'claim-123',
      retryable: false,
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('rejects before parsing JSON or creating clients when the credentials gate is closed', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ENABLED = 'false';
    const badJson = new NextRequest('https://unite-group.in/api/integrations/dr-nrpg/crm/leads', {
      method: 'POST',
      headers: {
        authorization: 'Bearer pi-dev-ops-only-token',
        'x-integration-flow': 'dr-nrpg-crm-lead-integration',
      },
      body: '{not-json',
    });

    const res = await POST(badJson);

    expect(res.status).toBe(423);
    expect(await res.json()).toEqual({ error: 'dr_nrpg_crm_lead_integration_coverage_hold' });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns a typed 400 invalid_crm_lead_payload for malformed JSON when the credentials gate is open, without creating any Supabase client', async () => {
    // The credentials gate is open, the body is malformed JSON, and the
    // route must not throw or surface a 500. The catch block in the route
    // already wraps `request.json()` + zod parse, so a malformed body must
    // become a controlled `400 invalid_crm_lead_payload` without ever
    // creating a Supabase client. This pins the same fail-closed pattern
    // the Linear issue route gained in commit 893c87c4, but on the
    // DR/NRPG CRM lead integration surface.
    const badJson = new NextRequest('https://unite-group.in/api/integrations/dr-nrpg/crm/leads', {
      method: 'POST',
      headers: {
        authorization: 'Bearer pi-dev-ops-only-token',
        'x-integration-flow': 'dr-nrpg-crm-lead-integration',
        'content-type': 'application/json',
      },
      body: '{not-json',
    });

    const res = await POST(badJson);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      success: false,
      error: 'invalid_crm_lead_payload',
      errorClass: 'terminal_validation_failure',
      retryable: false,
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns a typed 400 invalid_crm_lead_payload for a schema-invalid JSON body when the credentials gate is open, without creating any Supabase client', async () => {
    // The body parses as JSON but fails the integrationPayloadSchema (e.g.
    // missing required `urgency.normalised` enum). The route must still
    // fail closed into the same typed 400 response and must not leak
    // zod-internal error shapes (no `issues`/`message` field with the raw
    // schema field name) so a hostile caller cannot probe the schema.
    const schemaInvalid = {
      sourceType: 'public_claim',
      sourceId: 'claim-456',
      customer: { email: 'bad@example.com' },
      service: { type: 'water_damage' },
      urgency: { normalised: 'NOT_AN_ENUM_VALUE' },
    };

    const res = await POST(request(schemaInvalid));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      success: false,
      error: 'invalid_crm_lead_payload',
      errorClass: 'terminal_validation_failure',
      retryable: false,
    });
    // Pin the no-leak contract: the typed error envelope must not expose
    // raw zod internals (issues array, schema field path, or the bad
    // enum value the caller submitted).
    expect(JSON.stringify(json)).not.toContain('NOT_AN_ENUM_VALUE');
    expect(JSON.stringify(json)).not.toContain('issues');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('writes lead/contact/opportunity records once prod-write approval is explicitly allowed', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES = 'true';

    const leadMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const leadSelectExisting = jest.fn(() => ({ maybeSingle: leadMaybeSingle }));
    const leadContains = jest.fn(() => ({ select: leadSelectExisting }));

    const leadInsertSingle = jest.fn().mockResolvedValue({ data: { id: 'lead-1' }, error: null });
    const leadInsertSelect = jest.fn(() => ({ single: leadInsertSingle }));
    const leadInsert = jest.fn(() => ({ select: leadInsertSelect }));
    const leadUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const leadUpdate = jest.fn(() => ({ eq: leadUpdateEq }));

    const contactMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const contactEq = jest.fn(() => ({ maybeSingle: contactMaybeSingle }));
    const contactSelectExisting = jest.fn(() => ({ eq: contactEq }));
    const contactInsertSingle = jest.fn().mockResolvedValue({ data: { id: 'contact-1' }, error: null });
    const contactInsertSelect = jest.fn(() => ({ single: contactInsertSingle }));
    const contactInsert = jest.fn(() => ({ select: contactInsertSelect }));

    const opportunityMaybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const opportunitySelectExisting = jest.fn(() => ({ maybeSingle: opportunityMaybeSingle }));
    const opportunityContains = jest.fn(() => ({ select: opportunitySelectExisting }));
    const opportunityInsertSingle = jest.fn().mockResolvedValue({ data: { id: 'opp-1' }, error: null });
    const opportunityInsertSelect = jest.fn(() => ({ single: opportunityInsertSingle }));
    const opportunityInsert = jest.fn(() => ({ select: opportunityInsertSelect }));

    mockCreateClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'crm_leads') return { contains: leadContains, insert: leadInsert, update: leadUpdate };
        if (table === 'crm_contacts') return { select: contactSelectExisting, insert: contactInsert };
        if (table === 'crm_opportunities') return { contains: opportunityContains, insert: opportunityInsert };
        throw new Error(`unexpected table ${table}`);
      }),
    });

    const res = await POST(request(validPayload, { 'x-board-approval-id': 'BOARD-123' }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toMatchObject({
      success: true,
      status: 'synced',
      leadId: 'lead-1',
      contactId: 'contact-1',
      opportunityId: 'opp-1',
      dedupeKey: 'public_claim:claim-123',
      retryable: false,
    });
    expect(leadInsert).toHaveBeenCalledWith(expect.objectContaining({
      email: 'ada@example.com',
      source: 'dr_contractor_portal',
      additional_data: expect.objectContaining({
        dedupe_key: 'public_claim:claim-123',
        source_type: 'public_claim',
        source_id: 'claim-123',
        integration_flow: 'dr-nrpg-crm-lead-integration',
      }),
    }));
    expect(contactInsert).toHaveBeenCalledWith(expect.objectContaining({
      primary_email: 'ada@example.com',
      linked_lead_id: 'lead-1',
      dedupe_email_key: 'ada@example.com',
    }));
    expect(opportunityInsert).toHaveBeenCalledWith(expect.objectContaining({
      linked_lead_id: 'lead-1',
      linked_contact_id: 'contact-1',
      source: 'dr_contractor_portal',
      stage: 'discovery',
      next_action: 'Urgent DR/NRPG follow-up required',
    }));
    expect(leadUpdate).toHaveBeenCalledWith({
      additional_data: expect.objectContaining({
        dedupe_key: 'public_claim:claim-123',
        contact_id: 'contact-1',
        opportunity_id: 'opp-1',
      }),
    });
    expect(leadUpdateEq).toHaveBeenCalledWith('id', 'lead-1');
  });

  it('returns existing CRM linkage for an idempotent replay instead of inserting duplicates', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES = 'true';

    const leadInsert = jest.fn();
    const existingLead = {
      id: 'lead-existing',
      additional_data: {
        contact_id: 'contact-existing',
        opportunity_id: 'opp-existing',
      },
    };
    mockCreateClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table !== 'crm_leads') throw new Error(`unexpected table ${table}`);
        return {
          contains: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: existingLead, error: null }) }) }),
          insert: leadInsert,
        };
      }),
    });

    const res = await POST(request(validPayload, { 'x-board-approval-id': 'BOARD-123' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      status: 'already_synced',
      leadId: 'lead-existing',
      contactId: 'contact-existing',
      opportunityId: 'opp-existing',
    });
    expect(leadInsert).not.toHaveBeenCalled();
  });

  it('classifies Supabase write failures as retryable without leaking policy or claim numbers', async () => {
    process.env.DR_NRPG_CRM_LEAD_INTEGRATION_ALLOW_PROD_WRITES = 'true';
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    mockCreateClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table !== 'crm_leads') throw new Error(`unexpected table ${table}`);
        return {
          contains: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'timeout while writing' } }) }) }),
        };
      }),
    });

    const res = await POST(request(validPayload, { 'x-board-approval-id': 'BOARD-123' }));
    const json = await res.json();
    const logs = consoleSpy.mock.calls.flat().join(' ');

    expect(res.status).toBe(503);
    expect(json).toMatchObject({
      success: false,
      error: 'crm_lead_sync_failed',
      errorClass: 'transient_persistence_failure',
      retryable: true,
      dedupeKey: 'public_claim:claim-123',
      customerEmailHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(logs).toContain('public_claim');
    expect(logs).toContain('claim-123');
    expect(logs).not.toContain('CLM-SECRET-123');
    expect(logs).not.toContain('POL-SECRET-456');
    consoleSpy.mockRestore();
  });
});
