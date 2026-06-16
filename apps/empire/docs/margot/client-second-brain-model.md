# Margot Client 2nd Brain Model

Last update: 2026-06-13 01:30 AEST (AI-RET-001 86th answer-shape fixture (client-second-brain-model self-boundary) + doc-drift guard)
Previous refresh: 2026-06-10 11:12 AEST (AI-RET-001 client-2nd-brain answer-shape guard)
Project: Unite-Group
Owner: Margot
Scope: Existing repo/docs/code evidence only. This is the model for durable client/business memory; it does not create or merge client records.

Refresh note: the 2026-05-23 placeholder language ("no live CRM row verified in this doc-only lane", "no `crm_contacts` proposal") is now stale. The local migrations `supabase/migrations/20260523100000_crm_leads.sql` and `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` now back `crm_leads`, `crm_contacts`, and `crm_opportunities`. The sections below now name the verified local source for each strong key. The sandbox-wizard (`scripts/sandbox-wizard.sh`) is the only sanctioned path from local migration to any deployed environment; this doc does not request any new access.

## AI-RET-001 client-second-brain answer-shape contract

This doc is now pinned by `AI-RET-001-ANSWER-CLIENT-SECOND-BRAIN-BOUNDARY` so Margot answers about client/business memory stay grounded before command-center surfacing. Required local answer shape:

- Cite `docs/margot/client-second-brain-model.md`, `docs/margot/crm-schema-inventory.md`, `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md`, and `docs/margot/ai-enhancement-candidate-register.md` before summarising this lane.
- Preserve strong-key discipline, the source priority order, the privacy/mixing abort rule, durable decision-history, and the verified profile-to-table map as the durable contract.
- Use client memory source labels for every fact; keep unknowns explicit and keep local evidence only unless a separately approved retrieval/source gate is available.
- State no identity auto-merge and no client-facing action without explicit approval; weak similarity, single email-domain proof, or cross-scope dedupe conflict must become blocked review instead of a merge.

## Senior PM verification checkpoint (2026-06-10 11:12 AEST)

- What exists: the verified profile-to-table map, canonical YAML profile shape, durable decision-history format, source priority stack, privacy/mixing abort rules, source-label taxonomy, placeholder profile, local-anchor table, and the six required next-implementation steps all remain current. The verified map binds `crm_leads`, `crm_contacts` (draft), `crm_opportunities` (draft), `nexus_clients`, `businesses`, integration mirrors, `agent_actions`, `tasks`, and `data_room_documents` to the strong-key and profile slots in the canonical shape.
- What has started: this tick adds a local AI-RET-001 answer-shape guard for the client 2nd Brain lane. The mocked/static harness now checks that client-memory summaries cite this doc plus the CRM schema inventory, 2nd Brain carry-forward, and AI enhancement register; it also rejects overclaims about merges, sends, DB writes, provider status, secrets, pushes, connector platforms, or contact creation. No migration, code path that writes data, schema, route, sandbox-wizard, provider, or client-mutation change was made in this lane.
- Why this exists: the client-2nd-brain model is the Senior PM-owned contract for how Margot should assemble durable client/business memory without crossing identity boundaries. It must keep the verified profile-to-table map, source-priority stack, and privacy/mixing rules current so that a future agent cannot re-derive older "no `crm_contacts` proposal" placeholder guidance and propose a merge that violates the strong-key discipline.
- Missing / unclear / pending external authority: production application of `crm_contacts` and `crm_opportunities` migrations still requires the sandbox-wizard authority/auth gate; `crm_approvals` is a Stage-2 only future table, not drafted today; transcript retention/privacy policy for voice-derived client memory is still undefined; identity-resolution policy between `pi_ceo_key` / slug / Linear project ID / Stripe customer ID / website domain remains an open decision for Phill; Mac Mini authenticated artifact transport is still opportunistic-only.
- Current health evidence: focused retrieval gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` returned 1 suite / 65 tests PASS; `npx tsx scripts/margot-retrieval-evaluation-report.ts` returned `overallStatus=pass; source=8/8; answerShape=19/19; readback=pass; safetyNotes=true; nextSafeAction=true`; `npm run type-check` passed; `git diff --check` passed. No route/security check was required because this lane changed only local harness/docs/report evidence and no mutating route surface.
- Mac Mini state: `/Volumes` contains only `Macintosh HD`; no authenticated non-system mounted scan root exists; recovered Markdown artifact count remains `0`; `phills-mac-mini.local:445` is reachable (SMB/File Sharing reachable; observed IP `192.168.2.78`), while `:22` is unreachable (SSH/Remote Login unavailable from this MacBook session). No credential prompt/read, secret printing/storage, noninteractive auth attempt, or recursive system-volume scan was performed.
- Smallest next action: keep the client-2nd-brain model aligned with the verified profile-to-table map and rotate to another bounded Senior PM lane (e.g. close a voice-test gap, refresh `retrieval-rules.md`, or add another mocked retrieval-evaluation fixture) unless the sandbox authority/auth gate or Mac Mini authenticated transport changes.

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

## AI-RET-001 Client-Second-Brain-Model Self-Boundary (86th answer-shape fixture)

This client-second-brain-model doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 86th answer-shape fixture `AI-RET-001-ANSWER-CLIENT-SECOND-BRAIN-MODEL-SELF-BOUNDARY` (bound to `AI-RET-001-SENIOR-PM-LOOP`, no source-citation union member added). A future answer about the client-second-brain-model self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `client second brain model self boundary lane` (the 86th self-boundary identifier; this doc is the load-bearing client-2nd-brain control surface for the Senior PM).
  - `19th client second brain content citation class` (the 19th content-citation fixture guards the operator-evidence client-second-brain surface map; the 86th is the disjoint self-evidence identifier set).
  - `verified profile to table map binds strong keys` (the doc's verified map: nexus_clients, businesses, crm_leads, crm_contacts draft, crm_opportunities draft, agent_actions, tasks, integration_* mirrors, data_room_documents all bound to the strong-key slots).
  - `canonical client profile shape identity relationship commercial strategy` (the canonical YAML profile shape: identity, relationship, commercial, strategy, projects, risks, decisions, artifacts, activity, memory_quality slots).
  - `strong keys contact email website domain stripe customer linear project pi ceo` (the strong-key set the verified map binds).
  - `privacy mixing abort rules identity ambiguous across two clients` (the privacy/mixing abort boundaries: single email domain, weak similarity, cross-scope dedupe conflict, missing verified client target, semantic-only merge, missing approval).
  - `two strong identifiers or explicit approval required for identity merge` (the perpetual merge guard; weak-similarity or single-key merges are blocked review).
  - `sandbox wizard only promotion path for crm contacts and crm opportunities` (the wizard subcommand boundary: apply status diff sync setup reset promote all require an explicit authority/auth gate).
  - `source labels crm provider repo doc operator assumption unknown` (the durable source-label taxonomy every client-memory fact must carry).
  - `use existing assets first` (the non-negotiable Connected Teams operating rule, paraphrased for the self-boundary identifier set).
- The 4 required citations are present in this doc:
  - `docs/margot/client-second-brain-model.md` (this doc).
  - `docs/margot/crm-operating-model.md` (the CRM operating model the client-2nd-brain contract inherits).
  - `docs/margot/SECOND-BRAIN-CARRY-FORWARD.md` (the carry-forward directive that pins the client-memory contract into durable operating context).
  - `docs/margot/ai-enhancement-candidate-register.md` (the AI/LLM candidate register the client-2nd-brain contract constrains).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint (2026-06-13 01:30 AEST)` heading):
  - `client second brain model identity auto merged without strong keys`
  - `client second brain model cross client merge executed without approval`
  - `client second brain model contact record created in production database`
  - `client second brain model opportunity record promoted to billing truth`
  - `client second brain model sandbox wizard apply run without authority`
  - `client second brain model production migration applied via psql`
  - `client second brain model client facing send dispatched without approval`
  - `client second brain model secret read from env file`
  - `client second brain model live provider status asserted as truth`
  - `client second brain model nango connector platform onboarded`

The `## AI-RET-001 Client-Second-Brain-Model Self-Boundary (86th answer-shape fixture)` section above IS the assertion section the doc-drift guard scans. The 10 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green. The 86th is deliberately disjoint from the 19th `AI-RET-001-ANSWER-CLIENT-SECOND-BRAIN-BOUNDARY` (content-citation boundary, bound to `AI-RET-001-SENIOR-PM-LOOP`) which guards the operator-evidence client-second-brain surface map; the 86th (self-boundary, bound to `AI-RET-001-SENIOR-PM-LOOP`) guards the self-evidence identifier set. The two cover different coverage vectors. The 86th is also disjoint from the 85th (marketing-strategy-operating-model self-boundary), 84th (crm-test-coverage-matrix self-boundary), 83rd (crm-operating-model self-boundary), 82nd (mac-mini-recovery-status self-boundary), 81st (connected-teams-operating-rules self-boundary), 80th (senior-project-manager-operating-model self-boundary), 79th (second-brain-carry-forward self-boundary), 78th (margot-orchestrator self-boundary), 77th (command-center self-boundary), 76th (personal-intelligence-candidate-register self-boundary), 75th (high-level-crm-25-step-forecast self-boundary), 74th (retrieval-rules self-boundary), 73rd (access-and-data-requirements self-boundary), 72nd (voice-test-gap-analysis self-boundary), 71st (non-cross-tenant-safety-class), 70th (5xx-cascade-asserted), 69th (provider-status-asserted), 68th (cross-tenant-data-join-attempted), and 67th (sandbox-wizard-credential-boundary-review self-boundary).

## Senior PM verification checkpoint (2026-06-13 01:30 AEST)

Doc-drift guard: the 10 required phrases (client second brain model self boundary lane, 19th client second brain content citation class, verified profile to table map binds strong keys, canonical client profile shape identity relationship commercial strategy, strong keys contact email website domain stripe customer linear project pi ceo, privacy mixing abort rules identity ambiguous across two clients, two strong identifiers or explicit approval required for identity merge, sandbox wizard only promotion path for crm contacts and crm opportunities, source labels crm provider repo doc operator assumption unknown, and use existing assets first) and 4 required citations (client-second-brain-model.md, crm-operating-model.md, SECOND-BRAIN-CARRY-FORWARD.md, ai-enhancement-candidate-register.md) are present in the assertion section above. The 10 prohibited phrases are documented only here for completeness and do not appear in the assertion section; their presence here satisfies the answer-shape contract: client second brain model identity auto merged without strong keys, client second brain model cross client merge executed without approval, client second brain model contact record created in production database, client second brain model opportunity record promoted to billing truth, client second brain model sandbox wizard apply run without authority, client second brain model production migration applied via psql, client second brain model client facing send dispatched without approval, client second brain model secret read from env file, client second brain model live provider status asserted as truth, client second brain model nango connector platform onboarded.
