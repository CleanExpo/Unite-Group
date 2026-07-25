"""Tests for the Board release verifier (ADDENDUM-001 + m14a Codex repairs, rounds 1 and 2, schema v2).

Fixtures are loaded from the REAL repo files (roster / check-manifest / policy doc), never
hand-copied, so a drift between the test fixture and the canonical file cannot happen silently.

Run: python3 -m unittest discover -s tests -v
"""
import copy
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
REPO_ROOT = Path(PKG).parent.parent
sys.path.insert(0, PKG)

from verifier import verify, sha256_file, main  # noqa: E402

REPO = "CleanExpo/Unite-Group"
BASE = "main"
PR = 1234
HEAD = "abcdef0123456789abcdef0123456789abcdef01"
OTHER_HEAD = "1111111111111111111111111111111111111111"
NOW = dt.datetime(2026, 7, 24, 12, 0, 0, tzinfo=dt.timezone.utc)

BUILDER_EXEC_ID = "claude-worker-hermes-branch-1"
REVIEWER_EXEC_ID = "codex-review-runner-1"
CHECK_RUNNER_ID = "ci-runner-alpha"

POLICY_PATH = REPO_ROOT / "docs/constitution/ADDENDUM-001-board-release-authority-for-verified-prs-v1.0.md"
ROSTER_PATH = REPO_ROOT / "docs/constitution/board-release-roster.v1.json"
CHECK_MANIFEST_PATH = REPO_ROOT / "docs/constitution/board-release-required-checks.v1.json"
ACTIVATION_MANIFEST_PATH = REPO_ROOT / "docs/constitution/ug-autonomy-001-activation.v1.json"

EXPECTED_POLICY_PATH = "docs/constitution/ADDENDUM-001-board-release-authority-for-verified-prs-v1.0.md"
EXPECTED_POLICY_VERSION = "1.0"
EXPECTED_ROSTER_PATH = "docs/constitution/board-release-roster.v1.json"
EXPECTED_CHECK_MANIFEST_PATH = "docs/constitution/board-release-required-checks.v1.json"
EXPECTED_ACTIVATION_MANIFEST_PATH = "docs/constitution/ug-autonomy-001-activation.v1.json"
EXPECTED_EVIDENCE_INDEX_PATH = "ops/evidence/pr-1234-evidence-index.v1.json"
EVIDENCE_INDEX_SCHEMA = "nexus.board-release-evidence-index.v1"
EVIDENCE_RECORD_SCHEMA = "nexus.board-release-evidence-record.v1"

ROSTER = json.loads(ROSTER_PATH.read_text())
ROSTER_SHA = sha256_file(ROSTER_PATH)
CHECK_MANIFEST = json.loads(CHECK_MANIFEST_PATH.read_text())
CHECK_MANIFEST_SHA = sha256_file(CHECK_MANIFEST_PATH)
POLICY_SHA = sha256_file(POLICY_PATH)
ACTIVATION_MANIFEST = json.loads(ACTIVATION_MANIFEST_PATH.read_text())
ACTIVATION_MANIFEST_SHA = sha256_file(ACTIVATION_MANIFEST_PATH)

_ELIGIBLE_IDS = {m["id"] for m in ROSTER["eligible_members"]}
assert "codex-reviewer" in _ELIGIBLE_IDS, "canonical roster must include codex-reviewer"
assert "claude-builder" not in _ELIGIBLE_IDS, "canonical roster must exclude claude-builder"


def _dict_sha256(d):
    return hashlib.sha256(json.dumps(d, sort_keys=True).encode()).hexdigest()


def _ref(label):
    """Deterministic, readable-by-provenance 64-hex evidence reference for fixtures: every
    evidence reference/digest must be an exact 64-character lowercase hex string (finding 1), so
    fixtures hash a human-readable label rather than embedding one directly."""
    return hashlib.sha256(("evidence-ref:%s" % label).encode()).hexdigest()


def _collect_evidence_refs(receipt):
    """Every evidence reference this receipt makes, mapped to its reference site's exact contract
    (kind, event timestamp, check id), mirroring exactly the sites verify() resolves. Production
    evidence indexes are built by an independent ops/CI system, never derived from the receipt
    itself; this helper exists only so test fixtures stay internally consistent."""
    refs = {}

    def put(ref, kind, ts, check_id=None):
        if ref:
            meta = {"kind": kind, "timestamp": ts}
            if check_id is not None:
                meta["check_id"] = check_id
            refs[ref] = meta

    b = receipt.get("builder") or {}
    put(b.get("evidence_ref"), "builder", b.get("event_timestamp"))
    ir = receipt.get("independent_review") or {}
    put(ir.get("evidence_ref"), "independent_review", ir.get("event_timestamp"))
    for d in receipt.get("decisions") or []:
        if isinstance(d, dict):
            put(d.get("evidence_ref"), "decisions", d.get("event_timestamp"))
    for c in receipt.get("required_checks") or []:
        if isinstance(c, dict):
            put(c.get("evidence_digest"), "required_checks", c.get("timestamp"), c.get("id"))
    for rj in (receipt.get("rejection_ledger") or {}).get("items") or []:
        if isinstance(rj, dict):
            put(rj.get("repair_ref"), "rejection_ledger", rj.get("repair_event_timestamp"))
            put(rj.get("review_ref"), "rejection_ledger", rj.get("review_event_timestamp"))
    rollback = receipt.get("rollback") or {}
    if rollback.get("applicable"):
        put(rollback.get("evidence_ref"), "rollback", rollback.get("event_timestamp"))
    post_plan = receipt.get("post_deployment_verification_plan") or {}
    if post_plan.get("present"):
        put(post_plan.get("evidence_ref"), "post_deployment_verification_plan",
            post_plan.get("event_timestamp"))
    canary = (receipt.get("policy_activation") or {}).get("restart_canary_evidence") or {}
    put(canary.get("evidence_digest"), "policy_activation", canary.get("event_timestamp"))
    return refs


def make_evidence_index(refs, repo=REPO, pr=PR, head=HEAD, timestamp=None):
    """refs: dict ref->meta from _collect_evidence_refs (a bare iterable is also accepted and
    defaults every record to kind "builder"). An explicit ``timestamp`` overrides every record's
    timestamp (staleness tests); otherwise each record carries its reference site's own event
    timestamp."""
    default_ts = "2026-07-24T11:30:00+00:00"
    if not isinstance(refs, dict):
        refs = {ref: {"kind": "builder", "timestamp": timestamp or default_ts} for ref in refs}
    records = {}
    for ref, meta in refs.items():
        rec = {
            "schema": EVIDENCE_RECORD_SCHEMA,
            "version": "1.0",
            "digest": ref,
            "kind": meta.get("kind", "builder"),
            "repo": repo,
            "pr": pr,
            "head_sha": head,
            "verified": True,
            "timestamp": timestamp or meta.get("timestamp") or default_ts,
        }
        if meta.get("check_id") is not None:
            rec["check_id"] = meta["check_id"]
        records[ref] = rec
    return {
        "schema": EVIDENCE_INDEX_SCHEMA,
        "version": "1.0",
        "repo": repo,
        "pr": pr,
        "head_sha": head,
        "records": records,
    }


def _set_all_event_timestamps(receipt, ts):
    """Align every reference-site event timestamp (and check run timestamp) to ``ts`` so a test
    can move evidence in time without tripping the exact event-timestamp binding."""
    receipt["builder"]["event_timestamp"] = ts
    receipt["independent_review"]["event_timestamp"] = ts
    for d in receipt["decisions"]:
        d["event_timestamp"] = ts
    for c in receipt["required_checks"]:
        c["timestamp"] = ts


def _default_required_checks(changed_paths):
    entries = []
    for c in CHECK_MANIFEST["required_checks"]:
        path_prefix = c.get("path_prefix")
        applicable = path_prefix is None or any(p.startswith(path_prefix) for p in changed_paths)
        if not applicable:
            entries.append({
                "id": c["id"],
                "status": "not_applicable",
                "timestamp": "2026-07-24T11:00:00+00:00",
                "evidence_digest": hashlib.sha256(("na:%s" % c["id"]).encode()).hexdigest(),
            })
            continue
        entries.append({
            "id": c["id"],
            "status": "passed",
            "head_sha": HEAD,
            "command": list(c["command"]),
            "exit_code": 0,
            "timestamp": "2026-07-24T11:00:00+00:00",
            "runner_identity": CHECK_RUNNER_ID,
            "trust_domain": c["trust_domain"],
            "evidence_digest": hashlib.sha256(("evidence:%s" % c["id"]).encode()).hexdigest(),
            "rerun_outside_builder": True,
        })
    return entries


DEFAULT_CHANGED_PATHS = [
    "tools/board-release-verifier/verifier.py",
    "tools/board-release-verifier/tests/test_verifier.py",
]


def make_receipt(**overrides):
    receipt = {
        "schema": "nexus.board-release-receipt.v2",
        "receipt_id": "receipt-0001",
        "repo": REPO,
        "pr": PR,
        "base": "main",
        "head_sha": HEAD,
        "policy": {
            "path": EXPECTED_POLICY_PATH,
            "version": EXPECTED_POLICY_VERSION,
            "sha256": POLICY_SHA,
        },
        "roster": {
            "path": EXPECTED_ROSTER_PATH,
            "schema": "nexus.board-release-roster.v1",
            "version": ROSTER["version"],
            "sha256": ROSTER_SHA,
        },
        "check_manifest": {
            "path": EXPECTED_CHECK_MANIFEST_PATH,
            "schema": "nexus.board-release-required-checks.v1",
            "version": CHECK_MANIFEST["version"],
            "sha256": CHECK_MANIFEST_SHA,
        },
        "builder": {
            "tool": "claude-cli",
            "family": "anthropic",
            "head_sha": HEAD,
            "evidence_ref": _ref("builder-log-1"),
            "execution_identity": BUILDER_EXEC_ID,
            "event_timestamp": "2026-07-24T11:30:00+00:00",
        },
        "independent_review": {
            "tool": "codex-cli",
            "family": "openai",
            "head_sha": HEAD,
            "evidence_ref": _ref("codex-review-1"),
            "execution_identity": REVIEWER_EXEC_ID,
            "authored_candidate": False,
            "repaired_candidate": False,
            "event_timestamp": "2026-07-24T11:30:00+00:00",
        },
        "decisions": [
            {
                "member_id": "margot-chair",
                "vote": "APPROVE",
                "evidence_ref": _ref("hermes-log-1"),
                "event_timestamp": "2026-07-24T11:30:00+00:00",
                "head_sha": HEAD,
            },
            {
                "member_id": "empire-orchestrator",
                "vote": "APPROVE",
                "evidence_ref": _ref("hermes-log-2"),
                "event_timestamp": "2026-07-24T11:30:00+00:00",
                "head_sha": HEAD,
            },
            {
                "member_id": "codex-reviewer",
                "vote": "APPROVE",
                "evidence_ref": _ref("codex-vote-1"),
                "event_timestamp": "2026-07-24T11:30:00+00:00",
                "head_sha": HEAD,
                "model_family": "openai",
            },
        ],
        "required_checks": _default_required_checks(DEFAULT_CHANGED_PATHS),
        "rejection_ledger": {
            "ledger_complete": True,
            "items": [],
        },
        "direct_spend": False,
        "constitutional_change": False,
        "out_of_scope": False,
        "missing_privilege": False,
        "authority_conflict": False,
        "unapproved_infrastructure": False,
        "rollback": {
            "applicable": False,
            "reason": "documentation and tooling change; no deployable artifact",
        },
        "post_deployment_verification_plan": {"present": False},
        "policy_activation": {"reconciled": False},
        "changed_paths": list(DEFAULT_CHANGED_PATHS),
        "issued_at": "2026-07-24T10:00:00+00:00",
        "expires_at": "2026-07-24T18:00:00+00:00",
    }
    receipt.update(overrides)
    if "evidence_index" not in overrides:
        refs = _collect_evidence_refs(receipt)
        ei = make_evidence_index(refs)
        receipt["evidence_index"] = {
            "path": EXPECTED_EVIDENCE_INDEX_PATH,
            "schema": EVIDENCE_INDEX_SCHEMA,
            "version": ei["version"],
            "sha256": _dict_sha256(ei),
        }
    return receipt


def full_activation_overrides(head=HEAD):
    """Receipt overrides for a fully activation-qualified UG-AUTONOMY-001 candidate:
    tested rollback, present post-deployment plan, and a policy_activation block bound to the
    real activation manifest with exact-HEAD / digest / trust-domain restart-canary evidence."""
    return {
        "rollback": {"applicable": True, "tested": True, "evidence_ref": _ref("rollback-drill-ug-1"),
                     "event_timestamp": "2026-07-24T11:30:00+00:00"},
        "post_deployment_verification_plan": {"present": True, "evidence_ref": _ref("post-deploy-plan-ug-1"),
                                              "event_timestamp": "2026-07-24T11:30:00+00:00"},
        "policy_activation": {
            "reconciled": True,
            "manifest": {
                "path": EXPECTED_ACTIVATION_MANIFEST_PATH,
                "schema": "nexus.ug-autonomy-001-activation.v1",
                "version": ACTIVATION_MANIFEST["version"],
                "sha256": ACTIVATION_MANIFEST_SHA,
            },
            "restart_canary_evidence": {
                "head_sha": head,
                "evidence_digest": hashlib.sha256(b"canary:ug-1").hexdigest(),
                "trust_domain": ACTIVATION_MANIFEST["canary_trust_domain"],
                "event_timestamp": "2026-07-24T11:30:00+00:00",
            },
        },
    }


def run_verify(receipt, roster=ROSTER, check_manifest=CHECK_MANIFEST, sync_evidence_index=True, **kw):
    if sync_evidence_index and "evidence_index" not in kw and isinstance(receipt, dict):
        refs = _collect_evidence_refs(receipt)
        ei = make_evidence_index(refs)
        ei_sha = _dict_sha256(ei)
        receipt["evidence_index"] = {
            "path": EXPECTED_EVIDENCE_INDEX_PATH,
            "schema": EVIDENCE_INDEX_SCHEMA,
            "version": ei["version"],
            "sha256": ei_sha,
        }
        kw.setdefault("evidence_index", ei)
        kw.setdefault("evidence_index_sha256", ei_sha)
    params = dict(
        expected_repo=REPO,
        expected_base=BASE,
        expected_head_sha=HEAD,
        expected_pr=PR,
        expected_policy_path=EXPECTED_POLICY_PATH,
        expected_policy_version=EXPECTED_POLICY_VERSION,
        policy_sha256=POLICY_SHA,
        expected_roster_path=EXPECTED_ROSTER_PATH,
        roster_sha256=ROSTER_SHA,
        expected_check_manifest_path=EXPECTED_CHECK_MANIFEST_PATH,
        check_manifest_sha256=CHECK_MANIFEST_SHA,
        now=NOW,
        expected_changed_paths=None,
        expected_evidence_index_path=EXPECTED_EVIDENCE_INDEX_PATH,
        activation_manifest=ACTIVATION_MANIFEST,
        expected_activation_manifest_path=EXPECTED_ACTIVATION_MANIFEST_PATH,
        activation_manifest_sha256=ACTIVATION_MANIFEST_SHA,
    )
    params.update(kw)
    return verify(receipt, roster, check_manifest, **params)


class TestGreenPath(unittest.TestCase):
    def test_green_exact_head_is_candidate_and_board_ready(self):
        result = run_verify(make_receipt())
        self.assertTrue(result.candidate_verified, result.reasons)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertEqual(result.reasons, [])
        self.assertEqual(result.verdict(), "BOARD_RELEASE_READY")

    def test_green_path_merge_never_authorised_pre_activation(self):
        result = run_verify(make_receipt())
        self.assertTrue(result.candidate_verified)
        self.assertTrue(result.board_release_ready)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(result.merge_reasons)


class TestSchemaStrictness(unittest.TestCase):
    def test_wrong_schema_literal_fails(self):
        receipt = make_receipt(schema="nexus.board-release-receipt.v1")
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("schema must be exactly" in r for r in result.reasons), result.reasons)

    def test_missing_top_level_field_fails(self):
        receipt = make_receipt()
        del receipt["rollback"]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("missing required top-level field: 'rollback'" in r for r in result.reasons),
            result.reasons,
        )

    def test_unexpected_top_level_field_fails(self):
        receipt = make_receipt()
        receipt["extra_unexpected_field"] = "surprise"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("unexpected top-level field: 'extra_unexpected_field'" in r for r in result.reasons),
            result.reasons,
        )

    def test_missing_receipt_id_fails(self):
        receipt = make_receipt(receipt_id="")
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("receipt_id is missing" in r for r in result.reasons), result.reasons)


class TestPRSnapshotBinding(unittest.TestCase):
    def test_head_drift_fails(self):
        receipt = make_receipt(head_sha=OTHER_HEAD)
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("head drift" in r for r in result.reasons), result.reasons)

    def test_uppercase_head_sha_rejected(self):
        receipt = make_receipt(head_sha=HEAD.upper())
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("not an exact 40-character lowercase-hex SHA" in r for r in result.reasons),
            result.reasons,
        )

    def test_repo_mismatch_fails(self):
        receipt = make_receipt(repo="someone/else")
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("repo mismatch" in r for r in result.reasons), result.reasons)

    def test_base_not_main_fails(self):
        receipt = make_receipt(base="develop")
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("base must be exactly 'main'" in r for r in result.reasons))

    def test_pr_not_positive_int_fails(self):
        receipt = make_receipt(pr=-1)
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("pr is missing or not a positive integer" in r for r in result.reasons))


class TestPrIdentityBinding(unittest.TestCase):
    """Finding 3 (HIGH): receipt PR identity must be bound to the requested/live PR."""

    def test_pr_mismatch_with_same_repo_base_head_fails(self):
        receipt = make_receipt(pr=9999)
        result = run_verify(receipt, expected_pr=PR)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("pr mismatch" in r and "not bound to the requested/live PR" in r for r in result.reasons),
            result.reasons,
        )
        self.assertFalse(result.candidate_verified)


class TestLiveChangedPathsBinding(unittest.TestCase):
    """Finding 1 (CRITICAL): a receipt cannot hide docs/constitution/** by omitting it from its own
    changed_paths claim -- the live, independently observed PR file set is authoritative."""

    def test_hidden_constitutional_path_is_caught_by_live_changed_paths(self):
        receipt = make_receipt(
            changed_paths=["src/app.py"],
            required_checks=_default_required_checks(["src/app.py"]),
        )
        result = run_verify(receipt, expected_changed_paths=["src/app.py", "docs/constitution/amendment.md"])
        self.assertFalse(result.candidate_verified)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("do not match the independently observed live PR file set" in r for r in result.reasons),
            result.reasons,
        )

    def test_matching_live_changed_paths_passes(self):
        result = run_verify(make_receipt(), expected_changed_paths=DEFAULT_CHANGED_PATHS)
        self.assertTrue(result.board_release_ready, result.reasons)

    def test_missing_live_changed_paths_blocks_merge_only(self):
        receipt = make_receipt(**full_activation_overrides())
        result = run_verify(receipt, expected_changed_paths=None)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("changed-file set was not independently supplied" in r for r in result.merge_reasons),
            result.merge_reasons,
        )


class TestThreeStateModel(unittest.TestCase):
    def test_candidate_verified_does_not_imply_board_or_merge_authority(self):
        receipt = make_receipt(decisions=[])
        result = run_verify(receipt)
        self.assertTrue(result.candidate_verified, result.reasons)
        self.assertFalse(result.board_release_ready)
        self.assertFalse(result.merge_authorised)

    def test_board_release_ready_implies_candidate_verified(self):
        result = run_verify(make_receipt())
        if result.board_release_ready:
            self.assertTrue(result.candidate_verified)

    def test_merge_authorised_implies_board_release_ready(self):
        result = run_verify(make_receipt())
        if result.merge_authorised:
            self.assertTrue(result.board_release_ready)

    def test_candidate_defect_also_blocks_board_release_ready(self):
        receipt = make_receipt()
        del receipt["builder"]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertFalse(result.board_release_ready)


class TestPolicyRosterManifestBinding(unittest.TestCase):
    def test_policy_path_mismatch_fails(self):
        receipt = make_receipt()
        receipt["policy"]["path"] = "docs/constitution/WRONG.md"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("policy.path mismatch" in r for r in result.reasons), result.reasons)

    def test_policy_version_mismatch_fails(self):
        receipt = make_receipt()
        receipt["policy"]["version"] = "9.9"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("policy.version mismatch" in r for r in result.reasons), result.reasons)

    def test_policy_hash_drift_fails(self):
        receipt = make_receipt()
        receipt["policy"]["sha256"] = "0" * 64
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("policy hash drift" in r for r in result.reasons), result.reasons)

    def test_roster_path_mismatch_fails(self):
        receipt = make_receipt()
        receipt["roster"]["path"] = "docs/constitution/WRONG.json"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("roster.path mismatch" in r for r in result.reasons), result.reasons)

    def test_roster_schema_mismatch_fails(self):
        receipt = make_receipt()
        receipt["roster"]["schema"] = "nexus.board-release-roster.v9"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("roster.schema must be" in r for r in result.reasons), result.reasons)

    def test_roster_version_mismatch_fails(self):
        receipt = make_receipt()
        receipt["roster"]["version"] = "9.9"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("roster.version mismatch" in r for r in result.reasons), result.reasons)

    def test_roster_hash_drift_fails(self):
        receipt = make_receipt()
        receipt["roster"]["sha256"] = "1" * 64
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("roster hash drift" in r for r in result.reasons), result.reasons)

    def test_check_manifest_path_mismatch_fails(self):
        receipt = make_receipt()
        receipt["check_manifest"]["path"] = "docs/constitution/WRONG.json"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("check_manifest.path mismatch" in r for r in result.reasons), result.reasons)

    def test_check_manifest_schema_mismatch_fails(self):
        receipt = make_receipt()
        receipt["check_manifest"]["schema"] = "nexus.board-release-required-checks.v9"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("check_manifest.schema must be" in r for r in result.reasons), result.reasons)

    def test_check_manifest_version_mismatch_fails(self):
        receipt = make_receipt()
        receipt["check_manifest"]["version"] = "9.9"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("check_manifest.version mismatch" in r for r in result.reasons), result.reasons)

    def test_check_manifest_hash_drift_fails(self):
        receipt = make_receipt()
        receipt["check_manifest"]["sha256"] = "0" * 64
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("check_manifest hash drift" in r for r in result.reasons), result.reasons)


class TestLiveTrustDocumentSchemaVersionAdmission(unittest.TestCase):
    """The LIVE roster / required-check manifest / UG-AUTONOMY-001 activation manifest documents
    must themselves be pinned to the exact supported schema/version before their content is ever
    trusted -- independently of whatever the receipt's own metadata claims. Each "wrong" case
    mutates the live document only and keeps the receipt's own block internally consistent (correct
    schema; version/hash tracking the mutated live document) so ONLY the live-document admission
    rule is exercised, never an unrelated receipt-vs-constant or hash-drift rule."""

    def test_roster_wrong_live_schema_rejected(self):
        bad_roster = dict(ROSTER, schema="nexus.board-release-roster.v9")
        bad_sha = _dict_sha256(bad_roster)
        receipt = make_receipt()
        receipt["roster"]["sha256"] = bad_sha
        result = run_verify(receipt, roster=bad_roster, roster_sha256=bad_sha)
        self.assertFalse(result.candidate_verified)
        self.assertFalse(result.board_release_ready)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("live roster document is not pinned to the exact supported schema/version" in r
                and "schema=" in r for r in result.reasons),
            result.reasons,
        )

    def test_roster_wrong_live_version_rejected(self):
        bad_roster = dict(ROSTER, version="9.9")
        bad_sha = _dict_sha256(bad_roster)
        receipt = make_receipt()
        receipt["roster"]["version"] = "9.9"
        receipt["roster"]["sha256"] = bad_sha
        result = run_verify(receipt, roster=bad_roster, roster_sha256=bad_sha)
        self.assertFalse(result.candidate_verified)
        self.assertFalse(result.board_release_ready)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("live roster document is not pinned to the exact supported schema/version" in r
                and "version=" in r for r in result.reasons),
            result.reasons,
        )

    def test_roster_exact_valid_live_document_is_positive_control(self):
        result = run_verify(make_receipt())
        self.assertTrue(result.candidate_verified, result.reasons)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertFalse(
            any("live roster document is not pinned" in r for r in result.reasons), result.reasons
        )

    def test_check_manifest_wrong_live_schema_rejected(self):
        bad_manifest = dict(CHECK_MANIFEST, schema="nexus.board-release-required-checks.v9")
        bad_sha = _dict_sha256(bad_manifest)
        receipt = make_receipt()
        receipt["check_manifest"]["sha256"] = bad_sha
        result = run_verify(receipt, check_manifest=bad_manifest, check_manifest_sha256=bad_sha)
        self.assertFalse(result.candidate_verified)
        self.assertFalse(result.board_release_ready)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("live required-check manifest is not pinned to the exact supported schema/version" in r
                and "schema=" in r for r in result.reasons),
            result.reasons,
        )

    def test_check_manifest_wrong_live_version_rejected(self):
        bad_manifest = dict(CHECK_MANIFEST, version="9.9")
        bad_sha = _dict_sha256(bad_manifest)
        receipt = make_receipt()
        receipt["check_manifest"]["version"] = "9.9"
        receipt["check_manifest"]["sha256"] = bad_sha
        result = run_verify(receipt, check_manifest=bad_manifest, check_manifest_sha256=bad_sha)
        self.assertFalse(result.candidate_verified)
        self.assertFalse(result.board_release_ready)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("live required-check manifest is not pinned to the exact supported schema/version" in r
                and "version=" in r for r in result.reasons),
            result.reasons,
        )

    def test_check_manifest_exact_valid_live_document_is_positive_control(self):
        result = run_verify(make_receipt())
        self.assertTrue(result.candidate_verified, result.reasons)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertFalse(
            any("live required-check manifest is not pinned" in r for r in result.reasons),
            result.reasons,
        )

    def test_activation_manifest_wrong_live_schema_rejected(self):
        bad_manifest = dict(ACTIVATION_MANIFEST, schema="nexus.ug-autonomy-001-activation.v9")
        bad_sha = _dict_sha256(bad_manifest)
        overrides = full_activation_overrides()
        overrides["policy_activation"]["manifest"]["sha256"] = bad_sha
        receipt = make_receipt(**overrides)
        result = run_verify(receipt, expected_changed_paths=DEFAULT_CHANGED_PATHS,
                             activation_manifest=bad_manifest, activation_manifest_sha256=bad_sha)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("live UG-AUTONOMY-001 activation manifest is not pinned to the exact supported "
                "schema/version" in r and "schema=" in r for r in result.merge_reasons),
            result.merge_reasons,
        )

    def test_activation_manifest_wrong_live_version_rejected(self):
        bad_manifest = dict(ACTIVATION_MANIFEST, version="9.9")
        bad_sha = _dict_sha256(bad_manifest)
        overrides = full_activation_overrides()
        overrides["policy_activation"]["manifest"]["version"] = "9.9"
        overrides["policy_activation"]["manifest"]["sha256"] = bad_sha
        receipt = make_receipt(**overrides)
        result = run_verify(receipt, expected_changed_paths=DEFAULT_CHANGED_PATHS,
                             activation_manifest=bad_manifest, activation_manifest_sha256=bad_sha)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("live UG-AUTONOMY-001 activation manifest is not pinned to the exact supported "
                "schema/version" in r and "version=" in r for r in result.merge_reasons),
            result.merge_reasons,
        )

    def test_activation_manifest_exact_valid_live_document_is_positive_control(self):
        receipt = make_receipt(**full_activation_overrides())
        result = run_verify(receipt, expected_changed_paths=DEFAULT_CHANGED_PATHS)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertFalse(
            any("live UG-AUTONOMY-001 activation manifest is not pinned" in r
                for r in result.merge_reasons),
            result.merge_reasons,
        )


class TestEvidenceIndexBinding(unittest.TestCase):
    """Finding 2 (CRITICAL): every evidence reference must be authenticated against an
    independently supplied evidence index bound to repo/PR/HEAD -- a syntactically valid but
    unresolved reference or digest is never treated as proof."""

    def test_evidence_index_path_mismatch_fails(self):
        receipt = make_receipt()
        ei = make_evidence_index(_collect_evidence_refs(receipt))
        ei_sha = _dict_sha256(ei)
        receipt["evidence_index"]["path"] = "wrong/path.json"
        result = run_verify(receipt, sync_evidence_index=False, evidence_index=ei, evidence_index_sha256=ei_sha)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("evidence_index.path mismatch" in r for r in result.reasons), result.reasons)

    def test_evidence_index_hash_drift_fails(self):
        receipt = make_receipt()
        ei = make_evidence_index(_collect_evidence_refs(receipt))
        ei_sha = _dict_sha256(ei)
        receipt["evidence_index"]["sha256"] = "0" * 64
        result = run_verify(receipt, sync_evidence_index=False, evidence_index=ei, evidence_index_sha256=ei_sha)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("evidence_index hash drift" in r for r in result.reasons), result.reasons)

    def test_evidence_index_not_supplied_fails_closed(self):
        receipt = make_receipt()
        result = run_verify(receipt, sync_evidence_index=False, evidence_index=None,
                             evidence_index_sha256=receipt["evidence_index"]["sha256"])
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("evidence index was not independently supplied" in r for r in result.reasons),
            result.reasons,
        )

    def test_nonexistent_evidence_ref_fails_even_though_syntactically_valid(self):
        # WIN CONDITION (finding 2): a syntactically valid but nonexistent evidence reference,
        # unresolved against the independent evidence index, must fail closed.
        receipt = make_receipt()
        ei = make_evidence_index(_collect_evidence_refs(receipt))
        ei_sha = _dict_sha256(ei)
        receipt["builder"]["evidence_ref"] = _ref("totally-fabricated-but-plausible-log-ref")
        result = run_verify(receipt, sync_evidence_index=False, evidence_index=ei, evidence_index_sha256=ei_sha)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("is not present in the independently supplied evidence index" in r for r in result.reasons),
            result.reasons,
        )

    def test_arbitrary_valid_hex_digest_unresolved_fails(self):
        receipt = make_receipt()
        ei = make_evidence_index(_collect_evidence_refs(receipt))
        ei_sha = _dict_sha256(ei)
        receipt["required_checks"][0]["evidence_digest"] = "f" * 64
        result = run_verify(receipt, sync_evidence_index=False, evidence_index=ei, evidence_index_sha256=ei_sha)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("is not present in the independently supplied evidence index" in r for r in result.reasons),
            result.reasons,
        )

    def test_unverified_record_fails(self):
        receipt = make_receipt()
        refs = _collect_evidence_refs(receipt)
        ei = make_evidence_index(refs)
        ei["records"][receipt["builder"]["evidence_ref"]]["verified"] = False
        ei_sha = _dict_sha256(ei)
        receipt["evidence_index"]["sha256"] = ei_sha
        result = run_verify(receipt, sync_evidence_index=False, evidence_index=ei, evidence_index_sha256=ei_sha)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("is not marked verified" in r for r in result.reasons), result.reasons)

    def test_exact_trusted_fixture_authenticates_and_passes(self):
        result = run_verify(make_receipt())
        self.assertTrue(result.candidate_verified, result.reasons)
        self.assertTrue(result.board_release_ready, result.reasons)


class TestEvidenceFreshness(unittest.TestCase):
    """Finding 5 (HIGH): stale evidence must fail closed even when HEAD matches."""

    def test_evidence_dated_2020_fails_for_2026_receipt(self):
        receipt = make_receipt()
        refs = _collect_evidence_refs(receipt)
        ei = make_evidence_index(refs, timestamp="2020-01-01T00:00:00+00:00")
        ei_sha = _dict_sha256(ei)
        receipt["evidence_index"]["sha256"] = ei_sha
        result = run_verify(receipt, sync_evidence_index=False, evidence_index=ei, evidence_index_sha256=ei_sha)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("is stale" in r for r in result.reasons), result.reasons)

    def test_evidence_at_freshness_boundary_passes(self):
        receipt = make_receipt(issued_at="2026-07-24T10:00:00+00:00")
        _set_all_event_timestamps(receipt, "2026-07-23T10:00:01+00:00")
        refs = _collect_evidence_refs(receipt)
        # exactly at the 24h boundary before issued_at -- not stale (< is strict)
        ei = make_evidence_index(refs, timestamp="2026-07-23T10:00:01+00:00")
        ei_sha = _dict_sha256(ei)
        receipt["evidence_index"]["sha256"] = ei_sha
        result = run_verify(receipt, sync_evidence_index=False, evidence_index=ei, evidence_index_sha256=ei_sha)
        self.assertTrue(result.candidate_verified, result.reasons)

    def test_evidence_just_past_freshness_boundary_fails(self):
        receipt = make_receipt(issued_at="2026-07-24T10:00:00+00:00")
        refs = _collect_evidence_refs(receipt)
        ei = make_evidence_index(refs, timestamp="2026-07-23T09:59:59+00:00")
        ei_sha = _dict_sha256(ei)
        receipt["evidence_index"]["sha256"] = ei_sha
        result = run_verify(receipt, sync_evidence_index=False, evidence_index=ei, evidence_index_sha256=ei_sha)
        self.assertFalse(result.candidate_verified)

    def test_required_check_timestamp_stale_relative_to_issuance_fails(self):
        receipt = make_receipt(issued_at="2026-07-24T10:00:00+00:00")
        receipt["required_checks"][0]["timestamp"] = "2020-01-01T00:00:00+00:00"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("is stale" in r for r in result.reasons), result.reasons)


class TestRoleSeparation(unittest.TestCase):
    def test_missing_builder_attestation_fails(self):
        receipt = make_receipt()
        del receipt["builder"]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("builder attestation" in r for r in result.reasons), result.reasons)

    def test_missing_independent_review_attestation_fails(self):
        receipt = make_receipt()
        del receipt["independent_review"]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("independent_review attestation" in r for r in result.reasons), result.reasons
        )

    def test_builder_wrong_tool_fails(self):
        receipt = make_receipt()
        receipt["builder"]["tool"] = "codex-cli"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("builder.tool must be" in r for r in result.reasons), result.reasons)

    def test_builder_wrong_family_fails(self):
        receipt = make_receipt()
        receipt["builder"]["family"] = "openai"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("builder.family must be" in r for r in result.reasons), result.reasons)

    def test_independent_review_wrong_tool_fails(self):
        receipt = make_receipt()
        receipt["independent_review"]["tool"] = "claude-cli"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("independent_review.tool must be" in r for r in result.reasons), result.reasons
        )

    def test_independent_review_wrong_family_fails(self):
        receipt = make_receipt()
        receipt["independent_review"]["family"] = "anthropic"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("independent_review.family must be" in r for r in result.reasons), result.reasons
        )

    def test_builder_and_reviewer_same_family_fails_even_if_literals_move(self):
        receipt = make_receipt()
        receipt["builder"]["family"] = "openai"
        receipt["independent_review"]["family"] = "openai"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any(
                "independent_review family must differ from builder family" in r
                for r in result.reasons
            ),
            result.reasons,
        )

    def test_builder_head_sha_mismatch_fails(self):
        receipt = make_receipt()
        receipt["builder"]["head_sha"] = OTHER_HEAD
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("builder head_sha drift" in r for r in result.reasons), result.reasons)

    def test_independent_review_head_sha_mismatch_fails(self):
        receipt = make_receipt()
        receipt["independent_review"]["head_sha"] = OTHER_HEAD
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("independent_review head_sha drift" in r for r in result.reasons), result.reasons
        )

    def test_builder_missing_evidence_ref_fails(self):
        receipt = make_receipt()
        receipt["builder"]["evidence_ref"] = ""
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("builder evidence_ref" in r for r in result.reasons), result.reasons)

    def test_independent_review_missing_evidence_ref_fails(self):
        receipt = make_receipt()
        receipt["independent_review"]["evidence_ref"] = ""
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("independent_review evidence_ref" in r for r in result.reasons), result.reasons
        )

    def test_reviewer_execution_identity_same_as_builder_fails(self):
        receipt = make_receipt()
        receipt["independent_review"]["execution_identity"] = BUILDER_EXEC_ID
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("execution_identity must differ from builder" in r for r in result.reasons),
            result.reasons,
        )

    def test_reviewer_authored_candidate_true_fails(self):
        receipt = make_receipt()
        receipt["independent_review"]["authored_candidate"] = True
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("authored_candidate must be explicitly false" in r for r in result.reasons),
            result.reasons,
        )

    def test_reviewer_repaired_candidate_true_fails(self):
        receipt = make_receipt()
        receipt["independent_review"]["repaired_candidate"] = True
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("repaired_candidate must be explicitly false" in r for r in result.reasons),
            result.reasons,
        )


class TestVotingDefects(unittest.TestCase):
    def test_one_dissenter_fails(self):
        receipt = make_receipt()
        receipt["decisions"][1]["vote"] = "DISSENT"
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("did not APPROVE" in r for r in result.reasons), result.reasons)

    def test_missing_voter_fails(self):
        receipt = make_receipt()
        receipt["decisions"] = receipt["decisions"][:2]
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("missing decision from eligible member" in r for r in result.reasons),
            result.reasons,
        )

    def test_unknown_voter_fails(self):
        receipt = make_receipt()
        receipt["decisions"].append(
            {"member_id": "random-stranger", "vote": "APPROVE", "evidence_ref": "x", "head_sha": HEAD}
        )
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("unknown voter" in r for r in result.reasons), result.reasons)

    def test_duplicate_voter_fails(self):
        receipt = make_receipt()
        receipt["decisions"].append(dict(receipt["decisions"][0]))
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("duplicate decision" in r for r in result.reasons), result.reasons)

    def test_abstain_fails(self):
        receipt = make_receipt()
        receipt["decisions"][0]["vote"] = "ABSTAIN"
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("did not APPROVE" in r for r in result.reasons), result.reasons)

    def test_claude_builder_as_voter_is_rejected_as_unknown(self):
        receipt = make_receipt()
        receipt["decisions"].append(
            {"member_id": "claude-builder", "vote": "APPROVE", "evidence_ref": "x", "head_sha": HEAD}
        )
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("unknown voter" in r for r in result.reasons), result.reasons)

    def test_decision_missing_evidence_ref_fails(self):
        receipt = make_receipt()
        receipt["decisions"][0]["evidence_ref"] = ""
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("missing evidence_ref" in r for r in result.reasons), result.reasons)

    def test_decision_head_sha_mismatch_fails(self):
        receipt = make_receipt()
        receipt["decisions"][0]["head_sha"] = OTHER_HEAD
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("decision head_sha drift" in r for r in result.reasons), result.reasons)

    def test_decision_model_family_mismatch_fails(self):
        receipt = make_receipt()
        receipt["decisions"][2]["model_family"] = "anthropic"
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("model_family mismatch" in r for r in result.reasons), result.reasons)


class TestCheckEvidenceContract(unittest.TestCase):
    def test_status_passed_alone_is_invalid_without_evidence(self):
        receipt = make_receipt()
        receipt["required_checks"][0] = {
            "id": receipt["required_checks"][0]["id"],
            "status": "passed",
        }
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(len(result.reasons) >= 2, result.reasons)

    def test_missing_command_fails(self):
        receipt = make_receipt()
        del receipt["required_checks"][0]["command"]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("command is missing" in r for r in result.reasons), result.reasons)

    def test_command_identity_mismatch_fails(self):
        receipt = make_receipt()
        receipt["required_checks"][0]["command"] = ["echo", "not-the-real-command"]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("command identity mismatch" in r for r in result.reasons), result.reasons)

    def test_nonzero_exit_code_fails(self):
        receipt = make_receipt()
        receipt["required_checks"][0]["exit_code"] = 1
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("exit_code must be exactly the integer 0" in r for r in result.reasons), result.reasons)

    def test_missing_timestamp_fails(self):
        receipt = make_receipt()
        del receipt["required_checks"][0]["timestamp"]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("timestamp" in r for r in result.reasons), result.reasons)

    def test_future_timestamp_fails(self):
        receipt = make_receipt()
        receipt["required_checks"][0]["timestamp"] = "2026-07-25T00:00:00+00:00"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("timestamp is in the future" in r for r in result.reasons), result.reasons)

    def test_missing_runner_identity_fails(self):
        receipt = make_receipt()
        del receipt["required_checks"][0]["runner_identity"]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("runner_identity is missing" in r for r in result.reasons), result.reasons)

    def test_runner_identity_equal_to_builder_fails(self):
        receipt = make_receipt()
        receipt["required_checks"][0]["runner_identity"] = BUILDER_EXEC_ID
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("must be rerun outside the builder" in r for r in result.reasons), result.reasons
        )

    def test_trust_domain_mismatch_fails(self):
        receipt = make_receipt()
        receipt["required_checks"][0]["trust_domain"] = "untrusted-scratch"
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("trust_domain mismatch" in r for r in result.reasons), result.reasons)

    def test_missing_evidence_digest_fails(self):
        receipt = make_receipt()
        del receipt["required_checks"][0]["evidence_digest"]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("evidence_digest is not a 64-character hex digest" in r for r in result.reasons),
            result.reasons,
        )

    def test_rerun_outside_builder_not_true_fails(self):
        receipt = make_receipt()
        receipt["required_checks"][0]["rerun_outside_builder"] = False
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("rerun_outside_builder must be explicitly true" in r for r in result.reasons),
            result.reasons,
        )

    def test_no_required_checks_fails(self):
        receipt = make_receipt(required_checks=[])
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("required_checks is missing or empty" in r for r in result.reasons))


class TestCheckManifestRepoBinding(unittest.TestCase):
    def test_check_manifest_repo_mismatch_fails(self):
        bad_manifest = dict(CHECK_MANIFEST, repo="CleanExpo/CARSI")
        result = run_verify(make_receipt(), check_manifest=bad_manifest)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("check_manifest.repo" in r for r in result.reasons), result.reasons)

    def test_check_manifest_missing_repo_field_fails(self):
        bad_manifest = {k: v for k, v in CHECK_MANIFEST.items() if k != "repo"}
        result = run_verify(make_receipt(), check_manifest=bad_manifest)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("check_manifest.repo" in r for r in result.reasons), result.reasons)

    def test_canonical_check_manifest_repo_matches_unite_group(self):
        self.assertEqual(CHECK_MANIFEST.get("repo"), "CleanExpo/Unite-Group")


class TestCheckManifestIdBinding(unittest.TestCase):
    def test_missing_required_check_id_fails(self):
        receipt = make_receipt()
        receipt["required_checks"] = receipt["required_checks"][:-1]
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("missing required check from manifest" in r for r in result.reasons),
            result.reasons,
        )

    def test_duplicate_required_check_id_fails(self):
        receipt = make_receipt()
        receipt["required_checks"].append(dict(receipt["required_checks"][0]))
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("duplicate required check id" in r for r in result.reasons), result.reasons)

    def test_unknown_required_check_id_fails(self):
        receipt = make_receipt()
        receipt["required_checks"].append(
            {"id": "not-in-manifest", "status": "passed", "evidence_digest": "0" * 64}
        )
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(any("unknown required check id" in r for r in result.reasons), result.reasons)

    def test_unconditional_check_cannot_be_not_applicable(self):
        receipt = make_receipt()
        for c in receipt["required_checks"]:
            if c["id"] == "git-diff-check":
                c.clear()
                c.update({"id": "git-diff-check", "status": "not_applicable",
                          "evidence_digest": "0" * 64})
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("unconditionally required and cannot be not_applicable" in r for r in result.reasons),
            result.reasons,
        )

    def test_not_applicable_claim_contradicted_by_changed_paths_fails(self):
        receipt = make_receipt()
        for c in receipt["required_checks"]:
            if c["id"] == "board-release-verifier-tests":
                c.clear()
                c.update({"id": "board-release-verifier-tests", "status": "not_applicable",
                          "evidence_digest": "0" * 64})
        result = run_verify(receipt)
        self.assertFalse(result.candidate_verified)
        self.assertTrue(
            any("claims not_applicable but changed_paths matches" in r for r in result.reasons),
            result.reasons,
        )

    def test_genuinely_not_applicable_check_passes(self):
        receipt = make_receipt(changed_paths=["docs/some-unrelated-doc.md"])
        receipt["required_checks"] = _default_required_checks(["docs/some-unrelated-doc.md"])
        result = run_verify(receipt)
        self.assertTrue(result.candidate_verified, result.reasons)


class TestRejectionLedger(unittest.TestCase):
    def test_missing_ledger_fails_absence_never_means_zero(self):
        receipt = make_receipt()
        del receipt["rejection_ledger"]
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("rejection_ledger is missing" in r for r in result.reasons), result.reasons
        )

    def test_ledger_not_marked_complete_fails(self):
        receipt = make_receipt()
        receipt["rejection_ledger"]["ledger_complete"] = False
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("ledger_complete must be explicitly true" in r for r in result.reasons), result.reasons
        )

    def test_unresolved_item_fails(self):
        receipt = make_receipt()
        receipt["rejection_ledger"]["items"] = [
            {"id": "rej-1", "resolved": False, "repaired": True, "repair_ref": "PR#1240",
             "review_ref": "codex-review-2", "re_reviewed_on_head": HEAD}
        ]
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("is not resolved" in r for r in result.reasons), result.reasons)

    def test_unrepaired_item_fails(self):
        receipt = make_receipt()
        receipt["rejection_ledger"]["items"] = [
            {"id": "rej-2", "resolved": True, "repaired": False, "repair_ref": "PR#1240",
             "review_ref": "codex-review-2", "re_reviewed_on_head": HEAD}
        ]
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("is not repaired" in r for r in result.reasons), result.reasons)

    def test_re_review_on_stale_predecessor_head_fails(self):
        receipt = make_receipt()
        receipt["rejection_ledger"]["items"] = [
            {"id": "rej-3", "resolved": True, "repaired": True, "repair_ref": "PR#1240",
             "review_ref": "codex-review-3", "re_reviewed_on_head": OTHER_HEAD}
        ]
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("not independently re-reviewed on the final HEAD" in r for r in result.reasons),
            result.reasons,
        )

    def test_repaired_rejection_re_reviewed_on_successor_head_passes(self):
        receipt = make_receipt()
        receipt["rejection_ledger"]["items"] = [
            {"id": "rej-4", "resolved": True, "repaired": True, "repair_ref": _ref("PR#1241"),
             "review_ref": _ref("codex-review-4"), "re_reviewed_on_head": HEAD,
             "repair_event_timestamp": "2026-07-24T11:30:00+00:00",
             "review_event_timestamp": "2026-07-24T11:30:00+00:00"}
        ]
        result = run_verify(receipt)
        self.assertTrue(result.board_release_ready, result.reasons)


class TestScopeFlags(unittest.TestCase):
    def test_direct_spend_flag_fails(self):
        receipt = make_receipt(direct_spend=True)
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("direct_spend must be explicitly false" in r for r in result.reasons))

    def test_constitutional_change_flag_fails(self):
        receipt = make_receipt(constitutional_change=True)
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("constitutional_change must be explicitly false" in r for r in result.reasons)
        )

    def test_out_of_scope_flag_fails(self):
        receipt = make_receipt(out_of_scope=True)
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("out_of_scope must be explicitly false" in r for r in result.reasons))

    def test_missing_privilege_flag_fails(self):
        receipt = make_receipt(missing_privilege=True)
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("missing_privilege must be explicitly false" in r for r in result.reasons)
        )

    def test_authority_conflict_flag_fails(self):
        receipt = make_receipt(authority_conflict=True)
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("authority_conflict must be explicitly false" in r for r in result.reasons)
        )

    def test_unapproved_infrastructure_flag_fails(self):
        receipt = make_receipt(unapproved_infrastructure=True)
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("unapproved_infrastructure must be explicitly false" in r for r in result.reasons)
        )

    def test_constitutional_change_false_contradicted_by_changed_paths_fails(self):
        receipt = make_receipt(
            changed_paths=["docs/constitution/board-release-required-checks.v1.json"],
        )
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any(
                "constitutional_change is false but changed_paths includes a docs/constitution/ path" in r
                for r in result.reasons
            ),
            result.reasons,
        )


class TestRollbackAndDeployGate(unittest.TestCase):
    def test_rollback_not_applicable_blocks_merge(self):
        result = run_verify(make_receipt())
        self.assertTrue(
            any("rollback marked not_applicable cannot authorise merge/deploy" in r
                for r in result.merge_reasons),
            result.merge_reasons,
        )

    def test_rollback_applicable_but_untested_blocks_merge(self):
        receipt = make_receipt(rollback={"applicable": True})
        result = run_verify(receipt)
        self.assertTrue(
            any("not proven with tested exact-artifact rollback evidence" in r
                for r in result.merge_reasons),
            result.merge_reasons,
        )

    def test_missing_post_deployment_plan_blocks_merge(self):
        result = run_verify(make_receipt())
        self.assertTrue(
            any("post_deployment_verification_plan is not present" in r
                for r in result.merge_reasons),
            result.merge_reasons,
        )

    def test_reconciled_activation_without_supplied_manifest_fails_closed(self):
        receipt = make_receipt(**full_activation_overrides())
        result = run_verify(receipt, expected_changed_paths=DEFAULT_CHANGED_PATHS,
                             activation_manifest=None, activation_manifest_sha256=None)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("activation manifest was not independently supplied" in r
                for r in result.merge_reasons),
            result.merge_reasons,
        )


class TestTimestamps(unittest.TestCase):
    def test_expiry_fails(self):
        receipt = make_receipt(
            issued_at="2026-07-20T00:00:00+00:00",
            expires_at="2026-07-23T00:00:00+00:00",
        )
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("receipt expired" in r for r in result.reasons), result.reasons)

    def test_malformed_timestamp_fails(self):
        receipt = make_receipt(expires_at="not-a-timestamp")
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("not a valid ISO 8601 timestamp" in r for r in result.reasons), result.reasons
        )

    def test_timestamp_without_timezone_fails(self):
        receipt = make_receipt(expires_at="2026-07-24T18:00:00")
        result = run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("no timezone offset" in r for r in result.reasons), result.reasons)

    def test_ttl_exceeds_bound_fails(self):
        receipt = make_receipt(
            issued_at="2026-07-20T00:00:00+00:00",
            expires_at="2026-07-22T00:00:00+00:00",
        )
        result = run_verify(receipt, now=dt.datetime(2026, 7, 21, 0, 0, 0, tzinfo=dt.timezone.utc))
        self.assertFalse(result.board_release_ready)
        self.assertTrue(any("TTL exceeds maximum bound" in r for r in result.reasons), result.reasons)


class TestDeterministicDigest(unittest.TestCase):
    def test_same_inputs_produce_same_digest(self):
        r1 = run_verify(make_receipt()).to_dict()
        r2 = run_verify(make_receipt()).to_dict()
        self.assertEqual(r1["deterministic_digest"], r2["deterministic_digest"])

    def test_different_outcome_produces_different_digest(self):
        good = run_verify(make_receipt()).to_dict()
        bad = run_verify(make_receipt(direct_spend=True)).to_dict()
        self.assertNotEqual(good["deterministic_digest"], bad["deterministic_digest"])


class TestCliEndToEnd(unittest.TestCase):
    def _write_fixtures(self, tmp, receipt, evidence_index):
        receipt_path = Path(tmp) / "receipt.json"
        roster_path = Path(tmp) / "roster.json"
        constitution_path = Path(tmp) / "constitution.md"
        check_manifest_path = Path(tmp) / "check_manifest.json"
        evidence_index_path = Path(tmp) / "evidence_index.json"
        receipt_path.write_text(json.dumps(receipt))
        roster_path.write_bytes(ROSTER_PATH.read_bytes())
        constitution_path.write_bytes(POLICY_PATH.read_bytes())
        check_manifest_path.write_bytes(CHECK_MANIFEST_PATH.read_bytes())
        evidence_index_path.write_text(json.dumps(evidence_index, sort_keys=True))
        return receipt_path, roster_path, constitution_path, check_manifest_path, evidence_index_path

    def _base_argv(self, paths):
        receipt_path, roster_path, constitution_path, check_manifest_path, evidence_index_path = paths
        return [
            "--receipt", str(receipt_path),
            "--roster", str(roster_path),
            "--constitution", str(constitution_path),
            "--check-manifest", str(check_manifest_path),
            "--evidence-index", str(evidence_index_path),
            "--expect-repo", REPO,
            "--expect-base", BASE,
            "--expect-head-sha", HEAD,
            "--expect-pr", str(PR),
            "--expect-policy-path", EXPECTED_POLICY_PATH,
            "--expect-policy-version", EXPECTED_POLICY_VERSION,
            "--expect-roster-path", EXPECTED_ROSTER_PATH,
            "--expect-check-manifest-path", EXPECTED_CHECK_MANIFEST_PATH,
            "--expect-evidence-index-path", EXPECTED_EVIDENCE_INDEX_PATH,
            "--expect-policy-sha256", POLICY_SHA,
            "--expect-roster-sha256", ROSTER_SHA,
            "--expect-check-manifest-sha256", CHECK_MANIFEST_SHA,
            "--expect-evidence-index-sha256", sha256_file(evidence_index_path) if isinstance(evidence_index_path, Path) else "",
            "--now", "2026-07-24T12:00:00+00:00",
        ]

    def _make_fixture_set(self, tmp, receipt):
        refs = _collect_evidence_refs(receipt)
        ei = make_evidence_index(refs)
        ei_sha = _dict_sha256(ei)
        receipt["evidence_index"] = {
            "path": EXPECTED_EVIDENCE_INDEX_PATH, "schema": EVIDENCE_INDEX_SCHEMA,
            "version": ei["version"], "sha256": ei_sha,
        }
        paths = self._write_fixtures(tmp, receipt, ei)
        argv = self._base_argv(paths)
        argv[argv.index("--expect-evidence-index-sha256") + 1] = ei_sha
        return argv

    def test_cli_green_path_exits_zero(self):
        with tempfile.TemporaryDirectory() as tmp:
            argv = self._make_fixture_set(tmp, make_receipt())
            exit_code = main(argv)
            self.assertEqual(exit_code, 0)

    def test_cli_rejected_path_exits_one(self):
        with tempfile.TemporaryDirectory() as tmp:
            argv = self._make_fixture_set(tmp, make_receipt(direct_spend=True))
            exit_code = main(argv)
            self.assertEqual(exit_code, 1)

    def test_cli_three_state_structured_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            argv = self._make_fixture_set(tmp, make_receipt())
            proc = subprocess.run(
                [sys.executable, str(Path(PKG, "verifier.py"))] + argv,
                capture_output=True, text=True,
            )
            self.assertEqual(proc.returncode, 0, proc.stderr)
            payload = json.loads(proc.stdout)
            self.assertTrue(payload["candidate_verified"])
            self.assertTrue(payload["board_release_ready"])
            self.assertFalse(payload["merge_authorised"])
            self.assertFalse(payload["deployment_authorised"])
            self.assertIn("deterministic_digest", payload)

    def test_cli_wrong_expected_policy_sha256_rejects_before_loading(self):
        with tempfile.TemporaryDirectory() as tmp:
            argv = self._make_fixture_set(tmp, make_receipt())
            argv[argv.index("--expect-policy-sha256") + 1] = "0" * 64
            exit_code = main(argv)
            self.assertEqual(exit_code, 1)

    def _cli_hash_gate_precedes_parsing(self, flag, hash_flag, expected_reason_substr):
        with tempfile.TemporaryDirectory() as tmp:
            argv = self._make_fixture_set(tmp, make_receipt())
            target_path = Path(argv[argv.index(flag) + 1])
            target_path.write_text("{not valid json")
            argv[argv.index(hash_flag) + 1] = "0" * 64
            proc = subprocess.run(
                [sys.executable, str(Path(PKG, "verifier.py"))] + argv,
                capture_output=True, text=True,
            )
            self.assertEqual(proc.returncode, 1)
            self.assertEqual(proc.stderr, "")
            payload = json.loads(proc.stdout)
            self.assertFalse(payload["board_release_ready"])
            self.assertTrue(
                any(expected_reason_substr in r for r in payload["reasons"]), payload["reasons"]
            )
            self.assertFalse(
                any("not valid JSON" in r for r in payload["reasons"]), payload["reasons"]
            )

    def test_cli_wrong_expected_roster_sha256_with_malformed_roster_rejects_before_parsing(self):
        self._cli_hash_gate_precedes_parsing("--roster", "--expect-roster-sha256", "roster hash drift")

    def test_cli_wrong_expected_check_manifest_sha256_with_malformed_manifest_rejects_before_parsing(self):
        self._cli_hash_gate_precedes_parsing(
            "--check-manifest", "--expect-check-manifest-sha256", "check-manifest hash drift"
        )

    def test_cli_wrong_expected_evidence_index_sha256_with_malformed_index_rejects_before_parsing(self):
        self._cli_hash_gate_precedes_parsing(
            "--evidence-index", "--expect-evidence-index-sha256", "evidence-index hash drift"
        )

    def test_cli_malformed_receipt_json_returns_structured_output_not_traceback(self):
        with tempfile.TemporaryDirectory() as tmp:
            argv = self._make_fixture_set(tmp, make_receipt())
            receipt_path = Path(argv[argv.index("--receipt") + 1])
            receipt_path.write_text("{not valid json")
            proc = subprocess.run(
                [sys.executable, str(Path(PKG, "verifier.py"))] + argv,
                capture_output=True, text=True,
            )
            self.assertEqual(proc.returncode, 1)
            self.assertEqual(proc.stderr, "")
            payload = json.loads(proc.stdout)
            self.assertFalse(payload["board_release_ready"])
            self.assertTrue(any("not valid JSON" in r for r in payload["reasons"]), payload["reasons"])

    def test_cli_missing_receipt_file_returns_structured_output_not_traceback(self):
        with tempfile.TemporaryDirectory() as tmp:
            argv = self._make_fixture_set(tmp, make_receipt())
            missing_path = str(Path(tmp) / "does-not-exist.json")
            argv[argv.index("--receipt") + 1] = missing_path
            proc = subprocess.run(
                [sys.executable, str(Path(PKG, "verifier.py"))] + argv,
                capture_output=True, text=True,
            )
            self.assertEqual(proc.returncode, 1)
            self.assertEqual(proc.stderr, "")
            payload = json.loads(proc.stdout)
            self.assertFalse(payload["board_release_ready"])
            self.assertTrue(
                any("could not be read" in r for r in payload["reasons"]), payload["reasons"]
            )

    def test_verifier_module_imports_no_process_or_network_execution(self):
        source = Path(PKG, "verifier.py").read_text()
        forbidden_imports = ("import subprocess", "import os\n", "import socket", "import urllib", "import requests")
        for forbidden in forbidden_imports:
            self.assertNotIn(forbidden, source)
        self.assertNotIn("os.system(", source)
        self.assertNotIn("subprocess.", source)


class TestHelpers(unittest.TestCase):
    def test_sha256_file_matches_hashlib(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "f.txt"
            path.write_bytes(b"hello world")
            self.assertEqual(sha256_file(path), hashlib.sha256(b"hello world").hexdigest())

    def test_receipt_not_object_fails(self):
        result = run_verify(["not", "an", "object"])
        self.assertFalse(result.board_release_ready)
        self.assertIn("receipt is not a JSON object", result.reasons)

    def test_overrides_do_not_mutate_shared_fixture(self):
        r1 = make_receipt()
        r2 = make_receipt(direct_spend=True)
        self.assertFalse(r1["direct_spend"])
        self.assertTrue(r2["direct_spend"])
        r1["decisions"].append({"member_id": "x"})
        r3 = make_receipt()
        self.assertEqual(len(r3["decisions"]), 3)


NEUTRAL_CHANGED_PATHS = ["src/app.py", "src/app_test.py"]


def neutral_activation_overrides(head=HEAD):
    """Full activation overrides for a candidate whose changed paths touch NO protected prefix
    (neither docs/constitution/ nor tools/board-release-verifier/)."""
    overrides = full_activation_overrides(head=head)
    overrides["changed_paths"] = list(NEUTRAL_CHANGED_PATHS)
    overrides["required_checks"] = _default_required_checks(NEUTRAL_CHANGED_PATHS)
    return overrides


class TestUgAutonomyMergeAuthorisation(unittest.TestCase):
    def test_eligible_ug_repo_can_authorise_merge_after_all_activation_gates(self):
        # WIN CONDITION (m14a): a non-protected PR in an eligible UG-AUTONOMY-001 repo, with
        # complete trusted evidence, unanimous eligible Board approval, a closed rejection ledger,
        # tested rollback, a post-merge verification plan, manifest-bound exact-HEAD activation
        # evidence, a matching independently-observed live changed-file set, and every evidence
        # reference authenticated and fresh, MUST yield merge_authorised=true.
        receipt = make_receipt(**neutral_activation_overrides())
        result = run_verify(receipt, expected_changed_paths=NEUTRAL_CHANGED_PATHS)
        self.assertTrue(result.candidate_verified, result.reasons)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertTrue(result.merge_authorised, result.merge_reasons)
        self.assertEqual(result.merge_reasons, [])

    def test_verifier_touching_candidate_cannot_self_authorise_merge(self):
        # DEFAULT_CHANGED_PATHS touches tools/board-release-verifier/ -- a candidate that modifies
        # the verifier (or controller, or their tests) can never authorise its own merge; it stays
        # founder-manual exactly like a docs/constitution/ amendment.
        receipt = make_receipt(**full_activation_overrides())
        result = run_verify(receipt, expected_changed_paths=DEFAULT_CHANGED_PATHS)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("cannot self-authorise" in r and "tools/board-release-verifier/" in r
                for r in result.merge_reasons),
            result.merge_reasons,
        )

    def test_constitutional_candidate_cannot_self_authorise_merge(self):
        overrides = full_activation_overrides()
        overrides["changed_paths"] = ["docs/constitution/ug-autonomy-001-activation.v1.json"]
        overrides["required_checks"] = _default_required_checks(overrides["changed_paths"])
        receipt = make_receipt(**overrides)
        result = run_verify(receipt, expected_changed_paths=overrides["changed_paths"])
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("constitutional candidate cannot self-authorise" in r
                for r in result.merge_reasons),
            result.merge_reasons,
        )

    def test_ineligible_repo_cannot_authorise_merge(self):
        overrides = full_activation_overrides()
        overrides["repo"] = "CleanExpo/Synthex"
        receipt = make_receipt(**overrides)
        check_manifest = dict(CHECK_MANIFEST, repo="CleanExpo/Synthex")
        result = run_verify(receipt, expected_repo="CleanExpo/Synthex", check_manifest=check_manifest,
                             expected_changed_paths=DEFAULT_CHANGED_PATHS)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("not eligible under the UG-AUTONOMY-001 activation manifest" in r
                for r in result.merge_reasons),
            result.merge_reasons,
        )


class TestDeploymentAuthorisationAlwaysFalse(unittest.TestCase):
    def test_deployment_never_authorised_even_on_full_green_activation_path(self):
        receipt = make_receipt(**neutral_activation_overrides())
        result = run_verify(receipt, expected_changed_paths=NEUTRAL_CHANGED_PATHS)
        self.assertTrue(result.merge_authorised, result.merge_reasons)
        self.assertFalse(result.deployment_authorised)
        self.assertTrue(
            any("no deployment executor is implemented" in r for r in result.deployment_reasons),
            result.deployment_reasons,
        )


if __name__ == "__main__":
    unittest.main()
