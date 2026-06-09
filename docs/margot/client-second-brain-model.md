# Margot Client 2nd Brain Model

Date: 2026-06-09 13:42 AEST (refresh: post-2026-06-09 schema reconciliation)
Project: Unite-Group
Owner: Margot
Scope: Existing repo/docs/code evidence only. This is the model for durable client/business memory; it does not create or merge client records.

Refresh note: the 2026-05-23 placeholder language ("no live CRM row verified in this doc-only lane", "no `crm_contacts` proposal") is now stale. The local migrations `supabase/migrations/20260523100000_crm_leads.sql` and `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` now back `crm_leads`, `crm_contacts`, and `crm_opportunities`. The sections below now name the verified local source for each strong key. The sandbox-wizard (`scripts/sandbox-wizard.sh`) is the only sanctioned path from local migration to any deployed environment; this doc does not request any new access.

## Purpose

Margot's Client 2nd Brain is the durable memory layer for clients, portfolio businesses, prospects, active projects, decisions, risks, artifacts, and relationship context. It prevents the CRM from becoming only a table of contacts by making every important client signal retrievable, source-linked, and safe to act on.

Primary source docs:

- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
- `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`
- `docs/margot/crm-operating-model.md`
- `docs/margot/crm-schema-inventory.md`
- `docs/margot/retrieval-rules.md`

## Source priority

When assembling client memory, use this order:

1. Exact repo docs and local migrations/routes/tests.
2. Verified Supabase CRM tables and server-side readers where available.
3. Integration mirror rows with provider/source labels.
4. Linear/GitHub/Vercel/Stripe provider status when explicitly retrieved and recorded.
5. Semantic retrieval only when confidence is high enough under `docs/margot/retrieval-rules.md`.
6. Human memory or inference only as a marked assumption.

Conflict rule: exact verified source wins over summaries. If two verified sources disagree, record a `data_quality_issue` or blocked task; do not merge or overwrite.

## Canonical client/business profile shape

Each client or portfolio business should eventually have this profile:

```yaml
identity:
  display_name:
  client_slug:
  business_slug:
  status: unknown|lead|prospect|onboarding|active|paused|churned|portfolio_business
  source_of_truth: nexus_clients|businesses|crm_leads|repo_doc|unknown
  strong_keys:
    contact_email:
    website_domain:
    stripe_customer_id:
    stripe_subscription_id:
    linear_project_id:
    pi_ceo_key:
    github_repo:
    vercel_project_id:
relationship:
  primary_contacts:
  roles:
  relationship_owner:
  decision_makers:
  communication_preferences:
commercial:
  plan_or_engagement:
  arr_or_mrr:
  invoices_or_subscription_status:
  opportunity_stage:
  renewal_or_next_commercial_gate:
strategy:
  client_goal:
  audience_or_icp:
  offer_ladder:
  brand_voice:
  positioning:
  marketing_strategy_link:
projects:
  active_projects:
  linear_project_ids:
  next_actions:
  blockers:
  latest_verification:
risks:
  privacy_or_regulatory:
  delivery:
  revenue:
  relationship:
  technical:
decisions:
  decision_history:
  approval_gates:
  rejected_options:
artifacts:
  docs:
  portals:
  approvals:
  proof_videos:
  reports:
activity:
  latest_crm_events:
  latest_tasks:
  latest_integration_signals:
memory_quality:
  confidence: high|medium|low
  unknowns:
  last_reviewed_at:
```

## Durable decision-history format

Every important client decision should be captured as:

```text
Date/time:
Client/business:
Decision:
Decision owner:
Source/evidence:
Reason:
Options rejected:
Approval required? yes/no
Follow-up task:
Risk if stale:
```

Examples of decisions that must be durable:

- client becomes active/onboarding/paused/churned;
- lead converts to client or opportunity;
- scope/milestone/price changes;
- client-facing communication is sent;
- production deployment or migration is approved;
- privacy/security/compliance position changes;
- campaign/offer/ICP strategy changes;
- cross-client identity conflict is resolved.

## Privacy and client-mixing boundaries

Abort and block instead of writing when:

- identity is ambiguous across two clients/businesses;
- an email domain alone is the only matching signal for a multi-brand or agency context;
- a note includes sensitive client data but no verified client target;
- a requested action would expose one client's data to another client;
- a proposed merge relies on semantic similarity rather than strong keys;
- a production/client-facing action lacks explicit approval.

Never store secret values in client memory. 1Password evidence may list vault/item names only, following the integration schema rule.

## Retrieval/source labels

Client memory should label each fact:

- `crm_source`: verified Supabase CRM row or local migration-backed field.
- `provider_source`: Linear/GitHub/Vercel/Stripe/Supabase provider or mirror data.
- `repo_doc_source`: file path in repo.
- `operator_source`: Phill/Margot instruction or voice transcript.
- `assumption`: not verified; must be resolved before irreversible action.
- `unknown`: not available from current repo/docs.

## Example placeholder profile

This uses placeholders only because this lane did not query live CRM data or verify a full client row.

```yaml
identity:
  display_name: "<verified client/business name>"
  client_slug: "<nexus_clients.slug or unknown>"
  business_slug: "<businesses.slug or unknown>"
  status: "unknown"
  source_of_truth: "unknown until linked to nexus_clients/businesses/crm_leads"
  strong_keys:
    contact_email: "<verified or unknown>"
    website_domain: "<verified or unknown>"
    stripe_customer_id: "<verified or unknown>"
    linear_project_id: "<verified or unknown>"
    pi_ceo_key: "<verified or unknown>"
strategy:
  client_goal: "<from SOW/brief/CRM note>"
projects:
  active_projects:
    - name: "<project>"
      next_action: "<specific safe action>"
      evidence: "<file/path/provider>"
risks:
  unknowns:
    - "No live CRM row verified in this doc-only lane."
memory_quality:
  confidence: "low until exact CRM/source links are attached"
```

## Current local anchors

| Anchor | What it contributes | Known gap |
| --- | --- | --- |
| `nexus_clients` / `supabase/migrations/20260510000002_nexus_clients.sql` | Client identity, status, contact email, website, brand config, Stripe customer/subscription, plan. Read via `src/lib/empire/list-nexus-clients.ts`; written via `src/app/api/empire/clients/route.ts` (POST) and `src/app/api/empire/clients/[slug]/route.ts` (PATCH). | No normalized contact table; live rows not read in this doc-only lane. |
| `businesses` / `supabase/migrations/20260510000001_nexus_businesses.sql` | Portfolio / operating-unit identity; adds `pi_ceo_key`, `linear_project_id`, `website_url`, `arr_aud`. | Need explicit business create/update route + tests if Margot is to manage businesses; identity-resolution rule for `pi_ceo_key` / slug / Linear project ID / website domain. |
| `crm_leads` / `supabase/migrations/20260523100000_crm_leads.sql` | Public marketing lead persistence: `first_name`, `last_name`, `email`, `phone`, `company`, `job_title`, `message`, `interests`, `referral_source`, `marketing_consent`, `email_list_id`, `source`, `status`, `qualification_score`, `assigned_owner`, `matched_client_id` → `nexus_clients`, `matched_business_id` → `businesses`, `converted_client_id` → `nexus_clients`, plus `additional_data` jsonb and `captured_at`/`converted_at` timestamps. Status check (`new`/`qualified`/`nurture`/`converted`/`disqualified`/`spam`) and qualification-score check (`0..100`). Service-role-only RLS. | Lead list/query route and qualification helper exist locally; lead-to-client conversion draft is bounded by the operator-approval `403 operator_approval_required` guard. Need a confirmed `nexus_clients.slug` ↔ `crm_leads.matched_client_id` ↔ `converted_client_id` cross-reference contract before any client-facing send. |
| `crm_contacts` (draft) / `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` | Canonical people/contact map: `display_name`, first/last, `primary_email`, `primary_phone`, `role_title`, `company_name`, `linked_lead_id` → `crm_leads`, `linked_client_id` → `nexus_clients`, `linked_business_id` → `businesses`, `source`, `marketing_consent`/`consent_source`/`consent_captured_at`, `relationship_owner`, `status` (`active` / `lead_only` / `client_contact` / `nurture` / `do_not_contact` / `archived` / `blocked_review`), dedupe keys (`dedupe_email_key`, `dedupe_domain_key`, `dedupe_phone_key`, `dedupe_name_company_key`), `privacy_scope` (`lead_scoped` / `client_scoped` / `business_scoped` / `restricted` / `global_crm`), `retention_policy`, `privacy_notes`, `last_verified_at`, `additional_data`. Minimum-identity check on `display_name` / first / last / `primary_email`. Service-role-only RLS. | Draft local migration only; sandbox-wizard apply/diff has not been authorised for `crm_contacts`. No contact create/link route, no dedupe policy implementation, no client-mixing abort tests, no command-center/digest readers. |
| `crm_opportunities` (draft) / same migration | Forecast-only commercial opportunity records: `name`, `stage` (12 stages from `new_signal` through `won_converted` / `lost` / `paused` / `blocked_review`), `status` (`open` / `won` / `lost` / `paused` / `blocked_review` / `cancelled`), `value_amount` / `value_currency` / `probability` / `expected_close_at`, `source` / `owner`, `linked_lead_id` / `linked_contact_id` / `linked_client_id` / `linked_business_id`, `next_action` / `next_action_due_at`, `decision_needed`, `risk`, `campaign_source` / `campaign_medium` / `campaign_name`, `lost_reason`, `won_at` / `lost_at`, `approval_required` / `approval_status` (`not_required` / `requested` / `approved` / `rejected` / `expired`). Service-role-only RLS. | Draft local migration only; sandbox-wizard apply/diff has not been authorised. Stripe remains billing truth; this table is forecast/pipeline truth only after sandbox application and explicit approval route before any client mutation or external comms. |
| `agent_actions` / `src/lib/empire/read-client-activity.ts` | Client create/update audit events; legacy `client_id` FK to `public.clients` (not `nexus_clients`). | FK mismatch noted in schema inventory; needs a CRM timeline table or migration bridge before `client_id` becomes a reliable client cross-reference. |
| `integration_*` mirrors | Project, deployment, billing, repo, credential-index evidence from `supabase/migrations/20260513000200_integration_schema.sql`. | Mirror freshness and client/project mapping need rules; secret index must remain names only. |
| Repo docs / SOWs | Strategy, scope, blockers, governance, client packets. | Must be reconciled against CRM rows before client-facing action. |

## Verified profile-to-table mapping (post-2026-06-09)

The canonical profile shape in the previous section maps to the following verified local sources. Margot must treat these as the durable map; new tables must follow the same strong-key discipline.

```text
identity.display_name / identity.client_slug / identity.business_slug
  -> nexus_clients.display_name, slug, contact_name
  -> businesses.name, slug
identity.status (lead|prospect|onboarding|active|paused|churned|portfolio_business)
  -> crm_leads.status (new|qualified|nurture|converted|disqualified|spam)
  -> nexus_clients.status (onboarding|active|paused|churned|...)
identity.source_of_truth
  -> nexus_clients|public.businesses|crm_leads|crm_contacts|crm_opportunities|repo_doc|unknown
strong_keys.contact_email / strong_keys.website_domain
  -> nexus_clients.contact_email, website
  -> crm_leads.email (+ lower(email) index), company
  -> crm_contacts.primary_email (+ lower(primary_email) index), dedupe_email_key, dedupe_domain_key
strong_keys.stripe_customer_id / strong_keys.stripe_subscription_id
  -> nexus_clients.stripe_customer_id, stripe_subscription_id
  -> integration_stripe_subscriptions mirror
strong_keys.linear_project_id
  -> nexus_clients.linear_project_id
  -> businesses.linear_project_id
  -> integration_linear_projects mirror
strong_keys.pi_ceo_key
  -> nexus_clients.pi_ceo_key
  -> businesses.pi_ceo_key
strong_keys.github_repo
  -> integration_github_repos mirror (CRM does not store secrets/values)
strong_keys.vercel_project_id
  -> integration_vercel_projects mirror
relationship.primary_contacts / relationship.decision_makers
  -> crm_contacts (draft) with linked_client_id / linked_business_id
commercial.opportunity_stage
  -> crm_opportunities.stage / status (draft; sandbox-only today)
commercial.invoices_or_subscription_status
  -> integration_stripe_subscriptions (mirror; Stripe is source of truth)
projects.active_projects / projects.linear_project_ids
  -> nexus_clients.linear_project_id
  -> businesses.linear_project_id
  -> integration_linear_issues / projects mirror
risks / decisions
  -> tasks (approval-required) with assignee 'Phill approval'
  -> future crm_approvals (Stage 2 only; not drafted today)
artifacts
  -> data_room_documents (read-only via src/lib/empire/read-data-room-health.ts)
activity.latest_crm_events / activity.latest_tasks / activity.latest_integration_signals
  -> agent_actions (legacy client_id FK)
  -> tasks
  -> integration_sync_state
memory_quality.confidence
  -> high|medium|low based on number of verified strong keys above
```

## Required next implementation steps

1. Use the verified profile-to-table map above as the working source of truth for any new client/profile material; the previous "no `crm_contacts` proposal" gap is closed by `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` (sandbox-only today).
2. Sandbox-wizard apply/diff remains the only sanctioned promotion path for `crm_contacts` and `crm_opportunities`; do not run `apply` / `diff` / `status` / `sync` / `setup` / `reset` / `promote` against the production target until the specific authority/auth gate is granted.
3. Build the contact create/link route and dedupe policy implementation on top of the draft `crm_contacts` table; gate writes behind operator approval like the lead-conversion lane.
4. Add data-quality issue tracking for conflicting or missing keys (status set drift between `crm_leads` and `nexus_clients`; mismatched `slug` ↔ `matched_client_id` ↔ `converted_client_id`; cross-scope `dedupe_*_key` collisions).
5. Surface client memory deltas in the morning digest by joining `crm_leads` / `crm_opportunities` (post-sandbox) / `tasks` / `agent_actions` per client slug or `nexus_clients.id`.
6. Do not auto-merge client identities without two strong identifiers or explicit approval; the privacy/mixing boundaries in the previous section remain in force.
