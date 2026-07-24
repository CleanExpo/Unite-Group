"""m14a exact data-contract repair tests (Codex frozen-candidate-v3 rejection round).

Covers: (1) live changed-file COUNT completeness in the controller, (2) exact evidence-index/record
schema+version+kind+event-timestamp contracts, (3) zero future receipt issuance, (4) read-only
checkout purity (no chmod of repository members), (5) governing-document consistency with
UG-AUTONOMY-001.

Run: python3 -m unittest tests.test_m14a_contract_repairs -v
"""
import json
import os
import sys
import unittest
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(HERE)
sys.path.insert(0, PKG)
sys.path.insert(0, HERE)

import test_verifier as tv  # noqa: E402
import test_controller as tc  # noqa: E402

NEUTRAL = list(tv.NEUTRAL_CHANGED_PATHS)


def _bind_index(receipt, ei):
    """Bind a (possibly attacker-mutated) evidence index to the receipt so the ONLY defect under
    test is the semantic one, never a trivial hash/version drift between receipt block and index."""
    sha = tv._dict_sha256(ei)
    receipt["evidence_index"] = {
        "path": tv.EXPECTED_EVIDENCE_INDEX_PATH,
        "schema": tv.EVIDENCE_INDEX_SCHEMA,
        "version": ei.get("version"),
        "sha256": sha,
    }
    return tv.run_verify(
        receipt, sync_evidence_index=False, evidence_index=ei, evidence_index_sha256=sha,
        expected_changed_paths=NEUTRAL,
    )


def _neutral_receipt_and_index():
    receipt = tv.make_receipt(**tv.neutral_activation_overrides())
    ei = tv.make_evidence_index(tv._collect_evidence_refs(receipt))
    return receipt, ei


# --- Task 1: live file-count completeness (controller) ---

class TestLiveFileCountCompleteness(tc.ControllerCase):
    REASON = "could not independently observe the live PR's changed-file set"

    def _blocked_before_verification(self, view):
        ev = self.assert_no_merge(tc.green_receipt(), {"views": [view]})
        self.assertTrue(any(self.REASON in r for r in ev["reasons"]), ev["reasons"])
        self.assertFalse(any("verifier did not authorise" in r for r in ev["reasons"]), ev["reasons"])

    def test_exact_codex_case_empty_files_with_changed_files_1_blocks(self):
        self._blocked_before_verification(dict(tc.OPEN_VIEW, files=[], changedFiles=1))

    def test_missing_changed_files_count_blocks(self):
        view = dict(tc.OPEN_VIEW)
        view.pop("changedFiles", None)
        self._blocked_before_verification(view)

    def test_boolean_changed_files_count_blocks(self):
        self._blocked_before_verification(dict(tc.OPEN_VIEW, changedFiles=True))

    def test_negative_changed_files_count_blocks(self):
        self._blocked_before_verification(dict(tc.OPEN_VIEW, changedFiles=-1))

    def test_count_mismatch_blocks(self):
        self._blocked_before_verification(
            dict(tc.OPEN_VIEW, changedFiles=len(NEUTRAL) + 1))

    def test_duplicate_live_paths_block(self):
        files = [{"path": NEUTRAL[0]}, {"path": NEUTRAL[0]}]
        self._blocked_before_verification(dict(tc.OPEN_VIEW, files=files, changedFiles=2))

    def test_positive_control_consistent_count_merges(self):
        view = dict(tc.OPEN_VIEW, changedFiles=len(NEUTRAL))
        merged_view = dict(tc.MERGED_VIEW, changedFiles=len(NEUTRAL))
        ev, merge_calls = self.run_it(
            tc.green_receipt(), {"views": [view, view, merged_view]})
        self.assertTrue(ev["merged"], ev["reasons"])
        self.assertEqual(len(merge_calls), 1)


# --- Task 2: evidence-record exact contracts (verifier) ---

class TestEvidenceExactContracts(unittest.TestCase):
    def test_version_999_index_and_records_cannot_authorise_merge(self):
        receipt, ei = _neutral_receipt_and_index()
        ei["version"] = "999.0"
        for rec in ei["records"].values():
            rec["version"] = "999.0"
        result = _bind_index(receipt, ei)
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(any("version" in r for r in result.reasons), result.reasons)

    def test_all_kinds_builder_cannot_authorise_merge(self):
        receipt, ei = _neutral_receipt_and_index()
        for rec in ei["records"].values():
            rec["kind"] = "builder"
        result = _bind_index(receipt, ei)
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(any("kind" in r for r in result.reasons), result.reasons)

    def test_event_timestamp_disagreement_rejects(self):
        receipt, ei = _neutral_receipt_and_index()
        ref = receipt["decisions"][0]["evidence_ref"]
        ei["records"][ref]["timestamp"] = "2026-07-24T11:45:00+00:00"
        result = _bind_index(receipt, ei)
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("timestamp" in r for r in result.reasons), result.reasons)

    def test_duplicate_evidence_reference_rejects(self):
        receipt = tv.make_receipt(**tv.neutral_activation_overrides())
        receipt["independent_review"]["evidence_ref"] = receipt["builder"]["evidence_ref"]
        ei = tv.make_evidence_index(tv._collect_evidence_refs(receipt))
        result = _bind_index(receipt, ei)
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(
            any("duplicate" in r or "ambiguous" in r for r in result.reasons), result.reasons)

    def test_rejection_repair_event_timestamp_mismatch_rejects(self):
        receipt = tv.make_receipt(**tv.neutral_activation_overrides())
        repair_ref = tv._ref("repair-9")
        receipt["rejection_ledger"]["items"] = [
            {"id": "rej-9", "resolved": True, "repaired": True, "repair_ref": repair_ref,
             "review_ref": tv._ref("review-9"), "re_reviewed_on_head": tv.HEAD,
             "repair_event_timestamp": "2026-07-24T11:30:00+00:00",
             "review_event_timestamp": "2026-07-24T11:30:00+00:00"}
        ]
        ei = tv.make_evidence_index(tv._collect_evidence_refs(receipt))
        ei["records"][repair_ref]["timestamp"] = "2026-07-24T11:31:00+00:00"
        result = _bind_index(receipt, ei)
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("event timestamp mismatch" in r for r in result.reasons), result.reasons)

    def test_positive_control_exact_contracts_authorise_merge(self):
        receipt = tv.make_receipt(**tv.neutral_activation_overrides())
        result = tv.run_verify(receipt, expected_changed_paths=NEUTRAL)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertTrue(result.merge_authorised, result.merge_reasons)


# --- Task 3: zero future receipt issuance ---

class TestZeroFutureIssuance(unittest.TestCase):
    def test_issued_at_equal_to_now_passes(self):
        receipt = tv.make_receipt(issued_at="2026-07-24T12:00:00+00:00")
        result = tv.run_verify(receipt)
        self.assertTrue(result.board_release_ready, result.reasons)

    def test_issued_at_one_second_future_rejects(self):
        receipt = tv.make_receipt(issued_at="2026-07-24T12:00:01+00:00")
        result = tv.run_verify(receipt)
        self.assertFalse(result.board_release_ready)
        self.assertTrue(
            any("issued_at is in the future" in r for r in result.reasons), result.reasons)


# --- Task 4: read-only checkout purity ---

class TestReadOnlyCheckoutPurity(unittest.TestCase):
    def test_no_chmod_of_repository_fake_gh(self):
        src = Path(HERE, "test_controller.py").read_text()
        self.assertNotIn("os.chmod(FAKE_GH", src)
        self.assertNotIn("import stat", src)


# --- Task 5: governing-document consistency with UG-AUTONOMY-001 ---

DESIGN = tv.REPO_ROOT / "docs/superpowers/specs/2026-07-24-hermes-senior-board-continuity-design.md"
PLAN_JSON = tv.REPO_ROOT / "docs/superpowers/plans/2026-07-24-hermes-senior-board-continuity-plan.json"
PLAN_YAML = tv.REPO_ROOT / "docs/superpowers/plans/2026-07-24-hermes-senior-board-continuity-plan.yaml"
ADDENDUM = tv.POLICY_PATH
README = Path(PKG, "README.md")

REPOS = ("CleanExpo/Unite-Group", "CleanExpo/CARSI", "CleanExpo/RestoreAssist")


class TestGoverningDocsContract(unittest.TestCase):
    def test_design_reconciled_with_ug_autonomy_001(self):
        text = DESIGN.read_text()
        self.assertIn("UG-AUTONOMY-001", text)
        for repo in REPOS:
            self.assertIn(repo, text)
        self.assertIn("founder-manual", text)
        self.assertIn("Deployment remains separately founder-only", text)
        # Stale, pre-UG-AUTONOMY-001 phrases must never return.
        self.assertNotIn("human merge only, no auto-execute", text)
        self.assertNotIn("Three gates remain Phill-only", text)

    def _plan_text_contract(self, text):
        self.assertIn("UG-AUTONOMY-001", text)
        for repo in REPOS:
            self.assertIn(repo, text)
        self.assertIn("irreversible_action_without_tested_rollback", text)
        self.assertIn("production_deployment", text)
        self.assertIn("missing_privilege", text)
        self.assertIn("unresolved_authority_conflict", text)
        self.assertNotIn("hermes_production_merge_deploy_control", text)

    def test_plan_json_reconciled_and_parses(self):
        text = PLAN_JSON.read_text()
        json.loads(text)
        self._plan_text_contract(text)

    def test_plan_yaml_reconciled_and_parses(self):
        text = PLAN_YAML.read_text()
        try:
            import yaml
        except ImportError:
            pass
        else:
            yaml.safe_load(text)
        self._plan_text_contract(text)

    def test_plan_summaries_defer_to_addendum_and_use_exact_protected_globs(self):
        for path in (PLAN_JSON, PLAN_YAML):
            text = path.read_text()
            self.assertIn("Non-authoritative summary", text, path)
            self.assertIn("ADDENDUM-001", text, path)
            self.assertIn("docs/constitution/**", text, path)
            self.assertIn("tools/board-release-verifier/**", text, path)

    def test_git_diff_check_covers_committed_pr_comparison(self):
        manifest = json.loads(tv.CHECK_MANIFEST_PATH.read_text())
        check = next(c for c in manifest["required_checks"] if c["id"] == "git-diff-check")
        self.assertEqual(check["command"], ["git", "diff", "--check", "origin/main...HEAD"])

    def test_addendum_documents_zero_future_issuance(self):
        text = ADDENDUM.read_text()
        self.assertIn("zero future issuance", text)
        self.assertIn("issued_at", text)

    def test_readme_documents_zero_future_issuance(self):
        text = README.read_text()
        self.assertIn("zero future issuance", text)
        self.assertIn("no grace period", text)

    def test_addendum_and_readme_name_both_protected_path_families(self):
        for path in (ADDENDUM, README):
            text = path.read_text()
            self.assertIn("docs/constitution/**", text, path)
            self.assertIn("tools/board-release-verifier/**", text, path)

    VERIFIER_MANDATORY_FLAGS = (
        "--receipt", "--roster", "--constitution", "--check-manifest", "--evidence-index",
        "--expect-repo", "--expect-base", "--expect-head-sha", "--expect-pr",
        "--expect-policy-path", "--expect-policy-version", "--expect-roster-path",
        "--expect-check-manifest-path", "--expect-evidence-index-path",
        "--expect-policy-sha256", "--expect-roster-sha256", "--expect-check-manifest-sha256",
        "--expect-evidence-index-sha256",
    )
    CONTROLLER_MANDATORY_FLAGS = (
        "--gh", "--repo", "--pr", "--receipt", "--roster", "--constitution", "--check-manifest",
        "--evidence-index", "--activation-manifest", "--expect-policy-path",
        "--expect-policy-version", "--expect-roster-path", "--expect-check-manifest-path",
        "--expect-evidence-index-path", "--expect-activation-manifest-path",
        "--expect-policy-sha256", "--expect-roster-sha256", "--expect-check-manifest-sha256",
        "--expect-evidence-index-sha256", "--expect-activation-manifest-sha256",
    )

    def test_readme_verifier_command_contains_every_mandatory_flag(self):
        text = README.read_text()
        block = text.split("```bash", 1)[1].split("```", 1)[0]
        for flag in self.VERIFIER_MANDATORY_FLAGS:
            self.assertIn(flag + " ", block, flag)

    def test_readme_controller_command_contains_every_mandatory_flag(self):
        text = README.read_text()
        blocks = text.split("```bash")
        controller_block = next(b for b in blocks if "python3 controller.py" in b).split("```", 1)[0]
        for flag in self.CONTROLLER_MANDATORY_FLAGS:
            self.assertIn(flag + " ", controller_block, flag)


# --- v4 independent review round 2: deterministic negative matrix. Every case mutates exactly one
# field of a canonical valid (neutral, fully activation-qualified) fixture. ---

class TestEvidenceReferenceIdentity(unittest.TestCase):
    """Finding 1: the central 64-hex evidence-reference identity validator must reject every
    malformed value with a structured reason, never raise, and never authorise merge on that ref."""

    def test_non_sha_string_ref_rejected(self):
        receipt, ei = _neutral_receipt_and_index()
        receipt["builder"]["evidence_ref"] = "builder-log-1"
        result = _bind_index(receipt, ei)
        self.assertFalse(result.candidate_verified, result.reasons)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(any("not a well-formed evidence reference" in r for r in result.reasons), result.reasons)

    def test_uppercase_sha_ref_rejected(self):
        receipt, ei = _neutral_receipt_and_index()
        receipt["builder"]["evidence_ref"] = receipt["builder"]["evidence_ref"].upper()
        result = _bind_index(receipt, ei)
        self.assertFalse(result.candidate_verified, result.reasons)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(any("not a well-formed evidence reference" in r for r in result.reasons), result.reasons)

    def test_list_ref_rejected_without_raising(self):
        receipt, ei = _neutral_receipt_and_index()
        receipt["decisions"][0]["evidence_ref"] = ["not", "a", "string"]
        result = _bind_index(receipt, ei)
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(any("not a well-formed evidence reference" in r for r in result.reasons), result.reasons)

    def test_dict_ref_rejected_without_raising(self):
        receipt, ei = _neutral_receipt_and_index()
        receipt["rollback"]["evidence_ref"] = {"sha": "x"}
        result = _bind_index(receipt, ei)
        self.assertFalse(result.merge_authorised)
        self.assertTrue(
            any("not a well-formed evidence reference" in r for r in result.merge_reasons),
            result.merge_reasons,
        )

    def test_valid_lowercase_sha_ref_authenticates(self):
        receipt, ei = _neutral_receipt_and_index()
        result = _bind_index(receipt, ei)
        self.assertTrue(result.candidate_verified, result.reasons)
        self.assertTrue(result.board_release_ready, result.reasons)
        self.assertTrue(result.merge_authorised, result.merge_reasons)


class TestExitCodeStrictInteger(unittest.TestCase):
    """Finding 2: exit_code must be the exact Python int 0 -- bool (an int subclass), string, and
    nonzero values are all rejected."""

    def _with_exit_code(self, value):
        receipt = tv.make_receipt()
        receipt["required_checks"][0]["exit_code"] = value
        return tv.run_verify(receipt)

    def test_false_exit_code_rejected(self):
        result = self._with_exit_code(False)
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("exit_code must be exactly the integer 0" in r for r in result.reasons), result.reasons)

    def test_true_exit_code_rejected(self):
        result = self._with_exit_code(True)
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("exit_code must be exactly the integer 0" in r for r in result.reasons), result.reasons)

    def test_string_zero_exit_code_rejected(self):
        result = self._with_exit_code("0")
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("exit_code must be exactly the integer 0" in r for r in result.reasons), result.reasons)

    def test_integer_one_exit_code_rejected(self):
        result = self._with_exit_code(1)
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("exit_code must be exactly the integer 0" in r for r in result.reasons), result.reasons)

    def test_valid_integer_zero_exit_code_passes(self):
        result = self._with_exit_code(0)
        self.assertTrue(result.board_release_ready, result.reasons)


class TestReceiptChangedPathsShape(unittest.TestCase):
    """Finding 3: receipt changed_paths must be a list of unique, non-empty strings -- duplicates
    are never collapsed via set comparison."""

    def test_duplicate_path_rejected(self):
        dup = [NEUTRAL[0], NEUTRAL[0]]
        receipt = tv.make_receipt(changed_paths=dup, required_checks=tv._default_required_checks(dup))
        result = tv.run_verify(receipt, expected_changed_paths=dup)
        self.assertFalse(result.candidate_verified, result.reasons)
        self.assertTrue(any("unique paths" in r for r in result.reasons), result.reasons)

    def test_empty_string_path_rejected(self):
        paths = [NEUTRAL[0], ""]
        receipt = tv.make_receipt(changed_paths=paths, required_checks=tv._default_required_checks(paths))
        result = tv.run_verify(receipt, expected_changed_paths=paths)
        self.assertFalse(result.candidate_verified, result.reasons)
        self.assertTrue(any("list of non-empty strings" in r for r in result.reasons), result.reasons)

    def test_non_string_path_rejected(self):
        # expected_changed_paths is independently-supplied, pre-validated live data (the
        # controller's _live_changed_paths already guarantees a list of strings) -- only the
        # RECEIPT's own claim is under test here, so the live side is left unsupplied.
        receipt = tv.make_receipt(changed_paths=[NEUTRAL[0], 7])
        result = tv.run_verify(receipt, expected_changed_paths=None)
        self.assertFalse(result.candidate_verified, result.reasons)
        self.assertTrue(any("list of non-empty strings" in r for r in result.reasons), result.reasons)

    def test_valid_unique_paths_pass(self):
        receipt = tv.make_receipt(**tv.neutral_activation_overrides())
        result = tv.run_verify(receipt, expected_changed_paths=NEUTRAL)
        self.assertTrue(result.candidate_verified, result.reasons)


class TestControllerDuplicateReceiptChangedPaths(tc.ControllerCase):
    def test_duplicate_receipt_changed_paths_makes_zero_merge_calls(self):
        dup = [NEUTRAL[0], NEUTRAL[0]]
        receipt = tc.green_receipt(changed_paths=dup, required_checks=tv._default_required_checks(dup))
        view = dict(tc.OPEN_VIEW, files=[{"path": NEUTRAL[0]}], changedFiles=1)
        ev = self.assert_no_merge(receipt, {"views": [view]})
        self.assertTrue(
            any("unique paths" in r or "verifier did not authorise" in r for r in ev["reasons"]),
            ev["reasons"],
        )


class TestLiveFileCountCompletenessAdditional(tc.ControllerCase):
    """Finding 4: changedFiles matrix additions (string, float) not yet covered by
    TestLiveFileCountCompleteness."""

    REASON = "could not independently observe the live PR's changed-file set"

    def test_string_changed_files_count_blocks(self):
        view = dict(tc.OPEN_VIEW, changedFiles=str(len(NEUTRAL)))
        ev = self.assert_no_merge(tc.green_receipt(), {"views": [view]})
        self.assertTrue(any(self.REASON in r for r in ev["reasons"]), ev["reasons"])

    def test_float_changed_files_count_blocks(self):
        view = dict(tc.OPEN_VIEW, changedFiles=float(len(NEUTRAL)))
        ev = self.assert_no_merge(tc.green_receipt(), {"views": [view]})
        self.assertTrue(any(self.REASON in r for r in ev["reasons"]), ev["reasons"])


class TestEvidenceRecordFieldMatrix(unittest.TestCase):
    """Finding 5: each evidence-record field, individually wrong, must fail closed in isolation --
    mutating only one field of the builder's evidence record at a time."""

    def _mutated(self, mutate):
        receipt, ei = _neutral_receipt_and_index()
        ref = receipt["builder"]["evidence_ref"]
        mutate(ei["records"][ref])
        return _bind_index(receipt, ei)

    def test_wrong_schema_rejected(self):
        result = self._mutated(lambda rec: rec.__setitem__("schema", "nexus.board-release-evidence-record.v9"))
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("evidence-record schema" in r for r in result.reasons), result.reasons)

    def test_wrong_version_rejected(self):
        result = self._mutated(lambda rec: rec.__setitem__("version", "9.9"))
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("record.version must be exactly" in r for r in result.reasons), result.reasons)

    def test_wrong_repo_rejected(self):
        result = self._mutated(lambda rec: rec.__setitem__("repo", "someone/else"))
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("record.repo" in r for r in result.reasons), result.reasons)

    def test_wrong_pr_rejected(self):
        result = self._mutated(lambda rec: rec.__setitem__("pr", 9999))
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("record.pr" in r for r in result.reasons), result.reasons)

    def test_wrong_head_sha_rejected(self):
        result = self._mutated(lambda rec: rec.__setitem__("head_sha", tv.OTHER_HEAD))
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("record.head_sha" in r for r in result.reasons), result.reasons)

    def test_wrong_kind_rejected(self):
        result = self._mutated(lambda rec: rec.__setitem__("kind", "rollback"))
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("record.kind" in r for r in result.reasons), result.reasons)

    def test_wrong_digest_identity_rejected(self):
        result = self._mutated(lambda rec: rec.__setitem__("digest", "f" * 64))
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("record.digest" in r for r in result.reasons), result.reasons)

    def test_wrong_event_timestamp_rejected(self):
        result = self._mutated(lambda rec: rec.__setitem__("timestamp", "2026-07-24T09:00:00+00:00"))
        self.assertFalse(result.board_release_ready, result.reasons)
        self.assertTrue(any("event timestamp mismatch" in r for r in result.reasons), result.reasons)


if __name__ == "__main__":
    unittest.main()
