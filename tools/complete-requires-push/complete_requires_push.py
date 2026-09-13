"""UNI-2643 — a session cannot be complete if its push failed.

Production defect (Pi-Dev-Ops `app/server/session_phases.py` `run_build`):
after `_phase_push` returns `(af, push_ok)`, the tail always called
`mark_complete`, always emitted `=== SESSION COMPLETE ===`, and always moved
Linear to In Review. `push_ok` was consulted only by the gate-row logger and
the outcome JSONL. A failed push therefore persisted as complete and emitted
the marker the stale-session reconciler trusts.

This module is the missing consultation. `run_build` must call
`finish_after_push` with the real `push_ok` instead of inlining that tail.

Stdlib only. No network. Arms nothing.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Callable, Optional

SESSION_COMPLETE_MARKER = "=== SESSION COMPLETE ==="
PUSH_FAILED_REASON = "push_failed"
IN_REVIEW = "In Review"


@dataclass(frozen=True)
class PostPushEffects:
    """The five outcomes UNI-2643 binds to `push_ok`."""

    status: str
    emit_completion_marker: bool
    linear_state: Optional[str]
    shipped: bool
    reason: Optional[str]


def decide_post_push(push_ok: bool) -> PostPushEffects:
    """Map a push result onto session, Linear, gate-row, and marker effects.

    `push_ok` is the only input. A True here is the only path that may
    claim complete / In Review / shipped / the completion marker.
    """
    if push_ok:
        return PostPushEffects(
            status="complete",
            emit_completion_marker=True,
            linear_state=IN_REVIEW,
            shipped=True,
            reason=None,
        )
    return PostPushEffects(
        status="failed",
        emit_completion_marker=False,
        linear_state=None,
        shipped=False,
        reason=PUSH_FAILED_REASON,
    )


def mark_terminal(session: Any, status: str) -> None:
    """Same contract as Pi-Dev-Ops `session_model.mark_terminal`."""
    session.status = status
    session.completed_at = time.time()


def mark_complete(session: Any) -> None:
    mark_terminal(session, "complete")


def finish_after_push(
    session: Any,
    push_ok: bool,
    push_ts: float,
    *,
    emit: Callable[[Any, str, str], None],
    persist: Callable[[Any], None],
    log_ship_gate: Callable[[Any, bool, float], None],
    update_linear_state: Callable[[str, str], None],
    sync_linear_on_completion: Callable[[Any], None],
    record_outcome: Callable[[Any, bool, float], None],
) -> PostPushEffects:
    """Apply the post-push terminal outcome. This is the `run_build` tail.

    Intended call site (Pi-Dev-Ops `run_build`, after `_phase_push`):

        effects = finish_after_push(
            session, push_ok, push_ts,
            emit=em, persist=persistence.save_session,
            log_ship_gate=_log_ship_gate_check,
            update_linear_state=_update_linear_state,
            sync_linear_on_completion=_sync_linear_on_completion,
            record_outcome=_record_session_outcome,
        )
    """
    effects = decide_post_push(push_ok)
    session.last_completed_phase = "push"
    session.error = effects.reason
    if effects.status == "complete":
        mark_complete(session)
    else:
        mark_terminal(session, effects.status)
    persist(session)

    log_ship_gate(session, effects.shipped, push_ts)

    issue_id = getattr(session, "linear_issue_id", None)
    if effects.linear_state and issue_id:
        emit(session, "system", f"  Updating Linear issue {issue_id} → {effects.linear_state}")
        update_linear_state(issue_id, effects.linear_state)

    if effects.emit_completion_marker:
        emit(session, "success", f"  {SESSION_COMPLETE_MARKER}")
    else:
        emit(
            session,
            "error",
            f"  Push failed — session not complete ({effects.reason})",
        )

    sync_linear_on_completion(session)
    record_outcome(session, effects.shipped, push_ts)
    return effects
