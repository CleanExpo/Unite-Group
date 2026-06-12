# Spine build — progress (2026-06-09)

Sandbox: `Unite-Group Test` (`xgqwfwqumliuguzhshwv`), schema-isolated, fully reversible (`drop schema core/marketing/leadgen/onboarding/nrpg/carsi/field/sales cascade`). **No production data touched.**

## Applied migrations (in Supabase migration history)
- `spine_0001_core_identity` — `core` party/person/organization/party_identifier/org_membership + golden-record ledger (source_record, identity_audit) + tenant/role helpers + FORCE RLS.
- `spine_0002_modules` — marketing, leadgen(+lead_routing), onboarding, nrpg, sales, carsi, field(+evidence); FORCE RLS + policies; `party_visible()` extended with module ties.
- `spine_0003_match_and_lineage_rls` — RLS on lineage tables; `field.match_evidence` + `carsi.match_course` (pgvector).
- `spine_0004_grants` — `usage`/`select`/`execute` to `authenticated` (+ member writes on field/carsi/onboarding).

## GREEN so far (verified, evidence in session)
- ✅ **Schema applies clean** — 8 schemas, 20 tables, FORCE RLS on every tenant table; functions + policies created.
- ✅ **Single-identity E2E chain** — one lead → routed to org A → customer → job → evidence (all org A); membership, onboarding, CARSI credit, and Synthex campaign attribution all reference the one identity.
- ✅ **RLS isolation (cross-tenant)** — org B sees 0 of org A's leads/jobs/sales and 0 of the lead-contact PII (condition 2 closed); sees only its own org.
- ✅ **RLS positive** — org A sees exactly its slice, incl. PII via the legitimate routed-lead tie; cannot see sales.
- ✅ **Internal-staff** — `is_internal_staff()` live check = true for the operator; sees all orgs/persons/sales (condition 4).
- ✅ **Sales internal-only** — members get 0, staff gets the row.

## Conditions status (from adversarial review)
- C1 Synthex attribution — ✅ `marketing.campaign` + `campaign_id` on lead/application (seed-verified).
- C2 identity PII isolation — ✅ `party_visible()` chokepoint; cross-tenant PII = 0.
- C3 HNSW iterative_scan — ✅ **load-completeness test DONE + a real bug found and fixed** (see "C3 load test" below). `match_*` pin the four HNSW scan GUCs via **function-level SET clauses** (not body `set_config`): `iterative_scan=strict_order`, `ef_search=100`, **`max_scan_tuples=2147483647`**, **`scan_mem_multiplier=2`**. Committed self-asserting regression test `tests/c3_load_completeness.test.sql` (GREEN on sandbox).
- C4 internal_staff live + fail-closed — ✅ verified true/false correctly.
- C5 over-merge review queue — ⏳ `identity_audit` table in place; merge logic is migration-phase.
- C6 GREEN ≠ cutover predicate — ✅ honored; this is "spine compiles + isolates", not a cutover gate.

## type-gen + DAL — DONE (this pass)
- `spine_0005_match_iterative_scan` — `match_*` → `language sql STABLE` with four HNSW GUCs pinned via function-level SET clauses (C3; corrected from the earlier body-`set_config` form — see "C3 load test").
- `types/database.ts` — hand-authored spine domain types (sandbox gen-types unusable: 3.5M chars of unrelated tables; dedicated clean project will gen + CI-verify these).
- `data-access/` — server-side DAL via **postgres.js**: `withRls(ctx, fn)` sets JWT claims + `authenticated` role per request (RLS-scoped); spine schemas stay PRIVATE (not exposed to PostgREST); `matchEvidence` wraps the C3 RPC; Langfuse `trace()` seam; `asService` for migration-only bypass.
- `package.json` + `tsconfig.json` → **`tsc --noEmit` EXIT=0 (green)**.

## CI harness + idempotency/teardown — DONE (this pass)
- All migrations now in repo: `migrations/0000_teardown.sql` + `0001..0005`; `seed/0001_seed.sql`.
- Vitest suite: `tests/unit.test.ts` (pure helpers), `tests/integration/rls.test.ts` (RLS matrix via DAL), `tests/integration/idempotency.test.ts` (teardown→apply→reproduce). Integration self-skips without `SPINE_DATABASE_URL`.
- DAL connection made **lazy** so the module imports without a DB.
- **`npm test` → EXIT=0** (3 unit pass, 7 integration skipped) and **`npm run typecheck` → EXIT=0**.
- Teardown proven self-contained (read-only): `inbound_fks_from_outside_spine = 0`; head = 20 tables / 7 functions.
- Runbook: `tests/README.md`.

## Strangler resolver (C5) — DONE (this pass)
- `strangler/0001_resolver.sql` (+ `0002` role-email fix) — `migrate` schema: source_party staging,
  role_email guard, `resolve_one`/`backfill`/`coverage`. Applied as `spine_strangler_0001/0002`.
- Tested green on sandbox (`strangler/0001_resolver.test.sql`, 9 assertions): ABN hard-merge,
  dirty-email merge, **role-email under-merge + `identity_audit` review queue** (2 contractors on
  `info@` → 2 distinct parties, NO over-merge), `is_test` skip, coverage missing=0. Sandbox restored
  to pristine 7-party seed afterwards.
- Build loop caught a real bug: two people sharing a role email collided on `person_email_uidx` →
  fix = never store a role email as personal identity; detect collisions via the staging table.

## All six review conditions now ✅ (C1 C2 C3 C4 C5 C6).

## Strangler dual-write outbox + shadow-read harness — DONE (this pass)
- `strangler/0003_dual_write_outbox.sql` — `migrate.outbox` (event log) + `outbox_receipt` (exactly-once
  ledger) + `outbox_dead` (poison quarantine); `enqueue` (pure append, dedup), `relay_batch` (skip-locked
  claim + per-entity ordering guard + transient-error classification), `resolve_or_update` (idempotent —
  closes the resolve_one orphan-re-mint trap), `_merge_into` (controlled reversible merge), `_reconcile`
  (in-place field tightening + promote-merge), `_apply_delete` (soft-deactivate + resurrection-safe),
  `reap_stuck`. Applied as `spine_strangler_0003*`. **R1 fix:** resolve_one's abn/email lookups now filter
  `golden_party_id is null` (never re-select a tombstone).
- `strangler/0004_shadow_read_diff.sql` — `migrate.shadow_diff` + `shadow_scan` (fact-driven whitelist:
  role-email / review-queued / merge-survivor) + `shadow_summary` (the **cutover parity predicate**
  `parity_ok` = no unexplained diff + no orphan + nothing pending/dead). Includes a **detection proof**
  (a deliberately-corrupted clean field flips parity_ok false and pins the exact field).
- Tests GREEN on the sandbox: `0003_*.test.sql` (T1–T10) + `0004_*.test.sql` (S1–S5). Covers orphan-trap
  exactly-once, reconcile, promote-merge, concurrency drain, poison dead-letter, idempotent delete,
  resurrection, conflicting-abn→review, edited-survivor parity, role-email scoping, extra/missing lineage,
  and the detection proof. Sandbox restored to the pristine 7-party seed after each run.
- **Adversarial review (multi-agent): 21 findings → 10 confirmed, all fixed + re-tested** — orphan re-mint,
  resurrection split, transient-error dead-letter, merge identifier over-merge (x2 critical), blanket
  review suppression (critical), survivor mis-classification (x2), conflicting-abn auto-merge, reversibility
  doc. 11 refuted (advisory-lock deadlock, global-orphan false-positive, search_path escalation, etc.).
- Canonical 0003/0004 re-applied from repo text + smoke-verified (repo is the source of truth).
- Concurrency residual (documented): true wall-clock two-relayer races aren't reachable through one MCP
  connection — correctness is by construction (skip-locked + ordering guard + receipt PK + advisory locks);
  a real two-session race test belongs in the CI vitest harness.

## C3 pgvector two-tenant load-completeness test — DONE (this pass), caught a real bug
- Committed `tests/c3_load_completeness.test.sql` (self-asserting, RAISE-on-fail, cleans up to pristine).
  Deterministic dense fixture: 130 "Bravo" rows NEAR the query + 12 "Alpha" rows within-threshold but at
  global ranks **131–142** (beyond `ef_search=100`); Bravo>=ef_search is the guard that keeps the iterative
  path actually exercised. Sections: A exact-path completeness (the natural plan) + Hole-2 NULL-embedding
  alarm + guard; B forced-HNSW mechanism; C scan-budget regression guard; D RLS-only production path; E
  reverse isolation. All GREEN; stability verified 5×/5× across a REINDEX.
- **Adversarial review (5 skeptics, 2 ran live SQL) flipped the original "green" → found 2 real problems:**
  1. **The first green was VACUOUS.** At 142 rows the planner uses the EXACT `btree(org_id)+Sort` plan, never
     HNSW — so `iterative_scan` did zero work. The under-return is a LARGE-N / HNSW-plan phenomenon; for
     filtered queries the exact path is chosen (and is complete) until the table is large. So at P0 scale
     filtered recall is already complete; the GUCs are **defense-in-depth** for the scale where HNSW is chosen.
  2. **REAL BUG in the deployed fix:** `iterative_scan='strict_order'` is NOT a completeness guarantee — it
     stops at `hnsw.max_scan_tuples` (**default 20000**), which `0005` never set. A tenant whose matches rank
     past the cap silently under-returns (verified: 1/12). **Fix:** pin `max_scan_tuples=2147483647` +
     `scan_mem_multiplier=2`. Second subtlety: a plpgsql **body `set_config(...,true)` is overridden by any
     ambient `SET LOCAL`** (and is unreliable for `RETURN QUERY`) — so the GUCs must be **function-level SET
     clauses** (verified: body form 1/12 vs SET-clause form 12/12 under a hostile ambient cap). This realigns
     `0005` with `sql/match_template.sql` (also updated to carry all four GUCs).
- Discounted subagent claims (verified): suggested `max_scan_tuples=-1` is invalid (range 1..2147483647);
  6dp/float4 rounding is a non-issue (distance gap 0.25 >> 5e-8).

## Next (to full GREEN)
- dedicated clean spine project + `supabase gen types` verifying `types/database.ts`; apply `0001..0005` +
  run all `*.test.sql` (incl. `c3_load_completeness.test.sql`) there (catches repo-text drift the sandbox can't).
  NB: `0005`'s CREATE-with-SET-clause needs the pgvector lib loaded first — fine in sequence (`0002` builds
  the HNSW indexes), but a warmup is needed if `0005` is ever applied in isolation.
- CI vitest harness (real JWTs / real connections) — RLS matrix + the C3 completeness/cap assertions + a
  two-relayer concurrency race for the outbox. (C3 vitest deferred here; the `*.test.sql` is the guard for now.)
- C3 residuals (documented, not blocking): `max_scan_tuples=INT_MAX` trades latency for completeness only when
  HNSW is the chosen plan — if pure metadata-filtered semantic search over a huge evidence table becomes hot,
  add per-tenant PARTIAL HNSW indexes (complete AND bounded). `carsi.match_course` carries the same GUC fix but
  has no two-tenant test (global catalog by design). A `filter_metadata`-selective under-return case and a
  natural large-N (HNSW-chosen, unforced) demonstration are nice-to-haves the cap-sweep already covers in proxy.
- write the applied SQL back into `migrations/*.sql` via `supabase db pull` (canonical repo copy); also add
  the missing `strangler/0002_roleemail_fix.sql` repo file (applied on sandbox, not yet in repo).

## Gate (unchanged)
Production data cutover = the single human-gated, irreversible step. Not started.
