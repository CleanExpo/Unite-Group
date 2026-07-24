"""Controller tests: prove exactly one SHA-guarded, independently-post-merge-verified merge on the
full green path, and ZERO merge calls on every defect -- including a live PR that is draft, not
mergeable, or dirty, and a repo outside the constant defense-in-depth allowlist. Driven by a fake gh
executable -- never calls GitHub.

Run: python3 -m unittest test_controller -v   (from this tests/ directory)
"""
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
sys.path.insert(0, PKG)
sys.path.insert(0, HERE)

from controller import run_controller, ALLOWED_REPOS  # noqa: E402
import test_verifier as tv  # noqa: E402

FAKE_GH = os.path.join(HERE, "fake_gh.py")
# Invoke the repository's fake gh through the interpreter -- the repo file itself is never
# chmod-ed or otherwise mutated (read-only checkout purity).
FAKE_GH_CMD = [sys.executable, FAKE_GH]


def _write_gh_adapter(tmpdir):
    """Command-prefix adapter for CLI tests: a tiny throwaway executable OUTSIDE the repository
    checkout (writable temp dir) that execs fake_gh.py via sys.executable."""
    path = Path(tmpdir) / "gh"
    path.write_text("#!/bin/sh\nexec '%s' '%s' \"$@\"\n" % (sys.executable, FAKE_GH))
    os.chmod(str(path), 0o755)
    return str(path)
REPO = tv.REPO
PR = 1234
HEAD = tv.HEAD
OTHER = tv.OTHER_HEAD
MERGE_SHA = "2222222222222222222222222222222222222222"
BAD_MERGE_SHA = "not-a-valid-sha"

OPEN_VIEW = {
    "number": PR, "state": "OPEN", "baseRefName": "main", "headRefOid": HEAD,
    "url": "https://x/pr/1234", "isDraft": False, "mergeable": "MERGEABLE",
    "mergeStateStatus": "CLEAN", "mergedAt": None, "mergeCommit": None,
    "files": [{"path": p} for p in tv.NEUTRAL_CHANGED_PATHS],
    "changedFiles": len(tv.NEUTRAL_CHANGED_PATHS),
}
DRIFT_VIEW = dict(OPEN_VIEW, headRefOid=OTHER)
MERGED_VIEW = dict(
    OPEN_VIEW, state="MERGED", mergedAt="2026-07-24T13:00:00Z",
    mergeCommit={"oid": MERGE_SHA},
)

EXPECTATIONS = {
    "expected_policy_path": tv.EXPECTED_POLICY_PATH,
    "expected_policy_version": tv.EXPECTED_POLICY_VERSION,
    "policy_sha256": tv.POLICY_SHA,
    "expected_roster_path": tv.EXPECTED_ROSTER_PATH,
    "roster_sha256": tv.ROSTER_SHA,
    "expected_check_manifest_path": tv.EXPECTED_CHECK_MANIFEST_PATH,
    "check_manifest_sha256": tv.CHECK_MANIFEST_SHA,
    "expected_activation_manifest_path": tv.EXPECTED_ACTIVATION_MANIFEST_PATH,
    "activation_manifest_sha256": tv.ACTIVATION_MANIFEST_SHA,
    "expected_evidence_index_path": tv.EXPECTED_EVIDENCE_INDEX_PATH,
    "now": tv.NOW,
}


def green_receipt(**extra):
    # Neutral (non-protected) changed paths: tools/board-release-verifier/ is itself a protected
    # path (a verifier/controller change can never self-authorise its own merge), so the
    # controller's green path must exercise a candidate that does NOT touch it.
    overrides = tv.neutral_activation_overrides()
    overrides.update(extra)
    return tv.make_receipt(**overrides)


def _evidence_index_for(receipt):
    """Build the independently-supplied evidence index matching a receipt's own evidence
    references, exactly as an external ops/CI system would -- mirrors test_verifier.run_verify's
    sync_evidence_index behaviour so the controller sees a consistent trust anchor."""
    refs = tv._collect_evidence_refs(receipt)
    return tv.make_evidence_index(refs)


class ControllerCase(unittest.TestCase):
    def setUp(self):
        fd, self.state_path = tempfile.mkstemp(suffix=".json")
        os.close(fd)
        os.environ["FAKE_GH_STATE"] = self.state_path

    def tearDown(self):
        os.remove(self.state_path)
        os.environ.pop("FAKE_GH_STATE", None)

    def run_it(self, receipt, scenario=None, activation_manifest=tv.ACTIVATION_MANIFEST, repo=REPO,
               roster=tv.ROSTER, check_manifest=tv.CHECK_MANIFEST, expectation_overrides=None):
        state = {
            "views": [OPEN_VIEW, OPEN_VIEW, MERGED_VIEW],
            "merge": {"merged": True, "sha": MERGE_SHA},
        }
        if scenario:
            state.update(scenario)
        Path(self.state_path).write_text(json.dumps(state))
        evidence_index = _evidence_index_for(receipt)
        expectations = dict(EXPECTATIONS, evidence_index_sha256=tv._dict_sha256(evidence_index))
        if expectation_overrides:
            expectations.update(expectation_overrides)
        ev = run_controller(
            gh_path=FAKE_GH_CMD, repo=repo, pr=PR, receipt=receipt, roster=roster,
            check_manifest=check_manifest, evidence_index=evidence_index,
            activation_manifest=activation_manifest,
            expectations=expectations,
        )
        calls = json.loads(Path(self.state_path).read_text()).get("_calls", [])
        merge_calls = [c for c in calls if c[:1] == ["api"]]
        return ev, merge_calls

    def assert_no_merge(self, receipt, scenario=None, activation_manifest=tv.ACTIVATION_MANIFEST, repo=REPO,
                         roster=tv.ROSTER, check_manifest=tv.CHECK_MANIFEST, expectation_overrides=None):
        ev, merge_calls = self.run_it(receipt, scenario, activation_manifest, repo,
                                       roster, check_manifest, expectation_overrides)
        self.assertFalse(ev["merged"], ev["reasons"])
        self.assertEqual(len(merge_calls), 0, ev["reasons"])
        return ev


class TestGreenPathMergesOnceAndVerifiesPostMerge(ControllerCase):
    def test_full_green_path_performs_exactly_one_sha_guarded_verified_merge(self):
        ev, merge_calls = self.run_it(green_receipt())
        self.assertTrue(ev["merge_api_confirmed"], ev["reasons"])
        self.assertTrue(ev["post_merge_verified"], ev["reasons"])
        self.assertTrue(ev["merged"], ev["reasons"])
        self.assertEqual(ev["result"], "merged_verified")
        self.assertEqual(ev["pre_merge_head"], HEAD)
        self.assertEqual(ev["merge_sha"], MERGE_SHA)
        self.assertEqual(len(merge_calls), 1)
        self.assertIn("sha=%s" % HEAD, merge_calls[0])
        self.assertIn("deterministic_digest", ev)


class TestConstantRepoAllowlist(ControllerCase):
    def test_allowlist_contains_exactly_the_three_named_repos(self):
        self.assertEqual(
            ALLOWED_REPOS,
            frozenset({"CleanExpo/Unite-Group", "CleanExpo/CARSI", "CleanExpo/RestoreAssist"}),
        )

    def test_repo_outside_constant_allowlist_blocks_before_any_gh_call(self):
        # Defense in depth: even if the activation manifest were tampered to add a repo, the
        # controller's own constant allowlist must independently block it -- and must do so before
        # spawning gh at all.
        tampered_manifest = dict(tv.ACTIVATION_MANIFEST)
        tampered_manifest["eligible_repos"] = list(tampered_manifest["eligible_repos"]) + ["CleanExpo/Synthex"]
        receipt = green_receipt(repo="CleanExpo/Synthex")
        ev, merge_calls = self.run_it(receipt, activation_manifest=tampered_manifest, repo="CleanExpo/Synthex")
        self.assertFalse(ev["merged"])
        self.assertEqual(len(merge_calls), 0)
        calls = json.loads(Path(self.state_path).read_text()).get("_calls", [])
        self.assertEqual(calls, [])
        self.assertTrue(any("not in the constant UG-AUTONOMY-001 repo allowlist" in r for r in ev["reasons"]), ev["reasons"])


class TestLivePrEligibilityGates(ControllerCase):
    def test_draft_pr_blocks(self):
        self.assert_no_merge(green_receipt(), {"views": [dict(OPEN_VIEW, isDraft=True)]})

    def test_not_mergeable_blocks(self):
        self.assert_no_merge(green_receipt(), {"views": [dict(OPEN_VIEW, mergeable="CONFLICTING")]})

    def test_dirty_merge_state_blocks(self):
        self.assert_no_merge(green_receipt(), {"views": [dict(OPEN_VIEW, mergeStateStatus="DIRTY")]})


class TestZeroMergeOnDefect(ControllerCase):
    def test_head_drift_before_merge_blocks(self):
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, DRIFT_VIEW]})

    def test_failed_check_blocks(self):
        r = green_receipt()
        r["required_checks"][0]["exit_code"] = 1
        self.assert_no_merge(r)

    def test_missing_votes_block(self):
        r = green_receipt()
        r["decisions"] = r["decisions"][:2]
        self.assert_no_merge(r)

    def test_unresolved_rejection_blocks(self):
        r = green_receipt()
        r["rejection_ledger"]["items"] = [
            {"id": "rej-x", "resolved": False, "repaired": True, "repair_ref": "PR#1",
             "review_ref": "rev-1", "re_reviewed_on_head": HEAD}
        ]
        self.assert_no_merge(r)

    def test_constitutional_diff_blocks(self):
        r = green_receipt(changed_paths=["docs/constitution/ug-autonomy-001-activation.v1.json"])
        self.assert_no_merge(r)

    def test_direct_spend_blocks(self):
        self.assert_no_merge(green_receipt(direct_spend=True))

    def test_missing_privilege_blocks(self):
        self.assert_no_merge(green_receipt(missing_privilege=True))

    def test_authority_conflict_blocks(self):
        self.assert_no_merge(green_receipt(authority_conflict=True))

    def test_unapproved_infrastructure_blocks(self):
        self.assert_no_merge(green_receipt(unapproved_infrastructure=True))

    def test_untested_rollback_blocks(self):
        self.assert_no_merge(green_receipt(rollback={"applicable": True}))

    def test_missing_post_merge_plan_blocks(self):
        self.assert_no_merge(green_receipt(post_deployment_verification_plan={"present": False}))

    def test_activation_hash_drift_blocks(self):
        r = green_receipt()
        r["policy_activation"]["manifest"]["sha256"] = "0" * 64
        self.assert_no_merge(r)

    def test_stale_expired_receipt_blocks(self):
        self.assert_no_merge(green_receipt(
            issued_at="2026-07-20T00:00:00+00:00", expires_at="2026-07-23T00:00:00+00:00"))

    def test_malformed_gh_output_blocks(self):
        self.assert_no_merge(green_receipt(), {"malformed_view": True})

    def test_missing_activation_manifest_blocks(self):
        self.assert_no_merge(green_receipt(), activation_manifest=None)


class TestMergeApiAndPostMergeVerification(ControllerCase):
    def test_failed_merge_api_reports_not_merged_after_one_attempt(self):
        ev, merge_calls = self.run_it(green_receipt(), {"merge_fail": True})
        self.assertFalse(ev["merged"])
        self.assertTrue(ev["attempted"])
        self.assertFalse(ev["merge_api_confirmed"])
        self.assertFalse(ev["post_merge_verified"])
        self.assertEqual(ev["result"], "merge_failed")
        self.assertEqual(len(merge_calls), 1)

    def test_malformed_merge_sha_is_rejected_before_confirming(self):
        ev, merge_calls = self.run_it(green_receipt(), {"merge": {"merged": True, "sha": BAD_MERGE_SHA}})
        self.assertFalse(ev["merged"])
        self.assertFalse(ev["post_merge_verified"])
        self.assertEqual(ev["result"], "merge_unverified")
        self.assertEqual(len(merge_calls), 1)
        self.assertTrue(any("not an exact 40-character lowercase-hex SHA" in r for r in ev["reasons"]), ev["reasons"])

    def test_post_merge_state_not_merged_fails_verification(self):
        unverified_view = dict(MERGED_VIEW, state="OPEN")
        ev, _ = self.run_it(green_receipt(), {"views": [OPEN_VIEW, OPEN_VIEW, unverified_view]})
        self.assertTrue(ev["merge_api_confirmed"])
        self.assertFalse(ev["post_merge_verified"])
        self.assertFalse(ev["merged"])
        self.assertEqual(ev["result"], "merge_unverified")

    def test_post_merge_missing_merged_at_fails_verification(self):
        unverified_view = dict(MERGED_VIEW, mergedAt=None)
        ev, _ = self.run_it(green_receipt(), {"views": [OPEN_VIEW, OPEN_VIEW, unverified_view]})
        self.assertFalse(ev["post_merge_verified"])
        self.assertFalse(ev["merged"])
        self.assertEqual(ev["result"], "merge_unverified")

    def test_post_merge_head_ref_oid_changed_fails_verification(self):
        unverified_view = dict(MERGED_VIEW, headRefOid=OTHER)
        ev, _ = self.run_it(green_receipt(), {"views": [OPEN_VIEW, OPEN_VIEW, unverified_view]})
        self.assertFalse(ev["post_merge_verified"])
        self.assertFalse(ev["merged"])
        self.assertEqual(ev["result"], "merge_unverified")

    def test_post_merge_merge_commit_oid_mismatch_fails_verification(self):
        unverified_view = dict(MERGED_VIEW, mergeCommit={"oid": OTHER})
        ev, _ = self.run_it(green_receipt(), {"views": [OPEN_VIEW, OPEN_VIEW, unverified_view]})
        self.assertFalse(ev["post_merge_verified"])
        self.assertFalse(ev["merged"])
        self.assertEqual(ev["result"], "merge_unverified")

    def test_post_merge_reread_missing_merge_commit_fails_verification(self):
        unverified_view = dict(MERGED_VIEW, mergeCommit=None)
        ev, _ = self.run_it(green_receipt(), {"views": [OPEN_VIEW, OPEN_VIEW, unverified_view]})
        self.assertFalse(ev["post_merge_verified"])
        self.assertFalse(ev["merged"])
        self.assertEqual(ev["result"], "merge_unverified")


PROTECTED_CONST_PATH = "docs/constitution/board-release-required-checks.v1.json"
PROTECTED_VERIFIER_PATH = "tools/board-release-verifier/verifier.py"


class TestHiddenAndDeclaredPathMismatches(ControllerCase):
    """Task: a receipt can never hide a live protected-path touch, nor under/over-declare its
    changed-file set relative to the independently observed live PR file set."""

    def test_hidden_constitution_path_in_live_files_blocks(self):
        live_paths = list(tv.NEUTRAL_CHANGED_PATHS) + [PROTECTED_CONST_PATH]
        view = dict(OPEN_VIEW, files=[{"path": p} for p in live_paths], changedFiles=len(live_paths))
        self.assert_no_merge(green_receipt(), {"views": [view]})

    def test_hidden_verifier_path_in_live_files_blocks(self):
        live_paths = list(tv.NEUTRAL_CHANGED_PATHS) + [PROTECTED_VERIFIER_PATH]
        view = dict(OPEN_VIEW, files=[{"path": p} for p in live_paths], changedFiles=len(live_paths))
        self.assert_no_merge(green_receipt(), {"views": [view]})

    def test_under_declared_changed_paths_blocks(self):
        # Live PR touched a file the receipt never declared.
        live_paths = list(tv.NEUTRAL_CHANGED_PATHS) + ["src/extra_untracked.py"]
        view = dict(OPEN_VIEW, files=[{"path": p} for p in live_paths], changedFiles=len(live_paths))
        self.assert_no_merge(green_receipt(), {"views": [view]})

    def test_over_declared_changed_paths_blocks(self):
        # Receipt declares a file the live PR never actually touched.
        receipt = green_receipt(changed_paths=list(tv.NEUTRAL_CHANGED_PATHS) + ["src/phantom.py"])
        self.assert_no_merge(receipt)


class TestLiveFileResponseIntegrity(ControllerCase):
    """Task: malformed, empty, and truncated/ambiguous live `files` responses must never be
    treated as an empty-but-valid changed-file set."""

    def test_malformed_files_field_type_blocks(self):
        view = dict(OPEN_VIEW, files="not-a-list")
        self.assert_no_merge(green_receipt(), {"views": [view]})

    def test_empty_live_files_blocks(self):
        view = dict(OPEN_VIEW, files=[])
        self.assert_no_merge(green_receipt(), {"views": [view]})

    def test_truncated_file_entry_missing_path_blocks(self):
        view = dict(OPEN_VIEW, files=[{"path": tv.NEUTRAL_CHANGED_PATHS[0]}, {"sha": "deadbeef"}])
        self.assert_no_merge(green_receipt(), {"views": [view]})

    def test_ambiguous_file_entry_empty_path_blocks(self):
        view = dict(OPEN_VIEW, files=[{"path": tv.NEUTRAL_CHANGED_PATHS[0]}, {"path": ""}])
        self.assert_no_merge(green_receipt(), {"views": [view]})


class TestPrIdentityMismatches(ControllerCase):
    """Task: requested/receipt/live PR identity must all agree before any merge is attempted."""

    def test_live_snapshot_pr_number_mismatch_blocks(self):
        view = dict(OPEN_VIEW, number=9999)
        self.assert_no_merge(green_receipt(), {"views": [view]})

    def test_receipt_pr_mismatch_blocks(self):
        receipt = green_receipt(pr=9999)
        self.assert_no_merge(receipt)


class TestEvidenceIndexTrust(ControllerCase):
    """Task: a missing or hash-mismatched evidence index must never authorise a merge."""

    def test_missing_evidence_index_blocks(self):
        state = {"views": [OPEN_VIEW, OPEN_VIEW, MERGED_VIEW], "merge": {"merged": True, "sha": MERGE_SHA}}
        Path(self.state_path).write_text(json.dumps(state))
        receipt = green_receipt()
        expectations = dict(EXPECTATIONS, evidence_index_sha256=tv._dict_sha256(_evidence_index_for(receipt)))
        ev = run_controller(
            gh_path=FAKE_GH_CMD, repo=REPO, pr=PR, receipt=receipt, roster=tv.ROSTER,
            check_manifest=tv.CHECK_MANIFEST, evidence_index=None,
            activation_manifest=tv.ACTIVATION_MANIFEST, expectations=expectations,
        )
        self.assertFalse(ev["merged"], ev["reasons"])
        merge_calls = [c for c in json.loads(Path(self.state_path).read_text()).get("_calls", []) if c[:1] == ["api"]]
        self.assertEqual(len(merge_calls), 0, ev["reasons"])

    def test_mismatched_evidence_index_hash_blocks(self):
        state = {"views": [OPEN_VIEW, OPEN_VIEW, MERGED_VIEW], "merge": {"merged": True, "sha": MERGE_SHA}}
        Path(self.state_path).write_text(json.dumps(state))
        receipt = green_receipt()
        evidence_index = _evidence_index_for(receipt)
        expectations = dict(EXPECTATIONS, evidence_index_sha256="0" * 64)
        ev = run_controller(
            gh_path=FAKE_GH_CMD, repo=REPO, pr=PR, receipt=receipt, roster=tv.ROSTER,
            check_manifest=tv.CHECK_MANIFEST, evidence_index=evidence_index,
            activation_manifest=tv.ACTIVATION_MANIFEST, expectations=expectations,
        )
        self.assertFalse(ev["merged"], ev["reasons"])
        merge_calls = [c for c in json.loads(Path(self.state_path).read_text()).get("_calls", []) if c[:1] == ["api"]]
        self.assertEqual(len(merge_calls), 0, ev["reasons"])


class TestSecondSnapshotEligibilityDriftHeadUnchanged(ControllerCase):
    """Task: every re-checked live-state field (not just HEAD) must block mutation if it drifts
    between the initial verification read and the immediately-pre-mutation re-read."""

    def test_state_drift_blocks(self):
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, dict(OPEN_VIEW, state="CLOSED")]})

    def test_base_drift_blocks(self):
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, dict(OPEN_VIEW, baseRefName="develop")]})

    def test_draft_drift_blocks(self):
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, dict(OPEN_VIEW, isDraft=True)]})

    def test_mergeable_drift_blocks(self):
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, dict(OPEN_VIEW, mergeable="CONFLICTING")]})

    def test_merge_state_status_drift_blocks(self):
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, dict(OPEN_VIEW, mergeStateStatus="DIRTY")]})

    def test_pr_number_drift_blocks(self):
        # Every other eligibility field (state/base/draft/mergeable/mergeStateStatus/headRefOid)
        # is unchanged from OPEN_VIEW -- only the PR number drifts on the immediately-pre-mutation
        # re-read.
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, dict(OPEN_VIEW, number=PR + 1)]})


class TestSecondSnapshotChangedPathsRevalidation(ControllerCase):
    """Late-drift repair: the second, immediately-pre-mutation snapshot must be fully
    re-validated -- changedFiles/files via the SAME _live_changed_paths helper, exact equality
    against the first snapshot and the receipt's declared changed_paths, and a fresh protected-path
    classification -- not just HEAD/state/base/draft/mergeable/clean."""

    def test_second_snapshot_file_count_mismatch_blocks(self):
        bad = dict(OPEN_VIEW, changedFiles=len(tv.NEUTRAL_CHANGED_PATHS) + 1)
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})

    def test_second_snapshot_missing_count_blocks(self):
        bad = dict(OPEN_VIEW)
        bad.pop("changedFiles", None)
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})

    def test_second_snapshot_boolean_count_blocks(self):
        bad = dict(OPEN_VIEW, changedFiles=True)
        ev = self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})
        self.assertEqual(ev["merged"], False)

    def test_second_snapshot_negative_count_blocks(self):
        bad = dict(OPEN_VIEW, changedFiles=-1)
        ev = self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})
        self.assertEqual(ev["merged"], False)

    def test_second_snapshot_malformed_files_list_blocks(self):
        bad = dict(OPEN_VIEW, files="not-a-list")
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})

    def test_second_snapshot_duplicate_path_blocks(self):
        dup_path = tv.NEUTRAL_CHANGED_PATHS[0]
        bad = dict(OPEN_VIEW, files=[{"path": dup_path}, {"path": dup_path}], changedFiles=2)
        self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})

    def test_second_snapshot_under_declared_drift_blocks(self):
        bad = dict(OPEN_VIEW, files=[{"path": tv.NEUTRAL_CHANGED_PATHS[0]}], changedFiles=1)
        ev = self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})
        self.assertTrue(any("drifted" in r for r in ev["reasons"]), ev["reasons"])

    def test_second_snapshot_over_declared_drift_blocks(self):
        extra_files = [{"path": p} for p in tv.NEUTRAL_CHANGED_PATHS] + [{"path": "src/extra.py"}]
        bad = dict(OPEN_VIEW, files=extra_files, changedFiles=len(extra_files))
        ev = self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})
        self.assertTrue(any("drifted" in r for r in ev["reasons"]), ev["reasons"])

    def test_second_snapshot_receipt_mismatch_blocks(self):
        # Direct probe of the defensive receipt-vs-live-snapshot equality guard: zero merge calls
        # is the hard requirement regardless of which specific gate (first-pass verifier or the
        # second-pass re-validation) is the one that fires first.
        receipt = green_receipt()
        receipt["changed_paths"] = [tv.NEUTRAL_CHANGED_PATHS[0]]
        ev, merge_calls = self.run_it(receipt)
        self.assertFalse(ev["merged"], ev["reasons"])
        self.assertEqual(len(merge_calls), 0, ev["reasons"])

    def test_second_snapshot_late_constitutional_path_blocks(self):
        extra_files = [{"path": p} for p in tv.NEUTRAL_CHANGED_PATHS] + [
            {"path": "docs/constitution/late-protected-change.md"}
        ]
        bad = dict(OPEN_VIEW, files=extra_files, changedFiles=len(extra_files))
        ev = self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})
        self.assertTrue(
            any("drifted" in r or "protected" in r for r in ev["reasons"]), ev["reasons"]
        )

    def test_second_snapshot_late_verifier_path_blocks(self):
        extra_files = [{"path": p} for p in tv.NEUTRAL_CHANGED_PATHS] + [
            {"path": "tools/board-release-verifier/late-protected-change.py"}
        ]
        bad = dict(OPEN_VIEW, files=extra_files, changedFiles=len(extra_files))
        ev = self.assert_no_merge(green_receipt(), {"views": [OPEN_VIEW, bad]})
        self.assertTrue(
            any("drifted" in r or "protected" in r for r in ev["reasons"]), ev["reasons"]
        )

    def test_unchanged_valid_second_snapshot_still_merges(self):
        ev, merge_calls = self.run_it(green_receipt())
        self.assertTrue(ev["merged"], ev["reasons"])
        self.assertEqual(len(merge_calls), 1)


class TestControllerLiveTrustDocumentAdmission(ControllerCase):
    """End-to-end controller reproduction (matching Codex's original finding): a wrong live
    schema/version on the roster or required-check manifest document must block the controller
    with zero merge calls, even when the receipt's own declared metadata/hash is kept internally
    consistent with the mutated live document -- only the live-document admission rule is under
    test. The activation-manifest equivalent is covered directly in test_verifier.py because
    run_controller only reaches policy_activation validation once board_release_ready is already
    true, which a corrupted roster/check-manifest here would itself prevent."""

    def test_roster_wrong_live_schema_blocks_with_zero_merge_calls(self):
        bad_roster = dict(tv.ROSTER, schema="nexus.board-release-roster.v9")
        bad_sha = tv._dict_sha256(bad_roster)
        receipt = green_receipt()
        receipt["roster"]["sha256"] = bad_sha
        ev = self.assert_no_merge(receipt, roster=bad_roster,
                                   expectation_overrides={"roster_sha256": bad_sha})
        self.assertTrue(
            any("live roster document is not pinned to the exact supported schema/version" in r
                and "schema=" in r for r in ev["reasons"]),
            ev["reasons"],
        )

    def test_roster_wrong_live_version_blocks_with_zero_merge_calls(self):
        bad_roster = dict(tv.ROSTER, version="9.9")
        bad_sha = tv._dict_sha256(bad_roster)
        receipt = green_receipt()
        receipt["roster"]["version"] = "9.9"
        receipt["roster"]["sha256"] = bad_sha
        ev = self.assert_no_merge(receipt, roster=bad_roster,
                                   expectation_overrides={"roster_sha256": bad_sha})
        self.assertTrue(
            any("live roster document is not pinned to the exact supported schema/version" in r
                and "version=" in r for r in ev["reasons"]),
            ev["reasons"],
        )

    def test_check_manifest_wrong_live_schema_blocks_with_zero_merge_calls(self):
        bad_manifest = dict(tv.CHECK_MANIFEST, schema="nexus.board-release-required-checks.v9")
        bad_sha = tv._dict_sha256(bad_manifest)
        receipt = green_receipt()
        receipt["check_manifest"]["sha256"] = bad_sha
        ev = self.assert_no_merge(receipt, check_manifest=bad_manifest,
                                   expectation_overrides={"check_manifest_sha256": bad_sha})
        self.assertTrue(
            any("live required-check manifest is not pinned to the exact supported schema/version" in r
                and "schema=" in r for r in ev["reasons"]),
            ev["reasons"],
        )

    def test_check_manifest_wrong_live_version_blocks_with_zero_merge_calls(self):
        bad_manifest = dict(tv.CHECK_MANIFEST, version="9.9")
        bad_sha = tv._dict_sha256(bad_manifest)
        receipt = green_receipt()
        receipt["check_manifest"]["version"] = "9.9"
        receipt["check_manifest"]["sha256"] = bad_sha
        ev = self.assert_no_merge(receipt, check_manifest=bad_manifest,
                                   expectation_overrides={"check_manifest_sha256": bad_sha})
        self.assertTrue(
            any("live required-check manifest is not pinned to the exact supported schema/version" in r
                and "version=" in r for r in ev["reasons"]),
            ev["reasons"],
        )

    def test_activation_manifest_wrong_live_schema_blocks_with_zero_merge_calls(self):
        bad_manifest = dict(tv.ACTIVATION_MANIFEST, schema="nexus.ug-autonomy-001-activation.v9")
        bad_sha = tv._dict_sha256(bad_manifest)
        overrides = tv.full_activation_overrides()
        overrides["policy_activation"]["manifest"]["sha256"] = bad_sha
        overrides["changed_paths"] = list(tv.NEUTRAL_CHANGED_PATHS)
        overrides["required_checks"] = tv._default_required_checks(tv.NEUTRAL_CHANGED_PATHS)
        receipt = tv.make_receipt(**overrides)
        ev = self.assert_no_merge(receipt, activation_manifest=bad_manifest,
                                   expectation_overrides={"activation_manifest_sha256": bad_sha})
        self.assertTrue(
            any("live UG-AUTONOMY-001 activation manifest is not pinned to the exact supported "
                "schema/version" in r and "schema=" in r for r in ev["reasons"]),
            ev["reasons"],
        )

    def test_activation_manifest_wrong_live_version_blocks_with_zero_merge_calls(self):
        bad_manifest = dict(tv.ACTIVATION_MANIFEST, version="9.9")
        bad_sha = tv._dict_sha256(bad_manifest)
        overrides = tv.full_activation_overrides()
        overrides["policy_activation"]["manifest"]["version"] = "9.9"
        overrides["policy_activation"]["manifest"]["sha256"] = bad_sha
        overrides["changed_paths"] = list(tv.NEUTRAL_CHANGED_PATHS)
        overrides["required_checks"] = tv._default_required_checks(tv.NEUTRAL_CHANGED_PATHS)
        receipt = tv.make_receipt(**overrides)
        ev = self.assert_no_merge(receipt, activation_manifest=bad_manifest,
                                   expectation_overrides={"activation_manifest_sha256": bad_sha})
        self.assertTrue(
            any("live UG-AUTONOMY-001 activation manifest is not pinned to the exact supported "
                "schema/version" in r and "version=" in r for r in ev["reasons"]),
            ev["reasons"],
        )


class TestControllerCliHashIntegrity(unittest.TestCase):
    """Task 4: the controller must require independently supplied expected sha256 values for
    policy/roster/check-manifest/activation-manifest and compare them to the actual files on disk
    BEFORE ever calling the verifier or gh -- closing the circular same-file-hash trust bug."""

    def setUp(self):
        fd, self.state_path = tempfile.mkstemp(suffix=".json")
        os.close(fd)
        os.environ["FAKE_GH_STATE"] = self.state_path
        Path(self.state_path).write_text(json.dumps({
            "views": [OPEN_VIEW, OPEN_VIEW, MERGED_VIEW],
            "merge": {"merged": True, "sha": MERGE_SHA},
        }))
        self._adapter_dir = tempfile.TemporaryDirectory()
        self.gh_adapter = _write_gh_adapter(self._adapter_dir.name)

    def tearDown(self):
        try:
            os.remove(self.state_path)
        finally:
            try:
                os.environ.pop("FAKE_GH_STATE", None)
            finally:
                self._adapter_dir.cleanup()

    def _write_fixtures(self, tmp, receipt):
        receipt_path = Path(tmp) / "receipt.json"
        roster_path = Path(tmp) / "roster.json"
        constitution_path = Path(tmp) / "constitution.md"
        check_manifest_path = Path(tmp) / "check_manifest.json"
        activation_manifest_path = Path(tmp) / "activation.json"
        evidence_index_path = Path(tmp) / "evidence_index.json"
        ei = _evidence_index_for(receipt)
        ei_sha = tv._dict_sha256(ei)
        receipt["evidence_index"] = {
            "path": tv.EXPECTED_EVIDENCE_INDEX_PATH, "schema": tv.EVIDENCE_INDEX_SCHEMA,
            "version": ei["version"], "sha256": ei_sha,
        }
        receipt_path.write_text(json.dumps(receipt))
        roster_path.write_bytes(tv.ROSTER_PATH.read_bytes())
        constitution_path.write_bytes(tv.POLICY_PATH.read_bytes())
        check_manifest_path.write_bytes(tv.CHECK_MANIFEST_PATH.read_bytes())
        activation_manifest_path.write_bytes(tv.ACTIVATION_MANIFEST_PATH.read_bytes())
        evidence_index_path.write_text(json.dumps(ei, sort_keys=True))
        return (receipt_path, roster_path, constitution_path, check_manifest_path,
                activation_manifest_path, evidence_index_path, ei_sha)

    def _argv(self, paths, **hash_overrides):
        (receipt_path, roster_path, constitution_path, check_manifest_path,
         activation_manifest_path, evidence_index_path, ei_sha) = paths
        hashes = {
            "policy": tv.POLICY_SHA, "roster": tv.ROSTER_SHA,
            "check_manifest": tv.CHECK_MANIFEST_SHA, "activation_manifest": tv.ACTIVATION_MANIFEST_SHA,
            "evidence_index": ei_sha,
        }
        hashes.update(hash_overrides)
        return [
            "--gh", self.gh_adapter, "--repo", REPO, "--pr", str(PR),
            "--receipt", str(receipt_path), "--roster", str(roster_path),
            "--constitution", str(constitution_path), "--check-manifest", str(check_manifest_path),
            "--evidence-index", str(evidence_index_path),
            "--activation-manifest", str(activation_manifest_path),
            "--expect-policy-path", tv.EXPECTED_POLICY_PATH,
            "--expect-policy-version", tv.EXPECTED_POLICY_VERSION,
            "--expect-roster-path", tv.EXPECTED_ROSTER_PATH,
            "--expect-check-manifest-path", tv.EXPECTED_CHECK_MANIFEST_PATH,
            "--expect-evidence-index-path", tv.EXPECTED_EVIDENCE_INDEX_PATH,
            "--expect-activation-manifest-path", tv.EXPECTED_ACTIVATION_MANIFEST_PATH,
            "--expect-policy-sha256", hashes["policy"],
            "--expect-roster-sha256", hashes["roster"],
            "--expect-check-manifest-sha256", hashes["check_manifest"],
            "--expect-evidence-index-sha256", hashes["evidence_index"],
            "--expect-activation-manifest-sha256", hashes["activation_manifest"],
            "--now", "2026-07-24T12:00:00+00:00",
        ]

    def _run_cli(self, argv):
        return subprocess.run(
            [sys.executable, str(Path(PKG, "controller.py"))] + argv,
            capture_output=True, text=True,
        )

    def test_cli_matching_expected_hashes_green_path_merges(self):
        with tempfile.TemporaryDirectory() as tmp:
            paths = self._write_fixtures(tmp, green_receipt())
            proc = self._run_cli(self._argv(paths))
            payload = json.loads(proc.stdout)
            self.assertTrue(payload["merged"], payload)
            self.assertEqual(proc.returncode, 0)

    def test_cli_wrong_expected_policy_hash_blocks_before_any_gh_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            paths = self._write_fixtures(tmp, green_receipt())
            proc = self._run_cli(self._argv(paths, policy="0" * 64))
            self.assertEqual(proc.returncode, 1)
            self.assertEqual(proc.stderr, "")
            payload = json.loads(proc.stdout)
            self.assertFalse(payload["merged"])
            self.assertTrue(any("policy" in r and "hash" in r for r in payload["reasons"]), payload["reasons"])
            calls = json.loads(Path(self.state_path).read_text()).get("_calls", [])
            self.assertEqual(calls, [])

    def test_cli_malformed_expected_hash_format_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            paths = self._write_fixtures(tmp, green_receipt())
            proc = self._run_cli(self._argv(paths, roster="not-hex-at-all"))
            self.assertEqual(proc.returncode, 1)
            payload = json.loads(proc.stdout)
            self.assertFalse(payload["merged"])

    def test_cli_missing_receipt_file_returns_structured_json_not_traceback(self):
        with tempfile.TemporaryDirectory() as tmp:
            paths = self._write_fixtures(tmp, green_receipt())
            argv = self._argv(paths)
            missing = str(Path(tmp) / "does-not-exist.json")
            argv[argv.index(str(paths[0]))] = missing
            proc = self._run_cli(argv)
            self.assertEqual(proc.returncode, 1)
            self.assertEqual(proc.stderr, "")
            payload = json.loads(proc.stdout)
            self.assertFalse(payload["merged"])


if __name__ == "__main__":
    unittest.main()
