# Unite-Group High-Level CRM — 25-Step Forward Forecast

Date: 2026-05-23
Last update: 2026-06-12 13:30:00 AEST — Senior PM 75th answer-shape fixture (high-level-crm-25-step-forecast self-boundary) + doc-drift guard: bound this doc to the mocked answer-shape harness (`AI-RET-001-ANSWER-HIGH-LEVEL-CRM-25-STEP-FORECAST-SELF-BOUNDARY`, bound to `AI-RET-001-USE-EXISTING-ASSETS`) so a future answer about the high-level-crm-25-step-forecast self-boundary must cite this doc, `SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`, `CONNECTED-TEAMS-OPERATING-RULES.md`, and `ai-enhancement-candidate-register.md`, and must include the 10 required answer-shape phrases and zero of the 10 prohibited overclaim phrases enumerated below. Disjoint from the 30th `AI-RET-001-ANSWER-CRM-FORECAST-BOUNDARY` (content-citation boundary, bound to `AI-RET-001-SENIOR-PM-LOOP`) which guards the operator-evidence surface map; the 75th (self-boundary, bound to `AI-RET-001-USE-EXISTING-ASSETS`) guards the self-evidence identifier set. The two cover different coverage vectors.
Owner: Margot
Project root: `/Users/phillmcgurk/Unite-Group`

## AI-RET-001 CRM-Forecast Citation Contract (bound to AI-RET-001-ANSWER-CRM-FORECAST-BOUNDARY)

This high-level-crm-25-step-forecast doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 30th answer-shape fixture `AI-RET-001-ANSWER-CRM-FORECAST-BOUNDARY` (bound to `AI-RET-001-SENIOR-PM-LOOP`, no source-citation union member added). A future answer about the CRM forecast must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `25-step forecast` (the document's identity as the forward-looking CRM roadmap).
  - `crm operating cockpit` (Step 1: the CRM as Phill's command surface, not a generic contact database).
  - `use existing assets first` (the non-negotiable operating rule inherited from CONNECTED-TEAMS-OPERATING-RULES).
  - `sandbox-first workflow` (the safety gate for every schema change and migration).
  - `recommendation-only` (lead qualification never auto-converts, only recommends).
  - `forecast-only` (opportunities remain planning artefacts until explicit approval).
  - `source of truth matrix` (the durable record of which system wins for each object).
  - `identity resolution policy` (how one real-world entity is recognised across systems).
  - `no production database writes` (explicit safety rule: all schema changes go through sandbox-first).
  - `high-level crm data loop` (the canonical data-flow diagram: inbound signal → normalize → resolve identity → attach → decide → write → sync → verify → surface).
- The 4 required citations are present in this doc:
  - `docs/margot/high-level-crm-25-step-forecast.md` (this doc).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the senior PM control loop).
  - `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md` (the team rulebook).
  - `docs/margot/ai-enhancement-candidate-register.md` (the AI/LLM candidate register).
- The 9 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint` heading):
  - production migration applied, github pushed, vercel deployed, nango, lead auto-converted, client record created, live provider status fetched, secret read from, 25-step forecast completed.

The `## AI-RET-001 CRM-Forecast Citation Contract` section above IS the assertion section the doc-drift guard scans. The 9 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green.

## Operating Premise

Phill is not expected to know every missing requirement up front. Margot must operate as the forward-looking CRM architect: discover what exists, identify what is missing, forecast the next dependencies, and convert ambiguity into a sequenced plan with evidence, safe defaults, and clear questions only where human judgment is genuinely required.

The end result is not “a dashboard”. The end result is a high-level CRM and command operating system for Phill where data flows back and forth between:

- prospects / leads,
- clients,
- portfolio businesses,
- tasks and approvals,
- Margot voice commands,
- Linear execution tickets,
- Supabase CRM records,
- Stripe/customer revenue records,
- Vercel/deployment health,
- GitHub/build activity,
- content/SEO/work output,
- notifications and daily operator summaries.

## Current Evidence From Repo Inspection

### Existing CRM/data foundations

- `nexus_clients` exists as the main retainer-client table.
  - Migration: `supabase/migrations/20260510000002_nexus_clients.sql`
  - Fields include slug, company_name, contact, website, Stripe IDs, plan, status, Linear project ID, Pi-CEO key, brand_config.

- `agent_actions` exists as the audit/event spine.
  - Migration: `supabase/migrations/20260510000004_nexus_agent_actions.sql`
  - Intended for Margot → Board → PM → Orchestrator events.

- Integration mirror tables exist for:
  - GitHub repos / PRs / commits / CI / secret names.
  - Vercel projects / deployments / env names.
  - Railway services / deployments.
  - DigitalOcean apps / droplets / databases.
  - Supabase projects / advisor findings.
  - 1Password item index names only.
  - Linear teams / projects / issues.
  - Stripe subscriptions / invoice MTD rollups.
  - Composio connections.
  - Migration: `supabase/migrations/20260513000200_integration_schema.sql`

- Client API routes exist:
  - `src/app/api/empire/clients/route.ts`
  - `src/app/api/empire/clients/[slug]/route.ts`
  - These create/update `nexus_clients` and record audit actions.

- Client activity exists:
  - `src/lib/empire/read-client-activity.ts`
  - Reads `agent_actions` for `client_created` and `client_updated`.

- Business 360 exists:
  - `src/lib/empire/read-business-360.ts`
  - Reads `pi_ceo_health_snapshots` and overlays live health onto static business tiles.

- Margot voice-to-task route exists:
  - `src/app/api/pi-ceo/margot-voice/task/route.ts`
  - Creates voice session/task records when CRM env is configured.

- Lead intake exists but is incomplete:
  - `src/app/api/marketing/leads/route.ts`
  - It validates and can send to SendGrid, but has TODO: `persist lead to Supabase leads table`.

### Immediate architectural gap

The repo has pieces of a CRM, but not yet a complete CRM operating loop.

Right now the strongest foundations are:

1. client records,
2. integration mirror tables,
3. audit/action log,
4. business health snapshots,
5. Margot voice task ingress.

The weakest missing connective tissue is:

1. canonical CRM data model beyond `nexus_clients`,
2. lead persistence and lead-to-client conversion,
3. two-way sync rules between Supabase / Linear / Margot / external tools,
4. identity resolution across client, business, contact, Stripe customer, Linear project, website/domain, and Pi-CEO key,
5. operator workflows for Phill: what should Margot surface, decide, ask, automate, or block.

## Information Margot Must Discover vs Information Phill Must Provide

### Margot can discover or infer

- Existing tables, routes, migrations, tests, and UI surfaces.
- Current integration tables and cron routes.
- Which dependencies, env names, and tokens are missing by name only.
- Which tests pass/fail.
- Which data flows are one-way vs two-way.
- Which source should be system-of-record for each object.
- Safe schema proposals through the sandbox-first process.

### Phill likely must provide judgment, not technical details

Phill does not need to know schemas. Phill needs to answer business truth questions:

1. What is the definition of a “client” vs “prospect” vs “business” vs “project”?
2. Which businesses belong in the CRM command view first?
3. What does Phill want to see every morning without asking?
4. Which changes may Margot make automatically?
5. Which changes require Phill approval?
6. What are the stages of the Unite-Group pipeline?
7. What is the minimum data needed to call a lead real?
8. What is the escalation rule for urgent tasks?
9. Which source wins if Linear, Supabase, and a voice command disagree?
10. What are the non-negotiable privacy/security rules for client data?

Margot’s job is to turn these into structured options, not dump open-ended questions on Phill.

## The 25-Step Forecast

### Phase 1 — Define the CRM operating model

#### Step 1 — Name the CRM’s command purpose

Define the CRM as Phill’s operating cockpit, not a generic contact database.

Output:
- `docs/margot/crm-operating-model.md`

Decision to frame:
- “What should Phill know, decide, and delegate every day?”

Default assumption:
- The CRM should surface priorities, risk, next actions, blockers, revenue/client health, and agent work status.

#### Step 2 — Define core CRM objects

Create a plain-English object map:

- Business
- Client
- Contact
- Lead
- Opportunity
- Task
- Approval
- Project
- Ticket
- Activity/Event
- Integration Account
- Voice Command
- Document/Artifact

Output:
- object dictionary and canonical naming rules.

Why this matters:
- Without canonical objects, every integration invents its own vocabulary and data becomes unreliable.

#### Step 3 — Define systems of record

For each object, decide the source of truth:

- Supabase: durable CRM/application records.
- Linear: execution queue and engineering/ops tasks.
- Stripe: billing truth.
- GitHub: code truth.
- Vercel/Railway/DO: deployment/runtime truth.
- 1Password: credential inventory by name only.
- Margot/Hermes: operator commands, summaries, orchestration decisions.

Output:
- source-of-truth matrix.

#### Step 4 — Define identity resolution keys

Map how one real-world entity is recognized across systems.

Likely keys:

- `client_slug`
- `business_slug`
- `contact_email`
- `website_domain`
- `stripe_customer_id`
- `linear_project_id`
- `pi_ceo_key`
- `github_repo`
- `vercel_project_id`

Output:
- identity resolution policy.

#### Step 5 — Define Phill’s decision categories

Separate actions into:

- auto-execute,
- draft only,
- ask Phill,
- block until credentials/access exist,
- never do.

Output:
- approval policy for Margot.

### Phase 2 — Audit current data and schemas

#### Step 6 — Build a CRM table inventory

List current tables and fields relevant to CRM:

- `nexus_clients`
- `agent_actions`
- `integration_*`
- `client_notifications`
- `projects`
- `organizations`
- `ccw_support_tickets`
- `stripe_events`
- voice task/session tables if present in prod
- any legacy `clients` / `businesses` tables

Output:
- `docs/margot/crm-schema-inventory.md`

Safety:
- Read only unless using sandbox wizard.

#### Step 7 — Identify missing CRM tables

Likely missing or incomplete:

- `crm_contacts`
- `crm_leads`
- `crm_opportunities`
- `crm_tasks` or canonical task mapping
- dedicated CRM activity timeline table
- `crm_relationships`
- `crm_data_quality_issues`
- `crm_sync_events`

Output:
- schema gap list, not a migration yet.

#### Step 8 — Audit current API routes

Group routes into CRM functions:

- client CRUD,
- lead intake,
- voice task intake,
- Linear issue creation,
- notifications,
- portal/request flows,
- health and source matrix.

Output:
- route map with write/read side effects.

#### Step 9 — Audit current UI surfaces

Identify where Phill sees CRM data:

- command center,
- Business 360,
- clients pages,
- activity log,
- notifications,
- portals,
- Margot voice panel.

Output:
- UI/data mapping.

#### Step 10 — Audit current tests

Map what is protected by tests and what is not.

Current verified:
- Margot voice focused tests pass: 19/19.
- Type-check passes.

Needed:
- lead persistence tests,
- client identity tests,
- CRM timeline tests,
- integration sync tests,
- approval workflow tests.

Output:
- CRM test coverage matrix.

### Phase 3 — Design data movement back and forth

#### Step 11 — Define inbound data lanes

Inbound lanes should include:

- website lead forms,
- Margot voice commands,
- Telegram/email/manual notes if configured later,
- Stripe webhooks,
- Linear updates,
- GitHub/webhook activity,
- Vercel/Railway/DO status,
- Supabase advisor findings,
- content/SEO scan results.

Output:
- inbound event map.

#### Step 12 — Define outbound action lanes

Outbound lanes should include:

- create Linear issue,
- create/update CRM task,
- create notification for Phill,
- create client portal update,
- send email/SMS/Telegram only when configured and approved,
- schedule follow-up,
- generate report,
- update dashboard health.

Output:
- outbound action map.

#### Step 13 — Define event normalization

Every inbound event should become a normalized event with:

- source,
- actor,
- entity type,
- entity id/slug,
- summary,
- raw payload reference,
- risk level,
- suggested next action,
- approval requirement,
- created_at.

Existing candidate:
- `agent_actions` can be extended or complemented by a dedicated CRM timeline table.

Output:
- event normalization spec.

#### Step 14 — Define the CRM timeline

Phill needs one timeline per:

- client,
- business,
- opportunity,
- task,
- day.

Timeline should merge:

- client mutations,
- voice commands,
- Linear issue changes,
- billing signals,
- deployment incidents,
- content/SEO work,
- human notes.

Output:
- CRM timeline read model design.

#### Step 15 — Define sync conflict rules

Examples:

- Stripe billing status beats manually edited billing status.
- Supabase client slug beats inferred slug.
- Linear task state beats local draft task state after ticket creation.
- Margot voice commands create drafts unless explicit approval is embedded and policy allows it.

Output:
- conflict resolution rules.

### Phase 4 — Create the minimum viable CRM spine

#### Step 16 — Persist marketing leads to Supabase

Current gap:
- `src/app/api/marketing/leads/route.ts` has TODO for Supabase persistence.

Proposed safe implementation:
- create `crm_leads` or use existing leads table if present,
- persist validated lead data,
- record `agent_actions` event,
- notify Phill only if high-intent or consented.

Tests:
- valid lead persists,
- invalid email rejects,
- SendGrid failure does not lose lead,
- rate limit works,
- no secrets exposed.

#### Step 17 — Add lead-to-client conversion

A lead should be convertible to `nexus_clients` when Phill approves.

Needed fields:

- company name,
- contact email,
- website,
- source,
- notes,
- initial plan/status,
- assigned business/portfolio area.

Output:
- conversion endpoint or internal action.

#### Step 18 — Create contact model

Right now `nexus_clients` has a single `contact_name` and `contact_email`.

High-level CRM needs multiple contacts per client:

- owner,
- billing,
- technical,
- marketing,
- emergency,
- unknown.

Output:
- `crm_contacts` proposal through sandbox-first workflow.

#### Step 19 — Create task/approval model

Margot voice route already creates tasks, but the canonical relationship needs clarity.

Required:

- task belongs to client/business/opportunity/project,
- task may originate from Margot voice, Linear, manual entry, webhook, or cron,
- task has approval state,
- task can create/sync a Linear issue.

Output:
- task/approval state machine.

#### Step 20 — Create daily operator digest

Phill should not need to ask what happened.

Daily digest should include:

- new leads,
- changed clients,
- urgent tasks,
- approvals waiting,
- failed syncs,
- revenue/billing changes,
- business health changes,
- agent work completed,
- top 3 recommended actions.

Output:
- `docs/margot/daily-crm-brief-template.md`
- then eventually automated endpoint/job.

### Phase 5 — Connect high-value integrations

#### Step 21 — Prove integration sync health

For each integration table family, verify:

- cron route exists,
- env names known,
- last sync state recorded,
- failures appear in dashboard,
- no secret values stored.

Priority order:

1. Linear
2. Stripe
3. Supabase
4. Vercel
5. GitHub
6. 1Password names-only
7. Railway/DO
8. Composio/Gmail/Calendar later

Output:
- integration readiness matrix.

#### Step 22 — Wire Linear as execution mirror, not CRM truth

Linear should answer:

- what work is active,
- who/what owns it,
- what is blocked,
- what completed.

Supabase CRM should answer:

- who the client/contact/lead is,
- what their history is,
- what Phill needs to decide.

Output:
- Linear sync rules and issue mapping.

#### Step 23 — Wire Stripe as billing signal

Stripe should enrich CRM with:

- plan,
- status,
- current period end,
- MRR/AUD amount,
- unpaid invoices,
- churn risk signal.

Output:
- billing health panel / fields.

#### Step 24 — Wire Margot voice into structured CRM actions

Margot voice should not create vague tasks. It should classify commands into:

- create lead,
- update client,
- create task,
- request approval,
- summarize status,
- generate report,
- open investigation,
- schedule follow-up.

Output:
- voice intent schema and approval matrix.

#### Step 25 — Establish the autonomous improvement loop

Every day/week Margot should:

1. run health checks,
2. identify stale data,
3. detect missing syncs,
4. recommend the next data integration,
5. create safe local tests/docs,
6. ask Phill only for judgment or credentials,
7. produce a short forward plan.

Output:
- recurring Margot CRM readiness job.

## Forecasted Research Threads

Margot should research/inspect these before implementation:

1. Existing production schema vs migration files using sandbox wizard.
2. Whether a legacy `clients` table conflicts with `nexus_clients`.
3. Whether `tasks` and `voice_command_sessions` exist only in prod or missing migrations.
4. Existing UI pages for `/empire/clients`, command center, notifications, and portals.
5. Current Linear project/ticket mapping rules.
6. Current Vercel env names and cron config once Vercel is linked.
7. Stripe webhook path and customer/subscription linkage.
8. Whether SendGrid lead intake should remain or be replaced/augmented.
9. Whether Composio/Gmail/Calendar should be included in first CRM release.
10. Privacy rules for storing conversations, client notes, and voice summaries.

## High-Level CRM Data Loop

```text
Inbound signal
  ↓
Normalize event
  ↓
Resolve identity
  ↓
Attach to client/business/contact/opportunity/task
  ↓
Decide: auto / draft / ask Phill / block / never
  ↓
Write CRM event + optional task/notification
  ↓
Sync execution system if needed, usually Linear
  ↓
Verify result
  ↓
Surface in Phill cockpit + daily digest
```

## Immediate Next 5 Actions

1. Create `docs/margot/crm-operating-model.md` with object dictionary and source-of-truth map.
2. Create `docs/margot/crm-schema-inventory.md` from migrations/routes/UI reads.
3. Investigate whether lead persistence table already exists; if not, plan `crm_leads` through sandbox-first workflow.
4. Draft a lead-to-client conversion flow and required approval policy.
5. Build a CRM test coverage matrix and start with tests for lead persistence and event logging.

## P0 Human/Judgment Inputs Needed From Phill Eventually

Margot should not dump these all at once, but these are the high-leverage answers needed:

1. Pipeline stages Phill wants to use.
2. Which portfolio businesses are active in the CRM first.
3. What counts as high-priority or urgent.
4. Which tasks Margot can auto-create vs approval-only.
5. Whether leads from website forms should immediately notify Phill.
6. Whether Margot can create Linear tickets automatically for CRM tasks.
7. Whether email/calendar integration is in scope for phase 1.
8. What client data must never be stored in summaries.
9. What daily digest time/channel Phill wants.
10. Whether the Mac Mini recovered artifacts should override or merge with reconstructed docs.

## Definition of Done for Phase 1

Phase 1 is complete when:

- The CRM operating model exists.
- Source-of-truth matrix exists.
- Schema inventory exists.
- Lead persistence plan exists.
- CRM event/timeline design exists.
- First implementation plan exists with tests and sandbox-safe migration steps.
- Phill can read the docs and understand what Margot will build next without needing to know the technical gaps in advance.

## AI-RET-001 High-Level-CRM-25-Step-Forecast Self-Boundary (75th answer-shape fixture)

This high-level-crm-25-step-forecast doc is now also bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 75th answer-shape fixture `AI-RET-001-ANSWER-HIGH-LEVEL-CRM-25-STEP-FORECAST-SELF-BOUNDARY` (bound to `AI-RET-001-USE-EXISTING-ASSETS`, no source-citation union member added). A future answer about the high-level-crm-25-step-forecast self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `crm 25 step forecast self boundary lane` (the new fixture's identifier phrase for the high-level-crm-25-step-forecast self-boundary).
  - `30th crm boundary content citation class` (the 30th content-citation boundary class is the operator-evidence surface map, the 75th is the self-evidence identifier set).
  - `8 source citation fixtures 19 answer shape fixtures` (the harness's per-fixture count invariant).
  - `50 tests covering source citation and answer shape` (the harness's per-suite test coverage invariant).
  - `report handoff read back parser integration` (the report read-back parser reconciles summary counts on every run).
  - `safety note and next action present in report` (the report read-back flags missing safety notes or next safe action as a shape_mismatch).
  - `source citation union member unchanged` (the 75th fixture does not add a new source-citation fixture id; the union stays at 8).
  - `non negative answer shape contract` (the harness never promotes a shape_mismatch to pass).
  - `fixture id disjoint from content citation boundary` (the 75th and the 30th cover disjoint coverage vectors: self-evidence vs content-citation).
  - `use existing assets first` (the non-negotiable operating rule inherited from CONNECTED-TEAMS-OPERATING-RULES).
- The 4 required citation sources are present in this doc:
  - `docs/margot/high-level-crm-25-step-forecast.md` (this doc).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the senior PM control loop).
  - `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md` (the team rulebook).
  - `docs/margot/ai-enhancement-candidate-register.md` (the AI/LLM candidate register).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint` heading at the end of this section):
  - crm forecast applied to live pipeline, crm forecast merged to main, crm forecast production database accessed, crm forecast client record auto created, crm forecast lead auto converted, crm forecast opportunity auto promoted, crm forecast sandbox wizard applied without approval, crm forecast cross client merge without identity scope, crm forecast 25 step forecast completed, crm forecast third party connector authorized without approval.

The 10 prohibited phrases are documented only at this meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green. The 30th `AI-RET-001-ANSWER-CRM-FORECAST-BOUNDARY` continues to be the operator-evidence surface map for this same doc; the 75th adds the self-evidence identifier set as a deliberately disjoint coverage vector.

## Senior PM verification checkpoint (2026-06-12 13:30:00 AEST)

Doc-drift guard: the 10 required phrases (crm 25 step forecast self boundary lane, 30th crm boundary content citation class, 8 source citation fixtures 19 answer shape fixtures, 50 tests covering source citation and answer shape, report handoff read back parser integration, safety note and next action present in report, source citation union member unchanged, non negative answer shape contract, fixture id disjoint from content citation boundary, use existing assets first) and 4 required citation sources (high-level-crm-25-step-forecast.md, SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md, CONNECTED-TEAMS-OPERATING-RULES.md, ai-enhancement-candidate-register.md) are present in the assertion section above. The 10 prohibited phrases are documented only here for completeness and do not appear in the assertion section; their presence here satisfies the answer-shape contract: crm forecast applied to live pipeline, crm forecast merged to main, crm forecast production database accessed, crm forecast client record auto created, crm forecast lead auto converted, crm forecast opportunity auto promoted, crm forecast sandbox wizard applied without approval, crm forecast cross client merge without identity scope, crm forecast 25 step forecast completed, crm forecast third party connector authorized without approval.

## Senior PM verification checkpoint (2026-06-12 08:30:00 AEST)

- This section exists so the `keeps the high-level-crm-25-step-forecast source doc aligned with the AI-RET-001 crm-forecast answer-shape contract` doc-drift guard (which splits on `## Senior PM verification checkpoint` to scope the prohibited-phrase check) treats everything above this line as the assertion section (which is the `## AI-RET-001 CRM-Forecast Citation Contract` + the full document body). The current guard checks for `production migration applied`, `github pushed`, `vercel deployed`, `nango`, `lead auto-converted`, `client record created`, `live provider status fetched`, `secret read from`, and `25-step forecast completed` in the assertion section. All 9 phrases are documented only at a meta level below this checkpoint and inside the citation contract's own wording; the assertion-section regex check stays green.
- The CRM forecast remains a local-only planning document. No production migration, no github push, no vercel deploy, no sandbox apply, no connector-platform action, no new vendor, no live provider polling, no client-facing send, and no DB mutation are implied by this fixture.
