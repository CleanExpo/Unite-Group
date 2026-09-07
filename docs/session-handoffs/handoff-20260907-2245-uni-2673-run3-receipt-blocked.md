# Session Handoff — UNI-2673 governance evidence base, run 3

**Written:** 2026-09-07 22:45 AEST
**Scope:** UNI-2673 — resume run 2, fix the F5 citation-scan hole, persist a founder vendor
routing order, and clear the PR release gate.
**Branch:** `phillmcgurk/uni-2673-goal-industry-governance-gold-rush-evidence-base-positioning`
**Head:** `0db2d627` (local only, NOT pushed)
**Base:** `origin/main` — the branch is now merged up to date with it, 0 behind

---

## 1. Summary and state

**State: WIP / BLOCKED. INCOMPLETE by the definition-of-done test.**

Definition-of-Done result: **FAIL on item 4.** Everything is done and green except the release
receipt, which cannot be issued on any available lane.

| Done item | Result |
| --- | --- |
| 1. Tasks done or deferred with an owner | PASS — see §7 |
| 2. Tests ran green | PASS — 10 of 10 gates exit 0 at `0db2d627`, see §6 |
| 3. `git status` clean, stash empty | PASS — both blank |
| 4. PR'd or carries the ready-to-open command | **FAIL** — no lane can produce a valid receipt |
| 5. User-visible change demonstrable | N/A — research documents and a guard script |

**Completed this session.** Fixed F5 and two further holes of the same class in
`citations.py`, each proven with a control watched red before green. Persisted the founder's
vendor routing order into the repo `CLAUDE.md`. Merged `origin/main` into the branch, which
was two commits behind and would otherwise have reverted a dependabot bump. Obtained two
independent adversarial reviews, the second returning PASS bound to the exact head.

**Not completed.** The release receipt, and therefore the push and the PR.

**Corrected a false claim inherited from run 2.** The run-2 handoff said the branch was never
pushed. It was: PR #1084 merged an earlier state of this same branch into `main` at
2026-09-07 07:31 UTC, 20 files, and the remote branch was then deleted. A blank `ls-remote`
against a stale `origin/main` reads identically to a branch that never existed.

---

## 2. Where it started

Resumed from `handoff-20260907-1845-uni-2673-run2-review-blocked.md`, whose named next action
was to fix the non-recursive `discover()` at `citations.py:94`.

Mid-session the founder issued a **vendor routing order** (effective immediately, expires
2026-09-12): Codex must not be invoked in any form; wherever any document says "Codex", read
it as the adversarial / second-vendor slot, filled by **Cursor**; the order is to be persisted
verbatim into the repo `CLAUDE.md`. It is now at `CLAUDE.md:209-246`, committed as `94d094d9`.

---

## 3. Decisions locked, and what shipped

**Nothing shipped. Sixteen commits are local against `origin/main` and none are pushed.**

```
0db2d627  UNI-2673: an untested vector must not exit 0
3c20f2be  Merge remote-tracking branch 'origin/main' into <branch>
b41baf36  UNI-2673: close two more scan holes the reviewer found in the F5 fix
7a0865f2  UNI-2673: fix F5 - the citation scan never read a subdirectory
94d094d9  UNI-2673: persist founder vendor routing order
26e24171  UNI-2673: grade the handoff citations, and record the guard catching me
```

**D1. Merge `origin/main`, never rebase.** `main` holds run 1 as a single squashed commit
(`e121a9ac`, PR #1084). A rebase would replay four run-1 commits over content already there.
All 11 `add/add` conflicts were resolved with `--ours`, justified by proving main's squash is
byte-identical to this branch's run-1 commit:
`git diff --stat e121a9ac d77b7b59 -- docs/governance docs/session-handoffs` returned empty.
The second reviewer re-derived that independently with full diffs and confirmed zero files on
`origin/main` are missing from the merge result.

**D2. Cursor runs with the estate's PreToolUse guards ON, or not at all.** Proven this session
that it then reads nothing: its report declared `coverage.reviewed: []`, every checklist item
`N/A`, each naming our own hooks. The runner correctly rejected it. Turning the guards off via
a scoped `HOME` is a permission change and is founder-only. See §7 Q1.

**D3. A skipped control case must not exit 0.** `citations-selftest.py` returned 0 for both
"6 of 6 caught" and "a vector could not be planted". A gate reads only the exit code, so an
untested vector arrived as a pass. PARTIAL now exits 3.

---

## 4. Key files

| File | Status | Note |
| --- | --- | --- |
| `docs/governance/citations.py` | Modified | `os.walk` + cycle guard, case- and spelling-blind extension match, `EXCLUDED` keyed on DOCS-relative path |
| `docs/governance/citations-selftest.py` | Created | 6-case control, 4 distinct exit codes (0/1/2/3) |
| `CLAUDE.md` | Modified | vendor routing order at lines 209-246 |
| `packages/pi-ceo-operator-mcp/package-lock.json` | Restored from main | now byte-identical to `origin/main`; no longer in the PR diff |
| `docs/governance/*.jsonl` (3 files) | Modified | why the diff-only lanes cannot certify this branch — see §7 B1 |

---

## 5. Running state

Nothing is running. Both review subagents have completed. The Cursor lane exited and wrote its
rejected report. No worktree was created this session; `D:/ug-wt-uni2673` is the only tree
touched, and `git status --porcelain` is blank.

Phase 0 log: `…/scratchpad/handoff-20260907-2100-gates.log` (scratchpad, not the repo, so the
tree stays clean for the receipt check).

---

## 6. Verification — exact commands and results

All at head `0db2d627`. Use `python -B`; note that `-B` does NOT stop `-m py_compile`, which
writes `__pycache__` regardless and dirties the tree.

```
cd docs/governance
python -B citations.py check        CITATION CHECK: PASS (194 citations / 19 documents / 0)   exit 0
python -B ledger.py check           LEDGER CHECK: PASS (102 entries, 0 violations)            exit 0
python -B evidence-gap.py check     EVIDENCE GAP CHECK: PASS (21 entries, baseline 21)        exit 0
python -B citations-selftest.py     SELFTEST: PASS (6 of 6 cases caught)                      exit 0

cd <repo root>
python -B .claude/done/bin/run2_criteria.py md-sync   MD_JSONL_SYNC_OK 102                    exit 0
python -B .claude/done/bin/run2_criteria.py record    RUN2_RECORD_OK questions=2 citations=70 exit 0
python -B .claude/done/bin/run2_criteria.py std14     STD14_RUN2_OK STD-14                    exit 0
python -B .claude/done/bin/run2_criteria.py asic      ASIC_RUN2_OK ASIC-03,09,10,11           exit 0
node scripts/check-no-nul-bytes.mjs  NUL-byte guard: clean (6409 tracked source files)        exit 0
bash scripts/check-canonical-naming.sh c9a17d4c... HEAD   Canonical naming guard passed.      exit 0
```

**Run the shell guard through Git Bash, never the PowerShell tool.** In PowerShell, `bash`
resolves to WSL, which cannot read a worktree's Windows gitdir. It failed with
`fatal: not a git repository: /mnt/d/ug-wt-uni2673/D:/Unite-Group/...` and then printed
`Canonical naming guard passed.` with exit 0 anyway. That guard reports a pass when its own git
command failed. The green above is the Git Bash re-run, which is genuine. Filed as F1 in §7.

Type-check, lint and build are N/A with a reason, not assumed: the diff contains no
`.ts`, `.tsx`, `.js`, `.jsx` or `.mjs` files.

Done harness: `donectl status` → contract LOCKED, `verification_status: NOT_RUN` (head-bound,
correctly invalidated by each commit).

---

## 7. Deferred and open questions

### Blockers

**B1 — no lane can produce a valid release receipt. Owner: founder. Blocking: yes.**

Every lane checked, none assumed:

| Lane | Why it cannot certify this branch |
| --- | --- |
| codex | Founder order forbids invoking it; quota out to 2026-09-12 |
| cursor, guards ON | Proven this session: read 0 files, report rejected by the runner |
| cursor, guards OFF | Possible, but requires disabling PreToolUse guards — founder-only |
| gemini | Diff-only. `DIFF_EXCLUDE` at `independent_review.py:716` strips `*.jsonl`; a PASS with excluded files is refused at line 294 |
| openrouter | Same structural refusal, and metered |
| claude subagent | `pr_release_gate.py:677` rejects a reviewer naming the implementing agent **or its subagents**, by design |

This branch changes three `.jsonl` files (`evidence-ledger.jsonl`, `ledger-parts/50-std.jsonl`,
`ledger-parts/70-asic.jsonl`), which is what makes the diff-only lanes structurally unable to
pass it. Scoping does not help: a scoped PASS is refused four lines later.

**F1 — `scripts/check-canonical-naming.sh` exits 0 when its git command fails. Owner: estate,
not this branch. Blocking: no.** Evidence in §6. Any release evidence citing this guard from a
non-Git-Bash shell is worthless. File as a ticket; do not fold it into this branch.

**F2 — `citations.py` cannot see a citation split across two lines.** The `CITE` regex is
per-line. Named honestly in the module docstring rather than left implied. Not fixed; adding
the clause without adding its probe is the failure this file exists to prevent.

**F3 — the realpath cycle guard can attribute a directory to a symlink alias in a message.**
Reviewer verified no citation is dropped, so it is cosmetic. Deliberately not fixed.

### Deferred to run 4

- D4–D7 memos.
- 64 ledger entries still `unverified-seed`.
- Reducing the evidence-gap ratchet below 21 by giving entries a primary-source read.

### Open question for the founder

**Q1. May Cursor run with the estate's PreToolUse guards off, to obtain a receipt?**
It is the only route before 2026-09-12. Recommended shape if yes: clone the repo to a temp
directory and delete the remote inside the clone, so there is physically nowhere to push. SHAs
survive a clone, so the report still binds to `0db2d627`, and Cursor's probe files land in a
throwaway copy. That removes the push risk by structure rather than by asking it in a brief.

---

## 8. Pick up here

**Do not redo:**

- Do not re-fix F5 or the extension/symlink holes. Done, controlled, reviewed, committed.
- Do not invoke `codex` in any form. Founder order, expires 2026-09-12.
- Do not run Cursor with default HOME expecting a review. Proven to read zero files.
- Do not try gemini or openrouter for a PASS. Structurally refused, see B1.
- Do not ask a Claude subagent for receipt evidence. The gate rejects it by design.
- Do not rebase this branch. See D1.
- Do not run repo shell guards through the PowerShell tool. See §6.
- Do not run the guards without `python -B`, and delete `__pycache__` after any `py_compile`.

**Start here:**

1. Read Q1's answer. It decides whether a receipt is reachable at all before 12 September.
2. If yes: clone to temp, drop the remote, run the cursor lane against the clone bound to
   `0db2d627`, then record the receipt in the real worktree.
3. If no: the branch waits for Codex on 2026-09-12. Nothing else unblocks it.
4. Either way, re-run §6 first — any new commit moves the head and voids the review binding.

**First command to run:**

```bash
cd /d/ug-wt-uni2673 && git log --oneline -n 3 && git status --porcelain
```

---

## 9. Risk notes

- **Sixteen commits are stranded locally.** Run 1 already merged via #1084; run 2 and run 3
  have never been pushed. The longer this sits, the more `main` moves under it.
- **A green gate here is not automatically real.** One of the ten reported a pass after failing
  to read the repo at all (F1). Read a guard's whole output, not its last line.
- **The reviews were single-vendor.** Both were fresh-context Claude subagents, which is rule 5
  of the founder's order and explicitly a degradation, recorded as
  `cross-vendor pass ran single-vendor fresh-context`. They are real reviews and they found
  three genuine defects; they are not receipt evidence.
- **`donectl` is head-bound.** Every commit invalidates the previous verification.

---

## 10. Handoff quality check

Every command in §6 was run this session and its output pasted, not summarised. The one gate
that produced a suspicious green was re-run under a different shell and the discrepancy is
recorded rather than smoothed over. No claim of shipped, pushed, or merged appears anywhere:
nothing was. The single founder question is stated once, with a recommended answer.
