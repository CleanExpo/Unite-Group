import { NextRequest } from 'next/server';

const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

import { POST } from '@/app/api/pi-ceo/margot-voice/task/route';

type InsertCall = { table: string; row: Record<string, unknown> };

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

function mockSuccessfulSupabase(calls: InsertCall[] = []) {
  mockFrom.mockImplementation((table: string) => ({
    insert: jest.fn((row: Record<string, unknown>) => {
      calls.push({ table, row });
      return {
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data:
              table === 'tasks'
                ? { id: 'task-1', title: row.title }
                : { id: 'voice-session-1' },
            error: null,
          }),
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
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('rejects missing token', async () => {
    const res = await POST(request(packet, 'wrong'));
    expect(res.status).toBe(401);
  });

  it('creates voice session and CRM task', async () => {
    mockSuccessfulSupabase();

    const res = await POST(request(packet));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      crm_session_id: 'voice-session-1',
      crm_task_id: 'task-1',
      task_title: packet.summary,
    });
    expect(mockFrom).toHaveBeenCalledWith('voice_command_sessions');
    expect(mockFrom).toHaveBeenCalledWith('tasks');
  });

  it('creates approval-needed task when approval is required', async () => {
    const calls: InsertCall[] = [];
    mockSuccessfulSupabase(calls);

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
