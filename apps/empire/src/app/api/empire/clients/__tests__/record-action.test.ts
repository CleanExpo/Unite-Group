import { recordClientAction } from '../_record-action';

interface InsertCall {
  table: string;
  row: Record<string, unknown>;
}

function makeMockSupabase(state: { inserts: InsertCall[]; throws?: boolean }) {
  return {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        if (state.throws) return Promise.reject(new Error('mock'));
        state.inserts.push({ table, row });
        return Promise.resolve({ data: null, error: null });
      },
    }),
  } as unknown as Parameters<typeof recordClientAction>[0]['supabase'];
}

describe('recordClientAction', () => {
  it('writes source=system, action_type=client_created on kind="created"', async () => {
    const state = { inserts: [] as InsertCall[] };
    await recordClientAction({
      supabase: makeMockSupabase(state),
      kind: 'created',
      slug: 'acme',
      actorEmail: 'phill@unite-group.in',
      companyName: 'Acme',
    });
    expect(state.inserts[0].table).toBe('agent_actions');
    expect(state.inserts[0].row.source).toBe('system');
    expect(state.inserts[0].row.action_type).toBe('client_created');
    expect(state.inserts[0].row.status).toBe('done');
    expect(state.inserts[0].row.idea_text).toMatch(/Client created: Acme/);
  });

  it('writes action_type=client_updated and lists touched fields', async () => {
    const state = { inserts: [] as InsertCall[] };
    await recordClientAction({
      supabase: makeMockSupabase(state),
      kind: 'updated',
      slug: 'acme',
      actorEmail: 'phill@unite-group.in',
      companyName: 'Acme',
      fields: ['brand_config', 'status'],
    });
    expect(state.inserts[0].row.action_type).toBe('client_updated');
    expect(state.inserts[0].row.idea_text).toMatch(/Client updated: Acme \(brand_config, status\)/);
    const payload = state.inserts[0].row.payload as Record<string, unknown>;
    expect(payload.fields).toEqual(['brand_config', 'status']);
    expect(payload.actor_email).toBe('phill@unite-group.in');
  });

  it('omits the field list from idea_text when no fields supplied', async () => {
    const state = { inserts: [] as InsertCall[] };
    await recordClientAction({
      supabase: makeMockSupabase(state),
      kind: 'updated',
      slug: 'acme',
      actorEmail: 'x@y.com',
      companyName: 'Acme',
    });
    expect(state.inserts[0].row.idea_text).toBe('Client updated: Acme');
  });

  it('falls back to slug when companyName is missing', async () => {
    const state = { inserts: [] as InsertCall[] };
    await recordClientAction({
      supabase: makeMockSupabase(state),
      kind: 'created',
      slug: 'acme',
      actorEmail: 'x@y.com',
    });
    expect(state.inserts[0].row.idea_text).toMatch(/Client created: acme/);
  });

  it('swallows insert errors — audit failures are not fatal to the request', async () => {
    const state = { inserts: [] as InsertCall[], throws: true };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      recordClientAction({
        supabase: makeMockSupabase(state),
        kind: 'created',
        slug: 'acme',
        actorEmail: 'x@y.com',
      }),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
