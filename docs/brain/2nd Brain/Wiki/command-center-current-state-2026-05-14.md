---
type: wiki
updated: 2026-05-14
---

# Command Center — Current State Audit (2026-05-14)

Brutal diagnostic of the surface served at `/en/empire` (the live Empire Command Center) and the dead/redirected `/en/ceo` + `/en/dashboard/ceo` routes. Authored to brief the [[command-center-wow-factor]] design-proposal phase.

## What exists today

### Routes

- `/Users/phill-mac/pi-seo-workspace/unite-group/src/app/[locale]/ceo/page.tsx` — **6-line redirect file**. Just `redirect('/en/empire')`. No UI.
- `/Users/phill-mac/pi-seo-workspace/unite-group/src/app/[locale]/dashboard/ceo/page.tsx` — **5-line redirect file**. Identical: `redirect('/en/empire')`.
- `/Users/phill-mac/pi-seo-workspace/unite-group/src/app/[locale]/empire/page.tsx` — **1,048 lines, single file**. The actual surface. Client component named `EmpireCommandCenter`.
- `/Users/phill-mac/pi-seo-workspace/unite-group/src/app/[locale]/empire/layout.tsx` — **15-line shell**. Sets `<title>Empire Command Center</title>`. No layout chrome beyond passing children through.
- Sub-routes under `/empire/`: `/empire/businesses` (drilldown), `/empire/developers`, `/empire/integrations`, `/empire/onboard-client`. Not part of the home surface.

### Components

**Legacy (dead, still in tree):**
- `src/components/ceo/CeoDashboard.tsx` — **916 lines**. The old surface. Heavy framer-motion, Recharts, **Lucide icons** (`Zap, TrendingUp, GitBranch, CheckCircle2, XCircle, Circle, Activity, BarChart3, RefreshCw, Clock, ArrowUpRight`). Bento grid + animated EmpireScore SVG ring. Imported by nothing in the live routes — only kept warm by `index.ts`.
- `src/components/ceo/BusinessCard.tsx` (124 L) — uses Tailwind `bg-slate-900/80`, `backdrop-blur-sm`. Not used by `/empire`.
- `src/components/ceo/LiveFeed.tsx`, `MetricPill.tsx`, `StatusDot.tsx` (small Tailwind helpers) — not used by `/empire`.
- `src/components/ceo/TelegramFeed.tsx` (245 L) — uses Lucide `Send, Loader2, MessageSquare, Wifi, WifiOff`. Not mounted on the live page.

**Live (referenced from `/empire/page.tsx`):**
- `src/components/empire/SystemHealthTile.tsx` (363 L) — 6 sub-tile grid (Database / API / Integrations / Businesses / Pi-CEO Scanner / Deploys). Each tile = coloured dot + summary string. Hits `/api/empire/system-health`.
- `src/components/empire/SourceMatrixGrid.tsx` (649 L) — 6 brands × 5 sources = 30 status dots in a table. Click a cell → side drawer with details + remediation mailto. Hits `/api/empire/source-matrix`.
- `src/components/empire/BusinessLogo.tsx` (100 L) — real PNG/SVG logos from `/public/logos/` with geometric mark fallback (`SynthexMark` etc. from `src/components/ui/marks.tsx`).
- `src/components/empire/EmpireSidebar.tsx` (239 L) — 240 px sidebar. Brand wordmark, Command Center + CCW Portal nav, Intelligence section (Wiki / Sources / Activity / Developers / Health / SEO Reports), Portfolio list with 6 brands + per-brand SEO sub-link, Clients section.

**Live but used elsewhere on sub-routes:**
- `ActivitySparkline.tsx` (54 L), `BranchTicketMatrix.tsx` (106 L), `DeveloperCard.tsx` (172 L), `IntegrationMatrix.tsx` (157 L), `StaleBranchAlert.tsx` (85 L) — all driven by `/empire/developers` and `/empire/integrations`, **not** the Command Center home.

**Inline-defined inside `/empire/page.tsx` (no separate file):**
- `EmpirePulseBar`, `PriorityCard`, `PriorityCardSkeleton`, `BusinessHealthRow`, `BusinessHealthSkeleton`, `BoardAlerts`, `Shimmer`. ~470 of the 1,048 lines of `page.tsx` are these inline components, defined with inline `style={{ ... }}` literals — no CSS file, no styled-component, no Tailwind.

### Data sources / APIs

The live home page hits 5 endpoints:

| Endpoint | File | Returns |
|---|---|---|
| `GET /api/empire/businesses` | `src/app/api/empire/businesses/route.ts` (142 L) | `{ businesses[], summary{ total_arr, avg_health, at_risk_count, last_rescan, has_live_data }, fetched_at }` — joined from `businesses` + `pi_ceo_health_snapshots` Supabase tables. Polled every 30 s. |
| `GET /api/empire/priorities` | `route.ts` (85 L) | `{ priorities[] }` — top 8 Linear issues with priority ≤ 2 and state ≠ completed. Direct Linear GraphQL. One-shot. |
| `GET /api/empire/pipeline` | `route.ts` (98 L) | `{ stages[5], ideas_in_flight, board_active, completed_today, recent_activity[] }` — derived from `agent_actions` Supabase table + `.harness/portfolio-pulse` + `.harness/board-meetings` files. One-shot. |
| `GET /api/empire/board-minutes` | `route.ts` (42 L) | `{ minutes[3] }` — reads last 3 `*-board-minutes.md` files from `~/Pi-CEO/Pi-Dev-Ops/.harness/board-meetings/`. Regex-extracts topic + decision. One-shot. |
| `GET /api/wiki/exit-thesis` | (external to /api/empire) | `{ currentArr, gapToMin, daysRemaining }` — wiki-derived. One-shot. |

The 2 tiles also fetch their own data:

| Endpoint | File | Returns |
|---|---|---|
| `GET /api/empire/system-health` | 475 L | `{ overall, computed_at, signals: { database, api, integrations, businesses, pi_ceo_scanner, deploys } }`. 30 s in-module cache. Each signal is `ok` / `warn` / `err` with a one-line summary. |
| `GET /api/empire/source-matrix` | 200 L | `{ computed_at, brands[6 × cells{ github, linear, vercel, railway, supabase }] }`. Each cell has status + summary + url + details + last_update. |

**Available but NOT called from the Command Center home:**

| Endpoint | What it has | Why it matters |
|---|---|---|
| `/api/empire/senior-agents` (118 L) | Live CFO / CTO / CMO briefs from `~/Pi-CEO/Pi-Dev-Ops/.harness/swarm/{cfo,cto,cmo}_state.jsonl` — MRR, runway, NRR, DORA metrics. | The C-suite agents have ground-truth state and the dashboard ignores them. |
| `/api/empire/developers` (34 L) | Per-developer commit sparklines, open PRs, blocked-on-review, stale branches, hours-since-push. | The agency's actual delivery velocity is invisible from the home. |
| `/api/empire/integrations` (24 L) | Per-integration sync state (last run, rows upserted, next-due). | Real integration freshness telemetry exists, not surfaced. |
| `/api/empire/appstore` (43 L) | RestoreAssist iTunes status, version, rating, rating count. | Live ARR moat indicator — invisible. |
| `/api/pi-ceo/health` (165 L) | Authenticated Railway proxy: session ID, autonomy_pct, swarm_enabled, kill_switch_active, poll_count, last_poll_ago_s, plan_units_count. | **The single most important "is the empire running?" signal** — not on the page. |
| `/api/pi-ceo/activity` (73 L) | Live event stream from Pi-CEO orchestrator (`recent_events[]`, poll_success_rate, autonomy_pct). | Real activity feed — replaced by static "● AUTONOMOUS" pill. |
| `/api/pi-ceo/history` (32 L) | Historical health + activity rows from Supabase (limit 100). | Trend lines are sitting in the DB unused. |

### Visual language today

- **Palette in use:** `--canvas` (`#0e1014`) page bg, `--surface-1` (`#141820`) panel bg, `--ink-primary/secondary/tertiary`, `--green-400 / --orange-400 / --red-400` semantic dots. Candy Red `--red-500 #b30000` is defined in tokens but appears on the live page only as a faint background tint on the "Margot" pipeline stage (rgba(179,0,0,0.08) at `page.tsx:856`) and as the URGENT badge bg (`page.tsx:113`). Effectively absent as a brand presence.
- **Layout grid:** 1,280 px max-width centred main, 24 / 32 px page padding, ~16 px gap between sections. Hairline `1px solid var(--border-hairline)` everywhere. Border-radius `--radius-md` (~4 px — sharp register per [[nexus-design-system]]).
- **Typography:** `system-ui, sans-serif` for body (`page.tsx:615`); `var(--font-mono)` for every number, label, ticker. Section titles are 11 px mono uppercase with 0.08em tracking — **dense ops register, but no visual hierarchy beyond size**.
- **Motion:** Single CSS `pulse-dot` animation (the green ● in the header at `page.tsx:633`), `empire-fade-in` 300 ms on each PriorityCard (`page.tsx:253`), Shimmer skeletons. No framer-motion, no entrance choreography, no scroll-driven anything. The 916-line legacy `CeoDashboard.tsx` had framer-motion + animated SVG ring; the live page **stripped all of it**.
- **Iconography:** Compliance is mixed. Sidebar uses custom `marks.tsx` (`CommandCenterMark, ClientsMark, ActivityMark` etc.) — Option B compliant. **But** the live home page itself uses raw emoji glyphs (`⚠` at `page.tsx:447, 508`, `→` arrows at `page.tsx:907`, `×` close at `page.tsx:257`, `▲` at `StaleBranchAlert.tsx:67`) instead of marks. Legacy `CeoDashboard.tsx` + `TelegramFeed.tsx` still import Lucide — banned by [[feedback-design-preferences]].
- **Imagery:** Real brand logos (Synthex, RestoreAssist, CCW, NRPG, CARSI, DR) load from `/public/logos/`. BusinessLogo falls back to geometric `marks.tsx` glyphs when image missing. **Good.**
- **Density:** Honest dense ops feel — 13 px row text, 10–11 px mono labels. No "spacious marketing whitespace". This is the strongest thing the surface has going for it.

## Strengths

1. **No mock data anywhere on the home page.** `BusinessHealthRow`, `BoardAlerts`, `BoardMinutes`, `EmpirePulseBar`, `PipelineFlow` all degrade to empty-state or shimmer when the API returns nothing. Mock-data const lists were explicitly removed per the comment block at `CeoDashboard.tsx:63-68`. Anti-AI-slop discipline is real.
2. **Two-tier data architecture is correct.** `/api/empire/businesses` polls every 30 s; everything else fetches once. The 30 s `SystemHealthTile` cache (`route.ts:62`) is the right TTL for a 30-adapter probe job — wall-time-capped at 8 s per probe by `Promise.all` (`system-health/route.ts:67`).
3. **`SourceMatrixGrid` is the strongest single element.** 6 × 5 = 30 status dots, click-to-drill drawer, column-OK pills (`SourceMatrixGrid.tsx:140-163`), `"file remediation ticket"` mailto with pre-filled context (`SourceMatrixGrid.tsx:73-88`). This is what an ops surface should look like — **the rest of the page doesn't match this density**.
4. **Token system is real.** `nexus-design-system.md` defines Gun Metal + Candy Red with full alpha scales and the wiki distinguishes "CEO Command Center" register (sharp, 2-4 px radius, 240 px sidebar, 64 px header) from the Client register. The implementation honours sidebar width and header height.
5. **Real logos load.** `BusinessLogo.tsx:10-17` maps slugs to actual PNG/SVG files for all 6 brands with geometric-mark fallback on error.

## Weaknesses / why it lacks wow-factor

1. **The header is forgettable.** `page.tsx:618-666`: 14 px vertical padding, an 8 px green pulsing dot, the words "Empire Command Center" at 15 px, sub-label "Unite Group · Decision-focused · 30s polling" at 11 px tertiary ink. That's the entire identity moment. There is no wordmark, no Candy Red anywhere in the chrome, no time-of-day greeting, no portfolio total in a hero typeface, no AEST clock, no autonomy uptime gauge. This is a CRM header, not the cockpit of an empire targeting $2B.
2. **The "Empire Pulse Bar" is 5 grey pills in a flat strip** (`page.tsx:191-238`). Five 12 × 16 px boxes with 10 px mono labels and 15 px mono values. "Total ARR · Days to $2B · Gap to min ARR · Portfolio avg · System status" all share identical weight, colour, and rhythm. The "Days to $2B = N days" number — the single most important number on the page — looks indistinguishable from "Portfolio avg". **No visual hierarchy means no story.**
3. **Candy Red is functionally absent.** `pi-seo-workspace/.../page.tsx` greps for `--red-500` exactly twice (the URGENT badge bg + as a `red-a08` Margot pill background). The brand-defining colour from [[nexus-design-system]] appears in <0.5% of the surface area. The page reads navy-grey + green-amber, not "Unite Group". A new viewer cannot identify the brand from a screenshot.
4. **Six near-identical card sections stacked vertically.** `EmpirePulseBar` (pill strip) → `SystemHealthTile` (6 sub-tiles in a 3-col grid) → `SourceMatrixGrid` (table) → "Today's Priorities" + "Business Health" (60/40 split) → "Autonomous Pipeline" + "Board Alerts" (50/50) → "Recent Board Directives" (list). Every section is the same `var(--surface-1)` panel with the same hairline border and the same 11 px mono uppercase title. **Visual monotony — every section screams equally, nothing gets focus.**
5. **`SystemHealthTile` sub-tiles are dead boxes.** `SystemHealthTile.tsx:67-136`: each sub-tile is 78 px tall, a coloured dot + name + one-line summary string + optional "drill in →" link. The summary string is the only data. There is no count, no trend, no spark, no last-fail-timestamp, no error preview. "**5 sources**" as a summary for Integrations (`SystemHealthTile.tsx:328`) is uselessly thin.
6. **The "Autonomous Pipeline" is the only stage-flow visualization and it's a row of 5 boxes with arrows.** `page.tsx:836-911`: Margot → Board → PM → Orchestrator → Deployed, each a count + label + sublabel. The arrows are plain `→` text characters (`page.tsx:907`), not stylized strokes. The recent_activity rows underneath are static text. **The single most ownable visual — the autonomy loop — is rendered as ASCII art.**
7. **Business Health right-rail is just 6 rows of name + ARR + score + ⚠.** `page.tsx:370-452`: each `BusinessHealthRow` is 9 px vertical padding, hairline border between. No trend spark, no last-deploy time, no open-PR count, no logo bigger than 24 px. The CeoDashboard.tsx legacy `BentoBusinessGrid` (`CeoDashboard.tsx:207-299`) had sparklines, ARR badges, CI passing icons, status descriptors, hover ARR animation — all stripped when /empire took over. **The new surface is less informative than what it replaced.**
8. **"Today's Priorities" is a generic ticket list.** `PriorityCard` (`page.tsx:243-344`) is URGENT/HIGH/MED badge + ticket ID + title + 120-char description + "Open in Linear →" button. **No decision affordance.** A CEO surface should let you approve/reject/defer/escalate inline. Today, every priority is just a deep-link out to Linear. The "OWNER ACTION" vs "AUTONOMOUS" badge always says `AUTONOMOUS` because the upstream route hardcodes `owner: 'linear'` (`priorities/route.ts:73`) — **the most important distinction on the page is broken**.
9. **Lucide icons still live in the codebase.** `CeoDashboard.tsx:11-14` and `TelegramFeed.tsx:5` both import from `lucide-react` in direct violation of the [[feedback-design-preferences]] rule. The legacy `/ceo` route is redirected, but the components compile and ship in the bundle. The home page itself uses emoji + ASCII glyphs (⚠ → × ▲ ●) instead of the perfectly good `marks.tsx` library that already exists.
10. **No live activity feed on the home.** The `/api/pi-ceo/activity` endpoint streams real orchestrator events (`Health sweep #N — M issue(s) found` every poll cycle, `autonomy_pct`, `poll_success_rate_pct`). Zero of this surfaces on `/empire`. The page advertises "Autonomous" via a static green dot and a green "ACTIVE" pill — **a screenshot of this page from 6 hours ago is indistinguishable from a live one**. No wow because nothing visibly moves.

## Information architecture today

Top → bottom on `/empire`:

1. **Header strip** (`page.tsx:618-666`) — pulsing green dot, "Empire Command Center" title, "Unite Group · Decision-focused · 30s polling" sub-label, optional loading dot, optional error string.
2. **Empire Pulse Bar** (`page.tsx:191-238`) — 5 pills: Total ARR · Days to $2B · Gap to min ARR · Portfolio avg · System status.
3. **System Health Tile** (`SystemHealthTile.tsx`) — overall pill (ALL GREEN / DEGRADED / FAILING) + 6 sub-tiles in a 3-col grid + REFRESH button.
4. **Source Matrix Grid** (`SourceMatrixGrid.tsx`) — 6 brands × 5 sources status-dot table, click → drawer.
5. **Two-column row** (`page.tsx:682-774`):
   - LEFT 60%: "Today's Priorities" — up to 8 Linear issues, each with URGENT/HIGH/MED + ticket ID + AUTONOMOUS badge + title + 120-char description + Linear deep-link.
   - RIGHT 40%: "Business Health" — 6 rows: logo + name + ARR + sec score + overall health score + ⚠.
6. **Two-column row** (`page.tsx:776-1008`):
   - LEFT 50%: "Autonomous Pipeline" — 5-stage flow with counts + recent_activity list underneath.
   - RIGHT 50%: "Board Alerts" — text rows for any business with `security_score < 40`.
7. **"Recent Board Directives"** (`page.tsx:1010-1044`) — last 3 board-minutes markdown files parsed for topic + decision + directive.

**What's missing that a CEO would need to see:**

- Real-time autonomy uptime (the `/api/pi-ceo/health` payload has `autonomy_pct`, `poll_count`, `last_poll_ago_s`, `swarm_enabled`, `kill_switch_active` — all unused).
- A live ticker / event feed showing the agents working (the `/api/pi-ceo/activity` stream is built and ignored).
- A cost-burn meter (no Anthropic / Vercel / Railway / Supabase cost telemetry surfaced anywhere — fundamental for a "Max-first cost-routing" empire per [[feedback-model-routing-max-first]]).
- A revenue counter that ticks (Stripe MRR / ARR is in `cfo_state.jsonl` and reachable via `/api/empire/senior-agents` — invisible).
- Deal pipeline (Duncan + Toby + future clients) — no surface.
- An "approve" affordance on owner-action items (every priority is a passive Linear link).
- A clock + AEST timestamp anchor (the only time-related signal is "computed Ns ago" on the tile headers).
- "What is Margot working on right now?" — agent currently has no visible representation on the home.
- 7-day / 30-day trendlines (the `/api/pi-ceo/history` endpoint returns up to 100 health snapshots — never charted).

## Specific gaps vs an ops-grade Command Center

- **Missing:** Live agent activity feed (Margot / Board / PM-Core / orchestrator events as they fire). Data exists at `/api/pi-ceo/activity`.
- **Missing:** Cost-burn meter (Anthropic API spend today / this month, Vercel function $, Railway $, gateway tokens). No endpoint built; the data sits in `~/.hermes/` and provider dashboards.
- **Missing:** Revenue ticker (MRR / ARR / NRR live from CFO state). Data exists at `/api/empire/senior-agents`.
- **Missing:** Autonomy uptime / kill-switch indicator with last-poll age and poll_success_rate. Data exists at `/api/pi-ceo/health`.
- **Missing:** Per-business 14-day commit sparklines on the home (`ActivitySparkline` component exists but is only used on the `/empire/developers` sub-route).
- **Missing:** Stale-branch / blocked-PR badges on the home. `StaleBranchAlert.tsx` exists, only mounted on `/empire/developers`.
- **Missing:** Deal pipeline / Stripe invoice status (Duncan deposit, Toby renewal, etc.). `/api/empire/senior-agents` exposes MRR but no per-deal breakdown.
- **Missing:** AI citation frequency tile per [[metric-ai-citation-frequency]] — the new local-SEO KPI Phill defined this week. No endpoint or component.
- **Missing:** Last-Margot-session summary + "what did she ship today" delta. No surface.
- **Missing:** ARR-to-$2B progress bar with non-linear visual treatment (currently a single pill that says "Days to $2B · 1,034 days").
- **Missing:** Inline approve / reject / defer buttons on owner-action priorities.
- **Missing:** Time-of-day greeting / AEST clock / "It's 17:55 in Australia — empire is N hours into autonomous run X".

## Constraints the design proposal must honour

- **Palette:** Gun Metal `#1a1a1a` / `--canvas #0e1014` foundation, Candy Red `--red-500 #b30000` as the primary accent — currently used ~0.5% of the surface; needs to become the page-defining colour without slipping into AI-slop "red glow gradient hero". Per [[nexus-design-system]] Two Registers: stay in the **sharp** register (2 px / 4 px radius, semibold labels, mono data values).
- **Iconography:** ONLY `marks.tsx` (`CommandCenterMark, ActivityMark, UrgentMark, AlertMark, SuccessMark`, etc.). **No Lucide.** No emoji glyphs on the home (⚠ → × ▲ all must move to `marks.tsx` SVGs). Per [[feedback-design-preferences]].
- **No AI slop:** No glassmorphism, no generic gradient hero, no 3D card hover-tilt, no "modern minimal" template aesthetic, no rainbow chart palette, no `backdrop-blur-sm` (currently lurks in legacy `BusinessCard.tsx:59`). Per [[feedback-design-preferences]].
- **Real logos embedded:** Keep `BusinessLogo.tsx` for 6 portfolio brands. Per [[feedback-design-preferences]].
- **CEO surface = decision-focused, not vanity-metric-focused:** Every visible number must drive a decision. Per [[feedback-design-preferences]].
- **Autonomy = professionalism:** The page must signal a serious operating company targeting $2B by 2028, not a startup pitch. Per [[feedback-design-preferences]].
- **No mock data:** Empty-state when source is dry. Already enforced; preserve. Per `page.tsx:763-770` `EmptyState` usage.
- **Australian English** throughout (matches `SourceMatrixGrid.tsx:10` header comment).

## Data already available the UI doesn't surface

This is the ammunition list for the redesign — endpoints already built, returning real data, that the home page ignores:

- **`GET /api/pi-ceo/health`** → `autonomy_pct`, `swarm_enabled`, `kill_switch_active`, `poll_count`, `last_poll_ago_s`, `confidence`, `plan_units_count`, `task_title`, `session_id`. *The "is the orchestrator alive?" signal.*
- **`GET /api/pi-ceo/activity`** → `events[]` with `agent`, `action`, `timeAgo`, `ts`, `found` per poll cycle; `poll_success_rate`, `autonomy_pct`. *The live activity stream.*
- **`GET /api/pi-ceo/history?type=health`** → up to 100 historical `pi_ceo_health_snapshots` per project. *Trendline ammo.*
- **`GET /api/empire/senior-agents`** → CFO `{ mrr, runway_months, nrr }`, CTO `{ deploys_last_week, lead_time_hours_p50, change_failure_rate }` (DORA), CMO `{ headline }`. *C-suite agent state.*
- **`GET /api/empire/developers`** → per-dev commit sparklines (14d), `commitsToday`, `commitsThisWeek`, `openPRs[]`, `prsBlockedOnReview[]`, `staleBranches[]`, `hoursSinceLastPush`. *Engineering velocity.*
- **`GET /api/empire/integrations`** → per-integration `last_sync_status`, `last_sync_completed_at`, `rows_upserted`, `next_sync_due_at`. *Sync freshness.*
- **`GET /api/empire/appstore`** → RestoreAssist iTunes `version`, `rating`, `rating_count`, `release_date`, `app_store_url`. *App-store moat for RA.*
- **`GET /api/empire/system-health`** sub-signals → `database.latency_ms` (currently swallowed into the summary string), `api.routes_failing` count, `pi_ceo_scanner.stale_brands` count, `deploys.last_prod_deploy` timestamp. *All buried as one-line text.*
- **`GET /api/empire/businesses`** → `security_score`, `dependencies`, `security_findings` per business, `snapshot_at` for staleness. *Today only `overall_health` + `arr` render; the rest is in the JSON, never drawn.*
- **`GET /api/empire/source-matrix`** → per-cell `last_update`, `details{}` JSON, `url` deep-link, `error` string. *Drawer uses these; the grid surface itself shows only the dot colour.*
- **`GET /api/empire/board-minutes`** → full 300-char `preview` field per minute. *Only `topic` + `decision` + `directiveTo` render; the preview is dropped.*
- **`GET /api/empire/pipeline`** → `recent_activity[]` array with `label` + `when`. *Renders today, but as a flat 11 px text list — no event-stream affordance.*

---

**Headline diagnosis:** The page is honest, dense, no-mock, and renders ~12 endpoints' worth of real data — but it uses **one panel pattern repeated six times** with **Candy Red functionally absent** and **the autonomy story rendered in plain text**, so the surface looks like a competent admin console rather than the cockpit of a $2B-by-2028 empire. The data layer is ready; the visual layer is the problem.
