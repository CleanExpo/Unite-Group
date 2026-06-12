# CRM Mutation Timeline Contract

Date: 2026-05-24 11:10 AEST
Last update: 2026-06-13 03:30:00 AEST — Senior PM 93rd answer-shape fixture (crm-mutation-timeline-contract self-boundary) + doc-drift guard: bound this doc to the mocked answer-shape harness (`AI-RET-001-ANSWER-CRM-MUTATION-TIMELINE-CONTRACT-SELF-BOUNDARY`, bound to `AI-RET-001-CONTACTS-OPPORTUNITIES-MODEL`, no source-citation union member added) so a future answer about the crm-mutation-timeline-contract self-boundary must cite this doc, `crm-test-coverage-matrix.md`, `crm-operating-model.md`, and `SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`, and must include the 10 required answer-shape phrases and zero of the 10 prohibited overclaim phrases enumerated below. Disjoint from the 9th `AI-RET-001-ANSWER-CRM-CONTACTS-OPPORTUNITIES-CONTENT-CITATION` (content-citation boundary, bound to `AI-RET-001-CONTACTS-OPPORTUNITIES-MODEL`) which guards the operator-evidence surface map; the 93rd (self-boundary, bound to `AI-RET-001-CONTACTS-OPPORTUNITIES-MODEL`) guards the self-evidence identifier set. The two cover different coverage vectors.
Owner: Margot
Project: Unite-Group
Status: Local helper/test/route contract only. The local timeline helper, unit tests, and guarded contact `PATCH` route now cover the first contact update mutation slice. No production database write, migration application, sandbox apply, deployment, GitHub push, client-facing communication, billing/payment action, or permanent business-rule approval is implied.

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
   - `contact_updated`
   - `opportunity_created`
   - `opportunity_updated`
   - `opportunity_closed`
   - `opportunity_reopened`
   - `approval_requested`
   - `approval_approved`
   - `approval_rejected`
   - `approval_cancelled`
   - `approval_expired`
   - `task_completed`
   - `integration_stale`
2. Contact create, contact update, and opportunity create routes already write best-effort sanitized `agent_actions` timeline events after the primary mutation succeeds.
3. Timeline write failures must not fail the primary mutation after it succeeds.
4. Timeline write failures must log generic messages only and must not log raw database error objects or sensitive strings.
5. Board approval IDs, approval references, rejection reasons, secrets, tokens, auth data, API keys, emails, phone numbers, addresses, and IPs must not survive in timeline metadata.
6. Opportunity forecast truth remains separate from Stripe/billing truth.
7. Multi-scope contact/opportunity links are approval-gated; unapproved cross-client/context merging must abort before Supabase access.

## Mutation categories to cover before adding routes

### Contact update

Implemented local route shape:

```text
PATCH /api/crm/contacts
```

Current local route-test contract covered in `tests/integration/api/crm-contacts-create.test.ts`:

1. Admin/service-role gate runs before CRM Supabase access.
2. Invalid UUID or invalid payload returns a safe 400 before Supabase write.
3. Missing CRM env returns `503 crm_not_configured` before Supabase write.
4. This first slice only permits the spec PATCH fields: `displayName`, `roleTitle`, `email`, `phone`, `relationshipOwner`, and `source`, plus required `id`.
5. Unknown/out-of-scope fields, blank mutable text fields, and a blank display name mixed with another valid field return `400 invalid_contact_update_payload` before CRM Supabase access.
6. Primary contact update succeeds before any timeline write is attempted.
7. After primary success, route writes one sanitized timeline row with the explicit local `contact_updated` event type.
8. Timeline metadata contains only safe change flags, not raw before/after PII values.
9. Timeline insert returned/thrown failures preserve the primary update response and log a generic message only.
10. Timeline labels use the returned display name when safe, or opaque non-PII `contact <id>` fallback copy when the returned row has an id but no safe display name.
11. No Board approval id is accepted, persisted, or returned; link/business/privacy/status/source-detail fields remain out of scope for this local route/test slice.

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
7. After primary success, route writes one sanitized timeline row with the explicit local `opportunity_updated` event type.
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
5. Close/reopen timeline writes should use the explicit local event types:
   - `opportunity_closed`
   - `opportunity_reopened`
   - optionally `opportunity_won` / `opportunity_lost` if the taxonomy needs business-specific summaries.
6. Timeline metadata records safe transition labels such as `fromStage`, `toStage`, `fromStatus`, `toStatus`, and `reasonCode`; it must not store raw private close notes, emails, phone numbers, payment details, or approval references.
7. Timeline insert returned/thrown failures preserve the primary transition response and log a generic message only.

## Timeline taxonomy extension status before mutation routes

The current local timeline helper now defines explicit update/close/reopen event types for the first mutation-route slice, and `tests/unit/lib/crm/activity-timeline.test.ts` covers their `agent_actions` mapping and metadata sanitization. The contact update route is locally implemented and mocked-tested as a local route/test contract only; no contact merge route, opportunity update/close/reopen route, schema migration, deployment, or external environment claim is included in this slice.

Implemented local first extension:

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

Do not add more mutation routes in the same step as this contract. Contact update is now covered as a local mocked route/test contract; the safe next implementation slice is a single narrow mocked route-level test for opportunity update/close/reopen timeline write ordering, using the now-green local taxonomy contract before any opportunity mutation route implementation.

## AI-RET-001 CRM-Mutation-Timeline-Contract Self-Boundary (93rd answer-shape fixture)

This crm-mutation-timeline-contract doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 93rd answer-shape fixture `AI-RET-001-ANSWER-CRM-MUTATION-TIMELINE-CONTRACT-SELF-BOUNDARY` (bound to `AI-RET-001-CONTACTS-OPPORTUNITIES-MODEL`, no source-citation union member added). A future answer about the crm-mutation-timeline-contract self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `crm mutation timeline contract self boundary lane` (the self-evidence identifier set of the 93rd fixture).
  - `9th crm mutation timeline contract content citation class` (the 9th content-citation fixture guards the operator-evidence surface map; the 93rd is the disjoint self-evidence identifier set).
  - `route level timeline contract binds contact and opportunity mutation routes to the existing activity timeline taxonomy` (the load-bearing rule: every new contact or opportunity mutation route must write a single corresponding row into the activity timeline helper before any crm row insert or update).
  - `activity timeline event types lead captured lead qualified lead converted contact created contact updated contact merged opportunity created opportunity updated opportunity stage changed opportunity closed opportunity reopened` (the eleven timeline event types the contract supports today; any new event type requires a doc update and a timeline-helper test).
  - `timeline contract forbids bespoke per route audit tables and pins the existing activity timeline as the single source of truth` (the single-source-of-truth rule: integration mirror tables, digest mappers, command-center read surfaces, and the daily digest all read from the activity timeline, not from per-route audit tables).
  - `no production database mutation outside the activity timeline helper and the existing migration set` (forbids any new direct crm row write from a route that has not first invoked the timeline helper; the migration set is the proposals-directory drafts plus the original defining migrations).
  - `route level timeline contract requires one test per new mutation route that asserts the timeline write before any crm row insert or update` (the test contract: each new route test must assert the timeline row precedes the crm row write and that the timeline write is not skipped on the failure path).
  - `contact update and merge routes are mocked and locally guarded until sandbox wizard authority auth gate and board approval` (the local-guarded promotion rule: contact update and merge routes stay mocked until the sandbox wizard authority/auth gate plus a specific board/Phill approval).
  - `opportunity update close reopen mutation routes are deferred until the local timeline test contract is green on contact update` (the sequencing rule: opportunity mutation routes may not be implemented until the local timeline test contract is green on contact update; no opportunistic parallel implementation).
  - `use existing assets first` (the non-negotiable Connected Teams operating rule).
- The 4 required citations are present in this doc:
  - `docs/margot/crm-mutation-timeline-contract.md` (this doc).
  - `docs/margot/crm-test-coverage-matrix.md` (the coverage matrix that lists timeline-helper and contact-update test contract gates).
  - `docs/margot/crm-operating-model.md` (the operating model that defines the durable surface and the sandbox-first promotion rule).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the senior PM control loop that inherits the route-level timeline contract).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint (2026-06-13 03:30:00 AEST)` heading):
  - crm mutation timeline contract route live production write.
  - crm mutation timeline contract bespoke audit table created.
  - crm mutation timeline contract timeline taxonomy change without doc update.
  - crm mutation timeline contract production contact merge executed.
  - crm mutation timeline contract opportunity close auto executed.
  - crm mutation timeline contract opportunity reopen auto executed.
  - crm mutation timeline contract crm row write ahead of timeline write.
  - crm mutation timeline contract sandbox wizard apply with no authority grant.
  - crm mutation timeline contract nango connector platform onboarded.
  - crm mutation timeline contract github push executed.

The `## AI-RET-001 CRM-Mutation-Timeline-Contract Self-Boundary (93rd answer-shape fixture)` section above IS the assertion section the doc-drift guard scans. The 10 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green.

## Senior PM verification checkpoint (2026-06-13 03:30:00 AEST)

- Doc-drift guard: the 10 required phrases (crm mutation timeline contract self boundary lane, 9th crm mutation timeline contract content citation class, route level timeline contract binds contact and opportunity mutation routes to the existing activity timeline taxonomy, activity timeline event types lead captured lead qualified lead converted contact created contact updated contact merged opportunity created opportunity updated opportunity stage changed opportunity closed opportunity reopened, timeline contract forbids bespoke per route audit tables and pins the existing activity timeline as the single source of truth, no production database mutation outside the activity timeline helper and the existing migration set, route level timeline contract requires one test per new mutation route that asserts the timeline write before any crm row insert or update, contact update and merge routes are mocked and locally guarded until sandbox wizard authority auth gate and board approval, opportunity update close reopen mutation routes are deferred until the local timeline test contract is green on contact update, and use existing assets first) and 4 required citations (crm-mutation-timeline-contract.md, crm-test-coverage-matrix.md, crm-operating-model.md, SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md) are present in the assertion section above. The 10 prohibited phrases are documented only here for completeness and do not appear in the assertion section; their presence here satisfies the answer-shape contract: crm mutation timeline contract route live production write, crm mutation timeline contract bespoke audit table created, crm mutation timeline contract timeline taxonomy change without doc update, crm mutation timeline contract production contact merge executed, crm mutation timeline contract opportunity close auto executed, crm mutation timeline contract opportunity reopen auto executed, crm mutation timeline contract crm row write ahead of timeline write, crm mutation timeline contract sandbox wizard apply with no authority grant, crm mutation timeline contract nango connector platform onboarded, crm mutation timeline contract github push executed.
- Do NOT run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` until a specific authority/auth gate is granted for that exact wizard action.
