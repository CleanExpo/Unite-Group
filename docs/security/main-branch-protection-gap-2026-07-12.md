# Main branch protection gap — 12 July 2026

Live, read-only GitHub inspection on 12 July 2026 confirmed:

- one approving review is required;
- no required status-check contexts are configured;
- administrators are not covered by the branch-protection rule; and
- no repository ruleset supplies an equivalent check gate.

The repository therefore has CI workflows but GitHub does not currently require
them to pass before merge. A green local run or a workflow definition is not an
enforced production safeguard.

No GitHub settings were changed in this work. Branch-protection mutation is a
separate external control-plane action. After this branch's first pull-request
run establishes the exact stable check-context names, the owner should approve a
bounded protection update that:

1. requires the active package, readiness, docs-watch, dependency-audit, and
   end-to-end contexts selected for production policy;
2. requires the branch to be up to date before merge;
3. keeps at least one independent approval and dismisses stale approvals;
4. blocks force-pushes and deletion; and
5. decides explicitly whether administrators are subject to the same gate.

Capture the before/after rule JSON and one blocked-red/allowed-green test as the
verification receipt. Do not guess context names before the workflow has run,
and do not weaken the approval requirement while adding checks.
