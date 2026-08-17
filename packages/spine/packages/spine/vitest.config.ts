import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Integration suites self-skip when SPINE_DATABASE_URL is unset (see tests/integration/*).
    //
    // NO FILE PARALLELISM. Every integration suite shares ONE database, and
    // tests/integration/idempotency.test.ts drops all eight spine schemas to
    // prove the migration set rebuilds from empty. Run in parallel, that drop
    // lands while the other suites are mid-query, and CI reports things like
    // `relation "field.job" does not exist`, `schema "field" does not exist`
    // and `deadlock detected` — failures that look like defects in the RLS
    // policies and are actually just the destructive suite racing its
    // neighbours.
    //
    // This was invisible until UNI-2580 gave the job a real database: with
    // SPINE_DATABASE_URL unset, all of these suites skipped, so a destructive
    // migration test has coexisted with data-dependent tests unnoticed.
    //
    // Serialising is half the fix; idempotency.test.ts also restores the schema
    // and seed in afterAll, so files ordered after it still find their
    // fixtures. Removing either half reintroduces the failures above.
    fileParallelism: false,
  },
});
