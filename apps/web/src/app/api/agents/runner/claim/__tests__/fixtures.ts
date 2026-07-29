/**
 * Shared stubs for the runner claim route tests.
 *
 * Kept out of a *.test.ts file on purpose: importing a spec to reuse a helper
 * re-registers its describe blocks and runs that whole suite a second time.
 */

/**
 * Minimal client answering the route's "how many missions are running?" query,
 * which enforces maxConcurrent. Returning rows simulates other in-flight
 * missions; an empty array means the lane is free.
 */
export function runningCountClient(rows: Array<{ id: string }>) {
  const chain = {
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: rows, error: null }),
  }
  return { from: () => ({ select: () => chain }) }
}

/** A client whose count query errors, to exercise the fail-closed path. */
export function countErrorClient() {
  const chain = {
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: null, error: { message: 'db down' } }),
  }
  return { from: () => ({ select: () => chain }) }
}
