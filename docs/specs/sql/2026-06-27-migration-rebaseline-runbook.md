# Migration Rebaseline Runbook — Unite-Group Nexus (apps/web)

**Approved by Phill 2026-06-27.** Restores migration replayability so `supabase db reset`,
`supabase gen types --local`, and `create_branch` work again — the foundation the spec's
"validate on a DB branch" workflow depends on.

## Why this is needed (evidence)
- `supabase db reset` fails on a clean replay: `20260314000000_social_posts_table.sql`
  (jsonb default cast) and at least one later index migration (`owner_id` missing on replay).
- The repo's migration files have **diverged from prod**: prod has **97 tracked migrations
  and 1747 tables**; the repo has **59 migration files**; and the `20260612*` CRM migrations
  (`crm_leads`, `crm_contacts`, `crm_opportunities`) were **never applied to prod**
  (`june12_migrations_applied = 0`). Replaying the repo set does not reproduce prod.

The fix is the standard remedy: **squash to a single baseline** dumped from prod's *actual*
current schema, archive the old incremental files, and mark the baseline as already-applied.

## Steps (run in your terminal — needs your Supabase auth; cannot be done headless)

```bash
cd ~/pi-seo-workspace/unite-group/apps/web

# 1. Authenticate + link to prod
supabase login
supabase link --project-ref lksfwktwtmyznckodsau

# 2. Dump prod's CURRENT schema as the new baseline migration
supabase db dump --linked -f supabase/migrations/00000000000000_baseline.sql

# 3. Archive the old, non-replayable incremental migrations (keep history in git)
mkdir -p supabase/migrations/_archived_pre_baseline_2026-06-27
git mv supabase/migrations/2026*.sql supabase/migrations/_archived_pre_baseline_2026-06-27/

# 4. Tell prod the baseline is already applied (so it never re-runs it)
supabase migration repair --status applied 00000000000000

# 5. Prove replayability locally (Docker must be running)
supabase start
supabase db reset            # must now apply ONLY the baseline, cleanly
supabase gen types typescript --local > src/types/database.ts

# 6. Verify + ship
pnpm run type-check && pnpm run lint && pnpm run test && pnpm build
git add -A supabase/migrations src/types/database.ts
git commit -m "chore(db): rebaseline migrations from prod schema; restore replayability"
# open PR into main
```

## Decision baked into this (read before running)
The baseline = prod's **current** schema, so it will **NOT** include
`crm_leads` / `crm_contacts` / `crm_opportunities` (never deployed). If the revenue register
(spec B9) is wanted, re-author those three as a NEW migration *after* the baseline and apply
via the normal DB-branch → PR flow. If they were abandoned, delete the stale repo migration
files for them so they don't mislead.

## Verification (after step 5)
- `supabase db reset` exits 0 (no migration errors).
- `supabase gen types --local` regenerates a `database.ts` matching prod.
- A subsequent `create_branch` (via the Supabase MCP or dashboard) succeeds — confirming the
  spec's DB-branch workflow is restored.
