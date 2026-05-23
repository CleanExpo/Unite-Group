# CRM Mutation Timeline Contract

Date: 2026-05-24 09:25 AEST
Owner: Margot
Project: Unite-Group
Status: Local planning/test contract only. No route has been added by this document. No production database write, migration application, sandbox apply, deployment, GitHub push, client-facing communication, billing/payment action, or permanent business-rule approval is implied.

## Purpose

The current CRM has verified local create/conversion timeline writes for leads, contacts, opportunities, and approval requests. Before adding broader contact update/merge routes or opportunity update/close/reopen routes, Margot needs a route-level timeline contract so new mutation routes do not invent inconsistent audit behavior.

This document turns the current coverage-matrix gap into an executable test plan. It should be read with:

- `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`
- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
- `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
- `docs/margot/high-level-crm-25-step-forecast.md`
- `docs/margot/crm-test-coverage-matrix.md`
- `src/lib/crm/activity-timeline.ts`

## Existing local baseline

Current local baseline from repo evidence:

1. `src/lib/crm/activity-timeline.ts` supports these CRM timeline event types:
   - `lead_captured`
   - `lead_qualified`
   - `lead_converted`
   - `contact_created`
   - `opportunity_created`
   - `approval_requested`
   - `approval_approved`
   - `approval_rejected`
   - `approval_cancelled`
   - `approval_expired`
   - `task_completed`
   - `integration_stale`
2. Contact create and opportunity create routes already write best-effort sanitized `agent_actions` timeline events after the primary mutation succeeds.
3. Timeline write failures must not fail the primary mutation after it succeeds.
4. Timeline write failures must log generic messages only and must not log raw database error objects or sensitive strings.
5. Board approval IDs, approval references, rejection reasons, secrets, tokens, auth data, API keys, emails, phone numbers, addresses, and IPs must not survive in timeline metadata.
6. Opportunity forecast truth remains separate from Stripe/billing truth.
7. Multi-scope contact/opportunity links are approval-gated; unapproved cross-client/context merging must abort before Supabase access.

## Mutation categories to cover before adding routes

### Contact update

Candidate route shape:

```text
PATCH /api/crm/contacts/[id]
```

Minimum local route-test contract before implementation is considered covered:

1. Admin/service-role gate runs before CRM Supabase access.
2. Invalid UUID or invalid payload returns a safe 400 before Supabase write.
3. Missing CRM env returns `503 crm_not_configured` before Supabase write.
4. Identity-changing fields (`primaryEmail`, `primaryPhone`, `linkedClientId`, `linkedBusinessId`, `privacyScope`) require either a safe same-scope proof or Board approval id.
5. Multi-scope link changes without approval return `403 operator_approval_required` before Supabase access.
6. Primary contact update succeeds before any timeline write is attempted.
7. After primary success, route writes one sanitized timeline row with a future explicit `contact_updated` event type, or uses a documented fallback only if the timeline taxonomy has not yet been extended.
8. Timeline metadata contains only safe change flags, not raw before/after PII values.
9. Timeline insert returned/thrown failures preserve the primary update response and log a generic message only.
10. No Board approval id is persisted or returned.

### Contact merge

Candidate route shape:

```text
POST /api/crm/contacts/[id]/merge
```

Minimum local route-test contract before implementation is considered covered:

1. Merge always requires Board approval id.
2. Merge aborts if source and target appear to cross client/business/privacy scopes without an explicit approved merge reason.
3. Merge never copies raw cross-client notes into the surviving contact.
4. Primary merge/update transaction succeeds before timeline write.
5. Timeline write uses a future explicit `contact_merged` event type, or remains unimplemented until that type exists.
6. Timeline metadata records safe structural facts only: `sourceContactPresent`, `targetContactPresent`, `sameClientScope`, `sameBusinessScope`, `boardApprovalProvided=true` is not allowed because approval references are blocked from metadata; prefer `approvalRequired=true` on the event instead.
7. Timeline insert failure does not roll back a primary merge after it has succeeded, but any partial primary failure must return a safe error before timeline writing.

### Opportunity update

Candidate route shape:

```text
PATCH /api/crm/opportunities/[id]
```

Minimum local route-test contract before implementation is considered covered:

1. Admin/service-role gate runs before CRM Supabase access.
2. Invalid UUID or invalid payload returns a safe 400 before Supabase write.
3. Forecast fields (`valueAmount`, `probability`, `expectedCloseAt`) remain decision-support only and must not touch Stripe/customer billing tables.
4. Stage/status transitions that imply won, conversion, external commitment, or client mutation require approval flags and Board approval id.
5. Multi-scope link changes without approval return `403 operator_approval_required` before Supabase access.
6. Primary opportunity update succeeds before timeline write.
7. After primary success, route writes one sanitized timeline row with a future explicit `opportunity_updated` event type, or uses a documented fallback only if the timeline taxonomy has not yet been extended.
8. Timeline metadata contains safe changed-field names/classes only; no raw proposal terms, PII, billing/payment data, Board approval id, or client-private notes.
9. Timeline insert returned/thrown failures preserve the primary update response and log a generic message only.

### Opportunity close / reopen

Candidate route shapes:

```text
POST /api/crm/opportunities/[id]/close
POST /api/crm/opportunities/[id]/reopen
```

Minimum local route-test contract before implementation is considered covered:

1. Closing as `won` or `won_pending_client_conversion` requires explicit approval flags and Board approval id.
2. Closing as `lost`, `paused`, or `cancelled` can be draft/local CRM state only and must not send client-facing communication.
3. Reopening after `won_converted` requires Board approval id because it can contradict client/billing state.
4. Primary status/stage transition succeeds before timeline write.
5. Close/reopen timeline writes should use future explicit event types:
   - `opportunity_closed`
   - `opportunity_reopened`
   - optionally `opportunity_won` / `opportunity_lost` if the taxonomy needs business-specific summaries.
6. Timeline metadata records safe transition labels such as `fromStage`, `toStage`, `fromStatus`, `toStatus`, and `reasonCode`; it must not store raw private close notes, emails, phone numbers, payment details, or approval references.
7. Timeline insert returned/thrown failures preserve the primary transition response and log a generic message only.

## Timeline taxonomy extension needed before mutation routes

The current timeline helper does not yet define explicit update/merge/close/reopen event types. Before implementing mutation routes, extend `CrmActivityTimelineEventType` and tests with the smallest set needed for the route being added.

Recommended first extension:

```text
contact_updated
opportunity_updated
opportunity_closed
opportunity_reopened
```

Recommended later extension only when needed:

```text
contact_merged
opportunity_won
opportunity_lost
```

Each new type must have:

1. Category, severity, action class, and label in `TYPE_CONFIG`.
2. Unit coverage in `tests/unit/lib/crm/activity-timeline.test.ts`.
3. Sanitization coverage proving metadata does not leak sensitive fields.
4. Route-level coverage proving primary mutation success precedes best-effort timeline insert.

## Safe verification gates

When only this document changes:

```bash
git diff --check
```

When timeline taxonomy changes:

```bash
npx jest tests/unit/lib/crm/activity-timeline.test.ts --runInBand
npm run type-check
npm run security:routes-check
```

When contact/opportunity mutation routes are added:

```bash
npx jest tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/activity-timeline.test.ts --runInBand
npm run type-check
npm run security:routes-check
git diff --check
```

If new route test files are created, include those files in the focused Jest command.

## Current decision

Do not add update/merge/close/reopen routes in the same step as this contract. The safe next implementation slice is to extend the timeline taxonomy with one or two explicit mutation event types and write RED unit tests first, then add a single narrow mocked route test only after the taxonomy contract is green.
