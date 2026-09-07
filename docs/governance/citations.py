"""citations.py - make the evidence grade visible wherever a synthesis document cites the ledger.

The problem this closes, found by an independent reviewer on 2026-09-07 and confirmed by
count: the memos carried ledger citations that read as established fact, and most of them
pointed at entries the ledger does not hold as `verified`. One of them, AFCA-04, carries the
note "Needs a direct read before quotation in any deliverable" - and a memo is a deliverable.

Prose cannot notice it has gone out of date, so this is a check rather than a convention.

    python citations.py check      # exit 1 if any citation misgrades its entry
    python citations.py annotate   # rewrite the documents so every citation carries its grade
    python citations.py stats      # citation counts by ledger status, per document

WHY THIS MATCHES A BARE ID AND NOT A BRACKET. The first version of this file keyed on
`[ID]`. The same reviewer then showed it missed two whole shapes that are all over these
documents: combined citations like `[TRIAL-05, STD-12]`, and bare ids in table cells like
`STD-06` with no brackets at all. It reported 69 citations clean while roughly fifty more
went unexamined - a guard that silently skips a citation is the original defect wearing a
check. So the bracket is now irrelevant: every occurrence of a ledger id anywhere in the
prose is a citation and must carry its grade.

GRADE MARKERS. A citation of a verified entry is written bare: `ICA-01`. A citation of
anything else carries its grade immediately after the id: `AFCA-04 unverified`,
`ASIC-03 conflict`, `X-01 stale`. A bare citation of a non-verified entry is a violation,
and so is a grade that disagrees with the ledger - which is what makes this survive an entry
being promoted later, when the stale annotation is the drift that follows.

SCOPE. Only the synthesis documents below. The ledger and its rendering are excluded because
they are the evidence rather than claims built on it, and each rendered entry already prints
its own status. `README.md` and `lessons.md` are excluded because they discuss ids rather
than assert facts from them. Fenced code blocks are skipped everywhere.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JSONL = os.path.join(HERE, "evidence-ledger.jsonl")

DOCS = (
    "memo-01-builder-restorer-trial.md",
    "memo-02-ica-code-landscape.md",
    "memo-03-regulatory-hook-matrix.md",
    "restorers-matrix.md",
    "run2-deep-research.md",
)

GRADES = {"unverified-seed": "unverified", "conflict": "conflict", "stale": "stale"}
GRADE_WORDS = "|".join(sorted(set(GRADES.values())))

# A ledger id anywhere, optionally followed by its grade word. Bracket-agnostic on purpose.
CITE = re.compile(r"\b([A-Z][A-Z0-9]*(?:-[A-Z]+)*-\d{2})\b(?:\s+(" + GRADE_WORDS + r"))?")
FENCE = re.compile(r"^\s*```")


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


def iter_prose_lines(text):
    """Yield (lineno, line) for prose lines only, skipping fenced code blocks."""
    in_fence = False
    for n, line in enumerate(text.splitlines(), 1):
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if not in_fence:
            yield n, line


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
        for n, line in iter_prose_lines(text):
            for m in CITE.finditer(line):
                cid, grade = m.group(1), m.group(2)
                entry = rows.get(cid)
                if entry is None:
                    # Not a ledger id. Dates, standards numbers and product codes share the
                    # shape, so an unknown token is ignored rather than reported.
                    continue
                seen += 1
                want = expected_grade(entry["status"])
                if want and grade != want:
                    errs.append(
                        "%s:%d %s: ledger status is %r so the citation must read "
                        "'%s %s', found %r"
                        % (doc, n, cid, entry["status"], cid, want, m.group(0)))
                elif not want and grade:
                    errs.append(
                        "%s:%d %s: ledger status is verified so the citation must be bare "
                        "'%s', found %r" % (doc, n, cid, cid, m.group(0)))
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

    def repl(m):
        cid = m.group(1)
        entry = rows.get(cid)
        if entry is None:
            return m.group(0)
        want = expected_grade(entry["status"])
        return "%s %s" % (cid, want) if want else cid

    for doc in DOCS:
        path = os.path.join(HERE, doc)
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8").read()
        out = []
        in_fence = False
        n = 0
        for line in text.splitlines():
            if FENCE.match(line):
                in_fence = not in_fence
                out.append(line)
                continue
            if in_fence:
                out.append(line)
                continue
            new_line, k = CITE.subn(repl, line)
            n += k
            out.append(new_line)
        new_text = "\n".join(out) + ("\n" if text.endswith("\n") else "")
        if new_text != text:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(new_text)
        total += n
        print("%-38s %d id occurrences regraded" % (doc, n))
    print("annotated %d occurrences" % total)
    return 0


def stats():
    rows = load_ledger()
    for doc in DOCS:
        path = os.path.join(HERE, doc)
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8").read()
        counts = {}
        for _, line in iter_prose_lines(text):
            for m in CITE.finditer(line):
                entry = rows.get(m.group(1))
                if entry is None:
                    continue
                counts[entry["status"]] = counts.get(entry["status"], 0) + 1
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
