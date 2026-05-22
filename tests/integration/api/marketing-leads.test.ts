import { NextRequest } from 'next/server';

const mockFrom = jest.fn();
const mockAddSubscriber = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

jest.mock('@/lib/marketing/email/sendgrid-client', () => ({
  SendGridClient: jest.fn(() => ({ addSubscriber: mockAddSubscriber })),
}));

jest.mock('@/lib/ratelimit', () => ({
  rateLimit: jest.fn(),
  RATE_LIMITS: {
    marketingLeads: { limit: 10, windowMs: 60_000 },
  },
}));

import { POST } from '@/app/api/marketing/leads/route';
import { rateLimit } from '@/lib/ratelimit';

type InsertCall = { table: string; row: Record<string, unknown> };

const mockedRateLimit = rateLimit as jest.Mock;
let consoleErrorSpy: jest.SpyInstance;

const validLead = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '+61400000000',
  company: 'Analytical Engines Pty Ltd',
  jobTitle: 'Founder',
  message: 'I want to discuss CRM buildout.',
  interests: 'CRM, automation',
  referralSource: 'website',
  marketingConsent: true,
  emailListId: 'list-1',
  additionalData: { campaign: 'command-center' },
};

function request(body: unknown): NextRequest {
  return new NextRequest('https://unite-group.in/api/marketing/leads', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
      'user-agent': 'jest-agent',
    },
    body: JSON.stringify(body),
  });
}

function mockLeadInsert(calls: InsertCall[] = [], result: { data?: Record<string, unknown> | null; error?: Error | null } = {}) {
  mockFrom.mockImplementation((table: string) => ({
    insert: jest.fn((row: Record<string, unknown>) => {
      calls.push({ table, row });
      return {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'lead-1', ...result.data },
            error: null,
            ...result,
          }),
        }),
      };
    }),
  }));
}

describe('POST /api/marketing/leads', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...oldEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      SENDGRID_API_KEY: 'sendgrid-test',
    };
    mockedRateLimit.mockResolvedValue({ ok: true });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env = oldEnv;
  });

  it('persists a valid lead to crm_leads and subscribes consenting leads to SendGrid', async () => {
    const calls: InsertCall[] = [];
    mockLeadInsert(calls);

    const res = await POST(request(validLead));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      message: 'Lead successfully captured',
      lead_id: 'lead-1',
    });
    expect(mockFrom).toHaveBeenCalledWith('crm_leads');
    expect(calls[0].row).toEqual(
      expect.objectContaining({
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
        assigned_owner: 'Margot',
        ip_address: '203.0.113.10',
        user_agent: 'jest-agent',
        additional_data: { campaign: 'command-center' },
      }),
    );
    expect(mockAddSubscriber).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ada@example.com', listIds: ['list-1'] }),
    );
  });

  it('captures the CRM lead even when SendGrid subscription fails', async () => {
    mockAddSubscriber.mockRejectedValueOnce(new Error('sendgrid down'));
    mockLeadInsert();

    const res = await POST(request(validLead));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      message: 'Lead successfully captured',
      lead_id: 'lead-1',
    });
    expect(mockFrom).toHaveBeenCalledWith('crm_leads');
  });

  it('returns a safe configuration error when CRM persistence is not configured', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await POST(request(validLead));

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'crm_not_configured' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns a safe persistence error when the lead insert fails', async () => {
    mockLeadInsert([], { data: null, error: new Error('insert failed') });

    const res = await POST(request(validLead));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'lead_persistence_failed' });
  });
});
