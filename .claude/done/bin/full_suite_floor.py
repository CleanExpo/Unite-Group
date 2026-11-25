"""Done criterion helper: run the full apps/web vitest suite (package.json "test") and require
0 failures and at least MIN tests collected, so an empty or partial collection cannot pass.

Usage (from the worktree root): py -3 .claude/done/bin/full_suite_floor.py <min_tests>
Exit 0 only when vitest exits 0, its JSON report exists, numFailedTests == 0 and
numTotalTests >= min_tests. Any other outcome, including a missing report, exits 1 and says why.
"""
import json
import os
import subprocess
import sys
import tempfile

NODE = r"C:\Program Files\nodejs\node.exe" if os.name == "nt" else "node"


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1].isdigit():
        print("usage: full_suite_floor.py <min_tests>")
        return 1
    floor = int(sys.argv[1])
    web = os.path.join(os.getcwd(), "apps", "web")
    out = os.path.join(tempfile.mkdtemp(prefix="full-suite-"), "vitest.json")
    run = subprocess.run([NODE, "node_modules/vitest/vitest.mjs", "run", "--reporter=json", f"--outputFile={out}"], cwd=web)
    if not os.path.exists(out):
        print(f"FAIL: no vitest report at {out} (vitest rc {run.returncode})")
        return 1
    with open(out, encoding="utf-8") as fh:
        report = json.load(fh)
    total, failed = report["numTotalTests"], report["numFailedTests"]
    failing = [r["name"] for r in report["testResults"] if r["status"] == "failed"]
    print(f"vitest rc {run.returncode}; tests {total}; failed {failed}; floor {floor}")
    for name in failing:
        print(f"failed file: {os.path.relpath(name, web)}")
    ok = run.returncode == 0 and failed == 0 and total >= floor
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
