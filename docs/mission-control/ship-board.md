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
| 1 | `custom_access_token_hook` is **anon-executable** `SECURITY DEFINER` | **AA** | `GATED` |
| 2 | `prune_integration_history` is executable by **PUBLIC** (`=X`) and is destructive | **AA** | `GATED` |
| 3 | `before_user_created_hook` is **anon-executable** `SECURITY DEFINER` | **AA** | `GATED` |
| 4 | `founder_uid_migration_20260810` — public table, **RLS off** | **AA** | `GATED` |
| 5 | `founder_uid_conflict_resolution_20260810` — public table, **RLS off** | **AA** | `GATED` |

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
| 6 | `get_my_org_ids` executable by `authenticated` (tenancy boundary) | **AA** | `GATED` |
| 7 | Same three hooks also executable by `authenticated` | **AA** | `GATED` |
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

The inline SQL sketch that stood here has been replaced by a reviewed, executed
artefact. Do not hand-type the statements — apply the file.

| | |
|---|---|
| Apply (prod SQL editor, `lksfwktwtmyznckodsau`) | [`docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql`](../specs/sql/2026-08-19-privileged-function-exposure-lock.sql) |
| Roll back | [`…-lock.down.sql`](../specs/sql/2026-08-19-privileged-function-exposure-lock.down.sql) |
| Verify | `scripts/ship-gates/run-prod-exposure.sh "<prod-uri>"` → must exit **0** |

It is in `docs/specs/sql/` and not `apps/web/supabase/migrations/` on purpose:
`supabase db push` is unsafe on this project (57 local-only vs 95 prod-only
migrations of drift), so a file in the migrations directory adds drift and never
reaches production.

**The lockout risk is handled and tested.** `supabase_auth_admin` must keep
EXECUTE on the two auth hooks or every login breaks. The file revokes first and
re-grants `supabase_auth_admin` afterwards, so ordering cannot strand it, and it
refuses to commit unless a post-condition inside the same transaction finds zero
exposed definers. The harness asserts the grant survived rather than assuming it.

**Items 4 and 5 are closed by `ENABLE ROW LEVEL SECURITY`, not `DROP`.** RLS with
no policy denies all access, which removes the exposure without destroying data
an agent cannot inspect. Dropping the two dated tables remains the founder's
call and is not taken here.

### Verification after the fix

Re-run the gate against production. It returned 2, 3 and 4 rows on 18/08/2026 —
that red result is what makes a later green meaningful.

```bash
scripts/ship-gates/run-prod-exposure.sh "<prod-uri>"   # exit 0 = clean
```

The wrapper exists because "every query must return zero rows" was a prose
contract a human had to eyeball. It now exits **1** on findings and **2** when it
cannot run at all — an unreachable database and a clean one both produce no rows,
and letting those collapse into one another is how a false green is manufactured.

---

## Status

Rank 1 and items 6-7 are at rung **AA**: the defect is reproduced, the fix is
written, and the gate is green against that reproduction. They cannot advance to
**AAA** from here — AAA requires the gate green *in production*, confirmed by an
agent that did not build the fix, and both halves are founder-gated. The fix is
one paste and one command away from AAA; nothing further can be done on this side
of the gate.

Item 8 stays at **—** deliberately. Leaked-password protection is an Auth
dashboard setting, not a database object, so `prod-exposure.sql` cannot see it
and no gate has been watched failing on it. Marking it **A** would be calling an
assertion a gate, which is the exact thing this board's rungs exist to prevent.

**Handed to the founder as `F9`** in [`FOUNDER-QUEUE.md`](../../FOUNDER-QUEUE.md).
That row is the substantive change in this pass: the 18/08 board said "hand over"
but no handover row was ever created, so the item sat `GATED` on a page nobody
computes an age from, invisible to the one register that measures founder latency.

## Evidence — what moved these to AA

Receipts, not adjectives. Re-runnable:

```bash
scripts/ship-gates/repro-prod-exposure.sh "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

Run 19/08/2026 against an ephemeral Supabase (Postgres 17.6), exit **0**:

| Step | Assertion | Result |
|---|---|---|
| 2 | gate red on the seeded defect, **counts exactly 2 / 3 / 4** | matches the observed production red |
| 3 | fix applies, in-transaction post-condition holds | `0 exposed definers` |
| 4 | gate green | `PASS — 0 rows` |
| 5 | `supabase_auth_admin` keeps EXECUTE on both hooks | yes — login survives |
| 5 | `anon` / `authenticated` hold EXECUTE on none of the four | confirmed |
| 6 | unrelated anon-callable `harmless_rpc()` untouched | yes — fix is not over-broad |
| 7 | rollback restores the exposure | gate returns to red — reversible, proven |

**Root cause, and why it was invisible.** `20260620010000_auth_signup_allowlist.sql`
already ends each hook with `REVOKE EXECUTE … FROM PUBLIC`. That revoke is real
but incomplete: it drops the *implicit* PUBLIC grant and leaves an *explicit*
`anon=X` / `authenticated=X` entry in `proacl` untouched — and this project's
`pg_default_acl` re-grants to anon and authenticated on every new object
(`docs/specs/spm-rls-exposure-remediation-2026-07-12.md`). So a migration that
reads as though it locked the hooks shipped a surface that is still anon-callable.
Revoking from PUBLIC is not revoking from anon.

**What this evidence does not say.** It says nothing about production. The
reproduction is seeded to the ACL state recorded as observed on 18/08/2026, which
proves the gate detects the defect and the fix closes it. Whether production is
clean is answerable only by running the gate against production, and that is the
AAA step nobody here can take.

**Why the reproduction is seeded rather than derived.** The local Supabase stack
(CLI 2.114.0) ships `public` function defaults of `postgres=X/postgres` only — it
does **not** grant anon by default the way this production project does. Running
the original migration against it would have produced a green that proved nothing.
That near-miss is the reason the harness asserts exact row counts instead of
merely "some rows".
