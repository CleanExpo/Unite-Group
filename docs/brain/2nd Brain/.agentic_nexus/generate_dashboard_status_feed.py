#!/usr/bin/env python3
"""Generate the local Agentic Nexus dashboard status feed.

Standard-library only. Reads task queue, evidence ledger, approval store, and
audit JSONL files, then writes one machine-readable JSONL feed record per task
plus a human-readable summary. Fails closed only when the core task queue is
missing or unparseable.
"""

from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent
TASK_QUEUE_PATH = BASE_DIR / "task_queue.jsonl"
EVIDENCE_LEDGER_PATH = BASE_DIR / "evidence" / "evidence_ledger.jsonl"
APPROVAL_STORE_PATH = BASE_DIR / "approvals" / "approval_store.jsonl"
PREFLIGHT_AUDIT_PATH = BASE_DIR / "audit" / "preflight_audit.jsonl"
CLAIM_AUDIT_PATH = BASE_DIR / "audit" / "task_claim_audit.jsonl"
COMPLETION_AUDIT_PATH = BASE_DIR / "audit" / "task_completion_audit.jsonl"
APPROVAL_AUDIT_PATH = BASE_DIR / "audit" / "approval_resolution_audit.jsonl"
WORKER_REGISTRY_PATH = BASE_DIR / "worker_registry.jsonl"
FEED_PATH = BASE_DIR / "dashboard_status_feed.jsonl"
SUMMARY_PATH = BASE_DIR / "DASHBOARD_STATUS_SUMMARY.md"

CORE_TASK_FIELDS = [
    "task_id", "title", "project", "status", "priority", "risk_level",
    "assigned_agent_id", "assigned_worker_id", "business_value", "friction",
    "gap", "next_action",
]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_jsonl(path: Path, required: bool = False) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    if not path.exists():
        if required:
            return [], [], [f"required input missing: {path}"]
        return [], [str(path)], []
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
                errors.append(f"{path.name} JSONL parse error at line {line_no}: {exc}")
                continue
            if not isinstance(obj, dict):
                errors.append(f"{path.name} line {line_no} is not a JSON object")
                continue
            records.append(obj)
    return records, [], errors


def latest_by_key(records: List[Dict[str, Any]], key: str) -> Dict[str, Dict[str, Any]]:
    latest: Dict[str, Dict[str, Any]] = {}
    for rec in records:
        value = rec.get(key)
        if not value:
            continue
        old = latest.get(value)
        if old is None or str(rec.get("timestamp", "")) >= str(old.get("timestamp", "")):
            latest[value] = rec
    return latest


WORKER_STATUS_BUCKETS = ("available", "busy", "offline", "paused", "needs_review")


# Inline role compatibility mirror, used for dashboard DISPLAY only.
# The authoritative source is worker_claim_task.py. We mirror the
# matrix here so the dashboard is self-contained and the
# worker_claim_task.py module is not imported at import time (which
# would slow dashboard generation and create a hidden coupling).
# If you change the matrix in worker_claim_task.py, mirror it here too.
DASHBOARD_ROLE_MATRIX: Dict[str, set[str]] = {
    "command_node": {
        "Hermes CEO Orchestrator",
        "Senior Project Manager Agent",
        "Dashboard Reporter Agent",
    },
    "build_worker": {
        "Principal Software Engineer Agent",
        "QA/Test Agent",
        "Documentation Agent",
        "Dashboard Reporter Agent",
    },
    "research_worker": {
        "Context Discovery Agent",
        "Purpose Mapping Agent",
        "Friction Mapping Agent",
        "Research Director Agent",
        "Evidence Validator Agent",
        "SEO/AEO/GEO Agent",
        "Marketing Strategy Agent",
        "Brand Authority Agent",
        "Business Operations Agent",
        "Finance Awareness Agent",
        "Legal/Compliance Awareness Agent",
        "Documentation Agent",
        "Dashboard Reporter Agent",
    },
}


def role_allows(machine_role: str, required_agent_type: str) -> bool:
    if not machine_role or not required_agent_type:
        return False
    allowed = DASHBOARD_ROLE_MATRIX.get(machine_role, set())
    return required_agent_type in allowed


def summarize_workers() -> Tuple[Dict[str, int], List[Dict[str, Any]], List[str], Dict[str, Dict[str, Any]]]:
    """Read worker_registry.jsonl and produce counts + per-worker list.

    Returns a tuple of (counts, worker_list, parse_errors, workers_by_id).
    workers_by_id is a quick lookup map keyed on worker_id for the
    per-task enrichment that follows.
    """
    counts: Dict[str, int] = {status: 0 for status in WORKER_STATUS_BUCKETS}
    counts["worker_count"] = 0
    workers: List[Dict[str, Any]] = []
    workers_by_id: Dict[str, Dict[str, Any]] = {}
    errors: List[str] = []
    if not WORKER_REGISTRY_PATH.exists():
        return counts, workers, errors, workers_by_id
    with WORKER_REGISTRY_PATH.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                obj = json.loads(stripped)
            except Exception as exc:
                errors.append(f"{WORKER_REGISTRY_PATH.name} JSONL parse error at line {line_no}: {exc}")
                continue
            if not isinstance(obj, dict):
                errors.append(f"{WORKER_REGISTRY_PATH.name} line {line_no} is not a JSON object")
                continue
            status = str(obj.get("status", ""))
            counts["worker_count"] += 1
            if status in counts:
                counts[status] += 1
            workers.append({
                "worker_id": obj.get("worker_id"),
                "worker_name": obj.get("worker_name"),
                "machine_role": obj.get("machine_role"),
                "status": obj.get("status"),
                "current_task_id": obj.get("current_task_id"),
                "last_heartbeat_at": obj.get("last_heartbeat_at"),
                "updated_at": obj.get("updated_at"),
            })
            wid = obj.get("worker_id")
            if wid:
                workers_by_id[wid] = obj
    return counts, workers, errors, workers_by_id


def task_missing_fields(task: Dict[str, Any]) -> List[str]:
    missing = []
    for field in CORE_TASK_FIELDS:
        if field not in task:
            missing.append(field)
        elif task[field] is None and field not in {"assigned_worker_id"}:
            missing.append(field)
        elif task[field] == "" and field not in {"assigned_worker_id"}:
            missing.append(field)
    return missing


def visibility_status_for(task: Dict[str, Any], evidence_count: int, approval_count: int) -> str:
    status = task.get("status")
    if status == "completed":
        return "complete_with_evidence" if evidence_count > 0 else "complete_missing_evidence_warning"
    if status == "claimed":
        return "in_progress_claimed"
    if status == "blocked_diagnostic_required":
        return "blocked_waiting_for_diagnostic"
    if status == "blocked_human_approval_required":
        return "blocked_waiting_for_human_approval" if approval_count == 0 else "blocked_has_unresolved_approval"
    if status == "blocked_denied":
        return "blocked_denied_refused"
    if status == "queued":
        return "queued_after_approval" if approval_count > 0 else "queued_waiting_for_claim"
    if status == "claim_pending":
        return "claim_pending"
    if status == "failed":
        return "failed_needs_review"
    return "unknown_fail_closed_review_required"


def recommended_action_for(task: Dict[str, Any], visibility_status: str) -> str:
    if visibility_status == "complete_with_evidence":
        return "include in dashboard feed and continue to next control-plane visibility step"
    if visibility_status == "complete_missing_evidence_warning":
        return "investigate completed task with missing evidence before trusting completion"
    if visibility_status == "in_progress_claimed":
        return "wait for worker completion evidence or run worker_complete_task.py when output evidence is ready"
    if visibility_status == "blocked_waiting_for_diagnostic":
        return "complete diagnostic gate before task can return to queue"
    if visibility_status in {"blocked_waiting_for_human_approval", "blocked_has_unresolved_approval"}:
        return "resolve a valid human approval object before returning task to queue"
    if visibility_status == "blocked_denied_refused":
        return "do not execute; rewrite as a safe diagnostic or approval-gated task"
    if visibility_status == "queued_after_approval":
        return "rerun worker_claim_task.py so normal preflight validation controls execution"
    return str(task.get("next_action") or "review task state before proceeding")


def build_summary_markdown(result: Dict[str, Any], feed_records: List[Dict[str, Any]]) -> str:
    lines = [
        "# Agentic Nexus Dashboard Status Summary", "",
        f"Generated at: {result['generated_at']}", "",
        "This is a local feed and human-readable summary, not a full UI dashboard yet.", "",
        "## Counts", "",
        f"- Task count: {result['task_count']}",
        f"- Completed tasks: {result['completed_count']}",
        f"- Claimed tasks: {result['claimed_count']}",
        f"- Blocked diagnostic-required tasks: {result['diagnostic_required_count']}",
        f"- Blocked human-approval-required tasks: {result['approval_required_count']}",
        f"- Blocked denied tasks: {result['denied_count']}",
        f"- Blocked total: {result['blocked_count']}",
        f"- Evidence count: {result['evidence_count']}",
        f"- Approval count: {result['approval_count']}",
        f"- Approved count: {result['approved_count']}",
        f"- Pending count: {result['pending_count']}",
        f"- Rejected count: {result['rejected_count']}",
        f"- Expired count: {result['expired_count']}",
        f"- Approval audit count: {result['approval_audit_count']}",
        f"- Tasks requeued after approval: {result['tasks_requeued_after_approval']}",
        f"- Preflight audit count: {result['preflight_audit_count']}",
        f"- Claim audit count: {result['claim_audit_count']}",
        f"- Completion audit count: {result['completion_audit_count']}",
        f"- Worker count: {result['worker_count']}",
        f"- Available workers: {result['worker_available_count']}",
        f"- Busy workers: {result['worker_busy_count']}",
        f"- Offline workers: {result['worker_offline_count']}",
        f"- Paused workers: {result['worker_paused_count']}",
        f"- Workers needing review: {result['worker_needs_review_count']}",
        "",
        "## Status counts", "",
    ]
    for status, count in sorted(result["status_counts"].items()):
        lines.append(f"- {status}: {count}")
    lines.extend(["", "## Worker counts", ""])
    for status, count in sorted(result["worker_status_counts"].items()):
        lines.append(f"- {status}: {count}")
    lines.extend(["", "## Worker visibility", ""])
    if result.get("workers"):
        for worker in result["workers"]:
            lines.extend([
                f"### {worker['worker_id']} — {worker['status']}", "",
                f"- Worker name: {worker['worker_name']}",
                f"- Machine role: {worker['machine_role']}",
                f"- Current task id: {worker['current_task_id']}",
                f"- Last heartbeat at: {worker['last_heartbeat_at']}",
                f"- Updated at: {worker['updated_at']}", "",
            ])
    else:
        lines.append("- No workers registered yet.")
    lines.extend(["", "## Approval visibility", ""])
    for status, count in sorted(result["approval_status_counts"].items()):
        lines.append(f"- {status}: {count}")
    lines.extend(["", "## Task visibility", ""])
    for rec in feed_records:
        lines.extend([
            f"### {rec['task_id']} — {rec['status']}", "",
            f"- Title: {rec['title']}",
            f"- Project: {rec['project']}",
            f"- Priority: {rec['priority']}",
            f"- Risk level: {rec['risk_level']}",
            f"- Assigned agent: {rec['assigned_agent_id']}",
            f"- Assigned worker: {rec['assigned_worker_id']}",
            f"- Assigned worker exists: {rec['assigned_worker_exists']}",
            f"- Assigned worker status: {rec['assigned_worker_status']}",
            f"- Assigned worker machine role: {rec['assigned_worker_machine_role']}",
            f"- Assigned worker role allowed for task: {rec['assigned_worker_role_allowed']}",
            f"- Evidence count: {rec['evidence_count']}",
            f"- Approval count: {rec['approval_count']}",
            f"- Latest approval status: {rec['latest_approval_status']}",
            f"- Latest approval resolution status: {rec['latest_approval_resolution_status']}",
            f"- Latest preflight status: {rec['latest_preflight_status']}",
            f"- Latest claim status: {rec['latest_claim_status']}",
            f"- Latest completion status: {rec['latest_completion_status']}",
            f"- Visibility status: {rec['visibility_status']}",
            f"- Recommended next action: {rec['recommended_next_action']}", "",
        ])
    lines.extend(["## Risks", ""])
    if result["risks"]:
        for risk in result["risks"]:
            lines.append(f"- {risk}")
    else:
        lines.append("- No immediate visibility-feed risks detected.")
    lines.extend(["", "## Missing inputs", ""])
    if result["missing_inputs"]:
        for missing in result["missing_inputs"]:
            lines.append(f"- {missing}")
    else:
        lines.append("- None.")
    lines.extend(["", "## Recommended next action", "", result["next_action"], ""])
    return "\n".join(lines)


def generate() -> Dict[str, Any]:
    generated_at = utc_now_iso()
    tasks, missing_task, task_errors = read_jsonl(TASK_QUEUE_PATH, required=True)
    if missing_task or task_errors:
        risks = missing_task + task_errors
        return {
            "generation_status": "dashboard_feed_failed_closed",
            "generated_at": generated_at,
            "feed_path": str(FEED_PATH),
            "summary_path": str(SUMMARY_PATH),
            "task_count": 0,
            "status_counts": {},
            "completed_count": 0,
            "blocked_count": 0,
            "approval_required_count": 0,
            "diagnostic_required_count": 0,
            "denied_count": 0,
            "claimed_count": 0,
            "evidence_count": 0,
            "approval_count": 0,
            "approved_count": 0,
            "pending_count": 0,
            "rejected_count": 0,
            "expired_count": 0,
            "approval_audit_count": 0,
            "tasks_requeued_after_approval": 0,
            "preflight_audit_count": 0,
            "claim_audit_count": 0,
            "completion_audit_count": 0,
            "worker_count": 0,
            "worker_available_count": 0,
            "worker_busy_count": 0,
            "worker_offline_count": 0,
            "worker_paused_count": 0,
            "worker_needs_review_count": 0,
            "worker_status_counts": {status: 0 for status in WORKER_STATUS_BUCKETS},
            "workers": [],
            "missing_inputs": missing_task,
            "risks": risks,
            "next_action": "repair task_queue.jsonl before generating visibility feed",
            "assigned_worker_exists": None,
            "assigned_worker_status": None,
            "assigned_worker_machine_role": None,
            "assigned_worker_role_allowed": None,
        }

    evidence_records, missing_evidence, evidence_errors = read_jsonl(EVIDENCE_LEDGER_PATH)
    approval_records, missing_approvals, approval_errors = read_jsonl(APPROVAL_STORE_PATH)
    preflight_records, missing_preflight, preflight_errors = read_jsonl(PREFLIGHT_AUDIT_PATH)
    claim_records, missing_claim, claim_errors = read_jsonl(CLAIM_AUDIT_PATH)
    completion_records, missing_completion, completion_errors = read_jsonl(COMPLETION_AUDIT_PATH)
    approval_audit_records, missing_approval_audit, approval_audit_errors = read_jsonl(APPROVAL_AUDIT_PATH)

    missing_inputs = missing_evidence + missing_approvals + missing_preflight + missing_claim + missing_completion + missing_approval_audit
    parse_warnings = evidence_errors + approval_errors + preflight_errors + claim_errors + completion_errors + approval_audit_errors

    evidence_by_task: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for rec in evidence_records:
        if rec.get("task_id"):
            evidence_by_task[str(rec["task_id"])].append(rec)
    approvals_by_task: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for rec in approval_records:
        if rec.get("task_id"):
            approvals_by_task[str(rec["task_id"])].append(rec)

    latest_claim = latest_by_key(claim_records, "task_id")
    latest_completion = latest_by_key(completion_records, "task_id")
    latest_approval_resolution = latest_by_key(approval_audit_records, "task_id")
    latest_preflight_by_session = latest_by_key(preflight_records, "session_file")

    feed_records: List[Dict[str, Any]] = []
    risks: List[str] = list(parse_warnings)
    status_counts = Counter(str(task.get("status")) for task in tasks)
    approval_status_counts = Counter(str(app.get("approval_status")) for app in approval_records)

    worker_counts, worker_list, worker_errors, workers_by_id = summarize_workers()
    for werr in worker_errors:
        risks.append(werr)

    for idx, task in enumerate(tasks, start=1):
        task_id = str(task.get("task_id", f"missing-task-id-{idx}"))
        missing_fields = task_missing_fields(task)
        if missing_fields:
            risks.append(f"task {task_id} missing required visibility fields: {', '.join(missing_fields)}")
        task_approvals = approvals_by_task.get(task_id, [])
        latest_approval = task_approvals[-1] if task_approvals else {}
        evidence_count = len(evidence_by_task.get(task_id, []))
        approval_count = len(task_approvals)
        preflight = latest_preflight_by_session.get(str(task.get("session_file", "")), {})
        claim = latest_claim.get(task_id, {})
        completion = latest_completion.get(task_id, {})
        approval_resolution = latest_approval_resolution.get(task_id, {})
        visibility_status = visibility_status_for(task, evidence_count, approval_count)
        recommended_next_action = recommended_action_for(task, visibility_status)
        if task.get("status") == "completed" and evidence_count == 0:
            risks.append(f"completed task has no evidence ledger record: {task_id}")
        if task.get("status") == "blocked_human_approval_required" and approval_count == 0:
            risks.append(f"approval object missing for blocked approval task: {task_id}")
        if task.get("status") == "blocked_human_approval_required":
            pending_or_invalid = [a.get("approval_status") for a in task_approvals if a.get("approval_status") in {"pending", "invalid", "rejected", "expired"}]
            if pending_or_invalid:
                risks.append(f"approval task has unresolved approval statuses {pending_or_invalid}: {task_id}")
        if task.get("status") == "blocked_denied":
            risks.append(f"denied task remains in queue for visibility/refusal record: {task_id}")
        # Assigned-worker visibility (read-only; does not affect the gate).
        aw_id = task.get("assigned_worker_id")
        aw_record = workers_by_id.get(aw_id) if aw_id else None
        aw_role = aw_record.get("machine_role") if aw_record else None
        aw_role_allowed_for_task = role_allows(aw_role, task.get("required_agent_type")) if aw_role else False
        feed_records.append({
            "record_id": f"ANX-DASHBOARD-{generated_at}-{task_id}",
            "generated_at": generated_at,
            "record_type": "task_status",
            "task_id": task_id,
            "project": task.get("project"),
            "title": task.get("title"),
            "status": task.get("status"),
            "priority": task.get("priority"),
            "risk_level": task.get("risk_level"),
            "assigned_agent_id": task.get("assigned_agent_id"),
            "assigned_worker_id": aw_id,
            "assigned_worker_exists": aw_record is not None,
            "assigned_worker_status": aw_record.get("status") if aw_record else None,
            "assigned_worker_machine_role": aw_role,
            "assigned_worker_role_allowed": aw_role_allowed_for_task,
            "business_value": task.get("business_value"),
            "friction": task.get("friction"),
            "gap": task.get("gap"),
            "evidence_count": evidence_count,
            "approval_count": approval_count,
            "latest_approval_status": latest_approval.get("approval_status"),
            "latest_approval_resolution_status": approval_resolution.get("resolution_status"),
            "latest_preflight_status": preflight.get("preflight_status"),
            "latest_claim_status": claim.get("claim_status"),
            "latest_completion_status": completion.get("completion_status"),
            "visibility_status": visibility_status,
            "recommended_next_action": recommended_next_action,
        })

    blocked_count = sum(status_counts.get(status, 0) for status in [
        "blocked_diagnostic_required", "blocked_human_approval_required", "blocked_denied",
    ])
    tasks_requeued_after_approval = sum(
        1 for rec in approval_audit_records if rec.get("resolution_status") == "approval_resolved_task_requeued"
    )

    result = {
        "generation_status": "dashboard_feed_generated",
        "generated_at": generated_at,
        "feed_path": str(FEED_PATH),
        "summary_path": str(SUMMARY_PATH),
        "task_count": len(tasks),
        "status_counts": dict(sorted(status_counts.items())),
        "completed_count": status_counts.get("completed", 0),
        "blocked_count": blocked_count,
        "approval_required_count": status_counts.get("blocked_human_approval_required", 0),
        "diagnostic_required_count": status_counts.get("blocked_diagnostic_required", 0),
        "denied_count": status_counts.get("blocked_denied", 0),
        "claimed_count": status_counts.get("claimed", 0),
        "evidence_count": len(evidence_records),
        "approval_count": len(approval_records),
        "approved_count": approval_status_counts.get("approved", 0),
        "pending_count": approval_status_counts.get("pending", 0),
        "rejected_count": approval_status_counts.get("rejected", 0),
        "expired_count": approval_status_counts.get("expired", 0),
        "approval_status_counts": dict(sorted(approval_status_counts.items())),
        "approval_audit_count": len(approval_audit_records),
        "tasks_requeued_after_approval": tasks_requeued_after_approval,
        "preflight_audit_count": len(preflight_records),
        "claim_audit_count": len(claim_records),
        "completion_audit_count": len(completion_records),
        "worker_count": worker_counts.get("worker_count", 0),
        "worker_available_count": worker_counts.get("available", 0),
        "worker_busy_count": worker_counts.get("busy", 0),
        "worker_offline_count": worker_counts.get("offline", 0),
        "worker_paused_count": worker_counts.get("paused", 0),
        "worker_needs_review_count": worker_counts.get("needs_review", 0),
        "worker_status_counts": {status: worker_counts.get(status, 0) for status in WORKER_STATUS_BUCKETS},
        "workers": worker_list,
        "missing_inputs": missing_inputs,
        "risks": risks,
        "next_action": (
            "update worker_claim_task.py so a worker can only claim a task if that worker exists in "
            "worker_registry.jsonl, is available, and its machine_role is allowed for the task type"
        ),
    }

    with FEED_PATH.open("w", encoding="utf-8") as handle:
        for rec in feed_records:
            handle.write(json.dumps(rec, sort_keys=False) + "\n")
    SUMMARY_PATH.write_text(build_summary_markdown(result, feed_records), encoding="utf-8")
    return result


def main(argv: List[str]) -> int:
    result = generate()
    print(json.dumps(result, indent=2, sort_keys=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
