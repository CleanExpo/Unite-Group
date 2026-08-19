# Handoff 19/08/2026 — branch is review-clean, push blocked on reviewer identity

**HEAD `a505b6b3b`, 12 commits ahead of `origin/main`, tree clean, never pushed.**

## Do this first, it is the whole job

The branch has a PASS review with zero blocking findings. It is not pushed for one
reason: `pr_release_gate.py issue` refuses a report whose reviewer is also Claude —

```
PR release gate BLOCKED: reviewer must be a different independent agent
```

and with no receipt the Bash hook blocks `git push` itself.

**Resume (Codex resets 20/08/2026 1:33 PM):**

1. `git worktree add <tmp>/review --detach HEAD`
2. Write a brief from `~/.claude/skills/pr-release-gate/references/reviewer-brief.md`
   with `base_sha` = current `origin/main`, `head_sha` = current HEAD,
   `reviewer_agent: codex`. Reuse the attack list in the round-5 brief — it is the
   one that found things.
3. `cd <tmp>/review && codex exec --sandbox workspace-write - < brief`
4. `python3 ~/.claude/skills/pr-release-gate/scripts/pr_release_gate.py issue --primary-agent claude --review-report <abs path> --test 'npm run verify:readiness' --test 'scripts/ship-gates/prove-rls-execute-coupling.sh <uri>' --test 'scripts/ship-gates/prove-auth-admin-regrant.sh <uri>'`
5. Push the branch. **Do NOT open a PR** — the founder's instruction on 19/08 was
   push-only, hold the merge, because the branch is RED by design.

A valid `GEMINI_API_KEY` exported into the environment is the other route. The key
in the repo-root `.env.local` is **dead** — `AIza…`, 39 chars, well-formed, and
Google returns HTTP 400 `API_KEY_INVALID` to a direct
`generativelanguage.googleapis.com/v1beta/models` call, so it is not a CLI problem.

## What the gates do, so you do not chase the wrong one

| Gate | Expected | Meaning |
|---|---|---|
| `npm run verify:readiness` | **exit 0** | DoD |
| `scripts/ship-gates/prove-rls-execute-coupling.sh <uri>` | **exit 0** | proves the RLS/EXECUTE coupling |
| `scripts/ship-gates/prove-auth-admin-regrant.sh <uri>` | **exit 0** | proves the re-grant is load-bearing |
| `scripts/ship-gates/repro-prod-exposure.sh <uri>` | **exit 1** | CORRECT. By design. |

`repro-prod-exposure.sh` **cannot** be green and must not be made green. It exits 1
at step 4 on one deliberate row, `authenticated_executable_security_definer /
get_my_org_ids`. Clearing that row means revoking `authenticated` EXECUTE on
`get_my_org_ids`, which **takes production down** — proven, not argued, by
`prove-rls-execute-coupling.sh`. Local Postgres for all of these:
`postgresql://postgres:postgres@127.0.0.1:54322/postgres` (17.6).

## Still open, and both belong to the founder

**F9 is now two decisions, not one.**

1. **The security-model call.** Is "`authenticated` may execute a SECURITY DEFINER
   function" an exposure — so the RLS design changes — or a required pattern, so
   `prod-exposure.sql` query 3 gets a narrow named allowlist and ship-board item 6
   becomes ACCEPTED-BY-DESIGN? Only production's real set of RLS helpers can settle it.
2. **The rollback is untested.** Its test was repro step 7, which never runs. The
   constitution's "tested rollback before a production change" precondition is
   therefore NOT met. This surfaced on review and is a second reason not to paste yet.

## Why this branch took five review rounds

One defect shape, five times: **the claim was corrected in the document that was
named, and left standing in the file that operates.** The "drive the gate to exit 0"
instruction — which is an outage instruction — lived in FOUNDER-QUEUE, the ship
board, the SQL header the founder actually pastes, and two dated handoffs. Two of
those fixes were mine. If a reviewer names a line, sweep the repo for the claim
class; never patch the cited line alone.

Also found and fixed: `e964ab9bf` had silently deleted the `supabase_auth_admin`
re-grant while three documents still called it load-bearing, and its only control
(repro step 8) was unreachable. Restored, and `prove-auth-admin-regrant.sh` now
reaches that claim independently of step 4's verdict.

Reviewer reports for rounds 1-5 were written into disposable worktrees under the
session scratchpad and are gone. Their findings are recorded in the commit messages
of `f7f9b79d8`, `6ff888206`, `ab092ace0`, `f05efe4c0` and `a505b6b3b`.

Waterline: Class 1 · Stage LOCALLY_VERIFIED (rung 3/12 Test) · AA — evidence:
`npm run verify:readiness` (exit 0) · `prove-rls-execute-coupling.sh` (exit 0) ·
`prove-auth-admin-regrant.sh` (exit 0) @ `a505b6b3b` · ABSENT: recordable
cross-CLI review
