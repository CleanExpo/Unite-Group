#!/usr/bin/env python3
"""Dependency-free, fail-closed verifier for a Hermes Senior Board release receipt (schema v2).

Implements ADDENDUM-001 (docs/constitution/ADDENDUM-001-board-release-authority-for-verified-prs-v1.0.md,
founder ruling 24/07/2026) plus the independent Codex pre-build challenge repairs (m14a, two rounds): a
versioned receipt schema, an independently supplied trusted PR snapshot (repo/PR/base/HEAD/changed-file
set), an independently supplied evidence index resolving every evidence reference to an authenticated,
fresh record, a frozen repo-bound required-check manifest, and strict builder/reviewer role separation.

This tool validates a receipt JSON document and NEVER calls gh/git push/merge/deploy, makes no
network calls, and NEVER claims production is merged or that merge/deploy authority exists. It
produces four separate, non-aliased states:

  candidate_verified    -- the artefact itself (deterministic checks rerun outside the builder,
                            builder/reviewer attestations, every evidence reference authenticated
                            against an independently supplied evidence index, an independently
                            observed live changed-file set matching the receipt's declared claim)
                            is technically sound, bound to one exact repo/PR/HEAD.
  board_release_ready   -- candidate_verified AND the eligible Board roster unanimously APPROVEd on
                            the same exact HEAD, the rejection ledger is closed, no direct-spend/
                            constitutional-change/out-of-scope/etc flag is raised, and the receipt
                            is unexpired.
  merge_authorised      -- board_release_ready AND every UG-AUTONOMY-001 activation gate. UG-AUTONOMY-001
                            (founder-ratified 24/07/2026, CleanExpo/Unite-Group, CARSI and RestoreAssist
                            only) permits a deterministic controller to auto-merge an exact-HEAD
                            candidate once it is board_release_ready in an eligible repo, is
                            non-constitutional (verified against the independently observed live
                            changed-file set, never the receipt's bare claim), and carries complete,
                            exact-HEAD activation evidence bound to an independently supplied,
                            hash-bound activation manifest. Eligibility is DERIVED from that manifest
                            -- there is no hardcoded gate. A constitutional candidate can never
                            self-authorise; constitutional amendments remain founder-only. This
                            verifier still never merges -- authorisation is a signal a separate,
                            fail-closed controller consumes; see controller.py.
  deployment_authorised -- ALWAYS false in this m14a build: no deployment executor is implemented.
                            Strictly separate from merge_authorised and never implied by it.

board_release_ready is evidence a human merge-approver may use. merge_authorised is the machine
precondition the separate merge controller requires before it may attempt one SHA-guarded merge.
Neither field, nor deployment_authorised, is itself a merge or deploy, or a substitute for the
controller's own live-HEAD re-read and post-merge verification guards.

Tests: python3 -m unittest discover -s tests -v
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
GIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
APPROVE = "APPROVE"
PASSED = "passed"
NOT_APPLICABLE = "not_applicable"

RECEIPT_SCHEMA = "nexus.board-release-receipt.v2"
ROSTER_SCHEMA = "nexus.board-release-roster.v1"
CHECK_MANIFEST_SCHEMA = "nexus.board-release-required-checks.v1"
ACTIVATION_MANIFEST_SCHEMA = "nexus.ug-autonomy-001-activation.v1"
EVIDENCE_INDEX_SCHEMA = "nexus.board-release-evidence-index.v1"
EVIDENCE_RECORD_SCHEMA = "nexus.board-release-evidence-record.v1"
# Exact version literals. A well-formed schema string with an unknown/attacker version (e.g.
# "999.0") is rejected -- schema AND version must both match exactly, for the index and for every
# resolved record.
EVIDENCE_INDEX_VERSION = "1.0"
# Exact supported schema+version for the three independently hash-bound LIVE trust documents
# (roster, required-check manifest, activation manifest). Hash binding alone is not schema
# admission -- a receipt and a live document can otherwise agree on an attacker-controlled version
# (e.g. "999.0") and still authorise a merge. These are checked against the live document itself,
# independently of whatever version the receipt's own metadata claims.
ROSTER_SUPPORTED_VERSION = "1.0"
CHECK_MANIFEST_SUPPORTED_VERSION = "1.2"
ACTIVATION_MANIFEST_SUPPORTED_VERSION = "1.0"
EVIDENCE_RECORD_VERSION = "1.0"
# Closed enum of legitimate evidence categories. A record's declared "kind" must be a member of
# this set -- an attacker-supplied kind (e.g. "board_vote") is rejected even if the record is
# otherwise well-formed and keyed under the correct ref. Some refs are legitimately reused across
# more than one category (e.g. the same reviewer log backs both the independent_review attestation
# and that reviewer's board vote), so membership, not exact per-call-site equality, is checked.
EVIDENCE_RECORD_KINDS = frozenset({
    "builder", "independent_review", "decisions", "required_checks",
    "rejection_ledger", "rollback", "post_deployment_verification_plan",
    "policy_activation",
})

# UG-AUTONOMY-001 activation-evidence field contracts. Exact key sets: any unknown or missing field
# fails closed, so a receipt can never smuggle an under-specified activation block past the gate.
ACTIVATION_KEYS = frozenset({"reconciled", "manifest", "restart_canary_evidence"})
ACTIVATION_MANIFEST_KEYS = frozenset({"path", "schema", "version", "sha256"})
CANARY_KEYS = frozenset({"head_sha", "evidence_digest", "trust_domain", "event_timestamp"})
EVIDENCE_INDEX_BLOCK_KEYS = frozenset({"path", "schema", "version", "sha256"})

MAX_RECEIPT_TTL = dt.timedelta(hours=24)
# Evidence (checks, votes, review, rejection repair/review, rollback, canary) older than this
# relative to the receipt's issued_at is stale and fails closed, regardless of HEAD matching.
MAX_EVIDENCE_AGE = dt.timedelta(hours=24)

REQUIRED_TOP_LEVEL_KEYS = frozenset(
    {
        "schema", "receipt_id", "repo", "pr", "base", "head_sha",
        "policy", "roster", "check_manifest", "evidence_index",
        "builder", "independent_review",
        "decisions", "required_checks",
        "rejection_ledger",
        "direct_spend", "constitutional_change", "out_of_scope",
        "missing_privilege", "authority_conflict", "unapproved_infrastructure",
        "rollback", "post_deployment_verification_plan",
        "policy_activation",
        "changed_paths",
        "issued_at", "expires_at",
    }
)

PRODUCTION_CONTROL_NOTICE = (
    "This verdict records Board release review closure under ADDENDUM-001, and -- where "
    "merge_authorised is true -- that every UG-AUTONOMY-001 activation gate is satisfied for this "
    "exact HEAD, including an independently observed live changed-file set and independently "
    "authenticated evidence. It is not itself a merge. This tool never calls gh, git push, merge, or "
    "deploy, and does not claim production has been merged or deployed. deployment_authorised is "
    "ALWAYS false in this build: no deployment executor is implemented, and merge_authorised never "
    "implies deployment authority. Under the founder-ratified UG-AUTONOMY-001 exception "
    "(CleanExpo/Unite-Group, CARSI and RestoreAssist only), a separate fail-closed merge controller "
    "may consume a merge_authorised=true verdict and, after independently re-reading the live PR "
    "HEAD and independently verifying the post-merge state, perform one SHA-guarded merge. The "
    "separate production merge/deploy approval control (CLAUDE.md 'Global PR release law' / the "
    "pr-release-gate skill) still governs any repo or change outside that named, activated scope, "
    "and constitutional amendments remain founder-only and can never self-authorise."
)


DEPLOYMENT_NOT_IMPLEMENTED_REASON = (
    "deployment_authorised is always false in this m14a build: no deployment executor is "
    "implemented; deployment is out of scope and is never implied by merge_authorised"
)


class VerifyResult:
    def __init__(self, candidate_verified, board_release_ready, merge_authorised,
                 reasons, merge_reasons, receipt_id, head_sha,
                 deployment_authorised=False, deployment_reasons=None):
        self.candidate_verified = candidate_verified
        self.board_release_ready = board_release_ready
        self.merge_authorised = merge_authorised
        self.reasons = reasons
        self.merge_reasons = merge_reasons
        self.receipt_id = receipt_id
        self.head_sha = head_sha
        self.deployment_authorised = deployment_authorised
        self.deployment_reasons = deployment_reasons if deployment_reasons is not None else [
            DEPLOYMENT_NOT_IMPLEMENTED_REASON
        ]

    @property
    def ready(self):
        return self.board_release_ready

    def verdict(self):
        return "BOARD_RELEASE_READY" if self.board_release_ready else "REJECTED"

    def to_dict(self):
        payload = {
            "verdict": self.verdict(),
            "candidate_verified": self.candidate_verified,
            "board_release_ready": self.board_release_ready,
            "merge_authorised": self.merge_authorised,
            "merge_reasons": self.merge_reasons,
            "deployment_authorised": self.deployment_authorised,
            "deployment_reasons": self.deployment_reasons,
            "reasons": self.reasons,
            "receipt_id": self.receipt_id,
            "head_sha": self.head_sha,
            "production_control_notice": PRODUCTION_CONTROL_NOTICE,
        }
        payload["deterministic_digest"] = _deterministic_digest(payload)
        return payload


def _deterministic_digest(payload):
    canonical = json.dumps(
        {k: v for k, v in payload.items() if k != "deterministic_digest"},
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def sha256_file(path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def verify_expected_hashes(entries):
    """entries: list of (label, path, expected_sha256). Returns a list of reasons; empty iff every
    expected hash is a well-formed 64-hex digest AND matches the live file on disk. Never raises.
    This is the single, shared trust-anchor gate: the label/path pair alone (as a file the same
    process happens to read) is never treated as proof -- only a value independently supplied by
    the CALLER, and cross-checked against the live bytes, closes the loop. Used by both the
    verifier CLI and the merge controller so neither can self-derive its own expectations."""
    reasons = []
    for label, path, expected in entries:
        if not _is_sha256(expected):
            reasons.append("--expect-%s-sha256 is not a 64-character hex digest: %r" % (label, expected))
            continue
        try:
            live = sha256_file(path)
        except OSError as exc:
            reasons.append("%s file could not be read (%s): %s" % (label, path, exc))
            continue
        if live != expected:
            reasons.append(
                "%s hash drift: file-on-disk=%s independently-expected=%s -- refusing to trust this file"
                % (label, live, expected)
            )
    return reasons


def _parse_timestamp(value, add_reason, label):
    if not isinstance(value, str) or not value:
        add_reason("%s is missing or not a string" % label)
        return None
    normalised = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = dt.datetime.fromisoformat(normalised)
    except ValueError:
        add_reason("%s is not a valid ISO 8601 timestamp: %r" % (label, value))
        return None
    if parsed.tzinfo is None:
        add_reason("%s has no timezone offset: %r" % (label, value))
        return None
    return parsed


def _is_bool(value):
    return isinstance(value, bool)


def _is_nonempty_str(value):
    return isinstance(value, str) and value != ""


def _is_sha256(value):
    return isinstance(value, str) and bool(SHA256_RE.match(value))


def _resolve_evidence(ref, kind, evidence_index, now, issued_at, add,
                       expected_repo=None, expected_pr=None, expected_head_sha=None,
                       expected_kind=None, expected_event_timestamp=None,
                       expected_check_id=None, seen_refs=None):
    """Authenticate one evidence reference against the independently supplied evidence index. A
    syntactically valid but unresolved/unverified/stale/future/contradictory reference fails
    closed -- a non-empty string or a well-formed hex digest is never, by itself, evidence, and an
    independently expected hash on the evidence-index BYTES never makes a semantically invalid
    record valid: every resolved record must itself carry the correct schema and be exactly bound
    to this repo/PR/HEAD/kind/digest, not merely be present and "verified".

    The identity check below is the single central validator for every evidence reference/digest
    in this receipt (builder, independent review, required checks, Board decisions, rejection
    repair/re-review, rollback, canary, post-deployment plan all funnel through this function): it
    must be an exact 64-character lowercase hexadecimal string. It runs BEFORE any dict/set lookup
    keyed on ``ref``, so a non-hashable value (a list or dict from attacker-controlled JSON) is
    rejected with a structured reason instead of raising."""
    if not _is_sha256(ref):
        add("%s evidence reference %r is not a well-formed evidence reference: must be an exact "
            "64-character lowercase hexadecimal string" % (kind, ref))
        return
    if seen_refs is not None:
        if ref in seen_refs:
            add("%s evidence reference %r is a duplicate/ambiguous reference: the same digest is "
                "already claimed by another reference site" % (kind, ref))
            return
        seen_refs.add(ref)
    if not isinstance(evidence_index, dict):
        add("%s evidence reference %r could not be authenticated: no evidence index was "
            "independently supplied to the verifier" % (kind, ref))
        return
    records = evidence_index.get("records")
    record = records.get(ref) if isinstance(records, dict) else None
    if not isinstance(records, dict) or ref not in records:
        add("%s evidence reference %r is not present in the independently supplied evidence index" % (kind, ref))
        return
    if not isinstance(record, dict):
        add("%s evidence reference %r record is not a JSON object" % (kind, ref))
        return
    if record.get("schema") != EVIDENCE_RECORD_SCHEMA:
        add("%s evidence reference %r has unknown/attacker evidence-record schema: %r (expected %r)"
            % (kind, ref, record.get("schema"), EVIDENCE_RECORD_SCHEMA))
        return
    if record.get("digest") != ref:
        add("%s evidence reference %r record.digest %r does not match the resolved reference"
            % (kind, ref, record.get("digest")))
        return
    if record.get("kind") not in EVIDENCE_RECORD_KINDS:
        add("%s evidence reference %r record.kind %r is not a recognised evidence category"
            % (kind, ref, record.get("kind")))
        return
    if expected_kind is not None and record.get("kind") != expected_kind:
        add("%s evidence reference %r record.kind %r does not match the reference context's "
            "expected kind %r" % (kind, ref, record.get("kind"), expected_kind))
        return
    if record.get("version") != EVIDENCE_RECORD_VERSION:
        add("%s evidence reference %r record.version must be exactly %r, got %r"
            % (kind, ref, EVIDENCE_RECORD_VERSION, record.get("version")))
        return
    if expected_check_id is not None and record.get("check_id") != expected_check_id:
        add("%s evidence reference %r record.check_id %r does not match expected check %r"
            % (kind, ref, record.get("check_id"), expected_check_id))
        return
    if expected_repo is not None and record.get("repo") != expected_repo:
        add("%s evidence reference %r record.repo %r does not match expected repo %r"
            % (kind, ref, record.get("repo"), expected_repo))
        return
    if expected_pr is not None and record.get("pr") != expected_pr:
        add("%s evidence reference %r record.pr %r does not match expected PR %r"
            % (kind, ref, record.get("pr"), expected_pr))
        return
    if expected_head_sha is not None and record.get("head_sha") != expected_head_sha:
        add("%s evidence reference %r record.head_sha %r does not match expected HEAD %s"
            % (kind, ref, record.get("head_sha"), expected_head_sha))
        return
    if record.get("verified") is not True:
        add("%s evidence reference %r is not marked verified in the evidence index" % (kind, ref))
        return
    ts = _parse_timestamp(
        record.get("timestamp"),
        lambda m: add("%s evidence reference %r %s" % (kind, ref, m)),
        "evidence timestamp",
    )
    if ts is None:
        return
    if ts > now:
        add("%s evidence reference %r timestamp is in the future: %s" % (kind, ref, ts.isoformat()))
    elif issued_at is not None and ts < issued_at - MAX_EVIDENCE_AGE:
        add(
            "%s evidence reference %r timestamp is stale (older than the %s freshness window "
            "before receipt issuance): %s" % (kind, ref, MAX_EVIDENCE_AGE, ts.isoformat())
        )
    # The record's timestamp must equal the event timestamp declared at the reference site -- a
    # record cannot be "fresh enough" in the abstract while disagreeing with the event it claims
    # to evidence.
    if not _is_nonempty_str(expected_event_timestamp):
        add("%s evidence reference %r has no event timestamp bound at the reference site" % (kind, ref))
    else:
        expected_ts = _parse_timestamp(
            expected_event_timestamp,
            lambda m: add("%s evidence reference %r reference-site event %s" % (kind, ref, m)),
            "timestamp",
        )
        if expected_ts is not None and ts != expected_ts:
            add(
                "%s evidence reference %r event timestamp mismatch: record=%s reference-site=%s"
                % (kind, ref, ts.isoformat(), expected_ts.isoformat())
            )


def _validate_activation(policy_activation, changed_paths, repo, expected_pr, expected_head_sha,
                         activation_manifest, expected_activation_manifest_path,
                         activation_manifest_sha256, now, issued_at, evidence_index, add, seen_refs=None):
    """Fail-closed validation of a reconciled UG-AUTONOMY-001 activation block. Appends one reason
    per defect via ``add``. Never raises; an absent/None manifest fails closed."""
    keys = set(policy_activation.keys())
    for missing in sorted(ACTIVATION_KEYS - keys):
        add("policy_activation is missing required field: %r" % (missing,))
    for unknown in sorted(keys - ACTIVATION_KEYS):
        add("policy_activation has unexpected field: %r" % (unknown,))

    # A candidate that touches docs/constitution/ (per the independently observed live file set,
    # never a bare receipt claim) can never self-authorise merge. Constitutional amendments remain
    # founder-only.
    constitutional_touch = [p for p in changed_paths if p.startswith("docs/constitution/")]
    if constitutional_touch:
        add(
            "constitutional candidate cannot self-authorise merge under UG-AUTONOMY-001: "
            "changed_paths touch docs/constitution/: %r" % (constitutional_touch,)
        )

    # A candidate that touches tools/board-release-verifier/ (the verifier/controller/their own
    # tests) can never self-authorise merge either -- otherwise a change to the gate could approve
    # itself. Stays founder-manual exactly like a docs/constitution/ amendment.
    verifier_touch = [p for p in changed_paths if p.startswith("tools/board-release-verifier/")]
    if verifier_touch:
        add(
            "verifier-touching candidate cannot self-authorise merge under UG-AUTONOMY-001: "
            "changed_paths touch tools/board-release-verifier/: %r" % (verifier_touch,)
        )

    if not isinstance(activation_manifest, dict):
        add("UG-AUTONOMY-001 activation manifest was not independently supplied to the verifier")
        return

    # Hash binding alone is not schema admission: the LIVE activation manifest itself must be
    # pinned to the exact supported schema/version before its eligible_repos/canary_trust_domain
    # are ever trusted -- independently of whatever version the receipt's own metadata claims.
    if (activation_manifest.get("schema") != ACTIVATION_MANIFEST_SCHEMA
            or activation_manifest.get("version") != ACTIVATION_MANIFEST_SUPPORTED_VERSION):
        add(
            "live UG-AUTONOMY-001 activation manifest is not pinned to the exact supported "
            "schema/version (%r/%r): got schema=%r version=%r"
            % (ACTIVATION_MANIFEST_SCHEMA, ACTIVATION_MANIFEST_SUPPORTED_VERSION,
               activation_manifest.get("schema"), activation_manifest.get("version"))
        )

    man = policy_activation.get("manifest")
    if not isinstance(man, dict):
        add("policy_activation.manifest block is missing")
    else:
        mkeys = set(man.keys())
        for missing in sorted(ACTIVATION_MANIFEST_KEYS - mkeys):
            add("policy_activation.manifest is missing required field: %r" % (missing,))
        for unknown in sorted(mkeys - ACTIVATION_MANIFEST_KEYS):
            add("policy_activation.manifest has unexpected field: %r" % (unknown,))
        if man.get("path") != expected_activation_manifest_path:
            add("policy_activation.manifest.path mismatch: receipt=%r expected=%r"
                % (man.get("path"), expected_activation_manifest_path))
        if man.get("schema") != ACTIVATION_MANIFEST_SCHEMA:
            add("policy_activation.manifest.schema must be %r, got %r"
                % (ACTIVATION_MANIFEST_SCHEMA, man.get("schema")))
        if man.get("version") != activation_manifest.get("version"):
            add("policy_activation.manifest.version mismatch: receipt=%r live=%r"
                % (man.get("version"), activation_manifest.get("version")))
        m_sha = man.get("sha256")
        if not _is_sha256(m_sha):
            add("policy_activation.manifest.sha256 is not a 64-character hex digest: %r" % (m_sha,))
        elif m_sha != activation_manifest_sha256:
            add("activation manifest hash drift: receipt=%s live=%s"
                % (m_sha, activation_manifest_sha256))

    eligible_repos = activation_manifest.get("eligible_repos")
    if not isinstance(eligible_repos, list) or repo not in eligible_repos:
        add("repository %r is not eligible under the UG-AUTONOMY-001 activation manifest" % (repo,))

    canary = policy_activation.get("restart_canary_evidence")
    if not isinstance(canary, dict):
        add("policy_activation.restart_canary_evidence block is missing")
    else:
        ckeys = set(canary.keys())
        for missing in sorted(CANARY_KEYS - ckeys):
            add("policy_activation.restart_canary_evidence is missing required field: %r" % (missing,))
        for unknown in sorted(ckeys - CANARY_KEYS):
            add("policy_activation.restart_canary_evidence has unexpected field: %r" % (unknown,))
        if canary.get("head_sha") != expected_head_sha:
            add("policy_activation.restart_canary_evidence head_sha drift: %r expected=%s"
                % (canary.get("head_sha"), expected_head_sha))
        digest = canary.get("evidence_digest")
        if not _is_sha256(digest):
            add("policy_activation.restart_canary_evidence.evidence_digest is not a 64-character hex digest")
        else:
            _resolve_evidence(digest, "policy_activation.restart_canary_evidence", evidence_index, now, issued_at, add,
                              expected_repo=repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                              expected_kind="policy_activation",
                              expected_event_timestamp=canary.get("event_timestamp"),
                              seen_refs=seen_refs)
        expected_trust = activation_manifest.get("canary_trust_domain")
        if not _is_nonempty_str(canary.get("trust_domain")):
            add("policy_activation.restart_canary_evidence.trust_domain is missing")
        elif expected_trust is not None and canary.get("trust_domain") != expected_trust:
            add("policy_activation.restart_canary_evidence.trust_domain mismatch: %r != manifest %r"
                % (canary.get("trust_domain"), expected_trust))


def verify(receipt, roster, check_manifest, *,
           expected_repo, expected_base, expected_head_sha, expected_pr,
           expected_policy_path, expected_policy_version, policy_sha256,
           expected_roster_path, roster_sha256,
           expected_check_manifest_path, check_manifest_sha256,
           now,
           expected_changed_paths=None,
           evidence_index=None,
           expected_evidence_index_path=None,
           evidence_index_sha256=None,
           activation_manifest=None,
           expected_activation_manifest_path=None,
           activation_manifest_sha256=None):
    """Validate a Board release receipt. Returns a VerifyResult. Fails closed on any defect."""
    reasons = []
    candidate_reasons = []
    merge_reasons = []

    def fail(msg, candidate_scope=False):
        reasons.append(msg)
        if candidate_scope:
            candidate_reasons.append(msg)

    if not isinstance(receipt, dict):
        return VerifyResult(False, False, False, ["receipt is not a JSON object"], [], None, None)

    # --- BRV-01: strict schema literal + exact top-level key set, fail closed on drift ---
    if receipt.get("schema") != RECEIPT_SCHEMA:
        fail("schema must be exactly %r, got %r" % (RECEIPT_SCHEMA, receipt.get("schema")), True)

    present_keys = set(receipt.keys())
    for missing_key in sorted(REQUIRED_TOP_LEVEL_KEYS - present_keys):
        fail("receipt is missing required top-level field: %r" % (missing_key,), True)
    for unknown_key in sorted(present_keys - REQUIRED_TOP_LEVEL_KEYS):
        fail("receipt has unexpected top-level field: %r" % (unknown_key,), True)

    receipt_id = receipt.get("receipt_id")
    if not _is_nonempty_str(receipt_id):
        fail("receipt_id is missing or not a non-empty string: %r" % (receipt_id,), True)
        receipt_id = None

    # Parsed early: several evidence-freshness checks below need issued_at before the final
    # unexpired-timestamp section runs.
    issued_at = _parse_timestamp(receipt.get("issued_at"), fail, "issued_at")
    if issued_at is not None and issued_at > now:
        fail(
            "issued_at is in the future (zero future issuance -- no grace period): "
            "issued_at=%s now=%s" % (issued_at.isoformat(), now.isoformat()),
            True,
        )

    # --- BRV-02: independently supplied trusted PR snapshot -- repo / PR / base / exact HEAD ---
    repo = receipt.get("repo")
    if repo != expected_repo:
        fail("repo mismatch: receipt=%r expected=%r" % (repo, expected_repo), True)

    pr = receipt.get("pr")
    if not isinstance(pr, int) or isinstance(pr, bool) or pr <= 0:
        fail("pr is missing or not a positive integer: %r" % (pr,), True)
    elif pr != expected_pr:
        fail("pr mismatch: receipt=%r expected=%r -- receipt is not bound to the requested/live PR" % (pr, expected_pr), True)

    base = receipt.get("base")
    if base != "main":
        fail("base must be exactly 'main', got %r" % (base,), True)
    if base != expected_base:
        fail("base mismatch: receipt=%r expected=%r" % (base, expected_base), True)

    head_sha = receipt.get("head_sha")
    if not isinstance(head_sha, str) or not GIT_SHA_RE.match(head_sha):
        fail("head_sha is not an exact 40-character lowercase-hex SHA: %r" % (head_sha,), True)
    elif head_sha != expected_head_sha:
        fail("head drift: receipt head_sha=%s expected=%s" % (head_sha, expected_head_sha), True)

    # --- BRV-04/08: policy / roster / check_manifest bound by expected path, schema, version, hash ---
    policy = receipt.get("policy")
    if not isinstance(policy, dict):
        fail("policy block is missing", True)
    else:
        if policy.get("path") != expected_policy_path:
            fail("policy.path mismatch: receipt=%r expected=%r" % (policy.get("path"), expected_policy_path), True)
        if policy.get("version") != expected_policy_version:
            fail(
                "policy.version mismatch: receipt=%r expected=%r"
                % (policy.get("version"), expected_policy_version),
                True,
            )
        p_sha = policy.get("sha256")
        if not _is_sha256(p_sha):
            fail("policy.sha256 is not a 64-character hex digest: %r" % (p_sha,), True)
        elif p_sha != policy_sha256:
            fail("policy hash drift: receipt=%s live=%s" % (p_sha, policy_sha256), True)

    roster_block = receipt.get("roster")
    # Hash binding alone is not schema admission: the LIVE roster document itself must be pinned
    # to the exact supported schema/version before its eligible_members are ever trusted --
    # independently of whatever version the receipt's own roster metadata claims.
    if (not isinstance(roster, dict) or roster.get("schema") != ROSTER_SCHEMA
            or roster.get("version") != ROSTER_SUPPORTED_VERSION):
        fail(
            "live roster document is not pinned to the exact supported schema/version (%r/%r): "
            "got schema=%r version=%r"
            % (ROSTER_SCHEMA, ROSTER_SUPPORTED_VERSION,
               roster.get("schema") if isinstance(roster, dict) else None,
               roster.get("version") if isinstance(roster, dict) else None),
            True,
        )
    live_roster_version = roster.get("version") if isinstance(roster, dict) else None
    if not isinstance(roster_block, dict):
        fail("roster block is missing", True)
    else:
        if roster_block.get("path") != expected_roster_path:
            fail(
                "roster.path mismatch: receipt=%r expected=%r"
                % (roster_block.get("path"), expected_roster_path),
                True,
            )
        if roster_block.get("schema") != ROSTER_SCHEMA:
            fail("roster.schema must be %r, got %r" % (ROSTER_SCHEMA, roster_block.get("schema")), True)
        if roster_block.get("version") != live_roster_version:
            fail(
                "roster.version mismatch: receipt=%r live=%r"
                % (roster_block.get("version"), live_roster_version),
                True,
            )
        r_sha = roster_block.get("sha256")
        if not _is_sha256(r_sha):
            fail("roster.sha256 is not a 64-character hex digest: %r" % (r_sha,), True)
        elif r_sha != roster_sha256:
            fail("roster hash drift: receipt=%s live=%s" % (r_sha, roster_sha256), True)

    # Hash binding alone is not schema admission: the LIVE required-check manifest document itself
    # must be pinned to the exact supported schema/version before its required_checks/repo binding
    # are ever trusted -- independently of whatever version the receipt's own metadata claims.
    if (not isinstance(check_manifest, dict) or check_manifest.get("schema") != CHECK_MANIFEST_SCHEMA
            or check_manifest.get("version") != CHECK_MANIFEST_SUPPORTED_VERSION):
        fail(
            "live required-check manifest is not pinned to the exact supported schema/version "
            "(%r/%r): got schema=%r version=%r"
            % (CHECK_MANIFEST_SCHEMA, CHECK_MANIFEST_SUPPORTED_VERSION,
               check_manifest.get("schema") if isinstance(check_manifest, dict) else None,
               check_manifest.get("version") if isinstance(check_manifest, dict) else None),
            True,
        )
    check_manifest_block = receipt.get("check_manifest")
    live_check_manifest_version = check_manifest.get("version") if isinstance(check_manifest, dict) else None
    if not isinstance(check_manifest_block, dict):
        fail("check_manifest block is missing", True)
    else:
        if check_manifest_block.get("path") != expected_check_manifest_path:
            fail(
                "check_manifest.path mismatch: receipt=%r expected=%r"
                % (check_manifest_block.get("path"), expected_check_manifest_path),
                True,
            )
        if check_manifest_block.get("schema") != CHECK_MANIFEST_SCHEMA:
            fail(
                "check_manifest.schema must be %r, got %r"
                % (CHECK_MANIFEST_SCHEMA, check_manifest_block.get("schema")),
                True,
            )
        if check_manifest_block.get("version") != live_check_manifest_version:
            fail(
                "check_manifest.version mismatch: receipt=%r live=%r"
                % (check_manifest_block.get("version"), live_check_manifest_version),
                True,
            )
        cm_sha = check_manifest_block.get("sha256")
        if not _is_sha256(cm_sha):
            fail("check_manifest.sha256 is not a 64-character hex digest: %r" % (cm_sha,), True)
        elif cm_sha != check_manifest_sha256:
            fail("check_manifest hash drift: receipt=%s live=%s" % (cm_sha, check_manifest_sha256), True)

    # --- BRV-20: evidence index block bound by expected path/schema/version/hash, and by itself
    # independently bound to this exact repo/PR/HEAD -- an authenticated trust root, not just
    # another opaque hash the receipt hands us. ---
    evidence_index_block = receipt.get("evidence_index")
    live_evidence_index_version = evidence_index.get("version") if isinstance(evidence_index, dict) else None
    if not isinstance(evidence_index_block, dict):
        fail("evidence_index block is missing", True)
    else:
        if evidence_index_block.get("path") != expected_evidence_index_path:
            fail("evidence_index.path mismatch: receipt=%r expected=%r"
                 % (evidence_index_block.get("path"), expected_evidence_index_path), True)
        if evidence_index_block.get("schema") != EVIDENCE_INDEX_SCHEMA:
            fail("evidence_index.schema must be %r, got %r"
                 % (EVIDENCE_INDEX_SCHEMA, evidence_index_block.get("schema")), True)
        if evidence_index_block.get("version") != live_evidence_index_version:
            fail("evidence_index.version mismatch: receipt=%r live=%r"
                 % (evidence_index_block.get("version"), live_evidence_index_version), True)
        ei_sha = evidence_index_block.get("sha256")
        if not _is_sha256(ei_sha):
            fail("evidence_index.sha256 is not a 64-character hex digest: %r" % (ei_sha,), True)
        elif ei_sha != evidence_index_sha256:
            fail("evidence_index hash drift: receipt=%s live=%s" % (ei_sha, evidence_index_sha256), True)
    if not isinstance(evidence_index, dict):
        fail("evidence index was not independently supplied to the verifier", True)
    else:
        if evidence_index.get("schema") != EVIDENCE_INDEX_SCHEMA:
            fail("evidence index schema must be exactly %r, got %r"
                 % (EVIDENCE_INDEX_SCHEMA, evidence_index.get("schema")), True)
        if evidence_index.get("version") != EVIDENCE_INDEX_VERSION:
            fail("evidence index version must be exactly %r, got %r"
                 % (EVIDENCE_INDEX_VERSION, evidence_index.get("version")), True)
        if evidence_index.get("repo") != expected_repo:
            fail("evidence_index.repo %r does not match expected repo %r" % (evidence_index.get("repo"), expected_repo), True)
        if evidence_index.get("pr") != expected_pr:
            fail("evidence_index.pr %r does not match expected PR %r" % (evidence_index.get("pr"), expected_pr), True)
        if evidence_index.get("head_sha") != expected_head_sha:
            fail("evidence_index.head_sha %r does not match expected HEAD %s" % (evidence_index.get("head_sha"), expected_head_sha), True)

    # --- BRV-05/06: builder and independent_review attestations, role separation ---
    # One shared reference tracker across every resolution site: the same evidence digest claimed
    # by two different reference sites is duplicate/ambiguous and fails closed.
    seen_evidence_refs = set()
    builder = receipt.get("builder")
    builder_execution_identity = None
    if not isinstance(builder, dict):
        fail("builder attestation is missing", True)
    else:
        if builder.get("tool") != "claude-cli":
            fail("builder.tool must be 'claude-cli', got %r" % (builder.get("tool"),), True)
        if builder.get("family") != "anthropic":
            fail("builder.family must be 'anthropic', got %r" % (builder.get("family"),), True)
        b_ref = builder.get("evidence_ref")
        if not _is_nonempty_str(b_ref):
            fail("builder evidence_ref is missing", True)
        else:
            _resolve_evidence(b_ref, "builder", evidence_index, now, issued_at, lambda m: fail(m, True),
                          expected_repo=expected_repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                          expected_kind="builder", expected_event_timestamp=builder.get("event_timestamp"),
                          seen_refs=seen_evidence_refs)
        if not _is_nonempty_str(builder.get("execution_identity")):
            fail("builder execution_identity is missing", True)
        else:
            builder_execution_identity = builder.get("execution_identity")
        b_head = builder.get("head_sha")
        if b_head != expected_head_sha:
            fail("builder head_sha drift: builder=%s expected=%s" % (b_head, expected_head_sha), True)

    independent_review = receipt.get("independent_review")
    if not isinstance(independent_review, dict):
        fail("independent_review attestation is missing", True)
    else:
        if independent_review.get("tool") != "codex-cli":
            fail(
                "independent_review.tool must be 'codex-cli', got %r" % (independent_review.get("tool"),),
                True,
            )
        if independent_review.get("family") != "openai":
            fail(
                "independent_review.family must be 'openai', got %r" % (independent_review.get("family"),),
                True,
            )
        ir_ref = independent_review.get("evidence_ref")
        if not _is_nonempty_str(ir_ref):
            fail("independent_review evidence_ref is missing", True)
        else:
            _resolve_evidence(ir_ref, "independent_review", evidence_index, now, issued_at, lambda m: fail(m, True),
                          expected_repo=expected_repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                          expected_kind="independent_review",
                          expected_event_timestamp=independent_review.get("event_timestamp"),
                          seen_refs=seen_evidence_refs)
        if not _is_nonempty_str(independent_review.get("execution_identity")):
            fail("independent_review execution_identity is missing", True)
        elif builder_execution_identity is not None and independent_review.get("execution_identity") == builder_execution_identity:
            fail(
                "independent_review execution_identity must differ from builder execution_identity: both=%r"
                % (builder_execution_identity,),
                True,
            )
        if independent_review.get("authored_candidate") is not False:
            fail(
                "independent_review.authored_candidate must be explicitly false, got %r"
                % (independent_review.get("authored_candidate"),),
                True,
            )
        if independent_review.get("repaired_candidate") is not False:
            fail(
                "independent_review.repaired_candidate must be explicitly false, got %r"
                % (independent_review.get("repaired_candidate"),),
                True,
            )
        r_head = independent_review.get("head_sha")
        if r_head != expected_head_sha:
            fail(
                "independent_review head_sha drift: independent_review=%s expected=%s"
                % (r_head, expected_head_sha),
                True,
            )

    if isinstance(builder, dict) and isinstance(independent_review, dict):
        b_family = builder.get("family")
        r_family = independent_review.get("family")
        if b_family is not None and r_family is not None and b_family == r_family:
            fail(
                "independent_review family must differ from builder family: both=%r" % (b_family,),
                True,
            )

    # --- BRV-21: changed_paths must match the independently observed live PR file set -- a
    # receipt can never hide a constitutional (or any other) path by simply omitting it. ---
    changed_paths = receipt.get("changed_paths")
    if not isinstance(changed_paths, list) or not all(_is_nonempty_str(p) for p in changed_paths):
        fail("changed_paths must be a list of non-empty strings", True)
        changed_paths = []
    elif len(changed_paths) != len(set(changed_paths)):
        fail("changed_paths must be a list of unique paths -- duplicate entries are never "
             "collapsed via set comparison", True)
        changed_paths = []

    if expected_changed_paths is not None:
        if set(changed_paths) != set(expected_changed_paths):
            fail(
                "changed_paths declared by the receipt do not match the independently observed "
                "live PR file set: declared=%r live=%r" % (sorted(changed_paths), sorted(expected_changed_paths)),
                True,
            )
            # The live, independently observed set is the trusted one from here on -- a receipt
            # proven to misdeclare its own changed_paths can never launder a hidden constitutional
            # touch by having the rest of this function reason about its own (false) claim.
            changed_paths = list(expected_changed_paths)
    else:
        merge_reasons.append(
            "live PR changed-file set was not independently supplied to the verifier; "
            "constitutional self-authorisation via caller-controlled changed_paths cannot be ruled out"
        )

    # --- BRV-19: the required-check manifest is bound to exactly one governed repository ---
    if isinstance(check_manifest, dict):
        cm_repo = check_manifest.get("repo")
        if cm_repo != expected_repo:
            fail(
                "check_manifest.repo %r does not match expected repo %r -- CARSI and RestoreAssist "
                "remain fail-closed until separately versioned, repo-bound manifests are installed"
                % (cm_repo, expected_repo),
                True,
            )
    else:
        fail("check_manifest is not a JSON object", True)

    # --- BRV-08/09: required checks bound exactly to the manifest, with full evidence contract ---
    manifest_checks = []
    if isinstance(check_manifest, dict):
        manifest_checks = [c for c in check_manifest.get("required_checks", []) if isinstance(c, dict)]
    manifest_by_id = {}
    for c in manifest_checks:
        cid = c.get("id")
        if cid is not None:
            manifest_by_id[cid] = c
    if not manifest_by_id or len(manifest_by_id) != len(manifest_checks):
        fail("check manifest required_checks is empty or contains duplicate ids", True)

    checks = receipt.get("required_checks")
    if not isinstance(checks, list) or not checks:
        fail("required_checks is missing or empty", True)
        checks = []

    seen_check_ids = {}
    for i, c in enumerate(checks):
        if not isinstance(c, dict):
            fail("required_checks[%d] is not an object" % i, True)
            continue
        check_id = c.get("id")
        if check_id is None:
            fail("required_checks[%d] is missing id" % i, True)
            continue
        seen_check_ids[check_id] = seen_check_ids.get(check_id, 0) + 1
        if seen_check_ids[check_id] > 1:
            fail("duplicate required check id: %r" % (check_id,), True)
        manifest_check = manifest_by_id.get(check_id)
        if manifest_check is None:
            fail("unknown required check id: %r is not in the required-check manifest" % (check_id,), True)
            continue

        status = c.get("status")
        path_prefix = manifest_check.get("path_prefix")
        applicable = path_prefix is None or any(p.startswith(path_prefix) for p in changed_paths)

        if status == NOT_APPLICABLE:
            if path_prefix is None:
                fail(
                    "required_checks[%d] (%r) is unconditionally required and cannot be not_applicable" % (i, check_id),
                    True,
                )
            elif applicable:
                fail(
                    "required_checks[%d] (%r) claims not_applicable but changed_paths matches path_prefix %r"
                    % (i, check_id, path_prefix),
                    True,
                )
            digest = c.get("evidence_digest")
            if not _is_sha256(digest):
                fail("required_checks[%d] (%r) evidence_digest is not a 64-character hex digest" % (i, check_id), True)
            else:
                _resolve_evidence(digest, "required_checks[%d]" % i, evidence_index, now, issued_at, lambda m: fail(m, True),
                                  expected_repo=expected_repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                                  expected_kind="required_checks", expected_event_timestamp=c.get("timestamp"),
                                  expected_check_id=check_id, seen_refs=seen_evidence_refs)
            continue

        if status != PASSED:
            fail("required_checks[%d] (%r) has invalid status: %r" % (i, check_id, status), True)

        c_head = c.get("head_sha")
        if c_head != expected_head_sha:
            fail("required_checks[%d] (%r) head_sha drift: %s expected=%s" % (i, check_id, c_head, expected_head_sha), True)

        expected_command = manifest_check.get("command")
        command = c.get("command")
        if not isinstance(command, list) or not command or not all(_is_nonempty_str(x) for x in command):
            fail("required_checks[%d] (%r) command is missing or not a non-empty string list" % (i, check_id), True)
        elif expected_command is not None and command != expected_command:
            fail(
                "required_checks[%d] (%r) command identity mismatch: %r != manifest %r"
                % (i, check_id, command, expected_command),
                True,
            )

        exit_code = c.get("exit_code")
        if type(exit_code) is not int or exit_code != 0:
            fail("required_checks[%d] (%r) exit_code must be exactly the integer 0, got %r" % (i, check_id, exit_code), True)

        timestamp = _parse_timestamp(c.get("timestamp"), lambda m: fail("required_checks[%d] (%r) %s" % (i, check_id, m), True), "timestamp")
        if timestamp is not None:
            if timestamp > now:
                fail("required_checks[%d] (%r) timestamp is in the future: %s" % (i, check_id, timestamp.isoformat()), True)
            elif issued_at is not None and timestamp < issued_at - MAX_EVIDENCE_AGE:
                fail(
                    "required_checks[%d] (%r) timestamp is stale (older than the %s freshness "
                    "window before receipt issuance): %s" % (i, check_id, MAX_EVIDENCE_AGE, timestamp.isoformat()),
                    True,
                )

        runner_identity = c.get("runner_identity")
        if not _is_nonempty_str(runner_identity):
            fail("required_checks[%d] (%r) runner_identity is missing" % (i, check_id), True)
        elif builder_execution_identity is not None and runner_identity == builder_execution_identity:
            fail(
                "required_checks[%d] (%r) runner_identity must differ from builder execution_identity -- checks must be rerun outside the builder"
                % (i, check_id),
                True,
            )

        expected_trust_domain = manifest_check.get("trust_domain")
        trust_domain = c.get("trust_domain")
        if not _is_nonempty_str(trust_domain):
            fail("required_checks[%d] (%r) trust_domain is missing" % (i, check_id), True)
        elif expected_trust_domain is not None and trust_domain != expected_trust_domain:
            fail(
                "required_checks[%d] (%r) trust_domain mismatch: %r != manifest %r"
                % (i, check_id, trust_domain, expected_trust_domain),
                True,
            )

        digest = c.get("evidence_digest")
        if not _is_sha256(digest):
            fail("required_checks[%d] (%r) evidence_digest is not a 64-character hex digest" % (i, check_id), True)
        else:
            _resolve_evidence(digest, "required_checks[%d]" % i, evidence_index, now, issued_at, lambda m: fail(m, True),
                                  expected_repo=expected_repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                                  expected_kind="required_checks", expected_event_timestamp=c.get("timestamp"),
                                  expected_check_id=check_id, seen_refs=seen_evidence_refs)

        if c.get("rerun_outside_builder") is not True:
            fail(
                "required_checks[%d] (%r) rerun_outside_builder must be explicitly true" % (i, check_id),
                True,
            )

    for missing_id in sorted(set(manifest_by_id.keys()) - set(seen_check_ids.keys())):
        fail("missing required check from manifest: %r" % (missing_id,), True)

    # --- BRV-07: eligible roster membership + exactly-one-APPROVE-each voting (board scope) ---
    eligible_ids = []
    if isinstance(roster, dict):
        eligible_ids = [m.get("id") for m in roster.get("eligible_members", []) if isinstance(m, dict)]
    eligible_set = set(eligible_ids)
    if not eligible_ids or len(eligible_set) != len(eligible_ids):
        fail("roster eligible_members is empty or contains duplicate ids")

    member_model_family = {}
    if isinstance(roster, dict):
        for m in roster.get("eligible_members", []):
            if isinstance(m, dict) and "model_family" in m:
                member_model_family[m.get("id")] = m.get("model_family")

    decisions = receipt.get("decisions")
    if not isinstance(decisions, list) or not decisions:
        fail("decisions is missing or empty")
        decisions = []

    seen = {}
    for i, d in enumerate(decisions):
        if not isinstance(d, dict):
            fail("decisions[%d] is not an object" % i)
            continue
        member_id = d.get("member_id")
        vote = d.get("vote")
        if member_id is None:
            fail("decisions[%d] is missing member_id" % i)
            continue
        if member_id in seen:
            fail("duplicate decision for member_id=%r" % (member_id,))
        seen[member_id] = seen.get(member_id, 0) + 1
        if member_id not in eligible_set:
            fail("unknown voter: %r is not in the eligible roster" % (member_id,))
            continue
        if vote != APPROVE:
            fail("member %r did not APPROVE (vote=%r)" % (member_id, vote))
        d_ref = d.get("evidence_ref")
        if not d_ref:
            fail("decisions[%d] (%r) is missing evidence_ref" % (i, member_id))
        else:
            _resolve_evidence(d_ref, "decisions[%d]" % i, evidence_index, now, issued_at, fail,
                              expected_repo=expected_repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                              expected_kind="decisions", expected_event_timestamp=d.get("event_timestamp"),
                              seen_refs=seen_evidence_refs)
        d_head = d.get("head_sha")
        if d_head != expected_head_sha:
            fail(
                "decision head_sha drift: member_id=%r head_sha=%s expected=%s"
                % (member_id, d_head, expected_head_sha)
            )
        if member_id in member_model_family:
            declared = member_model_family[member_id]
            actual = d.get("model_family")
            if actual != declared:
                fail(
                    "model_family mismatch for member_id=%r: decision=%r roster=%r"
                    % (member_id, actual, declared)
                )

    for missing_id in sorted(eligible_set - set(seen.keys())):
        fail("missing decision from eligible member: %r" % (missing_id,))

    # --- BRV-11: authoritative, complete rejection ledger -- absence never means zero rejections ---
    rejection_ledger = receipt.get("rejection_ledger")
    if not isinstance(rejection_ledger, dict):
        fail("rejection_ledger is missing -- an absent ledger is never treated as zero rejections")
    else:
        if rejection_ledger.get("ledger_complete") is not True:
            fail(
                "rejection_ledger.ledger_complete must be explicitly true, got %r"
                % (rejection_ledger.get("ledger_complete"),)
            )
        items = rejection_ledger.get("items")
        if items is None:
            items = []
        if not isinstance(items, list):
            fail("rejection_ledger.items must be a list")
            items = []
        for i, rj in enumerate(items):
            if not isinstance(rj, dict):
                fail("rejection_ledger.items[%d] is not an object" % i)
                continue
            rj_id = rj.get("id")
            if rj.get("resolved") is not True:
                fail("rejection_ledger.items[%d] (%r) is not resolved" % (i, rj_id))
            if rj.get("repaired") is not True:
                fail("rejection_ledger.items[%d] (%r) is not repaired" % (i, rj_id))
            repair_ref = rj.get("repair_ref")
            if not repair_ref:
                fail("rejection_ledger.items[%d] (%r) has no repair_ref" % (i, rj_id))
            else:
                _resolve_evidence(repair_ref, "rejection_ledger.items[%d].repair_ref" % i, evidence_index, now, issued_at, fail,
                                  expected_repo=expected_repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                                  expected_kind="rejection_ledger",
                                  expected_event_timestamp=rj.get("repair_event_timestamp"),
                                  seen_refs=seen_evidence_refs)
            review_ref = rj.get("review_ref")
            if not review_ref:
                fail("rejection_ledger.items[%d] (%r) has no review_ref" % (i, rj_id))
            else:
                _resolve_evidence(review_ref, "rejection_ledger.items[%d].review_ref" % i, evidence_index, now, issued_at, fail,
                                  expected_repo=expected_repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                                  expected_kind="rejection_ledger",
                                  expected_event_timestamp=rj.get("review_event_timestamp"),
                                  seen_refs=seen_evidence_refs)
            if rj.get("re_reviewed_on_head") != expected_head_sha:
                fail(
                    "rejection_ledger.items[%d] (%r) was not independently re-reviewed on the final HEAD: %r != %s"
                    % (i, rj_id, rj.get("re_reviewed_on_head"), expected_head_sha)
                )

    # --- BRV-12: fail closed on out-of-scope / cost / privilege / authority / infra flags ---
    flag_fields = (
        "direct_spend", "constitutional_change", "out_of_scope",
        "missing_privilege", "authority_conflict", "unapproved_infrastructure",
    )
    for flag in flag_fields:
        if receipt.get(flag) is not False:
            fail("%s must be explicitly false, got %r" % (flag, receipt.get(flag)))

    # A candidate that touches docs/constitution/ (per the trusted, independently observed set)
    # can never truthfully declare constitutional_change=false.
    if receipt.get("constitutional_change") is False:
        constitutional_touch = [p for p in changed_paths if p.startswith("docs/constitution/")]
        if constitutional_touch:
            fail(
                "constitutional_change is false but changed_paths includes a docs/constitution/ path: %r"
                % (constitutional_touch,)
            )

    # --- unexpired, well-formed, bounded-TTL timestamps ---
    expires_at = _parse_timestamp(receipt.get("expires_at"), fail, "expires_at")
    if issued_at is not None and expires_at is not None:
        if expires_at <= now:
            fail("receipt expired: expires_at=%s now=%s" % (expires_at.isoformat(), now.isoformat()))
        if expires_at <= issued_at:
            fail("expires_at must be after issued_at")
        elif expires_at - issued_at > MAX_RECEIPT_TTL:
            fail(
                "receipt TTL exceeds maximum bound of %s: issued_at=%s expires_at=%s"
                % (MAX_RECEIPT_TTL, issued_at.isoformat(), expires_at.isoformat())
            )

    candidate_verified = len(candidate_reasons) == 0
    board_release_ready = len(reasons) == 0

    # --- BRV-13/17: rollback, post-deployment plan, and policy activation -- merge scope only ---
    if not board_release_ready:
        merge_reasons.append("board_release_ready is false")

    rollback = receipt.get("rollback")
    if not isinstance(rollback, dict) or not _is_bool(rollback.get("applicable")):
        merge_reasons.append("rollback.applicable must be an explicit boolean")
    elif rollback.get("applicable") is True:
        rb_ref = rollback.get("evidence_ref")
        if rollback.get("tested") is not True or not rb_ref:
            merge_reasons.append(
                "rollback is applicable but not proven with tested exact-artifact rollback evidence"
            )
        elif rb_ref:
            _resolve_evidence(rb_ref, "rollback", evidence_index, now, issued_at, merge_reasons.append,
                              expected_repo=expected_repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                              expected_kind="rollback", expected_event_timestamp=rollback.get("event_timestamp"),
                              seen_refs=seen_evidence_refs)
    else:
        if not rollback.get("reason"):
            merge_reasons.append("rollback.reason is required when rollback is not applicable")
        merge_reasons.append("rollback marked not_applicable cannot authorise merge/deploy")

    post_plan = receipt.get("post_deployment_verification_plan")
    if not isinstance(post_plan, dict) or post_plan.get("present") is not True or not post_plan.get("evidence_ref"):
        merge_reasons.append("post_deployment_verification_plan is not present with evidence; required for merge/deploy")
    else:
        _resolve_evidence(post_plan.get("evidence_ref"), "post_deployment_verification_plan", evidence_index, now, issued_at, merge_reasons.append,
                          expected_repo=expected_repo, expected_pr=expected_pr, expected_head_sha=expected_head_sha,
                          expected_kind="post_deployment_verification_plan",
                          expected_event_timestamp=post_plan.get("event_timestamp"),
                          seen_refs=seen_evidence_refs)

    # --- BRV-18: UG-AUTONOMY-001 activation -- deterministic, manifest-derived merge eligibility ---
    policy_activation = receipt.get("policy_activation")
    if not isinstance(policy_activation, dict):
        merge_reasons.append("policy_activation block is missing")
    elif not _is_bool(policy_activation.get("reconciled")):
        merge_reasons.append("policy_activation.reconciled must be an explicit boolean")
    elif policy_activation.get("reconciled") is not True:
        merge_reasons.append(
            "policy_activation.reconciled is false: UG-AUTONOMY-001 is not activated for this candidate"
        )
    else:
        _validate_activation(
            policy_activation, changed_paths, repo, expected_pr, expected_head_sha,
            activation_manifest, expected_activation_manifest_path, activation_manifest_sha256,
            now, issued_at, evidence_index,
            merge_reasons.append,
            seen_refs=seen_evidence_refs,
        )

    merge_authorised = board_release_ready and len(merge_reasons) == 0

    return VerifyResult(
        candidate_verified,
        board_release_ready,
        merge_authorised,
        reasons,
        merge_reasons,
        receipt_id,
        head_sha if isinstance(head_sha, str) else None,
        deployment_authorised=False,
        deployment_reasons=[DEPLOYMENT_NOT_IMPLEMENTED_REASON],
    )


def _load_json_fail_closed(path, label):
    try:
        text = Path(path).read_text()
    except OSError as exc:
        return None, "%s could not be read (%s): %s" % (label, path, exc)
    try:
        return json.loads(text), None
    except json.JSONDecodeError as exc:
        return None, "%s is not valid JSON (%s): %s" % (label, path, exc)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--receipt", required=True, help="path to the release receipt JSON")
    parser.add_argument("--roster", required=True, help="path to the eligible-roster JSON")
    parser.add_argument("--constitution", required=True, help="path to the policy/addendum file to hash")
    parser.add_argument("--check-manifest", required=True, dest="check_manifest")
    parser.add_argument("--evidence-index", required=True, dest="evidence_index")
    parser.add_argument("--expect-repo", required=True)
    parser.add_argument("--expect-base", required=True)
    parser.add_argument("--expect-head-sha", required=True)
    parser.add_argument("--expect-pr", required=True, type=int)
    parser.add_argument("--expect-policy-path", required=True)
    parser.add_argument("--expect-policy-version", required=True)
    parser.add_argument("--expect-roster-path", required=True)
    parser.add_argument("--expect-check-manifest-path", required=True)
    parser.add_argument("--expect-evidence-index-path", required=True)
    parser.add_argument("--expect-policy-sha256", required=True)
    parser.add_argument("--expect-roster-sha256", required=True)
    parser.add_argument("--expect-check-manifest-sha256", required=True)
    parser.add_argument("--expect-evidence-index-sha256", required=True)
    parser.add_argument("--changed-path", dest="changed_paths", action="append", default=None,
                         help="a live PR changed file path; repeat once per file. If omitted "
                              "entirely, merge authorisation fails closed (board readiness can "
                              "still be assessed offline).")
    parser.add_argument(
        "--activation-manifest", default=None, dest="activation_manifest",
        help="path to the versioned UG-AUTONOMY-001 activation manifest JSON (optional; omission "
             "fails merge authorisation closed)",
    )
    parser.add_argument("--expect-activation-manifest-path", default=None)
    parser.add_argument("--expect-activation-manifest-sha256", default=None)
    parser.add_argument("--now", default=None, help="ISO 8601 timestamp; defaults to current UTC time")
    args = parser.parse_args(argv)

    fail_closed_reasons = []

    # --- BRV-22: independently supplied trust anchors, checked BEFORE any content is trusted.
    # Never self-derive the "expected" hash from the same path whose bytes it is meant to police. ---
    hash_entries = [
        ("policy", args.constitution, args.expect_policy_sha256),
        ("roster", args.roster, args.expect_roster_sha256),
        ("check-manifest", args.check_manifest, args.expect_check_manifest_sha256),
        ("evidence-index", args.evidence_index, args.expect_evidence_index_sha256),
    ]
    if args.activation_manifest:
        if not args.expect_activation_manifest_sha256:
            fail_closed_reasons.append("--expect-activation-manifest-sha256 is required when --activation-manifest is supplied")
        else:
            hash_entries.append(("activation-manifest", args.activation_manifest, args.expect_activation_manifest_sha256))
    fail_closed_reasons.extend(verify_expected_hashes(hash_entries))

    # The hash trust gate must precede parsing: once an independently expected SHA-256 mismatch is
    # recorded, no supplied receipt/roster/check-manifest/evidence-index/activation-manifest JSON is
    # ever loaded or parsed -- untrusted content is never touched past a failed trust anchor.
    receipt = roster = check_manifest = evidence_index = activation_manifest = None
    if not fail_closed_reasons:
        receipt, err = _load_json_fail_closed(args.receipt, "receipt")
        if err:
            fail_closed_reasons.append(err)
        roster, err = _load_json_fail_closed(args.roster, "roster")
        if err:
            fail_closed_reasons.append(err)
        check_manifest, err = _load_json_fail_closed(args.check_manifest, "check_manifest")
        if err:
            fail_closed_reasons.append(err)
        evidence_index, err = _load_json_fail_closed(args.evidence_index, "evidence_index")
        if err:
            fail_closed_reasons.append(err)
        if args.activation_manifest and not fail_closed_reasons:
            activation_manifest, err = _load_json_fail_closed(args.activation_manifest, "activation_manifest")
            if err:
                fail_closed_reasons.append(err)

    now = None
    if args.now:
        now_raw = args.now[:-1] + "+00:00" if args.now.endswith("Z") else args.now
        try:
            now = dt.datetime.fromisoformat(now_raw)
        except ValueError as exc:
            fail_closed_reasons.append("--now is not a valid ISO 8601 timestamp: %s" % (exc,))
        else:
            if now.tzinfo is None:
                now = now.replace(tzinfo=dt.timezone.utc)
    else:
        now = dt.datetime.now(dt.timezone.utc)

    if fail_closed_reasons:
        result = VerifyResult(False, False, False, fail_closed_reasons, [], None, None)
    else:
        result = verify(
            receipt,
            roster,
            check_manifest,
            expected_repo=args.expect_repo,
            expected_base=args.expect_base,
            expected_head_sha=args.expect_head_sha,
            expected_pr=args.expect_pr,
            expected_policy_path=args.expect_policy_path,
            expected_policy_version=args.expect_policy_version,
            policy_sha256=args.expect_policy_sha256,
            expected_roster_path=args.expect_roster_path,
            roster_sha256=args.expect_roster_sha256,
            expected_check_manifest_path=args.expect_check_manifest_path,
            check_manifest_sha256=args.expect_check_manifest_sha256,
            now=now,
            expected_changed_paths=args.changed_paths,
            evidence_index=evidence_index,
            expected_evidence_index_path=args.expect_evidence_index_path,
            evidence_index_sha256=args.expect_evidence_index_sha256,
            activation_manifest=activation_manifest,
            expected_activation_manifest_path=args.expect_activation_manifest_path,
            activation_manifest_sha256=args.expect_activation_manifest_sha256,
        )

    print(json.dumps(result.to_dict(), indent=2, sort_keys=True))
    return 0 if result.board_release_ready else 1


if __name__ == "__main__":
    sys.exit(main())
