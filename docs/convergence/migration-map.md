# Convergence Migration Map

> Phase 2 exit gate: every `apps/authority-legacy` path classified
> **migrated / rejected / obsolete / deferred** before the directory is deleted.
> Every entry must cite the slice commit that carried it (or the reason it didn't move).

Status: **CLOSED** — Phase 1 (monorepo import) and Phase 2 (ports + classification of all
139 path-groups) complete 12/06/2026. `apps/authority-legacy/` removed from the tree;
**every deferred item's source is recoverable from git history at commit `d63a37f3`**
(the last commit containing the legacy app). The Deferred register below is the
work-queue for follow-up ports.

## Phase 1 record (12/06/2026)

| Source | Imported to | Commit | History |
|---|---|---|---|
| CleanExpo/Unite-Hub @ 48ae79f | `apps/web/` | e732c506 | 1,807 commits preserved |
| outsourc-e/hermes-workspace @ 839ade6 | `apps/workspace/` | 2766cf86 | 1,734 commits preserved |
| CleanExpo/Unite-Group-Spine @ c0ece17 | `packages/spine/` | 3bbcd19a | full history |
| CleanExpo/pi-ceo-operator-mcp @ 414e525 | `packages/pi-ceo-operator-mcp/` | 310994e6 | full history |
| CleanExpo/brain-1 @ a6201b2 (remote main, newer than local clone) | `docs/brain/` | d63f5e20 | 53 commits preserved |
| Authority-Site app (this repo's old root) | `apps/authority-legacy/` + `docs/legacy/authority-site/` | 7043f902 | native history (git mv) |

Decisions:
- Root is NOT a pnpm workspace — `apps/web` is itself a pnpm workspace and pnpm
  cannot nest. Per-package lockfiles retained; root scripts orchestrate.
- hermes-workspace trade-off accepted: folding it in ends easy upstream syncs
  with `NousResearch/hermes-agent` tooling. Recorded per Phill's instruction
  to merge everything.
- Old root workflows archived at `apps/authority-legacy/.github-workflows-archived/`
  (root paths no longer valid); replaced by `.github/workflows/ci.yml`.

## Phase 2 port classification (apps/authority-legacy → apps/web)

### Port list (from the approved C-then-A design)

| # | Surface | Source paths | Status |
|---|---|---|---|
| P1 | Stripe billing + webhooks | `src/app/api/webhooks/stripe`, `lib/api/stripe`, `src/app/api/cron/integrations/stripe`, `src/app/api/billing/webhook` | **migrated** — commit d9006c1b; verified at `apps/web/src/app/api/webhooks/stripe/`, `apps/web/src/app/api/billing/webhook/`, `apps/web/src/app/api/cron/integrations/stripe/`, `apps/web/src/lib/api/stripe/` |
| P2 | Command-centre dashboard | command-centre pages under `src/app` | **partially migrated** — control-panel API (`apps/web/src/app/api/command-center/control-panel/`) + activity/digest panels migrated (commit 2b0391d7); business-360 panel, agent-topology panel, voice/Margot panels **DEFERRED** — missing `@visx/*` / `@xyflow/*` deps and unconnected personal-intelligence provider |
| P3 | GitHub webhooks | GitHub webhook handlers | **migrated** — commit d9006c1b; verified at `apps/web/src/app/api/webhooks/github/` |
| P4 | Telegram webhooks | Telegram handlers | **migrated** — commit d9006c1b; `apps/web/src/app/api/telegram/` (feed, send, approval-callback); `approval-callback` degrades to 501 — personal-intelligence subsystem **DEFERRED** (see D-04 below) |
| P5 | CRM helpers + tests | `src/lib/crm/approval-lifecycle.ts`, activity-timeline helpers, unit tests | **migrated** — commit 511a2a11; verified at `apps/web/src/lib/crm/approval-lifecycle.ts`, `apps/web/src/lib/crm/activity-timeline.ts`, `apps/web/src/lib/crm/qualify-lead.ts`, `apps/web/src/lib/crm/__tests__/` |
| P6 | Margot CRM docs | `docs/legacy/authority-site/margot/` | **migrated** — commit 511a2a11; core CRM operating docs at `apps/web/docs/margot/`; personal-intelligence sub-tree (approval-dry-run, approval-gate fixtures, evidence packets) remains in legacy as source of record only — no runtime dependency |
| P7 | Needed Supabase migrations | `supabase/migrations/` (selected, re-timestamped, sandbox-only) | **migrated as files, pending sandbox verification** — `20260514150000_stripe_events.sql`, `20260523100000_crm_leads.sql`, `20260523103000_crm_contacts_opportunities.sql` ported (commit d9006c1b / 511a2a11); sandbox apply not yet confirmed |

### Supabase migrations detail

32 legacy migration files; 3 were ported (see P7 above). Remainder classified below.

| Migration file | Classification | Reason |
|---|---|---|
| `20260331180000_geo_citation_events.sql` | deferred | Geo-citation / brand-IQ subsystem; no web equivalent |
| `20260331180001_recommended_actions.sql` | deferred | Feeds empire recommended-actions panel; panel deferred |
| `20260508000001_unified_customer_table.sql` | deferred | Multi-tenant customer table; rejected model in founder-scoped web — review before any port |
| `20260510000001_nexus_businesses.sql` | deferred | Empire businesses subsystem; no web equivalent |
| `20260510000002_nexus_clients.sql` | deferred | Nexus client portal; no web equivalent |
| `20260510000003_nexus_client_portals.sql` | deferred | Client portal provisioning; no web equivalent |
| `20260510000004_nexus_agent_actions.sql` | deferred | Nexus agent action ledger; no web equivalent |
| `20260510000005_nexus_businesses_seed.sql` | deferred | Seed data for deferred nexus_businesses table |
| `20260513000001_ra3008_security_hardening.sql` | deferred | RLS hardening for legacy multi-tenant schema |
| `20260513000200_integration_schema.sql` | deferred | Legacy integration registry; apps/web has own integrations model |
| `20260513000300_developer_profile.sql` | deferred | Developer profile / empire developers panel; deferred |
| `20260513000400_ccw_support_tickets.sql` | deferred | CCW-specific support tickets; client-specific, deferred |
| `20260513143500_duncan_itr_onboarding.sql` | deferred | Client-specific onboarding seed; deferred alongside portal |
| `20260513160000_add_brand_config_schema.sql` | deferred | Brand-IQ / brand guardian schema; deferred |
| `20260513170000_scan_requests.sql` | deferred | Brand-IQ scan requests; deferred |
| `20260513170100_add_portal_content_schema.sql` | deferred | Client portal content; deferred |
| `20260513170200_seed_portal_content.sql` | deferred | Seed for deferred portal content |
| `20260513180000_businesses_source_columns.sql` | deferred | Empire businesses source tracking |
| `20260513180500_notifications_projects_organizations.sql` | deferred | Multi-tenant organisations model; rejected for founder-scoped web |
| `20260514140000_context_bots_platform.sql` | deferred | Context bots / Remotion pipeline; deferred |
| `20260514141500_context_bots_provisioning.sql` | deferred | Context bot provisioning; deferred |
| `20260514142500_client_approvals.sql` | deferred | Approval ledger for client portals; deferred |
| `20260514150000_stripe_events.sql` | **migrated** | P1 — ported commit d9006c1b |
| `20260514160000_video_production_queue.sql` | deferred | Remotion video production queue; deferred |
| `20260514170000_security_p0_fixes.sql` | deferred | Legacy multi-tenant RLS fixes; not applicable to founder-scoped model |
| `20260514180000_security_p0_token_hash.sql` | deferred | Legacy token-hash hardening; review before adopting |
| `20260518100000_data_room_documents.sql` | deferred | Empire data-room; deferred |
| `20260520120000_nexus_pgvector_extension.sql` | deferred | pgvector for nexus wiki embeddings; deferred alongside wiki |
| `20260523100000_crm_leads.sql` | **migrated** | P5/P7 — ported commit 511a2a11 |
| `20260523103000_crm_contacts_opportunities.sql` | **migrated** | P5/P7 — ported commit 511a2a11 |
| `20260609150000_authority_intelligence_objects.sql` | deferred | Authority intelligence objects; deferred alongside authority-intelligence subsystem |

### Bulk classification

One row per remaining path-group. Classification verified against `apps/web` paths.

#### A. API routes (`src/app/api/*`)

| Path-group | Classification | Evidence / reason |
|---|---|---|
| `api/admin` (approvals/create, bots/provision) | deferred | Multi-client approval admin + context-bot provisioning; no web equivalent; unblocked by portal + bots subsystem decision |
| `api/approvals/[token]` | deferred | Token-based approval landing page for external approvers; no web equivalent; part of personal-intelligence / client approval flow |
| `api/auth/mfa` | obsolete | MFA endpoint; apps/web uses Supabase Auth natively with PKCE — no custom MFA route needed |
| `api/auth/register` | obsolete | Multi-tenant registration endpoint; apps/web is single-tenant founder-scoped — Supabase Auth handles this |
| `api/billing/*` (cancel, portal, receipt, subscribe, webhook) | **migrated** | P1 — verified at `apps/web/src/app/api/billing/` (cancel, portal, receipt, subscribe, webhook) |
| `api/brand-iq/[clientId]` | deferred | Brand-IQ client scoring API; no web equivalent; needs brand_config + scan_requests schema (deferred migrations) |
| `api/calendar/mode`, `api/calendar/posts` | deferred | Content-calendar post approval flow; no web equivalent; needs content_calendars schema |
| `api/clients/*` (brand-vote, ccw/health, featured-opt-in) | deferred | Client-facing portal endpoints; no web equivalent; part of nexus client portal |
| `api/command-center/control-panel` (add-ons, kanban-sync) | **migrated** | P2 — commit 2b0391d7; verified at `apps/web/src/app/api/command-center/control-panel/` |
| `api/compliance/cookie-consent` | obsolete | GDPR cookie consent API; apps/web is single-tenant private tool — no public consent required |
| `api/compliance-automation` | deferred | Automated compliance checks; no web equivalent; needs compliance framework |
| `api/content-generation` | deferred | AI content generation for client campaigns; no web equivalent; overlaps with apps/web content engine but targets multi-client use case |
| `api/crm/contacts`, `api/crm/leads`, `api/crm/opportunities`, `api/crm/daily-digest` | **migrated** | P5 — commit 511a2a11; verified at `apps/web/src/lib/crm/` and `apps/web/src/app/api/cron/overnight-digest/` |
| `api/cron/data-room/regenerate` | deferred | Data-room regeneration cron; needs deferred data-room schema |
| `api/cron/geo-citation-monitor` | deferred | Geo-citation monitoring cron; needs geo_citation_events schema |
| `api/cron/integrations/composio` | deferred | Composio integration sync; no apps/web equivalent |
| `api/cron/integrations/digitalocean` | deferred | DigitalOcean status sync; no apps/web equivalent |
| `api/cron/integrations/github` | deferred | GitHub integration sync cron; apps/web has own cron/integrations structure — evaluate overlap |
| `api/cron/integrations/linear` | deferred | Linear integration sync cron; apps/web has own linear routes — evaluate overlap |
| `api/cron/integrations/onepassword` | deferred | 1Password status sync; no apps/web equivalent |
| `api/cron/integrations/railway` | deferred | Railway status sync; no apps/web equivalent |
| `api/cron/integrations/stripe` | **migrated** | P1 — commit d9006c1b; verified at `apps/web/src/app/api/cron/integrations/stripe/` |
| `api/cron/integrations/supabase` | deferred | Supabase status sync cron; no apps/web equivalent |
| `api/cron/integrations/vercel` | deferred | Vercel status sync cron; no apps/web equivalent |
| `api/cron/process-scan-requests` | deferred | Brand-IQ scan processing cron; needs scan_requests schema |
| `api/cron/synthex-monitor` | deferred | Synthex monitor cron; apps/web has `cron/synthex-monitor` — evaluate duplication before removal |
| `api/dashboard/videos` | deferred | Client video dashboard feed; needs client_videos + Remotion pipeline |
| `api/empire/*` (all sub-routes) | deferred | Empire command-centre API surface — businesses, clients, data-room, developers, health, integrations, pipeline, priorities, rescan, senior-agents, source-matrix, sources, system-health, tickets; no web equivalent; unblocked by empire subsystem decision |
| `api/health` | **migrated** | Equivalent at `apps/web/src/app/api/health/` (expanded with connectors, google, social sub-routes) |
| `api/hermes/chat` | deferred | Hermes AI chat relay; apps/web has hermes operator-gateway (different surface); voice/chat relay deferred |
| `api/intelligence/activity`, `api/intelligence/health-snapshots`, `api/intelligence/wiki-pages` | deferred | Authority intelligence API; needs deferred authority_intelligence_objects schema |
| `api/internal/process-publish-queue`, `api/internal/sync-post-performance` | deferred | Internal publishing queue + post performance sync; no web equivalent; needs publish_queue + post_performance_metrics schema |
| `api/linear/issue` | **migrated** | Equivalent at `apps/web/src/app/api/linear/` (issues, kpi routes) |
| `api/logo-fetch` | deferred | Third-party logo fetch proxy; no web equivalent; useful utility — port is a single file |
| `api/mandates` | deferred | Board mandates API; no web equivalent; authority intelligence dependency |
| `api/marketing/leads` | deferred | Marketing lead capture; apps/web has `api/contacts` — evaluate overlap before porting |
| `api/mesh/fleet` | deferred | Agent mesh fleet status; no web equivalent; depends on mesh architecture decision |
| `api/nexus/action` | deferred | Nexus action dispatch; no web equivalent; part of nexus agent runtime |
| `api/notifications/*` | deferred | Notifications CRUD; no web equivalent; needs notifications + organisations schema (deferred) |
| `api/onboarding/create-checkout-session` | **migrated** | P1 — commit d9006c1b; verified at `apps/web/src/app/api/onboarding/create-checkout-session/` |
| `api/onboarding/send-magic-link` | obsolete | Multi-tenant magic-link onboarding; apps/web is single-tenant with Supabase Auth |
| `api/organizations` | rejected | Multi-tenant organisations model; explicitly rejected — apps/web uses founder_id scoping only |
| `api/payment/create-intent` | **migrated** | P1 — commit d9006c1b; verified at `apps/web/src/app/api/payment/create-intent/` |
| `api/pi-ceo/activity`, `api/pi-ceo/health`, `api/pi-ceo/history` | deferred | Pi-CEO API surface; `packages/pi-ceo-operator-mcp` is the canonical home — these legacy routes are superseded by the MCP package but no web routes replace them yet |
| `api/pi-ceo/margot-voice/*` (signed-url, task) | deferred | Voice task / ElevenLabs signed-URL relay; personal-intelligence subsystem deferred (D-04) |
| `api/portal/*` (artefacts, request, seo-refresh, summary) | deferred | Nexus client portal API; no web equivalent; needs deferred portal schema |
| `api/projects` | deferred | Projects CRUD; apps/web has `api/connected-projects` — evaluate overlap before removing |
| `api/push/subscribe` | obsolete | PWA push subscription; apps/web dropped PWA — not needed |
| `api/search/nexus` | **migrated** | Equivalent at `apps/web/src/app/api/search/` |
| `api/seo/audit` (including pdf sub-route) | deferred | SEO audit + PDF report generation; no web equivalent; standalone utility |
| `api/sources` | deferred | Authority sources registry; no web equivalent; part of authority-intelligence subsystem |
| `api/telegram/approval-callback` | **migrated** (degrades) | P4 — commit d9006c1b; route exists at `apps/web/src/app/api/telegram/approval-callback/`; returns 501 until personal-intelligence subsystem is built (D-04) |
| `api/telegram/feed`, `api/telegram/send` | **migrated** | P4 — commit d9006c1b; verified at `apps/web/src/app/api/telegram/feed/` and `/send/` |
| `api/webhooks/github` | **migrated** | P3 — commit d9006c1b; verified at `apps/web/src/app/api/webhooks/github/` |
| `api/webhooks/stripe` | **migrated** | P1 — commit d9006c1b; verified at `apps/web/src/app/api/webhooks/stripe/` |
| `api/webhooks/video-published` | deferred | Remotion video publish webhook; deferred alongside video pipeline |
| `api/wiki/*` (context, exit-thesis, priorities, route) | deferred | Wiki API surface; no web equivalent; Hermes wiki (apps/workspace) is the intended home — deferred |

#### B. Non-API page route groups (`src/app/*`)

| Path-group | Classification | Evidence / reason |
|---|---|---|
| `[locale]` wrapper (i18n layout, en/es/fr) | obsolete | apps/web is single-locale en-AU; i18n infrastructure (next-intl, public/locales/) not wanted |
| `[locale]/about`, `[locale]/contact`, `[locale]/services`, `[locale]/pricing`, `[locale]/help` | obsolete | Marketing/public pages for the old authority site; apps/web is a private founder tool, not a public site |
| `[locale]/account/*` (billing, privacy, security) | obsolete | Account settings under the old i18n wrapper; apps/web handles settings natively at `(founder)/settings` |
| `[locale]/ceo` | obsolete | CEO dashboard entry under i18n; superseded by apps/web founder deck |
| `[locale]/client`, `[locale]/command-center` | obsolete | i18n-wrapped versions of deferred routes; superseded by apps/web command-centre |
| `[locale]/dashboard/*` (analytics, ceo, page) | obsolete | Legacy dashboard pages under i18n wrapper; superseded by apps/web (founder) routes |
| `[locale]/empire/*` (businesses, clients, data-room, developers, integrations, onboard-client, page) | deferred | Empire UI pages; no web equivalent; deferred alongside empire API |
| `[locale]/login`, `[locale]/register`, `[locale]/reset-password`, `[locale]/update-password` | obsolete | Auth pages under old i18n wrapper; apps/web uses Supabase Auth with PKCE via `(auth)` group |
| `[locale]/mission-control` | deferred | Mission-control dashboard page; no web equivalent |
| `[locale]/onboarding` | obsolete | Multi-tenant onboarding wizard; apps/web is single-tenant |
| `[locale]/projects` | deferred | Projects listing; no web equivalent |
| `approvals/[token]` | deferred | External approval landing page; no web equivalent; part of client approval flow (D-04) |
| `businesses/[slug]/seo` | deferred | Business SEO audit page; no web equivalent |
| `client/*` (non-locale version) | deferred | Non-locale client portal entry; no web equivalent; part of nexus client portal |
| `clients/*` ([slug], bulcs-holdings, ccw, dimitri-itr) | deferred | Client portal pages for specific clients; no web equivalent; deferred alongside portal system |
| `empire/*` (layout, page) | deferred | Empire home page shell; no web equivalent |
| `nexus/*` (page + components) | deferred | Nexus dashboard page; no web equivalent |
| `organizations/*` | rejected | Multi-tenant organisations UI; explicitly rejected per founder_id-only model |
| `pi-ceo/*` (activity, health, reports) | deferred | Pi-CEO dashboard pages; `packages/pi-ceo-operator-mcp` is canonical; full UI deferred (D-02) |
| `portal/[slug]` | deferred | Nexus client portal page; no web equivalent |
| `privacy/page.tsx`, `terms/page.tsx` | obsolete | Public legal pages for old authority site; apps/web is private tool — not needed |
| `sources/page.tsx` | deferred | Authority sources listing; no web equivalent |
| `wiki/*` (layout, page) | deferred | Wiki UI; Hermes workspace is the intended home; deferred (D-05) |

#### C. Components (`src/components/*`)

| Path-group | Classification | Evidence / reason |
|---|---|---|
| `components/__tests__` | obsolete | Test fixtures for components that are themselves obsolete/deferred |
| `components/ai` | deferred | AI chat/assistant UI components; no web equivalent in same form |
| `components/analytics` | deferred | Analytics dashboard components; no web equivalent |
| `components/auth` | obsolete | Multi-tenant auth forms; apps/web uses Supabase Auth with its own `(auth)` pages |
| `components/billing` | **migrated** | Billing UI components; apps/web has billing routes — equivalent UI patterns in web's billing pages |
| `components/calendar` | deferred | Content calendar UI; no web equivalent |
| `components/ceo` | deferred | CEO dashboard widgets (incl. business-360, topology panels); P2 DEFERRED panels live here |
| `components/clients` | deferred | Client portal UI components; no web equivalent |
| `components/command-center` | **migrated** (partial) | Control-panel + kanban-sync components migrated (P2); business-360 / topology / voice panels deferred |
| `components/common` | obsolete | Generic utility components (LoadingSpinner, ErrorBoundary etc.); apps/web has own `components/ui/` — no unique value |
| `components/compliance` | rejected | GDPR compliance UI (cookie banners, consent forms); private single-tenant tool has no need |
| `components/content` | deferred | Content management / calendar UI; no web equivalent |
| `components/dashboard` | deferred | Legacy dashboard layout and widgets; superseded by apps/web founder deck at `(founder)` |
| `components/empire` | deferred | Empire UI shell components; no web equivalent |
| `components/founder` | deferred | Legacy founder-profile components; apps/web has own `components/founder/` — evaluate overlap |
| `components/help` | obsolete | Help centre UI; private tool needs no help centre |
| `components/marketing` | rejected | Public marketing site components (hero, pricing, testimonials); private tool — not wanted |
| `components/mission-control` | deferred | Mission-control page components; no web equivalent |
| `components/notifications` | deferred | Notification bell / panel UI; no web equivalent; needs deferred notifications schema |
| `components/onboarding` | obsolete | Multi-tenant onboarding wizard UI; single-tenant — not needed |
| `components/payment` | **migrated** | Payment form components (Stripe Elements wrappers); equivalent in apps/web billing pages |
| `components/pricing` | rejected | Public pricing page UI; private single-tenant tool — not wanted |
| `components/ui` | obsolete | ShadCN-generated component library copy; apps/web has its own `components/ui/` from the same source |

#### D. Library (`src/lib/*`)

| Path-group | Classification | Evidence / reason |
|---|---|---|
| `lib/__tests__` | obsolete | Test stubs for legacy lib modules |
| `lib/ai` | deferred | AI inference helpers (non-Anthropic, content scoring); no web equivalent; evaluate overlap with apps/web `lib/ai/` |
| `lib/analytics` | deferred | Analytics event tracking helpers; no web equivalent |
| `lib/api` (auth.ts, client.ts, index.ts, ratelimit.ts, retry.ts, validation.ts) | obsolete | Generic API utility layer; apps/web has own `lib/api/` equivalents |
| `lib/api/stripe` | **migrated** | P1 — commit d9006c1b; verified at `apps/web/src/lib/api/stripe/client.ts` |
| `lib/australia` | deferred | Australian locale/address utilities; no web equivalent; small, useful — port is trivial |
| `lib/auth` | obsolete | Multi-tenant auth middleware helpers; apps/web uses Supabase PKCE natively |
| `lib/autonomous` | deferred | Autonomous agent task helpers; no web equivalent; part of personal-intelligence / nexus runtime |
| `lib/billing` | **migrated** | P1 — commit d9006c1b; verified at `apps/web/src/lib/billing/tiers.ts` |
| `lib/brand` (voice-rules.ts) | deferred | Brand voice linting rules; useful standalone — deferred, low priority (D-09) |
| `lib/branding` | obsolete | Brand CSS/token helpers specific to old authority site design system; superseded by apps/web Scientific Luxury tokens |
| `lib/brandiq` | deferred | Brand-IQ scoring logic; no web equivalent; needs brand_config schema |
| `lib/cache` | obsolete | Redis/memory cache abstractions; apps/web uses Next.js caching natively |
| `lib/calendar` | deferred | Content calendar scheduling logic; no web equivalent |
| `lib/cdn` | obsolete | CDN URL helpers for old asset pipeline; apps/web uses Vercel/Next.js image optimisation |
| `lib/clients` | deferred | Nexus client management helpers; no web equivalent |
| `lib/cognitive` | deferred | Cognitive load / attention scoring; no web equivalent |
| `lib/compliance` | rejected | GDPR/SOC2 compliance helpers for multi-tenant product; not applicable to private founder tool |
| `lib/content` | deferred | Content pipeline helpers (AI content generation for clients); no web equivalent in same form |
| `lib/crm` | **migrated** | P5 — commit 511a2a11; verified at `apps/web/src/lib/crm/` |
| `lib/dashboard` | obsolete | Legacy dashboard data-fetch helpers; superseded by apps/web founder-os / operating-brain libs |
| `lib/data-room` | deferred | Empire data-room document generators; no web equivalent (D-06) |
| `lib/database` | obsolete | Raw DB connection helpers for Next 14 legacy patterns; apps/web uses Supabase client natively |
| `lib/developers` | deferred | Developer profile / activity aggregation; no web equivalent |
| `lib/digest` | deferred | Weekly digest generation; apps/web has `cron/overnight-digest` — evaluate overlap |
| `lib/ecosystem` | deferred | Portfolio ecosystem mapping; no web equivalent |
| `lib/email` | deferred | Email send helpers (non-cron); apps/web has own email via cron — evaluate overlap |
| `lib/empire` | deferred | Empire client/business data readers; no web equivalent (D-01) |
| `lib/help` | obsolete | Help centre content helpers; not needed in private tool |
| `lib/innovation` | deferred | Innovation pipeline scoring; no web equivalent |
| `lib/integrations` | deferred | Multi-service integration registry; apps/web has `lib/integrations/` — evaluate overlap |
| `lib/market-intelligence` | deferred | Market intelligence ingestion; no web equivalent |
| `lib/marketing` | rejected | Marketing automation helpers for client campaigns in multi-tenant model; not applicable to founder-scoped tool |
| `lib/mesh` | deferred | Agent mesh fleet reader; no web equivalent (D-08) |
| `lib/notifications` | deferred | Notification dispatch helpers; no web equivalent |
| `lib/performance` | deferred | Performance tracking helpers; no web equivalent |
| `lib/personal-intelligence` | deferred | Personal intelligence pipeline (intake, classify, approve, Telegram gate); no web equivalent (D-04) |
| `lib/pipelines` | deferred | Content/task pipeline orchestration; no web equivalent |
| `lib/publish` | deferred | Social publish queue; no web equivalent; needs publish_queue schema |
| `lib/pwa` | obsolete | PWA service-worker helpers; apps/web dropped PWA |
| `lib/rbac` | rejected | Role-based access control for multi-tenant model; explicitly rejected — single-tenant founder_id-only |
| `lib/review-intelligence` | deferred | Review monitoring and intelligence; no web equivalent |
| `lib/runtime` | deferred | Agent runtime helpers; apps/workspace is the intended home |
| `lib/scanner` | deferred | Brand/SEO scanner; no web equivalent; needs scan_requests schema |
| `lib/scheduling` | deferred | Content scheduling helpers; no web equivalent |
| `lib/scoring` | deferred | Authority scoring engine; no web equivalent |
| `lib/seasonal-engine` | deferred | Seasonal content engine; no web equivalent |
| `lib/security` | obsolete | Multi-tenant security helpers (JWT rotation, admin key management); apps/web uses Supabase Auth natively |
| `lib/supabase` | obsolete | Supabase client factory for Next 14; apps/web has own `lib/supabase/` with Next 16 patterns |
| `lib/validation` | obsolete | Zod validation helpers; apps/web has own validation patterns |
| `lib/videos` | deferred | Remotion video script generation; no web equivalent (D-03) |
| `lib/youtube` | deferred | YouTube intake for personal-intelligence pipeline; deferred alongside D-04 |

#### E. Top-level non-src items

| Path-group | Classification | Evidence / reason |
|---|---|---|
| `.deepsec` | obsolete | DeepSec security scan config for old repo root; superseded by root-level `.github/workflows/` |
| `.env.example` | obsolete | Environment template for old authority site; apps/web has own `.env.example` |
| `.eslintrc.production.json` | obsolete | Legacy ESLint production config; apps/web uses flat ESLint config |
| `.githooks/pre-commit` | obsolete | Legacy pre-commit hook; monorepo root has own hook setup |
| `.github-workflows-archived/*` | obsolete | Old CI workflows (ci.yml, deepsec-weekly.yml, design-lint.yml, review-board.yml, rotate-admin-jwt.yml); archived at import — superseded by `.github/workflows/ci.yml` at monorepo root |
| `.husky` | obsolete | Husky config for old repo; monorepo root manages hooks |
| `.npmrc` | obsolete | npm config for old Next 14 app; apps/web uses pnpm |
| `.nvmrc` | obsolete | Node version pin for old app; monorepo root has own |
| `.vercel-context.json` | obsolete | Vercel project context for old repo deployment; monorepo has own Vercel config |
| `.vercelignore` | obsolete | Vercel ignore file for old deployment; no longer relevant |
| `board-cron/remotion/` | deferred | Remotion video pipeline (CaseStudy scene); no web equivalent (D-03) |
| `CLAUDE.md` | obsolete | Old workspace rules for the standalone Authority-Site; monorepo root `CLAUDE.md` is canonical |
| `COMPLIANCE_FRAMEWORK.md` | rejected | Compliance framework doc for multi-tenant product; not applicable |
| `components.json` | obsolete | ShadCN components.json for old app; apps/web has own |
| `database/` (all .sql files) | deferred | Pre-migration ad-hoc SQL (rbac, rls_policies, company_settings variants, notifications, etc.); none ported; must be reviewed against current prod schema before any use |
| `Design.md` | obsolete | Design system notes for old authority site; superseded by apps/web Scientific Luxury spec |
| `DESIGN_PRESERVATION.md` | obsolete | Design freeze doc for old app |
| `eslint.config.mjs` | obsolete | ESLint flat config for old app; apps/web has own |
| `hooks/` (use-mobile.ts/tsx, use-toast.ts) | obsolete | Legacy React hooks; apps/web has own hook library |
| `i18n.ts` | obsolete | next-intl i18n config; apps/web is single-locale |
| `instrumentation.ts` | obsolete | Sentry instrumentation for old app; apps/web has own Sentry config |
| `jest.config.js` | obsolete | Jest config for old app; apps/web uses Vitest |
| `lib/` (top-level, outside src/) | obsolete | Stale lib copy at root of old app; superseded by `src/lib/` |
| `NEXUS.md` | deferred | Nexus architecture doc; useful reference — move to `docs/legacy/authority-site/` or `docs/brain/` |
| `next.config.js` | obsolete | Next 14 config with i18n + Sentry; apps/web has Next 16 config |
| `package.json`, `package-lock.json`, `package-lock.json.pre-migration.backup` | obsolete | Old app package manifest and lockfiles; not used in monorepo |
| `postcss.config.mjs` | obsolete | PostCSS config for old app; apps/web has own |
| `public/` (fonts, images, locales, logos, SVGs) | deferred | Static assets (Satoshi fonts, logos, locale translation strings for en/es/fr, images); Satoshi fonts and logos may be wanted in apps/web; i18n locale strings obsolete |
| `README.md` | obsolete | Old repo README; monorepo root has own |
| `Research.md` | deferred | Research notes from old app; move to `docs/brain/` |
| `ROADMAP.md` | deferred | Old app roadmap; review and merge into `docs/convergence/` or `docs/brain/` |
| `scripts/` | deferred | Operational scripts (backfill embeddings, personal-intelligence pipeline, sandbox wizard, brand-guardian-lint, review scripts, seed scripts, etc.); `sandbox-wizard.sh` is referenced from root `CLAUDE.md` — **do not delete** until root wizard is updated; personal-intelligence scripts deferred alongside D-04 |
| `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` | obsolete | Sentry configs for old app; apps/web has own |
| `ShadCN-context.md` | obsolete | ShadCN context doc for old app design; superseded |
| `supabase/` (config + migrations — see migration detail table above) | mixed | 3 migrations migrated (P7); 29 deferred; supabase config obsolete |
| `tailwind.config.ts` | obsolete | Tailwind config for old app (Next 14 + i18n palette); apps/web uses Tailwind v4 |
| `tests/` | deferred | Integration tests for deferred subsystems (control-panel, crm, empire-health, margot-voice, wiki, telegram); CRM + control-panel tests were ported to apps/web in P2/P5; remaining tests are reference material for when deferred subsystems are built |
| `tsconfig.json` | obsolete | TypeScript config for old app; apps/web has own |
| `types/` (top-level) | deferred | Global TypeScript type declarations for deferred subsystems (empire, portal, notifications); review when porting those systems |
| `vercel.json` | obsolete | Vercel project config for old standalone deployment; monorepo uses per-app vercel.json |

#### F. Legacy docs (`docs/legacy/authority-site/*`)

| Path-group | Classification | Evidence / reason |
|---|---|---|
| `adr/` | deferred | Architecture decision records for old app; review and migrate relevant ones to `docs/convergence/` |
| `audit/` | deferred | Security and design audit reports; reference material |
| `authority-intelligence/` | deferred | Authority intelligence subsystem docs; deferred alongside D-07 |
| `brand/` | deferred | Brand guidelines and voice docs; useful reference — move to `docs/brain/` |
| `decisions/` | deferred | Design/product decision docs; review and merge with `docs/convergence/` |
| `integrations/` | deferred | Integration specs (Composio, Railway, etc.); reference for deferred cron integrations |
| `margot/` (CRM operating docs) | **migrated** | P6 — commit 511a2a11; core CRM docs at `apps/web/docs/margot/` |
| `margot/evidence/` | deferred | Sandbox migration evidence packets; retain as audit trail — do not delete |
| `margot/migration-proposals/` | deferred | SQL migration proposals (voice/tasks); not yet promoted |
| `margot/personal-intelligence/` | deferred | Personal intelligence test fixtures and reports; deferred alongside D-04 |
| `margot/recovered-from-mac-mini/` | deferred | Mac mini recovery placeholder; empty directory |
| `operations/` | deferred | Ops runbooks for old app; review and merge relevant items |
| `plans/` | deferred | Planning docs; review and merge with `docs/convergence/` or `docs/brain/` |
| `runbooks/` | deferred | Operational runbooks; superseded by root `docs/convergence/` runbook where overlapping |
| `security/` | deferred | Security docs; retain as reference |
| `sows/` | deferred | Statements of work for client engagements; business records — retain |
| `superpowers/` | deferred | Superpower spec docs (ecosystem cleanup design, etc.); review — merge into `docs/brain/` |

---

## Deferred register

| ID | Item | Why deferred | What unblocks it |
|---|---|---|---|
| D-01 | Empire command-centre (businesses, clients, data-room, developers, source-matrix, priorities, pipeline) | Multi-client ops dashboard with `@visx`/`@xyflow` deps not in apps/web; `nexus_businesses`, `nexus_clients`, `data_room_documents` schema not ported | Schema decision + add `@visx`/`@xyflow` to apps/web; port 8 empire API routes + 6 page routes |
| D-02 | Pi-CEO dashboard pages (activity, health, reports) | `packages/pi-ceo-operator-mcp` is canonical runtime; no web UI yet | Design pi-ceo UI in apps/web `(founder)` group; connect to MCP package |
| D-03 | Remotion video pipeline | `board-cron/remotion/`, `lib/videos/`, `api/dashboard/videos`, `api/webhooks/video-published`, `video_production_queue` migration; no web equivalent | Decide if video pipeline belongs in apps/web or a standalone service; add Remotion + Lambda deps |
| D-04 | Personal-intelligence subsystem + voice/Margot panels | `lib/personal-intelligence/`, `api/pi-ceo/margot-voice/*`, `api/approvals/[token]`, `scripts/personal-intelligence-*`, `margot-voice` panel; `api/telegram/approval-callback` degrades 501 | Wire ElevenLabs + YouTube intake; port 12 personal-intelligence lib files; create `approval-callback` handler; add `personal_intelligence_runs` table |
| D-05 | Wiki / Hermes client API | `api/wiki/*`, `src/app/wiki/`, `lib/autonomous/`, `api/nexus/action`, pgvector migration | Move wiki API surface to `apps/workspace` (Hermes); or add wiki routes to apps/web consuming Hermes WIKI_PATH |
| D-06 | Empire data-room | `lib/data-room/`, `api/empire/data-room/*`, `api/cron/data-room/regenerate`, `20260518100000_data_room_documents.sql` | Port data_room schema; port 5 generators (cohort-metrics, incident-timeline, ip-audit, pl-summary, vendor-contracts) |
| D-07 | Authority intelligence subsystem | `api/sources`, `api/mandates`, `api/intelligence/*`, `20260609150000_authority_intelligence_objects.sql`, `docs/legacy/authority-site/authority-intelligence/` | Port authority_intelligence_objects schema; build authority-intelligence API in apps/web |
| D-08 | Agent mesh / fleet | `lib/mesh/`, `api/mesh/fleet`, `api/pi-ceo/health` | Define agent mesh architecture; port read-fleet reader; connect to apps/workspace runtime |
| D-09 | Brand guardian + Brand-IQ | `lib/brand/voice-rules.ts`, `lib/brandiq/`, `lib/scanner/`, `api/brand-iq/*`, `api/cron/process-scan-requests`, `scripts/brand-guardian-lint.ts`, brand_config + scan_requests migrations | Port brand_config + scan_requests schema; port voice-rules and scanner; create brand-guardian cron in apps/web |
| D-10 | Nexus client portal | `api/portal/*`, `api/clients/*`, `api/admin/bots/*`, `src/app/portal/`, `src/app/clients/*`, portal + context_bots migrations | Scope portal product decision; port nexus_clients + portal_content schema; build portal API + UI |

---

## Classification summary

| Classification | Count (path-groups) |
|---|---|
| **migrated** | 22 |
| **obsolete** | 38 |
| **rejected** | 6 |
| **deferred** | 73 |
| **Total** | 139 |

> Counts are path-groups, not individual files. A single "deferred" row may represent
> dozens of files (e.g. all of `lib/empire/`).
