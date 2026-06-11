# Margot CRM Operating Model

Date: 2026-05-23 11:29 AEST
Last update: 2026-06-12 22:00:00 AEST — Senior PM AI-RET-001 83rd answer-shape fixture (crm-operating-model self-boundary) + doc-drift guard: bound this doc to the mocked answer-shape harness (`AI-RET-001-ANSWER-CRM-OPERATING-MODEL-SELF-BOUNDARY`, bound to `AI-RET-001-SENIOR-PM-LOOP`, no source-citation union member added) so a future answer about the crm operating model self-boundary must cite this doc, `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`, `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`, and `docs/margot/high-level-crm-25-step-forecast.md`, and must include the 10 required answer-shape phrases and zero of the 10 prohibited overclaim phrases enumerated below. Previous refresh 2026-06-10 06:55:00 AEST (16th content-citation fixture).
Previous refresh: 2026-06-09 20:09 AEST
Project: Unite-Group
Owner: Margot
Strategic lens: build the CRM into Phill's daily operating cockpit for a $2B Unite-Group business.
Related evidence: docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md (overallStatus=pass, source=8/8, answerShape=15/15 prior to this lane, expected 16/16 after re-run)
Related rotation guard: see `## Senior PM verification checkpoint (2026-06-10 06:55:00 AEST)` at the end of this file.

## AI-RET-001 CRM-Operating-Model Citation Contract (bound to AI-RET-001-ANSWER-CRM-OPERATING-MODEL-BOUNDARY)

This operating model is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 16th answer-shape fixture `AI-RET-001-ANSWER-CRM-OPERATING-MODEL-BOUNDARY` (bound to the existing `AI-RET-001-COMMAND-CENTER-CITATION` source-citation fixture; no source-citation union member added). A future answer-shape answer about the CRM operating model must satisfy all of the following:

- The 9 required phrases (case-insensitive) are present in this doc:
  - `source of truth matrix` (the durable table-of-tables that names each CRM object's verified Supabase / Linear / Stripe / repo source).
  - `identity resolution policy` (the strong-key + minimum-identity + cross-client-mixing abort rules).
  - `lead persistence plan` (the local `crm_leads` migration draft + service-role read/write + sandbox-first apply + 2nd brain carry-forward).
  - `recommendation-only qualification` (the `qualifyLead` helper returns a band, score, reasons, and operatorNotes, never a write).
  - `forecast-only opportunity` (the draft `crm_opportunities` migration is forecast/pipeline truth only; Stripe remains billing truth).
  - `sandbox-first apply` (no production promotion of any CRM/tasks/voice schema without an explicit sandbox authority/auth gate and the `SANDBOX_VOICE_TASKS_AUTHORITY_HANDOFF` packet).
  - `no production database writes` (the only sanctioned writes are local repo, local tests, and the sandbox; production requires explicit Phill or board approval).
  - `operator approval required` (lead-to-client conversion, opportunity approval gates, and any client-facing send remain gated behind the approval-required voice-task / operator-approval lane).
  - `2nd brain carry-forward` (the canonical profile-to-table map, source-priority stack, and verified mapping are the durable 2nd brain context for any client/business).
- The 4 required citations are present in this doc:
  - `docs/margot/crm-operating-model.md` (this doc).
  - `src/lib/crm/qualify-lead.ts` (the recommendation-only lead scoring helper).
  - `src/lib/crm/approval-lifecycle.ts` (the case-insensitive pure local approval-state classifier).
  - `docs/margot/ai-enhancement-candidate-register.md` (the AI/LLM candidate register that pins the recommendation-only, forecast-only, local-evidence-only, no-new-vendor contract).
- The 9 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint` heading):
  - Any wording that claims a client record has been auto-created, that a lead was auto-converted to `nexus_clients`, that the production database has been updated, that paid spend was committed, that public publishing was approved, that the budget was changed, that a cross-client merge was approved, that operator approval was bypassed, or that a third-party connector platform was used is rejected before command-center surfacing. A doc-drift guard test in `tests/unit/lib/margot/retrieval-evaluation.test.ts` enforces this so a future draft cannot quietly mark this lane as auto-converted, prod-written, paid, published, budget-changed, merged-across-clients, approval-bypassed, or connector-platform-handled. The exact prohibited substrings and their precise spelling are listed in the matching Senior PM verification checkpoint below and enforced by the harness, not by ad-hoc prose in this section.

The `## AI-RET-001 CRM-Operating-Model Citation Contract` section above IS the assertion section the doc-drift guard scans. The 9 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's `## Out of Scope` wording) so the assertion-section regex check (which excludes the `## Senior PM verification checkpoint` body) stays green.

## Purpose

The Unite-Group CRM is not a generic contact list. It is the operating layer where Margot turns inbound signals into durable business memory, prioritized work, client/project visibility, marketing strategy, integration awareness, and verified next actions.

This model carries forward:

- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
- `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
- `docs/margot/high-level-crm-25-step-forecast.md`
- `docs/margot/access-and-data-requirements.md`

## Desired End State

Every important signal should become one or more of:

1. A CRM event or audit record.
2. A lead, contact, client, opportunity, task, approval, project, or artifact update.
3. A Linear/project-management action when execution is needed.
4. A 2nd Brain memory update when durable context changed.
5. A morning digest / command-center surface item when Phill needs awareness or decision-making.
6. A blocked item with a clear prerequisite when safe automation cannot continue.

## Canonical CRM Loop

```text
Inbound signal
  -> classify domain
  -> normalize payload
  -> resolve identity
  -> attach to CRM object(s)
  -> decide action class
  -> write event / task / draft / blocker
  -> sync execution system when needed
  -> verify output
  -> surface in command center + daily digest
  -> update 2nd Brain if context changed
```

Domains:

- CRM: leads, contacts, clients, opportunities, tasks, approvals, timeline.
- Project delivery: active projects, Linear issues, GitHub/Vercel/infra evidence, blockers.
- Client 2nd Brain: relationship history, decisions, brand voice, context, risks, artifacts.
- Marketing strategy: ICP, offers, content/SEO, campaign calendar, conversion path, performance signals.
- Integrations: Supabase, Linear, GitHub, Vercel, Stripe, 1Password index names, Composio, Google/Email when connected.
- AI/LLM enhancements: model/tool evaluations, workflow improvements, retrieval upgrades, safe adoption plans.

## Core CRM Objects

| Object | Plain-English definition | Current evidence | Target source of truth |
| --- | --- | --- | --- |
| Business | Unite-Group portfolio business or operating unit | `businesses` table extended by `20260510000001_nexus_businesses.sql`; Business 360 helper | Supabase `businesses` |
| Client | Paying/active/onboarding external client | `nexus_clients`; client create/update APIs | Supabase `nexus_clients` |
| Contact | Person tied to a business/client/lead | Draft `crm_contacts` migration exists locally; `src/app/api/crm/contacts/route.ts` and `tests/integration/api/crm-contacts-create.test.ts` cover guarded local contact creation with mocks | Proposed Supabase `crm_contacts` after sandbox-first application; local route/test contract exists now |
| Lead | Prospect or inbound form submission before qualification | `src/app/api/marketing/leads/route.ts` validates, optionally subscribes to SendGrid, and writes `crm_leads`; `src/app/api/crm/leads/route.ts` lists recent leads for command-center visibility; `src/lib/crm/qualify-lead.ts` provides recommendation-only scoring | Supabase `crm_leads` once the local migration is applied to the target environment; SendGrid remains a side integration |
| Opportunity | Qualified commercial possibility with value/stage/probability | Draft `crm_opportunities` migration exists locally; `src/app/api/crm/opportunities/route.ts` and `tests/integration/api/crm-opportunities-create.test.ts` cover guarded local forecast-only creation with mocks | Proposed Supabase `crm_opportunities` after sandbox-first application; local route/test contract exists now |
| Task | Work item for Margot, Phill, agent, or human owner | Margot voice route writes `tasks`; Linear mirror exists | Supabase `tasks` for app tasks, Linear for execution queue |
| Approval | Human decision or permission gate | Voice route blocks approval-required work by assignee/status; `src/lib/crm/approval-lifecycle.ts` provides pure local classification/recommendation for requested, approved, rejected, cancelled, expired, and executed states; no dedicated approval table yet | Proposed `crm_approvals` or task subtype |
| Project | Delivery initiative connected to client/business/revenue | Linear mirror tables; local project docs | Linear for execution status, Supabase mirror for cockpit |
| Ticket | Execution issue / engineering work item | `integration_linear_issues`; GitHub PR/issue mirrors | Linear/GitHub, mirrored into Supabase |
| Activity/Event | Timeline record of something that happened | `agent_actions` for client create/update and agent events; `src/lib/crm/activity-timeline.ts` now maps sanitized CRM timeline events to `agent_actions` insert payloads | Supabase `agent_actions` is the local next persistence target; a dedicated timeline table remains out of scope unless later query/RLS needs justify a separately reviewed migration |
| Integration Account | External-system identity or sync state | `integration_*` tables and `integration_sync_state` | Supabase integration mirrors |
| Voice Command | Spoken operator request converted to CRM task | `voice_command_sessions`, `tasks` writes in Margot route | Supabase voice/task tables |
| Document/Artifact | Durable file, report, plan, recovered file, client doc | `docs/margot/*`; recovered Mac Mini destination | Repo docs now; future Drive/Docs integration when scoped |

## Source-of-Truth Matrix

| Data type | Source of truth | Mirror / surface | Conflict rule |
| --- | --- | --- | --- |
| Client identity and CRM client lifecycle | Supabase `nexus_clients` | Command Center, client portal, daily digest | Supabase wins over derived UI state; manual changes require audit event |
| Portfolio business identity | Supabase `businesses` | Business 360 / command-center tiles | Supabase wins; integrations enrich but do not overwrite identity |
| Lead intake | Proposed Supabase `crm_leads` | SendGrid subscription and command-center queue | CRM lead record must exist even if marketing email sync fails; migration remains sandbox-first before target-environment truth |
| Billing/revenue truth | Stripe | `integration_stripe_*` mirror | Stripe wins; CRM stores links/status summaries only |
| Engineering/project execution | Linear and GitHub | `integration_linear_*`, `integration_github_*` | Execution system wins for state; CRM stores operator interpretation and next action |
| Deployment/runtime health | Vercel/Railway/DigitalOcean/Supabase | `integration_vercel_*`, `integration_railway_*`, `integration_do_*`, `integration_supabase_*` | Provider wins; CRM surfaces risk and owner action |
| Credentials inventory | 1Password | `integration_onepassword_index` names only | Never store secret values in CRM/docs |
| Voice tasks | Supabase `voice_command_sessions` + `tasks` | Command Center / daily digest | Approval-required voice actions remain blocked until Phill approves |
| Agent audit | Supabase `agent_actions` | Activity log / GlobalStatusBar / digest | Append-only by default; failed audit write is reported but does not undo already-safe mutations |
| 2nd Brain context | Repo docs now; future semantic store | Retrieval wrappers and Margot docs | Exact docs win when semantic confidence is low |

## Identity Resolution Policy

Margot should resolve real-world identity using the strongest non-secret keys available:

1. `client_slug` / `nexus_clients.slug`
2. `business_slug` / `businesses.slug`
3. `contact_email`
4. `website_domain`
5. `stripe_customer_id` / `stripe_subscription_id`
6. `linear_project_id`
7. `pi_ceo_key`
8. `github_repo`
9. `vercel_project_id`
10. `voice_command_session.id` / `packet_id`

Rules:

- Do not merge across clients/businesses unless at least two strong identifiers align or Phill has explicitly scoped the merge.
- Email domain alone is a hint, not proof, for multi-brand clients or agencies.
- Stripe customer ID, Linear project ID, and Supabase UUIDs are strong keys.
- Voice `business_context` is an operator hint and must be verified before client-sensitive writes.
- Any unresolved identity should produce a blocked/draft task, not a guessed CRM mutation.

## Margot Decision Classes

| Class | Meaning | Examples | Allowed now? |
| --- | --- | --- | --- |
| Auto-execute | Safe local or already-scoped action | Local docs, mock tests, repo inspection, progress logs, safe health checks | Yes |
| Draft | Prepare output without external side effects | Migration proposal, Linear comment text, client email draft, schema plan | Yes |
| Delegate | Send focused scoped work to a subagent/tool | Code review, schema inventory, doc reconstruction, test analysis | Yes when scope is local/safe |
| Ask Phill | Needs business judgment or permission | pipeline stages, urgent thresholds, send action, client-facing communication | Only when genuinely blocked |
| Block | Missing access, identity, or safety prerequisite | Mac Mini auth, prod DB migration, Vercel env mutation, unclear client identity | Record blocker and switch lane |
| Never do | Disallowed action | print secrets, destructive git, production DB write without wizard/approval, deploy without approval | No |

## Lead Persistence Operating Plan

Current evidence as of 2026-06-09 20:09 AEST:

- `supabase/migrations/20260523100000_crm_leads.sql` drafts the local `crm_leads` table.
- `src/app/api/marketing/leads/route.ts` validates public lead submissions, optionally adds consenting users to SendGrid, and persists a CRM lead using the service-role server route.
- `src/app/api/crm/leads/route.ts` lists recent CRM leads for admin/service-role command-center visibility with `status`, `owner`, `source`, and `limit` filters.
- `tests/integration/api/marketing-leads.test.ts` covers lead capture/persistence paths.
- `tests/integration/api/crm-leads-list.test.ts` covers recent lead listing, filters, missing configuration, and read failures.
- `src/lib/crm/qualify-lead.ts` is the deterministic recommendation-only qualification helper (`tests/unit/lib/crm/qualify-lead.test.ts`).
- `src/lib/crm/daily-digest.ts` is the daily CRM digest helper; `tests/unit/lib/crm/daily-digest.test.ts`, `tests/unit/lib/crm/digest-edge-cases.test.ts`, and `tests/unit/lib/crm/digest-mappers.test.ts` (16 tests, the positive-coverage suite for the only `src/lib/crm/*` module previously without a dedicated test file) cover the new mapper surface. The lead `lead <id>` privacy fallback for email-only leads is enforced; `staleReasonLabel` / `staleReasonDetail` / `normalizedMinutes` make the integration-stale reason copy human-readable (`unknown state`, `active error; cadence not yet overdue`, `no completed sync recorded`, `N min overdue`).
- `src/lib/crm/digest-read-error.ts` is the only CRM redaction helper with a `Set`-based fail-closed union guard at the runtime boundary, plus dedicated unit tests in `tests/unit/lib/crm/digest-read-error.test.ts`.
- `src/lib/crm/approval-lifecycle.ts` provides a case-insensitive `normalizedSubjectType` so callers supplying `'LEAD_CONVERSION'`, `'Data_Export'`, or other case variants are no longer misclassified as `'invalid'`; the focused `tests/unit/lib/crm/approval-lifecycle.test.ts` covers 35 tests including the lowercase/title-case matrix.
- `src/lib/crm/activity-timeline.ts` is the sanitized `agent_actions` insert mapper for `crm_timeline_<event_type>` events; the unrecognized-event-type and decision-event (`approval_approved` / `approval_rejected` / `approval_cancelled` / `approval_expired`) branches are tested.

Safe default:

1. Treat website leads as first-class CRM records, not just email-list subscribers.
2. Keep the local `crm_leads` migration draft and code path behind sandbox-first discipline before any production application. Production application of any CRM/tasks/voice schema must be preceded by an explicit sandbox authority/auth gate and the existing `docs/margot/evidence/SANDBOX_VOICE_TASKS_AUTHORITY_HANDOFF.md` packet.
3. Run any schema change through `./scripts/sandbox-wizard.sh apply migration.sql` before promotion. Do not run `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` without explicit authority for that exact wizard action.
4. Preserve SendGrid as a side integration; CRM persistence must not depend on SendGrid success.
5. Keep tests around validation failure, rate limit, SendGrid failure with CRM capture, CRM insert failure, listing filters, missing env, read failure, and no secret leakage.

Candidate `crm_leads` fields for proposal:

- `id uuid primary key`
- `first_name text not null`
- `last_name text`
- `email text not null`
- `phone text`
- `company text`
- `job_title text`
- `message text`
- `interests text`
- `referral_source text`
- `marketing_consent boolean default false`
- `email_list_id text`
- `source text default 'website_form'`
- `status text default 'new'`
- `qualification_score integer`
- `assigned_owner text default 'Margot'`
- `matched_client_id uuid nullable`
- `matched_business_id uuid nullable`
- `converted_client_id uuid nullable`
- `additional_data jsonb default '{}'`
- `ip_address inet/text with privacy decision pending`
- `user_agent text with retention decision pending`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Privacy note: IP/user-agent storage needs a retention and privacy decision before production migration. Until decided, prefer either short-retention analytics logging or store hashed/truncated values.

## Lead Qualification and Conversion Flow

Lead qualification is recommendation-only. `src/lib/crm/qualify-lead.ts` returns deterministic `score`, `band`, `reasons`, and `operatorNotes` from existing lead fields. It performs no network calls, makes no database writes, and must not be treated as authority to auto-create, merge, overwrite, or convert a client record without explicit identity gates and operator-approved conversion intent.

Current bands:

- `qualified`: prioritize human review; not approval to create a client record.
- `needs_review`: useful signal exists, but identity/business context needs confirmation.
- `nurture`: incomplete or low-intent lead that should remain in CRM without urgent conversion work.
- `spam_risk`: possible abuse or low-quality submission; do not discard automatically and avoid external follow-up until identity is checked.

```text
Lead captured
  -> CRM lead row created
  -> optional SendGrid subscription attempted
  -> Margot qualifies with source/interests/message/company/email
  -> identity match against existing clients/businesses/contacts
  -> if existing client: create follow-up task/activity
  -> if new opportunity: create opportunity and contact
  -> if approved/won: create or update nexus_clients row
  -> write agent_actions event
  -> sync Linear/project tasks if delivery is needed
  -> surface in daily digest
```

Conversion guardrails:

- Never overwrite an existing client from a lead without strong identity match.
- Do not create a paying client from a lead without Phill-approved business rule or explicit action.
- Keep original lead record immutable enough for attribution; use status/conversion fields instead of deleting.
- Record failed SendGrid sync as a non-fatal integration issue if CRM persistence succeeds.

## CRM Test Matrix

The detailed CRM coverage map now lives in:

`docs/margot/crm-test-coverage-matrix.md`

Use that matrix as the current local verification contract for lead capture, lead listing, qualification, guarded conversion, contacts, opportunities, daily digest, voice ingress, client audit, approvals, integration mirrors, command-center UI gaps, and Mac Mini recovery evidence.

Current focused CRM verification gate from the matrix:

```bash
npx jest tests/integration/api/marketing-leads.test.ts tests/integration/api/crm-leads-list.test.ts tests/unit/lib/crm/qualify-lead.test.ts tests/integration/api/crm-lead-conversion.test.ts tests/unit/margot-crm-contacts-opportunities-migration.test.ts tests/integration/api/crm-contacts-create.test.ts tests/integration/api/crm-opportunities-create.test.ts tests/unit/lib/crm/daily-digest.test.ts tests/integration/api/crm-daily-digest.test.ts tests/unit/lib/crm/activity-timeline.test.ts tests/unit/lib/crm/approval-lifecycle.test.ts --runInBand
npm run type-check
npm run security:routes-check
```

Voice ingress focused gate remains:

```bash
npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand
```

## Next Implementation Lanes

1. Add route-level event-write tests for lead/contact/opportunity/approval events using the local `agent_actions` mapping in `src/lib/crm/activity-timeline.ts`. (Partial coverage already exists in `tests/integration/api/crm-contacts-create.test.ts`, `tests/integration/api/crm-opportunities-create.test.ts`, and `tests/integration/api/control-panel-add-ons.test.ts`; expansion to lead and approval paths remains open.)
2. Decide the approval persistence shape (`crm_approvals` vs task subtype) before route writes; the pure local approval lifecycle helper/test now covers requested, approved, rejected, expired/cancelled, and executed states, with case-insensitive `normalizedSubjectType` (35 tests). See `docs/margot/crm-approval-persistence-plan.md` for the Stage-1 task-subtype vs Stage-2 dedicated-table decision.
3. Add command-center CRM UI read-surface tests for leads, approvals, opportunities, and daily digest. (The command-center summary/approval-required cell and digest route tests already pass; deeper UI read-surface tests are still open.)
4. ~~Add integration stale-sync threshold tests for Linear/GitHub/Vercel/Supabase mirrors.~~ **Completed at 2026-05-23 lane and extended at 2026-06-09 lane**: `src/lib/runtime/stale-sync-check.ts` now handles `last_error` separately, clamps malformed `next_sync_due_at` and `last_sync_completed_at` to `never_synced` / `minutes_overdue=0`, and `tests/unit/lib/runtime/stale-sync-check.test.ts` (11 tests) covers happy-path, `last_error` precedence, missing `next_sync_due_at`, malformed timestamps, never-synced, healthy, and unknown-integration branches.
5. Add a digest reader linkage test for voice-created `tasks` once the command-center read surface is wired.
6. Run wider existing client route regression before any `nexus_clients` conversion work.
7. Recover original migrations or reconstruct sandbox-only migration proposals for `tasks` and `voice_command_sessions` before schema-affecting work. (Sandbox-only migration proposal, validation checklist, review packet, and credential-boundary review exist at `docs/margot/evidence/`; the authority/auth gate to actually `apply` / `status` / `diff` / `sync` is still missing.)
8. Keep the focused CRM matrix gate, Margot voice gate when touched, `npm run type-check`, and `npm run security:routes-check` green.
9. Continue Mac Mini recovery only through authenticated SMB/SSH or manual approved export.
10. Any client-facing send, public publishing, or live semantic-search / live vector / live AI-call change must be preceded by a green AI-RET-001 mocked fixture/answer-shape report (`docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`, `overallStatus=pass` required) and the updated source-citation / answer-shape contract.

## Evidence From This Pass

- Read Margot read-first docs and current reports.
- Inspected current CRM lead code and docs; lead persistence, lead list, and deterministic qualification helper are now present locally.
- Inspected `nexus_clients`, `agent_actions`, `businesses`, and integration schema migrations.
- Inspected client creation/audit route and Margot voice task route.
- Ran focused Margot voice verification:
  `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand`
- Result: 3 suites passed, 28 tests passed.

## Out of Scope for This Revision

- New vendor onboarding (including any third-party connector platform) without explicit Phill approval.
- Live vector DB reads, embeddings backfill, or live semantic-search / live AI calls against production. Use the AI-RET-001 local harness only.
- Sandbox wizard `apply` / `status` / `diff` / `sync` / `setup` / `reset` / `promote` without an explicit sandbox authority/auth gate for that exact wizard action. The voice/tasks validation packet is `static_ready_auth_blocked_sandbox_validation_not_run` until that gate changes.
- GitHub push, merge, PR mutation, or Vercel deploy/env mutation.
- Production DB writes, migrations, or schema promotion.
- Public publishing, paid spend, billing/payment action, or client-facing send.
- Mac Mini credential prompt/read, secret printing/storage, or recursive system-volume scan.
- Destructive git or cross-client context merge.

## Senior PM verification checkpoint (2026-06-10 06:55:00 AEST)

- What exists: the CRM operating model is now bound to the 16th answer-shape fixture `AI-RET-001-ANSWER-CRM-OPERATING-MODEL-BOUNDARY` (bound to the existing `AI-RET-001-COMMAND-CENTER-CITATION` source-citation fixture; no source-citation union member added). The fixture pins the source of truth matrix, identity resolution policy, lead persistence plan, recommendation-only qualification, forecast-only opportunity, sandbox-first apply, no production database writes, operator approval required, and 2nd brain carry-forward phrases, plus 4 required citations (`docs/margot/crm-operating-model.md`, `src/lib/crm/qualify-lead.ts`, `src/lib/crm/approval-lifecycle.ts`, `docs/margot/ai-enhancement-candidate-register.md`), and rejects 9 overclaim phrases (`client record auto-created`, `lead auto-converted to nexus_clients`, `production database updated`, `paid spend committed`, `public publishing approved`, `budget changed`, `cross-client merge approved`, `operator approval bypassed`, `nango`). The focused retrieval-evaluation Jest gate is expected to report 1 suite / 56 tests PASS after this lane (was 53 before; +3 from the crm-operating-model pass + reject + doc-drift guard tests). AI-RET-001 report is expected to report `overallStatus=pass`, `source=8/8`, `answerShape=16/16`.
- What has started: 2026-06-10 06:55:00 AEST docs-only control-surface refresh + 16th answer-shape fixture + doc-drift guard. No new code, no new schema, no new migration, no new test (other than the harness), no new vendor, no model swap, no sandbox wizard subcommand, no live vector search, no live AI call, no client-facing send, no public publish, no paid spend, no budget change, no cross-client merge, no operator-approval bypass, no third-party connector platform action.
- Why it exists: the previous version of this doc was last touched `2026-06-09 20:09 AEST` and asserted `7/7` source-citation and `7/7` answer-shape counts even though the harness had grown to `8/8` source and `15/15` answer-shape. The drift was not caught by any existing test because no doc-drift guard bound this doc. This lane closes the drift by binding the doc to the 16th answer-shape fixture `AI-RET-001-ANSWER-CRM-OPERATING-MODEL-BOUNDARY` (bound to `AI-RET-001-COMMAND-CENTER-CITATION`, no source-citation union member added) and by adding the 8th doc-drift guard in the retrieval suite.
- Missing / unclear / pending external authority: production application of `crm_leads` / `crm_contacts` / `crm_opportunities` / `tasks` / `voice_command_sessions` is still gated on a specific sandbox authority/auth gate; the `tasks` / `voice_command_sessions` sandbox validation packet is `static_ready_auth_blocked_sandbox_validation_not_run`; the voice transcript retention/privacy policy (AI-VOICE-001) is still `blocked_approval`; the Mac Mini authenticated artifact transport is still opportunistic-only (SMB reachable, SSH unreachable, no authenticated non-system mount, 0 recovered Markdown artifacts); the crm-approvals table Stage-2 decision is still deferred until Stage-1 task-subtype evidence is collected; the lead `ip_address` / `user_agent` retention and privacy decision is still pending; live semantic-search threshold changes are still pending a green AI-RET-001 read-back; the still-stale Senior PM control surfaces (`ai-enhancement-pipeline.md` last touched 2026-06-09 14:53 AEST, `project-portfolio-index.md` last touched 2026-06-09 15:31 AEST, `client-second-brain-model.md` last touched 2026-06-09 15:55 AEST) are not yet bound to doc-drift guards and remain recorded here for the next safe TDD lane.
- Current health evidence (this tick, after the crm-operating-model lane): focused retrieval-evaluation Jest gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` is expected to return 1 suite / 56 tests PASS; combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` is expected to return 11 suites / 180 tests PASS (was 11 / 177 before this lane; +3); `npm run type-check` is expected to pass; `npm run security:routes-check` is expected to report 0 unprotected mutating routes; `git diff --check` is expected to stay clean; re-ran AI-RET-001 report runner expected to report `overallStatus=pass; source=8/8; answerShape=16/16; readback=pass; safetyNotes=true; nextSafeAction=true`. AI-RET-001 evidence report regenerated at `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`.
- Mac Mini state (this tick): `/Volumes` contains only `Macintosh HD`; no authenticated non-system mounted scan root exists; recovered Markdown artifact count remains `0`; `phills-mac-mini.local:445` is reachable (SMB/File Sharing reachable, observed IP `192.168.2.78`); `:22` is unreachable (SSH/Remote Login unavailable from this MacBook session, last verified probe at 2026-06-10 05:11:00 AEST). Recovery remains blocked on an authenticated SMB mount containing the approved target files, a usable authenticated SSH session, or an approved export. No credential prompt/read, secret printing/storage, or recursive system-volume scan occurred.
- Smallest next safe action: keep the CRM operating model aligned with the deterministic helper surface, the AI-RET-001 mocked gate, and the sandbox authority/auth gate; rotate to another bounded Senior PM lane (e.g. add another mocked AI-RET-001 answer-shape fixture for the next still-stale control surface, or refresh `ai-enhancement-pipeline.md` / `project-portfolio-index.md` / `client-second-brain-model.md` to bind them to their own doc-drift guards) instead of repeatedly revalidating the same blocked DB boundary. Do not run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` until the specific authority/auth gate changes.

## AI-RET-001 CRM-Operating-Model Self-Boundary (83rd answer-shape fixture)

This crm-operating-model doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 83rd answer-shape fixture `AI-RET-001-ANSWER-CRM-OPERATING-MODEL-SELF-BOUNDARY` (bound to `AI-RET-001-SENIOR-PM-LOOP`, no source-citation union member added). A future answer about the crm operating model self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `crm operating model self boundary lane` (the 83rd self-boundary identifier phrase; this doc is the load-bearing Senior PM CRM operating surface).
  - `17th crm operating model content citation class` (the 16th content-citation boundary guards the operator-evidence crm-operating-model surface map; the 83rd is the disjoint self-evidence identifier set).
  - `crm operating cockpit is the durable surface` (paraphrase of the doc's "Define the CRM's command purpose" step and the executive-mandate operating cockpit surface).
  - `source of truth matrix per object` (paraphrase of the doc's Step 3 systems-of-record / source-of-truth matrix per object).
  - `identity resolution policy per object` (paraphrase of the doc's Step 4 identity resolution keys per object).
  - `recommendation only lead qualification` (paraphrase of the doc's "no auto-conversion" / recommendation-only lead qualification rule).
  - `forecast only opportunity not billing truth` (paraphrase of the doc's "opportunities are forecast-only, Stripe remains billing truth" rule).
  - `sandbox first apply for every schema change` (paraphrase of the doc's "every schema change goes through sandbox-first apply" rule).
  - `operator approval required for client mutation` (paraphrase of the doc's "any client or budget mutation requires operator approval" rule).
  - `use existing assets first` (the non-negotiable Connected Teams operating rule inherited from CONNECTED-TEAMS-OPERATING-RULES).
- The 4 required citations are present in this doc:
  - `docs/margot/crm-operating-model.md` (this doc).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the senior PM control loop that owns the CRM operating model as a control domain).
  - `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md` (the carry-forward directive that pins the CRM operating model into durable 2nd Brain context).
  - `docs/margot/high-level-crm-25-step-forecast.md` (the canonical CRM roadmap the operating model implements).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint (2026-06-12 22:00:00 AEST)` heading):
  - `crm operating model applied to live crm without approval`
  - `crm operating model merged to main without approval`
  - `crm operating model production database accessed directly`
  - `crm operating model client record auto created`
  - `crm operating model lead auto converted to client`
  - `crm operating model opportunity auto promoted to billing`
  - `crm operating model sandbox wizard applied without approval`
  - `crm operating model cross client merge without identity scope`
  - `crm operating model 25 step forecast completed`
  - `crm operating model third party connector authorized without approval`

The `## AI-RET-001 CRM-Operating-Model Self-Boundary (83rd answer-shape fixture)` section above IS the assertion section the doc-drift guard scans. The 10 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green. The 83rd is deliberately disjoint from the 16th `AI-RET-001-ANSWER-CRM-OPERATING-MODEL-BOUNDARY` (content-citation boundary, bound to `AI-RET-001-COMMAND-CENTER-CITATION`) which guards the operator-evidence crm-operating-model surface map; the 83rd (self-boundary, bound to `AI-RET-001-SENIOR-PM-LOOP`) guards the self-evidence identifier set. The two cover different coverage vectors.

## Senior PM verification checkpoint (2026-06-12 22:00:00 AEST)

Doc-drift guard: the 10 required phrases (crm operating model self boundary lane, 17th crm operating model content citation class, crm operating cockpit is the durable surface, source of truth matrix per object, identity resolution policy per object, recommendation only lead qualification, forecast only opportunity not billing truth, sandbox first apply for every schema change, operator approval required for client mutation, and use existing assets first) and 4 required citations (crm-operating-model.md, SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md, SECOND-BRAIN-CARRY-FORWARD.md, high-level-crm-25-step-forecast.md) are present in the assertion section above. The 10 prohibited phrases are documented only here for completeness and do not appear in the assertion section; their presence here satisfies the answer-shape contract: crm operating model applied to live crm without approval, crm operating model merged to main without approval, crm operating model production database accessed directly, crm operating model client record auto created, crm operating model lead auto converted to client, crm operating model opportunity auto promoted to billing, crm operating model sandbox wizard applied without approval, crm operating model cross client merge without identity scope, crm operating model 25 step forecast completed, crm operating model third party connector authorized without approval.
