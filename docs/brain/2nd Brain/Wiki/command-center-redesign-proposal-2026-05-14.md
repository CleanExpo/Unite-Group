---
type: wiki
updated: 2026-05-14
---

# Command Center — Redesign Proposal (2026-05-14)

Synthesis of three swarm-agent reports:
- [[command-center-current-state-2026-05-14]] — what exists today
- [[command-center-reference-2026-05-14]] — 29 large-org C2 / FUI references
- [[command-center-componentry-2026-05-14]] — 22 libraries, 10 demos, top-3 install pick

This is the single source of truth for the redesign brief. Everything below is decision-quality — Phill can read this and approve / redirect without re-reading the three input docs.

## Diagnosis (one paragraph)

The current `/ceo` + `/empire` build is honest, no-mock, hydrated from 12 real endpoints, and renders ~15 components — but it uses **one panel pattern six times in a row**, leaves Candy Red as accent paint only (not signal), and presents the agent autonomy story as flat ASCII text. It reads as a competent admin console, not the cockpit of the company Phill is trying to project. **The data layer is ready; the visual layer is the problem.** The fix is not "more data" — it's giving the existing data a tactile, agentic, mission-control visual grammar.

## North Star (the target aesthetic — one sentence per anchor)

- **Astro UXDS** (Rocket Communications / US Space Force) — production C2 design system; mirror its Mission Clock + Global Status Bar + Log primitives.
- **The Expanse / Rocinante UI** (Rhys Yorke) — closest cinematic palette match; red-primary on deep-black is already on-brand.
- **Jayse Hansen's Iron Man HUD** — radial-expander + "graphics serve the operator, never distract" benchmark; this is the wow-factor reference.
- **Linear's information density** — taken as the SaaS-grade hygiene floor; we should never look LESS dense than Linear's project view.

## Three rules locked across every reference

1. **Single-accent on near-black.** Gun Metal `#1a1a1a` ground + Candy Red `#dc143c` as SIGNAL ONLY (live, escalated, blocked-on-you). Everything else is greyscale + monospace.
2. **KPI-strip top, log-ticker bottom, working canvas in the middle.** Every reference (Bloomberg, Datadog, Astro UXDS, Linear) converges on this. Stop centering an h1.
3. **Three universal states at every level**: **running** (greyscale, calm), **blocked-on-you** (Candy Red, breathing pulse), **done** (Gun Metal fade, archived). Same vocabulary on agents, projects, businesses, clients — so the eye learns it once.

## Component bundle (final pick, ~130KB gzipped)

| # | Library | Bundle | Role |
|---|---|---|---|
| 1 | `@xyflow/react` | ~45KB | **Agent/service topology centrepiece** — nodes for agents/businesses/clients, edges animate when data flows |
| 2 | `@tsparticles/react` + `slim` | ~70KB | **Background circuit-board** — sparse polygon-mask particles, monochrome, behind the working canvas |
| 3 | `@visx/sparkline` + `scale` | ~15KB | **Per-tile data density** — inline sparklines without bringing recharts/tremor's 200KB AI-slop defaults |

Plus zero-install copy-paste primitives (Magic UI Animated Beam, Aceternity Background Beams, Aceternity Grid/Dot).

## Layout spec — five zones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ZONE 1 — Global Status Bar         [Mission Clock] [12 agents alive · 2 alert]│
├─────────────────────────────────────────────────────────────────────────────┤
│ ZONE 2 — KPI strip                                                          │
│  ▣ ARR        ▣ Pipeline      ▣ Cost/day    ▣ Open mandates  ▣ CCW SLA      │
│  $0          $250k            $0.05         3                Green          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ZONE 3 — Working canvas (the agent/service topology — THIS is the wow)      │
│                                                                             │
│   ⬢ Margot ─────────● ─────────⬢ Pi-CEO Board ──────────────⬢ Hermes       │
│      │                                  │                                   │
│      └─────── ⬢ ATIA ── ⬢ RA ── ⬢ DR ── ⬢ CARSI ── ⬢ NRPG ── ⬢ CCW          │
│                                                                             │
│   (edges PULSE Candy Red when data flows; nodes BREATHE when active)        │
│                                                                             │
├──────────────────────────────────┬──────────────────────────────────────────┤
│ ZONE 4 — Business 360             │ ZONE 5 — Live activity log              │
│  [Per-brand sparkline + state]    │  [Reverse-chron event stream]           │
│  ⬢ RA   ▁▂▅▇▆▅▃▂      running    │  18:42 Margot synthesis → 'pricing'    │
│  ⬢ DR   ▁▁▂▄▅▆▇       running    │  18:38 pm_scoper scoped RA-2232        │
│  ⬢ NRPG ▁▁▁▂▃▄        building   │  18:35 deepsec batch-2c PR opened      │
│  ⬢ CARSI ▁▂▃▅▆▇▆▅     running    │  18:30 deepsec batch-2b PR opened      │
│  ⬢ CCW  ▇▆▆▇▇▆▇  ESCALATED       │  ... (auto-scroll, character-typewriter)│
└──────────────────────────────────┴──────────────────────────────────────────┘
```

## Motion language

- **Breathing pulse** on every `running` node (1.5s easing in/out, 5% scale, monochrome).
- **Edge flow** on `@xyflow/react` edges when a real call happens (~200-400ms animated stroke-dashoffset, Candy Red).
- **Counter rolls** on KPI numbers when they change — animated counter, no abrupt swap.
- **Typewriter** for the log ticker — character-by-character at 20ms/char so "agents speaking" feels real.
- **Glow-on-state-change** — when a tile flips from running→blocked, 800ms Candy Red glow + then steady state.
- **NEVER**: parallax hero, gradient backgrounds, glass-morphism, page-load splash, animated emojis.

## Data already available the UI ignores

From the audit: 7 endpoints are built and unused. The redesign should bind these:
- `/api/empire/senior-agents` → Zone 3 nodes
- `/api/empire/developers` → Zone 4 tile (who's-shipping density)
- `/api/empire/integrations` → Zone 3 edges
- `/api/pi-ceo/health` → Zone 1 global status
- `/api/pi-ceo/activity` → Zone 5 log ticker
- `/api/pi-ceo/history` → Zone 4 sparkline series

The data is there. Surfacing it visually is the entire job.

## Anti-patterns — explicitly banned in this build

- Centred h1 + sub on flat panel (current `/empire` and `/ceo` opener)
- Gradient hero (we're not selling to enterprise — we ARE enterprise)
- Glass-morphism panels — instant AI-slop signal
- Lucide icons — already on the [[feedback-design-preferences]] kill list
- Multi-colour palette (Tremor / Datadog default scheme) — defeats the Candy-Red-as-signal rule
- Loading skeletons that shimmer — replace with a status indicator that says "syncing margot"; agentic systems show what they're doing, not vague spinner
- Bouncing dots / pulsating gradients / parallax scroll
- Emoji status flags ✅ ⚠️ 🔥 — too kindergarten. Use monogeometric stencils per [[feedback-design-preferences]] Option B

## Three-PR build plan

### PR-1 — Foundations (1 day)
- Install `@xyflow/react @tsparticles/react @tsparticles/slim @visx/sparkline @visx/scale`
- Create `src/components/command-center/` directory
- New tokens in `src/app/globals.css`: `--cc-bg`, `--cc-grid`, `--cc-signal`, `--cc-hush`, `--cc-pulse-duration`
- Mount the new five-zone shell at `/[locale]/command-center` (NEW route — leave `/empire` alone for the moment, ship behind a route)
- Zone 1 Mission Clock + Global Status Bar
- Zone 2 KPI strip with animated counter

### PR-2 — Agent Topology (1 day)
- `<AgentTopology>` using `@xyflow/react` — Zone 3
- Bind to `/api/empire/senior-agents` for nodes + `/api/empire/integrations` for edges
- Custom edge component: stroke-dashoffset animation Candy Red on data-flow
- Custom node component: breathing pulse on `running`, Candy-Red border on `blocked-on-you`
- Background: `@tsparticles/react` polygon-mask, monochrome, low-density, behind the canvas

### PR-3 — Activity stream + Business 360 + polish (1 day)
- Zone 4 Business 360 — sparkline rows with `@visx/sparkline`, per-brand state + Linear-style row hover detail
- Zone 5 Live Activity Log — virtualised reverse-chron, typewriter animation, severity colour, auto-scroll-pin-to-bottom unless user scrolls up
- Keyboard navigation — `/` focus search, `1-5` jump-to-zone
- A11y: every animation respects `prefers-reduced-motion`
- brand-guardian skill review before merge

Total: 3 days, 3 PRs, ~130KB gzipped added to bundle, route-isolated (no risk to current `/empire`).

## Recommended next move

**Phill: greenlight PR-1 (Foundations) and I start tonight.** It's a 1-day mechanical commit — installs + tokens + new route + Zone 1 + Zone 2. No design decisions blocked on you until PR-2 where I'll show you a low-fi react-flow proof-of-concept of the agent topology and we pick the node iconography together.

Alternative if you want fidelity first: I can produce a static `/command-center-preview` route with 3 hero-canvas candidates side-by-side (react-flow topology / tsParticles polygon-mask / Aceternity beams) — you gut-pick the winner, then I build PR-1 around that pick. That's a 2-hour scout commit before the 3-day build.

## Reference moodboard URLs (for the design-pressure-test step)

1. https://www.astrouxds.com/ — Astro UXDS (US Space Force)
2. https://www.artstation.com/artwork/q9Am1L — Rhys Yorke / Expanse Rocinante
3. https://jayse.io/ — Jayse Hansen / Iron Man HUD
4. https://reactflow.dev/examples/edges/animated-svg-edges — react-flow animated edges (Zone 3 reference)
5. https://magicui.design/docs/components/animated-beam — Magic UI Animated Beam (alt for connection lines)
6. https://particles.js.org/samples/presets/links — tsParticles polygon-link (Zone 3 background)
