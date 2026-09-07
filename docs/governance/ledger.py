"""Evidence Ledger tool for the UNI-2673 industry-governance research program.

The JSONL file is the source of truth. The Markdown file is a rendering of it.
Never hand-edit evidence-ledger.md; edit the JSONL and re-render.

Usage:
  python ledger.py check    validate the JSONL, exit 1 on any violation
  python ledger.py render   rewrite evidence-ledger.md from the JSONL
  python ledger.py stale    list entries whose check_by date has passed
  python ledger.py stats    print counts by status
"""
import json
import os
import sys
import datetime

NL = chr(10)
HERE = os.path.dirname(os.path.abspath(__file__))
JSONL = os.path.join(HERE, "evidence-ledger.jsonl")
MD = os.path.join(HERE, "evidence-ledger.md")

STATUSES = ("verified", "unverified-seed", "conflict", "stale")
SWEEP_STATUSES = ("verified", "lead", "conflict", "not-found", "founder-reported", "seed")
CLAIM_TYPES = ("positive", "negative")
REQUIRED = ("id", "claim", "url", "title", "access_date", "quote", "status",
            "check_by", "feeds", "sweep", "sweep_status", "claim_type", "verified_by")

DELIVERABLES = {
    "D1": "Builder/restorer trial memo",
    "D2": "ICA/Code landscape memo",
    "D3": "Regulatory-hook matrix",
    "D4": "Governance-vacuum map",
    "D5": "Stakeholder + windows map",
    "D6": "Positioning options pack",
    "D7": "RIA partnership brief",
    "D8": "Fresh-context citation audit",
}


def load():
    rows = []
    if not os.path.exists(JSONL):
        return rows
    with open(JSONL, "r", encoding="utf-8") as fh:
        for n, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append((n, json.loads(line)))
            except ValueError as exc:
                print("FAIL line " + str(n) + ": not valid JSON: " + str(exc))
                sys.exit(1)
    return rows


def check(rows):
    if not rows:
        print("LEDGER CHECK: FAIL (ledger is empty; a check over no entries is not a pass)")
        return 1
    errs = []
    seen = {}
    for n, r in rows:
        rid = r.get("id", "<no id>")
        for f in REQUIRED:
            if f not in r:
                errs.append("line " + str(n) + " [" + rid + "]: missing required field " + f)
        if rid in seen:
            errs.append("line " + str(n) + " [" + rid + "]: duplicate id, first seen line " + str(seen[rid]))
        seen[rid] = n
        st = r.get("status")
        if st not in STATUSES:
            errs.append("line " + str(n) + " [" + rid + "]: status " + repr(st) + " not in " + str(STATUSES))
        ss = r.get("sweep_status")
        if ss not in SWEEP_STATUSES:
            errs.append("line " + str(n) + " [" + rid + "]: sweep_status " + repr(ss) + " not in " + str(SWEEP_STATUSES))
        ct = r.get("claim_type")
        if ct not in CLAIM_TYPES:
            errs.append("line " + str(n) + " [" + rid + "]: claim_type " + repr(ct) + " not in " + str(CLAIM_TYPES))
        q = r.get("quote", "")
        if ct == "positive" and len(q.split()) > 25:
            errs.append("line " + str(n) + " [" + rid + "]: quote is " + str(len(q.split())) + " words, cap is 25")
        if ct == "negative" and not r.get("search_set"):
            errs.append("line " + str(n) + " [" + rid + "]: negative claim requires a search_set naming where you looked")
        for df in ("access_date", "check_by"):
            v = r.get(df)
            try:
                datetime.date.fromisoformat(str(v))
            except ValueError:
                errs.append("line " + str(n) + " [" + rid + "]: " + df + " " + repr(v) + " is not an ISO date")
        feeds = r.get("feeds") or []
        if not feeds:
            errs.append("line " + str(n) + " [" + rid + "]: feeds must name at least one deliverable")
        for d in feeds:
            if d not in DELIVERABLES:
                errs.append("line " + str(n) + " [" + rid + "]: unknown deliverable " + repr(d))
        u = str(r.get("url", ""))
        if not u.startswith("http"):
            errs.append("line " + str(n) + " [" + rid + "]: url " + repr(u) + " is not an http(s) URL")
        if r.get("status") == "verified" and not r.get("verified_by"):
            errs.append("line " + str(n) + " [" + rid + "]: status verified requires a verified_by reference")
        if r.get("status") == "conflict" and not r.get("conflict_with"):
            errs.append("line " + str(n) + " [" + rid + "]: status conflict requires conflict_with naming the other entry")
    if errs:
        print("LEDGER CHECK: FAIL (" + str(len(errs)) + " violations)")
        for e in errs:
            print("  " + e)
        return 1
    print("LEDGER CHECK: PASS (" + str(len(rows)) + " entries, 0 violations)")
    return 0


def stats(rows):
    by = {}
    for _, r in rows:
        by[r.get("status")] = by.get(r.get("status"), 0) + 1
    parts = []
    for s in STATUSES:
        parts.append(s + "=" + str(by.get(s, 0)))
    print("total=" + str(len(rows)) + "  " + "  ".join(parts))
    return 0


def stale(rows):
    today = datetime.date.today()
    due = []
    for _, r in rows:
        try:
            cb = datetime.date.fromisoformat(str(r.get("check_by")))
        except ValueError:
            continue
        if cb <= today:
            due.append((r.get("id"), str(cb), r.get("claim", "")[:70]))
    if not due:
        print("DELTA PASS: 0 entries past check_by as at " + str(today))
        return 0
    print("DELTA PASS: " + str(len(due)) + " entries due for re-check as at " + str(today))
    for d in due:
        print("  " + d[0] + "  due " + d[1] + "  " + d[2])
    return 0


def render(rows):
    today = datetime.date.today()
    out = []
    out.append("# Evidence Ledger - UNI-2673 industry governance")
    out.append("")
    out.append("GENERATED FILE. Source of truth is `evidence-ledger.jsonl`.")
    out.append("Regenerate with `python ledger.py render`. Do not hand-edit this file.")
    out.append("")
    out.append("Rendered: " + str(today) + " | Entries: " + str(len(rows)))
    out.append("")
    out.append("## What each status means")
    out.append("")
    out.append("| status | meaning |")
    out.append("| --- | --- |")
    out.append("| `verified` | a fresh-context pass reopened the primary source and confirmed it says this |")
    out.append("| `unverified-seed` | a sweep or a chat claimed it; the primary source has NOT been reopened yet |")
    out.append("| `conflict` | a second source contradicts another entry; both are kept, neither is overwritten |")
    out.append("| `stale` | past its check_by date and not yet re-checked |")
    out.append("")
    out.append("`sweep_status` records what the collecting sweep claimed. `status` is what this ledger asserts.")
    out.append("A sweep reporting `verified` does NOT make an entry verified. Only the fresh-context pass does.")
    out.append("A sub-agent report is lead-grade evidence until the coordinator reopens the source itself.")
    out.append("")
    out.append("## Deliverables fed")
    out.append("")
    for k in sorted(DELIVERABLES):
        n = 0
        for _, r in rows:
            if k in (r.get("feeds") or []):
                n += 1
        out.append("- **" + k + "** " + DELIVERABLES[k] + " - " + str(n) + " entries")
    out.append("")
    order = {}
    for _, r in rows:
        order.setdefault(r.get("sweep", "?"), []).append(r)
    for sweep in sorted(order):
        out.append("## Sweep: " + sweep)
        out.append("")
        for r in order[sweep]:
            out.append("### " + r.get("id", "?") + " - `" + str(r.get("status")) + "`")
            out.append("")
            out.append("**Claim.** " + r.get("claim", ""))
            out.append("")
            q = r.get("quote", "")
            if q:
                out.append("> " + q)
                out.append("")
            out.append("- Source: [" + r.get("title", "untitled") + "](" + r.get("url", "") + ")")
            out.append("- Accessed: " + str(r.get("access_date")) + " | Check by: " + str(r.get("check_by")))
            out.append("- Sweep said: `" + str(r.get("sweep_status")) + "` | Verified by: " + str(r.get("verified_by") or "NOT YET VERIFIED"))
            out.append("- Feeds: " + ", ".join(r.get("feeds") or []))
            if r.get("hook"):
                out.append("- Hook: " + r["hook"])
            if r.get("window"):
                out.append("- Window: " + r["window"])
            if r.get("conflict_with"):
                out.append("- CONFLICTS WITH: " + ", ".join(r["conflict_with"]))
            if r.get("search_set"):
                out.append("- Search set (negative claim): " + r["search_set"])
            if r.get("note"):
                out.append("- Note: " + r["note"])
            out.append("")
    with open(MD, "w", encoding="utf-8") as fh:
        fh.write(NL.join(out) + NL)
    print("RENDERED " + MD + " (" + str(len(rows)) + " entries)")
    return 0


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    rows = load()
    if cmd == "check":
        return check(rows)
    if cmd == "render":
        rc = check(rows)
        if rc:
            print("REFUSING TO RENDER: ledger failed validation")
            return rc
        return render(rows)
    if cmd == "stale":
        return stale(rows)
    if cmd == "stats":
        return stats(rows)
    print("unknown command " + repr(cmd))
    return 2


if __name__ == "__main__":
    sys.exit(main())
