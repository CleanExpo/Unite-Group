# Margot Marketing Strategy Operating Model

Date: 2026-05-23 07:33 AEST
Last update: 2026-06-10 06:30:00 AEST — Senior PM AI-RET-001 15th answer-shape fixture (marketing-strategy boundary) + marketing-strategy doc-drift guard lane: bound this doc to the mocked answer-shape harness so a future answer about marketing strategy must cite this doc, `src/lib/crm/qualify-lead.ts`, `docs/margot/crm-operating-model.md`, and `docs/margot/ai-enhancement-candidate-register.md`, and must include the 9 required answer-shape phrases and zero of the 9 prohibited overclaim phrases enumerated in the matching `AI-RET-001-ANSWER-MARKETING-STRATEGY-BOUNDARY` fixture (any third-party connector platform phrase is rejected). No code, schema, live retrieval, live embedding backfill, campaign launch, public publish, GBP mutation, paid spend, budget change, client-facing send, or third-party connector-platform action is implied by this lane.
Previous refresh: 2026-06-09 14:13 AEST
Project: Unite-Group
Owner: Margot
Scope: Existing repo/docs/code evidence only. No campaigns are launched and no client-facing messages are sent by this doc lane.

## AI-RET-001 Marketing-Strategy Citation Contract (bound to AI-RET-001-ANSWER-MARKETING-STRATEGY-BOUNDARY)

This operating model is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 15th answer-shape fixture `AI-RET-001-ANSWER-MARKETING-STRATEGY-BOUNDARY` (bound to the existing `AI-RET-001-USE-EXISTING-ASSETS` source-citation fixture; no source-citation union member added). A future answer-shape answer about marketing strategy must satisfy all of the following:

- The 9 required phrases (case-insensitive) are present in this doc:
  - `use existing assets first` (Connected Teams rulebook + access-and-data-requirements least-privilege posture).
  - `recommendation-only qualification` (the `qualifyLead` helper returns a band, score, reasons, and operatorNotes, never a write).
  - `campaign approval-gated` (no campaign launch, no GBP mutation, no paid spend, no public publishing, no budget change, no email/SMS send without Phill or board sign-off).
  - `lead auto-conversion remains blocked` (lead-to-client conversion is recommendation-only and requires identity review + board-approved conversion rules; see `docs/margot/lead-to-client-conversion-plan.md`).
  - `forecast-only` (marketing-attached opportunities are forecast, not billing truth; Stripe remains the source of billing/revenue).
  - `context separation` between CCW / RestoreAssist / Synthex / DR-NRPG / CARSI / Home Loan Essentials / Dimitri ITR / Vision work until strong identity evidence says otherwise.
  - `no cross-client copy reuse without identity` (no reuse without client/business identity, brand voice, source license/confidentiality, approval status, and sensitive-data check).
  - `no new vendor` (no third-party connector platform, no new paid SaaS without explicit Phill approval).
  - `local evidence only` (no live vector search, no live embedding backfill, no live AI call — the AI-RET-001 local harness is mocked/static).
- The 4 required citations are present in this doc:
  - `docs/margot/marketing-strategy-operating-model.md` (this doc).
  - `src/lib/crm/qualify-lead.ts` (the recommendation-only lead scoring helper).
  - `docs/margot/crm-operating-model.md` (the broader CRM operating loop, including lead-to-client conversion and identity review).
  - `docs/margot/ai-enhancement-candidate-register.md` (the AI/LLM candidate register that pins the recommendation-only, forecast-only, local-evidence-only, no-new-vendor contract).
- The 9 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint` heading):
  - Any wording that claims a campaign has been launched, that email was sent automatically, that a lead was auto-converted into a client, that a client record was created from marketing, that a Google Business Profile was mutated, that paid spend was committed, that public publishing was approved, that the marketing budget was changed, or that a third-party connector platform was used is rejected before command-center surfacing. A doc-drift guard test in `tests/unit/lib/margot/retrieval-evaluation.test.ts` enforces this so a future draft cannot quietly mark this lane as auto-launched, auto-sent, auto-converted, GBP-mutated, paid, published, budgeted, or connector-platform-handled. The exact prohibited substrings and their precise spelling are listed in the matching Senior PM verification checkpoint below and enforced by the harness, not by ad-hoc prose in this section.

The `## AI-RET-001 Marketing-Strategy Citation Contract` section above IS the assertion section the doc-drift guard scans. The 9 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's `## Out of Scope` wording) so the assertion-section regex check (which excludes the `## Senior PM verification checkpoint` body) stays green.

## Purpose

Marketing strategy is a CRM-connected growth function. Margot should connect ICP, offers, SEO/content, campaigns, lead capture, follow-up tasks, client memory, and performance learning into the same operating loop used for clients and projects.

Primary inputs:

- `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md`
- `docs/margot/crm-operating-model.md`
- `docs/margot/crm-schema-inventory.md`
- `src/app/api/marketing/leads/route.ts`
- `src/app/api/crm/leads/route.ts`
- `supabase/migrations/20260523100000_crm_leads.sql`
- `src/lib/crm/qualify-lead.ts`
- `src/lib/crm/daily-digest.ts`
- `src/lib/margot/retrieval-evaluation.ts`
- `docs/margot/MARGOT-COMMAND-CENTER.md`

## Marketing-to-CRM loop

```text
Market signal / content idea / campaign result
  -> identify business/client/campaign/source
  -> attach ICP/offer/content/channel context
  -> create or update lead/contact/opportunity/task/activity
  -> decide follow-up: auto, draft, ask Phill, block, never
  -> verify evidence and source labels
  -> update client 2nd Brain and project portfolio
  -> surface in command center / morning report
```

The loop is now wired into repo-local evidence on every transition except "publish/send" (which is approval-gated by design):

- "create or update lead": `src/app/api/marketing/leads/route.ts` persists to `crm_leads` via `supabase/migrations/20260523100000_crm_leads.sql` and is covered by `tests/integration/api/marketing-leads.test.ts`.
- "decide follow-up": `src/lib/crm/qualify-lead.ts` is a pure, recommendation-only helper that returns a band/score/reasons/operatorNotes set; it never writes or auto-converts and is covered by `tests/unit/lib/crm/qualify-lead.test.ts`.
- "verify evidence and source labels": `src/lib/margot/retrieval-evaluation.ts` mocks seven source-citation and seven answer-shape fixtures; the `AI-RET-001-ANSWER-DIGEST-OPERATOR-ONLY` fixture constrains digest/marketing summaries to stay operator decision support only and forbid overclaim.
- "surface in command center / morning report": `src/lib/crm/daily-digest.ts` and `src/app/api/crm/daily-digest/route.ts` read recent leads, workspace-scoped CRM tasks, and (feature-flagged) opportunities; covered by `tests/unit/lib/crm/daily-digest.test.ts` and `tests/integration/api/crm-daily-digest.test.ts`.

## Current verification checkpoint — 2026-06-09 14:13 AEST

Senior PM read-back:

- What already exists: `crm_leads` table + service-role RLS, `marketing/leads` route + list route, `qualifyLead` recommendation-only helper, daily-digest helper, command-center approval/lead visibility, AI-RET-001 mocked answer-shape gate, current CRM schema/test-matrix, current Mac Mini recovery surfaces, current progress/morning reports.
- What has started: a docs-only refresh of this operating model so marketing strategy guidance stays aligned with the current CRM operating loop. No campaign launch, paid spend, GBP mutation, public publish, lead auto-conversion, or client-facing send is implied by this lane.
- Why it exists / friction reduced: the marketing operating model had not been refreshed since 7:33 May 23, before the deterministic qualification helper, daily-digest helper, and AI-RET-001 mocked answer-shape gate existed; future agents risk recreating older "manual send to SendGrid" guidance that no longer reflects the local CRM-first lead capture contract.
- Missing / unclear: production `crm_leads` migration has not been applied to the live target Supabase environment from this lane; IP/user-agent privacy retention decision is still a gap; pipeline stages, auto-conversion rules, and campaign/source labels are not yet formalised; Mac Mini artifacts are not recovered; sandbox authority/auth for voice/task DB validation is still gated.
- Current health evidence: see `docs/margot/MARGOT-COMMAND-CENTER.md` Health Check Snapshot, `docs/margot/crm-test-coverage-matrix.md` deterministic integration-health section, and the most recent tick in `docs/margot/overnight-progress-log.md`.
- Mac Mini checkpoint: `/Volumes` contains only `Macintosh HD`, recovered Markdown count is `0`, SMB/File Sharing reachable, SSH unreachable; no credential prompt/read, secret printing/storage, or recursive system-volume scan occurred.
- Smallest useful next action: keep the marketing operating model aligned with the deterministic CRM operating loop and rotate to the next bounded Senior PM lane unless a production marketing campaign or pipeline-stage decision is opened by Phill.

## Canonical marketing fields

Until formal tables exist, these are the fields Margot should preserve in docs, lead records, tasks, or future CRM objects:

```yaml
strategy_identity:
  business_slug:
  client_slug:
  campaign_slug:
  source_doc:
audience:
  icp:
  buyer_roles:
  geography:
  pain_points:
  urgency_triggers:
offer:
  offer_name:
  value_proposition:
  offer_ladder_stage: awareness|lead_magnet|consult|proposal|retainer|upsell|renewal|unknown
  proof_assets:
content:
  topic:
  search_intent:
  target_keywords:
  content_type: landing_page|service_page|blog|email|ad|social|proof_video|proposal|unknown
  status: idea|briefed|drafted|approved|published|measured|retired
campaign:
  channel:
  start_date:
  owner:
  budget_or_effort:
  approval_gate:
conversion:
  primary_cta:
  form_or_route:
  crm_follow_up_rule:
  lead_source:
performance:
  traffic:
  leads:
  qualified_leads:
  conversion_rate:
  revenue_attribution:
  confidence:
learning:
  observed_signal:
  next_test:
  retired_assumptions:
```

These map onto current repo objects:

- `crm_leads.source`, `crm_leads.referral_source`, `crm_leads.interests`, `crm_leads.marketing_consent`, and `crm_leads.assigned_owner` already carry campaign/source/audience/offer identity for website-form intake.
- The lead-list route at `src/app/api/crm/leads/route.ts` filters by `status`, `owner`, `source`, and `limit`, so future campaign rollups can read the same column set.
- The `qualifyLead` helper consumes `email`, `company`, `jobTitle`, `message`, `interests`, `referralSource`, and `marketingConsent`, so any campaign/source/copy change can be validated locally without redoing the contract.

## Lead follow-up rules

Current local evidence:

- Public marketing submissions enter through `src/app/api/marketing/leads/route.ts`.
- Local migration `supabase/migrations/20260523100000_crm_leads.sql` defines `crm_leads` with `source`, `status`, `interests`, `referral_source`, `marketing_consent`, `assigned_owner`, match/conversion fields, and privacy-sensitive IP/user-agent fields. RLS is service-role only; authenticated reads are intentionally conservative.
- The lead-list route at `src/app/api/crm/leads/route.ts` exposes recent leads for admin/service-role callers with optional `status`, `owner`, `source`, and `limit` filters, and is covered by `tests/integration/api/crm-leads-list.test.ts`.
- `src/lib/crm/qualify-lead.ts` is a pure, recommendation-only scorer with bands `needs_review | qualified | nurture | spam_risk`, and always returns at least one `operatorNotes` entry stating "Recommendation only: do not auto-convert or overwrite CRM identity from this score." The `qualified` band explicitly says it is not approval to create a client record, and `spam_risk` says do not discard automatically; review safely.
- SendGrid is a side integration, not the CRM source of truth, and SendGrid failure is intentionally non-fatal in the lead route so leads are never lost at the boundary.

Safe default follow-up:

1. Persist the lead in CRM first where migration is applied.
2. Attach source/campaign/referral/interests if present.
3. Do not treat SendGrid subscription as proof of CRM capture.
4. Use `qualifyLead` as a recommendation only; auto-conversion is not authorised.
5. Create a follow-up task when lead quality or urgency is high enough under approved criteria.
6. Surface new/qualified/blocked leads in the morning report.
7. If identity matches an existing client/business, require strong-key verification before linking.

## Marketing outputs as CRM activities/tasks

Marketing work should become durable CRM objects:

| Marketing output | CRM/memory object | Required evidence |
| --- | --- | --- |
| Website lead | `crm_leads` row | route response, lead id, source, consent status |
| Lead qualification | `qualifyLead` recommendation | band, score, reasons, operatorNotes, never auto-applied |
| Content brief | task + artifact | business/client identity, audience, offer, approval gate |
| Service/location page recommendation | task or approval | source signal, confidence, risk, no-go policy |
| Campaign launch plan | project/task | owner, channel, budget/effort, approval status |
| Client-facing copy | draft artifact only until approved | client identity, source docs, human approval before send |
| SEO/content performance signal | activity/event or digest row | provider/source, date, metric, confidence |
| Learning from performance | 2nd Brain update | what changed, why, next test |

## Context separation rules

Keep these contexts separated unless strong identity evidence says otherwise:

- CCW CRM / UNI-2053 product category work.
- RestoreAssist / Brand OS / UNI-2054 command-center and content-index recovery.
- Synthex automation/marketing-intelligence layer.
- DR/NRPG service-area and contractor-network command-center work.
- CARSI course/content work.
- Home Loan Essentials / Duncan / Dimitri ITR platform.

No cross-client copy reuse without checking:

1. client/business identity;
2. source license/confidentiality;
3. brand voice;
4. approval status;
5. whether sensitive data appears in the draft.

## Approval boundaries

Margot may auto-create or update local marketing docs, internal briefs, and mock-tested helpers.

Margot must draft first or ask before:

- sending emails/messages to leads or clients;
- publishing pages/posts/ads;
- changing budgets;
- mutating Google Business Profile, Search Console, Vercel env, or production systems;
- merging lead/client identities;
- using client-sensitive data in marketing material;
- defining permanent pipeline/conversion rules.

The AI-RET-001 mocked answer-shape gate explicitly rejects any operator summary that claims a digest was sent to a client, published publicly, scraped production data, sent email automatically, mutated CRM records, or used a new connector platform. The same gate applies in spirit to marketing recommendations even when AI summarisation is not in the loop.

## DR/NRPG marketing model from existing packet

`docs/dr-nrpg-service-area-command-center-2026-05-20.md` defines a useful template:

- represent DR/NRPG as online-first service-area/contractor-network, not storefront-location;
- surface demand, contractor coverage, pages needing evidence/QA/publish, GBP/API blockers, budget cap usage, review/reputation signal;
- Synthex drafts updates/replies and proposes decisions;
- Unite-Group remains the control surface and does not directly publish, spend, or mutate GBP without approvals;
- no fake locations, no phone-first assumption, no keyword-stuffed GBP names, no unapproved public publishing.

Apply that pattern to other marketing lanes: source signal, draft/recommend, approval gate, verified publish/measure loop.

## Digest questions

Every morning marketing digest should answer:

```text
What new leads arrived?
Which source/campaign did they come from?
Which leads need Phill's attention?
Which content/campaign tasks moved?
Which approvals are blocked?
Which performance signals changed strategy?
Which client/business context is missing or ambiguous?
```

The current `src/lib/crm/daily-digest.ts` helper already renders lead-id labels, stable source labels, and operator-readable stale-integration copy; the marketing summary above maps to its summary/operator-priorities/approvals/blockers sections.

## Immediate next implementation steps

1. Keep `crm_leads` migration application gated behind the sandbox-first wizard; do not run `apply`/`status`/`diff`/`sync`/`setup`/`reset`/`promote` against prod without explicit authority and auth.
2. When the lead-to-client conversion route lands, attach a `campaign_slug` / `source_label` to every converted client and lead-derived opportunity so digest rollups can stay source-aware.
3. When new campaign tracking fields are needed, prefer adding columns to `crm_leads` and the future `crm_opportunities` over a separate analytics table; the digest reader already filters on `crm_leads.source`.
4. Use `src/lib/crm/qualify-lead.ts` for any new lead scoring surface and keep its recommendation-only contract; the helper's operatorNotes are the de facto safe-default copy for digest and command-center.
5. Keep all client-facing marketing drafts approval-gated and AI-RET-001 constrained; the mocked answer-shape gate is the unit-testable contract for the boundary.
6. Continue Mac Mini artifact recovery opportunistically only; otherwise treat CCW/RestoreAssist/Synthex/DR-NRPG/CARSI/Home Loan Essentials as context-separated, source-labeled, and approval-gated lanes.

## Reporting requirements

Every marketing/CRM touchpoint that this operating model implies must append evidence to `docs/margot/overnight-progress-log.md`:

```text
Lane:
Stage moved from -> to:
Files changed:
Verification:
Risks/approval gates:
Adopted, parked, or retired:
```

## Senior PM verification checkpoint (2026-06-10 06:30:00 AEST)

- What exists: this marketing-strategy operating model is now bound to the mocked, local AI-RET-001 retrieval-evaluation harness via the 15th answer-shape fixture `AI-RET-001-ANSWER-MARKETING-STRATEGY-BOUNDARY` (bound to the existing `AI-RET-001-USE-EXISTING-ASSETS` source-citation fixture; no source-citation union member added). The new fixture pins the marketing-strategy contract: 9 `requiredAnswerPhrases` (`use existing assets first`, `recommendation-only qualification`, `campaign approval-gated`, `lead auto-conversion remains blocked`, `forecast-only`, `context separation`, `no cross-client copy reuse without identity`, `no new vendor`, `local evidence only`) and 4 `requiredCitationSources` (`docs/margot/marketing-strategy-operating-model.md`, `src/lib/crm/qualify-lead.ts`, `docs/margot/crm-operating-model.md`, `docs/margot/ai-enhancement-candidate-register.md`); 9 `prohibitedAnswerPhrases` reject the most common overclaims (`campaign launched`, `email sent automatically`, `lead auto-converted`, `client record created from marketing`, `gbp mutated`, `paid spend committed`, `public publishing approved`, `budget changed`, `nango`). The 7th doc-drift guard in the retrieval suite reads this doc from disk, asserts all 9 `requiredAnswerPhrases` are present (case-insensitive), asserts all 4 `requiredCitationSources` are present (case-sensitive), and asserts none of the 9 `prohibitedAnswerPhrases` appear in the assertion section (everything before this `## Senior PM verification checkpoint` heading).
- What has started: 2026-06-10 06:30:00 AEST marketing-strategy control-surface refresh + 15th answer-shape fixture + doc-drift guard. No code, schema, migration, live retrieval, live embedding backfill, live AI call, campaign launch, public publish, GBP mutation, paid spend, budget change, client-facing send, or Nango / third-party connector-platform action is implied by this lane.
- Why it exists: the prior `marketing-strategy-operating-model.md` (last touched `2026-06-09 14:13 AEST`) was the longest-pinned still-stale Senior PM control surface (it had not been re-bound to a doc-drift guard since the May 23 07:33 AEST origin) and the morning report explicitly named it as a next-safe-gap rotation target. This lane closes the gap and prevents regression.
- Missing/unclear: pipeline stages, auto-conversion rules, campaign/source labels, and IP/user-agent retention policy are still unformalised and remain recorded in the prior `## Current verification checkpoint — 2026-06-09 14:13 AEST` block.
- Current health evidence: focused retrieval gate (after this lane) `npx jest tests/unit/lib/margot/retrieval-evaluation.test.ts --runInBand` should report 1 suite / 53 tests PASS (was 50 before this lane; +3 from the new pass + reject + doc-drift guard tests). Combined local CRM + Margot + runtime + credential-boundary gate should report 11 suites / 177 tests PASS (was 11 suites / 174 tests before this lane; +3). AI-RET-001 evidence report should report `overallStatus=pass; source=8/8; answerShape=15/15; readback=pass; safetyNotes=true; nextSafeAction=true` (was 14/14 before this lane). `npm run type-check` and `npm run security:routes-check` are unchanged.
- Out of scope (matches the 9 prohibited overclaim phrases): no campaign launched, no email sent automatically, no lead auto-converted, no client record created from marketing, no GBP mutated, no paid spend committed, no public publishing approved, no budget changed, no Nango or third-party connector-platform action. The doc-drift guard enforces this so a future draft cannot quietly mark this lane as auto-launched, auto-sent, auto-converted, GBP-mutated, paid, published, budgeted, or connector-platform-handled.
- Mac Mini checkpoint: `/Volumes` contains only `Macintosh HD`, recovered Markdown count is `0`, SMB/File Sharing reachable, SSH unreachable; no credential prompt/read, secret printing/storage, or recursive system-volume scan occurred. Recovery remains opportunistic only.
- Smallest next action: when a real marketing strategy change is needed, add a new fixture to `MARGOT_RETRIEVAL_ANSWER_SHAPE_FIXTURES` (or a new entry in the source-citation `MARGOT_RETRIEVAL_EVALUATION_FIXTURES` if the change is a new query-intent) first, then run the focused Jest gate, then update this doc with the new fixture id. Until then, keep the 15-fixture answer-shape gate and the 8-fixture source-citation gate green on every Senior PM tick.
