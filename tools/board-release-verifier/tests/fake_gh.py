#!/usr/bin/env python3
"""Fake `gh` executable for controller tests. NEVER touches the network.

Behaviour is driven by a scenario JSON file whose path is in the FAKE_GH_STATE env var. Every
invocation is appended to that file's "_calls" list so a test can assert exactly how many merge
calls happened. Supported subcommands mirror precisely the ones the controller is allowed to issue:

  gh pr view <pr> --repo <repo> --json number,state,baseRefName,headRefOid,url,isDraft,mergeable,
                                       mergeStateStatus,mergedAt,mergeCommit
  gh api --method PUT repos/<repo>/pulls/<pr>/merge -f sha=<head> -f merge_method=squash

Scenario keys:
  views          : list of dicts returned by successive `pr view` calls (last one repeats)
  malformed_view : if true, `pr view` prints non-JSON garbage
  merge          : {"merged": bool, "sha": str} returned by the merge api
  merge_fail     : if true, the merge api exits non-zero (simulated API failure)
"""
import json
import os
import sys


def _load():
    with open(os.environ["FAKE_GH_STATE"]) as fh:
        return json.load(fh)


def _save(state):
    with open(os.environ["FAKE_GH_STATE"], "w") as fh:
        json.dump(state, fh)


def main():
    args = sys.argv[1:]
    state = _load()
    calls = state.setdefault("_calls", [])
    calls.append(args)
    _save(state)

    if args[:2] == ["pr", "view"]:
        if state.get("malformed_view"):
            sys.stdout.write("this is not json <<<")
            return 0
        views = state.get("views", [])
        # count prior view calls to index into the scripted sequence
        prior_views = sum(1 for c in calls[:-1] if c[:2] == ["pr", "view"])
        idx = min(prior_views, len(views) - 1)
        sys.stdout.write(json.dumps(views[idx]))
        return 0

    if args[:1] == ["api"] and "--method" in args:
        if state.get("merge_fail"):
            sys.stderr.write("HTTP 409: head changed")
            return 1
        merge = state.get("merge", {"merged": True, "sha": "mergedsha"})
        sys.stdout.write(json.dumps(merge))
        return 0

    sys.stderr.write("fake_gh: unsupported argv: %r" % (args,))
    return 2


if __name__ == "__main__":
    sys.exit(main())
