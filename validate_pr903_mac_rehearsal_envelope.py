#!/usr/bin/env python3
"""Fail-closed detached validator for the PR #903 Mac rehearsal envelope."""

import argparse
import datetime as dt
import errno
import fcntl
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
import time
from pathlib import Path

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
GIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
ZERO_SHA256 = "0" * 64
FLAGS = [
    "--evidence-root", "--run-root", "--repo-root", "--plan",
    "--receipt-schema", "--trust-anchor", "--receipts-dir",
    "--streams-dir", "--authority-receipt", "--gates-dir",
    "--expected-run-id", "--replay-ledger", "--output",
]
AUTHORITY_KEYS = {
    "schema_version", "repository", "pr_number", "state", "draft",
    "base_sha", "head_sha", "tree_sha", "changed_paths",
    "changed_files_sha256", "observed_at_utc", "source",
    "source_payload_sha256",
}
GATE_KEYS = {
    "schema_version", "gate_id", "authority", "signer_identity",
    "repository", "pr_number", "base_sha", "head_sha", "tree_sha",
    "changed_files_sha256", "authority_receipt_sha256", "run_id", "scope",
    "issued_at_utc", "not_before_utc", "expires_at_utc", "nonce",
}
RECEIPT_KEYS = {
    "schema_version", "receipt_id", "command_id", "plan_sha256", "run_id",
    "run_started_at_utc", "move_id", "scenario_id", "observed_at_utc",
    "platform", "shell", "executable", "target", "gate_id",
    "gate_receipt_sha256", "sequence", "previous_receipt_bytes_sha256",
    "command", "exit", "output", "desired_state", "status",
}
NESTED_KEYS = {
    "platform": {"os", "version", "build", "arch", "host_id_sha256"},
    "shell": {"name", "version", "encoding"},
    "executable": {"requested", "resolved_path", "version", "sha256"},
    "target": {"kind", "identity", "sha256", "repository", "pr_number", "base_sha", "head_sha", "tree_sha", "changed_files_sha256", "scenario_target_sha256", "authority_receipt_sha256"},
    "command": {"argv", "argv_nul_sha256", "timeout_seconds"},
    "exit": {"code", "signal", "timed_out"},
    "output": {"stdout_bytes", "stdout_sha256", "stderr_bytes", "stderr_sha256", "secret_scan_count"},
}
LEDGER_KEYS = {
    "schema_version", "previous_ledger_line_sha256", "run_id",
    "authority_receipt_sha256", "gate_receipt_sha256", "envelope_sha256",
    "receipt_ids", "receipt_sha256", "streams", "accepted_at_utc",
}


class Rejection(Exception):
    def __init__(self, verdict, detail):
        super().__init__(detail)
        self.verdict = verdict
        self.detail = detail


def canonical_bytes(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def reject_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise Rejection("REJECT_SCHEMA", "duplicate JSON key: %s" % key)
        result[key] = value
    return result


def parse_json_bytes(raw, label, verdict="REJECT_SCHEMA"):
    try:
        if raw.startswith(b"\xef\xbb\xbf"):
            raise Rejection(verdict, "%s has a UTF-8 BOM" % label)
        return json.loads(raw.decode("utf-8"), object_pairs_hook=reject_duplicates)
    except Rejection:
        raise
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise Rejection(verdict, "%s is not strict UTF-8 JSON: %s" % (label, exc))


def exact_keys(value, expected, label, verdict="REJECT_SCHEMA"):
    if not isinstance(value, dict) or set(value) != expected:
        raise Rejection(verdict, "%s keys differ" % label)


def require_sha(value, label, git=False, verdict="REJECT_SCHEMA"):
    pattern = GIT_SHA_RE if git else SHA256_RE
    if not isinstance(value, str) or not pattern.fullmatch(value):
        raise Rejection(verdict, "%s is not a valid digest" % label)


def has_dotdot(path_text):
    return ".." in Path(path_text).parts


def lstat_owned(path, kind, allow_missing=False):
    try:
        info = path.lstat()
    except FileNotFoundError:
        if allow_missing:
            return None
        raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")
    if stat.S_ISLNK(info.st_mode) or info.st_uid != os.geteuid() or info.st_mode & 0o022:
        raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")
    if kind == "file" and not stat.S_ISREG(info.st_mode):
        raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")
    if kind == "dir" and not stat.S_ISDIR(info.st_mode):
        raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")
    return info


def walk_components(path, allow_leaf_missing=False):
    if not path.is_absolute() or has_dotdot(str(path)):
        raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")
    current = Path(path.anchor)
    parts = path.parts[1:]
    for index, part in enumerate(parts):
        current = current / part
        if allow_leaf_missing and index == len(parts) - 1 and not current.exists():
            return
        try:
            info = current.lstat()
        except OSError:
            raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")
        if stat.S_ISLNK(info.st_mode):
            raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")


def safe_read(path, verdict="REJECT_PATH_POLICY"):
    before = lstat_owned(path, "file")
    if before is None:
        raise Rejection(verdict, "secure file disappeared before open")
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
    try:
        descriptor = os.open(str(path), flags)
    except OSError:
        raise Rejection(verdict, "secure file open failed")
    try:
        after = os.fstat(descriptor)
        if (before.st_dev, before.st_ino, before.st_mode, before.st_uid) != (after.st_dev, after.st_ino, after.st_mode, after.st_uid) or not stat.S_ISREG(after.st_mode):
            raise Rejection(verdict, "file identity changed during secure open")
        chunks = []
        while True:
            chunk = os.read(descriptor, 1024 * 1024)
            if not chunk:
                break
            chunks.append(chunk)
        return b"".join(chunks)
    finally:
        os.close(descriptor)


def load_json(path, label=None, verdict="REJECT_SCHEMA", canonical=True):
    raw = safe_read(path, verdict)
    value = parse_json_bytes(raw, label or path.name, verdict)
    if canonical and raw != canonical_bytes(value):
        raise Rejection(verdict, "%s bytes are not canonical JSON plus LF" % (label or path.name))
    return value, raw


def parse_utc(value, label, verdict="REJECT_GATE"):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise Rejection(verdict, "%s is not canonical UTC" % label)
    try:
        parsed = dt.datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        raise Rejection(verdict, "%s is not a valid timestamp" % label)
    if parsed.microsecond:
        raise Rejection(verdict, "%s includes fractional seconds" % label)
    return parsed


def run_git(repo_root, arguments):
    result = subprocess.run(["/usr/bin/git", "-C", str(repo_root), *arguments], capture_output=True, text=True)
    if result.returncode:
        raise Rejection("REJECT_TARGET", "external PR authority differs from run-owned checkout")
    return result.stdout.strip()


def parse_cli():
    tokens = sys.argv[1:]
    if len(tokens) != len(FLAGS) * 2 or tokens[::2] != FLAGS or any(not tokens[index] for index in range(1, len(tokens), 2)):
        raise Rejection("REJECT_INTERFACE", "exact ordered CLI required")
    parser = argparse.ArgumentParser(add_help=False, allow_abbrev=False)
    for flag in FLAGS:
        parser.add_argument(flag, required=True)
    return parser.parse_args(tokens)


def validate_paths(args):
    paths = {name: Path(getattr(args, name)) for name in (
        "evidence_root", "run_root", "repo_root", "plan", "receipt_schema",
        "trust_anchor", "receipts_dir", "streams_dir", "authority_receipt",
        "gates_dir", "replay_ledger", "output",
    )}
    if not args.expected_run_id or "/" in args.expected_run_id or args.expected_run_id in {".", ".."}:
        raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")
    for name, path in paths.items():
        walk_components(path, allow_leaf_missing=name == "output")
    expected = {
        "run_root": paths["evidence_root"] / "runs" / args.expected_run_id,
        "repo_root": paths["run_root"] / "source",
        "plan": paths["repo_root"] / "pr903-mac-runtime-rehearsal-plan.json",
        "receipt_schema": paths["repo_root"] / "pr903-mac-command-receipt.schema.json",
        "trust_anchor": paths["repo_root"] / "pr903-mac-rehearsal-trust-anchor.json",
        "receipts_dir": paths["run_root"] / "receipts",
        "streams_dir": paths["run_root"] / "streams",
        "authority_receipt": paths["run_root"] / "authority" / "pr-authority-receipt.json",
        "gates_dir": paths["run_root"] / "gates",
        "replay_ledger": paths["evidence_root"] / "replay-ledger.jsonl",
        "output": paths["run_root"] / "validation" / "result.json",
    }
    if any(paths[name] != value for name, value in expected.items()):
        raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")
    for name in ("evidence_root", "run_root", "repo_root", "receipts_dir", "streams_dir", "gates_dir"):
        lstat_owned(paths[name], "dir")
    lstat_owned(paths["output"].parent, "dir")
    if paths["output"].exists():
        raise Rejection("REJECT_PATH_POLICY", "path is outside fixed non-symlink roots")
    for name in ("plan", "receipt_schema", "trust_anchor", "authority_receipt", "replay_ledger"):
        lstat_owned(paths[name], "file")
    lock = paths["evidence_root"] / "replay-ledger.lock"
    walk_components(lock)
    lstat_owned(lock, "file")
    paths["replay_lock"] = lock
    return paths


def validate_trust(paths):
    anchor, _ = load_json(paths["trust_anchor"], "trust anchor", "REJECT_TRUST_ANCHOR", canonical=False)
    expected_keys = {"schema_version", "artifact", "self_sha256", "identity", "files", "expected_commands", "receipt_chain_seed_sha256", "receipt_directory", "gate_authentication", "replay_ledger", "accepted_verdicts", "serialization"}
    exact_keys(anchor, expected_keys, "trust anchor", "REJECT_TRUST_ANCHOR")
    if anchor["schema_version"] != "2.0" or anchor["artifact"] != "pr903-mac-rehearsal-trust-anchor":
        raise Rejection("REJECT_TRUST_ANCHOR", "trust anchor identity mismatch")
    require_sha(anchor["self_sha256"], "self_sha256", verdict="REJECT_TRUST_ANCHOR")
    blank = dict(anchor)
    blank["self_sha256"] = None
    if sha256_bytes(canonical_bytes(blank)) != anchor["self_sha256"]:
        raise Rejection("REJECT_TRUST_ANCHOR", "trust anchor self hash mismatch")
    identity_keys = {"binding_mode", "repository", "pr_number", "input_base_sha", "governed_paths", "changed_files_sha256", "changed_files_digest_algorithm", "manifest_sha256", "lockfile_sha256"}
    exact_keys(anchor["identity"], identity_keys, "identity", "REJECT_TRUST_ANCHOR")
    identity = anchor["identity"]
    if identity["binding_mode"] != "external_exact_pr_authority_v1" or identity["repository"] != "CleanExpo/Unite-Group" or identity["pr_number"] != 903:
        raise Rejection("REJECT_TRUST_ANCHOR", "external authority binding is not frozen")
    if "head_sha" in identity or "tree_sha" in identity:
        raise Rejection("REJECT_TRUST_ANCHOR", "tracked authority recursively contains final head or tree")
    require_sha(identity["input_base_sha"], "input_base_sha", git=True, verdict="REJECT_TRUST_ANCHOR")
    if identity["changed_files_sha256"] != sha256_bytes(canonical_bytes(identity["governed_paths"])):
        raise Rejection("REJECT_TRUST_ANCHOR", "governed path digest mismatch")
    files = anchor["files"]
    exact_keys(files, {"plan_markdown", "plan", "receipt_schema", "validator"}, "files", "REJECT_TRUST_ANCHOR")
    supplied = {"plan_markdown": paths["repo_root"] / "PR903-MAC-RUNTIME-REHEARSAL-PLAN.md", "plan": paths["plan"], "receipt_schema": paths["receipt_schema"], "validator": paths["repo_root"] / "validate_pr903_mac_rehearsal_envelope.py"}
    for key, path in supplied.items():
        exact_keys(files[key], {"path", "sha256"}, "files.%s" % key, "REJECT_TRUST_ANCHOR")
        if files[key]["path"] != path.name or sha256_bytes(safe_read(path, "REJECT_TRUST_ANCHOR")) != files[key]["sha256"]:
            raise Rejection("REJECT_TRUST_ANCHOR", "%s hash mismatch" % key)
    entries = anchor["expected_commands"]
    if not isinstance(entries, list) or len(entries) != 45 or [item.get("sequence") for item in entries] != list(range(1, 46)) or len({item.get("command_id") for item in entries}) != 45:
        raise Rejection("REJECT_TRUST_ANCHOR", "command map cardinality/order mismatch")
    required_entry = {"sequence", "command_id", "move_id", "scenario_id", "gate_id", "target_identity", "scenario_target_sha256", "requested_executable", "allowed_resolved_executables", "argv", "timeout_seconds", "exit_contract", "freshness_policy", "desired_state_predicate_id"}
    for entry in entries:
        exact_keys(entry, required_entry, "expected command", "REJECT_TRUST_ANCHOR")
        allowed = entry["allowed_resolved_executables"]
        if (
            not isinstance(entry["requested_executable"], str)
            or not entry["requested_executable"].startswith("/")
            or not isinstance(allowed, list)
            or not allowed
            or any(not isinstance(path, str) or not path.startswith("/") for path in allowed)
        ):
            raise Rejection("REJECT_TRUST_ANCHOR", "command executables must be frozen absolute paths")
        if entry["freshness_policy"] not in {"required_nonempty", "allow_empty_but_record", "receipt_only"}:
            raise Rejection("REJECT_TRUST_ANCHOR", "invalid freshness policy")
    return anchor


def validate_authority(paths, anchor):
    authority, raw = load_json(paths["authority_receipt"], "PR authority receipt", "REJECT_TARGET")
    exact_keys(authority, AUTHORITY_KEYS, "PR authority receipt", "REJECT_TARGET")
    identity = anchor["identity"]
    if authority["schema_version"] != "1.0" or authority["repository"] != identity["repository"] or authority["pr_number"] != 903 or authority["state"] != "OPEN" or authority["draft"] is not False or authority["source"] != "github_rest_authenticated_read":
        raise Rejection("REJECT_TARGET", "external PR authority differs from run-owned checkout")
    for name in ("base_sha", "head_sha", "tree_sha"):
        require_sha(authority[name], name, git=True, verdict="REJECT_TARGET")
    require_sha(authority["changed_files_sha256"], "changed_files_sha256", verdict="REJECT_TARGET")
    source_payload = paths["authority_receipt"].with_name("source-payload.json")
    if sha256_bytes(safe_read(source_payload, "REJECT_TARGET")) != authority["source_payload_sha256"]:
        raise Rejection("REJECT_TARGET", "external PR authority differs from run-owned checkout")
    if authority["base_sha"] != identity["input_base_sha"] or authority["changed_paths"] != identity["governed_paths"] or authority["changed_files_sha256"] != identity["changed_files_sha256"]:
        raise Rejection("REJECT_TARGET", "external PR authority differs from run-owned checkout")
    head = run_git(paths["repo_root"], ["rev-parse", "HEAD"])
    tree = run_git(paths["repo_root"], ["rev-parse", "HEAD^{tree}"])
    if head != authority["head_sha"] or tree != authority["tree_sha"]:
        raise Rejection("REJECT_TARGET", "external PR authority differs from run-owned checkout")
    run_git(paths["repo_root"], ["merge-base", "--is-ancestor", authority["base_sha"], authority["head_sha"]])
    changed = run_git(paths["repo_root"], ["diff", "--name-only", "%s...%s" % (authority["base_sha"], authority["head_sha"])]).splitlines()
    if changed != authority["changed_paths"] or sha256_bytes(canonical_bytes(changed)) != authority["changed_files_sha256"]:
        raise Rejection("REJECT_TARGET", "external PR authority differs from run-owned checkout")
    return authority, raw


def validate_gate(paths, anchor, authority, authority_raw, gate_id, run_id, now):
    config = anchor["gate_authentication"]
    gate_path = paths["gates_dir"] / (gate_id + ".json")
    signature_path = paths["gates_dir"] / (gate_id + ".json.sig")
    gate, raw = load_json(gate_path, "gate receipt", "REJECT_GATE")
    exact_keys(gate, GATE_KEYS, "gate receipt", "REJECT_GATE")
    if gate["schema_version"] != "1.0" or gate["gate_id"] != gate_id or gate["authority"] != "Phill McGurk" or gate["signer_identity"] != config["signer_identity"]:
        raise Rejection("REJECT_GATE", "authenticated gate verification failed")
    expected = {"repository": authority["repository"], "pr_number": authority["pr_number"], "base_sha": authority["base_sha"], "head_sha": authority["head_sha"], "tree_sha": authority["tree_sha"], "changed_files_sha256": authority["changed_files_sha256"], "authority_receipt_sha256": sha256_bytes(authority_raw), "run_id": run_id, "scope": config["gate_scopes"][gate_id]}
    if any(gate.get(key) != value for key, value in expected.items()):
        raise Rejection("REJECT_GATE", "authenticated gate verification failed")
    issued = parse_utc(gate["issued_at_utc"], "issued_at_utc")
    not_before = parse_utc(gate["not_before_utc"], "not_before_utc")
    expires = parse_utc(gate["expires_at_utc"], "expires_at_utc")
    skew = dt.timedelta(seconds=config["maximum_clock_skew_seconds"])
    if not_before > issued or expires <= issued or (expires - issued).total_seconds() > config["maximum_validity_seconds"] or now + skew < not_before or now - skew > expires:
        raise Rejection("REJECT_GATE", "authenticated gate verification failed")
    allowed = paths["gates_dir"] / "allowed-signers"
    expected_allowed = "".join("%s %s\n" % (config["signer_identity"], key) for key in config["pinned_public_keys"]).encode()
    if safe_read(allowed, "REJECT_GATE") != expected_allowed:
        raise Rejection("REJECT_GATE", "authenticated gate verification failed")
    safe_read(signature_path, "REJECT_GATE")
    result = subprocess.run([config["verify_executable"], "-Y", "verify", "-f", str(allowed), "-I", config["signer_identity"], "-n", config["namespace"], "-s", str(signature_path)], input=raw, capture_output=True)
    if result.returncode:
        raise Rejection("REJECT_GATE", "authenticated gate verification failed")
    return raw


def argv_digest(resolved, argv):
    digest = hashlib.sha256()
    for value in [resolved, *argv]:
        if not isinstance(value, str) or "\x00" in value:
            raise Rejection("REJECT_COMMAND_SEMANTICS", "executable argv or timeout mismatch")
        digest.update(value.encode("utf-8"))
        digest.update(b"\0")
    return digest.hexdigest()


def validate_desired_state(receipt, c14a_pre_sha):
    command_id = receipt["command_id"]
    state = receipt["desired_state"]
    if not isinstance(state, dict):
        raise Rejection("REJECT_DESIRED_STATE", "desired state must be an object")
    if command_id == "C14A":
        keys = {"predicate_id", "approved_interface_disabled", "sole_external_interface", "default_route_interface_matches", "service_state_captured", "device_state_captured", "power_state_captured", "link_state_captured", "all_non_loopback_interfaces_captured", "all_external_routes_captured", "gateway_target_captured", "application_contract_captured", "pre_state", "pre_state_sha256"}
        exact_keys(state, keys, "C14A desired state", "REJECT_DESIRED_STATE")
        booleans = [state[key] for key in keys - {"predicate_id", "pre_state", "pre_state_sha256", "approved_interface_disabled"}]
        if state["predicate_id"] != "approved_interface_prestate_v1" or state["approved_interface_disabled"] is not False or not all(value is True for value in booleans) or state["pre_state_sha256"] != sha256_bytes(canonical_bytes(state["pre_state"])):
            raise Rejection("REJECT_DESIRED_STATE", "C14A approved interface pre-state failed")
        return state["pre_state_sha256"]
    if command_id == "C14B":
        keys = {"predicate_id", "transport_class", "transport_succeeded", "http_status", "content_type", "content_type_passed", "required_headers_passed", "body_schema", "body_schema_passed", "route_identity_passed", "secret_scan_count"}
        exact_keys(state, keys, "C14B desired state", "REJECT_DESIRED_STATE")
        passed = state["predicate_id"] == "gateway_unavailable_503_v1" and state["transport_class"] == "http" and state["transport_succeeded"] is True and state["http_status"] == 503 and state["content_type"] == "application/json" and state["content_type_passed"] is True and state["required_headers_passed"] is True and state["body_schema"] == "gateway_unavailable_v1" and state["body_schema_passed"] is True and state["route_identity_passed"] is True and state["secret_scan_count"] == 0
        if not passed:
            raise Rejection("REJECT_DESIRED_STATE", "C14B exact 503 contract failed")
    elif command_id == "C14C":
        keys = {"predicate_id", "approved_interface_disabled", "external_route_count", "transport_class", "http_status", "route_absence_proof_passed", "offline_ui_predicate_passed", "secret_scan_count"}
        exact_keys(state, keys, "C14C desired state", "REJECT_DESIRED_STATE")
        passed = state["predicate_id"] == "approved_interface_offline_v1" and state["approved_interface_disabled"] is True and state["external_route_count"] == 0 and state["transport_class"] in {"dns_failure", "connect_refused", "network_unreachable", "timeout"} and state["http_status"] is None and state["route_absence_proof_passed"] is True and state["offline_ui_predicate_passed"] is True and state["secret_scan_count"] == 0
        if not passed:
            raise Rejection("REJECT_DESIRED_STATE", "C14C offline transport contract failed")
    elif command_id == "C14D":
        keys = {"predicate_id", "finally_executed", "trigger", "restoration_attempted", "restoration_succeeded", "power_reread", "link_reread", "service_reread", "routes_reread", "pre_state_sha256", "post_state_sha256"}
        exact_keys(state, keys, "C14D desired state", "BLOCKED_ROLLBACK_FAILED")
        passed = state["predicate_id"] == "finally_exact_restoration_v1" and state["finally_executed"] is True and state["trigger"] in {"success", "failure", "timeout", "interruption"} and all(state[key] is True for key in ("restoration_attempted", "restoration_succeeded", "power_reread", "link_reread", "service_reread", "routes_reread")) and c14a_pre_sha is not None and state["pre_state_sha256"] == c14a_pre_sha and state["post_state_sha256"] == c14a_pre_sha
        if not passed:
            raise Rejection("BLOCKED_ROLLBACK_FAILED", "C14D exact restoration failed")
    else:
        exact_keys(state, {"predicate_id", "passed"}, "desired state", "REJECT_DESIRED_STATE")
        if state["predicate_id"] != "command_completed_v1" or state["passed"] is not True:
            raise Rejection("REJECT_DESIRED_STATE", "command desired state failed")
    return c14a_pre_sha


def validate_receipts(paths, anchor, authority, authority_raw, gates, expected_run_id):
    entries = anchor["expected_commands"]
    expected_receipts = ["receipt-%02d-%s.json" % (entry["sequence"], entry["command_id"]) for entry in entries]
    expected_streams = sorted([name[:-5] + suffix for name in expected_receipts for suffix in (".stdout.bin", ".stderr.bin")])
    actual_receipts = sorted(item.name for item in paths["receipts_dir"].iterdir())
    actual_streams = sorted(item.name for item in paths["streams_dir"].iterdir())
    if actual_receipts != sorted(expected_receipts):
        verdict = "REJECT_MISSING_RECEIPT" if len(actual_receipts) < 45 else "REJECT_EXTRA_RECEIPT"
        raise Rejection(verdict, "receipt directory differs from closed command map")
    if actual_streams != expected_streams:
        raise Rejection("REJECT_COMMAND_SEMANTICS", "stream evidence files differ from closed command map")
    previous = anchor["receipt_chain_seed_sha256"]
    receipts = []
    receipt_raw = []
    stream_records = []
    c14a_pre_sha = None
    authority_hash = sha256_bytes(authority_raw)
    for entry, filename in zip(entries, expected_receipts):
        receipt, raw = load_json(paths["receipts_dir"] / filename, filename)
        exact_keys(receipt, RECEIPT_KEYS, "receipt")
        for key, keys in NESTED_KEYS.items():
            exact_keys(receipt.get(key), keys, key)
        if receipt["schema_version"] != "3.0" or receipt["sequence"] != entry["sequence"] or receipt["command_id"] != entry["command_id"] or receipt["move_id"] != entry["move_id"] or receipt["scenario_id"] != entry["scenario_id"] or receipt["plan_sha256"] != anchor["files"]["plan"]["sha256"]:
            raise Rejection("REJECT_COMMAND_SEMANTICS", "command map mismatch")
        if receipt["previous_receipt_bytes_sha256"] != previous:
            raise Rejection("REJECT_CHAIN", "previous exact-byte hash mismatch")
        if receipt["status"] != "PASS" or receipt["exit"] != entry["exit_contract"] or receipt["exit"]["timed_out"] is not False:
            raise Rejection("REJECT_COMMAND_SEMANTICS", "required command did not PASS")
        executable = receipt["executable"]
        command = receipt["command"]
        if executable["requested"] != entry["requested_executable"] or executable["resolved_path"] not in entry["allowed_resolved_executables"] or command["argv"] != entry["argv"] or command["timeout_seconds"] != entry["timeout_seconds"]:
            raise Rejection("REJECT_COMMAND_SEMANTICS", "executable argv or timeout mismatch")
        if command["argv_nul_sha256"] != argv_digest(executable["resolved_path"], command["argv"]):
            raise Rejection("REJECT_COMMAND_SEMANTICS", "argv NUL digest mismatch")
        target = receipt["target"]
        expected_target = {"repository": authority["repository"], "pr_number": authority["pr_number"], "base_sha": authority["base_sha"], "head_sha": authority["head_sha"], "tree_sha": authority["tree_sha"], "changed_files_sha256": authority["changed_files_sha256"], "scenario_target_sha256": entry["scenario_target_sha256"], "authority_receipt_sha256": authority_hash, "identity": entry["target_identity"]}
        if any(target.get(key) != value for key, value in expected_target.items()):
            raise Rejection("REJECT_TARGET", "external PR authority differs from run-owned checkout")
        if receipt["run_id"] != expected_run_id:
            raise Rejection("REJECT_REPLAY", "receipt run differs")
        if receipt["gate_id"] != entry["gate_id"] or receipt["gate_receipt_sha256"] != sha256_bytes(gates[entry["gate_id"]]):
            raise Rejection("REJECT_GATE", "authenticated gate verification failed")
        output = receipt["output"]
        if output["secret_scan_count"] != 0:
            raise Rejection("REJECT_COMMAND_SEMANTICS", "secret scan count is non-zero")
        stem = filename[:-5]
        for kind in ("stdout", "stderr"):
            stream_path = paths["streams_dir"] / (stem + ".%s.bin" % kind)
            raw_stream = safe_read(stream_path)
            if output["%s_bytes" % kind] != len(raw_stream) or output["%s_sha256" % kind] != sha256_bytes(raw_stream):
                raise Rejection("REJECT_COMMAND_SEMANTICS", "stream byte/hash evidence mismatch")
            if entry["freshness_policy"] == "required_nonempty" and not raw_stream:
                raise Rejection("REJECT_COMMAND_SEMANTICS", "required fresh stream is empty")
            stream_records.append({"command_id": entry["command_id"], "kind": kind, "bytes": len(raw_stream), "sha256": sha256_bytes(raw_stream)})
        c14a_pre_sha = validate_desired_state(receipt, c14a_pre_sha)
        receipts.append(receipt)
        receipt_raw.append(raw)
        previous = sha256_bytes(raw)
    ids = [item["receipt_id"] for item in receipts]
    hashes = [sha256_bytes(item) for item in receipt_raw]
    if len(ids) != len(set(ids)) or len(hashes) != len(set(hashes)):
        raise Rejection("REJECT_DUPLICATE_RECEIPT", "receipt identity is not unique")
    return receipts, receipt_raw, stream_records


def parse_ledger(raw):
    if not raw:
        return [], ZERO_SHA256
    records = []
    previous = ZERO_SHA256
    for number, line in enumerate(raw.splitlines(keepends=True), 1):
        if not line.endswith(b"\n"):
            raise Rejection("REJECT_REPLAY_LEDGER", "malformed or partial ledger line")
        record = parse_json_bytes(line, "ledger line %d" % number, "REJECT_REPLAY_LEDGER")
        if line != canonical_bytes(record):
            raise Rejection("REJECT_REPLAY_LEDGER", "ledger line is not canonical")
        exact_keys(record, LEDGER_KEYS, "ledger line", "REJECT_REPLAY_LEDGER")
        if record["schema_version"] != "1.0" or record["previous_ledger_line_sha256"] != previous:
            raise Rejection("REJECT_REPLAY_LEDGER", "ledger hash chain mismatch")
        records.append(record)
        previous = sha256_bytes(line)
    return records, previous


def check_replay(records, run_id, receipt_ids, receipt_hashes, streams):
    prior_runs = {record["run_id"] for record in records}
    prior_ids = {item for record in records for item in record["receipt_ids"]}
    prior_hashes = {item for record in records for item in record["receipt_sha256"]}
    if run_id in prior_runs or set(receipt_ids) & prior_ids or set(receipt_hashes) & prior_hashes:
        raise Rejection("REJECT_REPLAY", "receipt or run already accepted")
    prior_streams = {(item["command_id"], item["kind"], item["bytes"], item["sha256"]) for record in records for item in record["streams"]}
    current = {(item["command_id"], item["kind"], item["bytes"], item["sha256"]) for item in streams}
    if current & prior_streams:
        raise Rejection("REJECT_REUSED_OUTPUT", "frozen fresh output was reused")


def acquire_lock(path, timeout_seconds):
    before = lstat_owned(path, "file")
    if before is None:
        raise Rejection("REJECT_REPLAY_COMMIT", "ledger lock disappeared before open")
    flags = os.O_RDWR | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(str(path), flags)
    after = os.fstat(descriptor)
    if (before.st_dev, before.st_ino, before.st_mode, before.st_uid) != (after.st_dev, after.st_ino, after.st_mode, after.st_uid):
        os.close(descriptor)
        raise Rejection("REJECT_REPLAY_COMMIT", "ledger lock identity drift")
    deadline = time.monotonic() + timeout_seconds
    while True:
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return descriptor
        except BlockingIOError:
            if time.monotonic() >= deadline:
                os.close(descriptor)
                raise Rejection("REJECT_REPLAY_COMMIT", "ledger lock timeout")
            time.sleep(0.05)


def append_ledger(paths, record):
    lock_fd = acquire_lock(paths["replay_lock"], 5)
    try:
        current = safe_read(paths["replay_ledger"], "REJECT_REPLAY_LEDGER")
        records, previous = parse_ledger(current)
        check_replay(records, record["run_id"], record["receipt_ids"], record["receipt_sha256"], record["streams"])
        record["previous_ledger_line_sha256"] = previous
        payload = canonical_bytes(record)
        before = lstat_owned(paths["replay_ledger"], "file")
        if before is None:
            raise Rejection("REJECT_REPLAY_COMMIT", "ledger disappeared before append")
        flags = os.O_WRONLY | os.O_APPEND | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(str(paths["replay_ledger"]), flags)
        try:
            after = os.fstat(descriptor)
            if (before.st_dev, before.st_ino, before.st_mode, before.st_uid) != (after.st_dev, after.st_ino, after.st_mode, after.st_uid):
                raise Rejection("REJECT_REPLAY_COMMIT", "ledger identity drift")
            written = os.write(descriptor, payload)
            if written != len(payload):
                raise Rejection("REJECT_REPLAY_COMMIT", "partial ledger append")
            os.fsync(descriptor)
        finally:
            os.close(descriptor)
        root_fd = os.open(str(paths["evidence_root"]), os.O_RDONLY)
        try:
            os.fsync(root_fd)
        finally:
            os.close(root_fd)
    except Rejection:
        raise
    except OSError as exc:
        raise Rejection("REJECT_REPLAY_COMMIT", "durable replay append failed: %s" % exc)
    finally:
        fcntl.flock(lock_fd, fcntl.LOCK_UN)
        os.close(lock_fd)


def install_result(path, payload):
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(str(path), flags, 0o600)
    raw = canonical_bytes(payload)
    try:
        if os.write(descriptor, raw) != len(raw):
            raise OSError(errno.EIO, "partial result write")
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    directory_fd = os.open(str(path.parent), os.O_RDONLY)
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)


def rejection_result(path, exc, count=0, envelope=None):
    try:
        if path and path.parent.exists() and not path.exists():
            install_result(path, {"schema_version": "1.0", "verdict": exc.verdict, "detail": exc.detail, "receipt_count": count, "envelope_sha256": envelope})
    except OSError:
        pass


def main():
    output = None
    count = 0
    envelope = None
    committed = False
    try:
        args = parse_cli()
        output = Path(args.output)
        paths = validate_paths(args)
        anchor = validate_trust(paths)
        authority, authority_raw = validate_authority(paths, anchor)
        now = dt.datetime.now(dt.timezone.utc)
        gate_ids = sorted({entry["gate_id"] for entry in anchor["expected_commands"]})
        if set(gate_ids) != set(anchor["gate_authentication"]["gate_scopes"]):
            raise Rejection("REJECT_TRUST_ANCHOR", "gate scope map differs from command map")
        gates = {gate_id: validate_gate(paths, anchor, authority, authority_raw, gate_id, args.expected_run_id, now) for gate_id in gate_ids}
        receipts, receipt_raw, streams = validate_receipts(paths, anchor, authority, authority_raw, gates, args.expected_run_id)
        count = len(receipts)
        envelope = sha256_bytes(b"".join(receipt_raw))
        ledger_raw = safe_read(paths["replay_ledger"], "REJECT_REPLAY_LEDGER")
        records, previous = parse_ledger(ledger_raw)
        receipt_ids = [item["receipt_id"] for item in receipts]
        receipt_hashes = [sha256_bytes(item) for item in receipt_raw]
        check_replay(records, args.expected_run_id, receipt_ids, receipt_hashes, streams)
        record = {"schema_version": "1.0", "previous_ledger_line_sha256": previous, "run_id": args.expected_run_id, "authority_receipt_sha256": sha256_bytes(authority_raw), "gate_receipt_sha256": sorted(sha256_bytes(raw) for raw in gates.values()), "envelope_sha256": envelope, "receipt_ids": receipt_ids, "receipt_sha256": receipt_hashes, "streams": streams, "accepted_at_utc": now.replace(microsecond=0).isoformat().replace("+00:00", "Z")}
        append_ledger(paths, record)
        committed = True
        try:
            install_result(output, {"schema_version": "1.0", "verdict": "ACCEPTED", "detail": "closed 45-command envelope accepted after durable replay commit", "receipt_count": count, "envelope_sha256": envelope})
        except OSError as exc:
            raise Rejection("EVIDENCE_INCOMPLETE", "ledger committed but result installation failed: %s" % exc)
        print("ACCEPTED: closed 45-command envelope accepted after durable replay commit")
        return 0
    except Rejection as exc:
        if not committed:
            rejection_result(output, exc, count, envelope)
        print("%s: %s" % (exc.verdict, exc.detail), file=sys.stderr)
        return 1
    except Exception as exc:
        failure = Rejection("EVIDENCE_INCOMPLETE", "unexpected validator failure: %s" % exc)
        if not committed:
            rejection_result(output, failure, count, envelope)
        print("%s: %s" % (failure.verdict, failure.detail), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
