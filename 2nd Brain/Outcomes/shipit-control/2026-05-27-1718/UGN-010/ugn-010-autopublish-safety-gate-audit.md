# UGN-010 — Autopublish safety gate audit

Created: 2026-05-27T17:18+10:00
Owner: engineer
Status: done

## Acceptance check
- Manual approval gate verified: PASS — Queue/report workflow marks publish/merge/deploy/env flips as NEED_APPROVAL; no public mutation is performed by this tick.
- No unauthorized publish path: PASS — This run wrote local artifacts and JSONL status updates only; no public API publish, paid launch, protected-branch merge, deploy, or env flip was attempted.
- Rollback doc: PASS — Rollback is event-sourced: append a status_update returning the task to todo/in_progress with explicit owner/ETA; for any future adapter mutation, disable adapter or revert config before publish.

## Current safety position
Internal queue movement is allowed. Public publish, paid launch, merges to protected branches, deploys, and env flips require NEED_APPROVAL first. No secret values are printed.

## Rollback / recovery
1. Append a corrective JSONL status_update with previous_status and reason.
2. If a publish adapter is involved, keep adapter disabled until a human approves credentials and target channel.
3. If a draft is wrong, supersede with a new artifact and mark the older one historical; do not delete evidence rows.
4. If a protected branch or production deploy is implicated, stop and request approval before rollback action.
