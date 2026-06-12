#!/usr/bin/env python3
"""Resolve local Agentic Nexus approval requests.

Standard-library only. An approval-required task may return from
blocked_human_approval_required to queued only when a valid approval object exists
in approvals/approval_store.jsonl.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = Path(__file__).resolve().parent
TASK_QUEUE_PATH = BASE_DIR / "task_queue.jsonl"
APPROVAL_STORE_PATH = BASE_DIR / "approvals" / "approval_store.jsonl"
APPROVAL_AUDIT_PATH = BASE_DIR / "audit" / "approval_resolution_audit.jsonl"

ALLOWED_HUMAN_APPROVERS = {"Phill McGurk"}
ALLOWED_APPROVAL_STATUSES = {"pending", "approved", "rejected", "expired", "invalid"}
RESULT_STATUSES = {
    "approval_resolved_task_requeued",
    "approval_rejected_task_remains_blocked",
    "approval_expired_task_remains_blocked",
    "approval_invalid_task_remains_blocked",
    "task_not_found",
    "approval_not_found",
    "task_not_approval_blocked",
    "approval_resolution_failed_closed",
}

STOPWORDS = {
    "the", "and", "or", "a", "an", "to", "of", "for", "after", "before", "local",
    "task", "request", "approval", "approve", "approved", "required", "with", "from",
    "is", "it", "this", "that", "only", "can", "run", "normal", "flow", "status",
}

REQUIRED_APPROVAL_FIELDS = [
    "approval_id",
    "task_id",
    "requested_by_agent",
    "requested_action",
    "affected_project",
    "affected_files",
    "affected_systems",
    "risk_level",
    "reason_for_request",
    "evidence_supplied",
    "approval_required_from",
    "approval_status",
    "approved_by",
    "rejected_by",
    "decision_timestamp",
    "decision_notes",
    "expiry",
    "audit_log_reference",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_dt(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def read_jsonl(path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    if not path.exists():
        return [], [f"missing file: {path}"]
    records: List[Dict[str, Any]] = []
    errors: List[str] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                obj = json.loads(stripped)
            except Exception as exc:
                errors.append(f"{path.name} parse error at line {line_no}: {exc}")
                continue
            if not isinstance(obj, dict):
                errors.append(f"{path.name} line {line_no} is not a JSON object")
                continue
            records.append(obj)
    return records, errors


def write_jsonl(path: Path, records: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, sort_keys=False) + "\n")
    tmp.replace(path)


def append_jsonl(path: Path, record: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=False) + "\n")


def normalize_tokens(text: str) -> set[str]:
    out = []
    current = []
    for ch in text.lower():
        if ch.isalnum() or ch in {"_", "-"}:
            current.append(ch)
        else:
            if current:
                out.append("".join(current))
                current = []
    if current:
        out.append("".join(current))
    return {tok for tok in out if len(tok) >= 4 and tok not in STOPWORDS}


def action_relates_to_task(task: Dict[str, Any], approval: Dict[str, Any]) -> Tuple[bool, str]:
    task_text = " ".join(str(task.get(k, "")) for k in [
        "task_id", "title", "project", "intent", "friction", "gap", "business_value", "next_action",
    ]) + " " + " ".join(str(x) for x in task.get("required_scopes", []))
    approval_text = " ".join(str(approval.get(k, "")) for k in [
        "task_id", "requested_action", "affected_project", "reason_for_request", "decision_notes",
    ]) + " " + " ".join(str(x) for x in approval.get("affected_systems", []))
    if str(task.get("task_id")) in approval_text:
        return True, "approval requested action explicitly references task_id"
    task_tokens = normalize_tokens(task_text)
    approval_tokens = normalize_tokens(approval_text)
    overlap = sorted(task_tokens & approval_tokens)
    if len(overlap) >= 3:
        return True, f"approval action relates to task by token overlap: {', '.join(overlap[:8])}"
    return False, "approval requested action does not clearly relate to blocked task"


def evidence_documented(approval: Dict[str, Any]) -> Tuple[bool, str]:
    evidence = approval.get("evidence_supplied")
    if not isinstance(evidence, list) or not evidence:
        return False, "evidence_supplied is missing or empty"
    clean = [str(item).strip() for item in evidence if str(item).strip()]
    if not clean:
        return False, "evidence_supplied contains no non-empty entries"
    return True, "evidence supplied or explicitly documented"


def validate_approval_object(task: Dict[str, Any], approval: Dict[str, Any]) -> Tuple[str, bool, List[str], str]:
    reasons: List[str] = []
    missing = [field for field in REQUIRED_APPROVAL_FIELDS if field not in approval]
    if missing:
        reasons.append("missing approval fields: " + ", ".join(missing))
        return "approval_invalid_task_remains_blocked", False, reasons, "repair approval object before resolving"

    approval_status = approval.get("approval_status")
    if approval_status not in ALLOWED_APPROVAL_STATUSES:
        reasons.append(f"approval_status is not allowed: {approval_status}")
        return "approval_invalid_task_remains_blocked", False, reasons, "use pending, approved, rejected, expired, or invalid approval_status"

    if approval.get("task_id") != task.get("task_id"):
        reasons.append(f"approval task_id mismatch: approval links to {approval.get('task_id')}, task is {task.get('task_id')}")
        return "approval_invalid_task_remains_blocked", False, reasons, "use an approval object linked to the requested task"

    if approval.get("requested_by_agent") != task.get("assigned_agent_id"):
        reasons.append(f"requested_by_agent mismatch: approval has {approval.get('requested_by_agent')}, task assigned_agent_id is {task.get('assigned_agent_id')}")
        return "approval_invalid_task_remains_blocked", False, reasons, "use an approval requested by the blocked task agent"

    if approval.get("affected_project") != task.get("project"):
        reasons.append(f"affected_project mismatch: approval has {approval.get('affected_project')}, task project is {task.get('project')}")
        return "approval_invalid_task_remains_blocked", False, reasons, "use an approval for the affected task project"

    related, related_reason = action_relates_to_task(task, approval)
    if not related:
        reasons.append(related_reason)
        return "approval_invalid_task_remains_blocked", False, reasons, "use an approval whose requested_action clearly relates to the blocked task"
    reasons.append(related_reason)

    evidence_ok, evidence_reason = evidence_documented(approval)
    if not evidence_ok:
        reasons.append(evidence_reason)
        return "approval_invalid_task_remains_blocked", False, reasons, "supply evidence or explicitly document why evidence is not applicable"
    reasons.append(evidence_reason)

    expiry = parse_dt(approval.get("expiry"))
    now = datetime.now(timezone.utc)
    if expiry is None:
        reasons.append("expiry is missing or malformed")
        return "approval_invalid_task_remains_blocked", False, reasons, "repair approval expiry before resolving"
    if expiry <= now:
        reasons.append(f"approval expired at {approval.get('expiry')}")
        return "approval_expired_task_remains_blocked", False, reasons, "request a fresh human approval object"

    if approval_status == "rejected":
        reasons.append(f"approval rejected by {approval.get('rejected_by')}")
        return "approval_rejected_task_remains_blocked", False, reasons, "keep task blocked or create a new approved approval object"
    if approval_status == "expired":
        reasons.append("approval_status is expired")
        return "approval_expired_task_remains_blocked", False, reasons, "request a fresh human approval object"
    if approval_status in {"pending", "invalid"}:
        reasons.append(f"approval_status is not approved: {approval_status}")
        return "approval_invalid_task_remains_blocked", False, reasons, "wait for valid human approval before requeueing task"

    approved_by = approval.get("approved_by")
    if approved_by not in ALLOWED_HUMAN_APPROVERS:
        reasons.append(f"approved_by is not an allowed human owner: {approved_by}")
        return "approval_invalid_task_remains_blocked", False, reasons, "approval must be approved by Phill McGurk"
    if "Phill McGurk" not in approval.get("approval_required_from", []):
        reasons.append("approval_required_from does not include Phill McGurk")
        return "approval_invalid_task_remains_blocked", False, reasons, "approval_required_from must include Phill McGurk"

    reasons.append("valid approval object approved by Phill McGurk and not expired")
    return "approval_resolved_task_requeued", True, reasons, "task returned to queued; rerun worker_claim_task.py so normal preflight validation controls execution"


def emit_result(
    resolution_status: str,
    task_id: str,
    approval_id: str,
    task_status_before: Optional[str],
    task_status_after: Optional[str],
    approval_status: Optional[str],
    approved_by: Optional[str],
    rejected_by: Optional[str],
    can_return_to_queue: bool,
    reasons: List[str],
    next_action: str,
) -> Dict[str, Any]:
    if resolution_status not in RESULT_STATUSES:
        resolution_status = "approval_resolution_failed_closed"
    record = {
        "timestamp": utc_now_iso(),
        "task_id": task_id,
        "approval_id": approval_id,
        "task_status_before": task_status_before,
        "task_status_after": task_status_after,
        "approval_status": approval_status,
        "approved_by": approved_by,
        "rejected_by": rejected_by,
        "can_return_to_queue": can_return_to_queue,
        "resolution_status": resolution_status,
        "reasons": reasons,
        "next_action": next_action,
    }
    try:
        append_jsonl(APPROVAL_AUDIT_PATH, record)
        audit_path = str(APPROVAL_AUDIT_PATH)
    except Exception as exc:
        audit_path = str(APPROVAL_AUDIT_PATH)
        resolution_status = "approval_resolution_failed_closed"
        can_return_to_queue = False
        reasons = reasons + [f"failed to append approval audit: {exc}"]
        next_action = "repair approval audit path before retrying approval resolution"
    return {
        "resolution_status": resolution_status,
        "task_id": task_id,
        "approval_id": approval_id,
        "task_status_before": task_status_before,
        "task_status_after": task_status_after,
        "approval_status": approval_status,
        "approved_by": approved_by,
        "can_return_to_queue": can_return_to_queue,
        "audit_record_path": audit_path,
        "reasons": reasons,
        "next_action": next_action,
    }


def resolve(task_id: str, approval_id: str) -> Dict[str, Any]:
    tasks, task_errors = read_jsonl(TASK_QUEUE_PATH)
    if task_errors:
        return emit_result("approval_resolution_failed_closed", task_id, approval_id, None, None, None, None, None, False, task_errors, "repair task_queue.jsonl before resolving approvals")
    approvals, approval_errors = read_jsonl(APPROVAL_STORE_PATH)
    if approval_errors:
        return emit_result("approval_resolution_failed_closed", task_id, approval_id, None, None, None, None, None, False, approval_errors, "repair approval_store.jsonl before resolving approvals")

    task_index = next((idx for idx, task in enumerate(tasks) if task.get("task_id") == task_id), None)
    if task_index is None:
        return emit_result("task_not_found", task_id, approval_id, None, None, None, None, None, False, ["task not found"], "create or select an existing approval-blocked task")
    task = tasks[task_index]
    task_status_before = task.get("status")

    approval = next((item for item in approvals if item.get("approval_id") == approval_id), None)
    if approval is None:
        return emit_result("approval_not_found", task_id, approval_id, task_status_before, task_status_before, None, None, None, False, ["approval not found"], "create or select an approval object linked to the task")

    if task_status_before != "blocked_human_approval_required":
        return emit_result("task_not_approval_blocked", task_id, approval_id, task_status_before, task_status_before, approval.get("approval_status"), approval.get("approved_by"), approval.get("rejected_by"), False, [f"task is not blocked_human_approval_required; current status is {task_status_before}"], "do not resolve approval; only approval-blocked tasks can be returned to queued")

    status, can_return, reasons, next_action = validate_approval_object(task, approval)
    if not can_return:
        return emit_result(status, task_id, approval_id, task_status_before, task_status_before, approval.get("approval_status"), approval.get("approved_by"), approval.get("rejected_by"), False, reasons, next_action)

    updated = dict(task)
    updated["status"] = "queued"
    updated["assigned_worker_id"] = None
    updated["updated_at"] = utc_now_iso()
    updated["next_action"] = "Approval resolved; rerun worker_claim_task.py so normal preflight validation controls execution."
    tasks[task_index] = updated
    try:
        write_jsonl(TASK_QUEUE_PATH, tasks)
    except Exception as exc:
        return emit_result("approval_resolution_failed_closed", task_id, approval_id, task_status_before, task_status_before, approval.get("approval_status"), approval.get("approved_by"), approval.get("rejected_by"), False, reasons + [f"failed to update task queue: {exc}"], "repair task queue write path before retrying approval resolution")

    return emit_result("approval_resolved_task_requeued", task_id, approval_id, task_status_before, "queued", approval.get("approval_status"), approval.get("approved_by"), approval.get("rejected_by"), True, reasons, next_action)


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Resolve a local Agentic Nexus approval request")
    parser.add_argument("--task-id", required=True)
    parser.add_argument("--approval-id", required=True)
    return parser.parse_args(argv)


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    result = resolve(args.task_id, args.approval_id)
    print(json.dumps(result, indent=2, sort_keys=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
