# UNITE-GROUP NEXUS | NICHE AGENTIC PRODUCTS & INCOME LAB
## Authoritative additive build specification v2.0 | Codex + Claude + SPM
**Date:** 25 October 2026 (Brisbane)  
**Status:** BUILD-READY SPECIFICATION; NOT DEPLOYMENT APPROVAL  
**Primary repository:** https://github.com/CleanExpo/Unite-Group  
**Primary app:** `apps/web` subject to live repository discovery  
**Related projects:** Living Business Card V2.1.4; Agentic Income Lab V1; Unite-Group Nexus CRM; Synthex; RestoreAssist; CARSI; NRPG; CleanExpo247  
**Supersession:** This document supersedes the *prioritisation* of A01–A25, NOT their historical experiment IDs or the Living Card master. Adopt as an additive product/program specification after canonical SPM source discovery.  
**Core decision:** 25 service ideas are a research inventory, NOT 25 SaaS products. Build one multi-tenant shared platform, three product families and evidence-tested, composable offerings.  
**Evidence status:** Existing code patterns were inspected in linked GitHub reads on 25 October. Production operation, schema state, performance metrics, pricing and sales are NOT verified by this specification.

---

# 1. Founder directive and non-negotiable outcome
Create a repeatable, commercially defensible and largely bot-operated business portfolio using the existing Unite-Group Nexus CRM. The business sells business outcomes, not AI novelty: recover lost enquiries, turn enquiries into completed jobs, make digital experiences memorable, strengthen reputation, improve operational reliability and demonstrate measurable returns.

**Founder test:** A customer should be able to answer: (1) what problem did Nexus solve? (2) how many actual opportunities were recovered? (3) which ones became paid work? (4) what did this service cost? (5) what happens next?

**American Dream product ethos:** The product empowers owners to build something of their own. It respects the tradesperson on-site, the sole operator serving customers after hours, the ambitious founder, the family business and the specialist who cannot afford a full marketing department. The customer should feel seen, supported and in control, not manipulated by AI. Cinematic storytelling earns attention; trustworthy operations earn loyalty.

**Commercial differentiation:** A single visitor can encounter a Living Card, website widget, phone agent, booking form, email or expo booth and receive coherent service without losing context. Every consequential promise becomes a tracked obligation. Every monetisation claim is traceable to real source evidence. Bots perform repeatable labour; approvals bound customer-impacting actions.

# 2. Scope and architecture decisions
## 2.1 Three offer families
**A. Nexus Revenue Intelligence (first monetisation focus)**
- Missed-call rescue, quote follow-up, cancelled booking recovery, client reactivation, response-speed improvement, enquiry attribution, lead-to-job conversion, customer retention.
- Sold as a managed measurable growth service; CRM, cards and website are distribution channels.

**B. Nexus Experience Intelligence (differentiation and distribution)**
- Living Business Card, cinematic interactive websites, contextual widgets, optional browser voice, Margot public ambassador for Unite-Group, business-specific AI concierge, responsive video/3D storytelling, reputation workflows, AI-enhanced quote presentations.
- Do not impose Unite-Group Margot on every customer brand; clients own their identity.

**C. Nexus Operations Intelligence (niche defensibility)**
- Specialist trade intake and dispatch, inspection-documentation completeness, promise/commitment ledger, compliant training/competency reminder workflows, multi-trade referral routing, verified service recovery and operational scorecards.
- Specialist decisions remain with qualified humans; no AI technical certification or unsafe dispatch decisions.

## 2.2 What is NOT being built
- Twenty-five separate applications, dashboards, databases or tenant identity systems.
- A new telephony engine, foundational LLM, bespoke video-generation model, or duplicate CRM.
- Unreviewed customer outreach, bulk spam, paid API usage hidden behind Max/Pro subscriptions, fake reviews, review gating, fabricated case studies, unsupported ROI or automatic high-risk actions.
- A production launch without a demonstrable end-to-end customer journey and release receipts.

## 2.3 Proposed modular diagram
```text
Card / Site / Voice Widget / Phone / Email / Expo / Manual Intake
     |  authenticated webhook or publishable intake channel
     v
Channel Adapter -> Consent + Tenant Resolve -> Event Intake (dedupe)
     -> Identity Resolution (confidence + confirmation) -> Customer Timeline
     -> Workflow Orchestrator -> Specialist Agent / Rules / Human Task
     -> Tool Adapter (CRM / Calendar / Email / Review / Job / Billing)
     -> Commitment Ledger + Source Evidence + FinOps Ledger
     -> Analytics / Experiment Attribution / Founder Control Centre
```
All external transports use replaceable adapters with rate limits, provenance and explicit capabilities. Existing CRM remains source of customer ownership truth. Cross-tenant data never becomes AI context.

# 3. Repo discovery and reuse map (must revalidate at execution)
Read authoritative `AGENTS.md`, `CLAUDE.md`, canonical `/spm` skill, Founder Board, branch protection and source-of-truth documents BEFORE code edits. Current GitHub observations:

| Need | Existing path / evidence | Caveat or required work |
|---|---|---|
| Living Card marketing | `apps/web/src/app/cards`, `/cards/order`, `editions.ts` | Showroom with 10 Higgsfield editions; not proof of tenant-owned active cards |
| Card purchase enquiry | `apps/web/src/app/cards/order/enquiry-form.tsx` | Posts to `/api/leads` with `business_key=unite-cards` |
| CRM leads | `apps/web/src/app/api/leads/route.ts` | Founder-ID based; NOT safely general-purpose multi-customer tenancy |
| Existing website AI agent | `apps/web/src/lib/site-agent/site-keys.ts` | Key maps to founder/business; validate origin, permissions and tenant model |
| Gmail responses | `apps/web/src/lib/integrations/gmail.ts` | Adapter exists; don't assume every mailbox connected |
| Margot approve-to-send | `apps/web/src/lib/margot/approval-gate.ts`, `send-on-approval.ts` | Reuse only after tenant-aware send-path inspection; preserve explicit approval |
| Reputation | `apps/empire/src/lib/review-intelligence/draftReviewResponse.ts` | Structural placeholder/template, NOT AI review engine |
| Card feedback schema | `apps/web/supabase/migrations/20261024210000_card_enquiries_feedback.sql` | Founder-gated production migration; verify applied state and RLS |
| Tests | `apps/web/playwright.visual.config.ts`, `pnpm run visual:gate` | Existing visuals use fixture environment; never count as production E2E |
| Margot media | HeyGen workspace `Margot - Unite-Group`, existing ID in prior V1.2 addendum | Public ambassador media separate from private operator permissions |
| Marketing data | Synthex, Semrush connector and SEO-pro workflows | Retrieve real measurements; no invented keyword or conversion metrics |

First deliverable is a **reuse/change ledger** with exact paths, current SHAs, test commands, blockers and accountable owner. No file creation is deemed canonical until confirmed against repo rules. Work in a dedicated feature branch/worktree; no protected-branch push, PR merge or deploy without approved authority.

# 4. User roles and permission matrix
- **Nexus Founder/Board:** Portfolio strategy, commercial guardrails, high-risk approvals, cross-project policies and go-live authority.
- **Platform operator:** Tenant onboarding, integration health, bounded troubleshooting; no unnecessary access to client data.
- **Client business owner:** Their brand, staff, connected accounts, offer configuration, workflow policies, consent choices, reporting, approvals and finances.
- **Client team member:** Role-scoped leads, bookings, messages, service tasks; no tenant-wide billing or secrets unless authorised.
- **Customer/end-user:** Contact/booking/quote/review/service request through an authorised public channel; access own documents with verified identity.
- **Bot worker:** Per-task token, least-privilege tool capability, permitted tenant/business context, cost/time ceilings, evidence recording.
- **Auditor:** Read-only source trails and decision receipts; avoid exporting personal or secret data.

**Policy:** TenantId is mandatory across reads/writes/job queues/asset storage/events/analytics. Test adversarial tenant switching. Public site keys are publishable identifiers, not privileged credentials. Do not use `founder_id` as a blanket identity for external client assets.

# 5. Foundational data contracts (proposed, reconcile before migrations)
Recommended entities; retain existing tables where equivalent, use adapters rather than duplicating.

| Entity | Required core fields | Key invariants |
|---|---|---|
| `tenant` | id, owner_org, status, jurisdiction | Unique ownership, soft deactivation |
| `tenant_membership` | tenant_id, user_id, role, scope | RLS and server permission checks |
| `business_profile` | tenant_id, business_key, public_claims, brand_kit_id | Approved factual source and version |
| `channel_connection` | tenant_id, provider, channel, scopes, status, vault_ref | No raw secrets in app DB/logs |
| `external_identity` | tenant_id, channel, provider_id, contact_id?, confidence, verified_at | Probabilistic matches are proposed, not silently merged |
| `customer_conversation` | tenant_id, contact_id?, channel, status, source_ref | Ordered, explainable timeline |
| `interaction_event` | id, tenant_id, source_event_id, source, type, occurred_at, payload_ref | Idempotency and immutable provenance |
| `agent_run` | id, tenant_id, experiment_id, bot, policy_version, state, cost, receipt | Replay/retry bound; no fake success |
| `agent_action` | id, run_id, capability, proposed_args_hash, risk, decision, executed_at | Audit before/after external effects |
| `commitment` | id, tenant_id, conversation_id, promise_text, owner, due_at, status, proof_id | Every promise has owner, deadline and evidence |
| `experiment` | id, tenant_id?, immutable_idea_id, family, stage, hypothesis, assigned_bot | Preserve A01–A25 history |
| `experiment_variant` | experiment_id, version, allocation, start/end, guardrails | Consistent assignment and stop conditions |
| `experiment_exposure` | experiment_id, variant_id, pseudonymous_unit, timestamp | No double counting, privacy-controlled |
| `conversion_event` | experiment_id, source_id, stage, evidence_ref, value_estimate? | Distinguish conversion vs cash |
| `financial_event` | tenant_id, experiment_id, kind, amount_minor, currency, source_invoice/payment_ref, verified | Revenue / savings / opportunity separate |
| `cost_event` | provider, meter, units, amount_minor, attribution, cap | Credits vs actual monetary cost distinct |
| `decision_receipt` | actor, gate, result, evidence_hash, timestamp | Immutable, reviewable decision trail |
| `review_workflow` | tenant_id, external_review_ref, invitation_consent, reply_draft, recovery_case | Neutral invitations; no selective solicitation |
| `asset_provenance` | tenant_id, file_digest, provider, usage_rights, consent_ref, approval | Media rights and client use rights |

Use current canonical naming if appropriate. Introduce indices on `(tenant_id, created_at)`, event source dedupe constraints, outbox jobs with idempotent retry state, minimal data retention and per-tenant exports/deletion. Enforce RLS and service-side tenant permission checks. Migrations are additive, reviewed, tested on non-production, explicitly approved for production.

# 6. Capability and agent architecture
## 6.1 Specialist bot roles
1. **Demand Scout:** Finds permitted public complaints, search themes, competing solutions and buyer jobs-to-be-done. Source URLs and observation dates required.
2. **Niche Strategist:** Maps domain knowledge, buyer pains, differentiated offer, alternatives and positioning.
3. **Commercial Underwriter:** Forecasts contribution margins with explicit assumptions; challenges pricing, delivery cost and acquisition cost.
4. **Experience Designer:** Creates journey, accessible responsive layouts, card/widget first-impression prototypes, video interaction specifications.
5. **Integration Architect:** Chooses existing connector and schema reuse; handles tenant and data contracts.
6. **Agent Engineer:** Implements bounded workflow, prompts, tools, deterministic rules and uncertainty escalation.
7. **Quality Judge:** Unit/integration/security/prompt-injection/red-team/visual tests and receipts; independent from implementer.
8. **Experiment Analyst:** Designs baseline, comparison, sampling, attribution and confidence/inconclusive outcomes.
9. **Customer Success Agent:** Surfaces approved drafts, unresolved promises, support follow-ups and training needs.
10. **SPM Orchestrator:** Coordinates workstreams, dependency scheduling, issue priority, approval gates and verified state transitions.

Agents are **proposed roles**, not statements of existing deployed worker availability. Discover installed skills and real orchestration first. Parallel agents work only on independent files/issues; SPM owns dependency ordering and merge conflicts.

## 6.2 Safe workflow state machine
`discovered -> qualified -> business_case_ready -> design_approved -> sandbox_build -> tests_passed -> internal_pilot_authorised -> internal_pilot -> measured -> scale_review -> approved_for_client_release -> live_verified`, or `blocked/retired`. Each transition records evidence, costs, operator and the gate. A blocked experiment never inherits permission from a different experiment.

## 6.3 Agent-action classes
- **A0 read-only:** Search, analytics, documentation and dry-run. Autonomous when permitted.
- **A1 internal reversible:** Drafts, sandbox variants, internal tasks, test data and simulations. Auto within budget.
- **A2 controlled operational:** Real customer CRM record changes, private communications or calendar actions. Require configured policy, role authority and action-specific confirmation as applicable.
- **A3 irreversible/external/high-risk:** Production deploy, external bulk email, media publication, billing, refunds, legal commitments, contract changes, paid provider jobs and database migrations. Explicit approval and auditable receipt.
- Existing repo/founder gates override general classifications; no implicit promotion from a verbal project goal to production authorisation.

## 6.4 Agent prompt contract
Every bot invocation must include `{tenant_scope, task_goal, data_provenance, allowed_tools, denied_actions, time_budget, monetary_cap, approval_policy, output_schema, evidence_requirement, stop_conditions}`. Every output contains `decision`, `confidence_or_unknown`, `source_refs`, `proposed_actions`, `measured_result_or_null`, `human_review_reason`, `cost_record` and `receipt_ref`.

No hidden direct tool access from language-model prose. Use schema validation, capability allowlists, signed provenance and typed tool wrappers. Strip untrusted external instructions from scraped pages/emails. Prevent cross-tenant embedding or retrieval.

# 7. Product build requirements: three families
## 7.1 Revenue Intelligence modules
**REV-01 Missed-Call Rescue (pilot):** On missed/overflow/after-hours event with permitted provider; verify number/tenant; create event and matched/provisional lead; ask caller for contact and need with consent; classify urgent vs normal; prepare internal task and owner-visible suggested response; do not promise arrival times; callback request remains owned until confirmed. Respect opt-out and emergency escalation. Features: voicemail transcription where lawful, safe fallback to regular voicemail, real-time failure alert, deduped calls, callback status, SLA.

**REV-02 Quote Follow-up:** Import approved open quote statuses and send history; score only by factual age/estimated value; propose one contextual follow-up draft; check existing messages and suppression; approve send; track response, agreed next step, won/lost and actual payment. No invented scarcity.

**REV-03 Booking Recovery:** Identify cancellations with authoritatively available slots, create waitlist suggestions, generate draft rescheduling messages, count filled cancellations only after confirmed bookings.

**REV-04 Reactivation:** Segment eligible prior customers by consent, service relevance, lifecycle timing and frequency cap; draft personalised genuine offer; measure incremental retained/repeat purchases vs holdout. Do not equate replies with revenue.

**REV-05 Conversion Repair:** Identify form errors, slow landing pages, drop-offs and low trust; generate improvement variants; run reviewed A/B tests on eligible traffic; revert on accessibility, performance or conversion guardrail breach.

## 7.2 Experience Intelligence modules
**EXP-01 Living Business Card:** Tenant-owned card URL, branded identity, optional four-second reveal, instantly visible call/save/quote/book, lead capture, QR/NFC, personal media and lighter default path. Respect video permissions, muted playback, posters and reduced motion. Reuse existing Higgsfield editions and current premium visual baseline without copying competitors.

**EXP-02 Contextual Widget Kit:** Plug-ins for ask-a-question, quote estimate, photo intake, appointment, voice/browser assistance, service status and review link. Installable on customer sites using a published site key, per-origin/tenant allowlist, install diagnostic, CSP guidance, Shadow DOM/iframe isolation when justified, accessibility, lazy-loading and simple removal. Widgets cannot silently intercept existing forms or leak page content.

**EXP-03 AI Concierge:** Reads verified business knowledge; responds with source-grounded service facts, clear uncertainty, approved prices only; discloses AI; easy human handoff. All side-effects delegated to authorised action tools. No free-form write access to CRM.

**EXP-04 Margot Media:** Existing approved public ambassador in HeyGen introduces Unite-Group product demos, not arbitrary third-party clients; preserve ElevenLabs voice context, verify rights and mapping before render. Separate public avatar from internal Margot admin permissions.

**EXP-05 Cinematic Creative Studio:** Reusable Higgsfield, HeyGen, Artlist, Blender, Claude-assisted editing pipelines: brand kit -> storyboard -> generation estimate -> approved render -> caption/voice QC -> consent/licence verification -> mobile compression -> publish approval -> engagement analytics. Different render grades for portrait (9:16), square (1:1) and landscape (16:9). Source filenames, hashes and per-customer licensing; no deceptive testimonials.

**EXP-06 Review and Reputation:** Neutral review invitations after legitimate service touchpoints with controls for all eligible customers, public review links, private feedback path, owner approval on replies, recovery case, consented testimonial content. No gating by rating, review incentives or invented endorsements.

## 7.3 Operations Intelligence modules
**OPS-01 Promise Ledger:** Extract explicit commitments from calls/emails/chats as proposed tasks; link exact originating quote; ask human to confirm uncertain promise; due time, owner, state and escalation; verify completion via customer response, scheduling or delivered receipt, not AI self-report. Escalation cannot repeatedly spam recipients.

**OPS-02 Trade Job Intake:** Weather/water/repair/other trade needs as non-diagnostic intake, photo permissions, site details, location, urgency and callback. Automatically create accurate intake pack with missing fields and handoff. Only qualified staff approve restoration scopes and pricing.

**OPS-03 Documentation Assurance:** Check reports for consistency, missing rooms, photos, readings, calculations and scope mismatches. Provide discrepancy evidence, not invented measurements. Training relevance via CARSI is optional with explicit data boundaries.

**OPS-04 Network Referral:** Provider qualification, service territory, explicit opt-in and referral consent, contract/commission policy, objective matching, conflict disclosure and verified acceptance. Do not expose private client data to unapproved providers.

**OPS-05 Supplier & Margin Intelligence:** Read authorised price lists; capture dated quotes, exclusions, freight, GST and terms; recommend opportunities with provenance. No auto-purchases or unauthorised vendor mass contact.

# 8. Portfolio migration: every original idea preserved
Mapping from prior Agentic Income Lab IDs. No idea may be silently deleted or counted as new revenue.

| Original ID | Destination offer / disposition |
|---|---|
| A01 | REV-01 flagship |
| A02 | REV-05 flagship; EXP website analytics |
| A03 | EXP-03 assistant module |
| A04 | REV-02 flagship |
| A05 | EXP-06 reputation module |
| A06 | REV-04 retention module |
| A07 | REV-03 booking recovery |
| A08 | EXP-05 quote-video premium addon |
| A09 | EXP-03 grounded knowledge module |
| A10 | OPS-01 onboarding promises |
| A11 | OPS-01 lifecycle assurance |
| A12 | OPS billing desk optional, approval required |
| A13 | EXP content commerce optional after demand proof |
| A14 | EXP-05 cinematic creative service |
| A15 | EXP-05/EXP-06 testimonial consent workflow |
| A16 | EXP local listing repair optional |
| A17 | REV-05 search visibility module run by Synthex, the internal marketing agency, for Unite Group businesses (Semrush measured data) |
| A18 | OPS-05 competitive/pricing intelligence optional |
| A19 | EXP-06 customer feedback intelligence |
| A20 | EXP-03 multilingual module optional with QC |
| A21 | OPS-02 trade intake flagship |
| A22 | OPS-04 referral network |
| A23 | OPS-05 procurement module |
| A24 | EXP-01 card + REV event lead-to-revenue |
| A25 | OPS-01 flagship Promise Ledger |

The six video-derived V01–V06 are retained as separately labelled hypotheses, with no fabricated transcript or earnings claims. Reassess V01 procurement, V02 resale, V03 fulfilment arbitrage, V04 local lead sites, V05 compliant draft outreach and V06 implementation service against consumer law, margin and fit. Do not expand these into unrelated businesses before core product evidence exists.

# 9. Strategic screening and underwriting
## 9.1 Qualification rubric (100-point internal decision aid)
Asset reuse 20; verified buyer pain 20; recurring contribution margin 20; bot deliverability 15; niche defensibility 15; low compliance/operating risk 10. Score 0–5 per criterion, attach evidence URL or test record to each score. A speculative score cannot masquerade as verified data. Flag `evidence_grade`: `measured`, `interview`, `credible_secondary`, `assumption`, `unknown`.

**Go/no-go thresholds are proposed, not externally validated:** 80+ eligible for a cost-capped pilot *after* evidence review; 60–79 buyer discovery; below 60 defer. Override allowed only as a documented founder decision, not model fiat.

## 9.2 Commercial model
For each pilot, record: setup price, monthly fee, per-use fee, GST treatment, payment processor fees, labour effort, provider cost, hosting, chargebacks, marketing/acquisition expense, customer support, refund assumptions, churn, marginal cost per tenant, expected capacity and financial downside. Record provider invoices and actual incurred costs separately from model-based estimates. Explicit decision: managed service, usage charge, performance fee, bundled tier or not viable. Do not assume commission/referral structure is lawful or agreed.

## 9.3 Revenue truth
- `cash_received`: settled payment or reconciled bank/Stripe receipt net of refund status.
- `invoiced_revenue`: issued invoice but not yet cash.
- `booked_revenue`: executed contract/order; may still be unpaid.
- `pipeline_value`: potential commercial opportunity, never revenue.
- `verified_savings`: documented baseline less comparable achieved cost, adjusted for fees/exclusions.
- `gross_margin`: revenue less directly attributable fulfilment costs.
- `contribution_margin`: revenue less variable operating, provider, payment and acquisition costs.
- `profit`: only after full, reconciled cost allocation, otherwise avoid the word.
No numbers may appear as measured without a source reference and calculation version.

# 10. Experiment design and analytics contract
Each experiment record MUST contain: `experiment_id`, immutable parent idea ID(s), business owner/tenant, exact hypothesis, evidence grade, trigger population, eligible unit, comparison/control policy, primary outcome, guardrail metrics, attribution window, starting baseline, minimum decision signal, estimated/actual cost, owner/bot, variants, start/stop, consent profile, kill threshold and analyst approval.

## 10.1 Measurement definitions
- **Call capture rate** = qualified inbound calls with correctly logged event / eligible calls.
- **Recovered lead rate** = previously missed eligible contacts with verified meaningful response / eligible missed calls.
- **Callback SLA** = commitments completed by deadline / due commitments.
- **Quote win rate** = accepted eligible quotes / eligible quotes with completed decision window.
- **Incremental conversion** = treatment converted / eligible treatment minus control converted / eligible control; report uncertainty and potential biases.
- **Recurring revenue** = verified subscription payments associated with active clients, separately from contracted MRR.
- **Agent completion** = tool-evidenced tasks closed / eligible assigned tasks; never rely on AI-generated `success` text.
- **Net contribution** = collected attributable revenue less attributable variable costs and refunds, with source provenance.

## 10.2 Causal discipline
Assign variants before treatment, preserve stable unit assignment, dedupe repeat visitors, use holdouts for proactive outreach where appropriate, avoid selection bias, pre-register primary metric and analysis horizon, and flag when sample size is too small. Do not claim statistical significance from one success story. Track seasonality, pricing changes, competitor changes, concurrent campaigns and channel mix as potential confounders. Use counterfactual estimation only when experimental control is impossible, clearly labelled.

## 10.3 Dashboard requirements
**Founder portfolio:** revenue collected, verified savings, pipeline, total costs, contribution, active paying customers, experiments by stage, critical risk, overdue approvals, verified releases, freshness timestamp, uncertainty banners.
**Product family:** conversion funnel, retention, automation coverage, handoffs, provider failures, per-tenant gross contribution, complaint/sentiment signals.
**Experiment detail:** hypothesis, assignment, baseline vs treatment, observation counts, confidence caveat, spend, approved actions, outcome receipts, decision recommendation, prior versions.
**Customer value report:** value delivered, exact sources, service history, promises completed, outstanding exceptions, plain-English ROI calculation and source dates; no hidden shared customer data.

Charts and insight agents must allow `unknown` rather than filling with zero; track import freshness, failed joins, duplicate events and dropped provider callbacks. Every graph states timeframe, timezone (Australia/Brisbane by default for local business reporting), unit, denominator and source.

# 11. First reference pilot: Missed-Call-to-Booked-Work
**Why first:** Narrow problem, direct buyer pain, a verifiable end-to-end outcome, ties to card, CRM, phone, owner and promise ledger. Early phase can run without any unapproved outbound or paid telephony activation.

## 11.1 Actors and event sequence
1. Business owner installs authorised forwarding/voice provider in test environment; test caller consents as required. Do not alter production line until approved.
2. Provider emits signed `call.missed`, `call.overflow` or test `call.completed` event with unique provider event ID.
3. Adapter validates signature, timestamp, origin and tenant connection; rejects replays and duplicates; stores minimal event metadata.
4. Identity service suggests existing contact match by verified phone/email signals; low-confidence case remains provisional, no auto merge.
5. Lead/task record created within tenant; urgency triaged with deterministic safety rules and uncertain cases escalated.
6. Promise Ledger creates one `callback_requested` commitment with owner and policy-based deadline; timestamps as business local time.
7. Draft response created from factual approved business data; not sent while in draft/awaiting_approval state.
8. Owner reviews and approves safe callback; integration sends once through permitted provider and records provider delivery result.
9. Customer books through real calendar availability; system records confirmed slot, not inferred availability.
10. Outcome analyst links booked appointment, quote, completed job and paid invoice only when verifiable; duplicate attribution prevented.
11. Experiment dashboard compares eligible events and outcomes to valid baseline/holdout; analyst issues scale/iterate/kill recommendation.

## 11.2 Edge cases
Wrong tenant signature; duplicate or delayed webhook; blocked caller ID; caller requests privacy deletion; emergency requiring immediate human/000 instruction; speech latency; unsupported language; failed carrier transfer; provider outage; after-hours calendar without openings; simultaneous callbacks; customer asks not to be contacted; customer has no email; mobile browser blocks microphone; user abandons; manually logged call already in CRM; payment reversed; quote never signed; shared family phone; callback sent but bounced. Every edge needs a deterministic, user-respectful fallback and tests.

## 11.3 Acceptance tests
- 100% test webhook signature failures rejected and logged without secret leakage.
- Duplicate replay creates one logical call and no duplicate callback task.
- Signed event from tenant A cannot see, mutate or message tenant B.
- Unauthorised sends remain blocked at runtime and are visible in the audit.
- No contact merge from weak match without approved verification.
- Complete `missed -> task -> approved response -> booking -> verified outcome` E2E passes in staging.
- Missed connection creates visible fallback task and status, not fake completion.
- Real voicemail/phone fallback works when AI service is unavailable (test in authorised provider sandbox).
- Event/account changes do not assume marketing consent.
- Analytics reconciliation can prove denominator and invoice source (or explicitly mark unknown).
- Full public experience keyboard/screen-reader usability; no hidden phone-call fees.

# 12. Additional niche pilots (sequenced)
**PILOT 02 Quote-to-Cash Recovery:** Canonical pipeline quote event -> compliant owner-approved follow-up -> accepted quote -> paid invoice; primary measure incremental paid jobs vs eligible quotes; guardrails complaints/unsubscribes. No automated price concessions or fabricated urgency.

**PILOT 03 Verified Review-to-Service Recovery:** Eligibility based on completed legitimate service, not happiness; neutral invitation, review import via authorised provider, human-approved reply, actual service ticket, verified closure. Primary measure completed service recovery and review response timeliness, not a target five-star rating.

**PILOT 04 Trade Intake-to-Inspection:** Card/site/phone photo and structured event -> triage pack -> qualified reviewer -> real inspection booking and scope. No automated insurer promises, diagnosis or technical certification. Initial market scope Australia/NZ if supported and approved.

**PILOT 05 Website Friction Repair:** Connect consented analytics; detect specific malfunction; design accessible variant; confirm site owner; run A/B or staged holdout; measured qualified lead lift with performance and abandonment guardrails. Synthex SEO/AEO/GEO measurements require Semrush connector when available and SEO-pro methodology; label gaps.

**PILOT 06 Expo Lead Continuity:** Approved booth/event capture with consent -> asset/story -> conversation -> booking follow-up -> revenue evidence. Preserve opt-out and exhibitor tenant boundary.

# 13. Frontend and service UX requirements
## 13.1 Founder Mission Control panels
- **Portfolio Overview:** three family cards with actual collected revenue, margin, jobs recovered, active clients, test freshness, 30/90 day trends, risk. Each click opens actual underlying receipt records.
- **Income Lab:** sortable experiment register with stage, score + evidence grade, bot status, budget cap, cost to date, measurement readiness and last verified action.
- **Experiment Detail:** hypothesis, journey preview, source documents, runs/events, A/B control charts, expenses, action approvals, failures, analyst verdict and revision history.
- **Customer Journey Replay:** privacy-safe timeline from contact/card/call -> lead -> action -> booking -> payment; distinguish observed vs inferred links.
- **Approval Queue:** priority + potential effect + exact external action; bulk approval prohibited for high-risk actions; approve/edit/reject with authority receipt.
- **Exception Desk:** expired promises, denied sends, missing authorisations, provider degradation, failed test, unverified ROI, data quality failures.
- **Asset & Brand Library:** consent provenance, video/voice status, licence, client brand, content lifecycle, source digest, per-asset rendering charges.

## 13.2 Client portal
One-screen setup progress, branded public experience preview, connections health, key metric receipts, editable response style and approved knowledge, business-hour/booking policies, staff assignments, cost forecast, cancellation and data export. Owner should understand status without learning agent framework terminology.

## 13.3 Widget/mobile acceptance
Support 320/390/768/1440 widths, thumb-friendly buttons at least 44×44px, no horizontal scrolling, screen-reader semantics, clear loading/error/permission states, `prefers-reduced-motion`, captions and no essential information locked behind sound/video. No surprising audio autoplay. Contact/book/quote actions always available; video enhances, never delays them. Deliberately test low-end phones and slow connections. Public ads and testimonials cannot misrepresent capability.

## 13.4 Human touchpoint guidance
At every step tell the person: what happened, what will happen next, who owns it, when to expect a response, how to contact a human, how data is used. Never say “booking confirmed” until calendar confirmation exists; never say “message sent” until provider confirms; never imply Margot is a human.

# 14. Technical implementation workstreams
**WS0 Governance/admission (SPM):** Verify repo, branch, existing documents, canonical spec path, current state of services and approvals. Produce inventory and project ledger. No feature code before this.

**WS1 CRM domain/tenant spine:** Reconcile existing schema; typed repositories, tenant scoping, membership and consent, event ingestion and immutable receipts. Non-prod migrations and RLS red-team tests.

**WS2 Agent action layer:** Capability registry, per-tenant policy, run queue, durable outbox, idempotency, retry/dead-letter, time and cost budget, prompt-injection isolation, approval service, observability and disabled-by-default external sends.

**WS3 Channel integrations:** Reuse website lead routes and site keys with tenant refactor; test email mapping; add a single swappable mock phone provider initially; Google Business Profile review integration after provider access approvals; ensure link-back to sources. Do not claim all channels are connected.

**WS4 Experiment registry and cash ledger:** Create A01–A25 migration map, append V01–V06; deterministic attribution and ledger reconciliation. Read-only import first, synthetic test values explicitly marked; separate official/accounting financial truth from estimates.

**WS5 Analytics UI:** Founder portfolio, experiment screen, customer ROI report, freshness indicators, approval and exception queue. Instrument events with unit/denominator, locale, timezone and trace IDs.

**WS6 Product family pilots:** Implement REV-01 in provider sandbox first; then REV-02/EXP-06/OPS-02/REV-05 based on evidence and owner approvals. Each can be a feature flag/managed package, not its own product app.

**WS7 Experience/creative:** Wrap existing card and Margot/Higgsfield productions, widget install kit, licence and consent ledger, refined responsive visuals and accessibility acceptance, safe fallback states.

**WS8 Security/compliance:** Threat model customer data, AU privacy and communications obligations, reviews, call recording jurisdiction, secrets management, rate limiting, abuse/spam, disaster recovery and breach response.

**WS9 Release and operate:** Tested staging, canary, rollback rehearsals, support runbooks, data retention, customer education, monitoring, cost alerts, service SLAs and proof-based release receipts.

Parallelise WS4 UI mock, WS7 storyboard and read-only competitor/buyer evidence after WS0; sequencing required for tenant schema -> agent actions -> real integrations -> live tests.

# 15. Technical interfaces (conceptual; adapt to existing frameworks)
```
POST /api/nexus/intake/{channel}             // signed channel webhook; no client-provided tenant trust
GET  /api/nexus/experiments                 // tenant-scoped, paginated
POST /api/nexus/experiments                 // authorised internal proposal, no external activation
GET  /api/nexus/experiments/{id}/events     // read-side evidence
GET  /api/nexus/experiments/{id}/metrics    // attributed and dated measurements
POST /api/nexus/agent-runs                  // policy-checked internal run request
GET  /api/nexus/agent-runs/{id}             // state, cost and receipts
POST /api/nexus/actions/{id}/decision       // approve/reject with server authorisation
GET  /api/nexus/commitments                 // tenant + role filtered
PATCH /api/nexus/commitments/{id}           // audited change
GET  /api/nexus/financial-ledger            // reconciled/read-only sources, no estimate coercion
GET  /api/nexus/channels/health             // truthful connection status
```
All routes are examples, not verified route locations. Check existing APIs first; do not introduce duplicates. Provider callbacks must validate cryptographic signatures and idempotency. Use pagination, cursor stability, no secret-bearing query params, immutable event logs and safe schema evolution. Include per-business rate limits, bot-control caps and non-production fixtures.

# 16. Security, compliance and abuse hardening
- Multi-tenant row-level security AND independent server-side permission checks, with negative cross-tenant tests and object-level authorisation.
- Webhook replay protection, SSRF guards, file scanning, size limits, safe asset storage, link expiration and virus/malware controls where appropriate.
- Prompt injection and retrieval poisoning tests across inbound email, websites, PDFs and transcripts; label external content untrusted; no instruction inheritance from source text.
- Opt-in recording/transcripts and legally reviewed disclosures by jurisdiction; actual provider access to phone and messaging must be authorised per client.
- Consent and suppression for AU commercial email/SMS; review requests not gated by sentiment, and no compensated positive reviews.
- Data processing agreements, privacy policy, retention/deletion rules, consent revocation, approved subprocessors, audit and client export.
- Provider failure circuit breaker; safe human fallback without losing conversations; never invent booking slots, prices, licences or certifications.
- Expense limits: default external job generation disabled until a per-provider, per-tenant cap is explicitly set; no unapproved API credit usage. Subscription CLI development access is not a production inference entitlement.
- Do not clone faces or voices without relevant identity/rights consent. Reuse approved Margot identity within authorised scope.

# 17. Testing contract and evidence receipts
## 17.1 Required suites
- Unit tests for event schemas, rates, consent, score calculation, attribution, state transitions, guardrails and ledger arithmetic.
- Integration tests with mocked provider failures, replay, out-of-order events, wrong tenant and token revocation.
- Database/RLS tests on non-production with tenant A/B/C, role scopes and opaque IDs.
- Playwright end-to-end for public card, widget, phone simulation and founder dashboards at narrow/mobile/desktop breakpoints.
- Accessibility WCAG 2.2 AA-oriented audits, reduced motion, keyboard-only and screen reader smoke.
- Load tests on intake bursts, backpressure and cost caps.
- Security red-team tests for prompt injection, fake provider webhooks, forged approvals, malicious customer input and entitlement escalation.
- Analytics reconciliation test: deliberately duplicate an invoice/call, confirm no inflated revenue; exercise unknown/missing data.
- Human acceptance on real client workflows before external release.

## 17.2 Definition of Done for each module
`spec_reference + exact commit + test command/results + screen captures where UI + provider sandbox receipt + RLS negative result + cost receipt + data provenance + reviewer verdict + release gate + rollback path + named owner`. A screenshot or successful build is not equivalent to a working service. State must distinguish planned, coded, staging-verified and live-verified.

# 18. Rollout phases and stop rules
**Phase 0: 0–2 weeks target, not deadline.** Discovery, reference fixtures, architecture, prioritisation with real buyer evidence, first working mock demo and security model. Phase length is planning only.

**Phase 1: Contract and evidence spine.** Tenant model, event queue, commitment ledger, experiment ledger, full tests, basic dashboards. No live paid integrations.

**Phase 2: Narrow authorised pilot.** Missed-call rescue, approved follow-up and outcome measurement for a founder-controlled test business. Collect usability issues, false matches, real cost, operator effort and customer satisfaction.

**Phase 3: First sellable managed offer.** Only if measurable pilot and legal/consent controls pass. Client onboarding, support, billing, pilot pricing, limit/usage disclosure and customer ROI report.

**Phase 4: Scale to adjacent niches.** Trade intake and quote recovery, CRO and reputation work by Synthex, the internal marketing agency, for Unite Group businesses only, event lead conversion and differentiated creative bundles. Marketplace/resale/arbitrage remain separate research hypotheses unless independently validated.

**Kill rules:** Stop acquisition or agent action on unapproved send, cross-tenant leakage, hallucinated financial/customer claim, repeated provider failure, complaint rate crossing approved guardrail, negative contribution beyond cap, noncompliant consent or missing evidence. A paused pilot remains visible and recoverable.

# 19. Explicit 30 / 60 / 90 day validation targets (not forecast earnings)
**First 30 days:** Current state inventory, 10–15 properly sourced buyer interviews (target), at least 3 prospective buyers with stated willingness to pay (target), one tested sandbox end-to-end journey, dashboard showing zero/unknown honestly, security gate passage.

**By day 60:** One approved live founder-controlled pilot if gates pass, actual provider/unit costs and at least one full customer outcome receipt, measured funnel/feedback and documented iteration. Do not commit to a launch date if blockers remain.

**By day 90:** Decide scale/iterate/retire based on first cohort's collection, cost, retention, customer feedback, operational reliability and one documented willingness-to-pay test. Any subscriber or revenue target is a proposed experiment objective, not expected fact.

# 20. Operational reports and SPM cadence
Daily automatic (only when scheduled/authorised): new qualified events, promises due, stuck approvals, spend exceptions, failed runs, customer harm incidents, factual material changes.
Weekly: by family, tests run, baseline vs treatments, invoices/cash/savings separated, costs and contribution, opportunity decisions, learning and next hypothesis, owner signoff. SPM can suggest build work but may not bypass release gates.
Monthly: cohort retention, net margin, buyer win/loss feedback, product-market fit evidence, feature retirement, governance revisions and next build priority.

Founder dashboard should make the **next safe action** obvious, not simply display walls of metrics. Carry receipts into Linear/Mission Control only through authorised write paths, and avoid duplicate tracking systems.

# 21. Codex + Claude execution plan and acceptance handover
1. Activate canonical `/spm` only in an authorised checkout; read current project contracts, branch and build rules. Surface any missing source as a blocker, not invented permissions.
2. Inventory all existing code listed in §3 and update the reuse matrix with SHAs and actual environment state. Search for Synthex/CRM/RestoreAssist schemas and pre-existing event tables before creating new ones.
3. Create the additive design documents in **canonical location chosen by repository governance**; preserve this spec as source input and map A01–A25, V01–V06 and five niche pilots to stable issues.
4. Assign specialist agents to isolated domains with named owner, task and evidence. Build data foundations before parallel external integration work.
5. Implement a **non-production, no-send/no-billing** missed-call-to-CRM-to-approved-draft-to-confirmed-booking demonstration. Use synthetic callers/data and local provider mocks only.
6. Build experiment register and immutable accounting distinctions; instrument real receipt links where available.
7. Run tests and a red-team review; repair issues until verified or explicitly blocked; never fabricate success.
8. Prepare per-stage release packets with diff, migration scripts, dependency analysis, legal/cost/permission checks, rollback and founder decision request.
9. No push, PR merge, production DB change, external communications, paid video jobs or deployment without applicable authority. Prior approvals for unrelated work do not extend to these actions.
10. End with a concise **verified** status: shipped locally/staging/live; passed tests; failed tests; money spent; changes not made; approvals needed; next safe task.

## Required acceptance outputs
- `reuse-register.md`, `product-portfolio.md`, `tenant-and-event-contracts.md`, `experiment-registry.md`, `metrics-dictionary.md`, `risk-and-approval-matrix.md`, `pilot-missed-call-e2e.md`, `customer-experience-storyboard.md`, `launch-readiness-checklist.md`, `source-receipts/`, plus code/tests where approved.
- A reliable mapping back to all 25 original experiments, plus five specialised pilots, with why each was grouped or deferred.
- Functional founder dashboard or non-production prototype with **source-backed** data, explicit synthetic fixtures and visible freshness/failure states.
- Reproducible commands and environment prerequisites; provider credentials represented as configured/unconfigured, never copied into documents.

## Handover principles
Discovery before build. Reuse before create. Governance before autonomy. Data before AI. Revenue before expansion. Evidence before opinion. Verification before completion. Human authority before irreversible execution. Do not report “done” unless the approved target is truly live and independently verified.

---

# 22. Source register and unresolved assumptions
**Known repository:** `https://github.com/CleanExpo/Unite-Group` (inspected earlier this conversation via connected GitHub).  
**Prior research:** `UNITE_GROUP_AGENTIC_INCOME_LAB_VIDEO_RESEARCH_AND_25_EXPERIMENTS_2026-10-25.md`, existing Living Business Card master specification v2.1.4, Customer Continuity research addendum.  
**Original video:** `https://www.youtube.com/watch?v=JhyVSrQPVSg` (third-party full transcript not verified; no direct quotations to be treated as primary-source evidence).  
**Commercial market fit:** unverified; requires prospect interviews, customer trials, pricing tests and collection evidence.  
**Live code state:** repo inspection alone does not verify deployment or production schemas.  
**Provider account rights:** must be confirmed for each connected client and for Higgsfield, HeyGen, Artlist, voice, telephony, email, Stripe and review providers.  
**Funding:** no provider calls generating billable assets authorised by this document.  
**Public product naming:** internally proposed; founder must approve customer-facing brand labels and service terms.

**Owner decision requested at first material gate:** which founder-controlled business can serve as the authorised live missed-call pilot, the call-recording/phone provider and maximum spend. All prerequisite read-only and sandbox work proceeds without needing those answers.
