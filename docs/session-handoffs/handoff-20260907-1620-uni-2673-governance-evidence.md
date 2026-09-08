# Session Handoff — UNI-2673 industry governance evidence base, run 1

**Written:** 2026-09-07 16:20 AEST
**Scope:** UNI-2673 — industry governance evidence base + positioning pack, run 1 of a multi-run program
**Repo:** `CleanExpo/Unite-Group`, worktree `D:/ug-wt-uni2673`
**Branch:** `phillmcgurk/uni-2673-goal-industry-governance-gold-rush-evidence-base-positioning`
**Tip:** `eac2911f` (pushed, synced with its remote)

---

## 1. Summary + state

**State: READY-TO-SHIP.** Complete and green for run 1's scope, pushed, no PR opened.

**Definition-of-Done result:** 4 of 5 met. Item 4 (PR'd) is deliberately unmet — the card
fences this work as "PRs, human merge", and in this estate opening a PR is close to
authorising its merge. §8 carries the exact `gh pr create` command, unrun.

| | Work | State |
| --- | --- | --- |
| Completed | Evidence Ledger built, validated, rendered (92 entries) | Done |
| Completed | Ledger tooling with a proven-failing control pair | Done |
| Completed | D1 builder/restorer trial memo | Done |
| Completed | D2 ICA/Code landscape memo | Done |
| Completed | D3 regulatory-hook matrix | Done |
| Completed | Restorer's Matrix landed + audited against the ledger | Done |
| Completed | `lessons.md` method record | Done |
| Partial | D8 fresh-context citation audit — 19 of 92 entries verified | Deferred to run 2 |
| Not touched | D4 vacuum map, D5 windows map, D6 options pack, D7 RIA brief | Deferred to run 2 |

Run 1 is complete. **The goal is not** — the Linear card is explicitly multi-run and 5 of 8
deliverables remain. That is by design, not slippage.

## 2. Where it started

Request: `/goal UNI-2673` under `/loop`, turn cap 30, research only. Source of record is
Linear UNI-2673 (description + attachments; there were no comments at cycle 0).

Constraints given: read-only against the world; `docs/governance/` on feature branches;
PRs with human merge; no outreach, no submissions, no publishing, no strategy execution;
every external contact founder-gated.

Starting problem: the card carried 13 factual claims and a founder-reported insider signal,
none of them checked against a primary source.

## 3. Decisions locked + what shipped

**Decisions locked this session:**

- **D1 — the ledger lives in the Unite-Group repo, not Pi-Dev-Ops.** UNI-2673 is a
  Unite-Group card, and `Pi-Dev-Ops/docs/governance/` already means engineering incidents.
  Putting industry-regulation research there would collide semantically.
- **D2 — a separate worktree.** `D:/Unite-Group/Unite-Group` holds another lane's *staged*
  work on branch `docs/portfolio-registry-canonical-identity`. I did not touch that tree.
- **D3 — the card's own claims are ledger entries.** `CARD-01 unverified`..`CARD-13 unverified`, status
  `unverified-seed`. Every sweep finding confirms or contradicts a seed; nothing is silently
  replaced.
- **D4 — a sub-agent report is lead-grade evidence, never verified.** `status` is promoted
  only when a second, independent, fresh context reopens the source. `sweep_status` records
  what the collector claimed; the two fields are deliberately separate.
- **D5 — Sonnet collects, Opus verifies.** Kept for run 2. Evidence and its confound are in
  `lessons.md`.
- **D6 — a conflict is never resolved by a verifier.** `promote.py` refuses to promote any
  entry with status `conflict`. It fired once this session, on `AFCA-01 conflict`.

**Shipped:** 3 commits, pushed to origin, 19 files, all under `docs/governance/`.

| SHA | What |
| --- | --- |
| `6791cf5c` | Ledger + three cited memos + tooling (88 entries) |
| `14be1e26` | Verifier B results, two quote corrections, AFCA Approach retrieved (92 entries) |
| `eac2911f` | Trimmed two over-length quotes that had blocked `render` |

No PR. Nothing merged. Nothing deployed. Nothing left `docs/governance/`.

## 4. Key files

| File | Status | Note |
| --- | --- | --- |
| `docs/governance/evidence-ledger.jsonl` | Created | Source of truth, 92 lines |
| `docs/governance/evidence-ledger.md` | Created | Generated. Never hand-edit. 92 entries, in sync |
| `docs/governance/ledger-parts/*.jsonl` | Created | 8 part files; concatenate in filename order |
| `docs/governance/ledger.py` | Created | `check` / `render` / `stale` / `stats`. Exits 1 on any violation |
| `docs/governance/promote.py` | Created | Promotes to `verified`; refuses `conflict` entries |
| `docs/governance/README.md` | Created | Rules, status meanings, the control-pair record |
| `docs/governance/lessons.md` | Created | Rich sources, dead ends, model comparison, harness lessons |
| `docs/governance/memo-01-builder-restorer-trial.md` | Created | D1 |
| `docs/governance/memo-02-ica-code-landscape.md` | Created | D2 |
| `docs/governance/memo-03-regulatory-hook-matrix.md` | Created | D3, 4 tiers |
| `docs/governance/restorers-matrix.md` | Created | Founder's spec + §8 claims audit |
| `C:/Users/Disaster Recovery 4/afca.pdf` and `afca.txt` | Created, untracked | The retrieved AFCA Approach. **Outside the repo.** See §9 R4 |

## 5. Running state

**No process is running.** All nine sub-agents completed and returned. No server, no watcher,
no background job. Verified: the last background task notification was the AFCA extraction
job, reported completed.

## 6. Verification — exact commands

All five ran this session against tip `eac2911f`. There is no `handoff-loop.sh` for this
repo; `~/.claude/scripts/handoff-loop.sh` gates the skills-library tree only and was
deliberately not pointed at this one.

```bash
cd /d/ug-wt-uni2673

# GATE 1 — canonical naming guard (the exact command CI runs)
bash scripts/check-canonical-naming.sh origin/main HEAD
# => "Canonical naming guard passed." exit 0

# GATE 2 — NUL byte guard
node scripts/check-no-nul-bytes.mjs
# => "NUL-byte guard: clean (6401 tracked source files)" exit 0

# GATE 3 — the program's own ledger gate
cd docs/governance
"/c/Program Files/Python311/python.exe" ledger.py check
# => "LEDGER CHECK: PASS (92 entries, 0 violations)" exit 0

# GATE 4 — python syntax
"/c/Program Files/Python311/python.exe" -m py_compile ledger.py promote.py
# => exit 0

# GATE 5 — markdown in sync with JSONL
grep -c "^### " evidence-ledger.md
# => 92, equals the JSONL total
```

**Type / lint / build: SKIPPED, with reason.** The diff contains zero `.ts` `.tsx` `.js`
`.jsx` `.mjs` files — confirmed by `git diff --name-only origin/main...HEAD | grep -E
'\.(ts|tsx|js|jsx|mjs)$'` returning nothing. The TypeScript pipeline cannot be affected by
markdown, JSONL and two standalone Python scripts.

**The ledger gate has a proven-failing control pair**, recorded in `README.md`:
unmodified `PASS (0 violations)` exit 0 → one poisoned entry `FAIL (8 violations)` exit 1 →
restored `PASS` exit 0.

## 7. Deferred + open questions

### Deferred work

| Item | Owner | Blocking | Why deferred |
| --- | --- | --- | --- |
| D4 governance-vacuum map memo | Run 2 | No | Turn cap. The vacuum is found (`STD-14 unverified`); only the memo is missing |
| D5 stakeholder + windows map memo | Run 2 | No | Turn cap. Windows captured in NCC entries |
| D6 positioning options pack | Run 2 | No | Turn cap. Needs D4 + D5 first |
| D7 RIA partnership brief | Run 2 | No | Turn cap. Reframed by `ICA-08` — see §9 R1 |
| D8 finish citation audit, 73 entries | Run 2 | **Yes, for external use** | Turn cap. Nothing may be quoted outside the repo unverified |
| Re-run every Safe Work Australia timeout | Run 2 | **Yes, for `STD-13 unverified`/`STD-14 unverified`** | Four failed checks so far; all were timeouts or CORS blocks |
| Read one state's electrical safety regulation | Run 2 | No | Closes `STD-09 unverified`; a guessed URL 404'd |
| Open INFO 253 for the `ASIC-04 unverified` quote | Run 2 | No | Now trivially doable — `pdftotext` exists |

### Open questions

| Question | Owner | Blocking | Why |
| --- | --- | --- | --- |
| Resolve `AFCA-01 conflict` — is "Late 2025" an abandoned target? | **Phill** | No | `promote.py` refuses to resolve a conflict. Verifier B's read says publication slipped ~9 months, but resolving a conflict is a human decision by design |
| Is the redrafted Code ASIC-approved yet? | Run 2 | **Yes** | `ASIC-03 conflict` vs `ICA-01`. Every enforceability claim rests on it |
| Which AFCA date is right — cover says Aug 2026, version table says July 2026 | Run 2 | No | `AFCA-13 conflict`. The card's "10 August" appears nowhere in the document |
| Does RIA Australasia's RICOP say anything about a builder/restorer split? | **Phill** | No | Member-gated (`TRIAL-01 unverified`). Phill is the member |
| Apply OpenRouter credits? | **Phill** | No | My recommendation: no. The bottleneck was tooling and report truncation, not model quality. Credits earn their place only for cross-vendor independence, and free lanes come first |

## 8. Pick up here

### Start here

1. Read `docs/governance/README.md` — the rules, the status meanings, the control-pair record.
2. Run the cycle-0 delta pass: `python ledger.py stale`. It printed **0 entries due** today,
   so on a same-day resume nothing needs re-checking.
3. Read `docs/governance/lessons.md` before dispatching any sweep. It carries the source map
   and the two harness lessons that cost run 1 the most.
4. Load the ledger and build on it. **Do not re-sweep a verified fact inside its window.**

### Do not redo

- Do not re-sweep the 19 verified entries.
- Do not re-attempt the AFCA Approach PDF. It is retrieved; the recipe is in `lessons.md`.
- **Do not budget for a PDF extractor.** `pdftotext` is at `/mingw64/bin/pdftotext`, with
  `pypdf` 6.16.2 and `pymupdf`. Three sweeps claimed it was absent without checking.
- Do not touch `D:/Unite-Group/Unite-Group`. Another lane has staged work there.
- Do not point `~/.claude/scripts/handoff-loop.sh` at this repo.

### First command to run

```bash
cd /d/ug-wt-uni2673/docs/governance && "/c/Program Files/Python311/python.exe" ledger.py stale
```

### The ship command, NOT run

Gated by `~/.claude/skills-library/merge-gate/SKILL.md` and by the card's own "human merge"
fence. Opening a PR in this estate is close to authorising its merge, and UG-AUTONOMY-001
covers this repo. **Phill's call:**

```bash
cd /d/ug-wt-uni2673 && gh pr create \
  --base main \
  --head phillmcgurk/uni-2673-goal-industry-governance-gold-rush-evidence-base-positioning \
  --title "UNI-2673 run 1: industry governance evidence ledger + three cited memos" \
  --body-file docs/session-handoffs/handoff-20260907-1620-uni-2673-governance-evidence.md \
  --draft
```

Merge-gate Iron Law check: Whole ✅ · Green-on-pushed-tip ✅ (5 gates on `eac2911f`) ·
Dark-by-default ✅ (docs only, nothing executes) · Atomic ✅ · Standards-clean ✅ ·
Authority reconciled ⚠️ **the card reserves merge to Phill**, which is why this is handed
off and not run.

## 9. Risk notes

**R1 — the card's field-agent premise is wrong, and D7 depends on it.** The card says the
field-agent voice is absent from published ICA submissions. It is not (`ICA-08`, verified by
count): RIA Australasia, AIBEC and AICLA are all on a 31-document list. What is absent is any
*individual practitioner* and any *field-sourced data*. The gap is evidence, not voice. Any
RIA brief written on the old premise would be wrong in front of the people who submitted.

**R2 — `STD-14 unverified` is the headline finding and the weakest evidence in the ledger.** "Nobody
governs the outcome of a mould job" now rests on **four failed checks**, not three. Every one
was a timeout or a CORS block — the instrument never ran. The honest sentence is "I did not
find a numeric limit in the sources I could load", never "no such limit exists". **This must
not leave the repository until run 2 re-runs those fetches.**

**R3 — two Sonnet sweeps fabricated quotes and self-certified them.** `STD-05` inserted
"PCBU" into a quotation of WHS Act s19, a term that section does not use. `NCC-05` added the
word "now". Both were marked `verified` by their own collector. **73 entries carry the same
risk and have not been independently checked.**

**R4 — evidence lives outside the repo.** `afca.pdf` and `afca.txt` sit in
`C:/Users/Disaster Recovery 4/`, untracked. The ledger entries `AFCA-13 conflict`..`AFCA-16` quote
that document. If those files are deleted the quotes stand but their local copy is gone; the
retrieval recipe in `lessons.md` reproduces them.

**R5 — the canonical-naming guard passed but was not proven able to fail.** I ran it against
the diff and it reported "passed". I did not plant a retired product name to confirm it can
detect one. Its green is therefore weaker evidence than the ledger gate's, which does have a
control pair.

**R6 — one gate caught its own author, and that is recorded.** Commit `14be1e26` carried a
ledger that failed validation: two of my own quotes ran 27 and 29 words against a 25-word
cap, `render` refused, and the markdown fell out of sync at 88 while the JSONL held 92. Fixed
in `eac2911f`.

**R7 — `NCC-05` rests on a single successful read.** The Treasury page is a JavaScript-rendered
Converlens app; a second reader returned only the shell. The dates are corroborated by the
Master Builders PDF, the quote is not.

**No secrets or credentials were read, written, or handled this session.** No `.env` file was
opened. No API key was resolved.

## 10. Handoff quality check

| Rule | Result |
| --- | --- |
| Tests claimed passed were actually run | Yes — 5 gates, commands and exit codes in §6 |
| Ship claims backed by evidence | Yes — 3 SHAs, push exit 0, no PR claimed |
| Running processes verified | Yes — none running |
| Completed vs deferred separated | Yes — §1 table and §7 |
| First command given | Yes — §8 |
| Negative claims carry their search set | Yes — enforced by `ledger.py`; 8 negative entries |
| Own errors recorded, not hidden | Yes — R5, R6, and the `lessons.md` false-negative correction |

---

**Handoff complete. Next safe action: run `python ledger.py stale` in
`/d/ug-wt-uni2673/docs/governance` to open cycle 0 of run 2, then read `lessons.md` before
dispatching any sweep.**
