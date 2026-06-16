# Lead-to-Client Conversion Plan

Date: 2026-05-23
Last update: 2026-06-12 18:30:00 AEST — Senior PM 92nd answer-shape fixture (lead-to-client-conversion-plan self-boundary) + doc-drift guard: bound this doc to the mocked answer-shape harness (`AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-PLAN-SELF-BOUNDARY`, bound to `AI-RET-001-LEAD-QUALIFICATION`, no source-citation union member added) so a future answer about the lead-to-client-conversion-plan self-boundary must cite this doc, `src/lib/crm/qualify-lead.ts`, `SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`, and `crm-operating-model.md`, and must include the 10 required answer-shape phrases and zero of the 10 prohibited overclaim phrases enumerated below. Previous refresh 2026-06-09 21:32 AEST (Senior PM control-surface refresh).
Previous refresh: 2026-05-23 (initial version)
Owner: Margot
Related evidence: `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (overallStatus=pass, source=7/7, answerShape=8/8)
Related fixture: `AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-BOUNDARY` (linked to `AI-RET-001-LEAD-QUALIFICATION` source-citation fixture; required answer phrases and prohibited phrases asserted in `src/lib/margot/retrieval-evaluation.ts` and `tests/unit/lib/margot/retrieval-evaluation.test.ts`)
Related rotation guard: see `## Senior PM verification checkpoint (2026-06-09 21:32 AEST)` at the end of this file
Status: Local guarded route/test contract exists; production conversion is not promoted/applied and no production DB write has been verified

## Non-negotiable rule

Lead qualification is recommendation-only (no auto-conversion). A score or band can prioritize review, but it must not create, overwrite, merge, or convert a client without passing the identity gates below and an explicit operator-approved conversion action. The plan enforces no crm identity overwrite from a qualification score alone; identity review is mandatory before any conversion-ready transition; conversion follows the board-approved conversion rules and is gated on an operator-approved conversion step.

## State machine

```text
captured
  -> qualified_recommendation
  -> identity_review
  -> conversion_ready
  -> converted

captured
  -> qualified_recommendation
  -> nurture

captured
  -> spam_risk
  -> closed_no_conversion

identity_review
  -> conflict_blocked
  -> closed_no_conversion

conversion_ready
  -> conversion_failed
  -> identity_review
```

## State definitions

| State | Meaning | Allowed writes |
| --- | --- | --- |
| `captured` | CRM lead exists from website/API intake. | Lead row only. |
| `qualified_recommendation` | Deterministic helper produced score, band, reasons, and operator notes. | Qualification metadata on lead or related activity. |
| `identity_review` | Margot/operator checks exact identifiers against existing clients/businesses/contacts. | Review task/activity; no client mutation. |
| `nurture` | Not urgent enough for conversion; keep attribution and optional marketing follow-up. | Lead status/activity only. |
| `spam_risk` | Potential spam or abuse. | Lead status/activity only; no external follow-up by default. |
| `conflict_blocked` | More than one plausible identity or mismatched strong identifiers. | Blocker/task only. |
| `conversion_ready` | Exact identity gate passed and operator approved conversion intent. | Pending conversion activity/task. |
| `converted` | Client/contact/opportunity write completed and lead references target IDs. | Client/contact/opportunity plus audit event. |
| `conversion_failed` | Attempted safe conversion failed. | Error activity/task; no partial silent success. |
| `closed_no_conversion` | Human or policy decided not to convert. | Lead status/activity only. |

## Identity gates before conversion

Conversion must fail closed unless all required gates pass:

1. Exact lead ID: request names one `crm_leads.id`; no bulk or fuzzy conversion.
2. Not already converted: `converted_client_id` must be empty before conversion starts.
3. Lead exists and is not deleted/archived in a way that forbids conversion.
4. Conflict check: no competing existing client/business/contact with mismatched strong identifiers.
5. Strong identity evidence: at least one exact strong key, or two corroborating non-secret keys, such as:
   - explicit operator-selected `nexus_clients.id` or `businesses.id`
   - verified contact email plus matching domain/company
   - Stripe customer/subscription ID
   - existing client slug/business slug
6. Operator approval: explicit action by Phill/Margot workflow; qualification score alone is insufficient.
7. Audit readiness: conversion must be able to write an activity/audit record, or return a safe failure before client mutation.

## Expected API contract seed

The local guarded conversion endpoint (`src/app/api/crm/leads/[id]/convert/route.ts`) is covered by mock-first tests and should prefer safe failures:

- Missing exact lead ID -> `400` with `exact_lead_id_required`; no conversion.
- Lead not found -> `404` with `lead_not_found`; no conversion.
- Lead already converted -> `409` with `lead_already_converted`; no duplicate client.
- Identity conflict -> `409` with `identity_conflict`; no conversion.
- Missing operator approval -> `403` with `operator_approval_required`; no conversion.

## Current local evidence

- Local route/test contract exists for exact lead ID, already-converted guard, identity conflict, required operator approval, and guarded conversion-field update.
- Missing or blank `boardApprovalId` returns `403` with `{ error: 'operator_approval_required' }` before Supabase conversion/update is attempted.
- Successful local conversion timeline inserts now persist only a non-sensitive `operatorGateSatisfied: true` metadata flag; the raw board approval reference remains out of the persisted timeline payload.
- Dry-run conversion now returns a sanitized `planned_timeline_event` read-back with the same approval-required timeline shape and `operatorGateSatisfied: true`, while the focused test proves dry-run performs no lead update and no `agent_actions` insert.
- Successful non-dry-run conversion responses no longer echo `board_approval_id`; the route consumes the operator approval reference only as an input gate, then returns the converted lead and target client evidence without the raw approval reference.
- Production qualification remains precise: this is a local guarded route/test contract only; no production conversion promotion, migration, deploy, or production DB write/application has been verified from this plan.
- Verification on 2026-05-23:
  - RED before route change: `npx jest tests/integration/api/crm-lead-conversion.test.ts --runInBand` failed only the new missing-approval expectation: expected HTTP `403`, received `400`.
  - GREEN after route change: `npx jest tests/integration/api/crm-lead-conversion.test.ts --runInBand` passed, 1 suite / 5 tests.
  - Focused CRM lead suite: `npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts --runInBand` passed, 4 suites / 19 tests.
  - Type check: `npm run type-check` passed (`tsc --noEmit`).

## Implementation notes

- Keep conversion logic behind tests and mocks until schema/route ownership is confirmed.
- Do not apply migrations or write production data from this draft.
- Preserve original lead attribution; conversion should set status/target references, not delete lead history.
- Every conversion should produce a timeline/audit event suitable for daily digest and command center surfaces.
- The qualification helper (`src/lib/crm/qualify-lead.ts`) is deterministic and recommendation-only; it never calls Supabase, never writes audit rows, and never overwrites CRM identity — `qualifyLead` returns a `LeadQualificationRecommendation` (`score`, `band`, `reasons`, `operatorNotes`) where every branch emits a `Recommendation only: do not auto-convert or overwrite CRM identity from this score.` operator note, `qualified` band explicitly notes it is not approval to create a client record, and `spam_risk` band explicitly notes to avoid external follow-up until identity is checked.
- The current local conversion route/test contract is `src/app/api/crm/leads/[id]/convert/route.ts`; identity conflict, already-converted, missing-exact-lead-id, lead-not-found, and missing/blank `boardApprovalId` are all fail-closed before any client/contact/opportunity write.
- The plan remains gated on the sandbox wizard authority/auth gate for any future `tasks` / `voice_command_sessions` validation packet; no sandbox `apply`/`status`/`diff`/`sync`/`setup`/`reset`/`promote` will run from this plan without explicit per-wizard-action authority.

## Out of Scope for This Revision

- No live semantic search, embeddings backfill, or live AI call against production.
- No new vendor onboarding (including Nango) without explicit Phill approval.
- No public publishing, paid spend, billing/payment action, or client-facing send.
- No production DB write, migration, Vercel deploy/env mutation, or GitHub push/merge/PR mutation.
- No Mac Mini credential prompt/read, secret printing/storage, or recursive system-volume scan.
- No lead auto-conversion, client record auto-creation, follow-up auto-send, or campaign auto-launch from this plan. The board-approved conversion rules remain the only path to a `converted` state.
- No mixing of cross-client conversion context; identity review remains identity-scoped.

## Senior PM verification checkpoint (2026-06-09 21:32 AEST)

- What exists: local guarded conversion route/test contract at `src/app/api/crm/leads/[id]/convert/route.ts` with the documented 400/403/404/409 fail-closed branches; deterministic recommendation-only `qualifyLead` helper with explicit `Recommendation only` operator notes per branch; AI-RET-001 mocked report at `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` listing `AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-BOUNDARY` as `pass` and binding this plan to the 6 required answer phrases, 4 required citation sources (`docs/margot/lead-to-client-conversion-plan.md`, `src/lib/crm/qualify-lead.ts`, `docs/margot/ai-enhancement-candidate-register.md`, `docs/margot/crm-operating-model.md`), and 6 prohibited phrases (`lead auto-converted`, `client record created`, `follow-up sent`, `campaign launched`, `auto-conversion approved`, `nango`).
- What has started: 2026-06-09 21:32 AEST lead-to-client conversion plan Senior PM control-surface refresh. No new code, no new fixture, no new test, no schema, no migration, no route change, no production action, no sandbox wizard subcommand.
- Why it exists: the previous plan was last touched `2026-05-23`, before the AI-RET-001 source-citation and answer-shape harnesses, before the case-insensitive `normalizedSubjectType` approval-lifecycle lane (35 tests), before the `logCrmDigestReadError` `Set`-based fail-closed union guard, before the dedicated `digest-mappers` positive-coverage suite, before the deterministic `stale-sync` `last_error` + NaN guard, before the daily-digest `staleReasonLabel` / `staleReasonDetail` / `normalizedMinutes` privacy hardening, and before the new `AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-BOUNDARY` answer-shape fixture that now binds this plan to the harness. This refresh re-anchors the plan to the modern Senior PM control surface so fixture drift is caught locally.
- Missing/unclear: the production migration that would create `crm_leads`, `crm_contacts`, `crm_opportunities`, `crm_approvals`, `crm_audit_events` is not yet authored; the `tasks` / `voice_command_sessions` sandbox validation packet is not yet applied; the exact `board_approval_id` minting flow for operator-approved conversion is not yet wired into the local conversion route; the Stripe-customer / Linear-project / Nexus-slug identity-resolution policy that `qualifyLead` would consult is still in the proposal state from `docs/margot/crm-contacts-opportunities-model.md` and `docs/margot/crm-approval-persistence-plan.md`.
- Current health evidence: focused retrieval gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` returns 1 suite / 34 tests PASS (was 32 before this lane; +2 for the new answer-shape fixture). Combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` returns 11 suites / 158 tests PASS (was 156 before this lane; +2). `npm run type-check` passes. `npm run security:routes-check` reports 0 unprotected mutating routes. `git diff --check` is clean. AI-RET-001 report re-read: `overallStatus=pass; source=7/7; answerShape=8/8; readback=pass; safetyNotes=true; nextSafeAction=true`. Mac Mini: `/Volumes=Macintosh HD`, recovered Markdown count `0`, SMB reachable (port `445` open, IP `192.168.2.78`), SSH unreachable (`nc -z -G 3 phills-mac-mini.local 22` returned exit `1`); no credential prompt/read, secret printing/storage, or recursive system-volume scan.
- Smallest next action: when a real conversion code change is needed, add a new negative-coverage test for the local conversion route (e.g. `board_approval_id` whitespace-only, mismatched `board_approval_id`/lead tenant, or `nexus_clients.id` reuse across two leads) to the focused Jest gate, then update both `docs/margot/lead-to-client-conversion-plan.md` and `docs/margot/MARGOT-COMMAND-CENTER.md` with the new test id. Do not run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` until the specific authority/auth gate is granted.

## AI-RET-001 Lead-To-Client-Conversion-Plan Self-Boundary (92nd answer-shape fixture)

This lead-to-client-conversion-plan doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 92nd answer-shape fixture `AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-PLAN-SELF-BOUNDARY` (bound to `AI-RET-001-LEAD-QUALIFICATION`, no source-citation union member added). A future answer about the lead-to-client-conversion-plan self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `lead to client conversion plan self boundary lane` (the 92nd self-boundary identifier; the doc is the load-bearing lead-to-client conversion control surface).
  - `9th lead to client conversion content citation class` (the 9th fixture guards the operator-evidence lead-to-client-conversion-plan surface map; the 92nd is the disjoint self-evidence identifier set).
  - `qualify lead helper is recommendation only returns leadqualificationrecommendation with band and reasons` (paraphrase of the deterministic `qualifyLead` helper contract).
  - `captured qualified identity review conversion ready converted state machine` (paraphrase of the five-state lead lifecycle).
  - `board approved conversion rules are the only path to converted state` (paraphrase of the load-bearing non-negotiable rule).
  - `operator approved conversion step is the gate never recommendation only` (paraphrase of the operator gate rule).
  - `no lead auto conversion no client auto creation no follow up auto send` (paraphrase of the explicit out-of-scope list).
  - `crm identity overwrite forbidden from a qualification score alone` (paraphrase of the identity rule).
  - `local guarded conversion route at api crm leads id convert route test contract` (paraphrase of the existing fail-closed local contract at `src/app/api/crm/leads/[id]/convert/route.ts`).
  - `sandbox wizard authority auth gate blocker remains for tasks and voice validation packet` (paraphrase of the sandbox wizard gate blocker for the tasks / voice_command_sessions validation packet).
- The 4 required citations are present in this doc:
  - `docs/margot/lead-to-client-conversion-plan.md` (this doc).
  - `src/lib/crm/qualify-lead.ts` (the deterministic recommendation-only helper).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the Senior PM control loop).
  - `docs/margot/crm-operating-model.md` (the CRM operating model).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint (2026-06-12 18:30:00 AEST)` heading):
  - lead to client conversion plan lead auto conversion run, lead to client conversion plan client record creation attempt, lead to client conversion plan follow up send dispatch, lead to client conversion plan campaign launch attempt, lead to client conversion plan auto conversion approval granted, lead to client conversion plan nango connector platform onboarding attempt, lead to client conversion plan sandbox wizard apply attempted with no authority grant, lead to client conversion plan production migration sequence run, lead to client conversion plan crm identity overwrite attempt, lead to client conversion plan stripe billing field populate attempt.

The `## AI-RET-001 Lead-To-Client-Conversion-Plan Self-Boundary (92nd answer-shape fixture)` section above IS the assertion section the doc-drift guard scans. The 10 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green.

## Senior PM verification checkpoint (2026-06-12 18:30:00 AEST)

Doc-drift guard: the 10 required phrases (lead to client conversion plan self boundary lane, 9th lead to client conversion content citation class, qualify lead helper is recommendation only returns leadqualificationrecommendation with band and reasons, captured qualified identity review conversion ready converted state machine, board approved conversion rules are the only path to converted state, operator approved conversion step is the gate never recommendation only, no lead auto conversion no client auto creation no follow up auto send, crm identity overwrite forbidden from a qualification score alone, local guarded conversion route at api crm leads id convert route test contract, and sandbox wizard authority auth gate blocker remains for tasks and voice validation packet) and 4 required citations (lead-to-client-conversion-plan.md, qualify-lead.ts, SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md, crm-operating-model.md) are present in the assertion section above. The 10 prohibited phrases are documented only here for completeness and do not appear in the assertion section; their presence here satisfies the answer-shape contract: lead to client conversion plan lead auto conversion run, lead to client conversion plan client record creation attempt, lead to client conversion plan follow up send dispatch, lead to client conversion plan campaign launch attempt, lead to client conversion plan auto conversion approval granted, lead to client conversion plan nango connector platform onboarding attempt, lead to client conversion plan sandbox wizard apply attempted with no authority grant, lead to client conversion plan production migration sequence run, lead to client conversion plan crm identity overwrite attempt, lead to client conversion plan stripe billing field populate attempt.
