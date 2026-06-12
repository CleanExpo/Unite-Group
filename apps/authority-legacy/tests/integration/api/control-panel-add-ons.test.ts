jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: jest.fn(),
}));

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/command-center/control-panel/add-ons/route';
import { requireAdmin } from '@/lib/security/require-admin';
import { getAdminClient } from '@/lib/supabase/admin';

const mockedRequireAdmin = requireAdmin as jest.Mock;
const mockedGetAdminClient = getAdminClient as jest.Mock;

function req(body: unknown): NextRequest {
  return new Request('https://unite-group.in/api/command-center/control-panel/add-ons', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function mockTables({
  existing = null,
  taskInsertError = null,
  agentActionInsertError = null,
  agentActionInsertThrows = false,
}: {
  existing?: Record<string, unknown> | null;
  taskInsertError?: { message: string } | null;
  agentActionInsertError?: { message: string } | null;
  agentActionInsertThrows?: boolean;
} = {}) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: existing, error: null });
  const lookupQuery = {
    eq: jest.fn(() => lookupQuery),
    neq: jest.fn(() => lookupQuery),
    limit: jest.fn(() => lookupQuery),
    maybeSingle,
  };

  const taskSingle = jest.fn().mockResolvedValue({
    data: taskInsertError
      ? null
      : {
          id: 'task-addon-1',
          title: 'Approve add-on: Qwen research workers',
          status: 'blocked',
          created_at: '2026-05-17T10:00:00.000Z',
        },
    error: taskInsertError,
  });
  const taskInsertSelect = jest.fn(() => ({ single: taskSingle }));
  const taskInsert = jest.fn(() => ({ select: taskInsertSelect }));
  const taskSelect = jest.fn(() => lookupQuery);

  const agentActionInsert = jest.fn(() => {
    if (agentActionInsertThrows) throw new Error('agent_actions unavailable');
    return Promise.resolve({ data: null, error: agentActionInsertError });
  });

  const from = jest.fn((tableName: string) => {
    if (tableName === 'tasks') return { select: taskSelect, insert: taskInsert };
    if (tableName === 'agent_actions') return { insert: agentActionInsert };
    throw new Error(`Unexpected table: ${tableName}`);
  });

  mockedGetAdminClient.mockReturnValue({ from });

  return {
    from,
    tasks: { insert: taskInsert, select: taskSelect, maybeSingle, single: taskSingle },
    agentActions: { insert: agentActionInsert },
  };
}

describe('POST /api/command-center/control-panel/add-ons', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...oldEnv,
      UNITE_CRM_WORKSPACE_ID: 'workspace-1',
    };
    mockedRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'phill.mcgurk@gmail.com' });
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('returns admin gate failures', async () => {
    mockedRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'unauthorized' }, { status: 401 }));

    const res = await POST(req({ addOnId: 'qwen-workers' }));

    expect(res.status).toBe(401);
  });

  it('rejects unknown add-ons', async () => {
    const res = await POST(req({ addOnId: 'unknown' }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_add_on' });
  });

  it('creates a blocked Unite CRM approval task', async () => {
    const table = mockTables();

    const res = await POST(req({ addOnId: 'qwen-workers' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      existing: false,
      crm_task_id: 'task-addon-1',
      task_status: 'blocked',
    });
    expect(table.tasks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: 'workspace-1',
        title: 'Approve add-on: Qwen research workers',
        status: 'blocked',
        priority: 'high',
        assignee_name: 'Phill approval',
        obsidian_path: 'command-center/add-ons/qwen-workers',
      }),
    );
  });

  it('writes a sanitized CRM timeline event for a newly blocked approval task', async () => {
    const table = mockTables();

    const res = await POST(req({ addOnId: 'qwen-workers' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, existing: false, crm_task_id: 'task-addon-1' });
    expect(table.agentActions.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'crm_timeline_approval_requested',
        status: 'pending',
        payload: expect.objectContaining({
          type: 'approval_requested',
          actor: 'Margot',
          subjectId: 'task-addon-1',
          subjectLabel: 'Qwen research workers',
          source: 'command_center_add_on_request',
          requiresApproval: true,
          metadata: {
            addOnId: 'qwen-workers',
            category: 'model routing',
            taskStatus: 'blocked',
          },
        }),
      }),
    );
    const insertedAction = table.agentActions.insert.mock.calls[0][0];
    expect(JSON.stringify(insertedAction.payload)).not.toContain('phill.mcgurk@gmail.com');
    expect(JSON.stringify(insertedAction.payload.metadata)).not.toContain('phill.mcgurk@gmail.com');
  });

  it('does not fail the approval task response when CRM timeline insert fails', async () => {
    const table = mockTables({ agentActionInsertError: { message: 'agent_actions insert failed' } });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await POST(req({ addOnId: 'qwen-workers' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, existing: false, crm_task_id: 'task-addon-1' });
    expect(table.agentActions.insert).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith('[add-ons] CRM timeline insert failed');
    consoleError.mockRestore();
  });

  it('does not fail the approval task response when CRM timeline insert throws', async () => {
    const table = mockTables({ agentActionInsertThrows: true });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await POST(req({ addOnId: 'qwen-workers' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, existing: false, crm_task_id: 'task-addon-1' });
    expect(table.agentActions.insert).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith('[add-ons] CRM timeline insert failed');
    consoleError.mockRestore();
  });

  it('returns a generic task insert failure without logging the raw insert error', async () => {
    const sentinelError = { message: 'sensitive database detail' };
    mockTables({ taskInsertError: sentinelError });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const res = await POST(req({ addOnId: 'qwen-workers' }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'crm_task_insert_failed' });
    expect(consoleError).toHaveBeenCalledWith('[add-ons] tasks insert failed');
    expect(consoleError).not.toHaveBeenCalledWith(expect.anything(), sentinelError);
    consoleError.mockRestore();
  });

  it('reuses an existing open approval task', async () => {
    const table = mockTables({
      existing: {
        id: 'task-existing',
        title: 'Approve add-on: Qwen research workers',
        status: 'blocked',
        created_at: '2026-05-17T09:00:00.000Z',
      },
    });

    const res = await POST(req({ addOnId: 'qwen-workers' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      existing: true,
      crm_task_id: 'task-existing',
    });
    expect(table.tasks.insert).not.toHaveBeenCalled();
    expect(table.agentActions.insert).not.toHaveBeenCalled();
  });
});
