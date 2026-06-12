# Cutover Runbook — RestoreAssist → Spine (first business)

**Status: DRAFT — rehearsal machinery proven on the sandbox; NOTHING here has touched production.**
Production cutover is a single human-gated, irreversible-by-policy step (RESUME.md "The gate").
Every phase before it is reversible and this document says how, per phase.

Why RestoreAssist first: the spine's data model was adapted from RestoreAssist's (locked decision),
so its field mapping is the closest to 1:1 of the six businesses — smallest impedance, best place
to debug the process itself. Live DB = the `udooy` Supabase project (prod-2026); the legacy `oxei`
project is empty and is NOT part of this cutover.

---

## 0. Preconditions (all must hold before Phase B)

| # | Precondition | How verified |
|---|---|---|
| P1 | CI green WITH integration: `SPINE_DATABASE_URL` secret set, RLS matrix + C3 + two-relayer race run live (not self-skipped) | Actions run shows 22 tests executed, 0 skipped |
| P2 | Spine migrations `0001..0005` + strangler `0001..0004` applied to the TARGET store | `select to_regclass('migrate.outbox')` etc. |
| P3 | RA → spine field mapping reviewed by Phill (one page: RA column → `{kind, display_name, email, abn, …}` payload) | Mapping doc committed to `docs/` |
| P4 | Session-auth layer for spine consumers (SYN-1019) unblocked OR cutover scoped to service-role paths only | Linear SYN-1019 |
| P5 | Phill available for `identity_audit` adjudication during Phase D | calendar commitment |
| P6 | Fresh verified backup of RA prod (`udooy`) + spine target | `pg_dump` / Supabase PITR confirmed |

**Where does the spine live in production?** Per Phill's locked decision (2026-06-09, no new infra):
the spine schemas run on the EXISTING stack. The target store for production cutover must be named
and ruled by Phill at P2 time — this runbook deliberately does not choose it.

## Phase A — Rehearsal on cloned RA data (reversible: drop schemas)

Already proven generically on sandbox fixtures (resolver 9/9, outbox T1–T10, shadow S1–S5,
two-relayer race). What remains is rehearsing with REAL RA-shaped data:

1. Clone a representative RA slice (1–5k contractors incl. known dirties: shared `info@` emails,
   duplicate ABNs, deleted rows) into `migrate.source_party` on the sandbox, tagged
   `source_system='restoreassist'`.
2. Enqueue every row: `select migrate.enqueue('restoreassist', <pk>, 'upsert', <payload>, <dedup>)`.
3. Drain with TWO relayers (mirrors the race test): loop `migrate.relay_batch('r1'|'r2', 100,
   'restoreassist')` concurrently until pending=0.
4. Adjudicate the `core.identity_audit` review queue (expected: role-email under-merges).
5. `select * from migrate.shadow_scan('restoreassist')` then
   `select parity_ok, orphan_parties, unexplained_diffs from migrate.shadow_summary('restoreassist')`.
6. **Exit criterion: `parity_ok = true` with ALL diffs either ok or fact-whitelisted, dead=0.**
   Record counts in this doc. Clean up fixture, sandbox pristine.

## Phase B — Production dual-write, writes only (reversible: remove enqueue hooks)

Legacy RA keeps serving ALL reads and writes. Each RA mutation additionally appends to
`migrate.outbox` (enqueue never touches `core.*` — zero blast radius on RA if the spine misbehaves).

1. Add enqueue calls at RA's write paths (service-role, transactional with the legacy write).
2. Run 2 relayer workers (small batch, e.g. 50) on a schedule (cron/Edge Function).
3. Watch: `select status, count(*) from migrate.outbox where source_system='restoreassist' group by 1;`
   — `dead` must stay 0; investigate any dead row via `migrate.outbox_dead.last_error`.
4. Soak for an agreed window (suggest ≥1 week of real traffic).

Rollback: delete the enqueue hooks. Legacy untouched throughout.

## Phase C — Backfill history (reversible: spine-side delete by lineage)

1. Stage all historical RA rows into `migrate.source_party` + enqueue (idempotent: dedup_key +
   `resolve_or_update` reconciles, never re-mints — proven).
2. Drain as in Phase B. Ordering with live dual-write traffic is safe: per-entity in-order guard
   serializes same-key events (proven under contention by the race test).

## Phase D — Shadow-read parity loop (reversible: nothing to revert; read-only)

1. `shadow_scan` on a schedule; track `unexplained_diffs` toward 0.
2. Phill adjudicates every open `identity_audit` row (the whitelist is fact-driven; an OPEN review
   suppresses only the field it concerns — unrelated corruption still fails parity. Detection
   capability is proven: a corrupted field flips `parity_ok` false and pins the field).
3. **Gate: `parity_ok = true` on N consecutive daily scans (suggest N=3) with live traffic flowing.**

## Phase E — THE CUTOVER (human-gated; the one irreversible-by-policy step)

Only after Phase D's gate, and only on Phill's explicit written go in this repo (PR approving the
cutover checklist):

1. Freeze RA writes (maintenance window) → final relay drain to pending=0, dead=0 → final
   `shadow_scan` → `parity_ok=true`.
2. Flip RA reads to the spine DAL (per-endpoint allowlist, not big-bang, if RA's architecture allows).
3. Reverse the write direction: RA writes go to the spine; legacy tables become the shadow (keep the
   outbox flowing spine→legacy during the bake period so a rollback target stays warm).
4. Bake period (suggest 2 weeks). Rollback during bake = flip reads back to legacy (still warm).
5. After bake: legacy RA tables become read-only archive. THIS is the irreversible moment.

## Standing invariants (any violation = stop and page Phill)

- `migrate.outbox` dead-letter count for `restoreassist` > 0 unresolved for >24h.
- `shadow_summary.orphan_parties` > 0 at any time.
- Any `identity_audit` hard-merge of two REAL distinct firms (over-merge) — the resolver
  under-merges by design; an over-merge is a bug, halt and treat as P0.
- RLS regression: any cross-org read in the vitest matrix (CI runs it every push once P1 holds).
