"""citations.py - make the evidence grade visible wherever a synthesis document cites the ledger.

The problem this closes, found by an independent reviewer on 2026-09-07 and confirmed by
count: the memos carried 69 ledger citations, and 53 of them pointed at entries the ledger
does not hold as verified. Every one read as established fact. One of them, AFCA-04, carries
the note "Needs a direct read before quotation in any deliverable" - and a memo is a
deliverable.

Prose cannot notice it has gone out of date, so this is a check rather than a convention.

    python citations.py check      # exit 1 if any citation misgrades its entry
    python citations.py annotate   # rewrite the documents so every citation carries its grade
    python citations.py stats      # citation counts by ledger status, per document

GRADE MARKERS. A citation of a verified entry is written bare: [ICA-01]. A citation of
anything else must carry its grade: [AFCA-04 unverified], [ASIC-03 conflict], [X-01 stale].
A bare citation of a non-verified entry is a violation, and so is a grade that disagrees
with the ledger - which is what makes this survive an entry being promoted later.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JSONL = os.path.join(HERE, "evidence-ledger.jsonl")

# The synthesis documents. The ledger and its rendering are excluded on purpose: they are
# the evidence, not claims built on it, and each entry already prints its own status.
DOCS = (
    "memo-01-builder-restorer-trial.md",
    "memo-02-ica-code-landscape.md",
    "memo-03-regulatory-hook-matrix.md",
    "restorers-matrix.md",
)

GRADES = {"unverified-seed": "unverified", "conflict": "conflict", "stale": "stale"}

# [ID] or [ID grade]. The id shape matches the ledger's own: SWEEP-NN, sweep may hyphenate.
CITE = re.compile(r"\[([A-Z][A-Z0-9-]*-\d{2})(?:\s+(unverified|conflict|stale))?\]")


def load_ledger():
    rows = {}
    with open(JSONL, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                r = json.loads(line)
                rows[r["id"]] = r
    return rows


def expected_grade(status):
    """The marker a citation of an entry with this status must carry, or None if bare."""
    return GRADES.get(status)


def check():
    rows = load_ledger()
    errs = []
    seen = 0
    for doc in DOCS:
        path = os.path.join(HERE, doc)
        if not os.path.exists(path):
            errs.append(doc + ": document is missing")
            continue
        text = open(path, encoding="utf-8").read()
        for n, line in enumerate(text.splitlines(), 1):
            for m in CITE.finditer(line):
                seen += 1
                cid, grade = m.group(1), m.group(2)
                entry = rows.get(cid)
                if entry is None:
                    errs.append("%s:%d [%s]: id is not in the ledger" % (doc, n, cid))
                    continue
                want = expected_grade(entry["status"])
                if want and grade != want:
                    errs.append(
                        "%s:%d [%s]: ledger status is %r so the citation must read [%s %s], "
                        "found %r" % (doc, n, cid, entry["status"], cid, want, m.group(0)))
                elif not want and grade:
                    errs.append(
                        "%s:%d [%s]: ledger status is verified so the citation must be bare "
                        "[%s], found %r" % (doc, n, cid, cid, m.group(0)))
    if errs:
        print("CITATION CHECK: FAIL (%d violations across %d citations)" % (len(errs), seen))
        for e in errs:
            print("  " + e)
        return 1
    print("CITATION CHECK: PASS (%d citations, 0 violations)" % seen)
    return 0


def annotate():
    """Rewrite each document so every citation carries the grade the ledger gives it today."""
    rows = load_ledger()
    total = 0
    for doc in DOCS:
        path = os.path.join(HERE, doc)
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8").read()

        def repl(m):
            cid = m.group(1)
            entry = rows.get(cid)
            if entry is None:
                return m.group(0)
            want = expected_grade(entry["status"])
            return "[%s %s]" % (cid, want) if want else "[%s]" % cid

        new, n = CITE.subn(repl, text)
        if new != text:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(new)
        total += n
        print("%-38s %d citations regraded" % (doc, n))
    print("annotated %d citations" % total)
    return 0


def stats():
    rows = load_ledger()
    for doc in DOCS:
        path = os.path.join(HERE, doc)
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8").read()
        counts = {}
        for m in CITE.finditer(text):
            entry = rows.get(m.group(1))
            key = entry["status"] if entry else "NOT-IN-LEDGER"
            counts[key] = counts.get(key, 0) + 1
        print("%-38s %s" % (doc, counts))
    return 0


def main(argv):
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "check":
        return check()
    if cmd == "annotate":
        return annotate()
    if cmd == "stats":
        return stats()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
