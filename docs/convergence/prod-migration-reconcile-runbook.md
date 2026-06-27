# Prod migration reconcile — runbook (Phill-run, prod writes)

> **Status:** prepared 2026-06-27. Two targeted fixes for known symptoms. **Run by Phill against prod
> `lksfwktwtmyznckodsau` only.** Never autonomous (CLAUDE.md DB rule). Each step has a read-only
> pre-check and a post-check.
>
> Run from `apps/web/` (the linked Supabase project). CLI verified: `supabase` 2.98.2, project linked.

## Critical safety finding — do NOT run `supabase db push`

`supabase migration list --linked` shows the history is **diverged in both directions** (verified
counts, 2026-06-27: **57 local-only, 95 prod-only, 3 aligned**):

- 57 local migrations are absent from prod (Local-only): incl. `20260612000000`, `20260617*`,
  `20260618*`, `20260620*`, **`20260622000000_nexus_routing_audit`**, `20260623000000`,
  `20260626060000`, `20260627000000`, `20260627010000` (and ~48 more).
- 95 prod-only migrations aren't local: `00000000000000`, `001`–`036`, `20260603034518`,
  `20260609*`, `20260615*`, `20260627034723`, …

➡ **`supabase db push --linked` would attempt to push all 57 local-only migrations to the shared
1747-table prod DB**, not just the table you want. Use the surgical steps below instead. These two
fixes resolve only the two named symptoms; they do NOT reconcile the full bidirectional drift (a
larger, separate effort — see "Deferred" at the bottom).

---

## Item 1 — Repair the phantom `00000000000000` baseline row

Metadata-only: updates `supabase_migrations.schema_migrations`, touches no schema or data.

**Pre-check (read-only):**
```bash
cd apps/web
supabase migration list --linked | grep 00000000000000
# expect: a row with Remote = 00000000000000, Local blank
```

**Action (prod write — Phill):**
```bash
supabase migration repair 00000000000000 --status reverted --linked
```

**Post-check:**
```bash
supabase migration list --linked | grep 00000000000000 || echo "baseline row cleared from history"
```

---

## Item 2 — Create `nexus_routing_audit` in prod (the silent-no-op insert)

`src/lib/nexus/audit-logger.ts` inserts into `public.nexus_routing_audit`; the table is absent in prod,
so the insert fails soft (`console.warn`) and routing decisions are not persisted. The migration
`20260622000000_nexus_routing_audit.sql` exists in-repo but was never applied.

**Why not `db push`:** see safety finding above. Apply just this one table's SQL directly, then mark
the single migration applied so history reflects reality.

**Pre-check (run in Supabase SQL editor — read-only):**
```sql
select to_regclass('public.nexus_routing_audit') as tbl;   -- expect NULL (absent)
```

**Action step 2a — run the table SQL in the prod SQL editor** (idempotent `CREATE TABLE IF NOT EXISTS`;
verbatim from `apps/web/supabase/migrations/20260622000000_nexus_routing_audit.sql`):
```sql
CREATE TABLE IF NOT EXISTS public.nexus_routing_audit (
  id                            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  decided_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  work_type                     TEXT        NOT NULL,
  complexity                    INTEGER     NOT NULL CHECK (complexity BETWEEN 0 AND 100),
  complexity_tier               TEXT        NOT NULL CHECK (complexity_tier IN ('high', 'medium', 'low')),
  token_budget_remaining        BIGINT      NOT NULL,
  selected_provider             TEXT        NOT NULL,
  selected_model                TEXT        NOT NULL,
  capability_score              INTEGER     NOT NULL,
  estimated_cost_per_1m_tokens  NUMERIC(10, 6) NOT NULL,
  reasoning                     TEXT        NOT NULL
);

ALTER TABLE public.nexus_routing_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON public.nexus_routing_audit;
CREATE POLICY "service_role_all" ON public.nexus_routing_audit
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS nexus_routing_audit_decided_at_idx
  ON public.nexus_routing_audit (decided_at DESC);
CREATE INDEX IF NOT EXISTS nexus_routing_audit_model_decided_idx
  ON public.nexus_routing_audit (selected_model, decided_at DESC);
CREATE INDEX IF NOT EXISTS nexus_routing_audit_tier_decided_idx
  ON public.nexus_routing_audit (complexity_tier, decided_at DESC);
```
> Note vs the raw migration file: `DROP POLICY IF EXISTS` + named `CREATE INDEX IF NOT EXISTS` are
> added here so the block is fully re-runnable. Behaviour is identical to the migration on a clean apply.

**Action step 2b — register the migration as applied (prod write — Phill):**
```bash
cd apps/web
supabase migration repair 20260622000000 --status applied --linked
```

**Post-check:**
```sql
select to_regclass('public.nexus_routing_audit') as tbl;   -- expect 'nexus_routing_audit' (present)
```
Then confirm a live routing decision persists (no more `[nexus/audit-logger] Failed to persist…` warn),
or:
```sql
select count(*) from public.nexus_routing_audit;
```

---

## Deferred — full history reconciliation (NOT in scope of these two fixes)

The bidirectional drift (dozens of local-only ↔ prod-only migrations) remains. Until reconciled,
`supabase db push` stays unsafe and `migration list` will keep showing mismatches. Reconciling
properly means auditing each local-only migration against prod's actual schema and repair-marking
applied/reverted per version — a dedicated session, owner-gated. Tracked in
[[nexus-prod-migration-drift]] memory.
