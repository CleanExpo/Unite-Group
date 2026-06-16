import { recordRegenerationAction } from '../record-cron-action';
import type { RunAllResult } from '../run-all-generators';

interface InsertCall {
  table: string;
  row: Record<string, unknown>;
}

function makeMockSupabase(state: { inserts: InsertCall[]; failNext?: boolean }) {
  return {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        if (state.failNext) {
          state.failNext = false;
          return Promise.reject(new Error('mock insert failed'));
        }
        state.inserts.push({ table, row });
        return Promise.resolve({ data: null, error: null });
      },
    }),
  } as unknown as Parameters<typeof recordRegenerationAction>[0]['supabase'];
}

const GENERATED_AT = '2026-05-18T12:34:56.000Z';

function okResult(kind: RunAllResult['kind']): RunAllResult {
  return { ok: true, kind, document_id: `doc_${kind}` };
}

function failResult(kind: RunAllResult['kind'], reason: string): RunAllResult {
  return { ok: false, kind, error: reason };
}

describe('recordRegenerationAction', () => {
  it('inserts source=system, action_type cron variant, status done on all-OK', async () => {
    const state = { inserts: [] as InsertCall[] };
    await recordRegenerationAction({
      supabase: makeMockSupabase(state),
      trigger: 'cron',
      results: [okResult('cohort_metrics'), okResult('pl_summary')],
      generatedAt: GENERATED_AT,
    });
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0].table).toBe('agent_actions');
    expect(state.inserts[0].row.source).toBe('system');
    expect(state.inserts[0].row.action_type).toBe('data_room_regenerate_cron');
    expect(state.inserts[0].row.status).toBe('done');
  });

  it('uses the admin action_type variant when trigger=admin', async () => {
    const state = { inserts: [] as InsertCall[] };
    await recordRegenerationAction({
      supabase: makeMockSupabase(state),
      trigger: 'admin',
      results: [okResult('ip_audit')],
      generatedAt: GENERATED_AT,
      actorEmail: 'phill.mcgurk@gmail.com',
    });
    expect(state.inserts[0].row.action_type).toBe('data_room_regenerate_admin');
    const payload = state.inserts[0].row.payload as Record<string, unknown>;
    expect(payload.actor_email).toBe('phill.mcgurk@gmail.com');
    expect(payload.trigger).toBe('admin');
  });

  it('sets status=failed when any kind failed', async () => {
    const state = { inserts: [] as InsertCall[] };
    await recordRegenerationAction({
      supabase: makeMockSupabase(state),
      trigger: 'cron',
      results: [okResult('cohort_metrics'), failResult('pl_summary', 'boom')],
      generatedAt: GENERATED_AT,
    });
    expect(state.inserts[0].row.status).toBe('failed');
    const payload = state.inserts[0].row.payload as Record<string, unknown>;
    expect(payload.kinds_ok).toEqual(['cohort_metrics']);
    expect(payload.kinds_failed).toEqual([{ kind: 'pl_summary', error: 'boom' }]);
  });

  it('idea_text summarises success vs failure for the activity log row', async () => {
    const okState = { inserts: [] as InsertCall[] };
    await recordRegenerationAction({
      supabase: makeMockSupabase(okState),
      trigger: 'cron',
      results: [okResult('cohort_metrics'), okResult('pl_summary')],
      generatedAt: GENERATED_AT,
    });
    expect(okState.inserts[0].row.idea_text).toMatch(/OK \(2 kinds\)/);

    const failState = { inserts: [] as InsertCall[] };
    await recordRegenerationAction({
      supabase: makeMockSupabase(failState),
      trigger: 'cron',
      results: [okResult('cohort_metrics'), failResult('pl_summary', 'x')],
      generatedAt: GENERATED_AT,
    });
    expect(failState.inserts[0].row.idea_text).toMatch(/1\/2 failed/);
  });

  it('swallows insert errors rather than throwing — observability writes are not fatal', async () => {
    const state = { inserts: [] as InsertCall[], failNext: true };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      recordRegenerationAction({
        supabase: makeMockSupabase(state),
        trigger: 'cron',
        results: [okResult('cohort_metrics')],
        generatedAt: GENERATED_AT,
      }),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
