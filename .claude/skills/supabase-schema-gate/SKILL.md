---
name: supabase-schema-gate
description: Verify production Supabase schema before shipping code that touches it. Use BEFORE writing or reviewing ANY code that reads or writes a Supabase table in the Nexus — new queries, inserts, updates, CHECK-constrained values, RLS-dependent reads, cron data access — even one-line changes and even when the table "obviously" exists. Also use immediately when a query fails with "column does not exist", when inserts appear to succeed but produce no rows, or when generated TypeScript types disagree with runtime behaviour.
---

# Supabase schema gate

Two real Nexus incidents motivate this gate:

1. `social_channels.founder_id` and `social_channels.is_connected` did not
   exist in prod. The marketing coach and analytics-sync crons failed
   **silently from March to July 2026** — months of missing data.
2. `dr_contractor_portal` inserts into `agent_actions` were **silently
   rejected** by the `source` CHECK constraint until the constraint was
   widened (PR #734).

Both shipped because code was checked against assumptions (local types,
memory) instead of prod. This gate makes that class of bug unshippable.

## Procedure

**1. Enumerate assumptions.** List every table, column, CHECK-constrained
value, and RLS policy the diff reads or writes. Include indirect access
through shared helpers.

**2. Verify read-only against prod.** Generated types and local databases
drift; prod is the only authority. Run (read-only — never mutate during
verification):

```sql
-- Columns the code depends on
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = '<table>';

-- CHECK constraints (allowed values for inserts)
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.<table>'::regclass and contype = 'c';

-- RLS policies the access path relies on
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = '<table>';
```

Prod is the live source of truth for schema — that is the whole point of
this gate. For client-*library* behaviour questions (auth flows,
`@supabase/ssr` cookie handling, SDK method changes), verify against current
official docs via the live-verify skill rather than memory.

**3. Anything missing → STOP.** Write the migration first, as its own
commit, flagged `FOUNDER-GATED`, applied via the standard migration path
after review. The dependent code stays unmerged or behind a flag until the
migration is confirmed applied. Never "the migration will land later" in
the same PR as code that needs it.

**4. CHECK-constrained inserts.** Confirm the value being written is in the
constraint's allowed set (e.g. `agent_actions.source`). If a new source or
status is being introduced, widening the CHECK is a founder-gated migration
(step 3). A rejected insert must throw and surface a 500 — never a caught
error that returns a green 200 (write-then-confirm, see nexus-conventions).

**5. RLS fit.** Confirm the founder-scoping pattern supports the client in
use: `founder_id = auth.uid()` FOR ALL policies require a founder-
authenticated session client; child-table inserts requiring a founder-owned
parent will fail under anon. State which client the code path uses and why
the policy admits it.

**6. Declare it in the PR body.** Exact form:

```
DB gate (verified read-only against prod <project-ref>, <date>):
<tables/columns/constraints checked and findings>.
No prod write or migration needed.  — or —  Migration required: <link>.
```

## Red flags that mean the gate was skipped

- "It works locally" or "the types compile" offered as schema evidence.
- An insert path with no read-back confirmation.
- A `catch` block that logs and continues around a database write.
- A cron that has produced no new rows recently but shows no errors —
  silent rejection looks exactly like "nothing to do".
