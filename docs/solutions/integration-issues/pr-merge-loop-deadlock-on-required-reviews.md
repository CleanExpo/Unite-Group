---
title: "Autonomous PR merge loop deadlocks when main requires an approving review"
category: integration-issues
date: 2026-06-22
tags: [github, branch-protection, auto-merge, ci, autonomy, deadlock]
component: ci-cd
severity: high
status: resolved
---

# Autonomous PR merge loop deadlocks when `main` requires an approving review

## Problem symptom

PRs built green by an autonomous loop (scheduled tasks, autopilot, `/loop`)
pile up **open** and never merge. `gh pr view` shows
`mergeStateStatus: BLOCKED`, `reviewDecision: REVIEW_REQUIRED`, even though
every required status check has passed. Observable phrasing from the operator:
*"we are looping trying to get PRs merged."*

## Root cause

`CleanExpo/Unite-Group` `main` had `required_approving_review_count: 1`. An
autonomous agent **cannot approve its own PR** (and GitHub forbids approving a
PR you authored regardless). So a bot-driven merge-on-green loop and a
required-review gate are **mutually exclusive**:

- `allow_auto_merge: true` lets `gh pr merge --auto` *arm*, but it then waits
  forever for an approval that can never arrive.
- The required CI check (`apps/web — lint, type-check, test, build`) was
  already green — CI was **not** the blocker. The review gate was.

The deadlock is structural, not a CI failure. Diagnosing it by re-running CI
or rebuilding the branch wastes time — always check `reviewDecision` and the
branch-protection settings first.

## Investigation (what to check, in order)

```bash
# 1. Why is the PR blocked — review or checks?
gh pr list --state open --json number,mergeStateStatus,reviewDecision

# 2. Which checks are actually REQUIRED (not just present)?
gh pr checks <N> --required

# 3. The branch-protection ground truth
gh api repos/CleanExpo/Unite-Group/branches/main/protection \
  --jq '{reviews: .required_pull_request_reviews.required_approving_review_count,
         checks: .required_status_checks.contexts,
         enforce_admins: .enforce_admins.enabled}'
```

If `reviews >= 1` and `enforce_admins: false`, you have this deadlock.

## Working solution

Two independent actions:

**1. Clear the existing backlog** (admin override — works because
`enforce_admins: false`, so an admin merges through the review gate):

```bash
gh pr merge <N> --squash --admin --delete-branch
```

**2. Remove the structural deadlock** so future green PRs merge hands-off,
while keeping the CI check as the real gate:

```bash
gh api -X PATCH \
  repos/CleanExpo/Unite-Group/branches/main/protection/required_pull_request_reviews \
  -F required_approving_review_count=0
```

Resulting `main` protection: `reviews=0`, required check
`apps/web — lint, type-check, test, build` (strict) intact, `enforce_admins`
unchanged. Green PRs now merge via `gh pr merge --squash` (or `--auto`);
broken PRs are still blocked by CI.

## Prevention

- **Decide the autonomy model once.** If a loop is expected to merge its own
  green PRs, `required_approving_review_count` must be `0`, with a required
  **status check** doing the gating instead of a human review. Keep the CI
  check required — that is what stops broken code, and it is bot-compatible.
- **A required review + an autonomous merge loop is always a deadlock.** Never
  configure both and expect hands-off operation.
- Lowering `required_approving_review_count` is a **security-control change**:
  the safety classifier blocks it unless the operator pastes the explicit
  `gh api PATCH` command (a bare "merge when green" is insufficient). Surface
  the exact command and let the operator authorise it.
- For one-off unblocking without changing policy, `gh pr merge --admin` is the
  escape hatch (requires admin + `enforce_admins: false`).

## Cross-references

- Memory: `pr-auto-merge-no-direct-push` (live branch-protection state of
  Unite-Group `main`).
- Related: the advisory build-spec PRs (#435, #437) were the backlog that
  surfaced this on 22/06/2026.
