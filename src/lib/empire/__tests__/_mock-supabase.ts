// Shared in-memory Supabase mock for the empire readers (UNI-2024 follow-up).
// Each reader does `.from(table).select(...).eq/in/gte/order/limit/single...`
// with no writes — this mock satisfies that contract.
//
// Usage:
//   const supabase = makeMockSupabase({ rows: { businesses: [...] } });
//   getAdminClient is patched globally via jest.mock('@/lib/supabase/admin').

export interface MockCall {
  method: string;
  args: unknown[];
}

export interface ReaderMockState {
  rows: Record<string, unknown[]>;
  /** Tables that should error at the terminal call. */
  errors?: Set<string>;
  /** When set, .single() returns this for the named table. */
  single?: Record<string, unknown | null>;
  /** Recorded query-builder calls (from/select/eq/in/gte/order/limit). */
  calls?: MockCall[];
}

export function makeMockSupabase(state: ReaderMockState) {
  function record(method: string, args: unknown[]) {
    if (!state.calls) state.calls = [];
    state.calls.push({ method, args });
  }

  function chain(table: string) {
    const terminal = () => {
      if (state.errors?.has(table)) {
        return { data: null, error: { message: `mock_${table}_failed` } };
      }
      return { data: state.rows[table] ?? [], error: null };
    };
    // The chain is thenable — any await on the builder resolves to the
    // table's rows. Supabase's PostgrestFilterBuilder works the same way
    // (every method returns the builder; awaiting executes the query).
    type Resolver = (v: { data: unknown; error: { message: string } | null }) => unknown;
    const c: Record<string, unknown> = {
      select: (...args: unknown[]) => { record('select', args); return c; },
      eq: (...args: unknown[]) => { record('eq', args); return c; },
      in: (...args: unknown[]) => { record('in', args); return c; },
      gte: (...args: unknown[]) => { record('gte', args); return c; },
      not: (...args: unknown[]) => { record('not', args); return c; },
      order: (...args: unknown[]) => { record('order', args); return c; },
      limit: (...args: unknown[]) => { record('limit', args); return c; },
      then: (onFulfilled: Resolver) => Promise.resolve(terminal()).then(onFulfilled),
      maybeSingle: () =>
        Promise.resolve({
          data: state.single?.[table] ?? null,
          error: state.errors?.has(table) ? { message: `mock_${table}_failed` } : null,
        }),
      single: () =>
        Promise.resolve({
          data: state.single?.[table] ?? null,
          error: state.errors?.has(table) ? { message: `mock_${table}_failed` } : null,
        }),
    };
    return c;
  }

  return {
    from: (table: string) => {
      record('from', [table]);
      return chain(table);
    },
  };
}
