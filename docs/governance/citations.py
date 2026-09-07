"""citations.py - make the evidence grade visible wherever a document cites the ledger.

An independent reviewer found the memos citing the ledger as though every entry were
established fact. By count, most citations pointed at entries the ledger does not hold as
`verified`. One of them, AFCA-04, carries the note "Needs a direct read before quotation in
any deliverable" - and a memo is a deliverable.

Prose cannot notice it has gone out of date, so this is a check rather than a convention.

    python citations.py check      # exit 1 if any citation misgrades its entry
    python citations.py annotate   # rewrite the documents so every citation carries its grade
    python citations.py stats      # citation counts by ledger status, per document

GRADE MARKERS. A citation of a verified entry is written bare: `ICA-01`. A citation of
anything else carries its grade immediately after the id: `AFCA-04 unverified`,
`ASIC-03 conflict`, `X-01 stale`. A bare citation of a non-verified entry is a violation,
and so is a grade that disagrees with the ledger - which is what makes this survive an entry
being promoted later, when the stale annotation is the drift that follows.

THREE THINGS THIS FILE GOT WRONG, EACH FOUND BY REVIEW RATHER THAN BY ITS AUTHOR:

1. It keyed on `[ID]`. That missed combined citations like `[TRIAL-05, STD-12]` and bare ids
   in table cells like `STD-06`. It reported 69 citations clean while about ninety-eight more
   went unexamined. The bracket is now irrelevant: any ledger id anywhere in prose is a
   citation. Visible citations went 69 to 167.

2. It matched uppercase only, so `trial-05` would have been skipped in silence. Matching is
   now case-insensitive and a wrong-case id that resolves to a real entry is itself reported,
   rather than being quietly accepted or quietly ignored.

3. It scanned a hardcoded list of filenames. A hardcoded list goes stale the moment a
   document is added and it fails open, which is how a session handoff full of ungraded
   citations went unchecked. The scanned set is now discovered from disk across both
   directories below; a file leaves the scan only by being named in EXCLUDED with a reason.

A guard that silently skips a citation is the original defect wearing a check.

SCOPE. Every markdown file in this directory and in `docs/session-handoffs/`, except those
named in EXCLUDED. Fenced code blocks are skipped, because a code sample is not a claim.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
JSONL = os.path.join(HERE, "evidence-ledger.jsonl")

# Directories scanned. Handoffs are included because they present ledger facts to a human
# reader exactly as a memo does, and a reader cannot see a status field that is not there.
SCAN_DIRS = (
    HERE,
    os.path.join(os.path.dirname(HERE), "session-handoffs"),
)

# A file leaves the scan only by being named here, with the reason it is not a claim document.
# Anything else ending in .md is scanned, so adding a document cannot silently escape.
EXCLUDED = {
    "evidence-ledger.md": "the ledger rendering; every entry already prints its own status",
    "README.md": "rules and conventions; it discusses ids rather than asserting from them",
    "lessons.md": "method record; it discusses ids rather than asserting from them",
}

GRADES = {"unverified-seed": "unverified", "conflict": "conflict", "stale": "stale"}
GRADE_WORDS = "|".join(sorted(set(GRADES.values())))

# A ledger id anywhere, optionally followed by its grade word. Bracket-agnostic and
# case-insensitive on purpose; unknown tokens are ignored at lookup, so a wide match is free.
CITE = re.compile(r"\b([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z]+)*-\d{2})\b"
                  r"(?:\s+(" + GRADE_WORDS + r"))?")
FENCE = re.compile(r"^\s*```")


def load_ledger():
    rows = {}
    with open(JSONL, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                r = json.loads(line)
                rows[r["id"]] = r
    return rows


def discover():
    """Every markdown file under SCAN_DIRS that is not explicitly excluded.

    Returns a list of absolute paths. Discovery rather than a literal list is the point:
    a document added tomorrow is scanned tomorrow, with no edit to this file.
    """
    found = []
    for d in SCAN_DIRS:
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if name.endswith(".md") and name not in EXCLUDED:
                found.append(os.path.join(d, name))
    return found


def label(path):
    """Repo-relative-ish label for messages, so a reader knows which directory it is."""
    return os.path.join(os.path.basename(os.path.dirname(path)), os.path.basename(path))


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


def resolve(rows, cid):
    """The ledger entry for a cited id, matched case-insensitively."""
    return rows.get(cid) or rows.get(cid.upper())


def check():
    rows = load_ledger()
    errs = []
    seen = 0
    for path in discover():
        doc = label(path)
        with open(path, encoding="utf-8") as f:
            text = f.read()
        for n, line in iter_prose_lines(text):
            for m in CITE.finditer(line):
                cid, grade = m.group(1), m.group(2)
                entry = resolve(rows, cid)
                if entry is None:
                    # Not a ledger id. Dates, standard numbers and URL fragments share the
                    # shape, so an unknown token is ignored rather than reported.
                    continue
                seen += 1
                if cid != entry["id"]:
                    errs.append("%s:%d %s: the ledger id is %r; a citation must use the "
                                "ledger's own case" % (doc, n, cid, entry["id"]))
                    continue
                want = expected_grade(entry["status"])
                if want and grade != want:
                    errs.append("%s:%d %s: ledger status is %r so the citation must read "
                                "'%s %s', found %r"
                                % (doc, n, cid, entry["status"], cid, want, m.group(0)))
                elif not want and grade:
                    errs.append("%s:%d %s: ledger status is verified so the citation must be "
                                "bare '%s', found %r" % (doc, n, cid, cid, m.group(0)))
    if errs:
        print("CITATION CHECK: FAIL (%d violations across %d citations)" % (len(errs), seen))
        for e in errs:
            print("  " + e)
        return 1
    print("CITATION CHECK: PASS (%d citations across %d documents, 0 violations)"
          % (seen, len(discover())))
    return 0


def annotate():
    """Rewrite each document so every citation carries the grade the ledger gives it today."""
    rows = load_ledger()
    total = 0

    def repl(m):
        entry = resolve(rows, m.group(1))
        if entry is None:
            return m.group(0)
        cid = entry["id"]
        want = expected_grade(entry["status"])
        return "%s %s" % (cid, want) if want else cid

    for path in discover():
        with open(path, encoding="utf-8") as f:
            text = f.read()
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
        print("%-52s %d id occurrences regraded" % (label(path), n))
    print("annotated %d occurrences across %d documents" % (total, len(discover())))
    return 0


def stats():
    rows = load_ledger()
    for path in discover():
        with open(path, encoding="utf-8") as f:
            text = f.read()
        counts = {}
        for _, line in iter_prose_lines(text):
            for m in CITE.finditer(line):
                entry = resolve(rows, m.group(1))
                if entry is None:
                    continue
                counts[entry["status"]] = counts.get(entry["status"], 0) + 1
        print("%-52s %s" % (label(path), counts))
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
