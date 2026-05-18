// Shared in-memory Supabase mock for the empire readers (UNI-2024 follow-up).
// Each reader does `.from(table).select(...).eq/in/gte/order/limit/single...`
// with no writes — this mock satisfies that contract.
//
// Usage:
//   const supabase = makeMockSupabase({ rows: { businesses: [...] } });
//   getAdminClient is patched globally via jest.mock('@/lib/supabase/admin').

export interface ReaderMockState {
  rows: Record<string, unknown[]>;
  /** Tables that should error at the terminal call. */
  errors?: Set<string>;
  /** When set, .single() returns this for the named table. */
  single?: Record<string, unknown | null>;
}

export function makeMockSupabase(state: ReaderMockState) {
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
      select: () => c,
      eq: () => c,
      in: () => c,
      gte: () => c,
      not: () => c,
      order: () => c,
      limit: () => c,
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

  return { from: chain };
}
