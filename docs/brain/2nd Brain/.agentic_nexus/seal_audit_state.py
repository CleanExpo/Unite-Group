#!/usr/bin/env python3
"""Create a local audit integrity seal for Agentic Nexus.

Standard-library only. Computes SHA-256 checksums for key local control-plane
files, writes integrity/seal_manifest.json, and appends audit/seal_audit.jsonl.
Fails closed when core files are missing or unreadable. Missing non-core files are
reported as optional visibility risks.
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent
INTEGRITY_DIR = BASE_DIR / "integrity"
AUDIT_DIR = BASE_DIR / "audit"
MANIFEST_PATH = INTEGRITY_DIR / "seal_manifest.json"
SEAL_AUDIT_PATH = AUDIT_DIR / "seal_audit.jsonl"
ALGORITHM = "sha256"
GENERATED_BY = "seal_audit_state.py"

CORE_FILES = [
    "task_queue.jsonl",
    "approvals/approval_store.jsonl",
    "evidence/evidence_ledger.jsonl",
    "dashboard_status_feed.jsonl",
    "DASHBOARD_STATUS_SUMMARY.md",
]

AUDIT_FILES = [
    "audit/preflight_audit.jsonl",
    "audit/task_claim_audit.jsonl",
    "audit/task_completion_audit.jsonl",
    "audit/approval_resolution_audit.jsonl",
]

POLICY_RUNTIME_FILES = [
    "auth.md",
    "auth.schema.json",
    "agent_session.schema.json",
    "scope_policy.schema.json",
    "approval_gate.schema.json",
    "evidence_record.schema.json",
    "forbidden_actions.json",
    "agent_scope_matrix.json",
    "diagnostic_gate.schema.json",
    "validate_agent_session.py",
    "worker_preflight.py",
    "worker_claim_task.py",
    "worker_complete_task.py",
    "resolve_approval_request.py",
    "generate_dashboard_status_feed.py",
]

ALLOWED_SEAL_STATUSES = {
    "seal_created",
    "seal_created_with_missing_optional_files",
    "seal_failed_closed",
}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def safe_path(relative_path: str) -> Path:
    path = (BASE_DIR / relative_path).resolve()
    base = BASE_DIR.resolve()
    if path != base and base not in path.parents:
        raise ValueError(f"path escapes Agentic Nexus base: {relative_path}")
    return path


def line_count_for_bytes(data: bytes) -> int:
    if not data:
        return 0
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return 0
    return len(text.splitlines())


def checksum_file(path: Path) -> Tuple[str, int, int]:
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    return digest, len(data), line_count_for_bytes(data)


def file_record(relative_path: str, category: str, sealed_at: str) -> Tuple[Dict[str, Any] | None, str | None]:
    try:
        path = safe_path(relative_path)
    except Exception as exc:
        return None, f"{relative_path}: {exc}"
    if not path.exists():
        return {
            "path": relative_path,
            "category": category,
            "sha256": None,
            "size_bytes": None,
            "line_count": None,
            "exists": False,
            "sealed_at": sealed_at,
        }, None
    if not path.is_file():
        return None, f"{relative_path}: not a regular file"
    try:
        digest, size_bytes, line_count = checksum_file(path)
    except Exception as exc:
        return None, f"{relative_path}: cannot read file: {exc}"
    return {
        "path": relative_path,
        "category": category,
        "sha256": digest,
        "size_bytes": size_bytes,
        "line_count": line_count,
        "exists": True,
        "sealed_at": sealed_at,
    }, None


def append_seal_audit(record: Dict[str, Any]) -> None:
    AUDIT_DIR.mkdir(parents=True, exist_ok=True)
    with SEAL_AUDIT_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=False) + "\n")


def seal() -> Dict[str, Any]:
    generated_at = utc_now_iso()
    manifest_id = "ANX-SEAL-" + generated_at.replace(":", "").replace("-", "").replace("Z", "Z")
    sealed_files: List[Dict[str, Any]] = []
    missing_files: List[Dict[str, str]] = []
    read_errors: List[str] = []
    core_failures: List[str] = []

    categories = [
        ("core", CORE_FILES),
        ("audit", AUDIT_FILES),
        ("policy_runtime", POLICY_RUNTIME_FILES),
    ]

    for category, relative_paths in categories:
        for relative_path in relative_paths:
            record, error = file_record(relative_path, category, generated_at)
            if error:
                read_errors.append(error)
                if category == "core":
                    core_failures.append(error)
                continue
            if record is None:
                read_errors.append(f"{relative_path}: unknown seal error")
                if category == "core":
                    core_failures.append(f"{relative_path}: unknown seal error")
                continue
            if not record["exists"]:
                missing_files.append({"path": relative_path, "category": category})
                if category == "core":
                    core_failures.append(f"missing core file: {relative_path}")
                continue
            sealed_files.append(record)

    if core_failures:
        seal_status = "seal_failed_closed"
    elif missing_files or read_errors:
        seal_status = "seal_created_with_missing_optional_files"
    else:
        seal_status = "seal_created"

    if seal_status not in ALLOWED_SEAL_STATUSES:
        seal_status = "seal_failed_closed"
        core_failures.append("internal error: unexpected seal status")

    manifest = {
        "manifest_id": manifest_id,
        "generated_at": generated_at,
        "generated_by": GENERATED_BY,
        "base_path": str(BASE_DIR),
        "sealed_files": sealed_files,
        "missing_files": missing_files,
        "core_file_count": sum(1 for rec in sealed_files if rec["category"] == "core"),
        "audit_file_count": sum(1 for rec in sealed_files if rec["category"] == "audit"),
        "policy_runtime_file_count": sum(1 for rec in sealed_files if rec["category"] == "policy_runtime"),
        "total_file_count": len(sealed_files),
        "algorithm": ALGORITHM,
        "notes": [
            "Local Agentic Nexus control-plane seal only.",
            "No deployment, production action, database action, network call, email, publishing, GitHub action, or destructive action occurred.",
            "Core files fail closed if missing or unreadable; non-core missing files are reported for visibility.",
        ],
    }

    audit_record = {
        "timestamp": generated_at,
        "manifest_id": manifest_id,
        "generated_by": GENERATED_BY,
        "total_file_count": len(sealed_files),
        "missing_files": missing_files,
        "seal_status": seal_status,
        "manifest_path": str(MANIFEST_PATH),
        "notes": manifest["notes"] + read_errors + core_failures,
    }

    if seal_status != "seal_failed_closed":
        INTEGRITY_DIR.mkdir(parents=True, exist_ok=True)
        MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    append_seal_audit(audit_record)

    return {
        "seal_status": seal_status,
        "manifest_id": manifest_id,
        "generated_at": generated_at,
        "manifest_path": str(MANIFEST_PATH),
        "seal_audit_path": str(SEAL_AUDIT_PATH),
        "core_file_count": manifest["core_file_count"],
        "audit_file_count": manifest["audit_file_count"],
        "policy_runtime_file_count": manifest["policy_runtime_file_count"],
        "total_file_count": manifest["total_file_count"],
        "missing_files": missing_files,
        "read_errors": read_errors,
        "risks": core_failures + (["missing or unreadable optional files reported"] if (missing_files or read_errors) and not core_failures else []),
        "next_action": "run python3 verify_audit_state.py immediately to confirm the sealed state" if seal_status != "seal_failed_closed" else "repair missing/unreadable core files before trusting the control plane",
    }


def main(argv: List[str]) -> int:
    result = seal()
    print(json.dumps(result, indent=2, sort_keys=False))
    return 1 if result.get("seal_status") == "seal_failed_closed" else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
