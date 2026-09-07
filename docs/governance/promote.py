"""Promote ledger entries to verified after a fresh-context verifier passes them.

Usage:
  python promote.py <verifier-ref> <ID> [<ID> ...]

Sets status="verified" and verified_by=<verifier-ref> on each named entry, in place,
in ledger-parts. Refuses to promote an entry whose status is "conflict" — a conflict is
resolved by a human decision, never by a verifier pass.

Run `python ledger.py render` afterwards.
"""
import json
import os
import sys

NL = chr(10)
HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(HERE, "ledger-parts")


def main():
    if len(sys.argv) < 3:
        print("usage: python promote.py <verifier-ref> <ID> [<ID> ...]")
        return 2
    ref = sys.argv[1]
    wanted = set(sys.argv[2:])
    found = set()
    refused = []
    for fn in sorted(os.listdir(PARTS)):
        if not fn.endswith(".jsonl"):
            continue
        path = os.path.join(PARTS, fn)
        with open(path, "r", encoding="utf-8") as fh:
            lines = [ln for ln in fh.read().split(NL) if ln.strip()]
        changed = False
        out = []
        for ln in lines:
            r = json.loads(ln)
            if r.get("id") in wanted:
                found.add(r["id"])
                if r.get("status") == "conflict":
                    refused.append(r["id"])
                    out.append(ln)
                    continue
                r["status"] = "verified"
                r["verified_by"] = ref
                out.append(json.dumps(r, ensure_ascii=False))
                changed = True
            else:
                out.append(ln)
        if changed:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(NL.join(out) + NL)
            print("updated " + fn)
    missing = wanted - found
    print("promoted: " + str(len(found) - len(refused)))
    if refused:
        print("REFUSED (status conflict, needs a human decision): " + ", ".join(sorted(refused)))
    if missing:
        print("NOT FOUND IN LEDGER: " + ", ".join(sorted(missing)))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
