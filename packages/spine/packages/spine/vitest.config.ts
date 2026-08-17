import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Integration suites self-skip when SPINE_DATABASE_URL is unset (see tests/integration/*).
    //
    // fileParallelism stays FALSE — but for a different reason than before, and the
    // distinction is the whole point of UNI-2597.
    //
    // It used to stand in for isolating the DESTRUCTIVE suite: idempotency.test.ts
    // drops all eight spine schemas, and serialising it plus restoring schema+seed in
    // its afterAll kept the other suites alive. That pairing is gone. The destructive
    // suite now owns a separate database (SPINE_MIGRATION_DATABASE_URL), so it is
    // isolated STRUCTURALLY and the restore hook is deleted. Ordering was never
    // isolation: run sequentially, that suite still sorted ahead of the
    // data-dependent ones and left the schemas rebuilt but UNSEEDED.
    //
    // What remains is a SEPARATE, MEASURED problem the ticket did not cover, raised by
    // independent review and then reproduced: the NON-destructive suites interfere with
    // EACH OTHER. c3_completeness and match_isolation both insert into field.evidence
    // for org A, and c3 asserts HNSW recall against a brute-force scan of the same
    // vector — so rows appearing mid-test change what "the true nearest 200" are
    // between its two queries.
    //
    // Measured on a real local Supabase, same tree, same fixture:
    //     fileParallelism default -> 4 passed / 2 FAILED out of 6 runs
    //     fileParallelism false   -> 6 passed / 0 failed out of 6 runs
    // Both failures were c3's recall assertion. An earlier clean run of 4 was luck, and
    // is exactly why "it passed a few times" is not evidence about a race.
    //
    // So this is kept deliberately, against UNI-2597's step 2, which said to restore
    // the default. That instruction's rationale was wall-clock, not correctness, and it
    // analysed the destructive collision only. Removing it here would ship a test that
    // fails one run in three.
    //
    // The proper fix is to give those suites non-overlapping fixtures (or their own
    // org), after which this line can go. That is a separate change with its own
    // evidence, not something to smuggle in here.
    fileParallelism: false,
  },
});
