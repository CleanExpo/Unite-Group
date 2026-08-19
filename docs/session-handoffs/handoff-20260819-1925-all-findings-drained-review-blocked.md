# Handoff 19/08/2026 19:25 — every review finding drained; push blocked on codex quota

**Branch `claude/ship-gate-exposure-repair`. HEAD `600ed6505`, 20 ahead of `origin/main`
(`2dc3c0226`), 0 behind, tree clean, NEVER PUSHED.**

## 0. The one-line state

Every finding from both independent cross-agent reviews is drained, each with a killing
mutant. The branch cannot be pushed because the release gate needs a non-Claude review
bound to the final SHA and **codex quota is exhausted until 20/08/2026 13:33**. That is the
only thing standing between this branch and a push. The production paste is separately
blocked on F9, which is the founder's.

## 1. Do this first, and do not skip the trap

`codex exec` **exits 0 when it hits the usage limit and writes no report.** The exit code is
not evidence the review ran; the absent `reviewer-report.json` is. Check for the file, not
the status.

After 20/08 13:33:

1. `git worktree add <tmp>/review --detach HEAD`
2. Reuse the brief that produced the two useful rounds — the attack list is preserved in
   §5 below and in the commit messages of `8742e2db7`, `28162dff1`, `683981482`,
   `0874be277`, `600ed6505`. `base_sha` = `2dc3c0226…`, `head_sha` = the CURRENT head,
   `reviewer_agent: codex`.
3. `cd <tmp>/review && codex exec --sandbox workspace-write - < brief`
4. **Verify `reviewer-report.json` exists** before believing anything.
5. `python3 ~/.claude/skills/pr-release-gate/scripts/pr_release_gate.py issue
   --primary-agent claude --review-report <abs path>
   --test 'npm run verify:readiness'
   --test 'scripts/ship-gates/prove-rls-execute-coupling.sh <uri>'
   --test 'scripts/ship-gates/prove-auth-admin-regrant.sh <uri>'
   --test 'scripts/ship-gates/prove-rollback.sh <uri>'
   --test 'scripts/ship-gates/prove-rollback-fidelity.sh <uri>'
   --test 'scripts/ship-gates/prove-apply-identity.sh <uri>'`
6. Push. **Do NOT open a PR.** Provenance of that instruction, stated honestly: its only
   record is `handoff-20260819-1400-push-blocked.md:25-26`, a prior session's account of a
   founder instruction on 19/08. Treated as operative because it is the sole standing
   instruction, not because it was independently confirmed.

## 2. Gate expectations — so nobody chases the wrong one

| Gate | Expected | Meaning |
|---|---|---|
| `npm run verify:readiness` | **exit 0** | DoD. `fail 1` is `ci.active-package-coverage`, non-blocking, pre-existing on main |
| `prove-rls-execute-coupling.sh <uri>` | **exit 0** | the RLS/EXECUTE coupling |
| `prove-auth-admin-regrant.sh <uri>` | **exit 0** | the re-grant is load-bearing |
| `prove-rollback.sh <uri>` | **exit 0** | rollback restores the exposed production shape |
| `prove-rollback-fidelity.sh <uri>` | **exit 0** | rollback does NOT invent an exposure |
| `prove-apply-identity.sh <uri>` | **exit 0** | the apply refuses a wrong database |
| `repro-prod-exposure.sh <uri>` | **exit 1** | **CORRECT. BY DESIGN.** |

`repro-prod-exposure.sh` exits 1 at step 4 on exactly one row,
`authenticated_executable_security_definer / get_my_org_ids`. **Never drive it to 0** —
that means revoking `authenticated` EXECUTE on `get_my_org_ids`, which takes production
down, proven by `prove-rls-execute-coupling.sh`. Any OTHER row is a real failure.

Local Postgres for all of them: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
(17.6). `run-prod-exposure.sh --control` now REQUIRES a genuinely different cluster.

## 3. Two sessions worked this branch concurrently

`c3730bf00` was authored by another Claude session while this one was mid-edit on the same
file. Its handoff is `handoff-20260819-1900-concurrent-session-round7.md`, committed here.
The stale-editor revert it warned about nearly happened: a rewrite based on `093963dd5`
would have deleted 11 lines `c3730bf00` had just added. They were recovered and superseded
explicitly. **If two sessions are live again, reconcile before committing.**

## 4. What was drained, and by what evidence

| Finding | Fix | Killing mutant |
|---|---|---|
| RLS proof authenticated 7 strings from one psql blob; round 6 and 7 both forged a pass | Blob removed. `lib/pgprobe.sh` fetches each fact as its own scalar; the post-revoke failure is judged on psql's EXIT STATUS | Round 7's 3-part forgery → exit 1, "the read SUCCEEDED after the revoke" |
| `prove-rollback` matched `rollback aborted`, emitted by BOTH guards | Matches the identity guard's own text | Delete the identity guard → exit 1, "the abort came from somewhere else" |
| The production apply file COMMITted a vacuous success on an empty database | Pre-mutation identity guard requiring all 4 functions | Strip the guard → the empty database COMMITs again |
| `--control` NON-PROD boundary was a comment | `system_identifier` comparison | Same cluster → exit 2; second real cluster → exit 0 |
| 3 gates force-dropped fixed-name databases, deleting unrelated data | Random names; refuse a name not created by this run | Sentinel database survives; 0 leftovers |
| Rollback GRANTed a hard-coded presumed pre-state, INVENTING an anon exposure | Forward captures the observed pre-state to a receipt table; rollback replays it and refuses without it | Restore the hard-coded grant → invents 3 exposures |
| Capture used `has_function_privilege`, which reports EFFECTIVE privilege incl. via PUBLIC | Reads `aclexplode` for a DIRECT aclitem; handles `proacl IS NULL` | Revert the capture → "anon holds 1 DIRECT grant(s)" |

Two defects surfaced only by RUNNING, not by reading:

- The minimum-effect post-condition **contradicted** the fidelity requirement — it aborted
  unless something was re-exposed, which assumes the pre-state was always production's
  shape. It is now equality with the receipt, which is strictly stronger.
- The receipt table is created in `public` — the surface this file exists to lock. Board
  items 4-5 ARE two RLS-disabled public tables. RLS is enabled and untrusted grants revoked
  in the same breath; confirmed by the repro still returning EXACTLY ONE row.

## 5. The attack list that keeps finding things

A1 forge the RLS proof (payload swap, `\if false`, combined oracle+error literals) ·
A2 satisfy the apply identity guard with a database that is not this project ·
A3 the receipt round trip: PUBLIC vs direct, second apply, apply-down-apply-down, receipt
dropped between apply and rollback · A4 the receipt table as a new exposure ·
A5 the post-condition equality satisfied by the right count of the WRONG functions ·
A6 a `--control` that is still destructive to the target (replica, pooler, two routes to
one cluster) · A7 the class sweep: a claim corrected in the named document and left
standing in the operating file.

## 6. The ollama pass — advisory only, and it was wrong twice

With codex unavailable, a cross-vendor adversarial pass ran through
`ollama gpt-oss:120b-cloud`. **It cannot execute mutants, so it CANNOT discharge the
release-gate rubric and is NOT a receipt.** Output at
`/private/tmp/.../scratchpad/ollama-round8.txt` (disposable).

It raised 10 items. Its top P0 was the real ACL-shape defect above. Its other two P0s were
**false**: it claimed the rollback never restores `authenticated`, citing a
`grantee IN ('anon','')` filter — but the restore loop at `…down.sql:111` has NO grantee
filter, and the one it cited is at `:176` inside the post-condition where it is correct.
Taking its list at face value would have produced two unnecessary changes to correct code.
Worth running, not worth trusting.

## 7. Still open

| Item | Owner | Blocking |
|---|---|---|
| **F9 security-model call** — is `authenticated` executing a `SECURITY DEFINER` function an exposure (RLS design changes) or a required pattern (query 3 gets a named allowlist, board item 6 becomes ACCEPTED-BY-DESIGN)? | **Phill** | the production paste |
| Independent review bound to the final SHA | next agent, after 20/08 13:33 | the push |
| Receipt semantics across apply→down→apply cycles | next agent | nothing yet — untested, not known broken |
| `docs/mission-control/ship-board.md` ratings vs the receipts they cite | next agent | round 7 P1-5 flagged this; partly addressed in `c3730bf00` |

## 8. Risk notes

- **Two agents, one branch, no lock.** Reconcile before committing.
- **Both prior reviews bind `093963dd5`.** Neither is a receipt for the current head.
- The branch is RED by design. `repro-prod-exposure.sh` must stay at exit 1.
- No production system was touched. No secrets read or written.

Grounded 19/08/2026: HEAD `600ed6505`, 20 ahead of `origin/main`, 0 behind — `git rev-list --left-right --count origin/main...HEAD` (exit 0)
Grounded 19/08/2026: never pushed — `git ls-remote --heads origin claude/ship-gate-exposure-repair` (exit 0) returned no rows
Grounded 19/08/2026: full suite at this head — verify:readiness (exit 0) · prove-rls-execute-coupling.sh (exit 0) · prove-auth-admin-regrant.sh (exit 0) · prove-rollback.sh (exit 0) · prove-rollback-fidelity.sh (exit 0) · prove-apply-identity.sh (exit 0) · repro-prod-exposure.sh (exit 1, by design, EXACTLY ONE row)
Grounded 19/08/2026: `node --test scripts/__tests__/founder-queue.test.mjs` — 44 pass, 0 fail
Grounded 19/08/2026: the SHA-bound review did NOT run — codex exec exited 0, wrote no reviewer-report.json, log ends "ERROR: You've hit your usage limit ... try again at Aug 20th, 2026 1:33 PM"

Waterline: Class 1 · Stage LOCALLY_VERIFIED (rung 3/12 Test) · AA — evidence: the seven gate exits above @ `600ed6505` · ABSENT: independent review bound to this SHA (codex quota, resets 20/08 13:33) · F9 unresolved

Handoff complete. Next safe action: wait for the codex reset, then run one review bound to
the then-current HEAD — and confirm `reviewer-report.json` exists before believing the exit code.
