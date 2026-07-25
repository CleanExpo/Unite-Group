#!/usr/bin/env python3
"""Fail-closed UG-AUTONOMY-001 merge controller (stdlib-only, separate from the verifier).

This is the ONLY component permitted to mutate a PR, and only under the founder-ratified
UG-AUTONOMY-001 exception (CleanExpo/Unite-Group, CARSI and RestoreAssist). It never touches
deployment -- deployment is a separate, unimplemented executor and merge_authorised never implies
deployment authority.

It:

  1. Independently verifies its own trust anchors: the caller must supply an exact 64-hex expected
     SHA-256 for the policy/roster/check-manifest/activation-manifest/evidence-index files, and the
     controller compares those expected hashes to the actual files on disk BEFORE reading their
     content or calling the verifier -- via ``verifier.verify_expected_hashes``, so the file path
     can never generate both the "expected" value and the value that trivially satisfies it.
  2. Enforces a constant, defense-in-depth repo allowlist (ALLOWED_REPOS) before any `gh` call, in
     addition to (never instead of) the independently hash-bound activation manifest's own
     eligible_repos list.
  3. Reads the live PR snapshot -- including its changed-file set -- itself via an injected/
     allowlisted `gh` binary, and requires OPEN, base=main, not draft, MERGEABLE, and
     mergeStateStatus=CLEAN. It never trusts a receipt's live-state or changed-file claim.
  4. Passes the requested PR number and the live changed-file set into the verifier as
     independently supplied expectations -- a receipt for a different PR, or one that hides a
     constitutional path from its own changed_paths declaration, is rejected before any merge call.
  5. Re-checks EVERY required live-state field (OPEN/base/draft/mergeable/clean/HEAD) immediately
     before mutation, not HEAD alone.
  6. Merges with GitHub's SHA precondition (`sha=<exact head>`).
  7. Independently re-reads the PR after a merge-API "merged: true" response and requires
     state=="MERGED", a non-empty mergedAt, an unchanged headRefOid, and mergeCommit.oid equal to
     the (format-validated) merge API response SHA before ever reporting a verified merge.
  8. Emits structured JSON evidence and never prints secrets.

`gh` is the only external process it may spawn (accepted as a string path or an argv-prefix list,
e.g. [sys.executable, "/path/to/fake_gh.py"], so tests never need to chmod a repository file), only
via a narrow allowlist, never with shell=True. The verifier remains import-only and side-effect-free;
all side effects live here.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import verifier  # noqa: E402

GIT_SHA_RE = verifier.GIT_SHA_RE
PR_VIEW_JSON_FIELDS = (
    "number,state,baseRefName,headRefOid,url,isDraft,mergeable,mergeStateStatus,mergedAt,"
    "mergeCommit,files,changedFiles"
)

# Constant, defense-in-depth allowlist for the founder-ratified UG-AUTONOMY-001 exception. This is
# checked in ADDITION to (never instead of) the independently hash-bound activation manifest's own
# eligible_repos -- a tampered or drifted manifest can never widen the controller's own ceiling.
ALLOWED_REPOS = frozenset({"CleanExpo/Unite-Group", "CleanExpo/CARSI", "CleanExpo/RestoreAssist"})


def _gh_argv(gh_cmd):
    """Normalise the injected gh command to a list. Accepts a bare path string (production: the
    real `gh` binary) or a list (tests: [sys.executable, "/path/to/fake_gh.py"]) so test fixtures
    never need write/execute permission changes on a repository-tracked file."""
    return list(gh_cmd) if isinstance(gh_cmd, (list, tuple)) else [gh_cmd]


def _run_gh(gh_cmd, args):
    """Spawn the injected gh binary with a fixed argv (no shell). Returns (rc, stdout, stderr).
    Refuses any argv outside the exact allowlist -- the controller can only ever ask gh to view a
    PR or PUT a merge."""
    allowed = (
        args[:2] == ["pr", "view"]
        or (args[:1] == ["api"] and args[1:3] == ["--method", "PUT"]
            and len(args) >= 4 and args[3].endswith("/merge"))
    )
    if not allowed:
        raise ValueError("gh operation not allowlisted: %r" % (args,))
    proc = subprocess.run(_gh_argv(gh_cmd) + args, capture_output=True, text=True)  # noqa: S603 (fixed argv, no shell)
    return proc.returncode, proc.stdout, proc.stderr


def _gh_pr_view(gh_cmd, repo, pr):
    rc, out, _ = _run_gh(gh_cmd, ["pr", "view", str(pr), "--repo", repo, "--json", PR_VIEW_JSON_FIELDS])
    if rc != 0:
        return None
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return None


def _gh_merge(gh_cmd, repo, pr, head_sha):
    rc, out, _ = _run_gh(gh_cmd, [
        "api", "--method", "PUT", "repos/%s/pulls/%d/merge" % (repo, pr),
        "-f", "sha=%s" % head_sha, "-f", "merge_method=squash",
    ])
    if rc != 0:
        return None
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return None


def _live_changed_paths(snapshot):
    """Extract the live PR's changed-file paths from a gh pr view snapshot's "files" field.
    Returns None on any incompleteness/ambiguity (missing/bool/negative changedFiles count, malformed or duplicate entries, empty set, or count != unique validated paths) -- a lookup failure, never an empty result."""
    count = snapshot.get("changedFiles")
    if not isinstance(count, int) or isinstance(count, bool) or count < 0:
        return None
    files = snapshot.get("files")
    if not isinstance(files, list):
        return None
    paths = []
    for f in files:
        if not isinstance(f, dict) or not isinstance(f.get("path"), str) or not f["path"]:
            return None
        if f["path"] in paths:
            return None
        paths.append(f["path"])
    if not paths or count != len(paths):
        return None
    return paths


def _pr_eligibility_reasons(snapshot, repo, pr):
    """Every live-state field this controller relies on, re-checkable identically before the
    initial verification AND immediately before mutation (finding 4: a partial re-check that only
    looks at HEAD is not enough)."""
    reasons = []
    if not isinstance(snapshot, dict):
        reasons.append("could not read a well-formed live PR snapshot from gh")
        return reasons
    live_head = snapshot.get("headRefOid")
    if not isinstance(live_head, str) or not GIT_SHA_RE.match(live_head):
        reasons.append("live snapshot headRefOid is not an exact 40-char lowercase-hex SHA")
    if snapshot.get("number") != pr:
        reasons.append("live snapshot PR number %r does not match requested %r" % (snapshot.get("number"), pr))
    if snapshot.get("state") != "OPEN":
        reasons.append("live PR state is not OPEN: %r" % (snapshot.get("state"),))
    if snapshot.get("baseRefName") != "main":
        reasons.append("live PR base is not main: %r" % (snapshot.get("baseRefName"),))
    if snapshot.get("isDraft") is not False:
        reasons.append("live PR is a draft")
    if snapshot.get("mergeable") != "MERGEABLE":
        reasons.append("live PR mergeable state is not MERGEABLE: %r" % (snapshot.get("mergeable"),))
    if snapshot.get("mergeStateStatus") != "CLEAN":
        reasons.append("live PR mergeStateStatus is not CLEAN: %r" % (snapshot.get("mergeStateStatus"),))
    return reasons


def _new_evidence(repo, pr):
    reasons = []
    return {
        "attempted": False,
        "merge_api_confirmed": False,
        "post_merge_verified": False,
        "merged": False,
        "repo": repo,
        "pr": pr,
        "pre_merge_head": None,
        "merge_sha": None,
        "result": "not_attempted",
        "reasons": reasons,
    }, reasons


def run_controller(*, gh_path, repo, pr, receipt, roster, check_manifest,
                   evidence_index, activation_manifest, expectations):
    """Attempt at most one SHA-guarded, independently post-merge-verified merge. Returns
    structured evidence; never merges unless every gate holds, including live-observed changed
    paths matching the receipt and the requested PR number matching the receipt's own claim.
    ``expectations`` supplies the independently derived verifier bindings (paths/versions/hashes/
    now); ``expected_head_sha``/``expected_pr``/``expected_changed_paths`` are injected from the
    LIVE snapshot, not the receipt."""
    evidence, reasons = _new_evidence(repo, pr)

    if repo not in ALLOWED_REPOS:
        reasons.append(
            "repository %r is not in the constant UG-AUTONOMY-001 repo allowlist %r"
            % (repo, sorted(ALLOWED_REPOS))
        )
        return _finalise(evidence)

    snapshot = _gh_pr_view(gh_path, repo, pr)
    pre_reasons = _pr_eligibility_reasons(snapshot, repo, pr)
    if pre_reasons:
        reasons.extend(pre_reasons)
        return _finalise(evidence)
    live_head = snapshot["headRefOid"]

    live_changed_paths = _live_changed_paths(snapshot)
    if live_changed_paths is None:
        reasons.append("could not independently observe the live PR's changed-file set from gh")
        return _finalise(evidence)

    result = verifier.verify(
        receipt, roster, check_manifest,
        expected_repo=repo,
        expected_base="main",
        expected_head_sha=live_head,
        expected_pr=pr,
        expected_policy_path=expectations["expected_policy_path"],
        expected_policy_version=expectations["expected_policy_version"],
        policy_sha256=expectations["policy_sha256"],
        expected_roster_path=expectations["expected_roster_path"],
        roster_sha256=expectations["roster_sha256"],
        expected_check_manifest_path=expectations["expected_check_manifest_path"],
        check_manifest_sha256=expectations["check_manifest_sha256"],
        now=expectations["now"],
        expected_changed_paths=live_changed_paths,
        evidence_index=evidence_index,
        expected_evidence_index_path=expectations["expected_evidence_index_path"],
        evidence_index_sha256=expectations["evidence_index_sha256"],
        activation_manifest=activation_manifest,
        expected_activation_manifest_path=expectations["expected_activation_manifest_path"],
        activation_manifest_sha256=expectations["activation_manifest_sha256"],
    )
    if not result.merge_authorised:
        reasons.append("verifier did not authorise merge for the live HEAD")
        reasons.extend(result.merge_reasons)
        # Preserve the verifier's semantic reasons too, not just the merge-gate summary: a live
        # roster/check-manifest schema/version admission defect fails board_release_ready and so
        # only leaves the generic "board_release_ready is false" in merge_reasons -- the specific
        # defect lives in result.reasons and must survive into the fail-closed evidence.
        reasons.extend(r for r in result.reasons if r not in reasons)
        return _finalise(evidence)

    # Re-check EVERY live-state field immediately before mutation, not HEAD alone, and require the
    # HEAD to be unchanged since the check above.
    resnapshot = _gh_pr_view(gh_path, repo, pr)
    re_reasons = _pr_eligibility_reasons(resnapshot, repo, pr)
    if re_reasons:
        reasons.append("live PR state changed before mutation; aborting")
        reasons.extend(re_reasons)
        return _finalise(evidence)
    if resnapshot["headRefOid"] != live_head:
        reasons.append("live HEAD drifted between verification and merge; aborting")
        return _finalise(evidence)

    # Fully re-validate the live changed-file set on this SAME immediately-pre-mutation snapshot,
    # via the identical single helper used on the first read -- a late file injected between the
    # two `gh pr view` calls (even a protected docs/constitution/** or tools/board-release-verifier/
    # ** path) must stop the merge even though HEAD/state/base/draft/mergeable/clean are still all
    # green. Never trust the first read's changed-file set to still hold at mutation time.
    re_live_changed_paths = _live_changed_paths(resnapshot)
    if re_live_changed_paths is None:
        reasons.append(
            "could not independently observe the live PR's changed-file set from gh on the "
            "immediately-pre-mutation re-read; aborting"
        )
        return _finalise(evidence)
    if set(re_live_changed_paths) != set(live_changed_paths):
        reasons.append(
            "live changed-file set drifted between verification and merge (first-read=%r "
            "second-read=%r); aborting"
            % (sorted(live_changed_paths), sorted(re_live_changed_paths))
        )
        return _finalise(evidence)
    receipt_changed_paths = receipt.get("changed_paths") if isinstance(receipt, dict) else None
    if not isinstance(receipt_changed_paths, list) or set(re_live_changed_paths) != set(receipt_changed_paths):
        reasons.append(
            "immediately-pre-mutation live changed-file set no longer matches the receipt's "
            "declared changed_paths; aborting"
        )
        return _finalise(evidence)
    late_protected = sorted({
        p for p in re_live_changed_paths
        if p.startswith("docs/constitution/") or p.startswith("tools/board-release-verifier/")
    })
    if late_protected:
        reasons.append(
            "immediately-pre-mutation live changed-file set includes a late protected/governing "
            "path that can never self-authorise merge: %r; aborting" % (late_protected,)
        )
        return _finalise(evidence)

    evidence["attempted"] = True
    evidence["pre_merge_head"] = live_head
    merge_resp = _gh_merge(gh_path, repo, pr, live_head)
    if not isinstance(merge_resp, dict) or merge_resp.get("merged") is not True:
        reasons.append("merge API did not confirm a merge (SHA precondition rejected or API error)")
        evidence["result"] = "merge_failed"
        return _finalise(evidence)

    merge_sha = merge_resp.get("sha")
    if not isinstance(merge_sha, str) or not GIT_SHA_RE.match(merge_sha):
        reasons.append("merge API sha is not an exact 40-character lowercase-hex SHA: %r" % (merge_sha,))
        evidence["result"] = "merge_unverified"
        return _finalise(evidence)

    evidence["merge_api_confirmed"] = True
    evidence["merge_sha"] = merge_sha

    # Independently re-read the PR after the merge API claims success. A merge-API "merged: true"
    # is never itself accepted as proof; only this independent post-merge re-read can set
    # post_merge_verified/merged.
    post_view = _gh_pr_view(gh_path, repo, pr)
    if not isinstance(post_view, dict):
        reasons.append("could not independently re-read the PR after the merge API reported success")
        evidence["result"] = "merge_unverified"
        return _finalise(evidence)
    if post_view.get("state") != "MERGED":
        reasons.append("post-merge re-read state is not MERGED: %r" % (post_view.get("state"),))
        evidence["result"] = "merge_unverified"
        return _finalise(evidence)
    if not post_view.get("mergedAt"):
        reasons.append("post-merge re-read mergedAt is missing")
        evidence["result"] = "merge_unverified"
        return _finalise(evidence)
    if post_view.get("headRefOid") != live_head:
        reasons.append(
            "post-merge re-read headRefOid changed: %r != pre-merge head %s"
            % (post_view.get("headRefOid"), live_head)
        )
        evidence["result"] = "merge_unverified"
        return _finalise(evidence)
    merge_commit = post_view.get("mergeCommit")
    if not isinstance(merge_commit, dict) or merge_commit.get("oid") != merge_sha:
        reasons.append(
            "post-merge re-read mergeCommit.oid %r does not match merge API sha %s"
            % (merge_commit.get("oid") if isinstance(merge_commit, dict) else merge_commit, merge_sha)
        )
        evidence["result"] = "merge_unverified"
        return _finalise(evidence)

    evidence["post_merge_verified"] = True
    evidence["merged"] = True
    evidence["result"] = "merged_verified"
    return _finalise(evidence)


def _finalise(evidence):
    payload = dict(evidence)
    canonical = json.dumps(payload, sort_keys=True).encode("utf-8")
    payload["deterministic_digest"] = hashlib.sha256(canonical).hexdigest()
    return payload


def _load_json_fail_closed(path, label, reasons):
    try:
        text = Path(path).read_text()
    except OSError as exc:
        reasons.append("%s could not be read (%s): %s" % (label, path, exc))
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        reasons.append("%s is not valid JSON (%s): %s" % (label, path, exc))
        return None


def main(argv=None):
    import datetime as dt

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--gh", required=True, help="path to the injected gh binary")
    parser.add_argument("--repo", required=True)
    parser.add_argument("--pr", required=True, type=int)
    parser.add_argument("--receipt", required=True)
    parser.add_argument("--roster", required=True)
    parser.add_argument("--constitution", required=True)
    parser.add_argument("--check-manifest", required=True, dest="check_manifest")
    parser.add_argument("--evidence-index", required=True, dest="evidence_index")
    parser.add_argument("--activation-manifest", required=True, dest="activation_manifest")
    parser.add_argument("--expect-policy-path", required=True)
    parser.add_argument("--expect-policy-version", required=True)
    parser.add_argument("--expect-roster-path", required=True)
    parser.add_argument("--expect-check-manifest-path", required=True)
    parser.add_argument("--expect-evidence-index-path", required=True)
    parser.add_argument("--expect-activation-manifest-path", required=True)
    parser.add_argument("--expect-policy-sha256", required=True)
    parser.add_argument("--expect-roster-sha256", required=True)
    parser.add_argument("--expect-check-manifest-sha256", required=True)
    parser.add_argument("--expect-evidence-index-sha256", required=True)
    parser.add_argument("--expect-activation-manifest-sha256", required=True)
    parser.add_argument("--now", default=None)
    args = parser.parse_args(argv)

    evidence, reasons = _new_evidence(args.repo, args.pr)

    # Independent trust-anchor binding (finding 6): compare caller-supplied expected hashes to the
    # actual files on disk BEFORE ever reading their content or calling gh/the verifier.
    hash_reasons = verifier.verify_expected_hashes([
        ("policy", args.constitution, args.expect_policy_sha256),
        ("roster", args.roster, args.expect_roster_sha256),
        ("check-manifest", args.check_manifest, args.expect_check_manifest_sha256),
        ("evidence-index", args.evidence_index, args.expect_evidence_index_sha256),
        ("activation-manifest", args.activation_manifest, args.expect_activation_manifest_sha256),
    ])
    if hash_reasons:
        reasons.extend(hash_reasons)
        evidence["result"] = "rejected_before_verification"
        print(json.dumps(_finalise(evidence), indent=2, sort_keys=True))
        return 1

    receipt = _load_json_fail_closed(args.receipt, "receipt", reasons)
    roster = _load_json_fail_closed(args.roster, "roster", reasons)
    check_manifest = _load_json_fail_closed(args.check_manifest, "check_manifest", reasons)
    evidence_index = _load_json_fail_closed(args.evidence_index, "evidence_index", reasons)
    activation_manifest = _load_json_fail_closed(args.activation_manifest, "activation_manifest", reasons)
    if reasons:
        evidence["result"] = "rejected_before_verification"
        print(json.dumps(_finalise(evidence), indent=2, sort_keys=True))
        return 1

    if args.now:
        raw = args.now[:-1] + "+00:00" if args.now.endswith("Z") else args.now
        try:
            now = dt.datetime.fromisoformat(raw)
        except ValueError as exc:
            reasons.append("--now is not a valid ISO 8601 timestamp: %s" % (exc,))
            evidence["result"] = "rejected_before_verification"
            print(json.dumps(_finalise(evidence), indent=2, sort_keys=True))
            return 1
        if now.tzinfo is None:
            now = now.replace(tzinfo=dt.timezone.utc)
    else:
        now = dt.datetime.now(dt.timezone.utc)

    expectations = {
        "expected_policy_path": args.expect_policy_path,
        "expected_policy_version": args.expect_policy_version,
        "policy_sha256": args.expect_policy_sha256,
        "expected_roster_path": args.expect_roster_path,
        "roster_sha256": args.expect_roster_sha256,
        "expected_check_manifest_path": args.expect_check_manifest_path,
        "check_manifest_sha256": args.expect_check_manifest_sha256,
        "expected_evidence_index_path": args.expect_evidence_index_path,
        "evidence_index_sha256": args.expect_evidence_index_sha256,
        "expected_activation_manifest_path": args.expect_activation_manifest_path,
        "activation_manifest_sha256": args.expect_activation_manifest_sha256,
        "now": now,
    }

    result_evidence = run_controller(
        gh_path=args.gh, repo=args.repo, pr=args.pr,
        receipt=receipt, roster=roster, check_manifest=check_manifest,
        evidence_index=evidence_index, activation_manifest=activation_manifest,
        expectations=expectations,
    )
    print(json.dumps(result_evidence, indent=2, sort_keys=True))
    return 0 if result_evidence["merged"] else 1


if __name__ == "__main__":
    sys.exit(main())
