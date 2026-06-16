# Personal Intelligence fallback follow-up PR plan

Date: 2026-05-26 20:15 AEST
Project: Unite-Group
Status: prepared locally; do not start until PR #198 is merged or explicitly parked.

## Goal

Move the local-only Personal Intelligence / Telegram approval-callback fallback slice into a clean, separate PR after PR #198 is closed, without adding any fallback changes to PR #198.

## Freeze boundary

- PR #198 remains branch-policy blocked at head `a0e5d195bce59ee02b8dfdc001583bbc52455a8b`.
- Do not push local fallback files to `margot/addon-task-status-evidence`.
- Do not merge fallback files into PR #198.
- Do not use admin override.
- Do not deploy, mutate Vercel env, apply production DB migrations, or perform client-facing/billing actions as part of this follow-up plan.

## Proposed follow-up branch

Create only after PR #198 is merged or explicitly parked:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c margot/personal-intelligence-fallback
```

## Candidate local fallback scope to review for the new PR

Current local status shows the follow-up candidate area includes, but must be re-audited from latest `origin/main` before staging:

- `docs/margot/PERSONAL-INTELLIGENCE-SECOND-ASSISTANT-MODEL.md`
- `docs/margot/personal-intelligence-candidate-register.md`
- `docs/margot/personal-intelligence/`
- `docs/plans/2026-05-25-personal-intelligence-second-assistant.md`
- `scripts/personal-intelligence-*.ts`
- `src/app/api/telegram/approval-callback/`
- `src/lib/personal-intelligence/`
- `tests/unit/app/`
- `tests/unit/lib/personal-intelligence/`
- `tests/unit/scripts/`

Exclude PR #198 evidence/status files unless the new PR specifically needs a docs-only status update from latest main.

## Build sequence

1. Rebase from latest `origin/main` after PR #198 closure.
2. Re-audit local fallback diff and split into the smallest independently verifiable slice if the candidate scope is too broad.
3. Stage only Personal Intelligence fallback files; explicitly exclude the PR #198 branch evidence files unless intentionally documented.
4. Commit with a narrow conventional message, for example:

```bash
git add <approved fallback files only>
git commit -m "feat: add personal intelligence fallback approval flow"
```

5. Run focused gates:

```bash
npx jest tests/unit/lib/personal-intelligence/classifier.test.ts tests/unit/lib/personal-intelligence/youtube.test.ts tests/unit/lib/personal-intelligence/youtube-intake.test.ts tests/unit/lib/personal-intelligence/intake-report.test.ts --runInBand
npm run type-check
npm run security:routes-check
git diff --check
```

6. Open a new PR against `main` only after the focused gates pass.
7. Monitor CI and Vercel status checks as observation only; no manual deploy/env mutation without explicit approval.
8. Merge only after normal branch policy is satisfied.

## PR body checklist

- Summary: Personal Intelligence fallback approval/intake flow.
- Scope: local-first fallback and tests only.
- Explicitly state: not part of PR #198; no production DB writes; no Vercel env mutation.
- Verification: focused Jest, type-check, route-security inventory, diff hygiene.
- Rollback: revert the follow-up PR; no data migration expected unless separately approved.

## Current blocker

PR #198 could not be merged from this account at 2026-05-26 20:15 AEST:

- Self-approval attempt failed with GitHub policy: `Review Can not approve your own pull request`.
- Normal squash merge failed: `the base branch policy prohibits the merge`.
- Auto-merge failed: `Auto merge is not allowed for this repository`.

Required next action: a non-author reviewer or repository policy/admin path must satisfy the PR #198 branch policy before the follow-up branch starts.
