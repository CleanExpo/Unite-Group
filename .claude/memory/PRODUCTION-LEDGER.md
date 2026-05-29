# Production Build Ledger — Unite-Hub → /shipit

> **Purpose**: Persistent, honest source of truth for the section-by-section production build.
> Survives across turns/sessions. Update status as sections move RED→AMBER→GREEN.
> **Started**: 2026-05-29 | **Mode**: BUILD/MIGRATE swarm | **Locale**: en-AU
> **Honesty rule**: A section is GREEN only with PROOF (real data + auth + scope + loading/error + verify pass). 200 ≠ real.

---

## The one hard blocker to /shipit
Production Vercel project does **not exist** — `PORTFOLIO.yaml` → `unite-hub` production `project_id: TBD, project_name: TBD`. Only `unite-hub-sandbox` exists. Repo not linked locally (`.vercel/project.json` absent). **Human/infra step**, teed up at the end. Everything else is autonomous.

---

## Section status map (from recon swarm, 2026-05-29)

### RED — facade pages: render a client component that fetches NOTHING (backend APIs exist, page→API wiring is broken)
| Page | Backend exists? | Fix |
|------|-----------------|-----|
| `/founder/advisory` | advisory API (8 routes, GREEN) | wire AdvisoryWorkbench → /api/advisory |
| `/founder/boardroom` | boardroom API (8 routes, GREEN) | wire BoardroomClient → /api/boardroom |
| `/founder/bookkeeper` | bookkeeper API (7 routes, GREEN) | wire BookkeeperWorkbench → /api/bookkeeper |
| `/founder/strategy` | strategy API (4 routes, GREEN) | wire StrategyRoomClient → /api/strategy |
| `/founder/analytics` | analytics API (1 route) | wire AnalyticsDashboard → /api/analytics |
| `/founder/approvals` | (verify API exists) | wire ApprovalQueue → approvals API |
| `/founder/kanban` | pipeline API (1 route) | wire KanbanBoard → /api/pipeline |
| `/founder/skills` | skills API (1 route) | wire SkillHealthDashboard → /api/skills |

### AMBER — works but violates an invariant
| Item | Issue | Fix |
|------|-------|-----|
| `dashboard/kpi`, `linear/kpi`, `xero/*` | silent `source:'mock'` fallback; 200 with fake data | surface `source`; explicit "not connected" state; fail loud |
| `campaigns/[id]`, `campaigns/new`, `experiments/[id]`, `[businessKey]/page/[id]`, `[businessKey]/page/new` | missing `loading.tsx` + `error.tsx` | add segment boundary files |
| `campaigns/[id]`, `campaigns/new`, `[businessKey]` pages | Lucide icon imports (rule: custom SVG only) | replace with custom SVG |
| `linear/kpi` | no `founder_id` scope; returns 0 silently | add scope + explicit unconfigured state |

### GREEN — verified real (spot-check before trusting)
dashboard (page), campaigns, experiments, contacts, invoices, settings, vault, social, notes, email, calendar, xero (page), `[businessKey]`, health, auth.

### Cron pull gaps — sections with NO scheduled sync (stale-data risk)
- **contacts** — no external sync
- **pipeline** — no deal-stage refresh
- **campaign ad-metrics** — only organic social pulled; no paid-ads (FB/Google/LinkedIn) spend/ROI
- **research** — no external research/competitor pull
- **ideas** — no ingestion cron
22 existing crons all have working handlers + auth (4 skip FOUNDER_USER_ID legitimately; `synthex-monitor` maxDuration=30s is low).

### False-green CI (must fix — green tick currently means nothing)
- `security.yml`: Snyk jobs gated on unset `SNYK_ENABLED`, AND reference non-existent `apps/web/package.json` + `apps/backend` (uv/Python). Only `pnpm audit ... || true` runs (non-blocking). **No real security gate.**

---

## Skill gaps (build the ones used immediately; backlog the rest)
**Built this op:** `mock-vs-real-detector` (P2), `section-finaliser` (P2), `cron-pull-template` (P3).
**Backlog:** regression-guard (P1), rls-coverage-audit (P2), migration-safety (P2), api-route-hardening (P2), integration-oauth-wiring (P3), pull-sync-reconciler (P3), cron-health-monitor (P2).
**Index fixes:** add `rate-limiter` to P2; resolve `scientific-luxury` vs `scientific-luxury-design` duplicate; document P1 skills live in `.claude/skills/custom/`.

---

## Wave plan
- **Wave 1 (mechanical, zero-merge-risk):** loading/error boundary files + Lucide→SVG. ✅/⏳
- **Wave 2 (facade wiring):** RED pages → existing APIs, one section per agent.
- **Wave 3 (false-green kill):** mock-vs-real surfacing + security.yml repair.
- **Wave 4 (cron pulls):** contacts/pipeline/research/ideas/ad-metrics sync crons.
- **Deep verify loop:** type-check + lint + test + build after every wave until stable.
- **/shipit prep:** prod Vercel project + 7 critical env vars (human-gated).

## Verification command (the "100x" loop)
```
pnpm run type-check && pnpm run lint && pnpm run test && pnpm build
```
Run after every section change. A section is not done until this passes AND its page shows real data.
