# Extend `/api/approvals/[token]/route.ts` for CCW 3-lane decisions

This is a specification only. Do **not** apply it until Phill + Board approval.

## Goal
Extend the existing magic-link approval route so one approval row can track three independent lane decisions.

## New POST body
```json
{
  "lane_id": "lane-1" | "lane-2" | "lane-3",
  "decision": "approved" | "changes-requested" | "rejected",
  "changes_requested_body": "optional text"
}
```

## New approval row shape
- `deliverable_id = 'ccw-service-busy-2026-06-12'`
- `deliverable_title = 'CCW Service Department Busy — 3-Lane Approval'`
- `deliverable_body = { lanes: [...] }` JSON containing the three lane payloads rendered by the portal
- new column: `lane_decisions JSONB`

## Migration filename
`20260612120000_client_approvals_multi_lane.sql`

## Migration SQL
```sql
ALTER TABLE client_approvals
ADD COLUMN IF NOT EXISTS lane_decisions JSONB DEFAULT '{}'::jsonb;
```

## Per-lane audit hash
Per lane, compute:
```text
sha256(id|lane_id|status|responded_at|deliverable_id)
```

## Route handler shape
Add an internal function like:
```ts
handleDecision(request, approval, laneId, decision, body) -> { ok, signatureHash, nextStep }
```

## Behaviour
- One lane can be signed independently of the other two.
- Update `lane_decisions[lane_id]` with status, signature_hash, responded_at, and any changes request text.
- Reject and changes-requested both halt the lane and generate an explainer for Phill.
- Approved lanes may queue the next step based on `chain-on-approval.ts`.

## Approval boundary
This touches a production table. It remains blocked until Phill + Board approve the spec and the migration is reviewed.
