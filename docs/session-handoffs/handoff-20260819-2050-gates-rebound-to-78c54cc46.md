# Handoff 19/08/2026 20:50 — gates re-bound to `78c54cc46`; branch is green-except-by-design and still unpushed

**Branch `claude/ship-gate-exposure-repair`. HEAD `78c54cc46`, tree CLEAN, 22 commits ahead of
`origin/main`, never pushed. All gate evidence below was produced in a worktree pinned to this
exact SHA, not inherited from an earlier one.**

## 1. Summary and classification

**WIP-BLOCKED. INCOMPLETE.** Definition-of-Done: item 1 passes (this session's task is done),
item 2 passes (§6), item 3 passes for `git status` and **fails** for `git stash list` (22
pre-existing stashes, none from this session), item 4 fails — nothing pushed, and it may not be.

| | |
|---|---|
| Attempted | Session boot contract; then verify that the vacuous production-apply defect was fixed |
| Completed | Re-ran the full local definition of done in a worktree pinned to `78c54cc46` — every gate re-derived at this SHA (§6) |
| Completed | Confirmed by positive control that the apply and rollback files now refuse an empty *and* a partial database (§3) |
| Not touched | No commit, no push, no PR, no production SQL, no Linear, no secrets, no edit to any file the other session owns |

**Correction to `handoff-20260819-1900`:** that document rated the branch `FAIL` at rung 3 and
listed the vacuous apply as live at HEAD. Both statements were bound to `093963dd5`/`c3730bf00`
and are now **stale** — the defect is fixed and the gates pass at `78c54cc46`. Superseded by this
file. Citing a prior SHA's evidence for the current HEAD is the P7 boundary failure; this handoff
re-derived everything rather than carrying it forward.

## 2. Where it started

No task was given, so the `CLAUDE.md` boot contract applied. **Top FOUNDER-QUEUE blocker: F2,
"Click Connect Google in the CRM Integrations panel", open 44 days** — `node
scripts/founder-queue.mjs` (exit 0; `openCount` 9, `integrity` OK). Untouched here; it is one
founder consent click. The session then took the branch's own named blocker, and later Phill's
instruction to fix the vacuous apply.

## 3. Decisions locked + what shipped

**Nothing shipped by this session. No commit was authored here.** Two facts are locked:

**(a) The vacuous-apply defect is closed, and the fix is not mine.** The other session landed it
in `28162dff1` ("the file the founder pastes into prod no longer succeeds on the wrong
database"). Verified here by positive control at `78c54cc46`, not by reading the commit:

| Control | Result |
|---|---|
| Apply against an empty database (0 of 4 target functions) | **exit 3** — `apply aborted: this file expects all 4 privileged functions it locks (custom_access_token_hook, before_user_created_hook, prune_integration_history, get_my_org_ids) in schema public, found 0 (<none>). A partial or empty match is NOT this project … NOTHING has been changed.` |
| Apply against a partial database (1 of 4, `custom_access_token_hook`) | **exit 3** — `… found 1 (custom_access_token_hook). A partial or empty match is NOT this project` |
| Rollback (`.down.sql`) against the same 1-of-4 partial | **exit 3** — `rollback aborted: … found 1. A partial match is NOT this project. Nothing has been changed.` |

Before the fix, the same empty-database apply exited **0** and COMMITted after printing
`post-condition OK`. That earlier run is what made this a defect; these three runs are what
close it.

**(b) The recorded push blocker changed twice in one day and is now quota, not identity.**
`handoff-20260819-1400` said no non-Claude reviewer was available; codex 0.145.0 answered a
probe at 18:33 and ran a full review, so that was stale. The branch's current handoff
(`3afe60792`) records the live blocker as **codex quota, exhausted until 20/08 13:33**. Check an
inherited blocker before trusting it — twice now it has been a claim about the past.

## 4. Key files

| File | Status |
|---|---|
| `docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql` | Read-only inspected — now carries the identity assertion; §3(a) verified |
| `docs/specs/sql/2026-08-19-privileged-function-exposure-lock.down.sql` | Read-only inspected — same guard on the rollback path |
| `.handoff-logs/reviews/codex-round7-093963dd5-second-independent.json` | Created earlier this session — the second independent codex review of `093963dd5`. **Historical**: its 6 findings are drained at HEAD |
| `.handoff-logs/reviews/codex-round7-093963dd5-transcript.log` | Created earlier this session — 502 KB reviewer transcript with every reproduction command |
| `docs/session-handoffs/handoff-20260819-1900-concurrent-session-round7.md` | **Superseded by this file** (see §1) |
| `docs/session-handoffs/handoff-20260819-2050-gates-rebound-to-78c54cc46.md` | Created — this file |

Nothing under `scripts/ship-gates/` or `docs/mission-control/` was modified by this session.

## 5. Running state

Nothing running. The gate worktree at
`<scratchpad>/gate78` is disposable and pinned to `78c54cc46`; remove it with `git worktree
remove`. Local Postgres 17.6 is up at `postgresql://postgres:postgres@127.0.0.1:54322/postgres` —
verified by `select version()` (exit 0), not assumed. Logs for every gate below are in the
session scratchpad (`g78-*.log`); they are outside the repo and will not survive the session.

## 6. Verification — exact commands

All run at `78c54cc46` in a detached worktree (`git worktree add <tmp> --detach 78c54cc46`),
tree clean before and after:

```
npm run verify:readiness
  exit 0 · # tests 411 · # pass 408 · # fail 0 · # skipped 3
  gate summary: {"pass":10,"fail":0,"unknown":0,"blocking":0}
```

**The 3 skips are named, not counted away:** `operator launcher scrubs unrelated ambient
secrets`, `operator launcher resolves a symlink before exposing the gateway key`, and `workspace
installer resolves its own symlink before invoking the pinned helper` — all three skip with the
stated reason "this runner is Node 22.22.3; start-operator.sh requires >=24.14.1 <25". They are
interpreter-gated, not silently absent. On a Node 24 runner they must execute.

```
scripts/ship-gates/prove-rls-execute-coupling.sh <uri>    exit 0
  "after revoke: has_function_privilege=f, and the same read exited NON-ZERO
   with 'permission denied for function get_my_org_ids' on stderr"

scripts/ship-gates/prove-auth-admin-regrant.sh <uri>      exit 0
  "without re-grant: apply ABORTS on 'post-condition failed: supabase_auth_admin lost EXECUTE'
   the re-grant is load-bearing, and its absence cannot commit"

scripts/ship-gates/prove-rollback.sh <uri>                exit 0
  "after the rollback: 3 definers, RLS OFF for 2/2 — prior state restored, so the rollback is TESTED
   wrong project: refused on the identity guard, nothing committed"

scripts/ship-gates/repro-prod-exposure.sh <uri>           exit 1   <-- CORRECT, BY DESIGN
  "FAIL prod-exposure: 9 row(s) — every row is a live exposure"
  includes: authenticated_executable_security_definer|get_my_org_ids|{postgres=X/postgres,authenticated=X/postgres}
```

`repro-prod-exposure.sh` **must exit 1** and must never be driven to 0. Driving it to 0 means
revoking `authenticated` EXECUTE on `get_my_org_ids`, which takes production down — Postgres
checks function EXECUTE against the *querying* role when evaluating an RLS policy expression, and
`public.organizations` is org-scoped through that function. That is what
`prove-rls-execute-coupling.sh` proves, and its exit 0 above is the receipt.

The §3(a) identity controls, same SHA:

```
psql -X -q -d <uri>/postgres -c "CREATE DATABASE <scratch>"
psql -X -q -v ON_ERROR_STOP=1 -d <uri>/<scratch> \
  -f docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql     # exit 3, aborts
# repeat with 1 of the 4 functions pre-created                            # exit 3, aborts
# repeat against …-lock.down.sql on the same partial database             # exit 3, aborts
```

## 7. Deferred and open questions

**Deferred**

| Item | Owner | Blocking | Why deferred |
|---|---|---|---|
| Independent review bound to `78c54cc46` | Next agent | the push | Codex quota exhausted until **20/08 13:33**. Both existing reviews bind `093963dd5`; a PASS for an older SHA is invalid |
| Issue the receipt, then push — **push only, no PR** | Next agent | — | Requires the review above |
| Run the 3 interpreter-skipped tests on a Node 24 runner | Next agent | nothing today | They are gated, not failing; CI on the right Node will execute them |
| 22 stale git stashes, oldest from June | Phill | nothing | Pre-existing, none from this session; listed only because DoD item 3 asks |

**Open questions**

| Question | Owner | Blocking |
|---|---|---|
| **F9's security-model call.** Is `authenticated` executing a `SECURITY DEFINER` function an exposure (the RLS design changes), or a required pattern (`prod-exposure.sql` query 3 gets a narrow named allowlist and ship-board item 6 becomes ACCEPTED-BY-DESIGN)? | **Phill** | the production paste, and release of this branch |
| Is `prove-rls-execute-coupling.sh`'s "a gate cannot prove it was not itself edited" P0 accepted-by-design, or open? `c3730bf00` declares it accepted and says the defence is the diff and the reviewer | Phill | the final verdict |

## 8. Pick up here

**Start here**

1. `git rev-parse HEAD && git status --short` — a second session has been editing this branch all
   evening. If the tree is dirty or HEAD has moved past `78c54cc46`, everything in §6 needs
   re-running before it can be cited.
2. After 20/08 13:33, dispatch one codex review bound to the then-current HEAD using
   `~/.claude/skills/pr-release-gate/references/reviewer-brief.md`.
3. Run the recorder with the four gate commands from §6, then **push only — no PR.**

**Do not redo**

- Do not re-verify the vacuous apply; §3(a) closes it with three positive controls at this SHA.
- Do not re-run the two reviews of `093963dd5`; both are in `.handoff-logs/reviews/`.
- Do not chase `repro-prod-exposure.sh` to exit 0 — that is an outage instruction.
- Do not open a PR. The founder's 19/08 instruction is push-only while the branch is RED.

**First command to run**

```
git status --short && git rev-parse HEAD
```

## 9. Risk notes

- **A second Claude session has been committing to this branch throughout.** It advanced HEAD
  from `093963dd5` to `78c54cc46` (7 commits) during this session. Every receipt here is pinned
  to `78c54cc46` in a detached worktree precisely because the shared tree is not stable.
- **The branch is RED by design and must not be released.** F9's decision is the gate.
- **No independent review exists for `78c54cc46`.** The gates are green; the review is absent, and
  absence of a review is not a pass.
- `git stash list` is non-empty (22 entries, none from this session), so DoD item 3 is not fully met.
- No secrets were read or written. No production system was touched.

## 10. Handoff quality check

Every exit code, test count and error string above came from a command run this session against
`78c54cc46`; none is carried forward from an earlier SHA. The previous handoff's stale rating is
corrected in §1 rather than left to be discovered. Skips are named with their reason instead of
being absorbed into a pass count. The one place the evidence stops — no independent review at
this HEAD — is stated in §9 and rated below, not rounded up.

Grounded 19/08/2026: HEAD `78c54cc46`, clean tree, 22 ahead of `origin/main` — `git rev-parse HEAD`, `git status --porcelain` (empty), `git log --oneline origin/main..HEAD | wc -l` → 22 (exit 0)
Grounded 19/08/2026: 411 tests, 408 pass, 0 fail, 3 interpreter-gated skips; readiness gate 10 pass / 0 fail / 0 blocking — `npm run verify:readiness` (exit 0) @ `78c54cc46`
Grounded 19/08/2026: the RLS/EXECUTE coupling holds — `scripts/ship-gates/prove-rls-execute-coupling.sh` (exit 0) @ `78c54cc46`
Grounded 19/08/2026: the re-grant is load-bearing — `scripts/ship-gates/prove-auth-admin-regrant.sh` (exit 0) @ `78c54cc46`
Grounded 19/08/2026: the rollback restores the observed prior state and refuses a wrong project — `scripts/ship-gates/prove-rollback.sh` (exit 0) @ `78c54cc46`
Grounded 19/08/2026: the repro is red by design on 9 rows including `get_my_org_ids` — `scripts/ship-gates/repro-prod-exposure.sh` (exit 1) @ `78c54cc46`
Grounded 19/08/2026: the prod apply refuses an empty and a 1-of-4 partial database, and so does the rollback — `psql -v ON_ERROR_STOP=1 -f …-lock.sql` / `…-lock.down.sql` (exit 3, `apply aborted` / `rollback aborted`) @ `78c54cc46`
Grounded 19/08/2026: F2 is the oldest open founder blocker at 44 days — `node scripts/founder-queue.mjs` (exit 0)

Waterline: Class 1 · Stage LOCALLY_VERIFIED (rung 3/12 Test) · AA — evidence: `npm run verify:readiness` (exit 0) @ `78c54cc46` · `prove-rls-execute-coupling.sh` (exit 0) @ `78c54cc46` · `prove-auth-admin-regrant.sh` (exit 0) @ `78c54cc46` · `prove-rollback.sh` (exit 0) @ `78c54cc46` · ABSENT: independent review bound to `78c54cc46` (codex quota until 20/08 13:33)

Rated **AA, not AAA**: every receipt is bound to this exact SHA, but the review evidence class
required at rung 4 is absent, and rung 3 cannot be claimed complete without it being available to
the next rung. Rungs 4-12 are not reached.

Handoff complete. Next safe action: run `git status --short && git rev-parse HEAD` to see whether the other session has moved the branch again before citing anything in §6.
