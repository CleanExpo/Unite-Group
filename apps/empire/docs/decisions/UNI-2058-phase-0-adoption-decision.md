# UNI-2058 Phase 0 · Layered Design System — Adoption Decision

> **Status**: DRAFT — pending Phill sign-off  
> **Date**: 2026-05-30  
> **Decision owner**: Margot (agent-drafted) / Phill (sign-off)  
> **Unblocks**: UNI-2059 (Phase 1 tokens) → UNI-2060 (Phase 2 primitives) → UNI-2061 (Phase 3 Command Center vertical slice) → all downstream phases  

---

## Context

The Unite-Hub Layered Design System v1 handoff (UNI-2057) delivers a complete light/paper-aesthetic redesign — 14 HTML prototypes, JSX sources, design tokens, and integration guidance — living in the separate `CleanExpo/Unite-Hub` repository. Before any code is ported into `CleanExpo/Unite-Group`, four architectural decisions must be locked.

Current Unite-Group state at time of decision:
- **Theme**: Dark gunmetal + candy red (`--canvas: #0e1014`, `--red-500: #b30000`)
- **Type**: Syne (display) + JetBrains Mono (mono), loaded via `next/font/google` in `layout.tsx`
- **a11y**: Lighthouse audit 2026-05-14 passed 14/14 pages after ink contrast fixes (tertiary bumped to #8a96a8 for WCAG AA)
- **Command Center**: Dedicated dark surface (`--cc-bg: #0a0c10`) with candy-red signal-only palette; NOT a generic theme
- **Routes**: dashboard, command-center, empire (/businesses /clients /data-room /developers /integrations /onboard-client), clients, businesses, pi-ceo, portal, nexus
- **Build**: Tailwind v3 + shadcn/ui, tokens in `globals.css`, HSL bridge for shadcn

---

## Decision 1 — Adoption Strategy

### Options

| Option | Approach | Risk |
|--------|----------|------|
| A. Replace | Layered light becomes the ONLY theme; dark Nexus removed | High — invalidates CC dark surface, forces full rewrite, breaks a11y certified stack |
| B. **Parallel** | Ship `.theme-layered` alongside existing `.theme-unite-hub` | **Low** — existing surfaces untouched, new surfaces opt-in, tenant-level gating possible |
| C. Cherry-pick | Keep dark, port specific patterns (grid, KPI tiles, ticker, shadows) into existing palette | Medium — ends up as neither system; long-term maintenance of two half-systems |

### Decision: **B. Parallel theme**

**Rationale**
- The existing dark theme has **production a11y certification** (Lighthouse 14/14, WCAG AA on all ink levels). A full replace destroys verified equity.
- The Command Center surface (`--cc-bg: #0a0c10`, gunmetal + candy-red signal palette) is **architecturally distinct** from both the generic dark theme and the layered light theme. It must survive regardless.
- Parallel themes allow **per-tenant, per-route, or per-user gating** (e.g., `?theme=layered`, sub-domain mapping, or org setting) without breaking existing dashboards.
- The layered prototypes in `design/unite-hub-layered/` are reference material; they can be ported incrementally under `.theme-layered` scope without touching existing routes.

**Implementation note**
- New tokens live in `globals.css` under `.theme-layered {}` scope (not `:root`).
- `layout.tsx` adds a theme class switch (cookie or user-pref) defaulting to existing dark until Phase 3+.
- Tailwind config extends with `theme.layered` prefix utilities (e.g., `bg-layered-canvas`, `text-layered-navy`).

---

## Decision 2 — Type Stack

### Options

| Option | Display | Mono | Note |
|--------|---------|------|------|
| A. Full Poppins | Poppins | IBM Plex Mono | Clean match to layered prototypes; breaks existing dark personality |
| B. Full Geist | Geist | Geist Mono | Neutral, no brand character |
| C. **Themed dual stack** | Syne (dark) / Poppins (layered) | JetBrains (dark) / IBM Plex Mono (layered) | **Each theme keeps its own voice** |

### Decision: **C. Themed dual stack**

**Rationale**
- Syne is described in-source as "distinctive geometric grotesque — NOT Inter. Sharp, architectural, unmistakable." This is **intentional brand equity** for the dark/Nexus identity.
- Poppins + IBM Plex Mono is the **spec'd stack for layered** and should be preserved when that theme is active.
- `next/font/google` supports multiple font variables; `layout.tsx` swaps `className` based on active theme. No bundle size penalty (fonts are variable subsets).

**Implementation note**
```ts
// layout.tsx
const syne = Syne({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['400','500','600','700','800'] });
const poppins = Poppins({ subsets: ['latin'], variable: '--font-layered-display', display: 'swap', weight: ['400','500','600','700'] });
const monoJB = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const monoIBM = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-layered-mono', display: 'swap', weight: ['400','500'] });

// Theme-aware body
<body className={`${theme === 'layered' ? poppins.variable : syne.variable} ${theme === 'layered' ? monoIBM.variable : monoJB.variable}`}>
```

---

## Decision 3 — New Top-Level Surfaces (Deals / Connect / People)

### Current route inventory

```
/dashboard
/command-center
/empire/businesses
/empire/clients
/empire/data-room
/empire/developers
/empire/integrations
/empire/onboard-client
/clients/[slug]
/businesses/[slug]
/pi-ceo
/portal/[slug]
/nexus
```

### Proposed surface mapping

| Layered prototype surface | Decision | Maps to existing route | Rationale |
|---------------------------|----------|------------------------|-----------|
| **Deals** | **Fold into existing** | `/empire/pipeline` or `/clients/[slug]/deals` | Pipeline API already exists (`/api/empire/pipeline`). Deals are client-scoped in current data model. |
| **Connect** | **Fold into existing** | `/empire/onboard-client` or `/clients/[slug]/connect` | Connect = outreach/integrations. Onboard-client already handles intake flow. |
| **People** | **Fold into existing** | `/clients` (CRM contacts) or `/account` (profiles) | Contacts table already exists; no separate People module needed until validated. |

### Decision: **No new top-level routes in Phase 0–2**

**Rationale**
- Unite-Group already has **rich route depth** under `/empire/*` and `/clients/[slug]/*`. Adding `/deals`, `/connect`, `/people` at root level creates **URL collision risk** with existing empire sub-modules.
- The layered prototypes should be ported as **re-skins of existing screens**, not new routes. When Phase 3 (Command Center vertical slice) lands, the KPI row and bento grid can be toggled between dark and layered themes on the SAME route.
- If future user research proves a dedicated `/deals` route is needed, it can be introduced in Phase 5 (UNI-2063) with proper redirects.

---

## Decision 4 — Ticker Event Taxonomy

### Requirement
Live event ticker on Command Center (and future layered Hub) needs a defined feed.

### Decision: **Feed from five existing tables — no new schema**

| Event type | Source table | Event trigger | Priority |
|------------|--------------|---------------|----------|
| **Lead score change** | `contacts` | `ai_score` or `status` updated | High |
| **Campaign milestone** | `campaigns` (Unite-Hub) or `projects` (Unite-Group) | Status change, goal met | High |
| **Due task** | `tasks` or `campaign_steps` | `due_date <= NOW()` and `status != 'done'` | Medium |
| **PI-CEO activity** | `pi_ceo_activity` (inferred from `/api/pi-ceo/history`) | New insight, health snapshot, decision | Medium |
| **Email engagement** | `email_opens`, `email_clicks` | Open/click within last 15 min | Low |

**Implementation note**
- Ticker is a **client-side polling** or **Supabase Realtime** consumer — not a new table.
- Events are ephemeral; no persistence beyond existing audit tables.
- Each event row in ticker carries `source_table`, `record_id`, `event_type`, `timestamp`, `priority`.
- The ticker design spec (90s slide, masking gradient, `aria-live="polite"`) applies to both themes.

---

## Acceptance Criteria

- [ ] Phill confirms all four decisions (reply or commit approval to this file)
- [ ] UNI-2058 moved to "In Review" in Linear
- [ ] UNI-2059 (Phase 1) assigned and started within 48h of sign-off
- [ ] This decision doc committed to `docs/decisions/` and linked from `design/unite-hub-layered/README.md` (or the Unite-Hub mirror)

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Dual theme = doubled maintenance | Scope layered theme to founder/CEO surfaces only; marketing/public pages stay dark |
| Font loading flash | Use `font-display: swap` + preconnect to `fonts.gstatic.com`; both font families are Google Fonts |
| Token collision | All layered tokens namespaced `--layered-*` or scoped under `.theme-layered` |
| Ticker noise | Implement dedupe (same record_id within 5 min = update, not append) + priority filter |

---

## References

- `src/app/globals.css` — current token system (dark + command-center)
- `src/app/layout.tsx` — current font loading
- `src/types/supabase.ts` — table schema for ticker sources
- Linear: [UNI-2057](https://linear.app/unite-group/issue/UNI-2057) (handoff), [UNI-2059](https://linear.app/unite-group/issue/UNI-2059) (Phase 1), [UNI-2060](https://linear.app/unite-group/issue/UNI-2060) (Phase 2), [UNI-2061](https://linear.app/unite-group/issue/UNI-2061) (Phase 3)
- Unite-Hub repo: `design/unite-hub-layered/` (prototypes + tokens)
