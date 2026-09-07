"""evidence-gap.py - a ratchet on entries that assert a fact nobody actually read.

An independent reviewer found STD-09 asserting what state electrical safety legislation
does, on the strength of one guessed URL that returned 404 plus some vendor pages. The
ledger's `status` field already said `unverified-seed`, so nothing was hidden - but nothing
counted it either, and an unmeasured set only grows.

This is a RATCHET, not a report. It records how many entries currently assert a fact while
their own evidence admits no primary source was read, and it FAILS when that number goes up.
Run 3 can only reduce it.

    python evidence-gap.py list      # the current set, with why each one is in it
    python evidence-gap.py check     # exit 1 if the count exceeds the recorded baseline
    python evidence-gap.py baseline  # rewrite the baseline to the current count

WHY A COUNT AND NOT AN ALLOWLIST. An allowlist of ids goes stale the moment an entry is
promoted or renamed, and a stale allowlist fails open. A count cannot go stale. It is
deliberately crude: it will not tell you WHICH entry regressed, only that the total rose,
and `list` then shows you.

FALSE POSITIVES ARE HANDLED BY THE CLAIM, NOT BY AN EXCEPTION. An entry escapes this set by
phrasing its claim as a statement about a search - "was located", "was found", "in the
sources checked" - which is what every honest unverified claim in this ledger already is.
Four run-2 entries were flagged by an earlier version of this heuristic because their notes
narrate a run-1 timeout that run 2 then resolved; `verified` entries are excluded for that
reason, since a verified entry has by definition had its source reopened.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JSONL = os.path.join(HERE, "evidence-ledger.jsonl")
BASELINE = os.path.join(HERE, "evidence-gap-baseline.json")

# The instrument did not run, or ran on something that is not the primary source.
ADMITS = (
    "404", "timed out", "timeout", "cors", "could not", "never completed", "not read",
    "was not fetched", "not successfully fetched", "guessed", "search-engine highlights",
    "not a raw full-document fetch", "blocked", "no primary", "returned only the shell",
    "member-gated", "no quote",
)
# The claim describes the search rather than the world.
BOUNDED = (
    "was located", "was found", "no primary-source evidence", "in the sources",
    "across the bodies named", "on the ica", "own public pages", "carries no release",
    "contains no", "remains unestablished", "was read", "no state electrical",
)


def load():
    with open(JSONL, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def gap_entries():
    out = []
    for r in load():
        # A verified entry has had its source reopened by definition, so a timeout narrated
        # in its note is history rather than a gap.
        if r["status"] == "verified":
            continue
        hay = ((r.get("search_set") or "") + " " + (r.get("note") or "")).lower()
        admits = [a for a in ADMITS if a in hay]
        if not admits:
            continue
        claim = r["claim"].lower()
        if any(b in claim for b in BOUNDED):
            continue
        out.append((r, admits))
    return out


def read_baseline():
    if not os.path.exists(BASELINE):
        return None
    with open(BASELINE, encoding="utf-8") as f:
        return json.load(f)


def cmd_list():
    rows = gap_entries()
    print("EVIDENCE GAP: %d entries assert a fact their own evidence says nobody read" % len(rows))
    for r, admits in rows:
        why = re.sub(r"\s+", " ", (r.get("search_set") or r.get("note") or ""))
        print("  %-10s %-16s %s" % (r["id"], r["status"], r["claim"][:96]))
        print("             admits: %s" % ", ".join(admits[:4]))
        print("             why   : %s" % why[:150])
    return 0


def cmd_check():
    rows = gap_entries()
    base = read_baseline()
    if base is None:
        print("EVIDENCE GAP CHECK: FAIL (no baseline recorded; run `evidence-gap.py baseline`)")
        return 1
    limit = base["count"]
    if len(rows) > limit:
        print("EVIDENCE GAP CHECK: FAIL (%d entries, baseline allows %d)" % (len(rows), limit))
        for r, _ in rows:
            print("  " + r["id"])
        return 1
    print("EVIDENCE GAP CHECK: PASS (%d entries, baseline %d, recorded %s)"
          % (len(rows), limit, base.get("recorded_at")))
    return 0


def cmd_baseline():
    rows = gap_entries()
    data = {
        "count": len(rows),
        "ids": sorted(r["id"] for r, _ in rows),
        "recorded_at": "2026-09-07",
        "why": ("The ratchet only ever moves down. Lower this number by giving an entry a "
                "primary-source read, or by rewording its claim to describe the search "
                "rather than the world. Never raise it to make the check pass."),
    }
    with open(BASELINE, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    print("baseline recorded: %d entries" % len(rows))
    return 0


def main(argv):
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "list":
        return cmd_list()
    if cmd == "check":
        return cmd_check()
    if cmd == "baseline":
        return cmd_baseline()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
