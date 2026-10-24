"""Regression checks for cloudroom_accounts.py against a fake room-cli (no real accounts, no network).
Run: python3 -m unittest scripts/ops/cloudroom/test_cloudroom_accounts.py"""
import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, "cloudroom_accounts.py")
SENTINEL = "FAKE_SECRET_SENTINEL"

# The fake CLI answers accounts.list / accounts.use from FAKE_MODE; accounts.use flips state in a file.
FAKE = r'''#!/usr/bin/env python3
import json, os, sys
mode, state = os.environ["FAKE_MODE"], os.environ["FAKE_STATE"]
method = sys.argv[5]
if mode == "rpc-error":
    sys.stderr.write("auth failure token=FAKE_SECRET_SENTINEL\n"); sys.exit(9)
inuse = open(state).read().strip() if os.path.exists(state) else "other"
if method == "accounts.use":
    if mode == "use-works":
        open(state, "w").write(json.load(open(sys.argv[7]))["id"])
    print("{}"); sys.exit(0)
err = "FAKE_SECRET_SENTINEL" if mode == "error-field" else None
print(json.dumps({"accounts": [
    {"id": "unite", "name": "Unite", "email": "u@example.com", "inUse": inuse == "unite", "error": err},
    {"id": "other", "name": "Other", "email": "o@example.com", "inUse": inuse == "other"},
]}))
'''


class CloudroomAccounts(unittest.TestCase):
    def run_script(self, mode, *args):
        with tempfile.TemporaryDirectory() as tmp:
            cli = os.path.join(tmp, "room-cli")
            with open(cli, "w") as fh:
                fh.write(FAKE)
            os.chmod(cli, os.stat(cli).st_mode | stat.S_IEXEC)
            env = dict(os.environ, ROOM_CLI=cli, FAKE_MODE=mode, FAKE_STATE=os.path.join(tmp, "state"))
            return subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True, env=env)

    def test_rpc_failure_never_echoes_cli_output(self):
        out = self.run_script("rpc-error", "list")
        self.assertNotEqual(out.returncode, 0)
        self.assertNotIn(SENTINEL, out.stdout + out.stderr)

    def test_account_error_text_is_never_printed(self):
        out = self.run_script("error-field", "list")
        self.assertEqual(out.returncode, 0)
        self.assertNotIn(SENTINEL, out.stdout + out.stderr)
        self.assertIn("error=yes", out.stdout)

    def test_pin_fails_when_the_switch_did_not_happen(self):
        out = self.run_script("use-noop", "use", "unite")
        self.assertNotEqual(out.returncode, 0)
        self.assertIn("pin not confirmed", out.stderr)

    def test_pin_succeeds_only_when_the_target_is_the_one_in_use(self):
        out = self.run_script("use-works", "use", "unite")
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn("* unite", out.stdout)


if __name__ == "__main__":
    unittest.main()
