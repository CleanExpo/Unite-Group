---
name: supabase-db-branch
description: Create, verify, and promote Supabase schema changes via database branches. Every schema change/migration must be validated on a Supabase database branch before prod (see CLAUDE.md line 44).
---

# Supabase DB branch process

Every schema change/migration to the Nexus Supabase instance must be validated on a Supabase database branch before promotion to prod. This skill defines the standard process for creating, testing, and promoting schema changes via branches.

## Procedure

1. **Create a branch off prod**
   - Use the Supabase dashboard to create a new branch from the prod instance
   - Name it descriptively: `schema-change-<description>-<timestamp>`
   - Set `persistent: false` by default (reaped after inactivity)
   - For CI backends, set `persistent: true`

2. **Apply the migration(s) to the branch**
   - Push the migration(s) to the branch using `supabase db push`
   - Verify the migrations are applied via `supabase migration list --local`

3. **Run supabase-schema-gate checks against the branch**
   - Run read-only checks against the branch for columns, CHECK constraints, RLS policies, indexes
   - Ensure all assumptions from the code are satisfied
   - Document the findings in the PR body

4. **Verify idempotency**
   - Ensure the migration includes `IF NOT EXISTS` guards or `DO $$` blocks
   - Verify the migration can be applied multiple times without error

5. **Evidence and promotion**
   - Add the branch verification evidence to the PR body
   - Once verified, promote the migration to prod via a merged PR

## Gate checklist

- [ ] Branch created from prod
- [ ] Migration(s) applied successfully
- [ ] Schema validation complete (columns, constraints, policies, indexes)
- [ ] Idempotency verified
- [ ] Evidence documented in PR body

## Rollback

- If branch verification reveals schema incompatibilities: fix migration in-place on the branch, re-verify, then promote
- If prod push fails: the `IF NOT EXISTS` idempotency guards against partial application; fix the error on the branch, re-push
- Do not drop tables on prod - rollback is a no-op if the migration doesn't apply cleanly

## Branch lifecycle rules

- By default, branches are `persistent: false` (automatically reaped after inactivity)
- Only set `persistent: true` for CI backends (e.g., `e2e-gate`)
- All other branches should be ephemeral to avoid cost accumulation