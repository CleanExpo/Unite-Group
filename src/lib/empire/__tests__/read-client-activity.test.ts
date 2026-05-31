import { makeMockSupabase, type ReaderMockState } from './_mock-supabase';

const mockState: { current: ReaderMockState } = { current: { rows: {} } };

jest.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => makeMockSupabase(mockState.current),
}));

import { readClientActivity } from '../read-client-activity';

beforeEach(() => {
  mockState.current = { rows: {} };
});

describe('readClientActivity query shape', () => {
  it('queries agent_actions with the exact select/in/eq/order/limit contract', async () => {
    await readClientActivity('acme');
    const calls = mockState.current.calls ?? [];
    const fromCall = calls.find((c) => c.method === 'from');
    expect(fromCall?.args[0]).toBe('agent_actions');

    const selectCall = calls.find((c) => c.method === 'select');
    expect(selectCall?.args[0]).toBe(
      'id, action_type, status, idea_text, payload, created_at',
    );

    const inCall = calls.find((c) => c.method === 'in');
    expect(inCall?.args[0]).toBe('action_type');
    expect(inCall?.args[1]).toEqual(['client_created', 'client_updated']);

    const eqCall = calls.find((c) => c.method === 'eq');
    expect(eqCall?.args[0]).toBe('payload->>slug');
    expect(eqCall?.args[1]).toBe('acme');

    const orderCall = calls.find((c) => c.method === 'order');
    expect(orderCall?.args[0]).toBe('created_at');
    expect(orderCall?.args[1]).toEqual({ ascending: false });

    const limitCall = calls.find((c) => c.method === 'limit');
    expect(limitCall?.args[0]).toBe(20);
  });

  it('respects a caller-provided limit instead of the default 20', async () => {
    await readClientActivity('acme', 50);
    const calls = mockState.current.calls ?? [];
    const limitCall = calls.find((c) => c.method === 'limit');
    expect(limitCall?.args[0]).toBe(50);
  });
});

describe('readClientActivity', () => {
  it('returns an empty list when no agent_actions match', async () => {
    const out = await readClientActivity('acme');
    expect(out).not.toBeNull();
    expect(out?.rows).toEqual([]);
    expect(out?.fetchedAt).toMatch(/T.*Z$/);
  });

  it('maps payload->>actor_email and payload->>fields to the row shape', async () => {
    mockState.current = {
      rows: {
        agent_actions: [
          {
            id: 'a1',
            action_type: 'client_updated',
            status: 'done',
            idea_text: 'Client updated: Acme (brand_config, status)',
            payload: {
              slug: 'acme',
              actor_email: 'phill@unite-group.in',
              fields: ['brand_config', 'status'],
              company_name: 'Acme',
            },
            created_at: '2026-05-18T12:00:00Z',
          },
        ],
      },
    };
    const out = await readClientActivity('acme');
    expect(out?.rows).toHaveLength(1);
    expect(out?.rows[0]).toEqual({
      id: 'a1',
      action_type: 'client_updated',
      status: 'done',
      idea_text: 'Client updated: Acme (brand_config, status)',
      actor_email: 'phill@unite-group.in',
      fields: ['brand_config', 'status'],
      created_at: '2026-05-18T12:00:00Z',
    });
  });

  it('returns null when Supabase errors', async () => {
    mockState.current = { rows: {}, errors: new Set(['agent_actions']) };
    const out = await readClientActivity('acme');
    expect(out).toBeNull();
  });

  it('safely handles missing / malformed payload fields', async () => {
    mockState.current = {
      rows: {
        agent_actions: [
          {
            id: 'a1',
            action_type: 'client_created',
            status: 'done',
            idea_text: null,
            payload: { slug: 'acme' },          // no actor_email, no fields
            created_at: '2026-05-18T12:00:00Z',
          },
          {
            id: 'a2',
            action_type: 'client_updated',
            status: 'done',
            idea_text: 'x',
            payload: { slug: 'acme', fields: ['ok', 42, null, 'also-ok'] }, // mixed
            created_at: '2026-05-18T13:00:00Z',
          },
        ],
      },
    };
    const out = await readClientActivity('acme');
    expect(out?.rows).toHaveLength(2);
    expect(out?.rows[0].actor_email).toBeNull();
    expect(out?.rows[0].fields).toBeNull();
    // Mixed-type field arrays drop non-string entries.
    expect(out?.rows[1].fields).toEqual(['ok', 'also-ok']);
  });
});
