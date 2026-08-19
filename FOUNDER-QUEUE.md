# FOUNDER QUEUE

The decisions held by Phill, with their age in public. Latency here is the most
expensive thing in the build — most of these are minutes of founder time holding
up days of machine time.

## What belongs here

A row is founder-held for one of two reasons, and the row must say which:

- **By class** — a credential only Phill holds, a spend commitment, a strategic
  or constitutional choice. No agent can make these, by construction.
- **By explicit reservation** — Phill has typed that a specific decision is his
  even though an engineer could otherwise make it. These carry the date of the
  reservation in Context.

Everything else belongs to engineering under the decision-rights matrix, and
parking it here manufactures a founder blocker that does not exist. The
independent review caught exactly that: D19 was a CI substrate choice, which is
engineering's call by class, and it sat here only because Phill reserved it.
He resolved it on 17/08/2026 — see Resolved.

## Rules

- Sessions may **APPEND** a row and **SURFACE** it. Sessions may never **decide**
  a row, and never **delete** one.
- A resolved row **moves** to the Resolved section with its decision text and
  date. It is not edited in place and not removed.
- **Age is computed on read, and this file does not hold it.** The Age column
  reads `—` on purpose. An age decays every midnight, so a number committed here
  is wrong within a day — F2 and F6 sat at 41 while the real answer was 42, one
  day after they were written. Get the age from
  `node scripts/founder-queue.mjs`, which prints a JSON summary with a computed
  `ageDays`. `--render` rewrites the column back to `—`, so a number typed in by
  hand is erased rather than trusted.
- **`Opened` is the state; the age is derived from it.** State is stored and
  replaced; derived values are recomputed and never stored. That is why this file
  keeps the date and not the number.
- `Opened` is the date the decision was first recorded here, unless a dated
  source predates it — where a Linear ticket or `.spm/` file is the origin, that
  date is used and cited in Context.

## Open

| ID | Decision | Opened | Age (days) | Blocks | Context | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Flip the identity env var in prod | 2026-08-16 | — | identity cutover | Founder-only credential change; no agent may set it | open |
| F2 | Click Connect Google in the CRM Integrations panel | 2026-07-06 | — | UNI-2329, founder half of UNI-2344 | Per-founder OAuth into `credentials_vault`; client id/secret already in prod, so it is one consent click | open |
| F3 | Xero connection | 2026-08-16 | — | finance reporting | Founder-held credential; no agent path | open |
| F4 | Cost metering decision | 2026-08-16 | — | spend visibility | Which meter, and the cap that trips it | open |
| F5 | Provide LINEAR_API_KEY to prod | 2026-08-16 | — | Linear-backed automation | Founder-only secret | open |
| F6 | Retrieve/create the three social platform app secrets | 2026-07-06 | — | UNI-2331 | Connectors already built; only FACEBOOK_APP_SECRET, LINKEDIN_*, TIKTOK_* are missing | open |
| F7 | Stripe connection | 2026-08-16 | — | billing, and therefore the metric of record | Blocks paying customers directly | open |
| P9 | Sign off the arming checklist | 2026-08-07 | — | P9 go-live | Per `.spm/2026-08-07-p9-board-meetings-collision.md` | open |
| F9 | Settle the `authenticated`-executes-SECURITY-DEFINER question, then apply the privileged-function exposure lock to prod `lksfwktwtmyznckodsau` | 2026-08-18 | — | ship-board Rank 1 items 1-7; `claude/ship-gate-exposure-repair` cannot be released while RED | By class — production DDL **and a security-model call only the founder can make**. Opened 18/08/2026, the date the gate was watched failing (`scripts/ship-gates/prod-exposure.sql`), not the date this row was written. **CORRECTED 19/08/2026 — the earlier wording of this row was unsafe.** It said the fix was one paste and then `run-prod-exposure.sh` "must exit 0". The gate cannot exit 0 as written: after the fix is applied, `scripts/ship-gates/repro-prod-exposure.sh` still exits 1 on exactly one row, `authenticated_executable_security_definer` / `get_my_org_ids`, and that row is **deliberate**. Chasing it to zero means revoking `authenticated` EXECUTE on `get_my_org_ids`, which **takes production down** — Postgres checks function EXECUTE against the *querying* role when it evaluates an RLS policy expression, `SECURITY DEFINER` on the callee does not exempt it, and `public.organizations` is org-scoped through that function (`20260513180500_notifications_projects_organizations.sql:60`). Reproduced 19/08/2026 on Postgres 17.6 — 1 row before the revoke, `ERROR: permission denied for function get_my_org_ids` after — by `scripts/ship-gates/prove-rls-execute-coupling.sh "<uri>"` (exit 0), which is mutation-checked: remove the revoke and it exits 1. An earlier wording of this row cited `.handoff-logs/repro-e964ab9bf.log` for that run; the 33-line log contains no such experiment, so the citation is now a script you can re-run. **Decide first:** (a) `authenticated` executing a SECURITY DEFINER function IS an exposure → the RLS design must change; or (b) it is a required pattern → `prod-exposure.sql` query 3 needs a narrow, named allowlist and ship-board item 6 becomes ACCEPTED-BY-DESIGN rather than fixed. **Only after that decision:** paste `docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql` into the prod SQL editor. Rollback tested: `…-lock.down.sql`. Lockout risk (`supabase_auth_admin` losing EXECUTE on the auth hooks) is handled in-file by an explicit re-grant issued after the PUBLIC revoke, and caught fail-closed by the in-transaction post-condition. The re-grant was accidentally deleted in `e964ab9bf` and restored after independent review; its mutation control (repro step 8) is unreachable while the repro exits 1 at step 4, so the mechanism is present but its control is currently unproven | open |

## Resolved

| ID | Decision | Opened | Resolved | Decision text |
| --- | --- | --- | --- | --- |
| F8 | Rotate ANTHROPIC_API_KEY on Vercel prod | 2026-08-18 | 2026-08-18 | **New Anthropic key added by Phill, 18/08/2026, with a US$20 hard limit — and it must be used LAST.** Provider priority is now OpenRouter FIRST with `OPENROUTER_MODEL` roster head `qwen/qwen3.8-27b` (model ID verified live on OpenRouter 18/08/2026); Anthropic is the fallback of last resort under the $20 cap. Opened same day as the census that found the 401 outage (daily since 12/08). Outcome receipt pending: the next strategy-daily run (16:00Z) clearing the 401 cluster proves the key; the OpenRouter-first rewiring is engineering work tracked in Linear |
| D19 | SPINE_DATABASE_URL vs ephemeral Postgres in CI | 2026-08-16 | 2026-08-17 | **Ephemeral Postgres in CI.** Phill, 17/08/2026: the spine gate spins its own throwaway database inside the workflow. `SPINE_DATABASE_URL` never enters CI or any workflow — it is not a secret to be stored, rotated or scoped, because CI never holds one. This closes the dependency permanently rather than managing it forever. Implemented in #1022 via an ephemeral Supabase started in-job; no workflow reads `secrets.SPINE_DATABASE_URL` — its only occurrences in `.github/` are comments recording that deliberate absence |
