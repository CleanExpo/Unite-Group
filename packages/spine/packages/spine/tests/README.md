# Spine tests

Two layers:

- **Unit** (`unit.test.ts`) — pure helpers, no DB. Always run.
- **Integration** (`integration/*.test.ts`) — real RLS-scoped transactions through the DAL.
  Self-skip unless `SPINE_DATABASE_URL` points at a migrated + seeded instance.

## Run
```bash
npm test            # unit always; integration runs iff SPINE_DATABASE_URL is set
npm run typecheck   # tsc --noEmit
```

## CI (full GREEN)
```bash
supabase start                                   # local Postgres + auth + pgvector (or use an ephemeral branch)
export SPINE_DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
# build from empty → head, then seed:
for f in packages/spine/migrations/0001*.sql packages/spine/migrations/0002*.sql \
         packages/spine/migrations/0003*.sql packages/spine/migrations/0004*.sql \
         packages/spine/migrations/0005*.sql packages/spine/seed/0001_seed.sql; do
  psql "$SPINE_DATABASE_URL" -f "$f"
done
npm test            # RLS matrix + idempotency now execute
```

## What the integration suites assert
- **`rls.test.ts`** — the verified RLS matrix: org B walled off from org A (leads/jobs/PII/sales);
  org A sees its own slice incl. PII via the routed-lead tie; internal staff is cross-tenant.
- **`idempotency.test.ts`** — `0000_teardown` → apply `0001..0005` rebuilds the full spine
  (20 tables); teardown leaves zero objects; the cycle is re-runnable (reproducible).

`rls_matrix.sql` is the same matrix in raw SQL (PASS-verified on the build sandbox 2026-06-09).

## Raw-SQL suites (run via psql with `ON_ERROR_STOP`, as a service role, after migrations + seed)
- **`c3_load_completeness.test.sql`** — CONDITION 3: pgvector HNSW two-tenant filtered recall is COMPLETE
  (no silent under-return). Self-asserting; loads a deterministic 130-near / 12-far two-tenant fixture and
  cleans up to pristine. Proves the exact-path completeness (natural plan), the forced-HNSW under-return →
  fixed-fn completeness mechanism, the **`max_scan_tuples` scan-budget regression guard** (the bug the
  adversarial review caught), the RLS-only production path, and bidirectional isolation. See the file header
  for the full mechanism write-up.
- **`../strangler/0001_resolver.test.sql`**, **`0003_*.test.sql`**, **`0004_*.test.sql`** — the C5 resolver
  and dual-write/shadow-read harness suites.
