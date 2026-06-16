// Coverage for the runAllGenerators orchestrator. The function is the
// shared critical path behind the daily cron AND the admin "Regenerate all"
// button, so a regression silently breaks two surfaces at once.
//
// These tests use a minimal in-memory Supabase mock — just enough to satisfy
// the .from(...).select(...).gte(...).order(...).limit(...) and
// .insert(...).select(...).single() chains the orchestrator calls.

import { ALL_GENERATOR_KINDS, runAllGenerators } from '../run-all-generators';

interface InsertCall {
  table: string;
  row: Record<string, unknown>;
}

interface UpdateCall {
  table: string;
  values: Record<string, unknown>;
  filters: { column: string; op: 'eq' | 'in'; value: unknown }[];
}

interface MockState {
  /** Rows to return per table for SELECT chains. */
  rows: Record<string, unknown[]>;
  /** Which tables (if any) should throw a SELECT error. */
  selectErrors: Set<string>;
  /** Which kinds should fail at INSERT. */
  insertErrors: Set<string>;
  /** Captured INSERTs for assertions. */
  inserts: InsertCall[];
  /** Captured UPDATEs for assertions. */
  updates: UpdateCall[];
  /** Counter for ID minting on successful INSERTs. */
  inserted_id_seq: number;
}

function makeMockSupabase(state: MockState) {
  function selectChain(table: string) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: () => {
        if (state.selectErrors.has(table)) {
          return Promise.resolve({ data: null, error: { message: `mock_${table}_failed` } });
        }
        return Promise.resolve({ data: state.rows[table] ?? [], error: null });
      },
    };
    return chain;
  }

  function makeInsertSubChain(table: string) {
    let captured: Record<string, unknown> | null = null;
    const sub = {
      select: () => sub,
      single: () => {
        if (!captured) {
          return Promise.resolve({ data: null, error: { message: 'no_row' } });
        }
        const kind = String(captured.kind);
        if (state.insertErrors.has(kind)) {
          return Promise.resolve({ data: null, error: { message: `mock_insert_${kind}_failed` } });
        }
        state.inserted_id_seq += 1;
        return Promise.resolve({
          data: { id: `mock_id_${state.inserted_id_seq}` },
          error: null,
        });
      },
      _capture: (row: Record<string, unknown>) => {
        captured = row;
        state.inserts.push({ table, row });
      },
    };
    return sub;
  }

  function makeUpdateSubChain(table: string, values: Record<string, unknown>) {
    const filters: UpdateCall['filters'] = [];
    const recordOnce = () => {
      if (!sub._recorded) {
        state.updates.push({ table, values, filters });
        sub._recorded = true;
      }
    };
    const sub = {
      _recorded: false,
      eq: (column: string, value: unknown) => {
        filters.push({ column, op: 'eq', value });
        return sub;
      },
      in: (column: string, value: unknown) => {
        filters.push({ column, op: 'in', value });
        return sub;
      },
      then: (onFulfilled: (v: { data: null; error: null }) => unknown) => {
        recordOnce();
        return Promise.resolve(onFulfilled({ data: null, error: null }));
      },
    };
    return sub;
  }

  function dataRoomBuilder(table: string) {
    return {
      insert: (row: Record<string, unknown>) => {
        const sub = makeInsertSubChain(table);
        sub._capture(row);
        return sub;
      },
      update: (values: Record<string, unknown>) => makeUpdateSubChain(table, values),
    };
  }

  return {
    from: (table: string) => {
      if (table === 'data_room_documents') return dataRoomBuilder(table);
      return selectChain(table);
    },
  } as unknown as Parameters<typeof runAllGenerators>[0]['supabase'];
}

function newState(): MockState {
  return {
    rows: {},
    selectErrors: new Set(),
    insertErrors: new Set(),
    inserts: [],
    updates: [],
    inserted_id_seq: 0,
  };
}

const AS_OF = new Date('2026-05-18T00:00:00.000Z');

describe('runAllGenerators', () => {
  it('inserts one row per recognised kind and returns ok for each', async () => {
    const state = newState();
    const supabase = makeMockSupabase(state);

    const results = await runAllGenerators({ supabase, asOf: AS_OF });

    expect(results).toHaveLength(5);
    for (const kind of ALL_GENERATOR_KINDS) {
      const r = results.find((x) => x.kind === kind);
      expect(r).toBeDefined();
      expect(r?.ok).toBe(true);
      expect(r?.document_id).toMatch(/^mock_id_/);
    }
    expect(state.inserts).toHaveLength(5);
    const insertedKinds = state.inserts.map((i) => i.row.kind).sort();
    expect(insertedKinds).toEqual([...ALL_GENERATOR_KINDS].sort());
  });

  it('every INSERT uses audit_status="pending" and the same as-of period_end', async () => {
    const state = newState();
    const supabase = makeMockSupabase(state);
    await runAllGenerators({ supabase, asOf: AS_OF });

    const expectedPeriodEnd = '2026-05-18';
    for (const ins of state.inserts) {
      expect(ins.row.audit_status).toBe('pending');
      expect(ins.row.period_end).toBe(expectedPeriodEnd);
    }
  });

  it('continues past a single per-kind INSERT failure and tags only that kind', async () => {
    const state = newState();
    state.insertErrors.add('pl_summary');
    const supabase = makeMockSupabase(state);

    const results = await runAllGenerators({ supabase, asOf: AS_OF });
    const failed = results.filter((r) => !r.ok);
    expect(failed).toHaveLength(1);
    expect(failed[0].kind).toBe('pl_summary');
    expect(failed[0].error).toContain('pl_summary');
    expect(results.filter((r) => r.ok)).toHaveLength(4);
  });

  it('tags every kind as failed when all INSERTs fail', async () => {
    const state = newState();
    for (const kind of ALL_GENERATOR_KINDS) state.insertErrors.add(kind);
    const supabase = makeMockSupabase(state);

    const results = await runAllGenerators({ supabase, asOf: AS_OF });
    expect(results.every((r) => !r.ok)).toBe(true);
    expect(new Set(results.map((r) => r.kind))).toEqual(new Set(ALL_GENERATOR_KINDS));
  });

  it('still inserts data-room rows when individual source SELECTs return null', async () => {
    // Simulate Stripe table missing — the orchestrator should still produce
    // a pl_summary payload (with zeros) and a vendor_contracts payload (empty).
    const state = newState();
    state.selectErrors.add('integration_stripe_subscriptions');
    state.selectErrors.add('integration_stripe_invoices_mtd');
    const supabase = makeMockSupabase(state);

    const results = await runAllGenerators({ supabase, asOf: AS_OF });
    const plResult = results.find((r) => r.kind === 'pl_summary');
    const vendorResult = results.find((r) => r.kind === 'vendor_contracts');
    expect(plResult?.ok).toBe(true);
    expect(vendorResult?.ok).toBe(true);
  });

  it('supersedes older pending+approved docs of the same kind before inserting', async () => {
    const state = newState();
    const supabase = makeMockSupabase(state);

    await runAllGenerators({ supabase, asOf: AS_OF });

    // One UPDATE per generated kind.
    expect(state.updates).toHaveLength(5);

    // Every UPDATE targets data_room_documents, sets audit_status='superseded',
    // and filters by (kind=<X>, audit_status IN ['pending','approved']).
    for (const update of state.updates) {
      expect(update.table).toBe('data_room_documents');
      expect(update.values).toEqual({ audit_status: 'superseded' });
      const eqFilter = update.filters.find((f) => f.op === 'eq');
      const inFilter = update.filters.find((f) => f.op === 'in');
      expect(eqFilter?.column).toBe('kind');
      expect(inFilter?.column).toBe('audit_status');
      expect(inFilter?.value).toEqual(['pending', 'approved']);
    }

    // Every recognised kind got its own supersede pass.
    const supersededKinds = state.updates
      .map((u) => u.filters.find((f) => f.op === 'eq')?.value)
      .sort();
    expect(supersededKinds).toEqual([...ALL_GENERATOR_KINDS].sort());
  });

  it('does not touch the rejected status when superseding (rejections are historical)', async () => {
    const state = newState();
    const supabase = makeMockSupabase(state);
    await runAllGenerators({ supabase, asOf: AS_OF });

    for (const update of state.updates) {
      const inFilter = update.filters.find((f) => f.op === 'in');
      expect(inFilter?.value).not.toContain('rejected');
      expect(inFilter?.value).not.toContain('superseded');
    }
  });

  it('produces a stable asOf timestamp across all 5 payloads', async () => {
    const state = newState();
    const supabase = makeMockSupabase(state);
    await runAllGenerators({ supabase, asOf: AS_OF });

    const generatedTimestamps = state.inserts.map((i) => {
      const payload = i.row.payload as { generated_at?: string };
      return payload.generated_at;
    });
    const unique = new Set(generatedTimestamps);
    expect(unique.size).toBe(1);
    expect(unique.has(AS_OF.toISOString())).toBe(true);
  });
});
