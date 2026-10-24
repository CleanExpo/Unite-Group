"""List Cloudroom Claude accounts (no secrets) or pin one by name/email substring.
Usage: cloudroom_accounts.py list | cloudroom_accounts.py use <substring>

Never echoes raw RPC output or an account's error text: either can carry a credential."""
import json
import os
import subprocess
import sys
import tempfile

ROOM = os.environ.get("ROOM_CLI", "room-cli")


def rpc(method, payload):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        json.dump(payload, fh)
    out = subprocess.run([ROOM, "plugin", "rpc", "call", "accounts", method, "--input-file", fh.name, "--json"],
                         capture_output=True, text=True)
    os.unlink(fh.name)
    if out.returncode:
        sys.exit(f"{method} failed (exit {out.returncode}); run room-cli by hand to see why")
    try:
        return json.loads(out.stdout or "null")
    except ValueError:
        sys.exit(f"{method} returned output that is not JSON")


def accounts():
    found = []

    def walk(x):
        if isinstance(x, dict):
            if "id" in x and ("email" in x or "inUse" in x or "plan" in x):
                found.append(x)
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)

    walk(rpc("accounts.list", {"provider": "claude-code"}))
    return found


def show(found):
    for a in found:
        wins = "; ".join(f"{w.get('label')} {w.get('usedPercent')}% resets {w.get('resetsAt')}" for w in a.get("windows") or [])
        print(f"{'*' if a.get('inUse') else ' '} {a.get('id')} name={a.get('name')!r} email={a.get('email')} "
              f"plan={a.get('plan')} limitedUntil={a.get('limitedUntil')} error={'yes' if a.get('error') else 'none'} {wins}")


if sys.argv[1] == "list":
    show(accounts())
elif sys.argv[1] == "use":
    key = sys.argv[2].lower()
    hits = [a for a in accounts() if key in f"{a.get('name')} {a.get('email')}".lower()]
    if len(hits) != 1:
        sys.exit(f"need exactly one match for {key!r}, got {[(a.get('id'), a.get('name')) for a in hits]}")
    target = hits[0]["id"]
    rpc("accounts.use", {"provider": "claude-code", "id": target})
    after = accounts()
    show(after)
    # Success is what the account list says afterwards, never the RPC's exit code.
    if [a.get("id") for a in after if a.get("inUse")] != [target]:
        sys.exit(f"pin not confirmed: {target} is not the only account in use")
