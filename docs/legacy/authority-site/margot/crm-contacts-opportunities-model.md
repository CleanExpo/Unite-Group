# Margot CRM Contacts and Opportunities Model

Date: 2026-05-23
Last update: 2026-06-09 23:50 AEST — Senior PM control-surface refresh: pinned the proposal to the new AI-RET-001-CONTACTS-OPPORTUNITIES-MODEL source-citation fixture and the AI-RET-001-ANSWER-CONTACTS-OPPORTUNITIES-SAFETY-BOUNDARY answer-shape fixture, the modern hard safety rules, the lead-to-client conversion plan, the CRM operating model, the candidate register, and the Senior PM verification rotation guard.
Previous refresh: 2026-05-23 (initial version)
Owner: Margot
Project: Unite-Group
Related evidence: `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (overallStatus=pass, source=7/7, answerShape=7/7; this lane adds the 8th source-citation fixture and the 9th answer-shape fixture)
Related fixture: `AI-RET-001-ANSWER-CONTACTS-OPPORTUNITIES-SAFETY-BOUNDARY`
Related rotation guard: see `## Senior PM verification checkpoint (2026-06-09 23:50 AEST)` at the end of this file
Status: Local proposal plus sandbox-only migration draft. `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` now drafts the schema, guarded by `tests/unit/margot-crm-contacts-opportunities-migration.test.ts`. No migration has been applied. No production database write, production schema change, deployment, GitHub push, or client-facing action is authorized by this proposal.

## AI-RET-001 Contacts/Opportunities Safety Citation Contract

This proposal is bound to the new `AI-RET-001-CONTACTS-OPPORTUNITIES-MODEL` source-citation fixture and the new `AI-RET-001-ANSWER-CONTACTS-OPPORTUNITIES-SAFETY-BOUNDARY` answer-shape fixture. Any future answer about `crm_contacts` or `crm_opportunities` must:

1. State that the migration is a **sandbox-only draft** with **no production apply** until the sandbox-wizard authority/auth gate is granted and a specific promotion decision is approved.
2. State that opportunity value, probability, and expected close are **forecast-only** and that **stripe remains billing truth**; the CRM mirror must not write billing fields from contacts/opportunities.
3. Require **strong identity gates** and explicit **operator approval** before any contact or opportunity creation, link, update, dedupe merge, or cross-client action that could affect a client, lead, or business.
4. Apply **cross-client leakage abort** rules: abort immediately on ambiguous identity, weak dedupe proof, or any conflict between lead/contact/client/business scope; mark drafts `blocked_review` and require explicit approval before any resume.
5. Cite `docs/margot/crm-contacts-opportunities-model.md` (this doc), `docs/margot/crm-operating-model.md`, `docs/margot/lead-to-client-conversion-plan.md`, and `docs/margot/ai-enhancement-candidate-register.md` before any contact/opportunity summary is surfaced.
6. Never claim a `contact auto-created`, `opportunity auto-created`, `cross-client merge applied`, `production migration applied`, or `billing field written`; all of these are prohibited overclaims and would indicate the harness should reject the answer.

This contract mirrors the existing `AI-RET-001-ANSWER-LEAD-TO-CLIENT-CONVERSION-BOUNDARY` and `AI-RET-001-ANSWER-GATED-ACTION-BOUNDARY` contracts: every doc-drift guard runs locally in `tests/unit/lib/margot/retrieval-evaluation.test.ts` and requires exact-file read fallback before the answer is surfaced.

## Out of Scope for This Revision

The following actions remain explicitly out of scope for this revision and require a specific Phill/Board approval gate before any execution:

- No live semantic search, no embeddings backfill, no live vector DB reads against production.
- No Nango or third-party connector-platform onboarding.
- No new vendor accounts or external connector setups.
- No live provider polling, no production database write, no production migration apply, no Vercel deploy/env mutation.
- No GitHub push, merge, or PR mutation.
- No client-facing send, no public publishing, no paid spend, no billing/payment action.
- No Mac Mini credential prompt/read, no secret printing/storage, no recursive system-volume scan.
- No `crm_contacts` or `crm_opportunities` production apply; the migration remains a sandbox-only draft.
- No contact or opportunity auto-creation from a lead or voice command without operator approval.
- No cross-client merge or permanent identity decision.

## 1. Purpose

This document proposes the next safe CRM lane after lead persistence, lead qualification, and guarded lead-to-client conversion planning: canonical contacts and opportunities.

The proposal is grounded only in existing repository evidence:

- `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md` says Connected Teams must use existing assets first and avoid asking Phill for new access unless a specific inspected task is genuinely blocked.
- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` makes Margot the Senior PM across CRM, project portfolio, client 2nd Brain, marketing, integrations, AI/LLM, and the $2B Unite-Group strategy lens.
- `docs/margot/high-level-crm-25-step-forecast.md` forecasts contact and opportunity modeling after lead persistence and conversion planning.
- `docs/margot/crm-operating-model.md` identifies `crm_contacts` and `crm_opportunities` as proposed target sources of truth and names drafting those proposals as next lanes.
- `docs/margot/crm-schema-inventory.md` says current contact data is embedded in `nexus_clients.contact_name/contact_email` and `crm_leads` fields, opportunities are not modeled, contacts need dedupe/privacy/cross-client safeguards, and opportunities must stay separate from Stripe billing truth.
- `docs/margot/lead-to-client-conversion-plan.md` says qualification is recommendation-only, conversion must pass exact identity gates and operator approval, original lead attribution must be preserved, and production conversion has not been promoted or verified.
- `supabase/migrations/20260510000002_nexus_clients.sql` creates `nexus_clients` with client identity, embedded contact fields, Stripe IDs, plan/status, Linear project ID, Pi-CEO key, brand config, and timestamps.
- `supabase/migrations/20260523100000_crm_leads.sql` creates `crm_leads` with lead person/company/contact fields, marketing consent, source, status, qualification score, owner, matched client/business links, converted client link, privacy-sensitive request metadata, and timestamps.

This is a planning document for future mocked tests and sandbox-first migration drafting. It is not an implementation.

## 2. Why contacts and opportunities come before broader automation or client conversion

Contacts and opportunities should come before broader automation because the current CRM can capture leads and manage clients, but it does not yet have a canonical people layer or a commercial pipeline layer.

Current evidence:

- `nexus_clients` has `contact_name` and `contact_email`, but those fields represent only one embedded contact on a client row.
- `crm_leads` has lead person fields such as `first_name`, `last_name`, `email`, `phone`, `company`, and `job_title`, but those fields are lead-capture data, not durable relationship memory.
- `crm-schema-inventory.md` explicitly marks `crm_contacts` as proposed and says current contact data lives in `nexus_clients.contact_name/contact_email` and `crm_leads` fields.
- `crm-schema-inventory.md` explicitly marks opportunities as not modeled and says they need lead/client/contact links, stage, value, probability, expected close, source, owner, next action, and status.
- `crm-operating-model.md` describes lead qualification as recommendation-only and says a qualified lead can become a contact and opportunity before any approved/won client creation.

Reasoning:

1. Contact normalization prevents overloading client and lead email fields.
2. Contact records allow relationship history, role/title, consent/source, owner, privacy metadata, and retention rules to be tracked independently of a lead or client.
3. Opportunities give Margot a place to track qualified commercial work, stage, expected value, probability, next action, risks, and decisions before creating or updating a client.
4. Lead-to-client conversion is safer when the CRM can first create or link a contact and opportunity, then request approval for any client mutation.
5. Broader automation should not run until identity, dedupe, cross-client leakage, source-of-truth, and approval rules exist around people and pipeline records.

Safe default:

```text
Lead captured
  -> lead persisted in crm_leads
  -> qualification recommendation generated
  -> identity checked against existing contacts/clients/businesses
  -> contact draft/link created only when safe
  -> opportunity draft/link created only when commercial intent exists
  -> client conversion remains guarded and approval-based
  -> broader automation waits for approved rules and tested identity boundaries
```

## 3. Proposed `crm_contacts` model

Target role: canonical person/contact map for leads, clients, businesses, stakeholders, and future relationship memory.

Target source-of-truth status: proposed Supabase CRM table with local draft migration `supabase/migrations/20260523103000_crm_contacts_opportunities.sql`. It remains unapplied and sandbox-first.

| Field | Type / shape | Required? | Grounded reason / rule |
| --- | --- | --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` | Yes | Standard durable CRM identifier, consistent with `nexus_clients.id` and `crm_leads.id`. |
| `display_name` | `text` | Yes | Human-readable name for command center, digest, and relationship memory. Can be derived from first/last name when present. |
| `first_name` | `text` | No | Mirrors `crm_leads.first_name`; useful for lead-derived contacts and personalized follow-up. |
| `last_name` | `text` | No | Mirrors `crm_leads.last_name`; optional because current embedded client contact can be a single name. |
| `primary_email` | `text` | No, but strongly preferred | Current contact identity exists as `nexus_clients.contact_email` and `crm_leads.email`; email is a strong dedupe key but not always sufficient for cross-client merge. |
| `primary_phone` | `text` | No | Mirrors `crm_leads.phone`; useful for relationship memory and follow-up. |
| `role_title` | `text` | No | Required by inventory as role/title; maps from `crm_leads.job_title` where available. |
| `company_name` | `text` | No | Preserves source company text from leads or current client context without requiring immediate client/business match. |
| `linked_lead_id` | `uuid references public.crm_leads(id) on delete set null` | No | Connects a contact back to the lead that created or updated the person record. |
| `linked_client_id` | `uuid references public.nexus_clients(id) on delete set null` | No | Links a contact to a client where identity is confirmed. Must not be guessed. |
| `linked_business_id` | `uuid references public.businesses(id) on delete set null` | No | Links a contact to a portfolio business where identity is confirmed. |
| `source` | `text` | Yes, default candidate `manual_or_unknown` | Required by inventory; examples: `website_form`, `lead_conversion`, `client_record`, `voice_command`, `manual`, `import`. |
| `source_detail` | `text` | No | Human-readable attribution detail such as referral source, campaign, or operator note. |
| `marketing_consent` | `boolean default false` | Yes | Mirrors `crm_leads.marketing_consent`; default false unless explicit consent exists. |
| `consent_source` | `text` | No | Records where consent came from, e.g. lead form, explicit operator entry, import evidence. |
| `consent_captured_at` | `timestamptz` | No | Supports consent audit and future retention/privacy policy. |
| `relationship_owner` | `text` | Yes, default candidate `Margot` | Required by inventory; aligns with `crm_leads.assigned_owner`. |
| `status` | `text` | Yes | Candidate values: `active`, `lead_only`, `client_contact`, `nurture`, `do_not_contact`, `archived`, `blocked_review`. |
| `dedupe_email_key` | `text` | No | Lower-cased/normalized email key for matching. Should be indexed but not treated as sole proof for cross-client merge. |
| `dedupe_domain_key` | `text` | No | Domain hint from email/website; hint only, not proof for multi-brand clients or agencies. |
| `dedupe_phone_key` | `text` | No | Normalized phone hint where available. |
| `dedupe_name_company_key` | `text` | No | Lower-cased normalized name + company hint for review queues, not automatic merge authority. |
| `privacy_scope` | `text` | Yes | Candidate values: `lead_scoped`, `client_scoped`, `business_scoped`, `restricted`, and tightly-approved `global_crm`. Default to the narrowest scope available; `global_crm` must not be the default for personal data and requires explicit non-sensitive use case approval. |
| `retention_policy` | `text` | No | Records retention basis once policy is approved; especially important for lead-derived personal data. |
| `privacy_notes` | `text` | No | Operator notes for privacy boundaries or restrictions. Must not contain secrets. |
| `last_verified_at` | `timestamptz` | No | Indicates when identity/contact details were last confirmed. |
| `additional_data` | `jsonb default '{}'::jsonb` | Yes | Flexible metadata for future safe local extension. Implementation must use an allowlist/denylist: never store secrets, tokens, payment details, unapproved sensitive PII, or cross-client notes here. |
| `created_at` | `timestamptz default now()` | Yes | Standard timestamp. |
| `updated_at` | `timestamptz default now()` | Yes | Standard timestamp; `nexus_clients` currently lacks `updated_at`, so contact table should include it from the start. |

Candidate contact status checks:

```text
active
lead_only
client_contact
nurture
do_not_contact
archived
blocked_review
```

## 4. Proposed `crm_opportunities` model

Target role: qualified commercial possibility with stage, value, probability, source, owner, next action, and linked lead/contact/client/business context.

Target source-of-truth status: proposed Supabase CRM table with local draft migration `supabase/migrations/20260523103000_crm_contacts_opportunities.sql`. It remains unapplied and sandbox-first.

| Field | Type / shape | Required? | Grounded reason / rule |
| --- | --- | --- | --- |
| `id` | `uuid primary key default gen_random_uuid()` | Yes | Standard durable CRM identifier. |
| `name` | `text` | Yes | Human-readable opportunity title for command center and daily digest. |
| `stage` | `text` | Yes | Required by inventory. Candidate values below. Stage tracks sales/commercial progress, not billing status. |
| `status` | `text` | Yes | Candidate values: `open`, `won`, `lost`, `paused`, `blocked_review`, `cancelled`. |
| `value_amount` | `numeric` | No | Forecast value only. Must not be treated as invoiced/paid revenue. |
| `value_currency` | `text` | Yes when value exists | Candidate default `AUD`, consistent with current Australian operating context in existing docs and Stripe mirror fields using AUD. |
| `probability` | `integer` | No | Required by inventory; proposed check 0-100. Forecast probability only, not billing truth. |
| `expected_close_at` | `timestamptz` | No | Required by inventory; supports forecast and next action planning. |
| `source` | `text` | Yes | Required by inventory; examples: `website_form`, `lead_qualification`, `client_expansion`, `voice_command`, `manual`, `campaign`. |
| `owner` | `text` | Yes, default candidate `Margot` | Required by inventory; aligns with lead ownership and PM operating model. |
| `linked_lead_id` | `uuid references public.crm_leads(id) on delete set null` | No | Connects commercial possibility to originating lead. |
| `linked_contact_id` | `uuid references public.crm_contacts(id) on delete set null` | No | Connects opportunity to canonical person once contact model exists. |
| `linked_client_id` | `uuid references public.nexus_clients(id) on delete set null` | No | Used for expansion/renewal/account opportunities when client identity is confirmed. |
| `linked_business_id` | `uuid references public.businesses(id) on delete set null` | No | Used when opportunity belongs to a portfolio business context. |
| `next_action` | `text` | No | Required by inventory; the next concrete follow-up or operator action. |
| `next_action_due_at` | `timestamptz` | No | Helps daily digest and command center prioritize action. |
| `decision_needed` | `text` | No | Captures Phill/Board decision required before progress. |
| `risk` | `text` | No | Captures risk signal such as unclear identity, budget uncertainty, privacy boundary, or delivery dependency. |
| `campaign_source` | `text` | No | Campaign/source attribution required by document scope and compatible with `crm_leads.referral_source` / `source`. |
| `campaign_medium` | `text` | No | Attribution detail for marketing strategy loop. |
| `campaign_name` | `text` | No | Attribution detail for marketing strategy loop. |
| `source_detail` | `text` | No | Free-text source detail from lead referral, message, or operator note. |
| `lost_reason` | `text` | No | Required only if closed lost/cancelled; supports learning loop. |
| `won_at` | `timestamptz` | No | Forecast/commercial close timestamp. Does not imply Stripe subscription/invoice exists. |
| `lost_at` | `timestamptz` | No | Closure timestamp for lost opportunities. |
| `approval_required` | `boolean default false` | Yes | Marks opportunities needing Board/Phill approval before conversion, client update, external communication, or production action. |
| `approval_status` | `text` | No | Candidate values: `not_required`, `requested`, `approved`, `rejected`, `expired`. Dedicated approvals are still a future model. |
| `additional_data` | `jsonb default '{}'::jsonb` | Yes | Flexible metadata with no secrets, no billing authority, no payment details, no unapproved sensitive PII, and no cross-client notes. Future implementation should prefer explicit columns and treat JSONB keys as allowlisted. |
| `created_at` | `timestamptz default now()` | Yes | Standard timestamp. |
| `updated_at` | `timestamptz default now()` | Yes | Standard timestamp. |

Candidate opportunity stages:

```text
new_signal
qualified
discovery
proposal_needed
proposal_sent
negotiation
decision_needed
won_pending_client_conversion
won_converted
lost
paused
blocked_review
```

Candidate opportunity status values:

```text
open
won
lost
paused
blocked_review
cancelled
```

## 5. Contact lifecycle / state flow

```text
Lead/person signal received
  -> normalize name/email/phone/company/title/source/consent
  -> search existing crm_contacts by strong keys
  -> search linked client/business context where available
  -> if exact safe same-scope match: update allowed non-sensitive fields through tested server route
  -> if possible duplicate but weak proof: create blocked_review task/draft, do not merge
  -> if cross-client ambiguity exists: abort merge/update and require approval
  -> if no match and enough minimal person data exists: create lead_only contact draft/row in sandbox-tested future route
  -> when client/business relationship is confirmed: link contact to client/business and set status client_contact or active
  -> if consent withdrawn or contact should not be approached: set do_not_contact
  -> if stale/no longer relevant under approved retention policy: archive, do not delete by default
```

Minimum viable contact creation rule for future implementation:

- A contact should have at least one human identity field (`display_name`, first/last name, or primary email) and a source.
- Marketing consent defaults to false unless explicit evidence exists.
- Client/business links require strong identity or explicit approval.
- Creation from a lead should preserve the original lead record and attribution.
- The single `linked_client_id` / `linked_business_id` fields are intentionally a first-pass narrow-scope proposal. If a person legitimately spans multiple clients/businesses, future implementation should add a separate relationship/junction table before allowing multi-scope links, instead of overwriting one scope with another.
- Browser/client direct reads and writes should not touch contact PII directly. Future routes should read/write through server-side APIs or tightly scoped RLS, especially for `restricted`, cross-client, and client-scoped records.

## 6. Opportunity lifecycle / state flow

```text
Lead qualified or client expansion signal detected
  -> verify identity and commercial intent
  -> link lead/contact/client/business where safe
  -> create opportunity in new_signal or qualified stage
  -> assign owner and next_action
  -> set value/probability/expected close only as forecast fields
  -> if proposal or client-facing action is needed: request Phill/Board approval where required
  -> if won: move to won_pending_client_conversion
  -> client conversion/update remains guarded and approval-based
  -> after approved conversion/update: set won_converted and link converted client
  -> if not proceeding: set lost/cancelled/paused with reason
  -> write future audit/timeline event after event taxonomy is approved
```

Minimum viable opportunity creation rule for future implementation:

- An opportunity must have a name, stage, status, source, and owner.
- It should link to at least one of lead, contact, client, or business where safe.
- Value and probability are optional forecasts, not financial truth.
- Any external communication, client creation/update, production write, or billing action remains outside automatic opportunity handling.
- Browser/client direct reads should be scoped through server routes or carefully restricted RLS because opportunity values, risks, decisions, and notes are commercially sensitive even when they are not billing truth.

## 7. Identity, dedupe, and merge policy

Strong identifiers already named in CRM operating documents:

- Supabase UUIDs such as `nexus_clients.id`, `crm_leads.id`, and future contact/opportunity IDs.
- `nexus_clients.slug`.
- `businesses.slug` where available.
- `contact_email` / normalized email.
- `stripe_customer_id` and `stripe_subscription_id` for billing identity links only.
- `linear_project_id` for execution/project mapping.
- `pi_ceo_key` for business/client operating context.
- Website/email domain as a hint, not proof.

Contact dedupe policy:

1. Normalize email to lower case for `dedupe_email_key`.
2. Normalize phone to digits/country-aware key where possible for `dedupe_phone_key`.
3. Normalize display/name/company into `dedupe_name_company_key` for review queues only.
4. Use email as a strong contact hint, but not sole authority to merge across clients/businesses.
5. Use domain as a weak hint only because agencies, multi-brand groups, shared domains, aliases, and consultants can span multiple clients.
6. Never discard the original lead row during dedupe; update status/link fields instead.
7. If two records conflict on client/business scope, stop and create a blocked review item rather than choosing a winner.

Opportunity dedupe policy:

1. Potential duplicate when same linked lead/contact/client/business plus similar name/source is already open.
2. Do not merge opportunities automatically when stage, value, owner, or client/business scope conflicts.
3. Keep separate opportunities for separate buying motions, campaigns, expansions, or client businesses unless explicit approval confirms they are the same deal.
4. Do not use Stripe customer/subscription records as proof that an opportunity is won; Stripe is billing truth, not sales pipeline truth.

## 8. Cross-client leakage abort rules

Abort immediately and do not create, update, merge, or surface sensitive data when any of these conditions occur:

1. A contact email or domain appears to match multiple clients/businesses without two strong corroborating identifiers.
2. A lead message, company, or source suggests one client/business while email/domain suggests another.
3. A voice command or operator note names a client but the available CRM identifiers do not confirm it.
4. A proposed contact merge would expose one client's relationship notes, contact data, opportunity, or campaign attribution to another client.
5. A proposed opportunity references a client, business, or contact outside the confirmed scope.
6. A Stripe, Linear, GitHub, Vercel, or other integration mirror link conflicts with CRM identity.
7. The route or agent cannot prove whether it is operating in sandbox/local or production.

Abort behavior:

```text
Stop mutation
  -> preserve source record unchanged
  -> mark contact/opportunity draft as blocked_review if a draft exists
  -> create or recommend an approval/review task
  -> record reason in non-sensitive operator notes
  -> do not send client-facing communication
  -> do not apply production schema/write/deploy action
```

## 9. Source-of-truth and Stripe separation rules

Source-of-truth rules carried forward:

- Supabase CRM tables are sources of truth only where local migrations and tested read/write paths exist.
- `nexus_clients` is the current client lifecycle source of truth.
- `crm_leads` is the local lead persistence target once applied to a target environment.
- Proposed `crm_contacts` would become contact source of truth only after migration, RLS, server route, and tests are approved and applied.
- Proposed `crm_opportunities` would become pipeline source of truth only after migration, RLS, server route, and tests are approved and applied.
- Linear remains execution/project truth.
- GitHub remains code truth.
- Vercel/Railway/DigitalOcean/Supabase provider dashboards remain runtime/deployment/provider truth, with Supabase integration tables as mirrors.
- 1Password remains credential truth; CRM/docs must store names only, never secret values.
- Stripe remains billing and revenue truth.

Stripe separation rules:

1. Opportunity `value_amount`, `probability`, `expected_close_at`, and `stage` are forecast fields only.
2. Opportunity won status does not mean a Stripe invoice, payment, customer, or subscription exists.
3. `nexus_clients.stripe_customer_id` and `stripe_subscription_id` are links to Stripe truth, not CRM-controlled billing fields.
4. CRM may surface Stripe mirror status for client/revenue health, but must not perform billing writes from contacts/opportunities.
5. Financial writes, refunds, payments, subscription changes, or billing messages require explicit approval and are outside this lane.

## 10. Board approval gates and sandbox-first migration rule

Allowed now by default in this lane:

- Local repo/doc inspection.
- Local documentation updates.
- Draft schemas and implementation plans.
- Future local mocked tests.
- Safe local verification that does not write production data.

Requires Phill/Board approval before action:

- Production database migration or schema change.
- Any production `supabase db push`, direct `psql` write, or service-role data mutation outside already scoped/tested paths.
- Applying the future `crm_contacts` or `crm_opportunities` migration beyond sandbox.
- Cross-client merge or permanent identity decision.
- Client creation/update from a lead or opportunity.
- Client-facing communication.
- Billing/payment/Stripe changes.
- Deployments, Vercel env mutations, GitHub pushes/PRs unless explicitly scoped.
- Permanent rules for auto-conversion, auto-assignment, auto-approval, or financial action.

Sandbox-first rule:

```text
Draft migration
  -> write mocked tests first
  -> apply only through sandbox wizard
  -> verify schema, RLS, server route, and abort behavior
  -> review Board gates
  -> only then consider production promotion with explicit approval
```

Any future schema change must go through the repo sandbox wizard before production promotion:

```bash
./scripts/sandbox-wizard.sh apply <migration.sql>
```

This document does not run that command and does not apply any migration.

## 11. Future mocked test matrix

| Area | Future mocked test focus | Expected safety behavior |
| --- | --- | --- |
| Contact migration shape | Required fields, status check, indexes for normalized email/status/linked IDs, timestamps | Migration runs in sandbox only; no production apply. |
| Contact RLS | Service-role server route can write; browser/client cannot directly write sensitive CRM contacts | Public/client-side writes blocked. |
| Contact create from lead | Creates contact from `crm_leads` fields, preserves lead, defaults marketing consent from lead | Original lead remains intact; no client conversion. |
| Contact consent defaults | Missing consent defaults false; explicit lead consent maps to contact fields | No assumed marketing consent. |
| Contact existing same-scope match | Same email and same linked client/business can update allowed non-sensitive fields | Update is scoped and audited in future event route. |
| Contact weak duplicate | Same name/domain but no strong identifier returns blocked review | No merge. |
| Contact cross-client conflict | Same email/domain appears under multiple clients/businesses | Abort mutation and require approval. |
| Contact privacy metadata | `privacy_scope`, retention policy, and notes are accepted without secrets | No secret/token leakage in payload. |
| Opportunity create from qualified lead | Creates opportunity with lead/contact links, stage/status/source/owner/next action | No client creation; value is forecast only. |
| Opportunity create for existing client expansion | Links to confirmed `nexus_clients.id`; does not overwrite client fields | Client lifecycle stays in `nexus_clients`. |
| Opportunity duplicate open deal | Same lead/contact/client/name detects possible duplicate | Returns review/blocked response, no automatic merge. |
| Opportunity stage transitions | Valid stages pass; invalid stages fail | Pipeline state remains controlled. |
| Opportunity probability | Accepts null or 0-100 only | Invalid forecast probabilities rejected. |
| Opportunity Stripe separation | Won opportunity does not write Stripe IDs or billing fields | Billing truth remains Stripe. |
| Opportunity approval gate | `decision_needed` or approval-required stage creates blocked/approval task draft in future route | No external action without approval. |
| Cross-client abort | Conflicting linked lead/contact/client/business IDs reject request | No data leakage. |
| Source attribution | Campaign/source fields persist from lead or explicit payload | Original attribution preserved. |
| Audit/timeline future hook | Successful create/update can call future event writer; event failure is non-fatal only where safe | Audit behavior explicit and tested. |
| Command-center read route | Lists contacts/opportunities with filters by owner/status/source without exposing restricted scopes | Read rules respect privacy scope. |
| Missing environment | Routes fail safely when Supabase env/config is absent | No partial or guessed writes. |

## 12. Next implementation steps

1. Keep this proposal as the local planning source for the contacts/opportunities lane.
2. Draft a sandbox-only `crm_contacts` migration with status checks, indexes, RLS, and no production apply.
3. Draft a sandbox-only `crm_opportunities` migration with stage/status/probability checks, indexes, RLS, and no production apply.
4. Write mocked tests before route implementation for contact creation/linking/dedupe/cross-client abort behavior.
5. Write mocked tests before route implementation for opportunity creation/stage transitions/Stripe separation/approval gates.
6. Draft server-only API route contracts; do not allow browser/client direct writes to sensitive CRM tables.
7. Define minimal event taxonomy for future contact/opportunity audit entries, likely via `agent_actions` until a dedicated timeline is approved.
8. Decide whether approvals remain a `tasks` subtype or become `crm_approvals` before any automatic approval workflow.
9. Run future migrations through `./scripts/sandbox-wizard.sh apply <migration.sql>` only after tests and review.
10. Request Phill/Board approval only when a specific promotion, production write, cross-client identity decision, client-facing action, or billing/deployment action is genuinely needed.

## 13. Verification for this document

This lane is complete when:

```bash
test -f docs/margot/crm-contacts-opportunities-model.md
```

No type-check or Jest run is required for this doc-only proposal unless a parent lane requests broader verification.

## Senior PM verification checkpoint (2026-06-09 23:50 AEST)

This lane was a safe Senior PM control-surface refresh, not a schema change, not a sandbox apply, not a production deploy, and not a promotion. The doc is now bound to the AI-RET-001-ANSWER-CONTACTS-OPPORTUNITIES-SAFETY-BOUNDARY answer-shape fixture and the new doc-drift guard test (`keeps the crm contacts and opportunities model source doc aligned with the AI-RET-001 safety-boundary answer-shape contract`).

- What exists: refreshed `crm-contacts-opportunities-model.md` with `Last update: 2026-06-09 23:50 AEST` marker, `Previous refresh: 2026-05-23` pointer, explicit `Related evidence` cross-link to the AI-RET-001 report, explicit `Related fixture` line pointing at `AI-RET-001-ANSWER-CONTACTS-OPPORTUNITIES-SAFETY-BOUNDARY`, explicit `Related rotation guard` pointer to the new in-doc checkpoint, a new `## AI-RET-001 Contacts/Opportunities Safety Citation Contract` section that names the 7 `requiredAnswerPhrases` (`sandbox-only draft`, `no production apply`, `forecast-only`, `stripe remains billing truth`, `strong identity gates`, `operator approval`, `cross-client leakage abort`) and the 4 `requiredCitationSources` (`docs/margot/crm-contacts-opportunities-model.md`, `docs/margot/crm-operating-model.md`, `docs/margot/lead-to-client-conversion-plan.md`, `docs/margot/ai-enhancement-candidate-register.md`), a new `## Out of Scope for This Revision` section that codifies the modern hard safety rules (no live semantic search, no Nango, no production DB write, no Mac Mini credential prompt/read, no contact auto-creation, no opportunity auto-creation, no cross-client merge applied, no production migration applied, no billing field written), the existing 12-section proposal (purpose, ordering, `crm_contacts` model, `crm_opportunities` model, contact lifecycle, opportunity lifecycle, identity/dedupe/merge policy, cross-client leakage abort rules, source-of-truth and Stripe separation rules, Board approval gates, mocked test matrix, next implementation steps, verification) is preserved unchanged, and a new `## Senior PM verification checkpoint (2026-06-09 23:50 AEST)` block (what exists, what has started, why it exists, missing/unclear, current health evidence, smallest next action) at the end of the file.
- What has started: this control-surface refresh lane. No new migration, no schema change, no production apply, no Vercel env mutation, no GitHub push/merge/PR mutation, no client-facing send, no public publishing, no paid spend, no billing action, no model swap, no live vector search, no external AI enrichment over client/lead data.
- Why it exists: the previous version of this doc was last touched `2026-05-23`, before the AI-RET-001 7/7 source-citation + 7/7 answer-shape mocked report, the case-insensitive `normalizedSubjectType` approval-lifecycle lane, the `logCrmDigestReadError` fail-closed guard, the `digest-mappers` positive coverage, the case-insensitive `approval-lifecycle` lane, the deterministic `stale-sync` `last_error` + NaN guard, the daily-digest `staleReasonLabel` / `staleReasonDetail` / `normalizedMinutes` privacy hardening, the lead-to-client conversion plan refresh (which named the recommendation-only contract), the CRM operating model refresh (which named the modern binding safety rules), the crm-approval-persistence-plan decision (which chose Stage 1 task subtype and deferred a dedicated `crm_approvals` table), and the modern binding hard safety rules. A future agent could have re-derived that the proposed `crm_contacts` and `crm_opportunities` migration was already production-ready and could be promoted without sandbox-wizard authority, or that opportunity value is billing truth, or that contact or opportunity auto-creation was already wired to leads or voice commands. This refresh binds the proposal to the new fixture, names the prohibited overclaims (`contact auto-created`, `opportunity auto-created`, `cross-client merge applied`, `production migration applied`, `billing field written`), and adds the doc-drift guard test so future drift is caught locally.
- Missing/unclear: live retrieval threshold, embedding model, and vector DB contract remain unverified. The local harness is mocked. Sandbox authority/auth for the future `crm_contacts` / `crm_opportunities` promotion is still missing. Phill/Board decisions on contact ownership, opportunity stage taxonomy, identity-resolution policy between `pi_ceo_key` / slug / Linear project ID / Stripe customer ID / website domain, and transcript retention/privacy policy for voice-derived client memory are still gaps. The migration draft at `supabase/migrations/20260523103000_crm_contacts_opportunities.sql` has not been applied to the sandbox target Supabase environment in this tick; production promotion remains explicitly out of scope. The cross-client leakage abort policy is documented but not yet enforced by a server route or a test; future tests must cover the abort behavior.
- Current health evidence: `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` is expected to return 1 suite / 38 tests PASS (was 37 before this lane; +1 for the new doc-drift guard). Combined local CRM + Margot + runtime + credential-boundary gate `npx jest tests/unit/lib/crm/ tests/unit/lib/margot/ tests/unit/lib/runtime/stale-sync-check.test.ts tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts --runInBand` is expected to return 11 suites / 162 tests PASS. `npm run type-check` is expected to pass. `npm run security:routes-check` is expected to report 0 unprotected mutating routes. AI-RET-001 evidence report regenerated at `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (expected 47 lines, now lists the 8th source-citation row and the 9th answer-shape row). Voice test counts unchanged: focused Margot voice suite remains 3 suites / 28 tests. Mac Mini recovery remains opportunistic only: `/Volumes` contains `Macintosh HD` only, recovered Markdown count = 0, SMB reachable (probe at `2026-06-09 23:50 AEST` confirmed `nc` exit `0` for `:445`), SSH unreachable (probe at `2026-06-09 23:50 AEST` confirmed `nc` exit `1` for `:22`); no credential prompt/read, secret printing/storage, or recursive system-volume scan occurred.
- Smallest next action: rotate to another bounded Senior PM lane (e.g. close a voice-test gap from `docs/margot/voice-test-gap-analysis.md`, refresh `crm-approval-persistence-plan.md` (still pinned at `2026-05-23 16:38 AEST`) or `crm-schema-inventory.md` (still pinned at `2026-05-23 07:24 AEST`) with their own doc-drift guard tests, or run a deeper voice-test gap-closure sweep). Do not run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` until the specific authority/auth gate is granted. Do not adopt Nango or any third-party connector platform; do not perform a live vector search, embeddings backfill, or live AI call against production.
