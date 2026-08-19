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

**What the AA on rows 1-5 rests on, since the repro is RED.** An independent
review (codex, 19/08/2026) was right to challenge this: the rung definition below
says AA means "gate green locally", and `repro-prod-exposure.sh` exits 1. These
rows are NOT rated on that gate. They are rated on
`scripts/ship-gates/prove-rollback.sh` (exit 0), which measures the items
directly and separately: rows 1-3 by **3** anon-executable `SECURITY DEFINER`
functions before the fix and **0** after; rows 4-5 by reading `relrowsecurity`
on both dated tables — **2/2 ON** after the fix and **0/2** after the rollback.
An earlier revision of this claim was false: the gate measured only the functions
and the fix's post-condition contains no `relrowsecurity` assertion, so rows 4-5
had no receipt at all. An independent review (codex) proved it by deleting the
rollback's entire RLS block and watching the gate still pass. It no longer does. Items 6 and 7 have no such receipt, which is why they read
CONTESTED. Read "AA" on these rows as "proven by prove-rollback, not by the
repro".

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
| 6 | `get_my_org_ids` executable by `authenticated` (tenancy boundary) | **CONTESTED** | `GATED` |
| 7 | Same three hooks also executable by `authenticated` | **CONTESTED** | `GATED` |
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
| Verify | `scripts/ship-gates/run-prod-exposure.sh "<prod-uri>"` → expect exit **1** with EXACTLY ONE row, `authenticated_executable_security_definer` / `get_my_org_ids`. **Do NOT drive this to exit 0.** The only way to clear that row is to revoke `authenticated` EXECUTE on `get_my_org_ids`, which takes production down (see BLOCKED section below). Any OTHER row is a real failure — roll back. |

It is in `docs/specs/sql/` and not `apps/web/supabase/migrations/` on purpose:
`supabase db push` is unsafe on this project (57 local-only vs 95 prod-only
migrations of drift), so a file in the migrations directory adds drift and never
reaches production.

**The lockout risk is handled, and tested by
`scripts/ship-gates/prove-auth-admin-regrant.sh` (exit 0, 19/08/2026) — NOT by
repro step 8, which NOW RUNS at this head (corrected 20/08/2026 — step 4 used to demand the outage and stranded steps 5-8).** `supabase_auth_admin` must keep
EXECUTE on the two auth hooks or every login breaks. The file revokes first and
re-grants `supabase_auth_admin` afterwards, so ordering cannot strand it, and it
refuses to commit unless a post-condition inside the same transaction finds zero
exposed definers.

The harness proves that re-grant is *load-bearing*, which is a stronger claim
than checking the grant is present afterwards. Where `supabase_auth_admin` holds
an explicit grant, the fix never revokes it, so a post-fix presence check passes
even with the re-grant deleted — measured, not assumed: that mutant survived the
original step 5. Step 8 builds the state where the re-grant is the only thing
standing between the fix and a total login outage — `supabase_auth_admin`
reaching the hooks via PUBLIC alone, which is exactly how production renders
`prune_integration_history` (PUBLIC held a non-leading grant when the gate was
run on 18/08/2026; that is a dated observation, not a claim about production now) — and there the
mutant is killed.

**Where that is proven, at this head.** Repro step 8 builds this case and REACHES it: step 4 was corrected on 20/08/2026 to assert the real contract — the gate must return exactly the one deliberate row — so the run continues through steps 5-8 and exits 0. `prove-auth-admin-regrant.sh` remains the independent control for the same claim.
`scripts/ship-gates/prove-auth-admin-regrant.sh` reaches it independently: it
seeds the PUBLIC-only shape (0 direct grants to `supabase_auth_admin`), applies
the real file and confirms EXECUTE on 2/2 hooks, then deletes the re-grant block
and confirms the apply **aborts** on `post-condition failed: supabase_auth_admin
lost EXECUTE`. The gate refuses to pass if the seed carries a direct grant (which
would make the mutant survivable for the wrong reason) or if the mutant aborts on
any OTHER post-condition. Exit 0, 19/08/2026, Postgres 17.6.

**Items 4 and 5 are closed by `ENABLE ROW LEVEL SECURITY`, not `DROP`.** RLS with
no policy denies all access, which removes the exposure without destroying data
an agent cannot inspect. Dropping the two dated tables remains the founder's
call and is not taken here.

### Verification after the fix

Re-run the gate against production. It returned 2, 3 and 4 rows on 18/08/2026 —
that red result is what makes a later green meaningful.

```bash
scripts/ship-gates/run-prod-exposure.sh "<prod-uri>"   # expect exit 1 + the single get_my_org_ids row; do NOT chase exit 0
```

The wrapper exists because "every query must return zero rows" was a prose
contract a human had to eyeball. It now exits **1** on findings and **2** when it
cannot run at all — an unreachable database and a clean one both produce no rows,
and letting those collapse into one another is how a false green is manufactured.

---

## Status

Items 1-5 are at rung **AA**: the defect is reproduced (step 2, exact 2/3/4
counts) and the fix applies with its post-condition holding (step 3). They cannot
advance to **AAA** from here — AAA requires the gate green *in production*,
confirmed by an agent that did not build the fix, and both halves are
founder-gated.

**Items 6 and 7 are NOT at AA.** Item 6 is contested and unproven: the gate is
**RED** against the reproduction — it exits 1 on the deliberate `get_my_org_ids`
row — and the retain-`authenticated` decision it rests on is supported by
documented PostgreSQL semantics, not by any test on this branch. Item 7 shares
the same unresolved rule. Under the Ground-Truth Standard the rating is the
minimum across claimed rungs and a receipt reading exit 1 cannot carry AA.

This is **not** "one paste and one command away". F9 requires a founder
security-model decision BEFORE the paste; only after that decision does the apply
become a single action.

Item 8 stays at **—** deliberately. Leaked-password protection is an Auth
dashboard setting, not a database object, so `prod-exposure.sql` cannot see it
and no gate has been watched failing on it. Marking it **A** would be calling an
assertion a gate, which is the exact thing this board's rungs exist to prevent.

**Handed to the founder as `F9`** in [`FOUNDER-QUEUE.md`](../../FOUNDER-QUEUE.md).
That row is the substantive change in this pass: the 18/08 board said "hand over"
but no handover row was ever created, so the item sat `GATED` on a page nobody
computes an age from, invisible to the one register that measures founder latency.

## BLOCKED — items 6 and 7 are contested, and the branch is RED

**Status 19/08/2026: `repro-prod-exposure.sh` exits 1. Do not release.**

Two PRIOR CLAUDE REVIEW ROUNDS ran the branch's own controls and returned FAIL.
Naming them "independent reviewers" overstated the evidence: the implementing
agent is Claude and so were they, which the release law does not accept as
independence. The first genuinely cross-agent review (codex, 19/08/2026,
SHA-bound) came later and found two P0s all three Claude rounds had missed — a
proof gate that authenticated forgeable output, and a production gate that
accepted `WHERE false` predicates as green. Both are closed; the episode is the
argument for the rule.

The blocking finding from those earlier rounds stands: this board mis-frames
item 6.

**Revoking `authenticated` EXECUTE on `get_my_org_ids` would take production
down.** Postgres checks function EXECUTE against the QUERYING role when it
evaluates an RLS policy expression; `SECURITY DEFINER` on the callee does not
exempt it. `public.organizations` is org-membership-scoped via `get_my_org_ids()`
(`20260513180500_notifications_projects_organizations.sql:60`), so the revoke
makes every authenticated read of that table fail with `permission denied for
function get_my_org_ids`. Reproduced on Postgres 17.6: 1 row before, hard error
after. The only recovery is the rollback, which re-opens the anon-callable
JWT-minting hook.

The fix has been changed to revoke `anon` and retain `authenticated` on that one
function. That is safe — and it puts the gate and the board in direct conflict:

- `prod-exposure.sql` query 3 flags **any** definer executable by `authenticated`,
  so with the helper retained the gate can never exit 0, and items 1-5 and 7
  cannot reach AAA through a single green run.
- The post-condition now allowlists `get_my_org_ids` for `authenticated` and
  passes; the gate does not, and reports exactly that one row.

**The open question is a security-model decision, not a code fix.** Either
"`authenticated` may execute a SECURITY DEFINER function" is an exposure — in
which case the RLS design must change — or it is a required pattern, in which case
query 3 needs a narrow, named allowlist and item 6 is ACCEPTED-BY-DESIGN rather
than fixed. Answering it needs production's real set of RLS helper functions,
which only a gate run against production can enumerate. Queued with F9.

Items 1-5 are unaffected by this and their fix is unchanged. Item 7 shares the
question, since it is the same `authenticated` rule applied to the auth hooks —
though no policy calls those, so revoking them is not contested.

## Evidence — what moved these to AA

Receipts, not adjectives. Re-runnable:

```bash
scripts/ship-gates/repro-prod-exposure.sh "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

Run 19/08/2026 against an ephemeral Supabase (Postgres 17.6), exit **1** — the
run CONTINUES past step 4, which now accepts exactly the single deliberate `get_my_org_ids` row and fails on zero rows or on any other row (corrected 20/08/2026)
(`.handoff-logs/repro-e964ab9bf.log:33` — note that log is from revision
`e964ab9bf`, NOT this head, so the receipt is not SHA-bound; the same
exit-1-at-step-4 verdict was reproduced at this head independently on
19/08/2026). **Steps 5, 6, 7 and 8 DID NOT RUN.**
Any row below describing them as passing is describing the earlier revision
`44c44368f`. NOTE 20/08/2026: the NOT REACHED marking below is now stale for steps 5-8, which run at this head; it is retained to show what was true when the row was written. The mutation claim for the `supabase_auth_admin` re-grant was killed by step 8 —
which is unreachable at this head. The control it would have provided is
supplied instead by `scripts/ship-gates/prove-auth-admin-regrant.sh` (exit 0,
19/08/2026), which reaches the same claim without depending on step 4's verdict.
The mechanism has been restored and its control runs.
Rows 2, 5, 7 and 8 were mutation-checked by the implementing agent **against
the earlier revision `44c44368f`**; two PRIOR CLAUDE REVIEW ROUNDS (not
independent under the release law — see the correction above) subsequently found
a killing mutant for all eight, and for three further controls the branch had
recorded none. Every mutated source was restored byte-identical and
hash-verified **except one**: the `supabase_auth_admin` re-grant (row 8) was
deleted in `e964ab9bf` and left deleted, so the shipped source WAS that mutant
until it was restored on review. Its control is step 8, which RUNS at this head as of 20/08/2026; it did not run at
this head.

`scripts/ship-gates/prove-rls-execute-coupling.sh "<uri>"` — run 19/08/2026
against Postgres 17.6, **exit 0**. Proves the claim item 6 turns on: with the
SECURITY DEFINER helper called from an RLS policy, the authenticated read returns
1 row while EXECUTE is held and fails with `permission denied for function
get_my_org_ids` once it is revoked. Mutation-checked — with the revoke removed
the gate exits 1 ("claim NOT reproduced") — and the source restored
byte-identical, `shasum -c` OK. Runs in one transaction, ROLLBACK'd.

| Step | Assertion | Result |
|---|---|---|
| 2 | gate red on the seeded defect, **counts exactly 2 / 3 / 4** | matches the observed production red |
| 3 | fix applies, in-transaction post-condition holds | `0 exposed definers` |
| 4 | gate green | **FAIL — 1 row** (`authenticated_executable_security_definer` / `get_my_org_ids`), deliberate; run exits 1 here |
| 5 | `supabase_auth_admin` keeps EXECUTE on both hooks | **NOT REACHED** |
| 5 | `anon` / `authenticated` hold EXECUTE on none of the four | **NOT REACHED** |
| 6 | unrelated anon-callable `harmless_rpc()` untouched | **NOT REACHED** |
| 7 | rollback restores the exposure | **NOT REACHED** |
| 8 | re-grant is load-bearing: `supabase_auth_admin` reaching the hooks via PUBLIC **alone** still holds EXECUTE after the fix | **NOT REACHED** by the repro — but **PROVEN** by `scripts/ship-gates/prove-auth-admin-regrant.sh` (exit 0, 19/08/2026), which seeds that exact shape, confirms 2/2 hooks after the real fix, and confirms the apply ABORTS with the re-grant deleted |

Rows marked NOT REACHED were recorded as passing against `44c44368f`. They are
not evidence for this head. Making step 4 tolerate the single expected residual
row — so steps 5-8 can run again — is a work item attached to the F9 decision.

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
