"""Minion Task-call budget — Claude Code PreToolUse hook.

The Minion blueprint remains deliberately bounded so one failing tactic cannot
loop forever. Hitting the Minion budget is a *technical reroute signal*, not a
founder escalation. The hook blocks the over-budget Task call, marks the current
Minion inactive, preserves an escalation packet in minion-state.json, and lets
the outer Orchestrator/SPM choose a different technical strategy afterwards.

Current Claude Code supports PreToolUse denial through either exit code 2 or the
structured hookSpecificOutput.permissionDecision schema. This hook uses exit 2
with stderr feedback because it is deterministic and fail-closed.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

MAX_TOTAL = 3


def state_path() -> Path:
    project_dir = Path(os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())).resolve()
    return project_dir / ".claude" / "data" / "minion-state.json"


def read_state(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return value if isinstance(value, dict) else None


def write_state(path: Path, state: dict[str, Any]) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    except OSError:
        # Do not convert an otherwise-safe in-budget call into a failure merely
        # because telemetry persistence failed.
        pass


def classify_node(prompt: str) -> str:
    p = prompt.lower()
    if "fix-lint" in p or ("fix" in p and "lint" in p):
        return "fix_lint"
    if "fix-ci" in p or ("fix" in p and ("test" in p or "build" in p or "ci" in p)):
        return "fix_ci"
    if "implement" in p and "fix" not in p:
        return "implement"
    if any(token in p for token in ("diagnose", "investigate", "review", "analyse", "analyze")):
        return "diagnose"
    return "other"


def block_for_reroute(path: Path, state: dict[str, Any], total: int, task_id: str) -> None:
    escalation = {
        "kind": "MINION_TECHNICAL_REROUTE",
        "task_id": task_id,
        "iteration": total,
        "max_iterations": MAX_TOTAL,
        "reason": "bounded Minion Task-call budget reached",
        "next_action": (
            "Return this evidence to the Orchestrator/SPM. Do not retry the same Minion. "
            "Choose a different technical strategy: fresh diagnostic pass, alternate model/specialist, "
            "fresh worktree/environment, CI/log/browser evidence, or architecture/database/security review."
        ),
        "founder_decision_required": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    state["active"] = False
    state["technical_reroute_required"] = True
    state["escalation"] = escalation
    write_state(path, state)

    print(
        "MINION_TECHNICAL_REROUTE\n"
        f"task_id: {task_id}\n"
        f"iteration: {total}/{MAX_TOTAL}\n"
        "reason: bounded Minion Task-call budget reached\n"
        "next_action: stop this Minion and return a technical escalation packet to Orchestrator/SPM; "
        "change technical strategy rather than retrying the same tactic\n"
        "founder_decision_required: false\n"
        "Do not escalate to Phill merely because this attempt budget was exhausted.",
        file=sys.stderr,
    )
    raise SystemExit(2)


def main() -> None:
    path = state_path()
    state = read_state(path)

    # No active Minion means this hook has no policy to apply.
    if not state or not state.get("active", False):
        raise SystemExit(0)

    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError) as exc:
        print(f"Minion Task hook blocked: invalid PreToolUse input: {exc}", file=sys.stderr)
        raise SystemExit(2)

    if hook_input.get("tool_name") != "Task":
        raise SystemExit(0)

    iterations = state.get("iterations")
    if not isinstance(iterations, dict):
        iterations = {}
        state["iterations"] = iterations

    raw_total = iterations.get("total", 0)
    total = raw_total if isinstance(raw_total, int) and raw_total >= 0 else 0
    task_id = str(state.get("task_id") or "unknown")

    if total >= MAX_TOTAL:
        block_for_reroute(path, state, total, task_id)

    tool_input = hook_input.get("tool_input")
    prompt = str(tool_input.get("prompt", "")) if isinstance(tool_input, dict) else ""
    node_type = classify_node(prompt)

    iterations["total"] = total + 1
    iterations[node_type] = int(iterations.get(node_type, 0) or 0) + 1
    state["last_node_type"] = node_type
    state["last_task_call_at"] = datetime.now(timezone.utc).isoformat()
    write_state(path, state)
    raise SystemExit(0)


if __name__ == "__main__":
    main()
