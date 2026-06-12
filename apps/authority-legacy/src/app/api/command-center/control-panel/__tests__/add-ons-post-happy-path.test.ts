// End-to-end contract test for POST /api/command-center/control-panel/add-ons.
//
// Exercises the actual POST handler with the post-#156 fix (assignee_type:
// 'self'). Supabase admin client is mocked at the module boundary; the test
// asserts both the canonical SUCCESS response shape AND that the INSERT
// payload it builds satisfies the prod CHECK constraint on tasks.assignee_type.
//
// This is the highest-confidence verification reachable without a live
// Supabase round-trip — it pins both:
//   1. The route's response contract on success (`ok:true`, `crm_task_id`, …)
//   2. The exact insert payload (catches any future regression of the
//      assignee_type value beyond the static `_assignee-type.ts` constant).

// requireAdmin calls createClient() → cookies(), which throws outside a
// Next.js request scope. Short-circuit it.
jest.mock('@/lib/security/require-admin', () => ({
  requireAdmin: jest
    .fn()
    .mockResolvedValue({ ok: true, actorEmail: 'test@unite-group.com' }),
}));

// Capture insert payloads by table so task assertions stay stable when the
// route also writes best-effort CRM timeline rows to agent_actions.
const insertSpy = jest.fn();

// Build a chainable mock that mirrors the route's call shapes:
//   - existing lookup: from('tasks').select().eq().eq().neq().limit().maybeSingle()
//   - task insert: from('tasks').insert().select().single()
//   - timeline insert: from('agent_actions').insert()
function buildMockAdmin() {
  return {
    from: (tableName: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            neq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
      insert: (payload: Record<string, unknown>) => {
        insertSpy(tableName, payload);
        if (tableName === 'agent_actions') return Promise.resolve({ data: null, error: null });
        return {
          select: () => ({
            single: async () => ({
              data: {
                id: 'task-uuid-from-supabase',
                title: payload.title,
                status: payload.status,
                created_at: '2026-05-19T01:00:00.000Z',
              },
              error: null,
            }),
          }),
        };
      },
    }),
  };
}

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => buildMockAdmin(),
}));

import { POST } from '../add-ons/route';
import { NextRequest } from 'next/server';

function makeReq(addOnId: string): NextRequest {
  return new NextRequest('http://localhost/api/command-center/control-panel/add-ons', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ addOnId }),
  });
}

describe('POST /api/command-center/control-panel/add-ons — happy path', () => {
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
  });

  it('returns the canonical success outcome and inserts with assignee_type=self', async () => {
    const res = await POST(makeReq('voice'));
    expect(res.status).toBe(200);

    const body = await res.json();
    // Canonical success-shape contract — mapAddOnResult reads exactly these fields.
    expect(body).toMatchObject({
      ok: true,
      existing: false,
      crm_task_id: 'task-uuid-from-supabase',
      task_status: 'blocked',
    });
    expect(typeof body.task_title).toBe('string');
    expect(body.task_title).toMatch(/Approve add-on:/);

    // The actual fix verification — the inserted payload's assignee_type
    // must be 'self' (the post-#156 value), not 'human' (the bug pre-fix).
    const taskInsertCalls = insertSpy.mock.calls.filter(([tableName]) => tableName === 'tasks');
    expect(taskInsertCalls).toHaveLength(1);
    const insertedPayload = taskInsertCalls[0][1] as Record<string, unknown>;
    expect(insertedPayload.assignee_type).toBe('self');
    expect(insertedPayload.workspace_id).toBe('adedf006-ca69-47d4-adbf-fc91bd7f225d');
    expect(insertedPayload.status).toBe('blocked');
    expect(insertedPayload.priority).toBe('high');
  });

  it('returns 503 crm_not_configured when UNITE_CRM_WORKSPACE_ID is empty', async () => {
    delete process.env.UNITE_CRM_WORKSPACE_ID;
    try {
      const res = await POST(makeReq('voice'));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'crm_not_configured' });
    } finally {
      process.env.UNITE_CRM_WORKSPACE_ID = 'adedf006-ca69-47d4-adbf-fc91bd7f225d';
    }
  });

  it('returns 400 invalid_add_on for an unknown addOnId', async () => {
    const res = await POST(makeReq('does-not-exist'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_add_on' });
  });
});
