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

function mockTasksTable({
  existing = null,
  insertError = null,
}: {
  existing?: Record<string, unknown> | null;
  insertError?: { message: string } | null;
} = {}) {
  const maybeSingle = jest.fn().mockResolvedValue({ data: existing, error: null });
  const lookupQuery = {
    eq: jest.fn(() => lookupQuery),
    neq: jest.fn(() => lookupQuery),
    limit: jest.fn(() => lookupQuery),
    maybeSingle,
  };

  const single = jest.fn().mockResolvedValue({
    data: insertError
      ? null
      : {
          id: 'task-addon-1',
          title: 'Approve add-on: Qwen research workers',
          status: 'blocked',
          created_at: '2026-05-17T10:00:00.000Z',
        },
    error: insertError,
  });
  const insertSelect = jest.fn(() => ({ single }));
  const insert = jest.fn(() => ({ select: insertSelect }));
  const select = jest.fn(() => lookupQuery);
  mockedGetAdminClient.mockReturnValue({ from: jest.fn(() => ({ select, insert })) });

  return { insert, select, maybeSingle, single };
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
    const table = mockTasksTable();

    const res = await POST(req({ addOnId: 'qwen-workers' }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      existing: false,
      crm_task_id: 'task-addon-1',
      task_status: 'blocked',
    });
    expect(table.insert).toHaveBeenCalledWith(
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

  it('reuses an existing open approval task', async () => {
    const table = mockTasksTable({
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
    expect(table.insert).not.toHaveBeenCalled();
  });
});
