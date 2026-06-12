---
type: wiki
updated: 2026-05-19
---

# Synthex Marketing Agency Runtime Lifecycle

## Decision

[[synthex|Synthex]] Marketing Agency uses the existing Synthex application stack:
Next.js App Router, Prisma, Supabase/Postgres, Vercel, and service modules under
`lib/marketing-agency/*`. Convex wording in implementation prompts is translated
to the portfolio-wide [[service-layer-architecture-2026-05-18]] pattern: entry
routes own orchestration and policy; service modules own reusable runtime
mechanics; provider adapters own external tool mechanics.

## Source Pass

Current Obsidian `Sources/` material pulled into this note:

- `Sources/github-synthex-docs-README.md` confirms Synthex as an AI-powered
  marketing automation platform with deployment, environment, testing, and
  integration docs.
- `Sources/Agent approvals & security – Codex.md` establishes sandbox,
  approval, network, protected-path, and auto-review controls.
- `Sources/Custom instructions with AGENTS.md – Codex.md` confirms layered
  project instructions via `AGENTS.md`, with closer files overriding broader
  guidance.
- `Sources/Subagents – Codex  OpenAI Developers.md` confirms subagents are
  explicit, inherit sandbox controls, and suit parallel research/review work.
- `Sources/Model Context Protocol – Codex.md` frames MCP as the connector layer
  for third-party tools, docs, browser, Figma, GitHub, Sentry, and similar
  systems.
- `Sources/Plugins – Codex  OpenAI Developers.md` frames plugins as bundles of
  skills, apps, and MCP servers; approval settings still apply.
- `Sources/Marketing Brain My AI SEO System Walkthrough (Claude Code +
  Obsidian).md` validates the Hot / Index / Wiki operating model, compounding
  source-to-wiki research, DataForSEO pipeline, and 30/60/90 execution plans.
- `Sources/5 AI CEOs Said the Same Thing About 2026 (Marketing Changes
  Forever).md` reinforces the models-to-systems shift: content must be built for
  agent retrieval, citation, and feedback loops, not just human clicks.
- `Sources/Top App Marketing Companies (2026).md` reinforces full-funnel app
  growth: ASO, user acquisition, creative testing, lifecycle retention, CRM, and
  privacy-ready measurement.
- `Sources/AI agents that do real work.md` and `Sources/AI agents that do real
  work 1.md` introduce Chorus as an external operator cockpit for engineering
  and marketing agents. See [[chorus-agent-platform-2026-05-19]].

## Runtime Reconciliation

Use this before any Synthex Marketing Agency task:

- Confirm the application repo is `/Users/phill-mac/Documents/Synthex`.
- Confirm the operating sandbox is `/Users/phill-mac/Documents/Marketing Team`.
- Read the nearest `AGENTS.md` and Synthex repo guidance before editing.
- Check `git status --short --branch` and preserve dirty user work.
- Read current `docs/marketing-agency/*` before adding new concepts.
- Classify each dependency as route, service, repository, provider adapter, or
  wiki/runbook.
- Treat absent credentials as gated mode, not runtime failure.
- Record provider mode as `mock`, `draft`, `live`, or `blocked`.

## Deployment Lifecycle

Synthex Marketing Agency uses the ADLC loop:

1. **Assess** - pull vault/source context, read Synthex docs, confirm branch,
   check provider gates.
2. **Design** - translate non-technical intent into affected layers and minimum
   service-module change.
3. **Layer** - keep business policy in route/orchestration and reusable runtime
   mechanics in services/adapters.
4. **Code** - make the smallest tested change; do not duplicate app code into
   the Marketing Team sandbox.
5. **Verify** - run targeted Synthex checks and route smoke tests when a URL is
   available.
6. **Deploy** - separate sandbox, preview, and production; never conflate mock
   readiness with live provider readiness.
7. **Observe** - use logs, route checks, Lighthouse, Playwright, Vercel, and QA
   reports as evidence.
8. **Compact** - update the wiki and handoff manifest at lifecycle boundaries.

## Service-Layer Boundaries

Entry routes and server actions own:

- authentication
- ownership and organization scope
- status transitions
- audit events
- persistence orchestration
- user-facing error mapping

Service modules own:

- credential lookup wrappers
- validation and readiness checks
- provider-mode selection
- retry and timeout policy
- restart, repair, and teardown helpers
- structured `ServiceResult<T, E>` outputs

Provider adapters own mechanics only. Artlist, HeyGen, Meta, Apify, OpenAI,
Supabase, Vercel, Linear, GitHub, Telegram, Chrome, and browser harnesses do not
own domain policy.

Chorus is classified as an external operator cockpit, not an in-app runtime.
Use it for research, planning, diagrams, campaign drafts, and supervised agent
work. Do not wire Chorus MCP/API calls into Synthex until `CHORUS_URL`, auth
prefix, and endpoint contract are verified.

## Provider Gates

- Artlist: music/licence workflow only unless official docs prove more.
- HeyGen: draft mode unless credentials and likeness consent exist.
- Meta: export and QA only unless an explicit repo/env approval enables
  publish/spend.
- Apify: live intelligence only when credentials are available from approved env.
- OpenAI/model providers: generation through service adapters only.
- Supabase: organization-scoped reads and writes only.
- Vercel: deployment and env checks must not print secrets.
- Linear/GitHub: backlog and PR state, not runtime truth.
- Telegram: coordination and notifications, not credential relay.
- Chrome/browser: verification, screenshots, and route evidence only.

## Verification Commands

Run from `/Users/phill-mac/Documents/Synthex`:

```bash
npm run type-check
npx jest tests/unit/marketing-agency --runInBand
npm run --silent marketing-agency:video-plan > /tmp/restoreassist-video-plan.json
npx playwright test tests/e2e/marketing-agency.spec.ts --project=chromium
```

Pass criteria:

- TypeScript passes.
- Marketing-agency Jest tests pass.
- Video plan JSON parses and stays `publishStatus: blocked` unless explicit
  approval exists.
- Playwright route smoke passes when a local or preview URL is available.
- No secrets are written to wiki, sandbox docs, logs, screenshots, or manifests.

## Link Graph

Operational entry: [[synthex-marketing-agency-wikilinks-2026-05-19]].

Core linked system:

[[synthex]] · [[marketing-agency-blueprint-2026]] · [[marketing-brain-system]] ·
[[synthex-agency-mavericks-strategy-2026-05-13]] ·
[[service-layer-architecture-2026-05-18]] · [[brand-guardian]] · [[qa-lead]] ·
[[mcp-ecosystem]] · [[artlist-mastery]] · [[pathway-to-2b-2026-2028]] ·
[[industry-association-vision-2026]] · [[association-launch-plan-2026]] ·
[[chorus-agent-platform-2026-05-19]] · [[ccw]] · [[restore-assist]]
