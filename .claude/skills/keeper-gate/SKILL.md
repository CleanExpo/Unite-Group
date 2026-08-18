---
name: keeper-gate
description: The mandatory pre-PR gate — nothing dirty or untested reaches the keeper. Use BEFORE opening ANY pull request (drafts included — drafts get merged), before un-drafting one, before pushing a new commit to an open PR branch, and before claiming LOCALLY_VERIFIED or any later Ladder rung. Also use when a session is about to write "gauntlet pending" into a PR body — that phrase is banned; the gauntlet runs first or the PR does not open.
---

# Keeper gate — no untested change reaches a PR

> Motivated by two same-day incidents (18/08/2026). PR #1028 was opened as a
> draft with "Gauntlet pending — exit codes will be quoted here before the PR
> leaves draft" written in its body, and was merged in that state — the pending
> checklist went through to the keeper. PR #1033's local gauntlet ran on the
> pre-commit dirty tree and sampled one suite instead of running the package's
> full gauntlet. Both are rung-4 claims on partial rung-3 evidence — the exact
> P9 defect the Ground-Truth Standard exists to stop, committed by the session
> that wrote the standard. This skill makes rung 3 (LOCALLY_VERIFIED) a hard,
> executable precondition of rung 4 (PR_OPEN). It binds to
> `.claude/rules/ground-truth-standard.md` and UNI-2517; it defines nothing new.

## The six gates — all pass, or the PR does not open

Run in order. Any failure → STOP, fix or name the blocker; there is no
"open it as draft and finish later". A draft PR is a PR.

1. **Commit first, then verify — SHA binding.** All verification runs on the
   COMMITTED tree, never a dirty one. `git status --short` must be empty and
   `git rev-parse HEAD` captured in the same run as every gate command. Evidence
   gathered before the commit binds to nothing (AA at best) — re-run it.

2. **Full gauntlet for every touched package — no sampling.** Map changed paths
   to packages, then run each package's FULL verify (the same jobs CI runs —
   root `package.json` `verify:*` scripts mirror `.github/workflows/ci.yml` via
   `scripts/lib/preflight-jobs.mjs`, with a test asserting the mirror):
   - `apps/web/**` → in apps/web: `pnpm run lint` AND `pnpm run type-check`
     AND `pnpm run test` (the full suite, not the one spec you changed) AND
     `pnpm run build` when config/deps/route wiring changed.
   - other packages → their root `verify:<pkg>` script.
   - any `.md`/doctrine/config → `node scripts/check-au-english.mjs`,
     `bash scripts/check-canonical-naming.sh origin/main HEAD`,
     `npm run check:nul-bytes`.
   Every command's exit code is captured. A container-scoped failure (missing
   Node version, denied network) is quoted with its error and named
   "unavailable from here" — it does not pass silently and it does not count
   as green.

3. **Read the whole diff as the reviewer.** `git diff origin/main...HEAD` —
   read every hunk, not the stat line. Check the diff-smell list (Ground-Truth
   Standard §How it binds the build): `any`/`@ts-ignore`/`eslint-disable`
   silencing a gate, tests bent toward the bug, assertions deleted, mocks
   posing as real, debug/console leftovers, files included by accident
   (`git diff --stat` count matches intent).

4. **Every new or changed test proves itself.** Run the mutation control: show
   the test FAILING against the unfixed code (stash the fix, run, expect red,
   restore) or failing when its assertion is inverted. A test never seen red is
   not evidence (the PR #1009 shape). Quote both exit codes.

5. **Bypass attempt on this diff's real risk surface.** Name the plausible
   failure mode of THIS change, construct the attack, show the run that closes
   it. Attacking a cheap input instead of the plausible one is the bypass of
   the bypass.

6. **Assemble the receipts BEFORE the PR call.** The PR body is written with
   its `Grounded` lines (each with exit code @ the pinned SHA), the
   `Bypass attempt:` line, and the `Waterline:` line reflecting what the
   receipts prove — no pending checkboxes, no "will be quoted later", no
   forward promises. If a receipt does not exist, the work is not at PR_OPEN.

## After pushing

- Verify CI check runs land green on the EXACT pushed SHA (the merge arbiter is
  the Monorepo CI workflow, not the Vercel bot). A new push resets the clock —
  gates 1–6 apply again to every subsequent commit on the branch.
- Un-drafting is a second keeper moment: re-confirm the head SHA's checks are
  all green and the body's receipts still match the head before flipping.

## Banned at this gate

"Gauntlet pending" in any PR body · opening a draft to "finish verification
later" · receipts from a dirty tree presented as SHA-bound · a single spec run
presented as the package suite · a green message without its exit code · a new
test never seen red.

## Red flags that the gate was skipped

- A PR body containing unticked verification checkboxes at open time.
- Receipts whose commands predate the head commit's timestamp.
- `vitest run <one file>` as the only test receipt for a code change.
- A `Waterline:` line claiming rung ≥3 with no full-gauntlet receipt.
