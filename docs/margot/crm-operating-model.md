# Margot CRM Operating Model

Date: 2026-05-23 07:00 AEST
Owner: Margot
Project: Unite-Group
Strategic lens: build the CRM into Phill's daily operating cockpit for a $2B Unite-Group business.

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
| Contact | Person tied to a business/client/lead | `nexus_clients.contact_name/contact_email` only; no canonical contact table yet | Proposed `crm_contacts` |
| Lead | Prospect or inbound form submission before qualification | `src/app/api/marketing/leads/route.ts` validates, optionally subscribes to SendGrid, and writes `crm_leads`; `src/app/api/crm/leads/route.ts` lists recent leads for command-center visibility; `src/lib/crm/qualify-lead.ts` provides recommendation-only scoring | Supabase `crm_leads` once the local migration is applied to the target environment; SendGrid remains a side integration |
| Opportunity | Qualified commercial possibility with value/stage/probability | Not yet modeled locally | Proposed `crm_opportunities` |
| Task | Work item for Margot, Phill, agent, or human owner | Margot voice route writes `tasks`; Linear mirror exists | Supabase `tasks` for app tasks, Linear for execution queue |
| Approval | Human decision or permission gate | Voice route blocks approval-required work by assignee/status; no dedicated approval table yet | Proposed `crm_approvals` or task subtype |
| Project | Delivery initiative connected to client/business/revenue | Linear mirror tables; local project docs | Linear for execution status, Supabase mirror for cockpit |
| Ticket | Execution issue / engineering work item | `integration_linear_issues`; GitHub PR/issue mirrors | Linear/GitHub, mirrored into Supabase |
| Activity/Event | Timeline record of something that happened | `agent_actions` for client create/update and agent events | Supabase `agent_actions` now; proposed `crm_activity_timeline` later if needed |
| Integration Account | External-system identity or sync state | `integration_*` tables and `integration_sync_state` | Supabase integration mirrors |
| Voice Command | Spoken operator request converted to CRM task | `voice_command_sessions`, `tasks` writes in Margot route | Supabase voice/task tables |
| Document/Artifact | Durable file, report, plan, recovered file, client doc | `docs/margot/*`; recovered Mac Mini destination | Repo docs now; future Drive/Docs integration when scoped |

## Source-of-Truth Matrix

| Data type | Source of truth | Mirror / surface | Conflict rule |
| --- | --- | --- | --- |
| Client identity and CRM client lifecycle | Supabase `nexus_clients` | Command Center, client portal, daily digest | Supabase wins over derived UI state; manual changes require audit event |
| Portfolio business identity | Supabase `businesses` | Business 360 / command-center tiles | Supabase wins; integrations enrich but do not overwrite identity |
| Lead intake | Proposed Supabase `crm_leads` | SendGrid subscription and command-center queue | CRM lead record must exist even if marketing email sync fails |
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

Current evidence as of 2026-05-23 07:35 AEST:

- `supabase/migrations/20260523100000_crm_leads.sql` drafts the local `crm_leads` table.
- `src/app/api/marketing/leads/route.ts` validates public lead submissions, optionally adds consenting users to SendGrid, and persists a CRM lead using the service-role server route.
- `src/app/api/crm/leads/route.ts` lists recent CRM leads for admin/service-role command-center visibility with `status`, `owner`, `source`, and `limit` filters.
- `tests/integration/api/marketing-leads.test.ts` covers lead capture/persistence paths.
- `tests/integration/api/crm-leads-list.test.ts` covers recent lead listing, filters, missing configuration, and read failures.

Safe default:

1. Treat website leads as first-class CRM records, not just email-list subscribers.
2. Keep the local `crm_leads` migration draft and code path behind sandbox-first discipline before any production application.
3. Run any schema change through `./scripts/sandbox-wizard.sh apply migration.sql` before promotion.
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

## CRM Test Matrix Seed

| Area | Test focus | Current status |
| --- | --- | --- |
| Marketing lead route | Rate limit, invalid schema, SendGrid success/failure, CRM persistence success/failure | Implemented and covered by `tests/integration/api/marketing-leads.test.ts`; last known focused pass recorded in progress log |
| CRM leads list route | Admin/service-role listing, filters, missing Supabase env, read failure | Implemented and verified 2026-05-23: `tests/integration/api/crm-leads-list.test.ts` passed |
| Lead qualification helper | Deterministic pure scoring, business/free/disposable email cases, spam risk, operator notes | Implemented and verified 2026-05-23: `tests/unit/lib/crm/qualify-lead.test.ts` passed |
| Client create route | Validation, duplicate slug/email, insert failure, audit action, cache invalidation | Existing route and tests present under `src/app/api/empire/clients/__tests__` |
| Client update route | Validation, not found, audit action, cache invalidation | Existing route/tests present; not re-audited this pass |
| Margot voice task route | Auth, rate limit, env missing, invalid packet, Supabase insert failures, success | Verified 2026-05-23: 28 focused Margot voice tests passed |
| Failure taxonomy | Operator-safe user messages | Verified 2026-05-23 |
| Integration mirrors | Read-only surface and source health | Existing routes/tests under `src/app/api/empire/sources/*`; not re-run this pass |
| Activity timeline | `agent_actions` writes and digest surfacing | Client audit helper exists; broader CRM event policy needed |

## Next Implementation Lanes

1. Build out the guarded lead-to-client conversion route behind failing mocked tests from `docs/margot/lead-to-client-conversion-plan.md`.
2. Draft the `crm_contacts` proposal so leads/clients stop overloading email fields.
3. Draft the `crm_opportunities` proposal for qualified commercial work before client conversion.
4. Draft `docs/margot/project-portfolio-index.md`.
5. Draft `docs/margot/client-second-brain-model.md`.
6. Draft `docs/margot/marketing-strategy-operating-model.md`.
7. Draft `docs/margot/ai-enhancement-pipeline.md`.
8. Keep lead, qualification, Margot voice focused tests and `npm run type-check` green.
9. Continue Mac Mini recovery only through authenticated SMB/SSH or manual approved export.

## Evidence From This Pass

- Read Margot read-first docs and current reports.
- Inspected current CRM lead code and docs; lead persistence, lead list, and deterministic qualification helper are now present locally.
- Inspected `nexus_clients`, `agent_actions`, `businesses`, and integration schema migrations.
- Inspected client creation/audit route and Margot voice task route.
- Ran focused Margot voice verification:
  `npx jest tests/integration/api/margot-voice-signed-url.test.ts tests/integration/api/margot-voice-task.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand`
- Result: 3 suites passed, 28 tests passed.
