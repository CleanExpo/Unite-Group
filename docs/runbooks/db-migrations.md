# Database migrations to production (UNI-2757)

Merged migration files now reach the production Supabase database through one gated workflow:
`.github/workflows/db-migrations.yml`. Before it existed, migrations were applied by hand, so
production drifted from `main` and nothing noticed.

## How it works

| When | What runs | Touches production? |
| -- | -- | -- |
| Pull request that changes `apps/web/supabase/migrations/**` | Lints file names, replays every migration on a throwaway local Supabase stack, runs the drift check on that stack | No |
| Push to `main` that changes migrations | One job in the `production-db` environment: checks secrets, links, proves identity, shows the plan, dry run, `supabase db push --include-all`, checks drift again | Yes, after a reviewer approves |

All comparison logic is in `scripts/db/migration-drift.mjs`. The file-to-ledger reconciliation lives in
`scripts/db/migration-ledger-map.json`, the single owner of that fact. Tests: `scripts/__tests__/migration-drift.test.mjs`.

Why a map is needed: production recorded some hand-applied migrations under different versions than their
file names, and `supabase db push` refuses to run while the ledger holds versions that have no file.

## Founder steps (once, in this order)

1. **Create the environment.** GitHub repository Settings, Environments, New environment, name it exactly
   `production-db`. Tick Required reviewers and add yourself. Under Deployment branches, allow `main` only.
   Do this before step 2: GitHub creates an environment with no reviewers the first time a workflow names it,
   and the secrets are what the job needs, so reviewers must exist before the secrets do.
2. **Add the two secrets to that environment** (Environment secrets, not repository secrets):
   `SUPABASE_ACCESS_TOKEN` (Supabase dashboard, Account, Access Tokens) and `SUPABASE_DB_PASSWORD`
   (production database password). The job fails closed with a clear message if either is missing.
3. **Run the repair plan once.** From a checkout of `main`, with the Supabase CLI logged in:

   ```bash
   supabase link --project-ref lksfwktwtmyznckodsau --workdir apps/web
   supabase migration list --linked --workdir apps/web > prod-ledger.txt
   scripts/db/repair-plan.sh prod-ledger.txt
   ```

   The script only prints. Review the output. All of it changes the migration history table only, never the schema.
   - Plan step 1 records the hand-applied files under their own file versions, and plan step 2 removes the old rows they
     replace. Each has a known replacement. Run both.
   - Plan step 3 is a separate decision: older history rows (early numbered migrations, repair replays, backups) that
     have no file here. `supabase db push` refuses to run while they exist and cannot skip them. Save them first
     with the SQL shown, then run the command.
   - Plan step 4 lists held files. For each one, check read-only whether its objects already exist in production. If
     they do, record it as applied. If not, remove its entry from `held` in
     `scripts/db/migration-ledger-map.json` in a reviewed change (you can do this in the same change as step 4), and the
     workflow will then apply it. While a file is held the job refuses to run.
     `20260908020000_coaching_seed_klim_spiroski` writes a named client's data and needs its own yes or no before
     it is applied.
4. **Arm the workflow.** Change `"armed"` to `true` in `scripts/db/production-apply.json` and merge that change.
   Until then the production job stops at its first check, whatever the environment settings are, because GitHub
   creates a missing environment with no reviewers and a repository-level secret of the same name would satisfy
   the secrets check. The committed switch is the human gate that does not depend on those settings.

After step 4, re-run the workflow from the Actions tab (Database migrations, Run workflow, branch `main`) and
approve the `production-db` deployment. The two files not yet in production
(`20261105040000_gates_schema`, `20261119090000_portal_projects`) are applied then.

## What it refuses to do

- Run from any ref but `main`, or while `armed` is false, or without both secrets, or against a project that is not
  `lksfwktwtmyznckodsau` with the expected migration history.
- Run while a held file or an unrepaired ledger row would make `db push` apply or refuse something unreviewed.
- Apply anything on a pull request.

## Known limits

- No endpoint exposes the production database fingerprint, so identity is the linked project ref plus
  history sentinels. Adding a fingerprint to `/api/health` and comparing it here is a follow-up.
- The map's 20 name-matched entries rest on the ledger names, not on an object-by-object check.
- `supabase db push` has no per-file exclude. A file that must not be applied has to be recorded as applied
  (repair) or fixed first.
- Project rule: validate each migration on a Supabase database branch before production. This workflow replays
  every migration on a local stack in pull requests, which is not the same thing. Branch validation stays a
  founder-gated step until the owner decides whether the local replay satisfies the rule.
