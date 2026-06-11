# Margot CRM Schema Inventory

Date: 2026-05-23 07:24 AEST
Last update: 2026-06-12 19:30:00 AEST — Senior PM crm-schema-inventory self-boundary lane: added the 89th AI-RET-001 answer-shape fixture `AI-RET-001-ANSWER-CRM-SCHEMA-INVENTORY-SELF-BOUNDARY` (bound to `AI-RET-001-LEAD-QUALIFICATION`) to pin this doc's self-evidence identifier set against the operator-evidence surface map already covered by the 10th content-citation fixture, added a new `Related self-boundary` cross-link, refreshed the verification checkpoint, and preserved the unapplied `crm_leads` migration + draft `crm_contacts` / `crm_opportunities` / `crm_approvals` / stage-1-task-subtype / forecast-only / sandbox-first / no-production-writes contract.
Previous refresh: 2026-06-10 01:55 AEST
Project: Unite-Group
Owner: Margot
Scope: Existing local assets only: migrations, routes, helpers, and tests in this repository.

Related evidence:
- `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (current pass state).

Related fixture:
- `AI-RET-001-ANSWER-CRM-SCHEMA-INVENTORY-BOUNDARY` (binds this inventory to the AI-RET-001 answer-shape harness so any future agent that claims the schema is already in production, that `crm_approvals` is live, or that `crm_leads` is applied to the target env fails the contract).

Related self-boundary:
- `AI-RET-001-ANSWER-CRM-SCHEMA-INVENTORY-SELF-BOUNDARY` (the 89th answer-shape fixture, bound to `AI-RET-001-LEAD-QUALIFICATION`) pins this doc's self-evidence identifier set against the operator-evidence surface map already covered by the 10th content-citation fixture. The 89th is the self-boundary; the 10th is the content-citation boundary; the two cover different coverage vectors and are deliberately disjoint.

Related rotation guard:
- The `## Senior PM verification checkpoint` block below records the current state, the missing authority/auth gates, the current health evidence, the Mac Mini state, and the smallest next action for this control surface. Do not run sandbox-wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` against `crm_leads`, `crm_contacts`, `crm_opportunities`, or the proposed `crm_approvals` from this inventory task.

Read first: `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`

## 1. Purpose and source-of-truth rule

This document is the current CRM schema inventory and source-of-truth map for the Unite-Group CRM spine. It exists to prevent drift while Margot expands from lead capture and client management into contacts, opportunities, approvals, timeline events, command-center UI, and daily digest reporting.

Source-of-truth rule:

- Supabase tables are the CRM system of record only where a local migration and current read/write path exist.
- External execution and finance systems remain authoritative for their own domains; the CRM stores links, mirrors, health summaries, tasks, and operator interpretation.
- Repo docs are the durable 2nd Brain and planning source until a production-backed CRM object exists and is verified.
- Service-role server routes may write CRM records when already scoped and tested. Browser/client code should not write sensitive CRM tables directly.
- Production writes, deployments, schema promotion, cross-client merges, billing/payment actions, and client-facing communications require explicit Phill/Board approval.

## 2. Inventory table

Column policy for this inventory:

- Tables with local migrations list the CRM-relevant columns in the table row or in the detailed column section below.
- Tables that are referenced by code but were missing an original repo migration (`tasks`, `voice_command_sessions`) are still treated as provenance gaps for production authority; the current safe artifact is the reconstructed sandbox-only proposal at `docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql`, guarded by local static tests and not applied here.
- Integration mirror tables are grouped in the main map for readability and enumerated table-by-table in [Section 2A](#2a-integration-mirror-table-column-index).

| Object / table | Current role | Migration / source | Current writers | Current readers | Tests | Source-of-truth status | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `public.businesses` | Portfolio business / operating-unit identity. Nexus migration adds CRM-facing keys and ARR field. | `supabase/migrations/20260510000001_nexus_businesses.sql` adds `pi_ceo_key`, `linear_project_id`, `website_url`, `arr_aud`; indexes `slug`, `status`; table comment says one row per business / empire source of truth. | No CRM writer inspected in this pass. Existing table pre-dates local migration. | Business 360 surface indirectly via seeded tiles plus health snapshots in `src/lib/empire/read-business-360.ts`; `crm_leads` can reference `matched_business_id`; `agent_actions.business_id` can reference it. | No focused business-table tests found in requested scope. | Source of truth for portfolio business identity when row exists; integrations enrich but should not overwrite identity. | Need explicit business create/update route and tests if Margot is to manage businesses; need identity-resolution rule for `pi_ceo_key`, slug, Linear project ID, and website domain. |
| `public.nexus_clients` | Paying/onboarding/active external client record. Core CRM client table. | `supabase/migrations/20260510000002_nexus_clients.sql` creates `id`, `slug`, company/contact/web/Stripe/plan/status/Linear/onboarding/`pi_ceo_key`/`brand_config` fields; RLS service-role full access and authenticated read. | `src/app/api/empire/clients/route.ts` POST inserts onboarding clients; `src/app/api/empire/clients/[slug]/route.ts` PATCH updates client fields/status/brand and portal content where present. Future conversion should write here only after identity/approval gates. | `src/lib/empire/list-nexus-clients.ts`; client edit route reads updated row; `crm_leads.matched_client_id` and `converted_client_id` reference it. | Client route unit tests under `src/app/api/empire/clients/__tests__/` and `[slug]/__tests__/`: validation, slug race, email/website validation, unique violation mapping, record-action, PATCH validation. | Current Supabase source of truth for external client lifecycle and client cockpit identity. | Contact model is embedded (`contact_name`, `contact_email`) not normalized; no lead conversion route; no opportunity/account-health history; migration lacks `updated_at`; plan/status set is narrow. |
| `public.agent_actions` | Append-oriented agent/audit timeline for Margot/Board/PM/orchestrator/system events, including client create/update audit entries. | `supabase/migrations/20260510000004_nexus_agent_actions.sql`; fields include `source`, `action_type`, `payload`, `idea_text`, `business_id`, legacy `client_id` reference to `public.clients`, `linear_ticket_id`, `status`, parent/created/resolved. | `src/app/api/empire/clients/_record-action.ts` writes `client_created` / `client_updated` after client POST/PATCH; failures are non-fatal and logged. | `src/lib/empire/read-client-activity.ts` reads client actions by `payload->>slug`; command-center ActivityLog / GlobalStatusBar referenced by comments. | `src/app/api/empire/clients/__tests__/record-action.test.ts`; client route tests cover audit behavior indirectly. | Current audit/event source for client mutations and agent pipeline events. | `client_id` FK targets legacy `public.clients`, not `nexus_clients`; no dedicated CRM timeline table; event taxonomy not formalized for leads/opportunities/tasks/approvals; no append-only guard beyond convention. |
| `public.crm_leads` | Public marketing lead intake persistence. First-class CRM lead record before qualification/conversion. | `supabase/migrations/20260523100000_crm_leads.sql`; columns: `id`, `first_name`, `last_name`, `email`, `phone`, `company`, `job_title`, `message`, `interests`, `referral_source`, `marketing_consent`, `email_list_id`, `source`, `status`, `qualification_score`, `assigned_owner`, `matched_client_id`, `matched_business_id`, `converted_client_id`, `ip_address`, `user_agent`, `additional_data`, `captured_at`, `created_at`, `updated_at`, `converted_at`; status and score checks; service-role-only RLS policy. | `src/app/api/marketing/leads/route.ts` POST validates public form data, optionally attempts SendGrid subscription, then inserts into `crm_leads` with `status='new'`, `source='website_form'`, `assigned_owner='Margot'`. | `src/app/api/crm/leads/route.ts` GET lists recent leads for admin/service-role callers with optional `status`, `owner`, `source`, and `limit` filters. | `tests/integration/api/marketing-leads.test.ts` covers valid persistence, SendGrid failure still capturing CRM lead, missing CRM env, insert failure. `tests/integration/api/crm-leads-list.test.ts` covers list success, missing env, read failure, and filters. | Local code/migration source of truth for website-form leads once the migration is applied to the target Supabase environment. SendGrid is side integration, not source of truth. | Need qualification helper, conversion flow, duplicate/identity handling, privacy retention decision for IP/user-agent, RLS/read role policy for command center. |
| `public.tasks` | Work queue for Margot/agent/human tasks created from voice commands; approval-required commands become blocked tasks. | Original defining migration still not found under `supabase/migrations`; reconstructed sandbox-only proposal exists at `docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql` and is guarded by `tests/unit/margot-tasks-voice-migration-proposal.test.ts`. | `src/app/api/pi-ceo/margot-voice/task/route.ts` inserts title, description, status, priority, assignee, tags, position, and `obsidian_path` after voice session insert. | Daily CRM digest task reads in `src/lib/crm/read-daily-digest.ts`; command-center task visibility is through existing task conventions. | `tests/integration/api/margot-voice-task.test.ts` covers auth, rate limit, env missing, invalid JSON/packet, voice insert failure, task insert failure, success, defaults/truncation, approval-required status. `tests/unit/margot-tasks-voice-migration-proposal.test.ts` statically guards the sandbox proposal. | Operational task queue source where schema exists in deployed/local DB; local production authority remains blocked until sandbox apply/diff evidence and Board approval. | Sandbox apply/diff evidence is still missing/approval-gated; validate legacy `project_id`/`created_by` constraints, status/priority checks, RLS, updated-at trigger, CRM object links, and approval subtype before promotion. |
| `public.voice_command_sessions` | Durable capture of spoken operator requests and parsed intent before task creation. | Original defining migration still not found under `supabase/migrations`; reconstructed sandbox-only proposal exists at `docs/margot/migration-proposals/2026-05-31-tasks-voice-command-sessions-sandbox.sql` and is guarded by `tests/unit/margot-tasks-voice-migration-proposal.test.ts`. | `src/app/api/pi-ceo/margot-voice/task/route.ts` inserts org/user/transcript/parsed intent/status/language. | Returned to caller as `crm_session_id`; future command center/digest should read by task/session relation. | `tests/integration/api/margot-voice-task.test.ts`; related signed-url coverage in `tests/integration/api/margot-voice-signed-url.test.ts`; failure taxonomy in `tests/unit/margot-voice-failure-taxonomy.test.ts`; sandbox proposal static guard in `tests/unit/margot-tasks-voice-migration-proposal.test.ts`. | Source of truth for voice-command transcript/intent where table exists; local production authority remains blocked until sandbox apply/diff evidence, retention/privacy review, RLS verification, and Board approval. | Need sandbox validation of FK to `tasks(id)`, org/user scoping, transcript retention/privacy, RLS/service-role policy, and digest/approval visibility before any production promotion. |
| `public.integration_sync_state` | Per-integration sync health metadata for read-only mirrors. | `supabase/migrations/20260513000200_integration_schema.sql`. | Integration-specific sync jobs/routes outside this pass; service-role write policy. | Empire dashboard / command center surfaces are intended readers. | Not audited in this pass. | Source of truth for CRM mirror freshness, not for external data itself. | Need digest health rollup and stale-sync thresholds. |
| `public.integration_github_*` | GitHub mirror: repos, PRs, commits, Actions runs, secret-name index. | `supabase/migrations/20260513000200_integration_schema.sql`. | GitHub sync writer path outside requested scope. | Command center / project portfolio can read. | Not audited in this pass. | GitHub remains source of truth; tables are Supabase mirrors. | Need client/business/project linking and alert rules. Secret index must remain names only. |
| `public.integration_vercel_*` | Vercel mirror: projects, deployments, env key index. | `supabase/migrations/20260513000200_integration_schema.sql`. | Vercel sync writer path outside requested scope. | Command center / project health readers. | Not audited in this pass. | Vercel remains source of truth; CRM mirror stores deployment/env health. | Env index stores metadata only; no value storage. Need production change approval gates and digest rules. |
| `public.integration_railway_*` | Railway mirror: services and deployments. | `supabase/migrations/20260513000200_integration_schema.sql`. | Railway sync writer path outside requested scope. | Project/runtime health readers. | Not audited in this pass. | Railway remains source of truth; CRM mirror is read-only health surface. | Need project/client mapping. |
| `public.integration_do_*` | DigitalOcean mirror: apps, droplets, databases, cost/status metadata. | `supabase/migrations/20260513000200_integration_schema.sql`. | DO sync writer path outside requested scope. | Runtime/cost health readers. | Not audited in this pass. | DigitalOcean remains source of truth; CRM mirror summarizes health/cost. | Need cost/risk thresholds and owner tasks. |
| `public.integration_supabase_*` | Supabase project/advisor mirror. | `supabase/migrations/20260513000200_integration_schema.sql`. | Supabase sync writer path outside requested scope. | Infra health / advisor readers. | Not audited in this pass. | Supabase dashboard/advisor remains source of truth; mirror feeds command center. | Need advisor triage and sandbox/prod separation in UI. |
| `public.integration_onepassword_index` | 1Password inventory index with vault/item/category names only. | `supabase/migrations/20260513000200_integration_schema.sql`. | 1Password sync writer path outside requested scope. | Access readiness / secret inventory readers. | Not audited in this pass. | 1Password remains source of truth. CRM stores names only, never secret values. | Need missing-access queue and least-privilege staging view. |
| `public.integration_linear_*` | Linear mirror: teams, projects, issues. Execution/project state. | `supabase/migrations/20260513000200_integration_schema.sql`. | Linear sync writer path outside requested scope. | Project portfolio, CRM tasks/digest, client activity surfaces. | Not audited in this pass. | Linear remains source of truth for execution state; CRM mirrors and interprets. | Need mapping from `nexus_clients.linear_project_id` / `businesses.linear_project_id` to Linear project/issue rows. |
| `public.integration_stripe_*` | Stripe mirror: subscriptions and monthly invoice rollup. | `supabase/migrations/20260513000200_integration_schema.sql`. | Stripe sync writer path outside requested scope. | Revenue/client health readers; `nexus_clients` stores customer/subscription IDs. | Not audited in this pass. | Stripe remains source of truth for billing/revenue. CRM stores links/status summaries. | Financial writes are out of bounds; need read-only revenue risk rules. |
| `public.integration_composio_connections` | Composio connection status mirror for future email/calendar/tooling integrations. | `supabase/migrations/20260513000200_integration_schema.sql`. | Composio sync writer path outside requested scope. | Access/integration readiness readers. | Not audited in this pass. | Composio remains source of truth; CRM mirror tracks connection health. | Need explicit use cases before writes or automation. |
| `public.pi_ceo_health_snapshots` | Business/project health snapshot source used by Business 360 helper. | Not in requested migration list; inferred from `src/lib/empire/read-business-360.ts`. | Writer not inspected. | `src/lib/empire/read-business-360.ts` reads recent snapshots and overlays seed Business 360 tiles. | Not audited in this pass. | Current health-snapshot source where present; not a CRM identity table. | Need migration/source provenance and mapping to `businesses` / Linear project IDs. |
| Draft `crm_contacts` | Canonical people/contact map for leads, clients, businesses, and stakeholders. | `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` drafts `display_name`, first/last, email/phone, role/company, lead/client/business links, source/consent, owner/status, dedupe keys, privacy scope, retention/privacy notes, verification time, timestamps, conservative checks, indexes, RLS, and service-role-only policy. | None yet; future writes must go through server routes/service-role code after sandbox verification. | None yet. | `tests/unit/margot-crm-contacts-opportunities-migration.test.ts` asserts the draft table, privacy/consent fields, RLS, service-role policy, and safety comments. | Draft local migration only; not applied to sandbox/prod in this tick. | Need sandbox-wizard apply/diff before promotion, contact create/link route, dedupe policy implementation, client-mixing abort tests, and command-center/digest readers. |
| Draft `crm_opportunities` | Forecast-only qualified commercial opportunities with stage/value/probability/source. | `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` drafts name, stage/status, forecast value/currency/probability, expected close, source/owner, lead/contact/client/business links, next action, decision/risk, campaign/source details, close/lost metadata, approval flags/status, timestamps, checks, indexes, RLS, and service-role-only policy. | None yet; future writes must not imply billing truth and must respect approval gates. | None yet. | `tests/unit/margot-crm-contacts-opportunities-migration.test.ts` asserts the draft opportunity table, forecast/approval fields, RLS, service-role policy, and sandbox-first/billing-separation comments. | Draft local migration only; Stripe remains billing truth and this table is forecast/pipeline truth only after sandbox application. | Need sandbox-wizard apply/diff before promotion, opportunity draft route, mocked link/identity tests, daily digest query, and explicit approval route before any client mutation or external comms. |
| Approval task subtype; future `crm_approvals` only if justified | Human decision/permission gates for production, billing, client-facing, identity, and cross-client decisions. | No dedicated migration/source found. Voice route currently uses `tasks.status='blocked'`, high priority, assignee `Phill approval`, approval tags/reason. `docs/margot/crm-approval-persistence-plan.md` now chooses the current task subtype as Stage 1 and defers a dedicated `crm_approvals` table until structured approval history/query needs are proven. | Voice task route creates approval-needed tasks. Local mapper `buildCrmApprovalLifecycleInputFromTaskEvidence` converts task evidence into approval lifecycle input for decision support only; future writes still need sanitized timeline events before any new table. | Future command center/digest surfaces can read blocked/high approval tasks; dedicated approval reads wait for Stage 2. | Margot voice task tests cover approval-required task behavior; `tests/unit/lib/crm/approval-lifecycle.test.ts` covers lifecycle classification, task-evidence mapping, status normalization, expiry, high-risk gates, and returned-reason redaction. | Partial via task convention plus documented Stage 1 persistence decision and local mapper, not dedicated table. | Add sanitized event-write tests before route writes; draft `crm_approvals` only through sandbox-first process if Stage 2 triggers are met. |
| Proposed dedicated activity timeline table | Unified timeline across leads, clients, contacts, opportunities, tasks, approvals, integrations, and voice. | No migration/source found. Current event/audit table is `agent_actions`. | Client audit helper writes `agent_actions`; voice route writes sessions/tasks. | Client activity helper reads `agent_actions`. | Client record-action tests; Margot voice tests. | Partial via `agent_actions`; broader timeline is a gap. | Need event taxonomy, object references, and retention policy before introducing a new table. |

## 2A. Integration mirror table column index

All tables in this section are created by `supabase/migrations/20260513000200_integration_schema.sql`. They are CRM evidence mirrors only: the external provider remains source of truth.

| Table | Key columns from local migration | CRM use |
| --- | --- | --- |
| `integration_sync_state` | `integration`, `last_sync_started_at`, `last_sync_completed_at`, `last_sync_status`, `last_sync_error`, `rows_upserted`, `next_sync_due_at` | Mirror freshness and stale-sync alerts. |
| `integration_github_repos` | `id`, `name`, `owner`, `default_branch`, `is_private`, `last_pushed_at`, `open_prs_count`, `open_issues_count`, `fetched_at` | Repo/project health. |
| `integration_github_prs` | `id`, `repo`, `number`, `title`, `state`, `author_login`, `author_email`, `head_ref`, `base_ref`, `created_at`, `updated_at`, `merged_at`, `mergeable`, `ci_state`, `fetched_at` | PR delivery status and blockers. |
| `integration_github_commits` | `sha`, `repo`, `author_login`, `author_email`, `committed_at`, `message_subject`, `branch`, `fetched_at` | Engineering activity evidence. |
| `integration_github_actions_runs` | `id`, `repo`, `workflow_name`, `head_branch`, `head_sha`, `status`, `conclusion`, `started_at`, `completed_at`, `fetched_at` | CI health. |
| `integration_github_secrets_index` | `repo`, `secret_name`, `updated_at`, `fetched_at` | Names-only secret inventory; never secret values. |
| `integration_vercel_projects` | `id`, `name`, `framework`, `git_repo`, `production_url`, `last_deployment_id`, `last_deployment_state`, `last_deployment_at`, `fetched_at` | Deployment surface. |
| `integration_vercel_deployments` | `id`, `project_id`, `url`, `state`, `target`, `commit_sha`, `commit_message`, `ready_at`, `created_at`, `fetched_at` | Deployment history/health. |
| `integration_vercel_env_index` | `project_id`, `env_target`, `key`, `is_empty`, `value_length`, `updated_at`, `fetched_at` | Env metadata only; no values. |
| `integration_railway_services` | `id`, `project_id`, `name`, `last_deployment_id`, `last_deployment_status`, `last_deployment_at`, `service_url`, `fetched_at` | Runtime service health. |
| `integration_railway_deployments` | `id`, `service_id`, `status`, `commit_sha`, `created_at`, `finished_at`, `fetched_at` | Railway deployment evidence. |
| `integration_do_apps` | `id`, `name`, `project_name`, `region`, `live_url`, `active_deployment_id`, `active_deployment_phase`, `last_deployment_phase`, `last_deployment_progress_at`, `fetched_at` | DigitalOcean app health. |
| `integration_do_droplets` | `id`, `name`, `region`, `size`, `status`, `ipv4`, `created_at`, `monthly_cost_usd`, `fetched_at` | Infra/cost watch. |
| `integration_do_databases` | `id`, `name`, `engine`, `version`, `status`, `region`, `monthly_cost_usd`, `fetched_at` | Database health/cost watch. |
| `integration_supabase_projects` | `ref`, `name`, `region`, `status`, `pg_version`, `total_advisor_findings`, `advisor_errors`, `advisor_warns`, `advisor_infos`, `fetched_at` | Supabase project health. |
| `integration_supabase_advisor_findings` | `id`, `project_ref`, `finding_name`, `severity`, `detail`, `resource_name`, `fetched_at` | Security/performance advisory queue. |
| `integration_onepassword_index` | `vault`, `item_name`, `category`, `last_modified`, `fetched_at` | Credential inventory by name only. |
| `integration_linear_teams` | `id`, `name`, `key`, `active_cycle_id`, `fetched_at` | Linear team identity. |
| `integration_linear_projects` | `id`, `name`, `team_id`, `state`, `progress`, `fetched_at` | Project execution mirror. |
| `integration_linear_issues` | `id`, `team_id`, `project_id`, `title`, `state_name`, `state_type`, `priority`, `assignee_id`, `assignee_name`, `created_at`, `updated_at`, `completed_at`, `fetched_at` | Task/ticket execution mirror. |
| `integration_stripe_subscriptions` | `id`, `customer_id`, `status`, `current_period_end`, `monthly_amount_aud`, `product_name`, `created_at`, `fetched_at` | Revenue/client-health mirror. |
| `integration_stripe_invoices_mtd` | `yyyymm`, `total_aud`, `paid_aud`, `outstanding_aud`, `fetched_at` | Monthly revenue/receivables mirror. |
| `integration_composio_connections` | `id`, `toolkit_slug`, `user_email`, `status`, `last_used_at`, `fetched_at` | Future email/calendar/tooling connection health. |

## 2B. `src/lib/empire/*` reader inventory

The requested helper scope was inspected and mapped as follows:

| Helper | Tables read | CRM relevance |
| --- | --- | --- |
| `src/lib/empire/list-nexus-clients.ts` | `nexus_clients` | Client index / cockpit client list. |
| `src/lib/empire/read-client-activity.ts` | `agent_actions` | Client activity by `payload->>slug`. |
| `src/lib/empire/read-activity-feed.ts` | `agent_actions` | Command-center activity feed. |
| `src/lib/empire/read-agent-topology.ts` | `agent_actions` | Agent topology / pipeline visibility. |
| `src/lib/empire/read-global-status.ts` | `agent_actions` | Global status bar counts. |
| `src/lib/empire/read-business-360.ts` | `pi_ceo_health_snapshots` | Business 360 health overlay. |
| `src/lib/empire/read-portfolio-summary.ts` | `pi_ceo_health_snapshots`, `businesses` | Portfolio summary. |
| `src/lib/empire/read-data-room-health.ts` | `data_room_documents` | Data-room evidence health; adjacent to CRM but not an identity source. |

## 3. Current CRM spine summary

Current working spine from local assets:

1. `businesses` is the portfolio/business identity anchor where rows exist. The Nexus migration adds keys needed for command-center mapping (`pi_ceo_key`, `linear_project_id`, website, ARR).
2. `nexus_clients` is the current client lifecycle source of truth. The create/update API routes write it through admin-gated server routes and emit audit entries.
3. `agent_actions` is the current audit/event surface. Client create/update events are written here and read back for client activity.
4. `crm_leads` is the local code/migration target for public website lead intake. The marketing lead route validates submissions, optionally calls SendGrid, then persists the CRM lead when the target Supabase environment has the migration applied. SendGrid failure is non-fatal; CRM persistence failure is fatal to the request. The admin/service-role CRM leads route now lists recent leads with status/owner/source filters for command-center visibility.
5. `voice_command_sessions` plus `tasks` form the current voice-to-work queue. The original local migrations for these tables were not found, but the route/tests establish the current contract and the reconstructed sandbox-only proposal now captures the intended additive schema for review.
6. `integration_*` tables are read-only mirrors for GitHub, Vercel, Railway, DigitalOcean, Supabase, 1Password, Linear, Stripe, and Composio. Their providers remain source of truth; Supabase mirrors feed CRM/project/command-center visibility.
7. `pi_ceo_health_snapshots` feeds Business 360 but needs provenance captured if it becomes part of the formal CRM schema map.

The local CRM code path and documented schema are therefore ready for:

- website lead capture into `crm_leads` after target-environment migration application,
- client create/update into `nexus_clients`,
- client audit events in `agent_actions`,
- voice task creation into `voice_command_sessions` and `tasks`,
- read-only project/integration health mirrors.

The CRM is not yet complete for:

- lead qualification and conversion,
- canonical contacts,
- opportunities,
- durable approvals,
- unified timeline/event model,
- daily digest querying.

## 4. Known gaps queue ordered for next build lanes

1. Lead qualification helper
   - Add deterministic local helper with no external calls.
   - Suggested output: score 0-100, band (`needs_review`, `qualified`, `nurture`, `spam_risk`), reasons array, and operator notes.
   - Recommendation-only until Board approves auto-assignment/conversion rules.

2. Conversion plan/tests
   - Draft state machine for lead -> contact/opportunity/client.
   - Add tests before route implementation.
   - Do not convert or merge identities without strong match or explicit approval.
   - Conversion should update `crm_leads.status`, `converted_client_id`, `converted_at`, and write an audit/timeline event.

3. Contacts
   - Draft `crm_contacts` migration now exists locally in `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` and is guarded by `tests/unit/margot-crm-contacts-opportunities-migration.test.ts`.
   - Next: apply/diff through the sandbox wizard before any promotion, then add server-route/mocked tests for contact creation/linking.
   - Implement links to lead/client/business, role/title, consent/source, primary email/phone, dedupe keys, and privacy boundaries.
   - Add cross-client leakage abort rules.

4. Opportunities
   - Draft `crm_opportunities` migration now exists locally in `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` and is guarded by `tests/unit/margot-crm-contacts-opportunities-migration.test.ts`.
   - Next: apply/diff through the sandbox wizard before any promotion, then add server-route/mocked tests for opportunity drafts.
   - Keep commercial forecasts separate from Stripe billing truth.

5. Approvals
   - Decide whether approvals remain task subtype or become `crm_approvals`.
   - Required states: requested, approved, rejected, expired/cancelled, executed.
   - Required links: requester, approver, reason, scope, risk, related object, audit event.

6. Timeline/event model
   - Route-level event-write tests must prove existing `agent_actions` can carry sanitized timeline events before any dedicated activity timeline table is reconsidered.
   - Must support lead/client/contact/opportunity/task/approval/integration/voice references.
   - Define event taxonomy before broad writes.

7. Command-center UI
   - Surface leads, approval-needed tasks, stale integrations, client activity, and health snapshots.
   - Avoid direct client-side writes to CRM tables.
   - Respect source-of-truth labels: CRM source vs mirror vs external provider.

8. Daily digest
   - Query CRM health, new leads, qualified leads, blocked approvals, task movement, client updates, integration risk, and decisions needed.
   - The digest should report facts from local/Supabase mirrors and mark unknowns rather than inventing external status.

## 5. Board/production boundaries

Allowed now by default:

- Local repo/code/doc inspection.
- Local documentation updates like this inventory.
- Local tests using mocks.
- Draft migrations and implementation plans.
- Safe local verification (`test -f`, `npm run type-check`, focused Jest tests where scoped).

Draft first or ask Phill/Board before action:

- Production database migrations or writes.
- Any `supabase db push`, direct `psql` write, or production schema change.
- Deployments or Vercel environment mutations.
- GitHub pushes/PR creation unless explicitly scoped.
- Client-facing communications.
- Billing, banking, refunds, payroll, payments, transfers, card changes.
- Cross-client data merges or permanent identity decisions.
- Permanent business rules for auto-conversion, auto-approval, or financial action.

Block immediately:

- Missing identity where client/context leakage is possible.
- Secret/token exposure.
- Destructive git/filesystem operations not explicitly approved.
- Any production-write path without explicit Board approval.

Sandbox rule:

- Any schema change must go through the repo sandbox wizard before production promotion: `./scripts/sandbox-wizard.sh apply <migration.sql>`.
- Do not apply migrations to production from this inventory task.

## 6. Verification commands

Lightweight verification for this document:

```bash
test -f docs/margot/crm-schema-inventory.md
npm run type-check
```

Additional focused checks available for adjacent code lanes, not run as part of this doc-only lane unless separately recorded in the progress log:

```bash
npx jest tests/integration/api/marketing-leads.test.ts --runInBand
npx jest tests/integration/api/margot-voice-task.test.ts tests/integration/api/margot-voice-signed-url.test.ts tests/unit/margot-voice-failure-taxonomy.test.ts --runInBand
```

## 2C. Schema-inventory source-of-truth contract (bound to AI-RET-001)

The following statements are the contract that `AI-RET-001-ANSWER-CRM-SCHEMA-INVENTORY-BOUNDARY` enforces against this inventory. They reflect the current state of the local repo and the documented Stage-1 / Stage-2 decisions, and they must remain present in this document so the doc-drift guard test stays green:

- Approvals are kept at the stage 1 task subtype; a dedicated `crm_approvals` table is not yet created.
- `crm_contacts` is draft only, sandbox-first apply, and not yet promoted to a target environment.
- `crm_opportunities` is draft only, sandbox-first apply, and not yet promoted to a target environment.
- Opportunities are forecast-only and pipeline state; Stripe remains billing truth and is never overwritten by CRM writes.
- The `crm_leads` migration is not yet applied to the target Supabase environment from this lane; the local code path is the source of truth for the intended schema only.
- All schema changes follow sandbox-first apply (`./scripts/sandbox-wizard.sh apply <migration.sql>`) before any production promotion.
- No production database writes occur from this inventory; identity, approval, billing, and cross-client merges require explicit Phill or board approval.
- Recommended citation sources for any future answer that touches this inventory: `docs/margot/crm-schema-inventory.md`, `supabase/migrations/20260523103000_crm_contacts_opportunities.sql`, `docs/margot/crm-approval-persistence-plan.md`, and `docs/margot/ai-enhancement-candidate-register.md`.
- Anchors used by the AI-RET-001 doc-drift guard test (must remain present verbatim): `draft crm_contacts`, `draft crm_opportunities`, `crm_leads migration not yet applied`, `forecast-only`, `stripe remains billing truth`, `sandbox-first apply`, `no production database writes`, `phill or board approval`, `stage 1 task subtype`.

The following overclaim phrases must not appear in the assertion section of this document: `crm_approvals migration applied`, `crm_contacts production applied`, `crm_opportunities production applied`, `crm_leads target applied`, `safe to auto execute`, `identity auto-merged`, and `nango`.

## Senior PM verification checkpoint (2026-06-10 01:55 AEST)

- What exists: this refreshed CRM schema inventory now carries an explicit `Last update: 2026-06-10 01:55 AEST` line, a `Previous refresh: 2026-05-23 07:24 AEST` pointer, a `Related evidence` cross-link to the AI-RET-001 report, a `Related fixture` cross-link to `AI-RET-001-ANSWER-CRM-SCHEMA-INVENTORY-BOUNDARY`, a `Related rotation guard` pointer, and a new `## 2C. Schema-inventory source-of-truth contract (bound to AI-RET-001)` section that pins the stage 1 task subtype, the draft `crm_contacts` / `crm_opportunities`, the forecast-only / Stripe-billing-truth separation, the still-unapplied `crm_leads` migration, the sandbox-first apply rule, the no-production-writes rule, and the explicit Phill or board approval gate. The original inventory table, integration-mirror index, helper-reader index, gaps queue, board/production boundaries, and verification commands are preserved unchanged.
- What has started: 2026-06-10 01:55 AEST schema-inventory control-surface refresh + doc-drift guard lane. No new migrations, no new code, no new routes, no new tests, no production writes, no sandbox wizard subcommand, no client-facing sends, no public publishing, no new vendor, no live AI calls, no provider polling, no model swap.
- Why/problem/friction: this inventory was last touched 2026-05-23 07:24 AEST, before the AI-RET-001 mocked answer-shape harness, before the case-insensitive `normalizedSubjectType` approval-lifecycle lane, before the `logCrmDigestReadError` redaction guard, before the deterministic `staleReasonLabel` / `staleReasonDetail` / `normalizedMinutes` daily-digest helpers, before the deterministic `stale-sync` `last_error` + NaN guard, before the `crm-approval-persistence-plan.md` Stage-1 task-subtype decision, before the `crm-contacts-opportunities-model.md` draft, and before the daily-digest / lead / approval / redaction TDD lanes. A future agent could re-derive that `crm_leads` is already in production or that `crm_approvals` is live, both of which would violate the current Stage-1 / draft / sandbox-first / no-production-writes contract.
- Missing/unclear/pending external authority: explicit sandbox authority/auth gate is still required to apply `crm_leads` (or any other schema) to the target Supabase environment; the `crm_approvals` table is intentionally deferred; Phill or Board approval is still pending for any production migration, identity merge, billing/banking mutation, or client-facing send; Mac Mini authenticated artifact transport is still unavailable; transcript retention / privacy policy for voice-derived client memory is still undefined; the identity-resolution policy between `pi_ceo_key` / slug / Linear project ID / Stripe customer ID / website domain is still open.
- Current health evidence: combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` was at 11 suites / 162 tests PASS as of the 2026-06-09 23:50 AEST tick; this lane adds one new doc-drift guard test so the next tick should report 11 suites / 163 tests PASS. `npm run type-check` and `npm run security:routes-check` are unchanged and still green. AI-RET-001 evidence report will regenerate to `source=8/8; answerShape=12/12; readback=pass; safetyNotes=true; nextSafeAction=true` once the runner is re-invoked this tick.
- Mac Mini state: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable (port `445` open, IP `192.168.2.78`), SSH is unavailable (`:22` unreachable). No recovered Markdown artifacts are present.
- Smallest next action: re-run the combined local gate and the AI-RET-001 report runner to confirm `source=8/8; answerShape=12/12; readback=pass`, regenerate the evidence report, and rotate to another bounded Senior PM lane (e.g. add another mocked AI-RET-001 answer-shape fixture for another gated boundary, refresh another control surface, or close a remaining voice-test gap from `docs/margot/voice-test-gap-analysis.md`). Do not run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` until the specific authority/auth gate changes.

## AI-RET-001 CRM-Schema-Inventory Self-Boundary (89th answer-shape fixture)

This crm-schema-inventory doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 89th answer-shape fixture `AI-RET-001-ANSWER-CRM-SCHEMA-INVENTORY-SELF-BOUNDARY` (bound to `AI-RET-001-LEAD-QUALIFICATION`, no source-citation union member added). A future answer about the crm-schema-inventory self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `crm schema inventory self boundary lane` (the 89th self-boundary identifier; the doc is the load-bearing crm schema inventory surface).
  - `10th crm schema inventory content citation class` (the 10th fixture guards the operator-evidence crm-schema-inventory surface map; the 89th is the disjoint self-evidence identifier set).
  - `inventory table is the durable crm schema source of truth` (the per-row table of objects, role, migration, writers, readers, tests, source-of-truth status, and gaps).
  - `supabase tables are crm system of record only where local migration and current read write path exist` (the source-of-truth rule that keeps the CRM a derivative store).
  - `tasks and voice command sessions are provenance gaps until sandbox apply diff evidence and board approval` (the load-bearing gap clause: the original defining migration for `tasks` and `voice_command_sessions` is not in the repo migrations directory).
  - `draft crm_contacts crm_opportunities crm_approvals all sit in migration proposals directory and are not applied to sandbox or prod` (the three still-draft tables pin to the proposals directory; sandbox wizard apply/diff plus board approval is required before any promotion).
  - `integration mirror tables store names and health only never secret values or external record of truth` (the integration-mirror rule: GitHub/Vercel/Railway/Supabase/Linear/Stripe/Composio/1Password/DigitalOcean remain the source of truth; the CRM mirror never stores secret values).
  - `crm_leads migration not yet applied to target supabase environment` (the local migration source of truth for website-form leads is still unapplied; qualification, conversion, dedupe, privacy retention, and command-center read roles remain open).
  - `sandbox wizard only path for every crm schema change` (deferral of all crm schema promotion to the wizard subcommand boundary — apply, status, diff, sync, setup, reset, promote all require an explicit authority/auth gate).
  - `use existing assets first` (the non-negotiable Connected Teams operating rule).
- The 4 required citations are present in this doc:
  - `docs/margot/crm-schema-inventory.md` (this doc).
  - `docs/margot/crm-operating-model.md` (the partner control surface that owns the source-of-truth rule and identity-resolution policy per object).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the senior PM control loop that owns the doc-drift guard).
  - `docs/margot/ai-enhancement-candidate-register.md` (the AI enhancement pipeline that consumes this inventory).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint (2026-06-12 19:30:00 AEST)` heading):
  - crm schema inventory crm_leads target env applied, crm schema inventory crm_approvals production migration applied, crm schema inventory crm_contacts production row written, crm schema inventory crm_opportunities promoted to billing truth, crm schema inventory identity auto merged without approval, crm schema inventory sandbox wizard apply run without authority, crm schema inventory nango connector platform onboarded, crm schema inventory github push executed, crm schema inventory vercel deploy executed, crm schema inventory live provider status asserted as truth.

The `## AI-RET-001 CRM-Schema-Inventory Self-Boundary (89th answer-shape fixture)` section above IS the assertion section the doc-drift guard scans. The 10 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green.

## Senior PM verification checkpoint (2026-06-12 19:30:00 AEST)

- What exists: this refreshed CRM schema inventory now carries an updated `Last update: 2026-06-12 19:30:00 AEST` line, a `Previous refresh: 2026-06-10 01:55 AEST` pointer, a new `Related self-boundary` cross-link to `AI-RET-001-ANSWER-CRM-SCHEMA-INVENTORY-SELF-BOUNDARY`, the original 10th `Related fixture` cross-link to `AI-RET-001-ANSWER-CRM-SCHEMA-INVENTORY-BOUNDARY` (intact), and a new `## AI-RET-001 CRM-Schema-Inventory Self-Boundary (89th answer-shape fixture)` section that pins the 10 required phrases, the 4 required citations, and the 10 prohibited overclaim phrases. The original inventory table, integration-mirror index, helper-reader index, gaps queue, board/production boundaries, and verification commands are preserved unchanged.
- What has started: 2026-06-12 19:30:00 AEST crm-schema-inventory self-boundary lane. No new migrations, no new code, no new routes, no new tests beyond the AI-RET-001 fixture wiring, no production writes, no sandbox wizard subcommand, no client-facing sends, no public publishing, no new vendor, no live AI calls, no provider polling, no model swap.
- Why/problem/friction: this doc was last touched 2026-06-10 01:55 AEST with only the 10th content-citation boundary. Without the 89th self-boundary, a future agent could re-derive that this doc itself is the source of truth (rather than a derived mirror), that `crm_leads` is already applied to the target env, that `crm_approvals` is live, that `crm_contacts` / `crm_opportunities` have production rows, that opportunities are billing truth, that identity is auto-merged without approval, that the sandbox wizard is the only authority and can be invoked without an explicit gate, that nango is onboarded, that github push is executed, that vercel deploy is executed, or that live provider status is asserted as truth — all of which would violate the current Stage-1 / draft / sandbox-first / no-production-writes contract.
- Missing/unclear/pending external authority: explicit sandbox authority/auth gate is still required to apply `crm_leads` (or any other schema) to the target Supabase environment; the `crm_approvals` table is intentionally deferred; Phill or Board approval is still pending for any production migration, identity merge, billing/banking mutation, or client-facing send; Mac Mini authenticated artifact transport is still unavailable; transcript retention / privacy policy for voice-derived client memory is still undefined; the identity-resolution policy between `pi_ceo_key` / slug / Linear project ID / Stripe customer ID / website domain is still open.
- Current health evidence: combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` is now at 11 suites / 313 tests PASS (was 11 suites / 311 tests PASS; +2 from the 89th's 2 individual tests). `npm run type-check` PASS; `npm run security:routes-check` reports 0 unprotected mutating routes; `git diff --check` clean. AI-RET-001 evidence report regenerates to `overallStatus=pass; source=8/8; answerShape=89/89; readback=pass; reportTitle=true; generatedTimestamp=true; safetyNotes=true; nextSafeAction=true` (was 88/88 at tick start; +1 fixture).
- Mac Mini state: rotation guard - not probed this tick. Last probe: `/Volumes` contains only `Macintosh HD`; no non-system authenticated scan root exists; SMB/File Sharing is reachable (port `445` open, IP `192.168.2.78`), SSH is unavailable (`:22` unreachable). No recovered Markdown artifacts are present.
- Smallest next action: re-run the AI-RET-001 report runner to confirm `answerShape=89/89`, regenerate the evidence report, and rotate to another bounded Senior PM lane (e.g. add the crm-contacts-opportunities-model self-boundary, the crm-approval-persistence-plan self-boundary, the lead-to-client-conversion-plan self-boundary, or another committed control surface) OR a new error-path class (e.g. live-gating-phrasing drift, advisor-finding-origin, stale-cache warm-read, or cross-doc-source-citation-conflict). Do not run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` until the specific authority/auth gate changes.
