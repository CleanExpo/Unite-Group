jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: jest.fn(),
}));

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/command-center/control-panel/kanban-sync/route';
import { requireAdmin } from '@/lib/security/require-admin';
import { getAdminClient } from '@/lib/supabase/admin';

const mockedRequireAdmin = requireAdmin as jest.Mock;
const mockedGetAdminClient = getAdminClient as jest.Mock;

const task = {
  id: 'task-1',
  title: 'Sync voice task to Kanban',
  description: 'Create a Kanban task from this CRM item',
  status: 'todo',
  priority: 'high',
  tags: ['margot-voice', 'unite-crm'],
  assignee_name: 'Margot',
  obsidian_path: 'voice/abc',
  obsidian_synced_at: null,
  updated_at: '2026-05-17T10:00:00.000Z',
  created_at: '2026-05-17T09:00:00.000Z',
};

function req(method = 'GET', body?: unknown): NextRequest {
  return new Request('https://unite-group.in/api/command-center/control-panel/kanban-sync', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as NextRequest;
}

function mockSelect(data: Array<Record<string, unknown>>) {
  const query = {
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn().mockResolvedValue({ data, error: null }),
  };
  mockedGetAdminClient.mockReturnValue({
    from: jest.fn(() => ({
      select: jest.fn(() => query),
    })),
  });
  return query;
}

function mockUpdate() {
  const updateQuery = {
    eq: jest.fn(() => updateQuery),
    in: jest.fn().mockResolvedValue({ error: null }),
  };
  const update = jest.fn(() => updateQuery);
  mockedGetAdminClient.mockReturnValue({
    from: jest.fn(() => ({ update })),
  });
  return { update, updateQuery };
}

describe('/api/command-center/control-panel/kanban-sync', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...oldEnv,
      UNITE_CRM_WORKSPACE_ID: 'workspace-1',
    };
    mockedRequireAdmin.mockResolvedValue({ ok: true, actorEmail: 'service-role' });
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it('returns admin gate failures', async () => {
    mockedRequireAdmin.mockResolvedValue(NextResponse.json({ error: 'unauthorized' }, { status: 401 }));

    const res = await GET(req());

    expect(res.status).toBe(401);
  });

  it('returns pending CRM task sync packets', async () => {
    mockSelect([task]);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      source: 'crm:kanban-sync',
      pendingCount: 1,
      tasks: [
        {
          crmTaskId: 'task-1',
          idempotencyKey: 'unite-crm-task-1',
          lane: 'voice-intake',
          kanban: {
            status: 'triage',
            priority: 100,
          },
        },
      ],
    });
  });

  it('normalizes approval tags and maps urgent CRM tasks above high priority for Kanban', async () => {
    mockSelect([
      {
        ...task,
        status: ' blocked ',
        priority: ' urgent ',
        tags: [' Approval-Required ', 'Capability-Scout'],
      },
    ]);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tasks[0]).toMatchObject({
      crmTaskId: 'task-1',
      lane: 'approval-gate',
      kanban: {
        status: 'blocked',
        priority: 120,
      },
    });
  });

  it('redacts sensitive CRM task text before returning Kanban sync packets', async () => {
    const bearerCredential = ['sample', '.middle.segment'].join('');
    const bearerRemainder = 'middle.segment';
    const apiKeyAssignment = ['api', '_key=abc123'].join('');
    const phoneNumber = ['+614', '12345678'].join('');
    mockSelect([
      {
        ...task,
        title: 'Approve ada@example.com BOARD-CRM-APPROVED',
        description: `Use Authorization: Bearer ${bearerCredential}; ${apiKeyAssignment}; phone ${phoneNumber}; Visa card ending 4242.`,
      },
    ]);

    const res = await GET(req());
    const body = await res.json();
    const serialized = JSON.stringify(body);

    expect(res.status).toBe(200);
    expect(body.pendingCount).toBe(1);
    expect(body.tasks[0]).toMatchObject({
      crmTaskId: 'task-1',
      idempotencyKey: 'unite-crm-task-1',
      lane: 'voice-intake',
      status: 'todo',
      priority: 'high',
    });
    expect(serialized).toContain('[REDACTED]');
    expect(serialized).not.toContain('ada@example.com');
    expect(serialized).not.toContain('BOARD-CRM-APPROVED');
    expect(serialized).not.toContain(bearerCredential);
    expect(serialized).not.toContain(bearerRemainder);
    expect(serialized).not.toContain(apiKeyAssignment);
    expect(serialized).not.toContain(phoneNumber);
    expect(serialized).not.toContain('Visa card ending 4242');
  });

  it('redacts underscored and quoted secret assignments in Kanban sync packets', async () => {
    const accessTokenAssignment = ['access', '_token="quoted token value"'].join('');
    const clientSecretAssignment = ['client', '_secret=single-quoted-value'].join('');
    const dbPasswordAssignment = ['db', '_password=plain-value'].join('');
    mockSelect([
      {
        ...task,
        title: 'Sync provider credential cleanup',
        description: `Review ${accessTokenAssignment}; ${clientSecretAssignment}; ${dbPasswordAssignment} before handoff.`,
      },
    ]);

    const res = await GET(req());
    const body = await res.json();
    const serialized = JSON.stringify(body);

    expect(res.status).toBe(200);
    expect(serialized).toContain('[REDACTED]');
    expect(serialized).not.toContain(accessTokenAssignment);
    expect(serialized).not.toContain(clientSecretAssignment);
    expect(serialized).not.toContain(dbPasswordAssignment);
    expect(serialized).not.toContain('quoted token value');
    expect(serialized).not.toContain('single-quoted-value');
    expect(serialized).not.toContain('plain-value');
  });

  it('filters tasks already synced after their last update', async () => {
    mockSelect([
      {
        ...task,
        obsidian_synced_at: '2026-05-17T10:05:00.000Z',
      },
    ]);

    const res = await GET(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.pendingCount).toBe(0);
  });

  it('acknowledges synced CRM task ids', async () => {
    const { update, updateQuery } = mockUpdate();

    const res = await POST(req('POST', {
      taskIds: ['task-1'],
      syncedAt: '2026-05-17T10:10:00.000Z',
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      taskIds: ['task-1'],
      syncedAt: '2026-05-17T10:10:00.000Z',
    });
    expect(update).toHaveBeenCalledWith({ obsidian_synced_at: '2026-05-17T10:10:00.000Z' });
    expect(updateQuery.eq).toHaveBeenCalledWith('workspace_id', 'workspace-1');
    expect(updateQuery.in).toHaveBeenCalledWith('id', ['task-1']);
  });
});
