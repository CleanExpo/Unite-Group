#!/usr/bin/env python3
"""Detached fail-closed validator for the PR #903 Mac rehearsal envelope."""

import argparse
import hashlib
import json
import os
import re
import stat
import sys
from pathlib import Path

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
GIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
RECEIPT_KEYS = {
    "schema_version", "receipt_id", "command_id", "plan_sha256", "run_id",
    "run_started_at_utc", "move_id", "scenario_id", "observed_at_utc",
    "platform", "shell", "executable", "target", "gate_id",
    "gate_receipt_sha256", "sequence", "previous_receipt_bytes_sha256",
    "command", "exit", "output", "state", "status",
}
NESTED_KEYS = {
    "platform": {"os", "version", "build", "arch", "host_id_sha256"},
    "shell": {"name", "version", "encoding"},
    "executable": {"requested", "resolved_path", "version", "sha256"},
    "target": {"kind", "identity", "sha256", "repository", "pr_number", "base_sha", "head_sha", "changed_files_sha256", "scenario_target_sha256"},
    "command": {"argv", "argv_nul_sha256", "timeout_seconds"},
    "exit": {"code", "signal", "timed_out"},
    "output": {"stdout_bytes", "stdout_sha256", "stderr_bytes", "stderr_sha256", "secret_scan_count", "fresh_output_required"},
    "state": {"pre_state_sha256", "post_state_sha256", "owned_resources_sha256", "rollback_receipt_sha256"},
}
STATUSES = {"PASS", "BLOCKED", "REQUEST_CHANGES", "STALE", "EVIDENCE_INCOMPLETE", "BLOCKED_ROLLBACK_FAILED"}


class Rejection(Exception):
    def __init__(self, verdict, detail):
        super().__init__(detail)
        self.verdict = verdict
        self.detail = detail


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def file_sha256(path):
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def reject_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Rejection("REJECT_SCHEMA", "duplicate JSON key: %s" % key)
        result[key] = value
    return result


def load_json(path, verdict="REJECT_SCHEMA"):
    try:
        raw = path.read_bytes()
        if raw.startswith(b"\xef\xbb\xbf"):
            raise Rejection(verdict, "%s has a UTF-8 BOM" % path.name)
        return json.loads(raw.decode("utf-8"), object_pairs_hook=reject_duplicates), raw
    except Rejection:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise Rejection(verdict, "%s is not strict UTF-8 JSON: %s" % (path.name, exc))


def require_regular(path, verdict, allow_missing=False):
    try:
        info = path.lstat()
    except FileNotFoundError:
        if allow_missing:
            return
        raise Rejection(verdict, "missing path: %s" % path)
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode):
        raise Rejection(verdict, "path is not a regular non-symlink file: %s" % path)


def require_directory(path):
    try:
        info = path.lstat()
    except FileNotFoundError:
        raise Rejection("REJECT_MISSING_RECEIPT", "missing receipts directory")
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
        raise Rejection("REJECT_SCHEMA", "receipts path is not a regular directory")


def exact_keys(value, expected, label):
    if not isinstance(value, dict):
        raise Rejection("REJECT_SCHEMA", "%s must be an object" % label)
    actual = set(value)
    if actual != expected:
        raise Rejection("REJECT_SCHEMA", "%s keys differ: missing=%s extra=%s" % (label, sorted(expected - actual), sorted(actual - expected)))


def require_sha(value, label, git=False):
    pattern = GIT_SHA_RE if git else SHA256_RE
    if not isinstance(value, str) or not pattern.fullmatch(value):
        raise Rejection("REJECT_SCHEMA", "%s is not a valid digest" % label)


def validate_shape(receipt):
    exact_keys(receipt, RECEIPT_KEYS, "receipt")
    for key, keys in NESTED_KEYS.items():
        exact_keys(receipt[key], keys, key)
    string_fields = ["receipt_id", "command_id", "plan_sha256", "run_id", "run_started_at_utc", "move_id", "scenario_id", "observed_at_utc", "previous_receipt_bytes_sha256", "status"]
    for key in string_fields:
        if not isinstance(receipt[key], str) or not receipt[key]:
            raise Rejection("REJECT_SCHEMA", "%s must be a non-empty string" % key)
    if receipt["schema_version"] != "2.0":
        raise Rejection("REJECT_SCHEMA", "wrong receipt schema version")
    if not isinstance(receipt["sequence"], int) or isinstance(receipt["sequence"], bool):
        raise Rejection("REJECT_SCHEMA", "sequence must be an integer")
    if receipt["status"] not in STATUSES:
        raise Rejection("REJECT_SCHEMA", "status is outside the closed enum")
    if not isinstance(receipt["command"]["argv"], list) or not receipt["command"]["argv"] or not all(isinstance(item, str) for item in receipt["command"]["argv"]):
        raise Rejection("REJECT_SCHEMA", "command argv must be a non-empty string array")
    integer_fields = [("command.timeout_seconds", receipt["command"]["timeout_seconds"]), ("output.stdout_bytes", receipt["output"]["stdout_bytes"]), ("output.stderr_bytes", receipt["output"]["stderr_bytes"]), ("output.secret_scan_count", receipt["output"]["secret_scan_count"])]
    for label, value in integer_fields:
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            raise Rejection("REJECT_SCHEMA", "%s must be a non-negative integer" % label)
    if receipt["command"]["timeout_seconds"] < 1 or receipt["command"]["timeout_seconds"] > 900:
        raise Rejection("REJECT_SCHEMA", "timeout is outside the frozen bound")
    if not isinstance(receipt["exit"]["timed_out"], bool) or not isinstance(receipt["output"]["fresh_output_required"], bool):
        raise Rejection("REJECT_SCHEMA", "boolean field has wrong type")
    if receipt["exit"]["code"] is not None and (not isinstance(receipt["exit"]["code"], int) or isinstance(receipt["exit"]["code"], bool)):
        raise Rejection("REJECT_SCHEMA", "exit code has wrong type")
    if receipt["exit"]["signal"] is not None and not isinstance(receipt["exit"]["signal"], str):
        raise Rejection("REJECT_SCHEMA", "signal has wrong type")
    if receipt["output"]["secret_scan_count"] != 0:
        raise Rejection("REJECT_SCHEMA", "secret scan count is non-zero")
    if receipt["platform"]["os"] != "macos" or receipt["platform"]["arch"] != "arm64" or receipt["shell"]["encoding"] != "UTF-8":
        raise Rejection("REJECT_SCHEMA", "platform contract mismatch")
    if receipt["target"]["pr_number"] != 903:
        raise Rejection("REJECT_TARGET", "wrong target PR")
    for label, value in [
        ("plan_sha256", receipt["plan_sha256"]), ("previous_receipt_bytes_sha256", receipt["previous_receipt_bytes_sha256"]),
        ("platform.host_id_sha256", receipt["platform"]["host_id_sha256"]), ("executable.sha256", receipt["executable"]["sha256"]),
        ("target.sha256", receipt["target"]["sha256"]), ("target.changed_files_sha256", receipt["target"]["changed_files_sha256"]),
        ("target.scenario_target_sha256", receipt["target"]["scenario_target_sha256"]), ("command.argv_nul_sha256", receipt["command"]["argv_nul_sha256"]),
        ("output.stdout_sha256", receipt["output"]["stdout_sha256"]), ("output.stderr_sha256", receipt["output"]["stderr_sha256"]),
        ("state.pre_state_sha256", receipt["state"]["pre_state_sha256"]), ("state.post_state_sha256", receipt["state"]["post_state_sha256"]),
        ("state.owned_resources_sha256", receipt["state"]["owned_resources_sha256"]), ("state.rollback_receipt_sha256", receipt["state"]["rollback_receipt_sha256"]),
    ]:
        require_sha(value, label)
    require_sha(receipt["target"]["base_sha"], "target.base_sha", git=True)
    require_sha(receipt["target"]["head_sha"], "target.head_sha", git=True)


def validate_trust(anchor_path, plan_path, schema_path):
    anchor, _ = load_json(anchor_path, "REJECT_TRUST_ANCHOR")
    expected_anchor_keys = {"schema_version", "artifact", "self_sha256", "identity", "files", "expected_commands", "receipt_chain_seed_sha256", "receipt_directory", "gates", "accepted_verdicts", "serialization"}
    exact_keys(anchor, expected_anchor_keys, "trust anchor")
    blank = dict(anchor)
    expected_self = blank["self_sha256"]
    blank["self_sha256"] = None
    if sha256_bytes(canonical_bytes(blank)) != expected_self:
        raise Rejection("REJECT_TRUST_ANCHOR", "trust anchor self hash mismatch")
    require_sha(expected_self, "trust anchor self hash")
    if anchor["schema_version"] != "1.0" or anchor["artifact"] != "pr903-mac-rehearsal-trust-anchor":
        raise Rejection("REJECT_TRUST_ANCHOR", "trust anchor identity mismatch")
    files = anchor["files"]
    exact_keys(files, {"plan_markdown", "plan", "receipt_schema", "validator"}, "trust anchor files")
    supplied = {"plan": plan_path, "receipt_schema": schema_path, "validator": Path(__file__).resolve(), "plan_markdown": plan_path.with_name("PR903-MAC-RUNTIME-REHEARSAL-PLAN.md")}
    anchor_dir = anchor_path.resolve().parent
    for key, path in supplied.items():
        exact_keys(files[key], {"path", "sha256"}, "files.%s" % key)
        if path.name != files[key]["path"] or path.resolve().parent != anchor_dir:
            raise Rejection("REJECT_TRUST_ANCHOR", "%s path escape or name mismatch" % key)
        require_regular(path, "REJECT_TRUST_ANCHOR")
        if file_sha256(path) != files[key]["sha256"]:
            raise Rejection("REJECT_TRUST_ANCHOR", "%s hash mismatch" % key)
    return anchor


def write_result(path, verdict, detail, receipt_count=0, envelope_sha256=None):
    require_regular(path, "REJECT_SCHEMA", allow_missing=True)
    if path.exists():
        raise Rejection("REJECT_SCHEMA", "validation output must be new")
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": "1.0", "verdict": verdict, "detail": detail,
        "receipt_count": receipt_count, "envelope_sha256": envelope_sha256,
    }
    path.write_bytes(canonical_bytes(payload))


def parse_args():
    parser = argparse.ArgumentParser(allow_abbrev=False)
    parser.add_argument("--plan", required=True)
    parser.add_argument("--receipt-schema", required=True)
    parser.add_argument("--trust-anchor", required=True)
    parser.add_argument("--receipts-dir", required=True)
    parser.add_argument("--expected-run-id", required=True)
    parser.add_argument("--expected-base-sha", required=True)
    parser.add_argument("--expected-head-sha", required=True)
    parser.add_argument("--expected-plan-sha256", required=True)
    parser.add_argument("--replay-ledger", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main():
    args = parse_args()
    output = Path(args.output)
    count = 0
    envelope_hash = None
    try:
        paths = [Path(args.plan), Path(args.receipt_schema), Path(args.trust_anchor), Path(args.replay_ledger), output]
        if not all(path.is_absolute() for path in paths + [Path(args.receipts_dir)]):
            raise Rejection("REJECT_SCHEMA", "all paths must be absolute")
        for path in paths[:-1]:
            require_regular(path, "REJECT_SCHEMA")
        anchor = validate_trust(Path(args.trust_anchor), Path(args.plan), Path(args.receipt_schema))
        identity = anchor["identity"]
        if args.expected_base_sha != identity["base_sha"] or args.expected_head_sha != identity["head_sha"]:
            raise Rejection("REJECT_TARGET", "CLI identity differs from trust anchor")
        if args.expected_plan_sha256 != anchor["files"]["plan"]["sha256"]:
            raise Rejection("REJECT_PLAN", "CLI plan hash differs from trust anchor")
        require_directory(Path(args.receipts_dir))
        entries = anchor["expected_commands"]
        if not isinstance(entries, list) or len(entries) != 45:
            raise Rejection("REJECT_TRUST_ANCHOR", "command map cardinality is not 45")
        expected_names = {"receipt-%02d-%s.json" % (entry["sequence"], entry["command_id"]) for entry in entries}
        actual_paths = list(Path(args.receipts_dir).iterdir())
        actual_names = {path.name for path in actual_paths}
        if len(actual_paths) < 45:
            raise Rejection("REJECT_MISSING_RECEIPT", "receipt directory has fewer than 45 members")
        if len(actual_paths) > 45:
            raise Rejection("REJECT_EXTRA_RECEIPT", "receipt directory has more than 45 members")
        if actual_names != expected_names:
            missing = expected_names - actual_names
            raise Rejection("REJECT_MISSING_RECEIPT" if missing else "REJECT_EXTRA_RECEIPT", "receipt filenames differ from closed command map")
        receipts = []
        raw_values = []
        for entry in entries:
            path = Path(args.receipts_dir) / ("receipt-%02d-%s.json" % (entry["sequence"], entry["command_id"]))
            require_regular(path, "REJECT_SCHEMA")
            receipt, raw = load_json(path)
            receipts.append(receipt)
            raw_values.append(raw)
        receipt_ids = [receipt.get("receipt_id") for receipt in receipts]
        if len(set(receipt_ids)) != len(receipt_ids):
            raise Rejection("REJECT_DUPLICATE_RECEIPT", "receipt_id is not unique")
        for receipt in receipts:
            validate_shape(receipt)
        for receipt, entry in zip(receipts, entries):
            if receipt["sequence"] != entry["sequence"]:
                raise Rejection("REJECT_ORDER", "sequence differs from filename/map")
            if receipt["command_id"] != entry["command_id"] or receipt["move_id"] != entry["move_id"] or receipt["scenario_id"] != entry["scenario_id"]:
                raise Rejection("REJECT_COMMAND_MAP", "command, move or scenario mapping mismatch")
            if receipt["plan_sha256"] != args.expected_plan_sha256:
                raise Rejection("REJECT_PLAN", "receipt plan hash mismatch")
            target = receipt["target"]
            expected_target = {
                "repository": identity["repository"], "pr_number": identity["pr_number"],
                "base_sha": identity["base_sha"], "head_sha": identity["head_sha"],
                "changed_files_sha256": identity["changed_files_sha256"],
                "scenario_target_sha256": entry["scenario_target_sha256"],
            }
            if any(target[key] != value for key, value in expected_target.items()) or target["identity"] != entry["target_identity"]:
                raise Rejection("REJECT_TARGET", "target identity mismatch")
            if receipt["gate_id"] != entry["gate_id"] or receipt["gate_receipt_sha256"] is None or not isinstance(receipt["gate_receipt_sha256"], str) or not SHA256_RE.fullmatch(receipt["gate_receipt_sha256"]):
                raise Rejection("REJECT_GATE", "gate binding mismatch")
            if receipt["run_id"] != args.expected_run_id:
                raise Rejection("REJECT_REPLAY", "run id differs from gate expectation")
        previous = anchor["receipt_chain_seed_sha256"]
        for receipt, raw in zip(receipts, raw_values):
            if raw != canonical_bytes(receipt):
                raise Rejection("REJECT_SCHEMA", "receipt bytes are not canonical sorted compact JSON plus LF")
            if receipt["previous_receipt_bytes_sha256"] != previous:
                raise Rejection("REJECT_CHAIN", "previous exact-byte hash mismatch")
            previous = sha256_bytes(raw)
        stdout_hashes = [receipt["output"]["stdout_sha256"] for receipt in receipts if receipt["output"]["fresh_output_required"]]
        stderr_hashes = [receipt["output"]["stderr_sha256"] for receipt in receipts if receipt["output"]["fresh_output_required"]]
        if len(set(stdout_hashes)) != len(stdout_hashes) or len(set(stderr_hashes)) != len(stderr_hashes):
            raise Rejection("REJECT_REUSED_OUTPUT", "fresh output hash was reused")
        ledger, _ = load_json(Path(args.replay_ledger), "REJECT_REPLAY")
        exact_keys(ledger, {"schema_version", "run_ids", "receipt_sha256", "output_sha256"}, "replay ledger")
        if ledger["schema_version"] != "1.0" or not all(isinstance(ledger[key], list) for key in ("run_ids", "receipt_sha256", "output_sha256")):
            raise Rejection("REJECT_REPLAY", "replay ledger shape mismatch")
        receipt_hashes = [sha256_bytes(raw) for raw in raw_values]
        output_hashes = stdout_hashes + stderr_hashes
        if args.expected_run_id in ledger["run_ids"] or set(receipt_hashes) & set(ledger["receipt_sha256"]) or set(output_hashes) & set(ledger["output_sha256"]):
            raise Rejection("REJECT_REPLAY", "replay ledger collision")
        count = len(receipts)
        envelope_hash = sha256_bytes(b"".join(raw_values))
        write_result(output, "ACCEPTED", "closed 45-command envelope accepted", count, envelope_hash)
        return 0
    except Rejection as exc:
        try:
            write_result(output, exc.verdict, exc.detail, count, envelope_hash)
        except Rejection:
            pass
        print("%s: %s" % (exc.verdict, exc.detail), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
