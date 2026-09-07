# docs/governance — UNI-2673 industry governance research program

Multi-run research program. Source of record is Linear **UNI-2673**. This directory is the
program's memory. Nothing here leaves this directory without Phill.

## What is in here

| File | What it is |
| --- | --- |
| `evidence-ledger.jsonl` | **Source of truth.** One JSON object per line, one fact per line. |
| `evidence-ledger.md` | Generated rendering. Never hand-edit it. |
| `ledger-parts/*.jsonl` | The ledger split by sweep, so parts can be written independently. Concatenated in filename order to build the ledger. |
| `ledger.py` | Validator and renderer. `check`, `render`, `stale`, `stats`. |
| `memo-01..03-*.md` | Synthesis. Every sentence carries a ledger ID. |
| `restorers-matrix.md` | Founder's product spec, plus a claims audit against the ledger. |
| `lessons.md` | Method learning. Appended at every run exit. |

## How to run it

```
python ledger.py check     # validate; exits 1 on any violation
python ledger.py render    # rebuild evidence-ledger.md (refuses if check fails)
python ledger.py stale     # cycle-0 delta pass: what is past its check_by date
python ledger.py stats     # counts by status
```

Rebuild the ledger from parts:

```
cat ledger-parts/*.jsonl > evidence-ledger.jsonl && python ledger.py render
```

## The rules that make this compound

1. **A verified fact inside its freshness window is never re-swept.** Load the ledger at
   cycle 0 and build on it.
2. **Cycle 0 runs the delta pass.** `ledger.py stale` lists only entries past `check_by`.
   Re-check those, update or mark `stale`. Nothing else.
3. **A contradicting source is recorded beside the original, never over it.** Both entries
   get status `conflict` and name each other in `conflict_with`. Silent overwrites are the
   disease this program exists to cure.
4. **No memo sentence without a ledger ID.** The memo is synthesis; the ledger is truth.
5. **Chat-delivered research ingests as `unverified-seed`.** That includes the Linear card
   itself — its claims are entries `CARD-01` to `CARD-13`.

## What `status` actually means

| status | meaning |
| --- | --- |
| `verified` | a fresh-context pass reopened the primary source and confirmed it says this |
| `unverified-seed` | a sweep or a chat claimed it; the primary source has not been reopened |
| `conflict` | a second source contradicts another entry; both kept |
| `stale` | past `check_by`, not yet re-checked |

`sweep_status` records what the collecting sweep claimed. `status` is what the ledger
asserts. **A sweep reporting `verified` does not make an entry verified.** A sub-agent
report is lead-grade evidence until a second, independent, fresh context reopens the source
itself. That two-context rule is the whole promotion mechanism, and it is deliberately not
called proof of truth — it is proof that two separate readers, one of whom was trying to
break it, agree on what the page says.

## Citation grades in the memos

An independent review on 2026-09-07 found the memos citing the ledger as though every entry
were established. By count, 53 of 69 citations pointed at entries the ledger does not hold as
`verified`. Silence about evidence grade is the same defect this ledger exists to prevent,
one level up.

So the grade is now visible at the point of use, and it is a check rather than a convention:

| Citation | Means |
| --- | --- |
| `[ICA-01]` | `verified` - a second independent context reopened the primary source |
| `[AFCA-04 unverified]` | `unverified-seed` - nobody has reopened the source |
| `[ASIC-03 conflict]` | `conflict` - a second source contradicts it, and a person must settle it |
| `[X-01 stale]` | past its `check_by` and not yet re-checked |

```
python citations.py check      # exit 1 if any grade disagrees with the ledger
python citations.py annotate   # rewrite every citation to carry its current grade
python citations.py stats      # citation counts by status, per document
```

`check` fails in both directions: a bare citation of a non-verified entry, and a grade left
behind after an entry was promoted. Recorded control pair, run against the real documents:
53 violations before annotation, 0 after, then 1 under a planted stale grade on a verified
entry, restored to 0.

## The evidence-gap ratchet

The same reviewer then found `STD-09` asserting what state electrical safety legislation does,
on the strength of one guessed URL that returned 404. The `status` field already said
`unverified-seed`, so nothing was hidden - but nothing counted it either, and an unmeasured
set only grows.

`evidence-gap.py` counts the entries that assert a fact while their own evidence admits no
primary source was read, and **fails when that count rises**. It is a ratchet, not a report.

```
python evidence-gap.py list      # the current set, with why each one is in it
python evidence-gap.py check     # exit 1 if the count exceeds the recorded baseline
python evidence-gap.py baseline  # rewrite the baseline - only ever downward
```

Baseline at the close of run 2: **10 entries**, recorded in `evidence-gap-baseline.json`.
An entry leaves the set by getting a primary-source read, or by rewording its claim to
describe the search rather than the world. Raising the baseline to make the check pass is
the one thing that must never happen.

Control pair: baseline lowered to 9 → `FAIL (10 entries, baseline allows 9)`, exit 1;
restored → `PASS`, exit 0, file byte-identical.

## Negative claims

An entry with `claim_type: "negative"` must carry a `search_set` naming exactly where the
search looked. `ledger.py check` refuses the entry otherwise.

This is not bureaucracy. "X does not exist" is the claim that stops work, and a search that
looked in the wrong place returns exactly what a genuine absence returns. Every negative in
this ledger is a statement about a search, not about the world. Read them that way.

Several negatives in run 1 rest on **fetch timeouts** — the check never ran. Those are
marked in their notes. A timeout is not an absence.

## The validator has a proof it can fail

Run 1 recorded a three-leg control pair:

- unmodified ledger: `PASS (88 entries, 0 violations)`, exit 0
- one poisoned entry appended: `FAIL (8 violations)`, exit 1, naming duplicate id, bad
  status, bad sweep_status, bad claim_type, two malformed dates, unknown deliverable, and a
  non-http URL
- restored: `PASS (88 entries, 0 violations)`, exit 0

Known limit found by that control: a bad `claim_type` short-circuits the 25-word quote
check, because the quote rule is scoped to `positive` claims. `claim_type` is itself
validated, so a bad value is always caught — but it is caught by a different rule than the
one you might expect.

## Fences

No public advocacy. No submissions. No outreach to any body. No publishing. No strategy
execution. Every external contact is founder-gated. Feature branches and PRs only; human
merge.
