# Step 2 — Supabase Consolidation Plan

> Companion to `cutover-and-deletion-runbook.md` Step 2 ("Supabase: one database").
> **Planning artifact only — no schema is changed by this document.** Execution is
> sandbox-first and gated; prod writes need Phill's explicit typed approval.
> Drafted 2026-06-16 from the live state of the projects.

## Objective

Collapse the CRM onto **one** canonical Supabase project, apply the three
unapplied CRM/billing migrations through the sandbox first, migrate any unique
live data off the old Authority-Site database, and point every env var at the
canonical project — so the old project can be retired (runbook D8).

## Canonical decision (confirmed)

| Role | Project | Ref | Status |
|---|---|---|---|
| **Canonical CRM DB (keep)** | Unite-Group | `lksfwktwtmyznckodsau` | ACTIVE_HEALTHY, PG 17, migration HEAD `20260615051458` |
| Sandbox (test migrations here first) | "Unite-Group Test" | `xgqwfwqumliuguzhshwv` | separate org/account — reach via `sandbox-wizard.sh`, **not** the Supabase MCP |
| Old Authority-Site DB (export then retire) | — | `uqfgdezadpkiadugufbs` | separate org/account — MCP returns "no permission"; reach with direct creds |

> **Access reality (verified 2026-06-16):** the Supabase MCP can read the
> canonical prod project but **cannot** reach the sandbox or the old
> Authority-Site DB (different org). Therefore every migration/diff/promote step
> below runs through `scripts/sandbox-wizard.sh` (1Password-gated psql), and the
> old-DB export uses a direct `pg_dump` with that project's own credentials.

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
> command-centre migrations; diff first (Step B) and only apply what's genuinely
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

### B. Sandbox-first migration (no prod writes)
```bash
# from repo root, per CLAUDE.md sandbox-first rule
./scripts/sandbox-wizard.sh sync                                   # mirror prod schema → sandbox
./scripts/sandbox-wizard.sh apply apps/web/supabase/migrations/20260612000000_stripe_events.sql
./scripts/sandbox-wizard.sh apply apps/web/supabase/migrations/20260612020000_crm_leads.sql
./scripts/sandbox-wizard.sh apply apps/web/supabase/migrations/20260612021000_crm_contacts_opportunities.sql
./scripts/sandbox-wizard.sh diff                                  # prod vs sandbox — review delta
```
**Gate:** the diff must show ONLY the three intended tables/objects, with RLS +
`founder_id` policies present on each (per `apps/web/.claude/rules/database/supabase.md`).

### C. Promote to canonical prod (Phill-gated)
```bash
./scripts/sandbox-wizard.sh promote apps/web/supabase/migrations/20260612000000_stripe_events.sql
./scripts/sandbox-wizard.sh promote apps/web/supabase/migrations/20260612020000_crm_leads.sql
./scripts/sandbox-wizard.sh promote apps/web/supabase/migrations/20260612021000_crm_contacts_opportunities.sql
# each promote requires the typed "promote to prod" confirmation
```

### D. Data import (only if Step A found unique data)
- `pg_dump --data-only` per identified table from the old DB → import into canonical
  prod with `founder_id` set to `FOUNDER_USER_ID`. Verify row counts + RLS visibility.

### E. Env cutover (point everything at the one DB)
- Confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` on the **`unite-group`** Vercel project (prod + preview)
  all target `lksfwktwtmyznckodsau`. (They already do — copied in Phase 2.)
- Decide `unite-group-sandbox`: point it at the **sandbox** Supabase
  (`xgqwfwqumliuguzhshwv`) for true isolation, rather than the prod values currently
  copied there (the open isolation item).

## Verification gates (before this step is "done")
- [ ] Sandbox diff clean (only the 3 objects), RLS + `founder_id` on each.
- [ ] `get_advisors(security)` on canonical prod shows no new RLS gaps after promote.
- [ ] CRM pages (contacts/opportunities) load real founder-scoped rows on `unite-group.in`.
- [ ] One Stripe test event writes a `stripe_events` row (overlaps runbook Step 3 — Rana).
- [ ] Old-DB export verified (or confirmed nil) — nothing unique left behind.

## Rollback
- Sandbox-only until Step C — zero prod impact.
- Each migration is forward-only with an idempotent guard; the old DB stays
  untouched as fallback until runbook Step 6 (soak) + D8.
- Full backups exist: Unite-Hub repo bundle (2026-06-16); take `pg_dump` of the old
  DB before any export (runbook Step 7 precondition).

## Open questions / risks
1. **Is `crm_leads` already live on prod?** CLAUDE.md says "`crm_leads` is live" — if
   so migration 2 is a no-op; verify in Step A to avoid a conflicting create.
2. **Old-DB access:** the MCP can't reach `uqfgdezadpkiadugufbs`; Step A needs its
   direct DB password (1Password `Unite-Group-Infrastructure`).
3. **op/sandbox-wizard blocker:** `sandbox-wizard.sh` needs the 1Password
   service-account token in Keychain (the recurring `hermes-op` setup) — confirm
   before Step B or it will stall.
4. **Migration-history mismatch** means `supabase db push` against prod is unsafe;
   the wizard's `pg_dump`-mirror + targeted `apply`/`promote` is the only safe path.
