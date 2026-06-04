---
type: governance
component: human-approval-gates
status: active
created: 2026-06-04
owner: board-secretary
---

# Human Approval Gates

## Actions requiring approval

Agentic Nexus must require human approval for:

- merging pull requests
- deploying production
- sending emails externally
- sending client/public messages
- publishing public content
- scheduling posts/campaigns externally
- changing billing/payment logic
- creating invoices or payment actions
- deleting files or data
- modifying database policies/RLS
- modifying authentication/authorization/session logic
- production database migrations/writes
- changing secrets/env vars
- legal/compliance-sensitive recommendations/actions
- accounting/tax-sensitive recommendations/actions
- destructive shell/git operations
- new vendors/tools/accounts/services
- Nango or connector platforms: forbidden unless explicitly approved

## Approval states

`approval_pending -> approved | rejected | expired | superseded`

## Approval record

```json
{
  "approval_id": "APR-20260604-0001",
  "task_id": "ANX-20260604-0001",
  "requested_action": "exact action",
  "risk_level": "medium|high|critical",
  "evidence_summary": "why this is requested",
  "status": "approval_pending",
  "human_decision": null,
  "created_at": "ISO-8601"
}
```

## Default stance

If unsure, block and ask for approval. Do not execute sensitive actions by inference.
