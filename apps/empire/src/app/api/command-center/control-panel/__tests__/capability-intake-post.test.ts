jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest
    .fn()
    .mockResolvedValue({ ok: true, actorEmail: 'test@unite-group.com' }),
}));

const insertSpy = jest.fn();

function buildMockAdmin(existingTask: Record<string, unknown> | null = null) {
  return {
    from: (tableName: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            neq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: existingTask, error: null }),
              }),
            }),
          }),
        }),
      }),
      insert: (payload: Record<string, unknown>) => {
        insertSpy(tableName, payload);
        return {
          select: () => ({
            single: async () => ({
              data: {
                id: 'capability-task-uuid',
                title: payload.title,
                status: payload.status,
                created_at: '2026-06-16T01:00:00.000Z',
              },
              error: null,
            }),
          }),
        };
      },
    }),
  };
}

let existingTask: Record<string, unknown> | null = null;

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => buildMockAdmin(existingTask),
}));

import { NextRequest } from 'next/server';
import { POST } from '../capability-intake/route';

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Review capability: microsoft/agent-framework',
    description: 'Review external AI capability with approval gates.',
    status: 'blocked',
    priority: 'high',
    assignee_name: 'Phill approval',
    tags: [
      'capability-scout',
      'approval-required',
      'unite-crm',
      'second-brain',
      'hermes-intake',
      'agent_runtime',
      'github',
    ],
    obsidian_path: 'Sources/2026-06-16-capability-microsoft-agent-framework.md',
    source_url: 'https://github.com/microsoft/agent-framework',
    project_matches: ['pi-dev-ops', 'unite-group'],
    capability_type: 'agent_runtime',
    relevance_score: 96,
    hermes_lane: 'engineering',
    ...overrides,
  };
}

function makeReq(tasks: unknown[]): NextRequest {
  return new NextRequest('http://localhost/api/command-center/control-panel/capability-intake', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tasks }),
  });
}

describe('POST /api/command-center/control-panel/capability-intake', () => {
  const ORIGINAL_WORKSPACE = process.env.UNITE_CRM_WORKSPACE_ID;

  beforeAll(() => {
    process.env.UNITE_CRM_WORKSPACE_ID = 'adedf006-ca69-47d4-adbf-fc91bd7f225d';
  });

  afterAll(() => {
    if (ORIGINAL_WORKSPACE === undefined) {
      delete process.env.UNITE_CRM_WORKSPACE_ID;
    } else {
      process.env.UNITE_CRM_WORKSPACE_ID = ORIGINAL_WORKSPACE;
    }
  });

  beforeEach(() => {
    insertSpy.mockClear();
    existingTask = null;
  });

  it('creates blocked CRM tasks from capability scout proposals', async () => {
    const res = await POST(makeReq([proposal()]));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      source: 'capability-scout-intake',
      created: 1,
      existing: 0,
    });

    const taskInsertCalls = insertSpy.mock.calls.filter(([tableName]) => tableName === 'tasks');
    expect(taskInsertCalls).toHaveLength(1);
    const insertedPayload = taskInsertCalls[0][1] as Record<string, unknown>;
    expect(insertedPayload).toMatchObject({
      workspace_id: 'adedf006-ca69-47d4-adbf-fc91bd7f225d',
      status: 'blocked',
      priority: 'high',
      assignee_type: 'self',
      assignee_name: 'Phill approval',
      obsidian_path: 'Sources/2026-06-16-capability-microsoft-agent-framework.md',
    });
    expect(insertedPayload.tags).toEqual(expect.arrayContaining([
      'capability-scout',
      'approval-required',
      'hermes-intake',
      'agent_runtime',
      'engineering',
    ]));
  });

  it('normalizes capability tags and adds routing tags for downstream panels', async () => {
    const res = await POST(makeReq([
      proposal({
        tags: ['Capability-Scout', 'Approval-Required', 'Github'],
        capability_type: 'RAG_MEMORY',
        hermes_lane: 'research-ops',
      }),
    ]));

    expect(res.status).toBe(200);
    const taskInsertCalls = insertSpy.mock.calls.filter(([tableName]) => tableName === 'tasks');
    const insertedPayload = taskInsertCalls[0][1] as Record<string, unknown>;
    expect(insertedPayload.tags).toEqual(expect.arrayContaining([
      'capability-scout',
      'approval-required',
      'github',
      'rag_memory',
      'research-ops',
      'hermes-intake',
    ]));
  });

  it('dedupes existing open tasks by obsidian_path', async () => {
    existingTask = {
      id: 'existing-task',
      title: 'Review capability: microsoft/agent-framework',
      status: 'blocked',
      created_at: '2026-06-15T01:00:00.000Z',
    };

    const res = await POST(makeReq([proposal()]));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      created: 0,
      existing: 1,
      results: [{ existing: true, crm_task_id: 'existing-task' }],
    });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('rejects proposals that are not blocked approval tasks', async () => {
    const res = await POST(makeReq([proposal({ status: 'ready' })]));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_capability_intake' });
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
