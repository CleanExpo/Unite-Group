# Step 2 — Supabase Consolidation Plan

> Companion to `cutover-and-deletion-runbook.md` Step 2 ("Supabase: one database").
> **Planning artifact only — no schema is changed by this document.** Execution is
> branch-first and gated: validate on a Supabase database branch, then promote to
> prod only via a merged + approved branch; prod writes need Phill's explicit
> typed approval. Drafted 2026-06-16 from the live state of the projects.

## Objective

Collapse the CRM onto **one** canonical Supabase project, validate the three
unapplied CRM/billing migrations on a Supabase database branch first, migrate any
unique live data off the old Authority-Site database, and point every env var at
the canonical project — so the old project can be retired (runbook D8).

## Canonical decision (confirmed)

| Role | Project | Ref | Status |
|---|---|---|---|
| **Canonical CRM DB (keep)** | Unite-Group | `lksfwktwtmyznckodsau` | ACTIVE_HEALTHY, PG 17, migration HEAD `20260615051458` |
| Migration validation | Supabase database branch (ephemeral, per-branch DB off `lksfwktwtmyznckodsau`) | — | created/merged via Supabase branching; the prior mirror sandbox project `xgqwfwqumliuguzhshwv` was DELETED 2026-06-15 and will NOT be replaced |
| Old Authority-Site DB (export then retire) | — | `uqfgdezadpkiadugufbs` | separate org/account — MCP returns "no permission"; reach with direct creds |

> **Access reality (verified 2026-06-16):** the Supabase MCP can read the
> canonical prod project but **cannot** reach the old Authority-Site DB
> (different org). Migrations are validated on a Supabase **database branch**
> (ephemeral per-branch DB) and promoted to prod ONLY by merging an approved
> branch — never applied to prod directly or autonomously. The old-DB export uses
> a direct `pg_dump` with that project's own credentials.

## The migration delta (precise)

These three migrations exist in `apps/web/supabase/migrations/` but are **NOT**
applied to canonical prod (confirmed against the prod migration list — it has the
stripe *billing columns* and `cc_command_centre_full`, but none of these):

| Order | File | Purpose |
|---|---|---|
| 1 | `20260612000000_stripe_events.sql` | Stripe webhook event ledger |
| 2 | `20260612020000_crm_leads.sql` | `crm_leads` table (already live? verify) |
| 3 | `20260612021000_crm_contacts_opportunities.sql` | `crm_contacts` + `crm_opportunities` |

> Note: `cc_command_centre` (apps/web `20260604000000` / `..010000`) appears on
> prod as the single `20260604225307_cc_command_centre_full` — i.e. prod's
> migration *history* was applied via different filenames than `apps/web` ships
> (the known "prod history unreproducible" issue). **Do not blind-replay**
> command-centre migrations; validate on a database branch first (Step B) and only apply what's genuinely
> missing — expected to be just the three above.

## Data to migrate off the old Authority-Site DB (`uqfgdezadpkiadugufbs`)

Audit-then-export — most CRM data already lives in the canonical project, so this
is expected to be small or nil. Candidate tables (per runbook): `stripe_events`,
client approvals, `businesses`/`organisations`, data-room documents. Export only
rows that are (a) unique to the old DB and (b) needed by the command-centre/billing
port, mapped to `founder_id` on import.

## Execution sequence (gated)

### A. Inventory (read-only, do first)
1. `pg_dump --schema-only` the old DB → list tables + row counts; confirm what (if
   anything) holds unique live data not already in `lksfwktwtmyznckodsau`.
2. On canonical prod, confirm whether `crm_leads` is already live (it may predate
   these files); if so, mark migration 2 as a no-op/idempotent guard.

### B. Branch-first migration validation (no prod writes)
1. Land the three migration files in `apps/web/supabase/migrations/` (they already exist).
2. Create a Supabase **database branch** off `lksfwktwtmyznckodsau` (ephemeral
   per-branch DB) and let the branch apply those migrations. **Never validate
   against prod.**
3. Inspect the branch's resulting schema — confirm only the three intended
   tables/objects appear, each with RLS + `founder_id` policies present (per
   `apps/web/.claude/rules/database/supabase.md`).

**Gate:** the branch must show ONLY the three intended tables/objects, with RLS +
`founder_id` policies present on each.

### C. Promote to canonical prod (Phill-gated)
- Promote to canonical prod (`lksfwktwtmyznckodsau`) **only by merging the
  approved database branch** — never apply the migrations to prod directly or
  autonomously.
- The merge to prod requires the typed "promote to prod" confirmation from Phill.

### D. Data import (only if Step A found unique data)
- `pg_dump --data-only` per identified table from the old DB → import into canonical
  prod with `founder_id` set to `FOUNDER_USER_ID`. Verify row counts + RLS visibility.

### E. Env cutover (point everything at the one DB)
- Confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` on the **`unite-group`** Vercel project (prod + preview)
  all target `lksfwktwtmyznckodsau`. (They already do — copied in Phase 2.)
- Decide `unite-group-sandbox`: with the mirror sandbox project deleted, point its
  env vars at an ephemeral **Supabase database branch** when isolation is needed,
  rather than the prod values currently copied there (the open isolation item).

## Verification gates (before this step is "done")
- [ ] Database-branch schema clean (only the 3 objects), RLS + `founder_id` on each.
- [ ] `get_advisors(security)` on canonical prod shows no new RLS gaps after promote.
- [ ] CRM pages (contacts/opportunities) load real founder-scoped rows on `unite-group.in`.
- [ ] One Stripe test event writes a `stripe_events` row (overlaps runbook Step 3 — Rana).
- [ ] Old-DB export verified (or confirmed nil) — nothing unique left behind.

## Rollback
- Database-branch-only until Step C — zero prod impact (just delete the branch).
- Each migration is forward-only with an idempotent guard; the old DB stays
  untouched as fallback until runbook Step 6 (soak) + D8.
- Full backups exist: Unite-Hub repo bundle (2026-06-16); take `pg_dump` of the old
  DB before any export (runbook Step 7 precondition).

## Open questions / risks
1. **Is `crm_leads` already live on prod?** CLAUDE.md says "`crm_leads` is live" — if
   so migration 2 is a no-op; verify in Step A to avoid a conflicting create.
2. **Old-DB access:** the MCP can't reach `uqfgdezadpkiadugufbs`; Step A needs its
   direct DB password (1Password `Unite-Group-Infrastructure`).
3. **Old-DB credential access:** `pg_dump` of the old Authority-Site DB still
   needs its direct DB password (1Password `Unite-Group-Infrastructure`) — confirm
   before Step A or the export will stall.
4. **Migration-history mismatch** means `supabase db push` against prod is unsafe;
   validating on a Supabase database branch and promoting only via a merged +
   approved branch is the only safe path.
