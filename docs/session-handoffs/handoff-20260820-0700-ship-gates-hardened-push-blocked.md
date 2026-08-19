# Session handoff — 2026-08-20 ~07:00 AEST

**Repo** `CleanExpo/Unite-Group` · **Branch** `claude/ship-gate-exposure-repair`
**HEAD** `6f2470888e57b954de681e706c8142d92413aa28` · **Base** `2dc3c0226` (= `origin/main`)
**43 ahead, 0 behind, tree clean, NEVER PUSHED**

---

## 1. Summary + Phase 0.5 classification

**WIP-BLOCKED (INCOMPLETE).** Not SHIPPED, not READY-TO-SHIP.

| | |
|---|---|
| Attempted | Make the multi-vendor independent reviewer real; drain every finding it returns; fix the P0 in `run-prod-exposure.sh`; re-review |
| Completed | 20 review rounds run; ~40 findings drained, each pinned by a mutation control proven able to fail; 9 local gates at expected values |
| Completed | The "blocked on codex quota" failure mode removed estate-wide (see §3) |
| Partial | The positive control's lexical-constant class is closed; the ENVIRONMENTAL residual is not, and is stated rather than hidden |
| Not touched | No push, no PR, no production SQL, no Linear write this session, no secrets rotated |

**Definition-of-Done:** 1 ✅ · 2 ⚠️ (see §6 — `verify:readiness` green, `npm run verify` red
identically on `origin/main`) · 3 ✅ tree clean / ⚠️ 23 pre-existing stashes, none from this
session · 4 ❌ nothing pushed and it may not be · 5 n/a (no user-visible surface).
**Item 4 false ⇒ WIP, not READY-TO-SHIP.**

---

## 2. Where it started

Resumed from `handoff-20260819-1145.md` on a branch that was RED by design and blocked on
"no non-Claude reviewer available". Founder then gave two directives that shaped the session:

1. **19/08** — *"YOU HAVE MORE THAN CODEX AVAILABLE. USE GEMINI API KEY, AND OPENROUTER…
   FIND WHERE THIS LIVES EVERYWHERE GLOBALLY AND MAKE THE CHANGES. HARD CODE THE CHANGES."*
2. **20/08** — *"fix the P0 in run-prod-exposure.sh, then review again."*

---

## 3. Decisions locked + what shipped

**Nothing shipped. All work is local on an unpushed branch.**

**Locked: codex is one lane of four, and that is now enforced in code.**
`~/.claude/skills/pr-release-gate/scripts/independent_review.py` tries
`codex → openrouter → gemini → ollama` and only exits 2 when ALL lanes fail, naming a reason
per lane. Committed to the skills-library repo as `36b7409`. Root cause of the recurrence was
a memory whose `description:` said *"There is no OpenRouter API key on this Mac"* while its own
body carried the correction — and `description:` is the field recall surfaces. Headline
corrected; canonical replacement memory `independent-reviewer-lanes-are-plural` written.

**Locked: an exit code is not a verdict.** `codex exec` EXITS 0 on quota exhaustion having
written no report. Every lane is judged on the report FILE.

**43 commits on this branch.** The load-bearing ones:

| SHA | What |
|---|---|
| `8742e2db7` | round-6 P0s: the two controls that could not fail |
| `28162dff1` | the production apply file no longer COMMITs a vacuous success on the wrong database |
| `0874be277` | rollback restores the pre-state it OBSERVED (receipt table), not one presumed |
| `600ed6505` | capture read the EFFECTIVE privilege, not the DIRECT grant — this repo's own root cause, inside its fix |
| `e94d2f5de` | deleted the control's name generator; identifiers sampled from the target's live schema |
| `2563cae40` | the control's own hit test was a prefix match, hiding a live mutant |
| `6614d590b` | cluster-wide role leak fixed once in `pgprobe`, not per file |
| `6f2470888` | control only ever seeded lower_snake_case; step 4 accepted exit 2 |

---

## 4. Key files

| File | Status |
|---|---|
| `scripts/ship-gates/run-prod-exposure.sh` | Modified — the gate that runs against PRODUCTION; positive control rebuilt 7× |
| `scripts/ship-gates/lib/pgprobe.sh` | Created — shared scalar/exec/disposable-db/role primitives |
| `scripts/ship-gates/prove-rollback-fidelity.sh` | Created — 7 cases incl. stale-receipt lifecycle |
| `scripts/ship-gates/prove-apply-identity.sh` | Created — 5 cases incl. overload refusal |
| `scripts/ship-gates/repro-prod-exposure.sh` | Modified — steps 5-8 now RUN (they never had) |
| `scripts/ship-gates/prove-rollback.sh`, `prove-auth-admin-regrant.sh`, `prove-rls-execute-coupling.sh` | Modified — EXIT-trap + role-leak class sweep |
| `docs/specs/sql/2026-08-19-privileged-function-exposure-lock.sql` | **Modified — THE FILE THE FOUNDER PASTES.** Identity guard + pre-state receipt |
| `…-lock.down.sql` | Modified — bidirectional restore, receipt consumed, role skip |
| `FOUNDER-QUEUE.md` | Modified — F9 rewritten twice; states what is and is NOT tested |
| `docs/mission-control/ship-board.md` | Modified — stale NOT REACHED rows corrected |
| `.claude/portable-allowlist.json` | Modified — blanket `psql:*` and `scripts/:*` grants REMOVED; overclaim withdrawn |
| `.handoff-logs/reviews/*.json` | Created — reviewer reports persisted (rounds 1-5 were lost with their worktrees) |

---

## 5. Running state

Nothing running. Two Postgres clusters were up and used, both verified before the gate run:

- **target** `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (PG 17.6, Supabase local)
- **control** `postgresql://postgres:postgres@127.0.0.1:55433/postgres` — a throwaway
  `postgres:17` container (`docker run -d --name ctlpg2 -p 55433:5432`). **Still running.**
  `run-prod-exposure.sh --control` needs a genuinely different cluster; it refuses one whose
  `system_identifier` matches the target.

Phase 0 log: `.handoff-logs/handoff-20260820-0647.log`
Node-24 verify log: `.handoff-logs/verify-final-6f2470888.log`

**Both logs are LOCAL ONLY — `.handoff-logs/` is gitignored, and the release gate forbids an
agent using `git add -f`.** A reviewer on another machine cannot open them and must re-run §6
instead. Earlier rounds on this branch force-added such logs; that route is now closed to
agents by design, so this evidence is reproducible rather than portable. Said here so nobody
cites a path a reviewer cannot read.

---

## 6. Verification — exact commands

All run this session at `6f2470888`, both clusters confirmed up first.

```bash
U=postgresql://postgres:postgres@127.0.0.1:54322/postgres
C=postgresql://postgres:postgres@127.0.0.1:55433/postgres

npm run verify:readiness                                   # exit 0
bash scripts/ship-gates/prove-rls-execute-coupling.sh "$U" # exit 0
bash scripts/ship-gates/prove-auth-admin-regrant.sh   "$U" # exit 0
bash scripts/ship-gates/prove-rollback.sh             "$U" # exit 0
bash scripts/ship-gates/prove-rollback-fidelity.sh    "$U" # exit 0  (7 cases)
bash scripts/ship-gates/prove-apply-identity.sh       "$U" # exit 0  (5 cases)
bash scripts/ship-gates/repro-prod-exposure.sh        "$U" # exit 0  (now reaches step 8)
bash scripts/ship-gates/run-prod-exposure.sh "$U" --control "$C"   # exit 0
node --test scripts/__tests__/founder-queue.test.mjs        # exit 0
node scripts/founder-queue.mjs                              # exit 0
```

Leak checks after the full suite: **0** scratch databases locally; **0** databases AND **0**
seeded roles on the control cluster.

### `npm run verify` is RED, and it is NOT this branch

`npm run verify` exits 1 at `verify:spine`: the 5 spine integration suites
(`rls`, `match_isolation`, `c3_completeness`, `idempotency`, `outbox_race`) are **all skipped**
— 3 executed, 20 skipped — so `spine-evidence-selfcheck.mjs` correctly reports
`CAPABILITY_UNPROVEN` for tenant-isolation, migration-integrity, data-completeness and
relay-concurrency. That is the gate behaving correctly over a missing DB, not a false green.

**Proven pre-existing, not assumed:** the same command was run in a detached worktree at
`origin/main` (`2dc3c0226`) and failed **identically** — exit 1, 3 executed / 20 skipped, the
same four `CAPABILITY_UNPROVEN` lines. `git diff origin/main...HEAD -- packages/spine` is
empty. See memory `unite-group-spine-required-check-false-green`.

### Two environment traps that cost time — read before re-running

1. **Node.** `npm run verify` refuses on `v22.22.3`. **Node 24.14.1 IS installed** at
   `~/.nvm/versions/node/v24.14.1`; the default `node` on PATH is Hermes' bundled v22 via
   `~/.local/bin/node → ~/.hermes/node/bin/node`. Prefix `PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"`
   or fix the symlink permanently (§7).
2. **Env inputs.** `verify:web` refuses to run while `apps/web/.env.local` exists, and the
   guard matches on PREFIX — renaming to `.env.local.handoff-parked` in place still trips it.
   Park it OUTSIDE `apps/web` and restore it, verifying the sha256. This session parked and
   restored it twice; final sha256 `8178840184d3…`, 2589 bytes, confirmed identical.

---

## 7. Deferred + open questions

### Deferred

| Item | Owner | Blocking | Why |
|---|---|---|---|
| Repoint `~/.local/bin/{node,npm,npx}` → `~/.nvm/versions/node/v24.14.1/bin/*` | **Phill** | every future `npm run verify` on this machine | The Claude Code classifier blocks an agent creating those symlinks. One command, given in §8. Rollback: point them back at `~/.hermes/node/bin/*` |
| Check the Mini and the PC for the same Node shadow | Phill | same failure recurring there | `readlink ~/.local/bin/node` — if it points into `~/.hermes/node/bin`, identical cause |
| Independent review bound to the final SHA | next agent | **the push** | Codex quota resets **20/08 13:33**; that lane has a shell and can execute mutants, which the HTTP lanes cannot |
| P1: `…down.sql` post-condition not identity-preserving across drop-and-recreate | next agent | — | receipt side uses unanchored name prefixes; exposed side counts overloads by `proname` |
| P1: a receipt role absent at rollback downgrades a required restoration to a NOTICE | next agent | — | the only post-condition measures anon exposure |
| Stop the throwaway control container | next agent | nothing | `docker rm -f ctlpg2` |

### Open questions

| Question | Owner | Blocking |
|---|---|---|
| **F9 — the security-model call.** Is "`authenticated` may execute a SECURITY DEFINER function" an exposure (→ the RLS design changes) or a required pattern (→ `prod-exposure.sql` query 3 gets a narrow named allowlist and ship-board item 6 becomes ACCEPTED-BY-DESIGN)? Only production's real set of RLS helpers settles it. | **Phill** | the production paste, and release of this branch |
| Will an LLM reviewer instructed to "default to FAIL when uncertain" ever return PASS? 20 rounds have each returned FAIL, with findings narrowing from real code defects to documentation accuracy. If codex also FAILs on a clean head, the gate's PASS condition may need a founder ruling rather than more rounds. | Phill / Board | the push, structurally |

---

## 8. Pick up here

**Start here**

1. `git status --short && git rev-parse HEAD` — expect clean at `6f2470888`.
2. Bring up the control cluster if it is gone:
   `docker run -d --name ctlpg2 -e POSTGRES_PASSWORD=postgres -p 55433:5432 postgres:17`
3. Re-run the §6 gate list under Node 24 to re-derive the state at whatever HEAD you find.
4. After **20/08 13:33**, run one review on the CURRENT head via the lane chain:
   ```bash
   python3 ~/.claude/skills/pr-release-gate/scripts/independent_review.py \
     --brief <brief> --base 2dc3c0226492ed8ff8a2c715c5a42b2110a42180 \
     --head <current> --repo <detached worktree> --out <report.json>
   ```
   **Check that `reviewer-report.json` EXISTS.** Do not read the exit code as a verdict.
5. On PASS with zero blocking: issue the receipt with `pr_release_gate.py issue`, then
   **push only — do NOT open a PR** (founder instruction 19/08; the branch is RED by design).
   Provenance of that instruction is one handoff line, `handoff-20260819-1400-push-blocked.md:25-26`.

**Do not redo**

- Do not re-establish that OpenRouter/Gemini work. Both are live and wired; `--list-lanes` says so.
- Do not chase `run-prod-exposure.sh` to exit 0 against production. It returns exit 1 with
  exactly one deliberate row and **that is correct**. Driving it to 0 revokes `authenticated`
  EXECUTE on `get_my_org_ids` and takes production down.
- Do not re-derive that `npm run verify` is red — proven pre-existing on `origin/main` (§6).
- Do not re-randomise the positive control's identifiers. Seven rounds of that were each
  defeated by the next constant; the generator was removed for that reason.

**First command to run**

```bash
git -C /Users/phillmcgurk/Unite-Group status --short && git -C /Users/phillmcgurk/Unite-Group rev-parse HEAD
```

---

## 9. Risk notes

- **`.env.local` was parked and restored twice this session.** Final state verified by sha256
  (`8178840184d3…`, 2589 bytes). One intermediate run left it named `.env.local.handoff-parked`
  for a few minutes before restoration — it is back and byte-identical. Its contents were never
  read or printed.
- **The control cluster container `ctlpg2` is still running** on port 55433. Harmless, but it
  is state this session created.
- **23 pre-existing stashes**, none from this session. Untouched.
- **The branch is RED by design** and must not be released until F9 is answered.
- **20 review rounds, all FAIL.** The findings genuinely narrowed, but no PASS exists, so no
  gate receipt exists, so the push is blocked. That is the gate working, not a workaround
  waiting to be found.
- **Environmental residual on the positive control**, stated in the code: an author who can
  edit `prod-exposure.sql` can key on row counts, extension lists or absent tables. Naming
  cannot close that class; the defence is the diff and the reviewer.

---

## 10. Handoff quality check

Every exit code in §6 came from a command run this session at `6f2470888`, with both clusters
verified reachable first — so they are verdicts, not "could not run". The one red gate
(`npm run verify`) was proven pre-existing by running it on `origin/main` in a detached
worktree rather than by asserting it. Nothing is claimed shipped, because nothing was pushed.
The Node symlink fix is listed as deferred to Phill because the agent was denied permission to
create it, not because it was skipped.

Grounded 20/08/2026: HEAD `6f2470888`, 43 ahead of `origin/main`, 0 behind, tree clean — `git rev-list --left-right --count origin/main...HEAD` (exit 0)
Grounded 20/08/2026: never pushed — `git ls-remote --heads origin claude/ship-gate-exposure-repair` returned 0 rows
Grounded 20/08/2026: 9 gates at expected values, 0 leaked databases locally, 0 databases and 0 roles on the control cluster — `.handoff-logs/handoff-20260820-0647.log`
Grounded 20/08/2026: `npm run verify` fails identically on `origin/main` (`2dc3c0226`) in a detached worktree — exit 1, 3 executed / 20 skipped, same four CAPABILITY_UNPROVEN
Grounded 20/08/2026: Node 24.14.1 is installed but shadowed — `readlink ~/.local/bin/node` → `~/.hermes/node/bin/node` (v22.22.3)
Grounded 20/08/2026: `apps/web/.env.local` restored byte-identical, sha256 `8178840184d3…`, 2589 bytes

Waterline: Class 1 · Stage BLOCKED (rung 3/12 Test, not cleared) · FAIL — evidence: 9 gate exits @ `6f2470888` · ABSENT: any PASS review, therefore no gate receipt · F9 unresolved · 2 P1s knowingly open · STATED RESIDUAL: environmental discriminators in the positive control

Handoff complete. Next safe action: wait for the codex reset at 20/08 13:33, run one lane-chain review bound to the then-current HEAD, and confirm `reviewer-report.json` exists before believing any exit code.
