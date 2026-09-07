"""Runnable criteria for UNI-2673 run 2. Each subcommand exits non-zero on failure.

Written so the Done contract carries commands, not prose. Every check prints an
explicit OK token so a green cannot come from an empty run.
"""
import json
import os
import re
import sys

# this file lives at <root>/.claude/done/bin/, so four levels up is the git root
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    os.pardir, os.pardir, os.pardir))
GOV = os.path.join(ROOT, "docs", "governance")
JSONL = os.path.join(GOV, "evidence-ledger.jsonl")
MD = os.path.join(GOV, "evidence-ledger.md")
RECORD = os.path.join(GOV, "run2-deep-research.md")


def load():
    with open(JSONL, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def md_sync():
    rows = load()
    if not rows:
        print("FAIL jsonl ledger is empty; zero-vs-zero is not a sync")
        return 1
    with open(MD, encoding="utf-8") as f:
        md_entries = len(re.findall(r"^### ", f.read(), re.M))
    if md_entries != len(rows):
        print("FAIL md=%d jsonl=%d" % (md_entries, len(rows)))
        return 1
    print("MD_JSONL_SYNC_OK %d" % md_entries)
    return 0


def record():
    if not os.path.exists(RECORD):
        print("FAIL run2-deep-research.md does not exist")
        return 1
    text = open(RECORD, encoding="utf-8").read()
    if "perplexity/sonar-deep-research" not in text:
        print("FAIL record does not name the model used")
        return 1
    questions = len(re.findall(r"^## Q\d", text, re.M))
    citations = len(re.findall(r"^\s*\[\d+\]\s+http", text, re.M))
    if questions < 2:
        print("FAIL only %d question sections, need >= 2" % questions)
        return 1
    if citations < 10:
        print("FAIL only %d citations, need >= 10" % citations)
        return 1
    print("RUN2_RECORD_OK questions=%d citations=%d" % (questions, citations))
    return 0


def run2_marker(entry_id=None, sweeps=None, label="MARKER"):
    rows = load()
    if entry_id:
        hits = [r for r in rows if r["id"] == entry_id and "RUN 2:" in (r.get("note") or "")]
        if not hits:
            print("FAIL %s carries no 'RUN 2:' outcome in its note" % entry_id)
            return 1
        print("%s_OK %s" % (label, entry_id))
        return 0
    hits = [r for r in rows
            if r.get("sweep") in sweeps and "RUN 2:" in (r.get("note") or "")]
    if not hits:
        print("FAIL no entry in sweeps %s carries a 'RUN 2:' outcome" % (sweeps,))
        return 1
    print("%s_OK %s" % (label, ",".join(sorted(h["id"] for h in hits))))
    return 0


def main(argv):
    if len(argv) < 2:
        print("usage: run2_criteria.py {md-sync|record|std14|asic}")
        return 2
    cmd = argv[1]
    if cmd == "md-sync":
        return md_sync()
    if cmd == "record":
        return record()
    if cmd == "std14":
        return run2_marker(entry_id="STD-14", label="STD14_RUN2")
    if cmd == "asic":
        return run2_marker(sweeps=("ASIC", "ICA"), label="ASIC_RUN2")
    print("unknown subcommand: %s" % cmd)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
