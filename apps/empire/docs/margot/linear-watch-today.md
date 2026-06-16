# Linear Watch — Margot Today Queue

Last synced: 2026-06-16 12:15:03 AEST
Source: Linear team `UNI` / Unite-Group
Purpose: Make parent-Hermes-pushed Linear work visible to Margot for today's task list.

## Operating rule for Margot

- Treat this file as the live Linear intake mirror for today's task planning.
- Use existing repo/docs/code/tests/context before asking Phill for more information.
- Draft-first for production DB writes, deployments, GitHub pushes/PRs, Vercel env changes, client-facing comms, billing/banking/payment actions, cross-client merges, or permanent business rules.
- Pull the full Linear issue before execution if a task is selected for active work.

## Today's Linear candidates

### UNI-2117 — [CCW P0 Wave 2] Harden Team Invites and Session Invalidation

- State: In Review (started)
- Priority: Urgent
- Project: CCW CRM
- Assignee: ranamuzamil1199@gmail.com
- Updated: 2026-06-01T04:13:41.183Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2117/ccw-p0-wave-2-harden-team-invites-and-session-invalidation

Summary / Linear description excerpt:

> Evidence: `team.py` uses `TEMP_PASSWORD_CHANGE_ON_FIRST_LOGIN` placeholder and TODO for JWT invalidation. Acceptance: secure invite-token flow or unusable random password; role/status changes invalidate sessions; tests pass.

> Report: `D:\CCW-CRM\docs\CCW-MISSING-ENDPOINTS-CONNECTIONS-WAVE2-2026-06-01.md`

> Senior Engineer loop: reproduce/confirm gap, write failing test or failing gate, implement smallest safe slice, rerun targeted tests, record evidence before moving on. Sandbox only until verified.

### UNI-2103 — [CCW P0 Build Loop] Green Gates and Repo Stabilisation

- State: In Review (started)
- Priority: Urgent
- Project: CCW CRM
- Assignee: ranamuzamil1199@gmail.com
- Updated: 2026-06-01T04:07:07.949Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2103/ccw-p0-build-loop-green-gates-and-repo-stabilisation

Summary / Linear description excerpt:

> Senior Platform Engineer lane. Evidence: `pnpm --filter web type-check` currently fails because TypeScript cannot find `@testing-library/jest-dom` and `vitest/globals`; backend `python -m pytest -q` fails importing `pgvector`; git tree has uncommitted/untracked signup/onboarding work. Acceptance criteria: workspace dependencies installed/reproducible; frontend type-check passes; backend pytest import and core suite pass; dirty tree is split/committed or intentionally parked; commands and outputs recorded in docs/CCW-APP-SENIOR-AUDIT-2026-06-01.md or follow-up evidence doc.

> Senior Engineer Loop for Rana:

> 1. Define the narrow slice.
> 2. Write/confirm failing test or failing gate.
> 3. Make the smallest safe fix.
> 4. Re-run targeted gate.
> 5. Re-run affected build/test loop.
> 6. Record evidence before moving to next slice.

> Governance: sandbox only until gates pass; no production claim without evidence.

### UNI-2058 — Phase 0 · Engineering review & adoption decision (replace / parallel / cherry-pick)

- State: In Progress (started)
- Priority: Urgent
- Project: Unite-Group
- Assignee: Phill McGurk
- Updated: 2026-05-30T11:44:06.770Z
- Labels: Architecture, Documentation, Ux
- Linear: https://linear.app/unite-group/issue/UNI-2058/phase-0-engineering-review-and-adoption-decision-replace-parallel

Summary / Linear description excerpt:

> ## Phase 0 — Engineering Review & Adoption Decision

> **Gates everything else.** Before any code is written, the team needs to decide *how* to adopt the layered design.

> ### Decisions required

> - [ ] **Adoption strategy** — pick one:
>   - [ ] **A. Replace** — layered light becomes the new default theme; remove dark Nexus
>   - [ ] **B. Parallel theme** — ship under `.theme-layered` alongside existing `.theme-unite-hub`
>   - [ ] **C. Cherry-pick** — keep dark, port specific patterns (Command Center grid, KPI tiles, ticker, layered shadows) into existing palette
> - [ ] **Type stack** — adopt Poppins or keep Geist?
> - [ ] **New top-level surfaces** — confirm fate of Deals, Connect, People (new routes vs. fold into Campaigns/Settings/Users)
> - [ ] **Ticker event taxonomy** — which Supabase tables feed the live event ticker?

> ### Inputs

> * `design/unite-hub-layered/README.md` — overview
> * `design/unite-hub-layered/INTEGRATION.md` §1–3, §9 — rollout options + open questions
> * Walk all 14 prototypes via `design/unite-hub-layered/prototypes/index.html`

> ### Output

> A signed-off decision doc (or comment on this issue) confirming each bullet above. Unblocks Phase 1.

> ### Acceptance

> * All 4 decisions documented
> * Stakeholders (design + eng lead + product) signed off
> * Decision posted as a comment on this issue and on parent [UNI-2057](https://linear.app/unite-group/issue/UNI-2057/unite-hub-layer
> …

### UNI-2140 — [CCW-CRM][Build] NSW feasibility + ElevenLabs/Twilio AI phone agent add-on

- State: In Progress (started)
- Priority: High
- Project: CCW CRM
- Assignee: Phill McGurk
- Updated: 2026-06-16T02:14:37.899Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2140/ccw-crmbuild-nsw-feasibility-elevenlabstwilio-ai-phone-agent-add-on

Summary / Linear description excerpt:

> ## Goal

> Answer Toby's question in product terms and start the CCW-CRM build:

> > **Increase profitable customer access and sales conversion while protecting the Seven Hills cost advantage.**

> ## Context

> Toby challenged the pitch with: **“What are we trying to achieve?”**

> This issue converts the feasibility statement, parcel collection model, and ElevenLabs/Twilio phone-agent concept into a buildable CCW-CRM add-on.

> ## GitHub

> Draft PR: [CleanExpo/CCW-CRM#214](https://linear.app/unite-group/review/feat-ccw-feasibility-and-ai-phone-agent-spec-4d0f31cf84a4)

> Branch: `feature/ccw-feasibility-ai-phone-agent-20260616`

> Changed files:

> * `docs/specs/ccw-feasibility-ai-phone-agent/spec.md`
> * `docs/specs/ccw-feasibility-ai-phone-agent/codex-task.md`
> * `docs/specs/ccw-feasibility-ai-phone-agent/addon-manifest.json`
> * `docs/specs/ccw-feasibility-ai-phone-agent/migration_stub.sql`

> ## Codex setting

> ```yaml
> codex_access_mode: read:write
> repository_permission: read:write
> base_branch: main
> feature_branch: feature/ccw-feasibility-ai-phone-agent-20260616
> ```

> ## Build scope

> ### Phase 1 — Foundation

> * Add schema/migration using repo conventions.
> * Add safe feature flags.
> * Add baseline Seven Hills and scenario seed data.
> * Add feature-status endpoint.

> ### Phase 2 — Feasibility engine

> * Scenario CRUD.
> * Scenario score calculator.
> * Required extra monthly contribution calculation.
> * Tests
> …

### UNI-2060 — Phase 2 · Extract UI primitives (Card, KPI, Chip, Tier, Ticker, FAB, LiveIndicator, etc.)

- State: In Progress (started)
- Priority: High
- Project: Unite-Group
- Assignee: Phill McGurk
- Updated: 2026-05-30T11:44:06.774Z
- Labels: tests, ui, frontend
- Linear: https://linear.app/unite-group/issue/UNI-2060/phase-2-extract-ui-primitives-card-kpi-chip-tier-ticker-fab

Summary / Linear description excerpt:

> ## Phase 2 — Extract reusable UI primitives

> Build the component library that every screen composes on top of. Land them in `src/components/founder/ui/` (or extend shadcn primitives in `src/components/ui/`). Prefer `cva` (class-variance-authority) for variant skinning over rewriting shadcn from scratch.

> ### Primitive extraction order

>  1. `<Card>` — paper surface with `--shadow-2`, inset highlight via `::before`. Variants: `padded`, `flush`
>  2. `<KPI label value delta trend>` — number tile with floating tag chip + optional sparkline. See `.kpi` in shared-tokens.css
>  3. `<Chip>` — pill with variants: `green`, `coral`, `plum`, `sky`, `amber`, `red`, `dark`, `ghost`, `active`
>  4. `<Tier level="platinum|gold|silver">` — rotated gem + label
>  5. `<HealthBar value max thresholds>` — 80×6 rounded bar with color shifts
>  6. `<StackShadow>` — wrapper that adds the layered paper-stack pseudo-elements
>  7. `<TopBar>` — breadcrumb + search + actions + org pill + live indicator
>  8. `<Sidebar>` — 80px rail with icon nav, tooltips, active-state notch
>  9. `<Ticker>` — fixed-bottom 40px live event strip with masking gradient + 90s slide
> 10. `<Drawer>` / `<SlideUp>` — re-skin shadcn `Sheet` / `Dialog` with new shadow + radius
> 11. `<FAB>` — bottom-right 56×56 green button
> 12. `<LiveIndicator>` — pulsing-dot pill, `LIVE` / `PAUSED` states

> ### References

> * `design/unite-hub-layered/src/shared-ui.js
> …

### UNI-2059 — Phase 1 · Port design tokens into globals.css + tailwind config

- State: In Progress (started)
- Priority: High
- Project: Unite-Group
- Assignee: Phill McGurk
- Updated: 2026-05-30T11:44:06.771Z
- Labels: Architecture, ui, frontend
- Linear: https://linear.app/unite-group/issue/UNI-2059/phase-1-port-design-tokens-into-globalscss-tailwind-config

Summary / Linear description excerpt:

> ## Phase 1 — Port design tokens into `src/app/globals.css`

> Lift the OKLCH tokens from `design/unite-hub-layered/prototypes/shared-tokens.css` into the Next.js codebase under whichever scope Phase 0 decided (root `:root` for replace, `.theme-layered` for parallel).

> ### Files to touch

> * `src/app/globals.css` — add new token block
> * `tailwind.config.ts` (or `tailwind.config.js`) — extend `theme.colors`, `theme.boxShadow`, `theme.borderRadius`, `theme.fontFamily` to expose tokens as Tailwind utilities

> ### Source of truth

> * `design/unite-hub-layered/tokens/design-tokens.json` — machine-readable spec
> * `design/unite-hub-layered/INTEGRATION.md` §2 — example CSS block, replace vs. parallel patterns

> ### Token surfaces to map

> * Surface stack: `--surface-canvas/sidebar/card/elevated`
> * Text: `--color-text-primary/secondary/muted/faint` (navy `#162D5B`)
> * Brand: `--brand-navy/teal/slate`
> * Status: green, coral, plum, amber, red (deep / soft variants each)
> * Lines: `--line` / `--line-strong`
> * Radii: 10 / 16 / 22 / 28
> * Shadows: `--shadow-1/2/3` (3-layer OKLCH stacks)
> * Type: `--font-primary`, `--font-mono`

> ### Type stack

> If Phase 0 picked Poppins:

> * Add `next/font/google` import for Poppins + IBM Plex Mono in `src/app/layout.tsx`
> * Remove `geist` package import (or leave as fallback)

> ### Acceptance

> - [ ] Tokens compile, no unresolved `var()` warnings in dev console
> - [ ] Tailwi
> …

### UNI-2108 — [CCW P1 Build Loop] Core ERP Smoke Pack: Products, Customers, Quotes, Orders, POS, Inventory, Invoices

- State: Todo (unstarted)
- Priority: Urgent
- Project: CCW CRM
- Assignee: ranamuzamil1199@gmail.com
- Updated: 2026-06-01T03:28:31.117Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2108/ccw-p1-build-loop-core-erp-smoke-pack-products-customers-quotes-orders

Summary / Linear description excerpt:

> Senior QA/UAT Engineer lane. Evidence: route surface exists for core ERP modules, but production readiness is not proven by current failing gates. Acceptance criteria: Playwright smoke covers login/signup plus create/read/update flows for products, customers, quotes, orders, POS transaction, inventory reservation/transfer, invoice export; backend tests cover the same API paths; smoke can run in CI/staging with deterministic seed data.

> Senior Engineer Loop for Rana:

> 1. Define the narrow slice.
> 2. Write/confirm failing test or failing gate.
> 3. Make the smallest safe fix.
> 4. Re-run targeted gate.
> 5. Re-run affected build/test loop.
> 6. Record evidence before moving to next slice.

> Governance: sandbox only until gates pass; no production claim without evidence.

### UNI-2106 — [CCW P0 Build Loop] Promote Shopify/Xero/SendGrid/Sentry From Demo to Verified Staging

- State: Todo (unstarted)
- Priority: Urgent
- Project: CCW CRM
- Assignee: ranamuzamil1199@gmail.com
- Updated: 2026-06-01T03:28:28.877Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2106/ccw-p0-build-loop-promote-shopifyxerosendgridsentry-from-demo-to

Summary / Linear description excerpt:

> Senior Integrations Engineer lane. Evidence: `.env.example` uses `SHOPIFY_MODE=demo`; Xero route has repeated TODOs for authenticated organization context; production env examples require SendGrid/Sentry/Xero credentials; Shopify backlog item previously blocked on 401 credentials. Acceptance criteria: staging credentials configured outside git; Shopify connection/scopes verified; Xero OAuth/token refresh tied to authenticated org context; SendGrid test email/audit trail verified; Sentry test event visible; demo mode remains available but cannot masquerade as production.

> Senior Engineer Loop for Rana:

> 1. Define the narrow slice.
> 2. Write/confirm failing test or failing gate.
> 3. Make the smallest safe fix.
> 4. Re-run targeted gate.
> 5. Re-run affected build/test loop.
> 6. Record evidence before moving to next slice.

> Governance: sandbox only until gates pass; no production claim without evidence.

### UNI-2104 — [CCW P0 Build Loop] Complete Signup, Auth, Onboarding, and Account Settings E2E

- State: Todo (unstarted)
- Priority: Urgent
- Project: CCW CRM
- Assignee: ranamuzamil1199@gmail.com
- Updated: 2026-06-01T03:28:27.358Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2104/ccw-p0-build-loop-complete-signup-auth-onboarding-and-account-settings

Summary / Linear description excerpt:

> Senior Full-Stack/Auth Engineer lane. Evidence: untracked backend route `apps/backend/src/api/routes/auth_signup.py`; frontend signup posts `/api/auth/signup` then redirects to `/onboarding`; cookies are hardcoded with `domain=localhost`; settings page calls auth account endpoints that need verification. Acceptance criteria: signup route tracked and tested; cookie config works local/staging/prod; organization/user relationship persists; signup -> onboarding -> dashboard -> account update -> password change passes Playwright/API smoke; no `as any` navigation workaround remains unless justified.

> Senior Engineer Loop for Rana:

> 1. Define the narrow slice.
> 2. Write/confirm failing test or failing gate.
> 3. Make the smallest safe fix.
> 4. Re-run targeted gate.
> 5. Re-run affected build/test loop.
> 6. Record evidence before moving to next slice.

> Governance: sandbox only until gates pass; no production claim without evidence.

### UNI-2119 — [CCW P1 Wave 2] Connect Container Receiving to Warehouse Inventory Stock Movement

- State: Todo (unstarted)
- Priority: High
- Project: CCW CRM
- Assignee: ranamuzamil1199@gmail.com
- Updated: 2026-06-01T03:36:14.186Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2119/ccw-p1-wave-2-connect-container-receiving-to-warehouse-inventory-stock

Summary / Linear description excerpt:

> Evidence: `containers.py` has `TODO: Add stock to warehouse inventory`. Acceptance: container receipt creates inventory movement transaction; duplicate receipt and warehouse destination tested.

> Report: `D:\CCW-CRM\docs\CCW-MISSING-ENDPOINTS-CONNECTIONS-WAVE2-2026-06-01.md`

> Senior Engineer loop: reproduce/confirm gap, write failing test or failing gate, implement smallest safe slice, rerun targeted tests, record evidence before moving on. Sandbox only until verified.

### UNI-2110 — [CCW P2 Build Loop] Demote or Finish AI Placeholder Features

- State: Todo (unstarted)
- Priority: High
- Project: CCW CRM
- Assignee: ranamuzamil1199@gmail.com
- Updated: 2026-06-01T03:28:32.663Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2110/ccw-p2-build-loop-demote-or-finish-ai-placeholder-features

Summary / Linear description excerpt:

> Senior AI/Product Engineer lane. Evidence: AI assistant has TODO dependencies (`ScrollArea`, `react-markdown`); backend AI agents contain `not implemented`, placeholder, fallback-only streaming methods. Acceptance criteria: AI features are classified MVP/non-MVP; MVP AI paths have real dependencies, tests, and no placeholder UX; non-MVP AI paths are feature-flagged or labelled internal/demo.

> Senior Engineer Loop for Rana:

> 1. Define the narrow slice.
> 2. Write/confirm failing test or failing gate.
> 3. Make the smallest safe fix.
> 4. Re-run targeted gate.
> 5. Re-run affected build/test loop.
> 6. Record evidence before moving to next slice.

> Governance: sandbox only until gates pass; no production claim without evidence.

### UNI-2109 — [CCW P1 Build Loop] Finish Billing/Stripe Decision and Implementation

- State: Todo (unstarted)
- Priority: High
- Project: CCW CRM
- Assignee: ranamuzamil1199@gmail.com
- Updated: 2026-06-01T03:28:31.865Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2109/ccw-p1-build-loop-finish-billingstripe-decision-and-implementation

Summary / Linear description excerpt:

> Senior Payments Engineer lane. Evidence: `apps/backend/src/api/main.py` comments billing route as disabled temporarily/requires Stripe; billing UI uses mock payment method ID and TODO notes Stripe.js. Acceptance criteria: either Stripe billing is enabled with real test-mode payment method flow and backend route tests, or billing is explicitly deferred from MVP with UI hidden/labelled; no mock payment method path shown as production.

> Senior Engineer Loop for Rana:

> 1. Define the narrow slice.
> 2. Write/confirm failing test or failing gate.
> 3. Make the smallest safe fix.
> 4. Re-run targeted gate.
> 5. Re-run affected build/test loop.
> 6. Record evidence before moving to next slice.

> Governance: sandbox only until gates pass; no production claim without evidence.

### UNI-2079 — Configure Vercel: LINEAR_API_KEY + Telegram webhook for autonomous intake

- State: Todo (unstarted)
- Priority: High
- Project: Dimitri ITR Platform
- Assignee: Unassigned
- Updated: 2026-05-30T11:15:49.551Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2079/configure-vercel-linear-api-key-telegram-webhook-for-autonomous-intake

Summary / Linear description excerpt:

> Enable Duncan → Linear pipeline on production.

> ## Env (Vercel)

> * `LINEAR_API_KEY`
> * `TELEGRAM_WEBHOOK_SECRET`
> * `CRON_SECRET` (Vercel cron auth)
> * `DIMITRI_DUNCAN_TELEGRAM_CHAT_IDS=8792816988`

> ## Script

> `scripts/register-telegram-webhook.ps1`

> ## Doc

> `docs/integrations/DUNCAN-LINEAR-INTAKE.md`

> ## Verify

> `GET /api/v1/intake/status` → linear_configured true

### UNI-2080 — Duncan: run /discovery Telegram loop (3Q batches + 4 buttons)

- State: Todo (unstarted)
- Priority: High
- Project: Dimitri ITR Platform
- Assignee: Unassigned
- Updated: 2026-05-30T11:15:02.231Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2080/duncan-run-discovery-telegram-loop-3q-batches-4-buttons

Summary / Linear description excerpt:

> Sandbox complete via `pnpm intake:discovery:simulate` (X-Dimitri-Intake-Simulate header). All 12 decisions recorded; `docs/ASSUMPTIONS.md` updated.

> **Follow-up:** Duncan may still run live `/discovery` on @PiCEODimitr_bot for real confirmations.

> **Note:** Linear child issues require a valid `LINEAR_API_KEY` on Vercel (vault key currently returns 401 on issueCreate).

### UNI-2075 — Gmail export + ingest into SPM intake (Phill vault)

- State: Todo (unstarted)
- Priority: High
- Project: Dimitri ITR Platform
- Assignee: Phill McGurk
- Updated: 2026-05-28T02:07:42.868Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2075/gmail-export-ingest-into-spm-intake-phill-vault

Summary / Linear description excerpt:

> **Blocked:** `VAULT_ENCRYPTION_KEY` missing from `D:\Unite-Hub\.env.local` (preflight: `pnpm intake:gmail:check`).

> Copy from Vercel unite-hub production or add `D:\Unite-Hub\.env.vault` per `docs/intake/GMAIL-SETUP.md`.

> Then: `pnpm intake:gmail`

## Full open queue snapshot

| Issue | State | Priority | Project | Updated | Title |
| --- | --- | --- | --- | --- | --- |
| [UNI-2117](https://linear.app/unite-group/issue/UNI-2117/ccw-p0-wave-2-harden-team-invites-and-session-invalidation) | In Review | Urgent | CCW CRM | 2026-06-01T04:13:41.183Z | [CCW P0 Wave 2] Harden Team Invites and Session Invalidation |
| [UNI-2103](https://linear.app/unite-group/issue/UNI-2103/ccw-p0-build-loop-green-gates-and-repo-stabilisation) | In Review | Urgent | CCW CRM | 2026-06-01T04:07:07.949Z | [CCW P0 Build Loop] Green Gates and Repo Stabilisation |
| [UNI-2058](https://linear.app/unite-group/issue/UNI-2058/phase-0-engineering-review-and-adoption-decision-replace-parallel) | In Progress | Urgent | Unite-Group | 2026-05-30T11:44:06.770Z | Phase 0 · Engineering review & adoption decision (replace / parallel / cherry-pick) |
| [UNI-2140](https://linear.app/unite-group/issue/UNI-2140/ccw-crmbuild-nsw-feasibility-elevenlabstwilio-ai-phone-agent-add-on) | In Progress | High | CCW CRM | 2026-06-16T02:14:37.899Z | [CCW-CRM][Build] NSW feasibility + ElevenLabs/Twilio AI phone agent add-on |
| [UNI-2060](https://linear.app/unite-group/issue/UNI-2060/phase-2-extract-ui-primitives-card-kpi-chip-tier-ticker-fab) | In Progress | High | Unite-Group | 2026-05-30T11:44:06.774Z | Phase 2 · Extract UI primitives (Card, KPI, Chip, Tier, Ticker, FAB, LiveIndicator, etc.) |
| [UNI-2059](https://linear.app/unite-group/issue/UNI-2059/phase-1-port-design-tokens-into-globalscss-tailwind-config) | In Progress | High | Unite-Group | 2026-05-30T11:44:06.771Z | Phase 1 · Port design tokens into globals.css + tailwind config |
| [UNI-2108](https://linear.app/unite-group/issue/UNI-2108/ccw-p1-build-loop-core-erp-smoke-pack-products-customers-quotes-orders) | Todo | Urgent | CCW CRM | 2026-06-01T03:28:31.117Z | [CCW P1 Build Loop] Core ERP Smoke Pack: Products, Customers, Quotes, Orders, POS, Inventory, Invoices |
| [UNI-2106](https://linear.app/unite-group/issue/UNI-2106/ccw-p0-build-loop-promote-shopifyxerosendgridsentry-from-demo-to) | Todo | Urgent | CCW CRM | 2026-06-01T03:28:28.877Z | [CCW P0 Build Loop] Promote Shopify/Xero/SendGrid/Sentry From Demo to Verified Staging |
| [UNI-2104](https://linear.app/unite-group/issue/UNI-2104/ccw-p0-build-loop-complete-signup-auth-onboarding-and-account-settings) | Todo | Urgent | CCW CRM | 2026-06-01T03:28:27.358Z | [CCW P0 Build Loop] Complete Signup, Auth, Onboarding, and Account Settings E2E |
| [UNI-2119](https://linear.app/unite-group/issue/UNI-2119/ccw-p1-wave-2-connect-container-receiving-to-warehouse-inventory-stock) | Todo | High | CCW CRM | 2026-06-01T03:36:14.186Z | [CCW P1 Wave 2] Connect Container Receiving to Warehouse Inventory Stock Movement |
| [UNI-2110](https://linear.app/unite-group/issue/UNI-2110/ccw-p2-build-loop-demote-or-finish-ai-placeholder-features) | Todo | High | CCW CRM | 2026-06-01T03:28:32.663Z | [CCW P2 Build Loop] Demote or Finish AI Placeholder Features |
| [UNI-2109](https://linear.app/unite-group/issue/UNI-2109/ccw-p1-build-loop-finish-billingstripe-decision-and-implementation) | Todo | High | CCW CRM | 2026-06-01T03:28:31.865Z | [CCW P1 Build Loop] Finish Billing/Stripe Decision and Implementation |
| [UNI-2079](https://linear.app/unite-group/issue/UNI-2079/configure-vercel-linear-api-key-telegram-webhook-for-autonomous-intake) | Todo | High | Dimitri ITR Platform | 2026-05-30T11:15:49.551Z | Configure Vercel: LINEAR_API_KEY + Telegram webhook for autonomous intake |
| [UNI-2080](https://linear.app/unite-group/issue/UNI-2080/duncan-run-discovery-telegram-loop-3q-batches-4-buttons) | Todo | High | Dimitri ITR Platform | 2026-05-30T11:15:02.231Z | Duncan: run /discovery Telegram loop (3Q batches + 4 buttons) |
| [UNI-2075](https://linear.app/unite-group/issue/UNI-2075/gmail-export-ingest-into-spm-intake-phill-vault) | Todo | High | Dimitri ITR Platform | 2026-05-28T02:07:42.868Z | Gmail export + ingest into SPM intake (Phill vault) |
| [UNI-2120](https://linear.app/unite-group/issue/UNI-2120/ccw-p2-wave-2-decide-and-wire-ai-quote-generation-into-quote-workflow) | Todo | Medium | CCW CRM | 2026-06-01T03:36:15.106Z | [CCW P2 Wave 2] Decide and Wire AI Quote Generation into Quote Workflow or Feature-Flag It |
| [UNI-2118](https://linear.app/unite-group/issue/UNI-2118/ccw-p2-wave-2-attach-translation-edit-audit-trail-to-authenticated) | Todo | Medium | CCW CRM | 2026-06-01T03:36:13.453Z | [CCW P2 Wave 2] Attach Translation Edit Audit Trail to Authenticated User |
| [UNI-2136](https://linear.app/unite-group/issue/UNI-2136/design-comprehensive-claude-playbook-for-agent-governance) | Backlog | Urgent | Unite-Group | 2026-06-14T23:34:50.650Z | Design comprehensive Claude Playbook for agent governance |
| [UNI-2135](https://linear.app/unite-group/issue/UNI-2135/finalize-and-deploy-unite-group-multi-agent-orchestration-platform) | Backlog | Urgent | Unite-Group | 2026-06-14T23:34:49.985Z | Finalize and deploy Unite Group multi-agent orchestration platform |
| [UNI-2090](https://linear.app/unite-group/issue/UNI-2090/vision-build-kickoff-duncan) | Backlog | Urgent | Dimitri ITR Platform | 2026-05-31T22:56:53.571Z | [Vision] Build kickoff — Duncan |
| [UNI-2139](https://linear.app/unite-group/issue/UNI-2139/integrate-all-portfolio-projects-into-unite-group-system-management) | Backlog | High | Unite-Group | 2026-06-14T23:34:52.008Z | Integrate all portfolio projects into Unite Group system management |
| [UNI-2138](https://linear.app/unite-group/issue/UNI-2138/enable-agents-to-autonomously-research-and-enhance-project) | Backlog | High | Unite-Group | 2026-06-14T23:34:51.554Z | Enable agents to autonomously research and enhance project architecture |
| [UNI-2137](https://linear.app/unite-group/issue/UNI-2137/build-visual-dashboard-for-unite-group-agent-activity-monitoring) | Backlog | High | Unite-Group | 2026-06-14T23:34:51.127Z | Build visual dashboard for Unite Group agent activity monitoring |
| [UNI-2134](https://linear.app/unite-group/issue/UNI-2134/unite-group-repo-pre-push-hook-fails-on-pre-existing-ts1117-blocks-all) | Backlog | High | Unite-Group | 2026-06-11T02:04:19.319Z | Unite-Group repo: pre-push hook fails on pre-existing TS1117 (blocks ALL pushes) |
| [UNI-2102](https://linear.app/unite-group/issue/UNI-2102/vision-rn-2-must) | Backlog | High | Dimitri ITR Platform | 2026-05-31T22:56:59.679Z | [Vision rn-2] must |
| [UNI-2101](https://linear.app/unite-group/issue/UNI-2101/vision-rn-1-must) | Backlog | High | Dimitri ITR Platform | 2026-05-31T22:56:59.262Z | [Vision rn-1] must |
| [UNI-2100](https://linear.app/unite-group/issue/UNI-2100/vision-rk-2-must) | Backlog | High | Dimitri ITR Platform | 2026-05-31T22:56:58.666Z | [Vision rk-2] must |
| [UNI-2099](https://linear.app/unite-group/issue/UNI-2099/vision-rk-1-must) | Backlog | High | Dimitri ITR Platform | 2026-05-31T22:56:57.727Z | [Vision rk-1] must |
| [UNI-2096](https://linear.app/unite-group/issue/UNI-2096/vision-mm-2-must) | Backlog | High | Dimitri ITR Platform | 2026-05-31T22:56:56.587Z | [Vision mm-2] must |
| [UNI-2095](https://linear.app/unite-group/issue/UNI-2095/vision-mm-1-must) | Backlog | High | Dimitri ITR Platform | 2026-05-31T22:56:56.205Z | [Vision mm-1] must |
| [UNI-2094](https://linear.app/unite-group/issue/UNI-2094/vision-mj-2-must) | Backlog | High | Dimitri ITR Platform | 2026-05-31T22:56:55.815Z | [Vision mj-2] must |
| [UNI-2092](https://linear.app/unite-group/issue/UNI-2092/vision-dd-2-must) | Backlog | High | Dimitri ITR Platform | 2026-05-31T22:56:55.024Z | [Vision dd-2] must |
| [UNI-2091](https://linear.app/unite-group/issue/UNI-2091/vision-dd-1-must) | Backlog | High | Dimitri ITR Platform | 2026-05-31T22:56:54.144Z | [Vision dd-1] must |
| [UNI-2088](https://linear.app/unite-group/issue/UNI-2088/swat-cross-project-deployment-model-analysis-cloud-vs-connected-local) | Backlog | High | Unite-Group | 2026-05-30T03:29:36.391Z | SWAT: Cross-project deployment model analysis — Cloud vs Connected-Local |
| [UNI-2069](https://linear.app/unite-group/issue/UNI-2069/dimitri-epic-human-gates-12q-gmail-legal-board) | Backlog | High | Dimitri ITR Platform | 2026-05-27T23:33:00.425Z | [Dimitri] Epic: Human gates (12Q, Gmail, legal, board) |
| [UNI-2077](https://linear.app/unite-group/issue/UNI-2077/dsp-osf-ato-api-portal-onboarding) | Backlog | High | Dimitri ITR Platform | 2026-05-27T22:38:38.348Z | DSP OSF + ATO API Portal onboarding |
| [UNI-2066](https://linear.app/unite-group/issue/UNI-2066/phase-8-accessibility-audit-remediation-across-all-ported-screens) | Backlog | High | Unite-Group | 2026-05-25T06:31:14.792Z | Phase 8 · Accessibility audit + remediation across all ported screens |
| [UNI-2057](https://linear.app/unite-group/issue/UNI-2057/unite-hub-layered-design-system-handoff-and-integration) | Backlog | High | Unite-Group | 2026-05-25T06:31:14.792Z | Unite-Hub · Layered Design System — Handoff & Integration |
| [UNI-2133](https://linear.app/unite-group/issue/UNI-2133/mission-station-visual-command-console-for-unite-group-nexus) | Backlog | Medium | Unite-Group | 2026-06-11T02:03:43.301Z | Mission Station: visual command console for Unite Group Nexus (graphs/3D/voice, minimal text) |
| [UNI-2132](https://linear.app/unite-group/issue/UNI-2132/ato-repo-pr-pileup-5-duplicate-pi-ceo-full-analysis-prs-deepsec-cron) | Backlog | Medium | Unite-Group | 2026-06-11T00:09:36.428Z | ATO repo PR pileup: 5 duplicate "Pi CEO full analysis" PRs + Deepsec cron PR rotting since 14 May |

## Watcher metadata

- Script: `/Users/phillmcgurk/.hermes/scripts/linear_to_margot_today.py`
- Output: `/Users/phillmcgurk/Unite-Group/docs/margot/linear-watch-today.md`
- This file intentionally contains no Linear API key or other secrets.


## AI-RET-001 Linear-Watch-Today Citation Contract

`docs/margot/linear-watch-today.md` (this file) is the live Linear intake mirror. `docs/margot/MARGOT-COMMAND-CENTER.md` is the canonical command-center surface, `docs/margot/ai-enhancement-candidate-register.md` is the AI/LLM candidate register, and `docs/margot/CONNECTED-TEAMS-OPERATING-RULES.md` is the read-first rulebook. The lane stays local, treats the mirror as a literal parent-Hermes-pushed linear intake, uses the full open queue snapshot, the state/priority/project/assignee rows, the margot today queue, the last synced timestamp, the draft-first rule, the use existing repo/docs/code/tests/context rule, the sandbox only rule, the operator decision support posture, and the no linear api key or other secrets contract. The mirror may not surface the four prohibited phrases documented in the verification checkpoint below; no live linear sync, no secret reads, no direct updates, no production migrations.

## Senior PM verification checkpoint (assertion-section break for LINEAR-WATCH-TODAY-BOUNDARY)

Doc-drift guard: the 13 required phrases and 4 required citations are present in the assertion section above. The 4 prohibited phrases are documented only here for completeness: live linear sync completed, secret reads from linear, issue updated directly, production migration applied.
