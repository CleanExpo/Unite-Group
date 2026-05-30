# Linear Watch — Margot Today Queue

Last synced: 2026-05-30 21:58:13 AEST
Source: Linear team `UNI` / Unite-Group
Purpose: Make parent-Hermes-pushed Linear work visible to Margot for today's task list.

## Operating rule for Margot

- Treat this file as the live Linear intake mirror for today's task planning.
- Use existing repo/docs/code/tests/context before asking Phill for more information.
- Draft-first for production DB writes, deployments, GitHub pushes/PRs, Vercel env changes, client-facing comms, billing/banking/payment actions, cross-client merges, or permanent business rules.
- Pull the full Linear issue before execution if a task is selected for active work.

## Today's Linear candidates

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

### UNI-2053 — Create CCW product category copy

- State: In Review (started)
- Priority: None
- Project: Brand OS Production Board
- Assignee: Unassigned
- Updated: 2026-05-23T05:08:34.536Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2053/create-ccw-product-category-copy

Summary / Linear description excerpt:

> Status: QUEUED
> Owner: Margot
> Route: Unite-Group / CCW CRM
> Skills: client-identity-lock, business-brand-voice, ai-seo-content-brief

> Decision needed:

> * First product category topic.

> Governance:

> * Do not mix CCW with RestoreAssist/Synthex/DR-NRPG/CARSI contexts.
> * Source client identity from registry before drafting.

### UNI-2054 — Maintain Margot Command Center and RestoreAssist Content Index

- State: In Progress (started)
- Priority: None
- Project: Brand OS Production Board
- Assignee: Unassigned
- Updated: 2026-05-23T04:46:35.401Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2054/maintain-margot-command-center-and-restoreassist-content-index

Summary / Linear description excerpt:

> Status: ACTIVE
> Owner: Margot
> Route: Unite-Group operating system + RestoreAssist content index

> Outputs:

> * /Users/phill-mac/hermes-agent-enhancement-report/MARGOT-COMMAND-CENTER.md
> * /Users/phill-mac/hermes-agent-enhancement-report/restoreassist-content-packs/RESTOREASSIST-CONTENT-INDEX.md

> Governance:

> * Keep statuses current.
> * Record missing files and blocked decisions.
> * Keep parked Toby/Duncan work out of this RestoreAssist / Brand OS workflow.

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

### UNI-2088 — SWAT: Cross-project deployment model analysis — Cloud vs Connected-Local

- State: Backlog (backlog)
- Priority: High
- Project: Unite-Group
- Assignee: Unassigned
- Updated: 2026-05-30T03:29:36.391Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2088/swat-cross-project-deployment-model-analysis-cloud-vs-connected-local

Summary / Linear description excerpt:

> Strategic analysis completed for cloud-hosted vs connected-local deployment models across the entire Unite Group ecosystem.

> Key finding: No single model fits all. Hybrid tiered approach required.

> Projects analyzed:

> * Pi-Dev-Ops → Cloud (internal)
> * RestoreAssist → Hybrid (enterprise local, SMB cloud)
> * DR-Sandbox → Connected-Local (field/offline-first)
> * DR-NRPG → Hybrid (insurance data sensitivity)
> * NRPG-Onboarding → Cloud
> * Synthex → Cloud
> * Unite-Group → Cloud
> * NodeJS-Starter → Cloud
> * Oh-My-Codex → Connected-Local (CLI tool)
> * CCW-CRM → Cloud (future: franchise local)
> * CARSI → Connected-Local (field ops)

> Recommendation: Build deployment abstraction layer in Pi-Dev-Ops allowing every product to ship as Cloud, Connected-Local, or BYO-Cloud from the same codebase.

> Source: brain/strategy/SWAT-deployment-models-2026-05-30.md

### UNI-2069 — [Dimitri] Epic: Human gates (12Q, Gmail, legal, board)

- State: Backlog (backlog)
- Priority: High
- Project: Dimitri ITR Platform
- Assignee: Unassigned
- Updated: 2026-05-27T23:33:00.425Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2069/dimitri-epic-human-gates-12q-gmail-legal-board

Summary / Linear description excerpt:

> Non-engineering blockers before regulated MVP.

> See `docs/compliance/UNLOCK-CRITERIA.md` and `docs/brain/SPM-PROGRAMME-CONTROL.md` §4 P2.

### UNI-2077 — DSP OSF + ATO API Portal onboarding

- State: Backlog (backlog)
- Priority: High
- Project: Dimitri ITR Platform
- Assignee: Unassigned
- Updated: 2026-05-27T22:38:38.348Z
- Labels: none
- Linear: https://linear.app/unite-group/issue/UNI-2077/dsp-osf-ato-api-portal-onboarding

Summary / Linear description excerpt:

> Runbook: `docs/compliance/DSP-ONBOARDING-RUNBOOK.md`

> Parent: [UNI-2070](https://linear.app/unite-group/issue/UNI-2070/dimitri-epic-regulated-mvp-real-ato-xpm-payments-noah) — blocked on human gates.

### UNI-2066 — Phase 8 · Accessibility audit + remediation across all ported screens

- State: Backlog (backlog)
- Priority: High
- Project: Unite-Group
- Assignee: Unassigned
- Updated: 2026-05-25T06:31:14.792Z
- Labels: tests, production-readiness, Accessibility, frontend
- Linear: https://linear.app/unite-group/issue/UNI-2066/phase-8-accessibility-audit-remediation-across-all-ported-screens

Summary / Linear description excerpt:

> ## Phase 8 — Accessibility audit + remediation

> Pre-launch a11y sweep across every ported screen.

> ### Checklist (from `design/unite-hub-layered/INTEGRATION.md` §7)

> - [ ] **Color contrast**: navy on cream verified AAA (16.8:1); audit every chip/badge color combo against WCAG AA (4.5:1 normal, 3:1 large/UI)
> - [ ] **Focus rings**: keep `:focus-visible { outline: 2px solid #00F5FF }` — do NOT remove. Verify keyboard nav lands a visible ring on every interactive element
> - [ ] **Live regions**: ticker has `aria-live="polite"` + `aria-atomic="false"`; expose a **pause** button for vestibular users
> - [ ] **FAB**: real `aria-label="Quick create"` (not just an icon)
> - [ ] **Decorative elements**: stack-shadow pseudo-elements + pebble decorations all `aria-hidden="true"`
> - [ ] **Reduced motion**: wrap pulse animations, ticker slide, drawer transitions in `@media (prefers-reduced-motion: no-preference) { ... }`
> - [ ] **Screen reader**: VoiceOver + NVDA pass on Hub, CRM, Deal Detail
> - [ ] **Keyboard navigation**: full tab order on Hub; Kanban drag-to-stage has keyboard equivalent (←/→ to move card)
> - [ ] **Form labels**: every input has an associated `<label>` (not just placeholder)
> - [ ] **Headings**: logical h1 → h2 → h3 hierarchy per route
> - [ ] **Skip link**: "Skip to main content" anchor in `src/app/layout.tsx`
> - [ ] **Color-only signaling**: status chips combine color + icon/text (n
> …

### UNI-2057 — Unite-Hub · Layered Design System — Handoff & Integration

- State: Backlog (backlog)
- Priority: High
- Project: Unite-Group
- Assignee: Unassigned
- Updated: 2026-05-25T06:31:14.792Z
- Labels: epic, Architecture, Ux, frontend
- Linear: https://linear.app/unite-group/issue/UNI-2057/unite-hub-layered-design-system-handoff-and-integration

Summary / Linear description excerpt:

> ## Layered Design System — v1 Handoff

> A complete light/paper-aesthetic redesign for the Unite-Hub founder app, delivered as **live HTML prototypes + JSX source**. Lives under `design/unite-hub-layered/` in the repo and ships **no app-code changes** — pure reference material gating the next integration phase.

> ### 📦 Deliverable

> GitHub: [`CleanExpo/Unite-Hub`](<https://github.com/CleanExpo/Unite-Hub>) → `design/unite-hub-layered/` (branch: `design/layered-handoff-v1`, PR pending push)

> ```
> design/unite-hub-layered/
> ├── README.md             ← overview + adoption-strategy decision
> ├── INTEGRATION.md        ← token mapping, component-extraction order, mock-data swap
> ├── PUSH-INSTRUCTIONS.md  ← git commands + suggested PR description
> ├── tokens/design-tokens.json
> ├── prototypes/index.html ← launcher for all 14 screens
> ├── prototypes/*.html     ← 14 runnable screens
> ├── src/*.jsx             ← 15 JSX component sources
> └── screenshots/
> ```

> ### 🎨 Design language

> |  |  |
> | -- | -- |
> | **Aesthetic** | Light cream paper, layered shadow elevation, 3D-depth treatment |
> | **Brand** | Unite-Group Nexus — navy `#162D5B` + teal `#2BA3B5` |
> | **Accent** | Green `oklch(64% 0.16 152)` for primary CTA, coral for revenue |
> | **Type** | Poppins (UI) + IBM Plex Mono (numerals/meta) |
> | **Radii** | 10 / 16 / 22 / 28 px |
> | **Surfaces** | White paper cards, no borders, elevation via `--shadow-1/2/3`
> …

### UNI-2061 — Phase 3 · Vertical slice — Command Center end-to-end

- State: Backlog (backlog)
- Priority: High
- Project: Unite-Group
- Assignee: Unassigned
- Updated: 2026-05-25T06:30:06.956Z
- Labels: ui, core, dashboard, frontend
- Linear: https://linear.app/unite-group/issue/UNI-2061/phase-3-vertical-slice-command-center-end-to-end

Summary / Linear description excerpt:

> ## Phase 3 — Vertical slice: Command Center

> Port the founder Command Center end-to-end as the **first integration**. Validates that tokens + primitives compose into a real screen, and that the Supabase data layer can feed the design.

> ### Target route

> `src/app/(founder)/founder/dashboard/page.tsx`

> ### Source

> * Prototype: `design/unite-hub-layered/prototypes/Unite-Hub Command Center.html`
> * Component: `design/unite-hub-layered/src/screen-hub.jsx` + `layered-hub.jsx`
> * Screenshot: `design/unite-hub-layered/screenshots/layered-hub.png`

> ### Layout to implement

> * 80px rail (left) — re-uses `<Sidebar>` primitive
> * Top bar (breadcrumb + search + org pill + live indicator)
> * 4-up KPI row (Revenue, MRR, Hot Leads, Pipeline Velocity)
> * Bento grid:
>   * Today's meetings (right column)
>   * Active deals snapshot (left, wide)
>   * AI alerts (wins / risks / warnings stacked)
>   * Recent activity feed
> * Fixed-bottom live ticker
> * FAB (quick create)
> * Right panel: Tasks + Meetings + Alerts (collapses into drawer on tablet)

> ### Data wiring (Supabase)

> Replace mock data from `src/shared-data.jsx`:

> | Mock | Real source |
> | -- | -- |
> | KPIs | Aggregate queries on `contacts.ai_score`, `campaigns.total_*`, `email_opens`, `emails` |
> | Meetings | Microsoft Graph `/me/calendar/events` (existing Outlook OAuth) |
> | Tasks | `campaign_steps` where `scheduled_for <= now()` |
> | Activity feed | Supabase r
> …

## Full open queue snapshot

| Issue | State | Priority | Project | Updated | Title |
| --- | --- | --- | --- | --- | --- |
| [UNI-2058](https://linear.app/unite-group/issue/UNI-2058/phase-0-engineering-review-and-adoption-decision-replace-parallel) | In Progress | Urgent | Unite-Group | 2026-05-30T11:44:06.770Z | Phase 0 · Engineering review & adoption decision (replace / parallel / cherry-pick) |
| [UNI-2060](https://linear.app/unite-group/issue/UNI-2060/phase-2-extract-ui-primitives-card-kpi-chip-tier-ticker-fab) | In Progress | High | Unite-Group | 2026-05-30T11:44:06.774Z | Phase 2 · Extract UI primitives (Card, KPI, Chip, Tier, Ticker, FAB, LiveIndicator, etc.) |
| [UNI-2059](https://linear.app/unite-group/issue/UNI-2059/phase-1-port-design-tokens-into-globalscss-tailwind-config) | In Progress | High | Unite-Group | 2026-05-30T11:44:06.771Z | Phase 1 · Port design tokens into globals.css + tailwind config |
| [UNI-2053](https://linear.app/unite-group/issue/UNI-2053/create-ccw-product-category-copy) | In Review | None | Brand OS Production Board | 2026-05-23T05:08:34.536Z | Create CCW product category copy |
| [UNI-2054](https://linear.app/unite-group/issue/UNI-2054/maintain-margot-command-center-and-restoreassist-content-index) | In Progress | None | Brand OS Production Board | 2026-05-23T04:46:35.401Z | Maintain Margot Command Center and RestoreAssist Content Index |
| [UNI-2079](https://linear.app/unite-group/issue/UNI-2079/configure-vercel-linear-api-key-telegram-webhook-for-autonomous-intake) | Todo | High | Dimitri ITR Platform | 2026-05-30T11:15:49.551Z | Configure Vercel: LINEAR_API_KEY + Telegram webhook for autonomous intake |
| [UNI-2080](https://linear.app/unite-group/issue/UNI-2080/duncan-run-discovery-telegram-loop-3q-batches-4-buttons) | Todo | High | Dimitri ITR Platform | 2026-05-30T11:15:02.231Z | Duncan: run /discovery Telegram loop (3Q batches + 4 buttons) |
| [UNI-2075](https://linear.app/unite-group/issue/UNI-2075/gmail-export-ingest-into-spm-intake-phill-vault) | Todo | High | Dimitri ITR Platform | 2026-05-28T02:07:42.868Z | Gmail export + ingest into SPM intake (Phill vault) |
| [UNI-2088](https://linear.app/unite-group/issue/UNI-2088/swat-cross-project-deployment-model-analysis-cloud-vs-connected-local) | Backlog | High | Unite-Group | 2026-05-30T03:29:36.391Z | SWAT: Cross-project deployment model analysis — Cloud vs Connected-Local |
| [UNI-2069](https://linear.app/unite-group/issue/UNI-2069/dimitri-epic-human-gates-12q-gmail-legal-board) | Backlog | High | Dimitri ITR Platform | 2026-05-27T23:33:00.425Z | [Dimitri] Epic: Human gates (12Q, Gmail, legal, board) |
| [UNI-2077](https://linear.app/unite-group/issue/UNI-2077/dsp-osf-ato-api-portal-onboarding) | Backlog | High | Dimitri ITR Platform | 2026-05-27T22:38:38.348Z | DSP OSF + ATO API Portal onboarding |
| [UNI-2066](https://linear.app/unite-group/issue/UNI-2066/phase-8-accessibility-audit-remediation-across-all-ported-screens) | Backlog | High | Unite-Group | 2026-05-25T06:31:14.792Z | Phase 8 · Accessibility audit + remediation across all ported screens |
| [UNI-2057](https://linear.app/unite-group/issue/UNI-2057/unite-hub-layered-design-system-handoff-and-integration) | Backlog | High | Unite-Group | 2026-05-25T06:31:14.792Z | Unite-Hub · Layered Design System — Handoff & Integration |
| [UNI-2061](https://linear.app/unite-group/issue/UNI-2061/phase-3-vertical-slice-command-center-end-to-end) | Backlog | High | Unite-Group | 2026-05-25T06:30:06.956Z | Phase 3 · Vertical slice — Command Center end-to-end |
| [UNI-2087](https://linear.app/unite-group/issue/UNI-2087/duncan-telegram-hello-need-to-know-more) | Backlog | Medium | Dimitri ITR Platform | 2026-05-29T08:28:00.744Z | [Duncan Telegram] Hello…. Need to know more? |
| [UNI-2086](https://linear.app/unite-group/issue/UNI-2086/duncan-telegram-vision-in-piceodimtr) | Backlog | Medium | Dimitri ITR Platform | 2026-05-29T08:16:56.886Z | [Duncan Telegram] /vision in PiCEODimtr |
| [UNI-2085](https://linear.app/unite-group/issue/UNI-2085/duncan-telegram-vision-in-piceodimtr) | Backlog | Medium | Dimitri ITR Platform | 2026-05-29T08:13:20.955Z | [Duncan Telegram] /vision in PiCEODimtr |
| [UNI-2070](https://linear.app/unite-group/issue/UNI-2070/dimitri-epic-regulated-mvp-real-ato-xpm-payments-noah) | Backlog | Medium | Dimitri ITR Platform | 2026-05-27T22:38:32.308Z | [Dimitri] Epic: Regulated MVP (real ATO / XPM / payments / NOAH) |
| [UNI-2065](https://linear.app/unite-group/issue/UNI-2065/phase-7-mobile-tablet-responsive-implementation) | Backlog | Medium | Unite-Group | 2026-05-25T06:30:54.833Z | Phase 7 · Mobile + Tablet responsive implementation |
| [UNI-2064](https://linear.app/unite-group/issue/UNI-2064/phase-6-port-finance-intel-people-surfaces) | Backlog | Medium | Unite-Group | 2026-05-25T06:30:47.673Z | Phase 6 · Port Finance + Intel + People surfaces |
| [UNI-2063](https://linear.app/unite-group/issue/UNI-2063/phase-5-port-deals-pipeline-deal-detail-kanban-drag-to-stage) | Backlog | Medium | Unite-Group | 2026-05-25T06:30:27.813Z | Phase 5 · Port Deals pipeline + Deal detail (Kanban + drag-to-stage) |
| [UNI-2062](https://linear.app/unite-group/issue/UNI-2062/phase-4-port-crm-list-contact-detail) | Backlog | Medium | Unite-Group | 2026-05-25T06:30:21.474Z | Phase 4 · Port CRM list + Contact detail |
| [UNI-2056](https://linear.app/unite-group/issue/UNI-2056/unite-hub-surface-restoreassist-report-quality-and-field-data-signals) | Backlog | Medium | Unite-Group | 2026-05-22T21:47:05.775Z | [UNITE-HUB] Surface RestoreAssist report-quality and field-data signals in Command Centre |
| [UNI-2084](https://linear.app/unite-group/issue/UNI-2084/vision-discovery-vision-3-why-idea-parking-distribution-set) | Backlog | None | Dimitri ITR Platform | 2026-05-29T11:23:40.179Z | Vision Discovery — /vision 3-why + /idea parking + distribution set |

## Watcher metadata

- Script: `/Users/phillmcgurk/.hermes/scripts/linear_to_margot_today.py`
- Output: `/Users/phillmcgurk/Unite-Group/docs/margot/linear-watch-today.md`
- This file intentionally contains no Linear API key or other secrets.
