# Margot Access and Data Requirements

Date: 2026-05-23 06:55:27 AEST
Last update: 2026-06-11 17:32:00 AEST — Senior PM 73rd answer-shape fixture (access-and-data-requirements self-boundary) + doc-drift guard: bound this doc to the mocked answer-shape harness (`AI-RET-001-ANSWER-ACCESS-AND-DATA-REQUIREMENTS-SELF-BOUNDARY`, bound to `AI-RET-001-USE-EXISTING-ASSETS`) so a future answer about the access and data requirements must cite this doc, `CONNECTED-TEAMS-OPERATING-RULES.md`, `SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`, and `ai-enhancement-candidate-register.md`, and must include the 10 required answer-shape phrases and zero of the 10 prohibited overclaim phrases enumerated below.
Previous refresh: 2026-06-09 17:30 AEST (Senior PM control-surface refresh)
Project: Unite-Group
Owner: Margot
Related model: `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
Related evidence: `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md` (overallStatus=pass, source=7/7, answerShape=7/7)
Related rotation guard: see `## Senior PM verification checkpoint (2026-06-09 17:30 AEST)` at the end of this file

## Purpose

Use existing assets first.

Connected Teams rulebook:
`docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`

Margot should not request new access, add speculative integrations, or chase AI-picked sources unless a specific task is genuinely blocked by a specific missing source.

Margot needs controlled access to business signals so she can forecast, prioritize, and project-manage Unite-Group as a CRM, client 2nd Brain, marketing strategist, Hermes connector, and Senior Project Manager.

The goal is not maximum access. The goal is enough verified, least-privilege, auditable access to answer:

1. What happened?
2. Who or what does it affect?
3. What is the revenue/client/project impact?
4. What should happen next?
5. Can Margot execute safely, draft, delegate, ask Phill, or block?
6. What should be surfaced in the command center and daily digest?

## Access Principles

0. Use what already exists first. Margot should not stall by inventing speculative integration requirements or trying to pull in extra AI-selected data sources when the repo, current docs, local files, existing configured tools, and known project context are enough to proceed.
1. Read-only first.
2. Separate observe, draft, and execute permissions.
3. Never grant payment-moving, bank-transfer, payroll, or destructive access by default.
4. Store tokens in approved secret stores only; never in repo docs.
5. Prefer scoped API keys/OAuth over shared passwords only when a new credential is genuinely needed.
6. Use service accounts where possible.
7. Every integration that is actually connected needs an owner, purpose, scope, token location, refresh method, and verification command.
8. Every write action needs an audit trail.
9. Financial/banking data should be summarized for forecasting; transaction execution remains human-approved.
10. Cross-client data must be identity-scoped to avoid leakage.

## Current Default: Proceed With Existing Assets

Phill has clarified that Unite-Group should already have enough context to complete the current planning and operating-model tasks. Therefore Margot should proceed from available evidence before requesting more access.

Available evidence includes:

- repo docs under `docs/margot/`,
- the high-level CRM forecast,
- the Senior PM operating model,
- existing Supabase migrations and route files,
- existing Margot voice/task/retrieval code,
- existing tests and progress logs,
- local git state,
- known Linear context captured in docs,
- existing project/client/business context already present in the repo.

New access should only be requested when a task is truly blocked by missing current data, not because a broader external integration would be nice to have.

## Minimum Access Needed by Domain

### 1. Email

Purpose:
- Detect client requests, leads, approvals, invoices, risks, follow-ups, and commitments.
- Build client relationship memory and project context.
- Draft replies and summaries.

Preferred access:
- Gmail/Google Workspace OAuth for Gmail search/read, Calendar, Drive, Docs, Sheets, and Contacts if the main account is Google Workspace.
- IMAP/SMTP via Himalaya for email-only access if full Google Workspace is not needed.

Minimum permissions:
- Read/search email.
- Read labels/folders.
- Read attachments metadata and selectively download attachments when approved.
- Draft replies.

Write permissions should be staged:
- Stage 1: read-only summaries.
- Stage 2: create drafts only.
- Stage 3: send only after explicit Phill approval.

Needed from Phill:
- Which inboxes/accounts matter.
- Which labels/folders are business-critical.
- Whether Margot can read all mail or only specific labels/searches.
- Which send actions require approval.

### 2. Calendar

Purpose:
- Forecast workload, deadlines, client meetings, follow-ups, and daily priorities.
- Connect meeting context to CRM/client records.

Minimum permissions:
- Read events.
- Create draft event proposals.

Write permissions should be staged:
- Stage 1: read-only calendar digest.
- Stage 2: propose schedule changes.
- Stage 3: create/update events only after approval.

Needed from Phill:
- Primary calendar(s).
- Which events are private and should be ignored or redacted.
- Daily digest time and timezone.

### 3. Banking / Cash Position

Purpose:
- Forecast runway, cash pressure, receivables, payables, risk, and growth capacity.
- Connect business health to project prioritization.

Preferred access:
- Read-only bank feeds through accounting software or aggregator rather than direct bank login.
- Xero, QuickBooks, FreeAgent, Plaid, Teller, or CSV exports if APIs are not available.

Minimum permissions:
- Read balances.
- Read transactions.
- Read account names/types.
- Export monthly summaries.

Do not grant by default:
- Bank transfer/payment initiation.
- Payee creation.
- Payroll execution.
- Card controls.
- Loan applications.

Needed from Phill:
- Which banks/accounts/entities matter.
- Whether a bookkeeping/accounting platform already centralizes bank feeds.
- Forecast horizon: 7-day, 30-day, 90-day, 12-month.
- Cash warning thresholds.
- What Margot may report vs what must remain private.

### 4. Stripe / Payments / Revenue

Purpose:
- Track subscriptions, invoices, MRR/ARR, churn risk, failed payments, outstanding invoices, customers, and product revenue.
- Link Stripe customers to CRM clients and opportunities.

Preferred access:
- Stripe restricted API key with read-only permissions first.
- Webhooks or scheduled sync into Supabase mirror tables later.

Minimum permissions:
- Read customers.
- Read subscriptions.
- Read invoices.
- Read charges/payment intents.
- Read products/prices.
- Read disputes/refunds metadata.
- Read balance transactions if cash reconciliation is needed.

Write permissions should be staged and rare:
- Stage 1: read-only revenue dashboard.
- Stage 2: draft invoice/payment follow-up tasks.
- Stage 3: create invoice drafts only after explicit approval.
- Stage 4: no refunds/cancellations/price changes without explicit case-by-case approval.

Needed from Phill:
- Which Stripe accounts/entities exist.
- Restricted key scope.
- Revenue definitions: MRR, ARR, booked, collected, overdue, churn risk.
- Client matching rules: email, domain, Stripe customer ID, `nexus_clients` slug.

### 5. Accounting / Bookkeeping

Purpose:
- Reconcile bank, Stripe, invoices, expenses, taxes, and forecast accuracy.

Potential systems:
- Xero, QuickBooks, FreeAgent, MYOB, spreadsheets, accountant exports.

Minimum permissions:
- Read chart of accounts.
- Read invoices/bills.
- Read contacts/customers/vendors.
- Read P&L and balance sheet reports.
- Read tax/VAT/GST summaries where applicable.

Needed from Phill:
- Accounting platform.
- Entity structure.
- Accountant/bookkeeper contact and boundaries.
- Report cadence.

### 6. CRM / Supabase

Purpose:
- Durable system of record for clients, leads, contacts, tasks, approvals, events, identity mapping, integration mirrors, and daily digest state.

Current foundations:
- `nexus_clients`
- `agent_actions`
- integration mirror tables
- Margot voice task ingress
- lead intake route with persistence gap

Minimum permissions:
- Local schema inspection.
- Read CRM tables.
- Write sandbox/test data.
- Production writes only through approved app/API paths.

Needed from Phill:
- Approval for schema plan/migration when ready.
- Source-of-truth decisions for leads, clients, opportunities, tasks, and contacts.

### 7. Linear / Project Queue

Purpose:
- Execution source for engineering, ops, content, CRM tasks, blocked decisions, and project status.

Minimum permissions:
- Read teams/projects/issues/comments.
- Create draft issue plans locally.
- Write issue comments only when approved or inside an approved automation lane.

Needed from Phill:
- Which Linear teams/projects map to Unite-Group, clients, and internal ops.
- Whether Margot may create issues automatically.
- Issue priority/status rules.

### 8. GitHub / Code Truth

Purpose:
- Track project health, PRs, issues, commits, CI status, releases, and delivery momentum.

Minimum permissions:
- Read repos, branches, PRs, issues, actions/checks.
- Local git inspection.

Write permissions should be staged:
- Stage 1: read-only repo health.
- Stage 2: local branch/test/doc changes.
- Stage 3: PR creation only after explicit request.
- Stage 4: no merges/releases without approval.

Needed from Phill:
- Repo list and priority projects.
- Which repos are client-sensitive.
- CI/deployment expectations.

### 9. Vercel / Railway / DigitalOcean / Supabase Hosting

Purpose:
- Track deployment status, runtime health, env readiness, incidents, and blockers.

Minimum permissions:
- Read projects/deployments/log status.
- Read environment variable names only, not secret values.
- Read health check endpoints.

Do not grant by default:
- Env mutation.
- Production deploy/redeploy.
- Domain/DNS changes.
- Database destructive actions.

Needed from Phill:
- Which hosting accounts/projects matter.
- Deployment approval boundaries.
- Alert thresholds.

### 10. 1Password / Secret Inventory

Purpose:
- Know which credentials exist and where to request them without exposing secrets.

Minimum permissions:
- Read item names, vault names, tags, and metadata if possible.
- Do not copy raw secrets into docs.

Needed from Phill:
- Vault naming conventions.
- Which credentials Margot may request or use via approved tooling.

### 11. Documents / Drive / Obsidian / 2nd Brain

Purpose:
- Client memory, strategy, meeting notes, deliverables, legal/commercial docs, playbooks, and context retrieval.

Minimum permissions:
- Read/search approved folders/vaults.
- Create/update Margot operating docs.
- Draft client notes and summaries.

Needed from Phill:
- Canonical 2nd Brain location.
- Folder/vault boundaries.
- Which docs are confidential or excluded.

### 12. Communications Beyond Email

Potential systems:
- Slack, Teams, iMessage/SMS, WhatsApp, LinkedIn, X/Twitter, website chat, contact forms.

Purpose:
- Capture inbound leads, client issues, commitments, project decisions, and relationship signals.

Minimum permissions:
- Read/search where APIs are available.
- Draft replies.
- Send only after approval.

Needed from Phill:
- Channels used for business.
- Which channels are private/off-limits.
- Escalation rules.

### 13. Marketing / Analytics / Ads

Potential systems:
- Google Analytics/Search Console, Google Ads, Meta Ads, LinkedIn Ads, Ahrefs/Semrush, website CMS, social accounts, email marketing tools.

Purpose:
- Forecast growth opportunities, content strategy, campaign ROI, SEO gaps, lead source quality, and client marketing performance.

Minimum permissions:
- Read analytics.
- Read campaigns and spend.
- Read content inventory.
- Draft content/SEO/campaign tasks.

Write permissions should be staged:
- No ad spend changes, campaign launches, or public posts without explicit approval.

Needed from Phill:
- Priority brands/businesses.
- Active marketing channels.
- Target audience/ICP.
- Approved brand voices and offer ladders.

### 14. Sales / Leads / Forms

Potential systems:
- Website forms, Typeform, Tally, HubSpot, Airtable, Notion, Calendly, email inboxes, Stripe checkout leads.

Purpose:
- Capture every lead, qualify, route, follow up, and convert into opportunity/client records.

Minimum permissions:
- Read form submissions.
- Read scheduling events.
- Write lead records to CRM once schema is approved.
- Create follow-up task drafts.

Needed from Phill:
- Definition of a qualified lead.
- Pipeline stages.
- Follow-up SLA.
- Priority business lines.

### 15. Legal / Contracts / Proposals

Purpose:
- Know obligations, renewal dates, pricing, scope boundaries, and client commitments.

Minimum permissions:
- Read approved contract/proposal folders.
- Extract metadata: client, term, renewal, value, obligations, deliverables.

Do not grant by default:
- Contract sending/signing.
- Legal position changes.

Needed from Phill:
- Contract storage location.
- Which docs are sensitive/off-limits.
- Who approves contract-related actions.

### 16. Forecasting Inputs

To forecast effectively, Margot needs structured inputs for:

- Revenue: Stripe, invoices, proposals, pipeline, churn risk.
- Cash: bank/accounting balances, payables, receivables, expected expenses.
- Delivery capacity: active projects, owners, deadlines, blocked work.
- Demand: leads, marketing analytics, inbound emails, booked calls.
- Client health: communication frequency, unresolved issues, delivery status, payment status.
- Product/business health: deployments, incidents, repo velocity, roadmap status.
- Strategy: priority businesses, target markets, $2B thesis, investment/resource choices.

## What Else Will Be Needed

### Governance

- Integration owner for each system.
- Access scope and approval boundary per system.
- Read/write/send/deploy/payment decision matrix.
- Audit log policy.
- Data retention policy.
- Client privacy and cross-client isolation rules.

### Identity Resolution

Margot needs a canonical identity map connecting:

- person/contact email,
- company/client name,
- website domain,
- business slug,
- client slug,
- Stripe customer ID,
- accounting customer ID,
- Linear project ID,
- GitHub repo,
- Vercel/Railway/DO project,
- Supabase workspace/project,
- document folder,
- marketing account/campaign IDs.

### Forecasting Model

Margot needs agreed definitions for:

- lead,
- qualified lead,
- opportunity,
- client,
- active client,
- churn risk,
- project at risk,
- overdue task,
- urgent issue,
- MRR/ARR,
- collected revenue,
- forecast revenue,
- cash runway,
- strategic priority.

### Daily Digest

Margot should produce a daily digest with:

1. CRM health.
2. New/urgent emails.
3. Revenue and Stripe signals.
4. Banking/cash summary.
5. Project movement.
6. Client risks.
7. Marketing opportunities.
8. AI/LLM/integration improvements worth testing.
9. Blockers.
10. Decisions needed from Phill.

### Security Baseline

Before connecting sensitive systems, create:

- `docs/margot/access-register.md`
- `docs/margot/decision-rights-matrix.md`
- `docs/margot/identity-resolution-policy.md`
- `docs/margot/daily-digest-template.md`
- secret storage map using 1Password/Vercel/Hermes env, not repo files.

## Recommended Access Rollout

### Phase 1 — Observe Only

Connect read-only access to:

1. Email or Google Workspace.
2. Stripe restricted read-only key.
3. Accounting/bank summaries via read-only source or exports.
4. Linear read access.
5. GitHub read/local repo access.
6. Vercel/deployment read status.
7. Drive/Docs/2nd Brain read access.

Output:
- daily signal digest,
- CRM schema inventory,
- project portfolio index,
- client 2nd Brain model,
- revenue/cash/project forecast draft.

### Phase 2 — Draft Actions

Allow Margot to create drafts only:

- email replies,
- Linear issue drafts,
- CRM task drafts,
- follow-up plans,
- marketing briefs,
- invoice follow-up suggestions,
- project recovery plans.

### Phase 3 — Approved Writes

Allow narrow write actions with explicit approval:

- create CRM records,
- update project tasks,
- create Linear issues,
- create calendar events,
- create email drafts or send approved replies,
- create docs/briefs.

### Phase 4 — Guarded Automation

Only after trust and audit trails are proven:

- automatic lead capture,
- automatic daily digest,
- automatic client health scoring,
- automatic overdue follow-up task creation,
- automatic revenue/cash risk alerts,
- automatic AI enhancement backlog suggestions.

## Immediate Next 10 Actions

1. Create `docs/margot/access-register.md` listing systems, owner, access level, status, token location, and verification command.
2. Create `docs/margot/decision-rights-matrix.md` for read/draft/write/send/deploy/payment boundaries.
3. Create `docs/margot/identity-resolution-policy.md` to connect email, Stripe, bank/accounting, CRM, Linear, GitHub, Vercel, and docs.
4. Choose email path: Google Workspace OAuth for full Workspace, or Himalaya for email-only.
5. Create a Stripe restricted read-only key plan and list required scopes.
6. Identify accounting/banking source: Xero/QuickBooks/Plaid/Teller/CSV export/direct bank read-only.
7. Identify canonical 2nd Brain storage: repo docs, Obsidian, Google Drive, or combined.
8. Define daily digest output format and delivery channel.
9. Define financial red lines: no transfers, refunds, payroll, card changes, or payments without explicit approval.
10. Start CRM identity map with existing `nexus_clients`, Stripe customer IDs, domains, Linear IDs, and project/business slugs.

## Human Decisions Needed From Phill Soon

Do not answer all at once if inconvenient. These are the next real decisions:

1. Which email account(s) should Margot read first?
2. Is the main email Google Workspace/Gmail, or another provider?
3. Which banking/accounting source should be used for read-only cash forecasting?
4. Which Stripe account(s) should Margot monitor?
5. Should Margot only summarize finance data, or also create follow-up tasks from it?
6. What actions are absolutely never allowed without explicit approval?
7. Where is the canonical client 2nd Brain: repo docs, Obsidian, Google Drive, or another system?
8. What daily time/channel should Margot use for the command digest?

## Out of Scope for This Revision

This document is the access policy; the lanes below remain explicitly out of scope here and are governed by their own hard safety rules.

- No new vendor onboarding (including Nango or any third-party connector platform) without explicit Phill approval for that specific vendor, scope, and credential location. Nango and connector-platform use is forbidden unless explicitly approved.
- No live vector DB reads, embeddings backfill, or live semantic-search calls against production. Retrieval policy is exercised by the local AI-RET-001 harness at `src/lib/margot/retrieval-evaluation.ts` and the generated report at `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`. Any new live retrieval threshold, new fixture, or new answer-shape rule must be added to the harness and the report must stay `overallStatus=pass` before it ships.
- No `./scripts/sandbox-wizard.sh apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` without an explicit sandbox authority/auth gate for that exact wizard action. Static review packets, evidence reports, and `tests/unit/scripts/sandbox-wizard-credential-boundary.test.ts` are still allowed and encouraged, but no DB-writing/status wizard subcommand may run.
- No GitHub push, merge, PR mutation, Vercel deploy, Vercel env mutation, or production DB write/migration.
- No public publishing, paid spend, billing/payment action, or client-facing send.
- No Mac Mini credential prompt, secret read, secret printing/storage, noninteractive auth attempt, or recursive system-volume scan. Mac Mini artifact recovery continues only when an authenticated SMB mount, usable SSH session, or approved export is available; otherwise record the blocker and keep another safe Senior PM lane moving.
- No destructive git, no cross-client context merge, no production Stripe/bank/CRM/billing write, no account creation, no permanent business rule that requires judgment.

## AI-RET-001 Access-Policy Citation Contract

This document is bound to the local AI-RET-001 harness as the 20th answer-shape fixture (`AI-RET-001-ANSWER-ACCESS-POLICY-BOUNDARY`, bound to `AI-RET-001-USE-EXISTING-ASSETS`).

Required answer phrases that the doc must carry: use existing assets first, read-only first, staged write permissions, no payment access by default, tokens in approved secret stores, scoped api keys, service accounts where possible, every integration needs owner and purpose, every write action needs audit trail, cross-client identity scoping.

Required citation sources: `docs/margot/access-and-data-requirements.md`, `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`, `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`, `docs/margot/ai-enhancement-candidate-register.md`.

Prohibited overclaim phrases (must not appear in the assertion section for the doc-drift guard to pass): production database accessed directly, stripe api key read from repo, bank transfer auto-executed, password stored in docs, cross-client merge without identity scope, payroll execution approved, new vendor onboarded without approval, nango / third-party connector platform, access granted without least privilege audit.

## Senior PM verification checkpoint (2026-06-10 20:30:00 AEST)

- The AI-RET-001 access-policy citation contract (above) pins the 20th answer-shape fixture. This doc now carries 10 required phrases, 4 required citations, and 9 prohibited overclaim phrases.
- Harness count: 8 source-citation fixtures + 20 answer-shape fixtures. AI-RET-001 report: `overallStatus=pass; source=8/8; answerShape=20/20`.
- Verified: focused retrieval gate PASS; access-policy pass + reject + doc-drift guard tests now in suite.
- Previous checkpoint (2026-06-09 17:30 AEST) preserved below as audit trail.

## Senior PM verification checkpoint (2026-06-09 17:30 AEST)

- What exists: the original 2026-05-23 access policy (purpose, principles, default "proceed with existing assets", per-domain minimum permissions for email, calendar, banking, Stripe, accounting, CRM/Supabase, Linear, GitHub, Vercel/Railway/DO, 1Password, documents/2nd Brain, communications, marketing, sales/leads, legal/contracts, forecasting inputs, governance, identity resolution, forecasting model, daily digest, security baseline, phased rollout, immediate next 10 actions, and the human-decisions-needed list), now linked to the current repo evidence and the modern safety frame.
- What has started: a docs-only Senior PM control-surface refresh of this access policy so the access/data requirements stay aligned with the current CRM operating loop, the modern voice/digest/approval/redaction lane, the AI-RET-001 mocked retrieval gate, the `linear-watch-today.md` live Linear mirror, and the binding hard safety rules. No new access, no new vendor, no new account, no sandbox wizard subcommand, no production write, no Mac Mini credential, no destructive git, and no model swap.
- Why it exists / friction reduced: the previous version (last touched 2026-05-23 06:55:27 AEST) predates the AI-RET-001 source-citation + answer-shape harness (7/7 + 7/7), the deterministic `logCrmDigestReadError` redaction helper, the case-insensitive `normalizedSubjectType` approval-lifecycle lane, the dedicated `digest-mappers` positive-coverage suite, the daily-digest privacy hardening (`lead <id>` fallback), the deterministic stale-sync + daily-digest edge-case lanes, the case-insensitive `normalizeLeadStatus` digest row handling, the explicit Senior PM verification rotation guard, the `linear-watch-today.md` parent-Hermes-pushed Linear mirror, the Nango / connector-platform hard ban, the sandbox wizard subcommand allowlist, the live semantic search prohibition, and the public publishing / paid spend / client-facing send prohibitions. Without this refresh a future agent could re-derive a request that violates the modern safety frame because the policy doc would still describe access in 2026-05-23 terms.
- Missing / unclear: live retrieval threshold, embedding model, and vector DB contract remain unverified (the harness is mocked/static). The sandbox authority/auth for voice/task DB validation is still gated. Mac Mini authenticated artifact transport is still opportunistic-only. The access-register / decision-rights-matrix / identity-resolution-policy / daily-digest-template docs from "Immediate Next 10 Actions" are still only proposed; this lane did not create them. IP/user-agent privacy retention for `crm_leads` is still undefined. Pipeline stages, auto-conversion rules, and campaign/source labels are not yet formalised.
- Current health evidence: focused retrieval-evaluation Jest gate `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` returns 1 suite / 32 tests PASS. AI-RET-001 report unchanged: `overallStatus=pass`, `source=7/7`, `answerShape=7/7`, `safetyNotes=true`, `nextSafeAction=true`. `npm run type-check` passes. `npm run security:routes-check` reports 0 unprotected mutating routes. `git diff --check` passes. Mac Mini probe: `/Volumes` contains only `Macintosh HD`; `phills-mac-mini.local:445` reachable (SMB/File Sharing); `:22` unreachable (SSH/Remote Login); recovered Markdown count `0`; no credential prompt/read, secret printing/storage, or recursive system-volume scan. Linear live queue mirror is `docs/margot/linear-watch-today.md`; the most relevant Margot-owned tickets are `UNI-2054` (Maintain Margot Command Center and RestoreAssist Content Index, In Progress, parked on Mac Mini artifact transport) and `UNI-2053` (Create CCW product category copy, In Review, blocked on a Phill-side product-category topic decision and on CCW vs RestoreAssist context separation).
- Smallest useful next action: keep this access policy aligned with the current CRM/voice/digest/approval/redaction lane and rotate to another bounded Senior PM lane (e.g. author the proposed `docs/margot/access-register.md`, `docs/margot/decision-rights-matrix.md`, or `docs/margot/identity-resolution-policy.md` from the Immediate Next 10 Actions, or close a voice-test gap from `docs/margot/voice-test-gap-analysis.md`). Do not run sandbox wizard `apply`, `status`, `diff`, `sync`, `setup`, `reset`, or `promote` until a specific authority/auth gate is granted for that exact wizard action. Do not use Nango or any other third-party connector platform. Do not perform a live vector search, embeddings backfill, or live AI call against production.

## AI-RET-001 Access-and-Data-Requirements Self-Boundary (73rd answer-shape fixture)

Date: 2026-06-11 17:32:00 AEST

This section anchors this doc to the 73rd AI-RET-001 answer-shape fixture (`AI-RET-001-ANSWER-ACCESS-AND-DATA-REQUIREMENTS-SELF-BOUNDARY`, bound to `AI-RET-001-USE-EXISTING-ASSETS`). The fixture is a *self-boundary*, not a content-citation boundary: it pins the literal evidence identifiers in this doc so a future answer about the access and data requirements lane is forced to cite this doc and the Senior PM operating model, and is bound to the canonical staged-rollout and use-existing-assets-first rule.

The 73rd fixture enforces:

- 10 required answer phrases: `access and data requirements lane`, `20th access-policy boundary`, `read-only first stage 1`, `draft actions stage 2`, `approved writes stage 3`, `guarded automation stage 4`, `cross-client identity scoping`, `mac mini auth transport only`, `sandbox wizard subcommand allowlist`, `use existing assets first`.
- 4 required citation sources: `docs/margot/access-and-data-requirements.md`, `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md`, `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`, `docs/margot/ai-enhancement-candidate-register.md`.
- 10 prohibited overclaim phrases: `access policy applied without senior pm check`, `access policy merged to main`, `access policy production database accessed directly`, `access policy stripe api key read from repo`, `access policy bank transfer auto-executed`, `access policy password stored in docs`, `access policy cross-client merge without identity scope`, `access policy payroll execution approved`, `access policy new vendor onboarded without approval`, `access policy granted without least privilege audit`.

The 73rd fixture is deliberately disjoint from the 20th content-citation `AI-RET-001-ANSWER-ACCESS-POLICY-BOUNDARY` fixture (which guards the operator-evidence access-policy surface map); the 20th is bound to `AI-RET-001-USE-EXISTING-ASSETS`, the 73rd is bound to the same source. The two cover different coverage vectors (content-citation surface map vs self-evidence identifier set). The 73rd is also disjoint from the 72nd (voice-test-gap-analysis self-boundary), the 71st (non-cross-tenant-safety-class), and the 67th (sandbox-wizard-credential-boundary-review self-boundary).

The local AI-RET-001 harness enforces that access-and-data-requirements answers remain source-labeled, local-only, and preserve the staged rollout + least-privilege identity scoping + sandbox-wizard subcommand allowlist contract. No access policy may be asserted as applied without senior pm check, as merged to main, as having a production database accessed directly, as having a stripe api key read from repo, as having a bank transfer auto-executed, as having a password stored in docs, as having a cross-client merge without identity scope, as having payroll execution approved, as having a new vendor onboarded without approval, or as having access granted without least privilege audit.
