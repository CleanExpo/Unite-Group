"""UNI-2643 mutation controls.

Each of the five bad outcomes a failed push used to produce is killed by its
own assertion. A paired mutation test then restores that one bad outcome and
proves the assertion goes red — a test never seen red is not evidence.

The legacy tail copies Pi-Dev-Ops `run_build` on main: it ignores `push_ok`
for status, marker, and Linear, so the contract test is shown failing against
the unfixed code.

Run: python3 -m unittest discover -s tests -v
     (from tools/complete-requires-push)
"""

from __future__ import annotations

import os
import sys
import unittest
from types import SimpleNamespace

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
sys.path.insert(0, PKG)

from complete_requires_push import (  # noqa: E402
    IN_REVIEW,
    PUSH_FAILED_REASON,
    SESSION_COMPLETE_MARKER,
    PostPushEffects,
    decide_post_push,
    finish_after_push,
    mark_complete,
    mark_terminal,
)


def _session(linear_issue_id="iss-1"):
    return SimpleNamespace(
        id="sess-test",
        status="building",
        error=None,
        last_completed_phase="adversary",
        linear_issue_id=linear_issue_id,
        started_at=1_000.0,
        completed_at=None,
        output_lines=[],
    )


class _Hooks:
    def __init__(self):
        self.emitted = []
        self.persisted = []
        self.gate_rows = []
        self.linear_calls = []
        self.sync_calls = []
        self.outcomes = []

    def emit(self, session, kind, text):
        self.emitted.append({"type": kind, "text": text})
        session.output_lines.append({"type": kind, "text": text})

    def persist(self, session):
        self.persisted.append(session.status)

    def log_ship_gate(self, session, shipped, push_ts):
        self.gate_rows.append(
            {"session_id": session.id, "shipped": shipped, "push_ts": push_ts}
        )

    def update_linear_state(self, issue_id, state):
        self.linear_calls.append((issue_id, state))

    def sync_linear_on_completion(self, session):
        self.sync_calls.append(session.status)

    def record_outcome(self, session, push_ok, push_ts):
        self.outcomes.append(
            {"status": session.status, "push_ok": push_ok, "push_ts": push_ts}
        )

    def as_kwargs(self):
        return {
            "emit": self.emit,
            "persist": self.persist,
            "log_ship_gate": self.log_ship_gate,
            "update_linear_state": self.update_linear_state,
            "sync_linear_on_completion": self.sync_linear_on_completion,
            "record_outcome": self.record_outcome,
        }


def assert_push_failure_contract(session, hooks):
    """The five UNI-2643 outcomes. Each line is a mutation target."""
    if session.status == "complete":
        raise AssertionError("push failure persisted status=complete")
    if any(SESSION_COMPLETE_MARKER in row["text"] for row in hooks.emitted):
        raise AssertionError("push failure emitted the completion marker")
    if any(state == IN_REVIEW for _issue, state in hooks.linear_calls):
        raise AssertionError("push failure moved Linear to In Review")
    if not hooks.gate_rows or hooks.gate_rows[-1]["shipped"] is not False:
        raise AssertionError("push failure left gate row shipped!=false")
    if not session.error:
        raise AssertionError("push failure left no diagnosable reason on the session")


def legacy_finish_after_push(session, push_ok, push_ts, **hooks):
    """Unfixed `run_build` tail — `push_ok` is not consulted for terminal state.

    Mirrors Pi-Dev-Ops `app/server/session_phases.py` `run_build` after
    `_phase_push` on main: mark_complete + SESSION COMPLETE + In Review
    always fire. Gate-row shipped still follows `push_ok` (the one check
    that already existed).
    """
    session.last_completed_phase = "push"
    mark_complete(session)
    hooks["persist"](session)
    hooks["log_ship_gate"](session, push_ok, push_ts)
    issue_id = getattr(session, "linear_issue_id", None)
    if issue_id:
        hooks["emit"](session, "system", f"  Updating Linear issue {issue_id} → {IN_REVIEW}")
        hooks["update_linear_state"](issue_id, IN_REVIEW)
    hooks["emit"](session, "success", f"  {SESSION_COMPLETE_MARKER}")
    hooks["sync_linear_on_completion"](session)
    hooks["record_outcome"](session, push_ok, push_ts)


def _finish_from_effects(session, effects, hooks, push_ts=1.0):
    """Apply a (possibly mutated) effects object through the same side-effects."""
    session.last_completed_phase = "push"
    session.error = effects.reason
    if effects.status == "complete":
        mark_complete(session)
    else:
        mark_terminal(session, effects.status)
    hooks.persist(session)
    hooks.log_ship_gate(session, effects.shipped, push_ts)
    issue_id = getattr(session, "linear_issue_id", None)
    if effects.linear_state and issue_id:
        hooks.emit(session, "system", f"  Updating Linear issue {issue_id} → {effects.linear_state}")
        hooks.update_linear_state(issue_id, effects.linear_state)
    if effects.emit_completion_marker:
        hooks.emit(session, "success", f"  {SESSION_COMPLETE_MARKER}")
    hooks.sync_linear_on_completion(session)
    hooks.record_outcome(session, effects.shipped, push_ts)


class TestDecidePostPush(unittest.TestCase):
    def test_push_ok_is_the_only_complete_path(self):
        ok = decide_post_push(True)
        self.assertEqual(ok.status, "complete")
        self.assertTrue(ok.emit_completion_marker)
        self.assertEqual(ok.linear_state, IN_REVIEW)
        self.assertTrue(ok.shipped)
        self.assertIsNone(ok.reason)

    def test_push_failure_is_not_complete(self):
        bad = decide_post_push(False)
        self.assertNotEqual(bad.status, "complete")
        self.assertFalse(bad.emit_completion_marker)
        self.assertIsNone(bad.linear_state)
        self.assertFalse(bad.shipped)
        self.assertEqual(bad.reason, PUSH_FAILED_REASON)


class TestFinishAfterPush(unittest.TestCase):
    def test_push_ok_still_completes(self):
        session = _session()
        hooks = _Hooks()
        finish_after_push(session, True, 9.0, **hooks.as_kwargs())
        self.assertEqual(session.status, "complete")
        self.assertTrue(any(SESSION_COMPLETE_MARKER in row["text"] for row in hooks.emitted))
        self.assertEqual(hooks.linear_calls, [("iss-1", IN_REVIEW)])
        self.assertTrue(hooks.gate_rows[-1]["shipped"])
        self.assertIsNone(session.error)
        self.assertEqual(hooks.persisted, ["complete"])

    def test_push_failure_leaves_the_five_outcomes(self):
        session = _session()
        hooks = _Hooks()
        finish_after_push(session, False, 9.0, **hooks.as_kwargs())
        assert_push_failure_contract(session, hooks)
        self.assertEqual(session.status, "failed")
        self.assertEqual(session.error, PUSH_FAILED_REASON)
        self.assertEqual(hooks.linear_calls, [])
        self.assertFalse(hooks.gate_rows[-1]["shipped"])
        self.assertIn(session.status, hooks.sync_calls)
        self.assertEqual(hooks.outcomes[-1]["push_ok"], False)

    def test_push_failure_without_linear_issue_still_fails_closed(self):
        session = _session(linear_issue_id=None)
        hooks = _Hooks()
        finish_after_push(session, False, 9.0, **hooks.as_kwargs())
        assert_push_failure_contract(session, hooks)
        self.assertEqual(hooks.linear_calls, [])


class TestLegacyTailIsTheDefect(unittest.TestCase):
    def test_unfixed_run_build_tail_fails_the_contract(self):
        """Keeper-gate: the contract is shown red against the unfixed tail."""
        session = _session()
        hooks = _Hooks()
        legacy_finish_after_push(session, False, 9.0, **hooks.as_kwargs())
        with self.assertRaises(AssertionError) as caught:
            assert_push_failure_contract(session, hooks)
        self.assertIn("status=complete", str(caught.exception))
        self.assertEqual(session.status, "complete")
        self.assertTrue(any(SESSION_COMPLETE_MARKER in row["text"] for row in hooks.emitted))
        self.assertEqual(hooks.linear_calls, [("iss-1", IN_REVIEW)])
        # The one check the unfixed tail already got right:
        self.assertFalse(hooks.gate_rows[-1]["shipped"])


class TestMutationControls(unittest.TestCase):
    """Flip exactly one of the five outcomes back to the bad value."""

    def _correct(self) -> PostPushEffects:
        return decide_post_push(False)

    def _run(self, effects: PostPushEffects):
        session = _session()
        hooks = _Hooks()
        _finish_from_effects(session, effects, hooks)
        return session, hooks

    def test_mutation_status_complete_is_caught(self):
        effects = PostPushEffects(
            status="complete",
            emit_completion_marker=self._correct().emit_completion_marker,
            linear_state=self._correct().linear_state,
            shipped=self._correct().shipped,
            reason=self._correct().reason,
        )
        session, hooks = self._run(effects)
        with self.assertRaises(AssertionError) as caught:
            assert_push_failure_contract(session, hooks)
        self.assertIn("status=complete", str(caught.exception))

    def test_mutation_completion_marker_is_caught(self):
        effects = PostPushEffects(
            status=self._correct().status,
            emit_completion_marker=True,
            linear_state=self._correct().linear_state,
            shipped=self._correct().shipped,
            reason=self._correct().reason,
        )
        session, hooks = self._run(effects)
        with self.assertRaises(AssertionError) as caught:
            assert_push_failure_contract(session, hooks)
        self.assertIn("completion marker", str(caught.exception))

    def test_mutation_linear_in_review_is_caught(self):
        effects = PostPushEffects(
            status=self._correct().status,
            emit_completion_marker=self._correct().emit_completion_marker,
            linear_state=IN_REVIEW,
            shipped=self._correct().shipped,
            reason=self._correct().reason,
        )
        session, hooks = self._run(effects)
        with self.assertRaises(AssertionError) as caught:
            assert_push_failure_contract(session, hooks)
        self.assertIn("In Review", str(caught.exception))

    def test_mutation_shipped_true_is_caught(self):
        effects = PostPushEffects(
            status=self._correct().status,
            emit_completion_marker=self._correct().emit_completion_marker,
            linear_state=self._correct().linear_state,
            shipped=True,
            reason=self._correct().reason,
        )
        session, hooks = self._run(effects)
        with self.assertRaises(AssertionError) as caught:
            assert_push_failure_contract(session, hooks)
        self.assertIn("shipped", str(caught.exception))

    def test_mutation_missing_reason_is_caught(self):
        effects = PostPushEffects(
            status=self._correct().status,
            emit_completion_marker=self._correct().emit_completion_marker,
            linear_state=self._correct().linear_state,
            shipped=self._correct().shipped,
            reason=None,
        )
        session, hooks = self._run(effects)
        with self.assertRaises(AssertionError) as caught:
            assert_push_failure_contract(session, hooks)
        self.assertIn("diagnosable reason", str(caught.exception))
