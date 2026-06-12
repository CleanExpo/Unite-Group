import { NextRequest } from 'next/server';

const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

jest.mock('@/lib/ratelimit', () => ({
  rateLimit: jest.fn(),
  RATE_LIMITS: {
    margotVoiceTaskCreate: { limit: 10, windowMs: 60_000 },
  },
}));

import { POST } from '@/app/api/pi-ceo/margot-voice/task/route';
import { rateLimit } from '@/lib/ratelimit';

type InsertCall = { table: string; row: Record<string, unknown> };
type InsertResult = { data: Record<string, unknown> | null; error: Error | null };

const mockedRateLimit = rateLimit as jest.Mock;

function request(body: unknown, token = 'ingest-test'): NextRequest {
  return new NextRequest('https://unite-group.in/api/pi-ceo/margot-voice/task', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

function requestWithoutAuth(body: unknown): NextRequest {
  return new NextRequest('https://unite-group.in/api/pi-ceo/margot-voice/task', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest(): NextRequest {
  return new NextRequest('https://unite-group.in/api/pi-ceo/margot-voice/task', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ingest-test',
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: '{',
  });
}

const packet = {
  packet_id: 'voice_abc',
  conversation_id: 'conv_abc',
  crm_user_id: 'crm-user-1',
  crm_user_email: 'phill.mcgurk@gmail.com',
  transcript_text: 'user: Create a low risk Unite CRM portfolio task',
  summary: 'Create a low risk Unite CRM portfolio task',
  requested_outcome: 'Create a low risk Unite CRM portfolio task',
  business_context: 'unite-group',
  route: 'unite_crm',
  risk_level: 'low',
  approval_required: false,
  approval_reason: '',
  actions: [{ type: 'create_crm_task', status: 'pending', evidence_ref: '' }],
  evidence_refs: { elevenlabs_conversation_id: 'conv_abc' },
};

function mockSupabaseInserts(
  calls: InsertCall[] = [],
  overrides: Partial<Record<'voice' | 'task', Partial<InsertResult>>> = {},
) {
  mockFrom.mockImplementation((table: string) => ({
    insert: jest.fn((row: Record<string, unknown>) => {
      calls.push({ table, row });
      const result: InsertResult =
        table === 'tasks'
          ? {
              data: { id: 'task-1', title: row.title },
              error: null,
              ...overrides.task,
            }
          : {
              data: { id: 'voice-session-1' },
              error: null,
              ...overrides.voice,
            };

      return {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue(result),
        }),
      };
    }),
  }));
}

describe('POST /api/pi-ceo/margot-voice/task', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...oldEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      UNITE_CRM_INGEST_TOKEN: 'ingest-test',
      UNITE_CRM_ORG_ID: 'org-1',
      UNITE_CRM_WORKSPACE_ID: 'workspace-1',
    };
    mockedRateLimit.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('returns 429 when rate limited', async () => {
    mockedRateLimit.mockResolvedValue({ ok: false, retryAfterMs: 4_321 });

    const res = await POST(request(packet));

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'rate_limited', retry_after_ms: 4_321 });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects missing token', async () => {
    const res = await POST(requestWithoutAuth(packet));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('rejects bad token', async () => {
    const res = await POST(request(packet, 'wrong'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });

  it('fails closed when CRM/Supabase env is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await POST(request(packet));

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'crm_not_configured' });
  });

  it('rejects invalid JSON', async () => {
    const res = await POST(invalidJsonRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_json' });
  });

  it('rejects an invalid packet', async () => {
    const res = await POST(request({ ...packet, summary: '' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_packet' });
  });

  it('returns 500 when voice session insert errors', async () => {
    mockSupabaseInserts([], { voice: { error: new Error('insert failed') } });

    const res = await POST(request(packet));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'voice_session_insert_failed' });
  });

  it('returns 500 when voice session insert returns no id', async () => {
    mockSupabaseInserts([], { voice: { data: {} } });

    const res = await POST(request(packet));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'voice_session_insert_failed' });
  });

  it('returns 500 when CRM task insert errors', async () => {
    mockSupabaseInserts([], { task: { error: new Error('task failed') } });

    const res = await POST(request(packet));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_task_insert_failed' });
  });

  it('returns 500 when CRM task insert returns no id', async () => {
    mockSupabaseInserts([], { task: { data: {} } });

    const res = await POST(request(packet));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_task_insert_failed' });
  });

  it('creates voice session and CRM task', async () => {
    mockSupabaseInserts();

    const res = await POST(request(packet));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({
      ok: true,
      crm_session_id: 'voice-session-1',
      crm_task_id: 'task-1',
      task_title: packet.summary,
    });
    expect(mockFrom).toHaveBeenCalledWith('voice_command_sessions');
    expect(mockFrom).toHaveBeenCalledWith('tasks');
  });

  it('truncates long summaries and applies default packet fields', async () => {
    const calls: InsertCall[] = [];
    mockSupabaseInserts(calls);
    const longSummary = 'x'.repeat(600);

    const res = await POST(
      request({
        packet_id: 'voice_defaults',
        summary: longSummary,
        transcript_text: 'user: default missing fields',
      }),
    );

    expect(res.status).toBe(200);
    const taskCall = calls.find((c) => c.table === 'tasks');
    const voiceCall = calls.find((c) => c.table === 'voice_command_sessions');
    expect(taskCall?.row.title).toBe('x'.repeat(500));
    expect(taskCall?.row.tags).toEqual(['margot-voice', 'unite-group', 'unite_crm', 'auto-created']);
    expect(taskCall?.row.description).toContain('Route: unite_crm');
    expect(taskCall?.row.description).toContain('Business context: unite-group');
    expect(taskCall?.row.description).toContain('Risk: low');
    expect(voiceCall?.row.parsed_intent).toEqual(
      expect.objectContaining({
        summary: 'x'.repeat(500),
        business_context: 'unite-group',
        route: 'unite_crm',
        risk_level: 'low',
      }),
    );
  });

  it('creates approval-needed task when approval is required', async () => {
    const calls: InsertCall[] = [];
    mockSupabaseInserts(calls);

    const res = await POST(
      request({ ...packet, approval_required: true, approval_reason: 'production' }),
    );
    expect(res.status).toBe(200);
    const taskCall = calls.find((c) => c.table === 'tasks');
    expect(taskCall?.row.status).toBe('blocked');
    expect(taskCall?.row.priority).toBe('high');
    expect(taskCall?.row.tags).toContain('approval-required');
  });
});
