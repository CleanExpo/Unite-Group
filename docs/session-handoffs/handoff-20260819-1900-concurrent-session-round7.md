# Handoff 19/08/2026 19:00 — WIP-BLOCKED. Two agents on one branch; a second independent review lands 2 P0

**Branch `claude/ship-gate-exposure-repair`. HEAD `c3730bf00` when this was written, 15 commits
ahead of `origin/main` (`2dc3c0226`), never pushed. Tree DIRTY and moving — another Claude Code
session (VS Code terminal) is editing it right now.**

## 0. Read this before you touch anything

`git status` at 19:00 showed `M scripts/ship-gates/prove-rls-execute-coupling.sh` and
`?? scripts/ship-gates/lib/` — neither authored by this session. HEAD also advanced from
`093963dd5` to `c3730bf00` **while this session's review was in flight**. A second agent is
working this branch concurrently.

Consequences you must respect:

- **Do not run gates in the shared working tree.** The gate run recorded in §6 was launched
  against a clean `c3730bf00` and finished with the tree dirty, so its exits are **not cleanly
  bound to any SHA**. Rated accordingly below. Use `git worktree add <tmp> --detach <sha>`.
- **Do not commit the other session's in-progress edits.** They are mid-fix on the round-7 P0-1.
- **Reconcile before adding commits.** Two agents drafting commits on one branch is how a fix
  gets reverted by a stale editor.

## 1. Summary and classification

**WIP-BLOCKED. INCOMPLETE.** Definition-of-Done: fails items 1, 3 and 4 — work unfinished, tree
not clean, nothing pushed.

| | |
|---|---|
| Attempted | Discharge the session boot contract; run the release gate on a branch the last handoff said was blocked on reviewer availability |
| Completed | Codex availability disproved the recorded blocker; a full independent codex review of `093963dd5` was dispatched, returned **FAIL (2 P0, 4 P1)**, and is preserved durably |
| Completed | One live P1 re-proved directly at `c3730bf00` — the production apply file commits a vacuous success on an empty database (§3) |
| Partial | Gate run at `c3730bf00` — exits captured, binding compromised by the concurrent edit |
| Not touched | No commits, no push, no PR, no production SQL, no Linear, no secrets |

## 2. Where it started

No task was given ("assist and work together as one with claude code in the VS Code terminal"),
so the `CLAUDE.md` session boot contract applied: read the SSOTs, state the top FOUNDER-QUEUE
blocker, then take the top unblocked work. The branch's own last handoff
(`handoff-20260819-1400-push-blocked.md`) named exactly one blocker — no non-Claude reviewer —
so that was the thread.

**Top FOUNDER-QUEUE blocker: F2, "Click Connect Google in the CRM Integrations panel", open 44
days**, derived from `node scripts/founder-queue.mjs` (9 open, integrity OK). Untouched by this
session; it is one founder consent click.

## 3. Decisions locked + what shipped

**Nothing shipped. No commit was authored by this session.** Two findings are locked:

**(a) The recorded push blocker was stale.** `handoff-20260819-1400` said the branch could not
be pushed because no non-Claude reviewer was available and "Codex resets 20/08/2026 1:33 PM".
Codex 0.145.0 answered a read-only probe at 18:33 and then ran a full review. **Check reviewer
availability before trusting an inherited blocker** — a rate-limit window recorded in prose is a
claim about the past.

**(b) The file FOUNDER-QUEUE F9 tells the founder to paste into production reports success
against a database that contains none of its targets.** Reproduced directly at `c3730bf00`, not
inherited: created an empty database, ran
`docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql` under `ON_ERROR_STOP=1`, and it
printed `post-condition OK`, **exited 0 and COMMITted** with `0` of its four target functions
present. `git diff 093963dd5..c3730bf00 -- <that file>` is empty, so `c3730bf00` did not touch it.
Pasted into the wrong project — the exact operator error an identity assertion exists to catch —
it reads as a clean success. Both independent codex reviews raised this.

## 4. Key files

| File | Status |
|---|---|
| `.handoff-logs/reviews/codex-round7-093963dd5-second-independent.json` | Created — the review this session dispatched. FAIL, 2 P0 + 4 P1, SHA-bound to `093963dd5`. sha256 `80afa1fc0252…` |
| `.handoff-logs/reviews/codex-round7-093963dd5-transcript.log` | Created — full reviewer transcript, 502 KB, contains every reproduction command |
| `.handoff-logs/reviews/codex-round6-093963dd5.json` | Read-only — the OTHER session's review of the same SHA. FAIL, 3 P0 + 12 P1 |
| `docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql` | **Needs review** — unchanged since `093963dd5`; the vacuous-apply P1 in §3 is live |
| `scripts/ship-gates/prove-rls-execute-coupling.sh` | **Do not edit** — the other session has uncommitted changes in it |
| `scripts/ship-gates/lib/` | **Do not touch** — untracked, the other session's in-progress work |
| `docs/session-handoffs/handoff-20260819-1400-push-blocked.md` | Read-only — its stated blocker is superseded by §3(a) |

## 5. Running state

Nothing running. The dispatched codex review completed (exit 0) and its worktree is disposable.
Local Postgres 17.6 is up at `postgresql://postgres:postgres@127.0.0.1:54322/postgres` — verified,
not assumed. The other Claude session's state is unknown to this one.

## 6. Verification — exact commands

Run at `093963dd5`, clean tree, fully bound:

```
npm run verify:readiness                                    # exit 0 (pass 9, fail 1 non-blocking, blocking 0)
scripts/ship-gates/prove-rls-execute-coupling.sh <uri>      # exit 0
scripts/ship-gates/prove-auth-admin-regrant.sh <uri>        # exit 0
scripts/ship-gates/prove-rollback.sh <uri>                  # exit 0
```

Re-run at `c3730bf00` — **same four exits plus `repro-prod-exposure.sh` exit 1 as designed — but
the tree went dirty mid-run, so treat these as indicative, not bound.** Re-run in a detached
worktree before anyone relies on them.

The vacuous-apply reproduction (§3b), run at `c3730bf00`:

```
psql -X -q -d <uri>/postgres -c "CREATE DATABASE vacuous_apply_check_$$"
psql -X -q -v ON_ERROR_STOP=1 -d <uri>/vacuous_apply_check_$$ \
  -f docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql   # exit 0  <-- the defect
psql -X -A -t -d <uri>/vacuous_apply_check_$$ -c "<count of the 4 target functions>"  # 0
```

`repro-prod-exposure.sh` **must exit 1** and must never be driven to 0 — that means revoking
`authenticated` EXECUTE on `get_my_org_ids`, which takes production down. Unchanged.

## 7. Deferred and open questions

**Deferred**

| Item | Owner | Blocking | Why deferred |
|---|---|---|---|
| Reconcile the two concurrent sessions onto one editor of this branch | Next agent / Phill | every further commit | Cannot be resolved from inside one of them |
| Re-review at the true final HEAD | Next agent | the push | Both reviews bind `093963dd5`; HEAD is past it and still moving. A PASS for an older SHA is invalid |
| Identity + minimum-effect assertion on the forward apply file | Next agent | F9's paste | Live P1 at HEAD; the fix belongs to whoever owns the file next |
| Issue the receipt and push (push only, no PR) | Next agent | — | Requires a PASS bound to the final HEAD, which does not exist |

**Open questions**

| Question | Owner | Blocking |
|---|---|---|
| **F9's security-model call.** Is `authenticated` executing a `SECURITY DEFINER` function an exposure (RLS design changes), or a required pattern (query 3 gets a named allowlist, ship-board item 6 becomes ACCEPTED-BY-DESIGN)? | **Phill** | the production paste, and release of this branch |
| Round 6 reported 3 P0 + 12 P1; `c3730bf00`'s message accounts for "2 P0 and 7 P1" and drains seven. Which of the remaining findings are deliberately accepted and which are simply undrained? | The other session | the next review round |
| `prove-rls-execute-coupling.sh`'s P0-1 (a gate cannot prove it was not itself edited) is declared accepted-by-design in `c3730bf00` but is a P0 in both reviews. Accepted or open? | The other session / Phill | the verdict |

## 8. Pick up here

**Start here**

1. `git rev-parse HEAD` and `git status` — establish whether the other session is still editing.
   If the tree is dirty, coordinate before doing anything else.
2. Read `.handoff-logs/reviews/codex-round7-093963dd5-second-independent.json` — six findings,
   each with a literal reproduction command in the `reproduction` field.
3. Fix the vacuous forward apply (§3b) if the other session has not; it is the one finding that
   touches what the founder actually pastes into production.
4. Only when HEAD is final and the tree is clean: one fresh codex review bound to that SHA, then
   the recorder, then **push only — no PR.**

**Do not redo**

- Do not re-establish that codex is available. It is (§3a).
- Do not re-run the two existing reviews of `093963dd5`; both are preserved in `.handoff-logs/reviews/`.
- Do not chase `repro-prod-exposure.sh` to exit 0. It is an outage instruction.
- Do not open a PR. Founder instruction 19/08 is push-only while the branch is RED.

**First command to run**

```
git status --short && git rev-parse HEAD
```

## 9. Risk notes

- **The §6 `c3730bf00` gate exits are not cleanly SHA-bound.** The tree went dirty during the run.
  This is stated rather than rounded up; re-run in a detached worktree.
- **Two agents, one branch, no lock.** The concrete risk is a stale editor reverting a landed fix.
- **Both reviews are stale by SHA.** Neither can be used as a receipt for the current HEAD.
- **The branch is RED by design and must not be released.** F9's security-model decision is the gate.
- No secrets were read or written. No production system was touched.

## 10. Handoff quality check

Every exit code above came from a command run in this session; none is inherited. The single
claim about production behaviour (§3b) was reproduced locally rather than argued. The one place
this session's evidence is weak — the `c3730bf00` gate binding — is named in §6 and §9 rather
than presented as clean. Nothing is claimed shipped, because nothing was.

Grounded 19/08/2026: HEAD `c3730bf00`, 15 ahead of `origin/main`, never pushed — `git log --oneline origin/main..HEAD | wc -l` (exit 0)
Grounded 19/08/2026: a second agent is editing this tree — `git status --porcelain` (exit 0) shows `M scripts/ship-gates/prove-rls-execute-coupling.sh`, `?? scripts/ship-gates/lib/`, authored by neither this session nor `c3730bf00`
Grounded 19/08/2026: codex is available — `codex exec --sandbox read-only` returned `CODEX_READY` (exit 0)
Grounded 19/08/2026: independent review of `093963dd5` is FAIL with 2 P0 — `.handoff-logs/reviews/codex-round7-093963dd5-second-independent.json`
Grounded 19/08/2026: the production apply file commits on an empty database — `psql -v ON_ERROR_STOP=1 -f docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql` (exit 0) against a fresh database holding 0 of its 4 target functions
Grounded 19/08/2026: F2 is the oldest open founder blocker at 44 days — `node scripts/founder-queue.mjs` (exit 0)

Waterline: Class 1 · Stage BLOCKED (rung 3/12 Test, not cleared) · FAIL — evidence: `.handoff-logs/reviews/codex-round7-093963dd5-second-independent.json` (verdict FAIL, 2 P0) · `npm run verify:readiness` (exit 0) @ `093963dd5` · ABSENT: any independent review bound to the current HEAD

Handoff complete. Next safe action: run `git status --short && git rev-parse HEAD` to see whether the other session has finished editing, and coordinate before any further commit.
