import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Integration suites self-skip when SPINE_DATABASE_URL is unset (see tests/integration/*).
    //
    // File parallelism is back at the DEFAULT (UNI-2597). The destructive
    // migration suite is now isolated STRUCTURALLY — idempotency.test.ts owns a
    // separate database, SPINE_MIGRATION_DATABASE_URL — rather than by scheduling.
    //
    // The previous arrangement here (fileParallelism:false plus a restore hook in
    // that suite) was serialisation standing in for isolation, and it did not hold:
    // sequentially, idempotency still sorts ahead of the data-dependent suites and
    // leaves the schemas rebuilt but UNSEEDED, so they fail on empty tables unless
    // the restore hook also runs — and that hook needs a role bypassing RLS, since
    // the tables are FORCE ROW LEVEL SECURITY. Two coupled mechanisms and a durable
    // dependency on file order, where a second database is one `create database`.
    //
    // Removing the shared state removes the reason to serialise, so the
    // non-destructive suites run concurrently again and wall-clock does not regress.
  },
});
