# Margot Client 2nd Brain Model

Date: 2026-05-23 07:33 AEST
Project: Unite-Group
Owner: Margot
Scope: Existing repo/docs/code evidence only. This is the model for durable client/business memory; it does not create or merge client records.

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
| `nexus_clients` / `src/lib/empire/list-nexus-clients.ts` | Client identity, status, contact email, website, brand config. | No normalized contact table; live rows not read in this lane. |
| `crm_leads` / marketing lead route | Prospect identity and message/source fields. | No list/query, qualification, or conversion route yet. |
| `agent_actions` / client activity helper | Client create/update audit events. | `client_id` FK mismatch with `nexus_clients` noted in schema inventory. |
| `integration_*` mirrors | Project, deployment, billing, repo, credential-index evidence. | Mirror freshness and client/project mapping need rules. |
| Repo docs/SOWs | Strategy, scope, blockers, governance, client packets. | Must be reconciled against CRM rows before client-facing action. |

## Required next implementation steps

1. Add a client memory template folder or CRM reader once source-of-truth route is selected.
2. Define `crm_contacts` proposal before normalizing people across clients/leads.
3. Add data-quality issue tracking for conflicting or missing keys.
4. Include client memory deltas in the morning digest.
5. Do not auto-merge client identities without two strong identifiers or explicit approval.
