# Ship board — Unite-Group production

Live progress page for the `/gauntlet-ship` run started 18/08/2026.

Ranked by what blocks **selling**, not by what is pleasant to work on. Every bar
is a gate a hostile auditor could run against production; the gate lives in
[`scripts/ship-gates/prod-exposure.sql`](../../scripts/ship-gates/prod-exposure.sql).

**Rungs.** — not started · **A** gate exists and has been *watched failing* on
the live defect · **AA** fixed, gate green locally · **AAA** gate green in
production, confirmed by an agent that did not build the fix · **AAA+** a fresh
critic cannot name a way the gate passes while the defect is still present.

---

## Rank 1 — customer data, money or account access at risk today

| # | Item | Rung | Owner |
|---|---|---|---|
| 1 | `custom_access_token_hook` is **anon-executable** `SECURITY DEFINER` | **A** | `GATED` |
| 2 | `prune_integration_history` is executable by **PUBLIC** (`=X`) and is destructive | **A** | `GATED` |
| 3 | `before_user_created_hook` is **anon-executable** `SECURITY DEFINER` | **A** | `GATED` |
| 4 | `founder_uid_migration_20260810` — public table, **RLS off** | **A** | `GATED` |
| 5 | `founder_uid_conflict_resolution_20260810` — public table, **RLS off** | **A** | `GATED` |

### Why 1 and 2 lead

`custom_access_token_hook` is the hook that **mints JWT access-token claims**. A
`SECURITY DEFINER` function runs as its owner, so an anon caller runs it with the
owner's rights. That is the auth boundary itself, reachable unauthenticated at
`/rest/v1/rpc/custom_access_token_hook`.

`prune_integration_history` carries `{=X/postgres,...}`. The bare `=X` grant is
**PUBLIC** — every role, not merely `anon` — on a function whose purpose is
deleting rows. This is worse than the linter's own summary suggests, and was only
visible by reading the ACL rather than the advisory title.

## Rank 2 — real, not same-day fatal

| # | Item | Rung | Owner |
|---|---|---|---|
| 6 | `get_my_org_ids` executable by `authenticated` (tenancy boundary) | **A** | `GATED` |
| 7 | Same three hooks also executable by `authenticated` | **A** | `GATED` |
| 8 | Leaked-password protection **off** (HaveIBeenPwned check) | — | `GATED` |

## Explicitly NOT on this board

**89 × `rls_enabled_no_policy`.** RLS enabled with no policy **denies all access
by default**. Those tables are locked, not leaking. Boarding them would bury the
five real items above under 89 false alarms — the exact failure this skill exists
to prevent. If one of them should be readable, that is an availability bug on a
different board.

---

## Everything at Rank 1 is `GATED`, and that is the honest state

Every fix here is a production DDL statement — `REVOKE EXECUTE`, `ENABLE ROW
LEVEL SECURITY`, or `DROP TABLE`. Production mutation is founder-gated, and the
Supabase write gate on this machine enforces it independently: schema changes go
through a Prisma migration, on a branch, in a PR, with a review bound to the
exact SHA.

So the run does what the skill says to do with a gated item — **board it, mark it,
and do not let it hold the board hostage.**

### The exact actions, for one hand-over

```sql
-- 1, 2, 3 — remove anonymous and public access to privileged functions.
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)  FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.before_user_created_hook(jsonb)  FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prune_integration_history()      FROM anon, authenticated, PUBLIC;
-- supabase_auth_admin must KEEP execute on the two auth hooks, or login breaks.

-- 4, 5 — these are dated one-off migration artefacts (20260810). Confirm they
-- are scratch, then DROP. If they must stay, enable RLS with a deny-all policy.
ALTER TABLE public.founder_uid_migration_20260810            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_uid_conflict_resolution_20260810  ENABLE ROW LEVEL SECURITY;

-- 8 — dashboard toggle, not SQL: Auth → Policies → leaked password protection.
```

**Do not run the auth-hook revokes without checking `supabase_auth_admin` keeps
its grant.** Removing it locks every user out of login. That is the one way this
fix could cause a worse outcome than the exposure, and it is why this is founder
work rather than agent work.

### Verification after the fix

Re-run `scripts/ship-gates/prod-exposure.sql` against production. All three
queries must return **zero rows**. It returned 2, 3 and 4 rows respectively on
18/08/2026 — that red result is what makes a later green meaningful.

---

## Status

Rank 1 is at rung **A** across the board: the gate exists and has been watched
failing on the live defect. It cannot advance past A without founder action.

Per the skill's stall rule, this is **not** a stall — a sweep moved every rank-1
item from nothing to A. The next sweep cannot move them further, so the run
hands over rather than grinding.
