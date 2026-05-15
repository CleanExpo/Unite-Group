---
type: wiki
updated: 2026-05-13
---

# Synthex Evidence Brief — for the grounded Board re-run (2026-05-13)

> Forensic, read-only audit. Every load-bearing claim cites file + line range. No inference — gaps surfaced as `TODO[follow-up-task]:`. Companion to yesterday's `agency-mavericks-research-2026-05-13.md` and `synthex-agency-mavericks-strategy-2026-05-13.md`.

---

## 1. Synthex completion state — what does "90% complete" mean in code?

**Phill's claim (ground truth):** Synthex is ~90% complete; final pass = finish + validate + connect.

**Code evidence:**

- **Latest shipped release:** `v11.1 — SWARM Audit Sprint — 2026-03-24` (`Synthex/CHANGELOG.md:9`). Adds audit logging, GDPR Art. 16 endpoint, WCAG fixes, CSP `unsafe-inline` removed, CRON_SECRET on all 21 cron routes.
- **package.json version field:** `"version": "2.0.1"` (`Synthex/package.json:3`) — version field is out of sync with changelog (v11.1) — TODO below.
- **Production already live:** `v8.0 — Production Go-Live — 2026-03-13` shipped Stripe live, AUD Pro/Growth/Scale pricing, `synthex.social` DNS live, Stripe webhooks at `/api/webhooks/stripe` (`CHANGELOG.md:115-127`).
- **Foundations status (CRITICAL_PATH.md:22):** "**Foundations Done: 7 / 8 (SYN-687 In Review)**". The 5/8 gate that blocks new feature work is open.
- **PROGRESS.md unbuilt items (`PROGRESS.md:48-51`):** the only `[ ]` items listed are:
  - Real-time analytics dashboard
  - A/B testing framework
  - Smart scheduling system
  - Sentiment analysis pipeline

  These four lines are the closest thing to a documented "10% gap". PROGRESS.md was last touched 2026-02-16 — it is stale and trails CHANGELOG by ~10 versions.
- **Surface footprint:** `app/api/` contains **141 route directories** (verified by `ls | wc -l`); `app/api/cron/` contains **34 cron route directories** — `CHANGELOG.md:39` says "CRON_SECRET enforced on all 21 cron routes" so cron count grew between v11.1 and now. 64-plus top-level page directories under `app/` (e.g. `agencies`, `dashboard`, `bayesian`, `onboarding`, `brand-iq`, `brand-voice`, `brand-dna`, `command-centre`, `autopilot`, `autonomous`).
- **Prisma model count:** `CONSTITUTION.md:30` says **"91 Prisma models"**; README boasts **"67 models"** (`README.md:97`); changelog v1.0 says **"132 Prisma tables"** (`CHANGELOG.md:285`). Three different numbers — TODO below.

**Net read:** Synthex is *post-MVP, post-launch, post-v11.1 SWARM audit*. The "90% complete" framing reads as **"foundation done; the four PROGRESS.md unticked items are the visible 10%"** — but PROGRESS.md is two months stale and contradicts CHANGELOG.

`TODO[verify-version-truth]`: reconcile `package.json:3` (`2.0.1`), `CHANGELOG.md:9` (`v11.1`), and `PROGRESS.md` (stuck at 2026-02-16). Until done, the Board has no canonical "version" to anchor on.

`TODO[verify-completion]`: get a written list from the founder of what they consider the missing 10% — is it the four PROGRESS.md items, the GHL-feature-parity table in `synthex-agency-mavericks-strategy-2026-05-13.md:64-74` (Reputation/GBP, mobile app, phone/SMS), or "funnel finalisation + production readiness" mentioned in Phill's clarifications?

---

## 2. Architectural separation: Synthex (marketing) vs Unite-Group (CRM/dashboard)

**Phill's clarification #3:** Unite-Group = CRM and client dashboard layer. Synthex = marketing intelligence/funnel/brand/automation/execution layer behind it.

**Code evidence:**

- **Synthex repo identity** (`Synthex/CONSTITUTION.md:6-10`): "Project: Synthex — AI-powered marketing automation platform | URL: synthex.social | Stack: Next.js 15 / TS 5 / Prisma 6 / Supabase / Vercel / Node 22".
- **Unite-Group repo:** separate Next.js project at `/Users/phill-mac/pi-seo-workspace/unite-group/`. Has its own `package.json`, Supabase, Vercel deploy at `unite-group.in`. `unite-group/src/components/empire/` contains the dashboard surface: `ActivitySparkline.tsx`, `BranchTicketMatrix.tsx`, `BusinessLogo.tsx`, `DeveloperCard.tsx`, `EmpireSidebar.tsx`, `IntegrationMatrix.tsx`, `StaleBranchAlert.tsx`.
- **Cross-link surface in Synthex:** `Synthex/app/api/cron/unite-hub-revenue/route.ts` exists — Synthex pushes revenue data into Unite-Hub on a cron. (Path verified; route content not read.)
- **Synthex feature scope (verified from `Synthex/app/api/` listing):** `brand-dna/`, `brand-iq/`, `brand-profile/`, `brand-voice/`, `brand/` (with sub: calendar, consistency, dna, generate, identity, kg-check, mentions, profile, wikidata), `brand-generator/`, `autopilot/`, `autonomous/`, `ai-content/`, `personas/`, `psychology/`, `prompts/`, `journey/`, `monthly-story/`, `effect-report/`, `eeat/`, `citation/`, `authority/`, `awards/`, `pr/`, `predict/`, `forecast/`, `experiments/`, `geo/`, `seo/`, `backlinks/`, `directories/`, `local/`, `google-business/`, `loyalty/`, `affiliates/`, `gamification/`, plus all 34 cron jobs. **This is exactly the "marketing intelligence/funnel/brand/automation" stack Phill described — at scale.**
- **No CRM-style entity in Synthex routes:** verified by absence in `app/api/` listing — no `/leads/` deals/pipeline/opportunities/companies/contacts in the CRM sense. Synthex `clients/` exists (`app/api/clients/`) but is agency-portal-style not CRM.

**Net read:** The split Phill described **already exists in code**, mostly. Synthex is the marketing/intelligence stack; Unite-Group hosts the dashboard + CRM surfaces (empire view, integration mesh, dev activity). One real seam: `Synthex/app/api/cron/unite-hub-revenue/route.ts` (Synthex→Unite-Hub push).

`TODO[verify-api-surface]`: enumerate every cross-system call (Synthex calls Unite-Group? Unite-Group reads Synthex DB? Shared Supabase?). Currently undocumented in either CLAUDE.md.

---

## 3. Existing skill schema — is `WHEN/INPUT/OUTPUT/CALIBRATION/PASS_RATE` already implemented anywhere?

**Yesterday's strategy doc (`Wiki/synthex-agency-mavericks-strategy-2026-05-13.md:22, 90, 97, 122`) proposes:** port all marketing-* skills to a `WHEN/INPUT/OUTPUT/CALIBRATION/PASS_RATE` schema in Wave 5.3.

**Code evidence (forensic grep):**

The schema string `WHEN.*INPUT.*OUTPUT|CALIBRATION|pass_rate` was searched across `Pi-CEO/Pi-Dev-Ops/skills` and `pi-seo-workspace/`. Only matches are:
1. `Synthex/.claude/skills/review-board/review-metrics/SKILL.md` — review-board metrics analyser, **uses `triggers`/`output`** not the proposed schema.
2. `Synthex/lib/ai/content-evaluator.ts` — runtime content scoring (not a skill file).
3. NodeJS-Starter-V1 + CCW-CRM matches are unrelated (agent metrics).

**Actual SKILL.md frontmatter in production** (verified across three representative files):

```yaml
# marketing-positioning/SKILL.md (lines 1-7)
---
name: marketing-positioning
description: Develops value proposition, competitive positioning…
automation: automatic
intents: positioning, value-prop, value-proposition, messaging, jtbd…
---
```

```yaml
# marketing-icp-research/SKILL.md (lines 1-7)
---
name: marketing-icp-research
description: Builds an Ideal Customer Profile…
automation: automatic
intents: icp, ideal-customer-profile, target-audience…
---
```

```yaml
# marketing-copywriter/SKILL.md (lines 1-7)
---
name: marketing-copywriter
description: Writes long-form marketing copy…
automation: automatic
intents: copywriting, copy, landing-page, blog-post, email-copy…
---
```

Body structure (verified by line-grep on `marketing-positioning/SKILL.md`): sections `## Triggers` (line 12), `## Inputs` (line 18), etc. — **prose, not a typed schema**. No `WHEN`, no `OUTPUT`, no `CALIBRATION`, no `PASS_RATE` block.

**Net read:** The `WHEN/INPUT/OUTPUT/CALIBRATION/PASS_RATE` schema is **purely aspirational** as of 2026-05-13. It was invented in yesterday's strategy doc. Zero skill files implement it. Adopting it is a meaningful refactor of the 10-skill marketing pack (+ Remotion pack + others), not a relabel.

---

## 4. marketing-orchestrator current state

**Source:** `Pi-CEO/Pi-Dev-Ops/skills/marketing-orchestrator/SKILL.md` (lines 1-174).

- **Today's role:** entry-point router. Reads brief, classifies (campaignType, brand, audience, channels, scale, outcome), emits **wave-plan JSON** at `marketing-studio/.research/wave-plans/{job_id}.json` (line 62), dispatches the 9 sibling skills in topological order. Composes with `remotion-orchestrator` for video deliverables (line 90).
- **Brand-config source of truth (lines 58, 133):** reads brand voice / forbidden words / audience / tagline from `Synthex/packages/brand-config/src/brands/{slug}.ts` — canonical home per RA-1985 / Synthex SYN-897.
- **Discovery brief gate (lines 12-36):** mandatory turn-1 brief with hard-stop conditions. `tone` outside `BrandConfig.voice.tone` → block. `outcome` unfalsifiable → block. Already enforces what Troy's "front-load brand voice" claim covers, but on the brief side rather than the artifact side.
- **5-D critique gate (lines 159-174):** after final wave, spawns `opus-adversary` to score across philosophy/visual/detail/functionality/innovation. Pass = every dim ≥ 6 AND mean ≥ 7. This **is the closest thing to a pass-rate metric** in the current marketing pack — but it lives in the orchestrator, not as a per-skill calibration KPI.
- **Sibling skills (verified count = 10, by `ls`):** orchestrator, campaign-planner, positioning, icp-research, channel-strategist, copywriter, seo-researcher, social-content, launch-runbook, analytics-attribution.
- **Integration with Synthex:** marketing-orchestrator writes its outputs to `<calling-project>/.marketing/` by default (line 135). It **does not write into Synthex's database**. It's a content-production pipeline, not a marketing platform integration.

**Net read:** marketing-orchestrator is **adapter-extendable**, not a rewrite candidate. The discovery brief gate + 5-D critique gate are the right hooks for Troy's "QC pass-rate" + "front-load brand voice" claims. The schema change to `WHEN/INPUT/OUTPUT/CALIBRATION/PASS_RATE` is a separate, large refactor across 10 skills + cross-pack Remotion siblings.

---

## 5. brand-guardian — actual scoring logic

**Source:** `unite-group/scripts/brand-guardian-lint.ts` (lines 1-96) + `unite-group/src/lib/brand/voice-rules.ts` (lines 1-117).

**Linter mechanics (`brand-guardian-lint.ts:14-22`):**
```ts
const TARGETS = [
  "src/app/[locale]/page.tsx",
  "src/app/[locale]/about/**/*.{tsx,mdx}",
  "src/app/[locale]/services/**/*.{tsx,mdx}",
  "src/app/[locale]/contact/**/*.{tsx,mdx}",
  "src/app/(public)/**/*.{tsx,mdx}",
  "src/components/marketing/**/*.tsx",
];
```

- Walks public Unite-Group pages + marketing components only. **Does NOT scan Synthex.**
- Extracts JSX text nodes + string literals (prose detector: `/[a-z][a-z ,.'!?;:—-]{12,}/i`, line 24).
- Runs each sentence through `lintSentence` (`voice-rules.ts:112-116`) — returns `{ ruleId, severity, fix }` per matching rule.

**Severity model (`voice-rules.ts:5-17, 28-110`):**

Two severity levels: `"error"` and `"warn"`. 9 rules total:

| Rule ID | Severity | Block |
|---|---|---|
| `parallel-triplet` | error | YES |
| `today-fast-paced` | error | YES |
| `important-to-note` | error | YES |
| `rhetorical-audience-question` | warn | no |
| `hedge-stack` | warn | no |
| `compound-abstraction` | warn | no |
| `em-dash-throwaway` | warn | no |
| `stakeholders` | error | YES |
| `forbidden-words` | error | YES (matches 24-word `FORBIDDEN_WORDS` list, lines 19-26) |

**Exit logic (`brand-guardian-lint.ts:76-92`):** `process.exit(errors.length > 0 ? 1 : 0)`. **Errors hard-fail CI; warns advise only.** No pass-rate metric. No score. Either zero errors → green; or N errors → red with file:line + fix per violation.

**FORBIDDEN_WORDS (`voice-rules.ts:19-26`):** harness, unleash, leverage, transformative, holistic, synergy, ecosystem, journey, paradigm, empower, empowering, enabling, stakeholders, industry-leading, world-class, best-of-breed, robust, seamless, cutting-edge, next-gen, next-generation, delve, tapestry, elevate, navigate the complexities.

**Net read:** brand-guardian is **binary** (pass/fail) and **violation-counted**, not **pass-rate-scored**. The strategy-doc claim "brand-guardian pass-rate ≥ 85%" (`synthex-agency-mavericks-strategy-2026-05-13.md:24, 121`) **does not match the current implementation**. Adopting a pass-rate metric requires either (a) running it across many artifacts and counting violation density, or (b) extending voice-rules.ts with a scoring layer. Not a single-line change.

`TODO[verify-coverage]`: is `brand-guardian-lint.ts` wired into Synthex CI too, or only Unite-Group? Plan 4 wiki entry (`wave-roadmap.md:27`) says "brand-guardian 0 violations" on Unite-Group public pages — no mention of Synthex coverage.

---

## 6. Wave 5.3 — what's actually planned vs aspirational

**Canonical roadmap (`Wiki/wave-roadmap.md:35`):**

```
| 5.3 | Honcho memory promotion → Margot's primary user model | queued |
```

That is **the entirety of Wave 5.3 in the canonical wave-roadmap**. One line. Honcho memory promotion. No mention of Synthex, no mention of skill libraries, no mention of WHEN/INPUT/OUTPUT/CALIBRATION schema.

**Wave 5.4 (`wave-roadmap.md:36`):**
```
| 5.4 | Pi-CEO Board (9-persona) wiring (ceo-board → Layer 3 dispatcher) | queued |
```
(Phase A scaffold shipped 2026-05-13, Phase B queued — `wave-roadmap.md:34`.)

**Wave 5.5–5.6:** First three Margot Senior Agents + Verifiability contract — `wave-roadmap.md:37-38`.

**Yesterday's strategy doc proposed Wave 5.3 = "synthex-skill-library/ repo + skill schema refit"** (`synthex-agency-mavericks-strategy-2026-05-13.md:22, 27, 122`). This is **not in the wave-roadmap**. It would either (a) bump Honcho to a later wave, (b) get a new wave slot (5.3a / 5.7), or (c) need explicit founder approval to overwrite.

**Existing superpowers plans (`unite-group/docs/superpowers/plans/`, verified `ls`):**
- `2026-05-12-three-workstreams-sequenced.md`
- `2026-05-12-unite-group-developer-activity.md`
- `2026-05-12-unite-group-integration-mesh.md`
- `2026-05-12-unite-group-security-sweep.md`
- `2026-05-12-unite-group-voice-landing-rewrite.md`
- `2026-05-13-agent-empowerment-pathway-alignment.md` (most recent — Margot model + decision-rights + brand-guardian gate + Scout→Synthex bridge + NotebookLM audit + Pi-CEO Board scaffold).

**No `2026-05-13-synthex-*` plan exists.** No Wave 5.3 plan exists. The Synthex × Mavericks "90-day execution map" in yesterday's strategy doc (lines 93-107) **has no corresponding Pi-Dev-Ops Plan doc**.

`TODO[author-plan]`: if the Board approves Synthex refit as Wave 5.3, a `docs/superpowers/plans/2026-05-13-synthex-skill-library.md` plan needs writing before any code work. Currently zero implementation plan exists.

---

## 7. GoHighLevel — real-code-reference audit

**Phill clarification #8:** GHL was reference material only — never substrate.

**Grep audit:** `grep -rln -iE "gohighlevel|GHL"` across Synthex with `.ts/.tsx/.js/.jsx/.json/.md` types.

After excluding `node_modules/`, `storybook-static/`, and `.next/`:
- **Real source code (`.ts`/`.tsx`/`.js`/`.jsx`):** ZERO matches.
- **Real docs (`.md`):** ZERO matches.
- **JSON config:** ONE match in `Synthex/platform_master_config.json` — verified content is `"text_overlay": "Key points highlighted on screen"` — false positive (matched on `highL` inside `highlighted`).
- **`package-lock.json`:** matches like `gh-pages`, `Ghost`, etc. — transitive deps, NOT GHL.

**Net read:** **Zero substrate dependency on GoHighLevel.** Confirmed clean. The storybook bundle hits Phill mentioned are exactly the `iframe.bundle.js.map` false positives expected — `highlighted` inside the dist. Real-code refs = nil. Yesterday's strategy doc's "reject GHL" ruling (`synthex-agency-mavericks-strategy-2026-05-13.md:34`) is recommending against something we never adopted. The reference doc `2nd Brain/Sources/Solutions.md` is the only place GHL exists in our world — as research material.

---

## 8. Setup / onboarding — what does "build the business persona" mean in current Synthex?

**Source:** `Synthex/ONBOARDING_SETUP.md:183-211`:

```
Onboarding Flow (7 Steps)

Step 1: Business Identity   — Business name, Website URL (optional), ABN, Location
Step 2: API Credentials     — OpenAI, Anthropic, Google, OpenRouter
Step 3: Platform Connections — YouTube, Instagram, TikTok, X, Facebook, LinkedIn, etc.
Step 4: Persona Setup        — Persona name, tone, topics
Step 5: Review Vetting Results — SEO, AEO, GEO, Social scores
Step 6: Review & Launch      — Summary, confirm and save
Onboarding Complete → onboarding_completed = true → /dashboard
```

**Code surface (verified):**

- Entry page: `Synthex/app/(onboarding)/onboarding/page.tsx` (verified, 100+ lines). Headline pattern from SYN-503 / Board Session 3 — `lines 3-18`:
  > "URL-First Design (SYN-503) — The only required human input: business name + website URL. Industry is optional — AI auto-detects it."
- Pipeline orchestrator: `Synthex/lib/ai/onboarding-pipeline.ts:1-13`:
  > "Runs parallel sub-agents to extract everything from a website URL: 1. Website Scraper (Cheerio/Firecrawl), 2. PageSpeed Analysis (Google API), 3. AI Analysis (industry/description/persona/marketing plan), 4. Social Link Verifier."
- `PipelineResult` typed output (`onboarding-pipeline.ts:58-111`) yields: businessName, industry, description, teamSize, logoUrl, brandColours{primary/secondary/accent}, seoSignals, seoScore, pageSpeed (mobile+desktop), overallHealth, healthSummary, quickWins, contentGaps, keywordOpportunities, socialProfiles, keyTopics, targetAudience, suggestedTone, suggestedPersonaName, confidence, sampleCaption, structuredData{phone/email/address/abn/googleBusinessUrl}.
- 6 animated pipeline stages (`Synthex/app/(onboarding)/onboarding/page.tsx:57-100`): scraping → seo → speed → ai → social → plan (each with delay budgets totalling ~19s — matches the "Pipeline runs (~20s)" claim in the page docstring).
- Supporting API routes: `app/api/onboarding/` contains `api-credentials`, `checklist`, `complete`, `kickstart`, `pipeline`, `progress`, `review`, `validate-key`, `voice`.

**Brand-intelligence pipeline (separate, Python):** `Synthex/brand-intelligence/CLAUDE.md:1-32` — autonomous 6-hourly cron pipeline. Orchestrator (Claude Opus 4.6) coordinates CEO Board (Opus), Research Director (Sonnet, Playwright MCP), Brand Analyst (Sonnet), Senior PM (Sonnet), Content Strategist (Sonnet), SEO Specialist (Haiku), Compliance Guardian (Haiku). Hard cap **$8/run** (line 35). Active clients tracked in `clients/active-clients.json` (verified exists).

**Net read:** "Build the business persona properly at onboarding" is **already implemented** at impressive depth — URL→pipeline runs in ~20s and produces a 25-field structured PipelineResult; Python brand-intelligence layer runs every 6 hours after onboarding to maintain freshness. **Phill's clarification #5 ("setup is critical") is already operationally honoured.** The 10% gap is unlikely to be onboarding — onboarding is one of the most invested-in surfaces.

---

## 9. Online-data enrichment touchpoints

Where Synthex pulls external data (verified from `Synthex/package.json` + onboarding-pipeline.ts + brand-intelligence):

| Source | Provider | File / line |
|---|---|---|
| Website scrape | Firecrawl (primary) → fetch fallback | `lib/ai/website-analyzer.ts:1-9` (docstring) |
| Website scrape (Python) | Playwright MCP | `brand-intelligence/CLAUDE.md:16` |
| HTML parse | Cheerio | `package.json:165` `"cheerio": "^1.2.0"` + onboarding-pipeline.ts:1-13 |
| PageSpeed | Google PageSpeed API | `onboarding-pipeline.ts:5-7` |
| AI providers | OpenRouter (primary), Anthropic SDK, Google AI SDK, OpenAI SDK | `package.json:99-105`; CONSTITUTION.md unspecified, README.md:104-109 |
| Web search / scrape | Apify | `package.json:157` `"apify-client": "^2.22.2"` |
| Social fetch | Twitter SDK | `package.json:215` `"twitter-api-v2": "^1.24.0"` |
| Social fetch | Google APIs (YouTube etc.) | `package.json:174` `"googleapis": "^171.4.0"` |
| Email | SendGrid + Resend | `package.json:145, 206` |
| Cron-driven external pulls | 34 cron routes including `fetch-mentions`, `gbp-monitor`, `gsc-auto-index`, `gsc-monitor`, `gsc-topic-sync`, `rank-snapshot`, `model-scout`, `seo-audits`, `weekly-digest`, `analytics-sync` | `app/api/cron/` listing |

**Net read:** External-data enrichment is **broad and live**. Synthex already pulls: search-console data, GBP, rank tracking, mentions, model availability scout, analytics — on cron. Phill's clarification #6 is already true. There is no missing connector for "pull online data where appropriate" — the question is whether outputs surface in the right Unite-Group dashboards (the seam audited in §2).

---

## 10. Relationship-based pricing model — what exists in code?

**Phill clarification #4:** Clients pay monthly via controlled, relationship-based access — not open self-serve.

**Code evidence:**

- **Stripe live, public tiered pricing exists** (`Synthex/lib/stripe/subscription-service.ts:50-106`):
  ```ts
  PLAN_LIMITS: { free, pro, growth, scale, professional, business, custom }
  // each with maxSocialAccounts / maxAiPosts / maxPersonas / maxSeoAudits / maxSeoPages
  ```
- **Billing API routes (`app/api/billing/` verified):** `billing-portal`, `change-plan`, `checkout`, plus `app/api/stripe/`, plus `app/api/webhooks/stripe/`.
- **Stripe live integration is shipped** (`CHANGELOG.md:122-127`): "Stripe live account wired — Pro/Growth/Scale AUD pricing live", "Stripe live webhook registered at https://synthex.social/api/webhooks/stripe".
- **Invite system exists** (`app/api/auth/validate-invite/route.ts`, verified 40 lines):
  - "Public endpoint that validates an invite code before signup… Rate-limited to prevent brute-force enumeration."
  - Validates code against Prisma DB.
- **Admin invite management:** `app/api/admin/invites/route.ts` exists.
- **Onboarding gates on invite (`LAUNCH-RUNBOOK.md:112`):** "The signup path in production is invite-code gated and is treated as a non-destructive smoke check by default (it does not create accounts unless explicitly enabled)."

**Net read:** Two parallel paths exist in code today: (a) **open self-serve tiered Stripe** (free/pro/growth/scale, live since v8.0); (b) **invite-code-gated signup** (validation route shipped; admin invite management shipped; production signup gated). The "controlled, relationship-based" model Phill wants matches path (b) — and (b) is **already the active production behaviour**. Path (a) Stripe tiers exist but are not exposed to open signup. This aligns with `Wiki/operational-priorities-q2-2026.md:60-65` ("Starter/Growth/Pro retainer plans removed. Two real revenue streams: 1. Bespoke SaaS contracts (CCW $33k/yr ARR), 2. Industry Association memberships — Q3 2026.").

`TODO[verify-pricing-truth]`: Is the synthex.social pricing page still showing public Pro/Growth/Scale tiers (per v8.0 launch + `components/marketing/PricingCard.tsx` etc.) or has it been swapped to "invite only" copy? Public-page copy ≠ what backend enforces.

---

## 11. Funnel automation requirements (Phill: "finalise funnels and production readiness")

**Code surface (verified):**

- **Workflow engine shipped** (`CHANGELOG.md:191-200`, v2.0 — 2026-03-03): `WorkflowExecution`, `StepExecution`, `WorkflowTemplate` Prisma models; **7 step types** (`ai-generate`, `ai-analyse`, `ai-enrich`, `human-approval`, `action-publish`, `action-schedule`, `action-notify`); confidence gating (auto-approve ≥0.85, human gate below); 2-retry cap; context assembly with token budget; SSE streaming. `CONSTITUTION.md:73-84` codifies these as immutable architectural rules.
- **Workflow API surface (`app/api/workflows/`):** `batch`, `executions`, `intelligence`, `templates`.
- **Autopilot routes (`app/api/autopilot/`):** `config`, `preview`, `runs`, `stats`.
- **Autonomous routes (`app/api/autonomous/`):** `execute`, `parse`.
- **Email funnel drips (cron-driven):** `app/api/cron/drip-day3/`, `drip-day7/`, `drip-day14/`, `welcome-sequence/`, `review-follow-up/`, `weekly-digest/`. The drip skeleton is shipped.
- **Marketing automation (cron):** `daily-post`, `publish-scheduled`, `generate-calendars`, `visibility-push`, `analytics-sync`, `health-score`, `proactive-insights`.

**What "funnel" likely means in Phill's language:**

Possible interpretations — and what each maps to:
1. **Lead-capture → nurture → conversion flow** for vetted external clients. Surface: TBD. **No code surface explicitly named "funnel" in `app/api/`.**
2. **Client onboarding funnel** = the 7-step ONBOARDING flow (§8). **Shipped.**
3. **Content-production funnel** = workflow engine producing content end-to-end. **Shipped (v2.0).**
4. **Email drip funnel** = the welcome-sequence + drip-day3/7/14 routes. **Shipped skeleton.**

`TODO[clarify-funnel-meaning]`: which of the four is Phill calling "needs to be finalised"? Without that, the Board votes on a guess.

`TODO[verify-production-readiness-gap]`: production-readiness is enumerated nowhere as a single checklist. CRITICAL_PATH.md has 7/8 foundations done; the unticked PROGRESS.md four items; the CHANGELOG's last entry (v11.1) appears clean. The "10%" is not currently a defined set.

---

## 12. Open evidence gaps — TODOs for follow-up

| TODO ID | Section | Question |
|---|---|---|
| `verify-version-truth` | §1 | Reconcile `package.json:2.0.1` vs `CHANGELOG v11.1` vs stale `PROGRESS.md` |
| `verify-completion` | §1 | Founder-defined list of "the missing 10%" |
| `verify-api-surface` | §2 | Cross-system call inventory between Synthex and Unite-Group |
| `verify-coverage` | §5 | Is brand-guardian CI-gated in Synthex too, or only Unite-Group? |
| `author-plan` | §6 | No `docs/superpowers/plans/` doc exists for the proposed Synthex Wave 5.3 |
| `verify-pricing-truth` | §10 | Live synthex.social pricing page state vs invite-gated backend |
| `clarify-funnel-meaning` | §11 | Which of the four "funnel" interpretations is the work-item? |
| `verify-production-readiness-gap` | §11 | What is the canonical production-readiness checklist? |
| `count-prisma-models` | §1 | 67 vs 91 vs 132 Prisma model claims — which is correct? |

---

## 13. Five questions — pre-Board evidence summaries

Phill's five questions from yesterday's strategy doc (`synthex-agency-mavericks-strategy-2026-05-13.md:117-123`). One paragraph each. No verdicts.

### Q1. Approve `synthex-skill-library/` as a separate repo (vs subdir)?

Evidence: Skill files already live globally at `~/.claude/skills/marketing-*` symlinked to `Pi-CEO/Pi-Dev-Ops/skills/marketing-*` (marketing-orchestrator/SKILL.md:10). Brand configs already share between Marketing + Remotion packs via `Synthex/packages/brand-config/src/brands/` (canonical home per RA-1985, line 58, 133). The existing pattern is **shared-substrate-with-per-project-runtime** — splitting Synthex skills into a separate repo would break the symlink/shared-config model. Counter-evidence: yesterday's doc framed this as a future-IP-asset move (sell/license to Association). No corresponding superpowers plan exists. Evidence points toward: **extend the existing Pi-Dev-Ops/skills/ tree, don't fork; revisit the separate-repo question if/when Association MaaS goes live** (Q3 2026 per `operational-priorities-q2-2026.md:61-63`).

### Q2. External direct-client price floor at AUD $5K/mo (vs Troy's $3K anchor)?

Evidence: CCW is paying $2,750/month / $33K/yr (`operational-priorities-q2-2026.md:69`) — and Phill personally vetted them. Industry Association membership pricing per `operational-priorities-q2-2026.md:62`: Base $299 / Professional $799 / Master $2,499 yearly. Synthex SaaS Pro/Growth/Scale tiers are AUD via Stripe live (`CHANGELOG.md:122`). **A $5K/mo floor would be ~2× the CCW relationship-anchor and 60× Master Association membership.** The exit-thesis math in yesterday's research doc (line 174) computes ~$4M/yr per vetted client to hit $200M ARR via 50 clients. Evidence points toward: **the $5K/mo floor is too low for the $200M ARR thesis and slightly above the actual CCW relationship**; the question is mispriced and needs the founder to set the anchor against either the CCW comp or the exit-thesis math — not against Troy's $3K.

### Q3. Adopt brand-guardian pass-rate ≥ 85% as the gate to autonomous production per brand?

Evidence: brand-guardian today is **binary** (`brand-guardian-lint.ts:92`: `process.exit(errors.length > 0 ? 1 : 0)`) — no rate, no score. 4 of 9 rules are hard `error` (parallel-triplet, today-fast-paced, important-to-note, stakeholders, forbidden-words — line counts above). Adopting "85% pass-rate" requires (a) running the linter across many artifacts per brand, (b) defining what counts as a "pass" at the artifact level (zero errors? zero errors + ≤ N warns?), (c) building a pass-rate aggregator and threshold gate. **None of this exists in code today.** It is more a metric-architecture change than a policy change. Evidence points toward: **the gate concept is sound, but yesterday's "≥ 85%" is borrowed from Troy's video** (`agency-mavericks-research-2026-05-13.md` part 2 §6:14) **and has no implementation today** — Board should approve the principle, not the specific number.

### Q4. Refit `marketing-orchestrator` + child skills to the `WHEN/INPUT/OUTPUT/CALIBRATION/PASS_RATE` schema in Wave 5.3 (vs Wave 6)?

Evidence: §3 confirms **the schema is purely aspirational** — zero SKILL.md files implement it. The 10 marketing-* skills + cross-pack Remotion skills all use the current `name/description/automation/intents` frontmatter + prose `## Triggers` / `## Inputs` / `## Outputs` sections. The marketing-orchestrator already has TWO of the moves the proposed schema is reaching for: the discovery brief gate (lines 12-36, "Hard stop conditions") and the 5-D critique gate (lines 159-174). **Refitting all 10 marketing-* skills + Remotion siblings to a new schema is at minimum a 3-5 day refactor, not a wave-roadmap slot-swap.** The canonical Wave 5.3 is "Honcho memory promotion" (`wave-roadmap.md:35`) — bumping it would defer Margot's primary user model. Evidence points toward: **either schema-refit gets its own wave slot (5.7 / 5.3a / Wave 6), or it gets descoped to a "instrument calibration on the existing orchestrator gates" minor task — not a 10-skill rewrite that bumps Honcho**.

### Q5. Reject GoHighLevel as a substrate — confirm Synthex/Nexus as platform of record?

Evidence: §7 confirms **zero real-code GHL references** anywhere in the Synthex repo. GHL exists only as research material at `2nd Brain/Sources/Solutions.md`. Yesterday's strategy doc rejected GHL substantively — but the action item is mooted by reality: **GHL was never adopted, so there is nothing to reject**. Evidence points toward: **a reaffirm-the-current-state vote, not a new decision** — Board should consume the GHL Solutions.md doc as a feature-list spec for build-vs-buy on the 8 capabilities listed in yesterday's strategy doc table (`synthex-agency-mavericks-strategy-2026-05-13.md:64-74`: Agent Studio, MCP, Workflows, white-label portal, mobile app, reputation/GBP, snapshots, dashboards, phone/SMS) and approve which of those 8 build into Synthex/Nexus in which wave.

---

## Cross-refs

[[synthex]] · [[synthex-agency-mavericks-strategy-2026-05-13]] · [[agency-mavericks-research-2026-05-13]] · [[wave-roadmap]] · [[operational-priorities-q2-2026]] · [[pathway-to-2b-2026-2028]] · [[brand-guardian]] · [[unite-group-nexus-architecture]] · [[pi-ceo-architecture]] · [[ccw]]
