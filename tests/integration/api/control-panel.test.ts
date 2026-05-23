jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: jest.fn(),
}));

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GET } from '@/app/api/command-center/control-panel/route';
import { requireAdmin } from '@/lib/security/require-admin';
import { getAdminClient } from '@/lib/supabase/admin';

const mockedRequireAdmin = requireAdmin as jest.Mock;
const mockedGetAdminClient = getAdminClient as jest.Mock;

function req(): NextRequest {
  return new Request('https://unite-group.in/api/command-center/control-panel') as NextRequest;
}

describe('GET /api/command-center/control-panel', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...oldEnv,
      UNITE_CRM_WORKSPACE_ID: 'workspace-1',
    };
    delete process.env.COMMAND_CENTER_LOCAL_PREVIEW;
    mockedRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'service-role' });
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('returns local fallback data without admin auth only when local preview is enabled', async () => {
    process.env.COMMAND_CENTER_LOCAL_PREVIEW = 'true';

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe('fallback:local_preview');
    expect(body.summary.approvalRequired).toBe(0);
    expect(body.workstreams).toHaveLength(7);
    expect(mockedRequireAdmin).not.toHaveBeenCalled();
    expect(mockedGetAdminClient).not.toHaveBeenCalled();
  });

  it('counts approval-required CRM task rows in the summary', async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'task-approval-1',
          title: 'Unmapped Phill decision',
          status: 'blocked',
          priority: 'high',
          tags: ['unmapped'],
          assignee_name: 'Phill approval',
          obsidian_path: null,
          updated_at: '2026-05-23T08:00:00.000Z',
          created_at: '2026-05-23T07:00:00.000Z',
        },
        {
          id: 'task-normal-1',
          title: 'Normal CRM hygiene task',
          status: 'running',
          priority: 'normal',
          tags: [],
          assignee_name: 'Operator',
          obsidian_path: null,
          updated_at: '2026-05-23T08:05:00.000Z',
          created_at: '2026-05-23T07:05:00.000Z',
        },
      ],
      error: null,
    });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    mockedGetAdminClient.mockReturnValue({ from });

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe('crm:tasks');
    expect(body.taskCount).toBe(2);
    expect(body.summary.approvalRequired).toBe(1);
    expect(from).toHaveBeenCalledWith('tasks');
    expect(select).toHaveBeenCalledWith(
      'id,title,status,priority,tags,assignee_name,obsidian_path,updated_at,created_at',
    );
    expect(eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false, nullsFirst: false });
    expect(limit).toHaveBeenCalledWith(100);
  });

  it('counts Board/operator approval markers as approval-required CRM task rows', async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'task-blocked-on-you',
          title: 'Phill sign-off for CRM automation',
          status: 'blocked-on-you',
          priority: 'high',
          tags: ['approval'],
          assignee_name: 'Operator',
          obsidian_path: null,
          updated_at: '2026-05-23T08:00:00.000Z',
          created_at: '2026-05-23T07:00:00.000Z',
        },
        {
          id: 'task-board-approval',
          title: 'Board review for command-center gate',
          status: 'running',
          priority: 'normal',
          tags: [],
          assignee_name: 'Board approval',
          obsidian_path: null,
          updated_at: '2026-05-23T08:05:00.000Z',
          created_at: '2026-05-23T07:05:00.000Z',
        },
        {
          id: 'task-operator-approval',
          title: 'Operator review for command-center gate',
          status: 'todo',
          priority: 'normal',
          tags: [],
          assignee_name: 'Operator approval',
          obsidian_path: null,
          updated_at: '2026-05-23T08:10:00.000Z',
          created_at: '2026-05-23T07:10:00.000Z',
        },
        {
          id: 'task-tag-approval-required',
          title: 'Review CRM automation policy',
          status: 'running',
          priority: 'normal',
          tags: ['approval-required'],
          assignee_name: 'Operator',
          obsidian_path: null,
          updated_at: '2026-05-23T08:12:00.000Z',
          created_at: '2026-05-23T07:12:00.000Z',
        },
        {
          id: 'task-tag-needs-approval-spaced',
          title: 'Review CRM automation policy whitespace tag',
          status: 'running',
          priority: 'normal',
          tags: [' needs-approval '],
          assignee_name: 'Operator',
          obsidian_path: null,
          updated_at: '2026-05-23T08:13:00.000Z',
          created_at: '2026-05-23T07:13:00.000Z',
        },
        {
          id: 'task-status-blocked-spaced',
          title: 'Margot voice to CRM task waiting on approval',
          status: ' blocked ',
          priority: 'normal',
          tags: [],
          assignee_name: 'Operator',
          obsidian_path: null,
          updated_at: '2026-05-23T08:14:00.000Z',
          created_at: '2026-05-23T07:14:00.000Z',
        },
        {
          id: 'task-normal-2',
          title: 'Normal CRM hygiene task',
          status: 'running',
          priority: 'normal',
          tags: [],
          assignee_name: 'Operator',
          obsidian_path: null,
          updated_at: '2026-05-23T08:15:00.000Z',
          created_at: '2026-05-23T07:15:00.000Z',
        },
      ],
      error: null,
    });
    const order = jest.fn().mockReturnValue({ limit });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });
    mockedGetAdminClient.mockReturnValue({ from });

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.source).toBe('crm:tasks');
    expect(body.summary.approvalRequired).toBe(6);
    expect(body.workstreams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ug-v0-02',
          status: 'gated',
          ryg: 'red',
          crmTaskId: 'task-status-blocked-spaced',
        }),
      ]),
    );
  });

  it('keeps the route admin-gated when local preview is disabled', async () => {
    mockedRequireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    );

    const res = await GET(req());

    expect(res.status).toBe(401);
    expect(mockedRequireAdmin).toHaveBeenCalledTimes(1);
  });
});
