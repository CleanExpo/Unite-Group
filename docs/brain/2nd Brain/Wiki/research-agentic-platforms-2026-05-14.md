---
type: wiki
updated: 2026-05-14
---

# Research — Agentic Platforms & Deployment Patterns (2026-05-14)

Synthesis of three sources added to `Sources/` on 2026-05-14:
1. `Higgsfield Just Launched their AI Agent (Supercomputer).md`
2. `Vercel Just Fixed Vibe Coding's Biggest Problem.md`
3. `How I Run My Shopify Store With Claude Managed Agents.md`

---

## 1. Higgsfield AI Agent — feature summary

**What it is.** Higgsfield Supercomputer is a cloud-native agentic harness launched 2026-05-14, billed as "the first ever cloud-native self-learning AI agent for end-to-end task execution" (Higgsfield source, L62). It is built on top of the open-source Hermes agent scaffold (L68) and wraps frontier image/video generative models behind a chat-style UI at `higgsfield.ai/supercomputer` (L70). The product specialises in creative generation — image ads, UGC video, storyboard-to-video pipelines — by preloading internal Higgsfield "skills" (prompt best-practices for image/video generation) that fire on simple user commands (L78-80).

**The "Supercomputer" angle / differentiator.** Three pieces (L122-136):
- **Engine optionality** — user selects between GPT 5.5 Pro, Sonnet, Opus 4.6 (no 4.7 on standard plan), Gemini 3.1 Pro. Higgsfield is neutral on labs, unlike Claude Code (Anthropic-only) (L71-72, L126).
- **Creative-specialised harness** — preloaded skills for ad-creative packs, UGC scripts, storyboards, auto-aspect-ratio selection, credit-cost checkpoint before each generation (L78, L92-94).
- **Connectors + memory** — Google Drive, Telegram and other connectors as the "context" layer; a persistent memory store that auto-fills as you work (L134-138).

**Pricing.** Not explicitly itemised. Source notes credits are shared with the Higgsfield subscription pool (L146-147) and references a "standard plan" gating Opus 4.7 (L71). No dollar figures given.

**Direct competitor to.** Source positions it explicitly against Claude Code and Codex as "general-purpose harnesses" (L140-142), with Hermes named as the open-source base (L68). It is **not** mapped onto OpenAI Operator or Manus in the source. Verdict from source: "the Claude Code or more approachable version of an agentic harness… suited for creatives" (L142).

---

## 2. Higgsfield — Phill fit assessment

**No fit.** Higgsfield Supercomputer is a creative-vertical harness (ad images, UGC video, storyboards) — the exact slot Phill already covers with the in-house **Remotion Skills Package** (video-director, video-cinematographer, video-sound-designer, video-colorist, remotion-render-pipeline) running on Claude Max at zero marginal cost. Higgsfield's three pillars — engine optionality, creative skills, connectors + memory — are all already present in Phill's stack: model routing lives in Hermes + OpenRouter (Chinese OS models → Gemini Flash → Anthropic), skills live as portable Claude skills, and memory lives in the Brain-1 wiki + Margot corpus. The source itself flags initial bugs (failed generations with no error reason, no memory-deletion UI, Cling 3.0 API failures — L98, L138). Verdict: skip unless Phill specifically wants the one-shot ad-creative batch UX for a client demo. Source's own recommendation aligns: only worth it if you're already on a Higgsfield subscription (L146-147).

---

## 3. Vercel "vibe coding" fix — what specifically launched

Note: title is misleading. The source is **not** about a Vercel platform deploy feature — it covers **Deepsec**, a Vercel-Labs open-source agent-powered vulnerability scanner (Vercel source, L31, L60).

**Specific feature.** Deepsec — "agent-powered vulnerability scanner that you can run in your own infrastructure, optimized for performance on-demand review of all code in existing large-scale repos" (L60). GitHub: `github.com/vercel-labs/deepsec/` (L31). Five-command lifecycle (L62-108):
1. `npx deepsec init` — scaffolds a per-project `info.markdown` with codebase summary + threat model (L62-70).
2. `deepsec scan <project-id>` — sub-1-second regex-matcher pass that surfaces candidate files (insecure crypto, SQL injection, XSS, missing auth) (L74-77).
3. `deepsec process` — batches candidate files and runs each through the user's coding agent (Claude Code, Codex, or Vercel API key on Vercel infra) to produce categorised findings (critical / high / medium / high-bug / bug) (L78-82).
4. `deepsec report` — generates `reports/report.md` + `report.json` with concrete fix recommendations per finding (L82-94).
5. `pnpm deepsec revalidate` — re-runs against git history to confirm fixes landed (L102-108).

**Cost reference.** Demo run: 118 candidate files, 29 batches, ~5-6 minutes wall-clock, $19 on Opus 4.7 API (free on Claude Max plan), revalidation ~$1.12 (L80, L108).

**How it changes the loop.** It does not change Vercel deploys themselves — it adds a static-analysis security gate that maps findings to the OWASP Top 10 (L50-58) and slots between code-written and code-shipped. The source pairs it with Open Spec (`opspec fast-forward` / `opspec apply`) as the patch-application tool (L96-100). Vercel cloud-mode (Vercel API key) is the alternative if you don't have a Claude Max plan (L68).

**Benefit to Phill's 10 Vercel projects.** Yes, conditionally. Phill runs Claude Max so the per-scan cost is $0 marginal. Highest-leverage targets: `unite-group`, `restoreassist`, `ccw-crm-web`, the client portals — anything with auth, billing, or customer PII. Lowest leverage: marketing-site projects with no backend. The "broken access control" + "rate limiting" + "fail-open" categories (L50-58) directly match the gaps the curator-security-unknown skill already guards against — Deepsec is the automated complement to that human gate.

---

## 4. Vercel — actionable adoption steps for Phill

If adopted, three concrete steps across the Vercel portfolio:

1. **Pilot on the highest-risk repo first.** Run `gh repo list CleanExpo --limit 20` to enumerate, pick `ccw-crm-web` (client billing + PII) as the pilot. From repo root: `npx deepsec init` → paste the returned setup prompt into Claude Code → `deepsec scan <id>` → `deepsec process` → review `reports/report.md`. Time-to-first-finding: ~10 minutes.

2. **Wire into CI as a weekly cron, not per-PR.** Source recommends weekly cadence (L108). Add a GitHub Actions workflow on a Sunday cron that runs `deepsec scan` + `deepsec process` + `deepsec revalidate` against `main`, posts the report to a Telegram channel via the existing Hermes single-shot alert pattern. Per-PR would burn Claude Max session quota; weekly is the right frequency. Time-to-implement: ~30 minutes per repo, scriptable across all 10.

3. **Pair with curator-security-unknown skill, not replace it.** Deepsec is static — source explicitly notes "a lot of security issues come down to actual human interactions with things" and "it will not find all" OWASP-10 items (L108-110). Keep the curator skill as the pre-PR gate (env-var misreads, hardcoded fallback secrets, .env-in-git); use Deepsec as the post-merge weekly sweep. Together they cover code-level + config-level.

---

## 5. Shopify-with-Claude-managed-agents — operator pattern

**What the creator does.** Daan Jonkman runs a Shopify store where every morning at 8:00 AM a Claude **managed agent** (a Claude Code session that lives in Anthropic Cloud, triggered via API) pulls overnight returns, looks up each customer's purchase history, scans for recurring product patterns, drafts a reply for the CS team, and posts a categorised report to Slack with "escalate" markers. CS only approves/denies — they never compose from scratch (Shopify source, L16, L74-84).

**The agent loop.** Sequential (L74-86, L168-178):
1. **Trigger** — n8n cron fires daily at 08:00 → POST to Anthropic API with `api_key`, `agent_id`, `environment_id`, `vault_id`, and a text prompt (L196-203).
2. **Pull** — agent calls Shopify MCP (read-only scopes) to list refunds + customer order history from the last 24h (L168, L156-162).
3. **Classify** — agent reasons over "is this an important customer", "is the complaint recurring", using the memory store (ICP, brand voice, guardrails, privacy policy) attached read-only (L170-176).
4. **Draft** — synthesises per-customer summary + suggested reply + suggested fix, marks priority/escalate (L82-84).
5. **Post** — Slack MCP writes the categorised report in chunked messages to a channel; CS team approves/denies inside Slack (L166-184).

**Integrations wired (all via Claude managed-agent vault + MCP):**
- Shopify MCP — read-only scopes only (refunds, orders, customers); write scopes (set inventory, create products, discounts) explicitly disallowed at the vault layer, not relying on system prompt (L156-162).
- Slack MCP — second connector inside the same vault (L142-146).
- Memory store — separate object holding ICP + brand voice + guardrails, attached read-only to the session (L170-176).
- n8n — external automation platform holding the cron (managed agents have no built-in scheduler, this is the key gap) (L188-202).
- Gmail MCP attempted but broken at time of recording (L128-130).

**Key architectural call.** One vault per Shopify store. Scales to 10 stores = 10 vaults, named by store. The vault is the access-scope boundary (L136-142).

---

## 6. Shopify pattern — CCW + CARSI fit

**CCW (Carpet Cleaners Warehouse — Toby Carstairs).** Strong fit. CCW is a retail + services business with order intake, customer service, and supplier-pricing workflows — direct structural analogue to the source's Shopify store. Three instrumentation candidates, mapped onto the Shopify source's pattern:

- **Order intake daily sweep** — managed agent pulls last 24h of orders from CCW's commerce system (whatever Toby runs — needs verification), classifies by customer-history (new / repeat / high-LTV), drafts welcome/upsell touches, posts to a Telegram channel (NOT Slack — see `feedback_no_slack.md`) for Toby's approval. Mirrors the source's L74-84 loop exactly, with Telegram swapped for Slack.
- **Customer-service triage** — same managed-agent skeleton, pulls support inbox (Gmail MCP via Composio, since native Gmail-in-Claude is broken per source L128), categorises by complaint type, drafts replies grounded in a CCW memory store (brand voice, returns policy, common-issue playbook). Approval-only UX.
- **Supplier-pricing watch** — managed agent on a weekly cron scrapes supplier websites or pulls supplier-portal data, flags margin compression, posts an actionable list. Read-only scopes throughout.

Note: do not initiate this during the CCW holiday window — see `project_ccw_holiday_window.md`. Toby returns 26 May 2026. Pre-build the agent + vault + memory store now; ship the pilot after the 26 May 10am kickoff call.

**CARSI (LMS).** Partial fit. The Shopify e-com loop maps weakly onto an LMS, but the operator pattern (managed agent + vault + memory store + cron + approval queue) is fully transferable to LMS-shaped operations:

- **Enrolment intake** — managed agent polls new enrolments from the LMS DB (Supabase MCP), looks up referral source, checks payment status, drafts welcome email + course-onboarding sequence, posts to Telegram for approval. Pattern: identical loop, Shopify→Supabase, returns→enrolments.
- **WordPress-import** — managed agent watches a content folder or RSS feed, drafts standardised LMS-ready course modules from incoming WordPress posts, holds in draft until approved. Pattern transferable: scheduled trigger + content-pull + classify + draft + approval-queue.
- **Certificate-issue** — managed agent on a daily cron pulls completed-course events, validates completion criteria, drafts the certificate (read-only on the LMS, write-only on the certificate template), posts a signing queue. Same vault-scope-lockdown pattern as Shopify read-only scopes (source L156-162).

What's NOT transferable: the customer-history scoring on order frequency — LMS engagement is event-shaped, not transaction-shaped, so the "is this an important customer" reasoning needs a different signal (course-completion velocity, NPS, referral count) rather than order count.

---

## 7. Top 3 actionable changes for Phill from these three sources

Ranked by expected lift / time-to-implement:

### #1 — Adopt Deepsec as weekly cron across the 4 highest-risk Vercel repos
- **Change:** Add weekly Deepsec scan + revalidate workflow to `ccw-crm-web`, `unite-group`, `restoreassist`, and the active client-portal repo.
- **Touch:** `.github/workflows/deepsec-weekly.yml` in each repo + a Hermes single-shot Telegram alert wrapper.
- **Time:** ~2 hours total (30 min × 4 repos, scriptable).
- **Lift:** Closes the static-analysis blind spot the curator-security-unknown skill cannot reach (broken access control, missing rate limits, fail-open paths) on the four repos handling real customer data and billing.

### #2 — Build a CCW returns/CS managed-agent pilot, ship 26 May
- **Change:** Replicate the Shopify source's exact pattern for CCW — managed agent + vault (Shopify or CCW commerce MCP + Telegram MCP read scopes) + memory store (CCW brand voice + Toby's tone) + n8n daily cron at 08:00 AEST + Telegram approval queue.
- **Touch:** Anthropic Console (new managed agent + vault + environment), n8n workflow, new CCW memory store seeded from `project_ccw_holiday_window.md` + CCW brand assets.
- **Time:** ~4 hours pre-build (this week), 30 min activation on 26 May.
- **Lift:** Demonstrates concrete autonomous CS-ops value to Toby on day 1 back from holiday; positions CCW for managed-agent retainer expansion. Pattern is reusable for Duncan Perkins (Dimitri / ATO-APP) and every future Unite-Group client.

### #3 — Audit Higgsfield-style "preloaded creative skills" gap in the Remotion package
- **Change:** Not adoption of Higgsfield — instead, audit the Remotion Skills Package against Higgsfield's preloaded skills (ad-creative pack, UGC workflow, storyboard-then-animate, aspect-ratio auto-selection, credit-cost checkpoint). Identify any gaps Phill's own skills don't cover.
- **Touch:** `~/.claude/skills/remotion-*` skill manifest; specifically check if there's a one-command "ad-creative batch" skill equivalent to Higgsfield's "make 10 image ads for this product" flow (Higgsfield source L76).
- **Time:** ~1 hour audit + ~2 hours to add any missing skill (likely a `remotion-ad-batch` or similar).
- **Lift:** Defensive — keeps the Remotion package competitive against vertical creative harnesses without paying Higgsfield. Aligns with `feedback_model_routing_max_first.md` (Claude Max first, no external creative-vertical SaaS).
