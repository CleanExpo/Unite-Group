# Session Handoff — UNI-2597, destructive suite gets its own database

- **Written:** 17/08/2026 22:57 AEST
- **Repo:** `CleanExpo/Unite-Group`
- **Branch:** `fix/uni-2597-destructive-suite-own-db` @ `8004702415248e3308f82efb77155ffed4803d35`
- **Worktree:** `/private/tmp/claude-501/-Users-phillmcgurk/4e7dc9db-88b5-4667-a486-d4783e28ba1c/scratchpad/wt-2597`
- **State:** **READY-TO-SHIP** (pushed, receipt bound, PR not opened)

---

## 1. Summary

**Phase 0.5 state: READY-TO-SHIP.** Definition-of-Done: 4 of 5 met; item 1 fails on a
carried-over instruction (D19, below) and item 3 fails only on 23 pre-existing stashes that
predate this session.

| | |
|---|---|
| **Completed** | UNI-2597 steps 1–4 implemented on top of merged `main`, pushed, `PR_RELEASE_GATE_PASS` issued and bound to the pushed head |
| **Completed** | Independent review PASS with a valid parse receipt, zero blocking findings |
| **NOT DONE** | The D19 FOUNDER-QUEUE record — the founder's *first* instruction — landed nowhere. See §7. |
| **NOT DONE** | PR not opened. Blocked on a gate/harness mechanic, not on evidence. See §7. |
| **Superseded** | ~9 commits of an earlier substrate (pgvector service container + hand-written platform shim) discarded when PR #1022 merged another lane's Supabase-CLI implementation |

---

## 2. Where it started

Founder instruction, verbatim scope:

> Record in FOUNDER-QUEUE.md: D19 resolved 17/08/2026 by Phill — ephemeral Postgres in CI;
> SPINE_DATABASE_URL never enters CI or any workflow. Then rework the spine gate to spin
> ephemeral Postgres in-workflow, prove it red-then-green, and land PR #1022. One lane. One PR.
> Stop after.

Mid-session, a second instruction arrived on UNI-2597 (separate database for the destructive
suite; `fileParallelism:false` disproven; implement steps 1–4 including the required guard test).

Constraints in force: PR release gate (SHA-bound independent review before push); no
`--no-verify`, no force push, no `PR_RELEASE_GATE_HUMAN_OVERRIDE`; opening a PR in this estate
≈ authorising its merge.

---

## 3. Decisions locked + what shipped

**Decisions**

1. **Abandoned my own substrate.** PR #1022 merged *mid-session* as `966487bb5` — another lane's
   implementation using the Supabase CLI (`supabase start`, real `auth` schema, real roles,
   `ci/00_extensions.sql`). My branch used a pgvector service container plus a hand-written
   platform shim. Theirs is better: the real platform rather than an approximation, so the
   shim-fidelity risk disappears. I discarded mine rather than push a competing implementation.
2. **Kept `fileParallelism: false`, against UNI-2597 step 2.** Evidence below. The ticket's
   rationale for restoring the default was wall-clock, not correctness, and it analysed only the
   destructive collision.
3. **Did not route around the release gate** to open the PR. See §7.

**Shipped**

- Branch pushed: `fix/uni-2597-destructive-suite-own-db` → `8004702`
- Remote head == local head == receipt head (all `8004702415248e3308f82efb77155ffed4803d35`)
- `PR_RELEASE_GATE_PASS head=8004702415248e3308f82efb77155ffed4803d35 reviewer=ollama-gpt-oss-120b`
- **No PR URL — none was opened.**

---

## 4. Key files

| File | Status | Note |
|---|---|---|
| `packages/spine/packages/spine/ci/01_migration_db.sql` | Created | `auth` shim for the second database only. Roles are cluster-wide; schemas are not — Supabase creates `auth` only in the default DB, and `migrations/0001` validates `auth.jwt()` at CREATE time |
| `.github/workflows/ci.yml` | Modified | Creates `spine_migrations` (guarded by a `pg_database` check), applies extensions + shim, sets `SPINE_MIGRATION_DATABASE_URL` |
| `packages/spine/packages/spine/tests/integration/idempotency.test.ts` | Modified | Own client; restore hook **deleted**; two guard assertions added |
| `packages/spine/packages/spine/vitest.config.ts` | Modified | `fileParallelism:false` retained, for a newly-measured reason |
| `.gitignore` | Modified | `supabase/.branches/`, `vitest-report.json` |
| `FOUNDER-QUEUE.md` | **Needs review** | D19 edit exists only on abandoned commit `8d7193fc8`. **Not on main, not on the branch.** |

---

## 5. Running state

- **Supabase local stack: RUNNING** — restarted for this handoff's Phase 0 gate, `supabase start`
  exit 0, DB on `127.0.0.1:54322`. Stop with `npx --yes supabase@2.114.0 stop` from
  `packages/spine/packages/spine`.
- pgvector container `spine-ci-local`: removed (`docker rm -f`, exit 0).
- No background jobs, no cron, nothing else running.

---

## 6. Verification — exact commands

Run from the worktree, with Node 24 on PATH and both DB URLs exported:

```bash
export PATH="/private/tmp/claude-501/-Users-phillmcgurk/4e7dc9db-88b5-4667-a486-d4783e28ba1c/scratchpad/node-v24.19.0-darwin-arm64/bin:$PATH"
export SPINE_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
export SPINE_MIGRATION_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/spine_migrations"

npm run verify:readiness   # -> exit 0, 363/363
npm run verify:spine       # -> exit 0, 23 executed / 0 skipped, selfcheck PASS
```

**Phase 0 results, this session, at handoff time**

| Gate | Exit | Result | Log |
|---|---|---|---|
| `verify:readiness` | 0 | 363 tests, 363 pass, 0 fail | `scratchpad/ho-readiness.log` |
| `verify:spine` | 0 | 23 executed, 0 skipped, selfcheck PASS | `scratchpad/ho-spine.log` |

**Evidence from earlier in the session (not re-run at handoff)**

- Shared fixture survives the destructive suite: 20 spine tables, 7 seeded parties,
  `migrate.outbox` present, after a run in which the suite dropped and rebuilt the spine 5×
- `rls.test.ts` isolated → 4/4, non-vacuous: org B 0 leads / 0 jobs vs org A 1 / 1, at
  `current_user=authenticated`, `is_superuser=false`
- Guard, both URLs at one DB → exit 1; guard, `localhost:54322/postgres/` vs
  `127.0.0.1:54322/postgres` → exit 1 (a string compare passes that second case)
- Parallelism: `fileParallelism` default → **4 passed / 2 FAILED of 6**; `false` → **6 / 0 of 6**

---

## 7. Deferred + open questions

### Deferred (owner / blocking / why)

1. **D19 record in `FOUNDER-QUEUE.md` — NOT LANDED.** Owner: next session.
   Blocking: nothing technical; it is a documentation record the founder explicitly asked for.
   Why: the edit was made on `8d7193fc8`, commit 2 of `fix/uni-2580-spine-evidence`. PR #1022
   merged **only commit 1** (`966487bb5`), so the record never reached `main`. Verified this
   session: `git show origin/main:FOUNDER-QUEUE.md | grep D19` → still `| ... | open |`, and the
   same on the pushed UNI-2597 branch.
   **Recovery:** re-apply the row move (Open → Resolved, with decision text) on the current
   branch. Note this moves the head off `8004702` and **invalidates the release-gate receipt**,
   so it requires a fresh independent review + `issue` before pushing.
2. **Open the PR.** Owner: founder, or a session whose shell cwd is inside the repo.
   Blocking: ships UNI-2597. Command in §8.
3. **Non-overlapping fixtures for `c3_completeness` and `match_isolation`.** Owner: next lane.
   Blocking: removal of `fileParallelism:false`. Both insert into `field.evidence` for org A;
   until they don't, parallel execution fails ~1 run in 3. The reviewer's one open P2.
4. **23 pre-existing stashes** in the Unite-Group checkout, oldest from June 2026. Not mine, not
   touched. Blocking: nothing. Flagged because DoD item 3 requires an empty stash list.

### Open questions

1. Was PR #1022 merged deliberately, or by automation? It merged mid-session while I was
   building on that branch. Relevant because `auto-merge-while-red-poisons-main` is a known
   estate hazard and the merged commit was the fail-closed selfcheck **without** the database —
   green only because the other lane's Supabase work was in the same PR. Owner: founder.
2. Does `/install-github-app` need finishing? It reported "GitHub Actions setup complete!" but no
   Claude workflow file exists in `.github/workflows/`. `gh api /user/installations` returns 403
   (needs an app token, not the CLI's OAuth token), so I could not confirm the install.
   Owner: founder — check `github.com/settings/installations`.

---

## 8. Pick up here

**Start here**

1. Confirm the pushed head is untouched: `git -C <worktree> rev-parse HEAD` → `8004702415248e3308f82efb77155ffed4803d35`
2. Open the PR (below), **or** land the D19 record first — doing D19 first invalidates the
   receipt, so choose deliberately. Recommended: **open the PR first** (it is reviewed, receipted
   and green), then land D19 as its own small change.
3. Restart Supabase before running any spine gate; it is running now but will not survive a reboot.

**Do not redo**

- Do not rebuild the pgvector/shim substrate. It is superseded by `main`'s Supabase-CLI approach.
- Do not remove `fileParallelism: false`. Measured: it fails 2 runs in 6.
- Do not re-review `8004702` — it holds a valid PASS with a verified parse receipt.

**First command to run**

```bash
gh pr create --base main --head fix/uni-2597-destructive-suite-own-db \
  --title "fix(spine): UNI-2597 — give the destructive migration suite its own database" \
  --body-file /private/tmp/claude-501/-Users-phillmcgurk/4e7dc9db-88b5-4667-a486-d4783e28ba1c/scratchpad/pr-2597.md
```

Must be run with the shell's working directory **inside** the repo — the release gate resolves
repo context from cwd and forbids `--repo` on `gh pr` actions.

---

## 9. Risk notes

- **The PR body file lives in the session scratchpad**, which is ephemeral. If it is gone,
  reconstruct from the three commit messages on the branch — they carry the same evidence.
- **The release-gate receipt is bound to `8004702`.** Any commit on this branch voids it.
- **Local-vs-CI substrate parity is good but not identical**: I verified against
  `supabase@2.114.0` — the version CI pins — on macOS/arm64. CI runs linux/amd64. The
  `create database` guard, extensions and auth shim are all platform-independent, but the run
  itself has not been observed on a GitHub runner.
- **`gh api /user/installations` → 403** is an API-token-type limitation, not evidence about
  whether the GitHub App installed.
- **Unverified assumption:** that no other lane is concurrently editing `.github/workflows/ci.yml`.
  The kernel list at `ci.yml:179` is the estate's known serialisation point and collided once
  already this session (union-resolved between `canonical-naming` and `spine-evidence-selfcheck`).
- Node 24.19.0 lives only in the ephemeral scratchpad; the machine default `node` is v22.22.3,
  which fails 3 workflow-supply-chain tests for unrelated reasons.

---

## 10. Handoff quality check

| Rule | Status |
|---|---|
| Tests claimed passed were actually run this session | Yes — both gates run at handoff, exit 0, logs cited in §6 |
| Nothing claimed shipped without evidence | Yes — push, remote head and receipt head all verified equal; PR explicitly **not** opened |
| Running processes verified, not assumed | Yes — Supabase restarted with exit 0 this phase; pgvector container removal confirmed |
| Completed vs deferred kept separate | Yes — §7 lists 4 deferred items, including the founder's own first instruction |
| First command provided | Yes — §8 |

---

Handoff complete. Next safe action: open the PR with the §8 command from inside the repo, then land the D19 FOUNDER-QUEUE record as a separate change with its own review and receipt.
