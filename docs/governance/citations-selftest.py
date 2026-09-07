#!/usr/bin/env python3
"""Control pair for citations.py discovery.

One question only: does `citations.py check` FIRE when an ungraded citation is
present somewhere the scan claims to cover?

Its docstring claims "every markdown file under SCAN_DIRS". This asserts that
claim against a planted defect rather than trusting the sentence. Each case
plants a real violation and requires the guard to report it by name. A case
whose precondition does not hold aborts the whole run, because a control that
planted nothing passes for the wrong reason.

Run:   python -B citations-selftest.py
Exit:  0  every case behaved as required
       1  a case did not behave as required (the guard has a hole)
       2  a precondition failed, so no case could mean anything
"""

import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CHECKER = os.path.join(HERE, "citations.py")
JSONL = os.path.join(HERE, "evidence-ledger.jsonl")

# The id the probes cite. It must be an entry whose status forces a grade word,
# so that citing it bare is a real violation and not a matter of taste.
PROBE_ID = "AFCA-04"
REQUIRED_STATUS = "unverified-seed"
PROBE_LINE = "See %s for the approach.\n" % PROBE_ID

TOP_PROBE = os.path.join(HERE, "_selftest_probe.md")
SUB_DIR = os.path.join(HERE, "_selftest_dir")
SUB_PROBE = os.path.join(SUB_DIR, "claim.md")
SUB_EXCLUDED_NAME = os.path.join(SUB_DIR, "README.md")


def run_check():
    """Run the guard as a subprocess and return (returncode, stdout).

    A subprocess, not an import, because the exit code is what a gate reads.
    Never through a pipe: a pipeline reports the last command's code, not this one's.
    """
    p = subprocess.run([sys.executable, "-B", CHECKER, "check"],
                       cwd=HERE, capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def parse_pass(out):
    """(citations, documents) from a PASS line, or None if it did not pass."""
    for line in out.splitlines():
        if line.startswith("CITATION CHECK: PASS ("):
            body = line.split("(", 1)[1]
            # "194 citations across 19 documents, 0 violations"
            parts = body.replace(")", "").split()
            return int(parts[0]), int(parts[3])
    return None


def write(path, text):
    d = os.path.dirname(path)
    if not os.path.isdir(d):
        os.makedirs(d)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def cleanup():
    if os.path.exists(TOP_PROBE):
        os.remove(TOP_PROBE)
    if os.path.isdir(SUB_DIR):
        shutil.rmtree(SUB_DIR)


def precondition_status():
    """The planted defect is only a defect if the ledger says this id needs a grade."""
    with open(JSONL, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if row["id"] == PROBE_ID:
                return row.get("status")
    return None


def case(name, path, expect_named):
    """Plant one probe, require a FAIL that names it, report the outcome."""
    write(path, PROBE_LINE)
    if not os.path.exists(path):
        print("  %-34s ABORT   probe was not written" % name)
        return False
    rc, out = run_check()
    named = expect_named in out
    ok = rc == 1 and named
    verdict = "CAUGHT" if ok else "MISSED"
    first = out.splitlines()[0] if out.strip() else "(no output)"
    print("  %-34s %-7s exit=%d  %s" % (name, verdict, rc, first))
    if ok:
        for line in out.splitlines()[1:]:
            if expect_named in line:
                print("      %s" % line.strip())
                break
    else:
        print("      required: exit 1 and a violation naming %r" % expect_named)
    cleanup()
    return ok


def main():
    print("CITATIONS SELFTEST - does the guard fire when the defect is present?")

    status = precondition_status()
    if status != REQUIRED_STATUS:
        print("  PRECONDITION FAILED: %s status is %r, expected %r." % (
            PROBE_ID, status, REQUIRED_STATUS))
        print("  A bare citation of it would not be a violation, so nothing would be planted.")
        return 2
    print("  precondition: %s status is %r, so a bare citation of it is a violation" % (
        PROBE_ID, status))

    cleanup()
    rc, out = run_check()
    base = parse_pass(out)
    if rc != 0 or base is None:
        print("  PRECONDITION FAILED: the tree is not clean before planting.")
        print("  %s" % (out.splitlines()[0] if out.strip() else "(no output)"))
        return 2
    print("  baseline:     PASS %d citations across %d documents, exit 0" % base)

    results = []
    try:
        # Anchor. Proves the matcher fires on this exact string in a directory
        # discovery already reached. Without it, a miss below is ambiguous.
        results.append(("anchor, top level",
                        case("anchor, top level", TOP_PROBE, "_selftest_probe.md")))

        # F5. One directory deeper. os.listdir never looked here.
        results.append(("F5, one directory deeper",
                        case("F5, one directory deeper", SUB_PROBE, "claim.md")))

        # The hole recursion creates. EXCLUDED is a set of basenames, so a
        # subdirectory file sharing an excluded name would be skipped in a
        # directory that was never granted the exemption.
        results.append(("subdir named README.md",
                        case("subdir named README.md", SUB_EXCLUDED_NAME, "README.md")))
    finally:
        cleanup()

    rc, out = run_check()
    after = parse_pass(out)
    if rc != 0 or after != base:
        print("  RESTORE FAILED: expected %s, got rc=%d %s" % (base, rc, after))
        return 1
    print("  restore:      PASS %d citations across %d documents, exit 0" % after)

    failed = [n for n, ok in results if not ok]
    if failed:
        print("SELFTEST: FAIL (%d of %d cases missed)" % (len(failed), len(results)))
        for n in failed:
            print("  missed: %s" % n)
        return 1
    print("SELFTEST: PASS (%d of %d cases caught)" % (len(results), len(results)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
