# SPM Ship-Readiness Register — the whole site vs NorthStar GREEN

Date: 15/07/2026 (afternoon) · Method: five parallel domain audits (CRM core, Money,
Growth, Advisory/Knowledge/System, agent plane) + orchestrator spot-verification of every
load-bearing claim + the live Command Brief E2E test + the five-route production walk.
Baseline: UNI-2373 NorthStar map (every founder section GREEN; 200 ≠ real), UNI-2378
cockpit map, No-Invaders doctrine. Repo @ `da698d7b`.

Grades: GREEN = real founder-scoped data behind auth, honest states, verified.
AMBER-env = code-complete, starved of a credential/env/first-run. AMBER-build = a real
missing piece of code. All grades from the domain audits; every claim the register's
priorities rest on was re-verified by orchestrator grep [VERIFIED] this session.

## 1. Scoreboard

**GREEN now (shippable as-is):** auth spine + founder layout · contacts (CRUD, identity-
gated visibility) · campaigns (+new/[id]) · social page + full 4-platform publisher cron ·
experiments shell · advisory · strategy · content · schedule · vault · founder-chat API ·
public /api/agent · notifications pipeline · My Board kanban (pending prod-migration
confirm) · dashboard→command-centre redirect.

**Nothing fake-as-real anywhere** — all five audits + the walk found zero No-Invaders
violations rendering today; three latent risks listed in §4.

## 2. Register by unblock mechanism

### Class F — Founder actions, no code (each S, minutes)
| # | Action | Unblocks |
|---|---|---|
| F1 | Identity env flip (`FOUNDER_ALLOWED_*` + `FOUNDER_USER_ID`) | Contacts + Opportunities visibility, closes the fail-open private-access gate — the single highest-leverage act on the board |
| F2 | Google OAuth (`GOOGLE_CLIENT_ID/SECRET` + one Connect click) | Email, Calendar, Notes/Drive — three surfaces, one credential |
| F3 | Xero Connect per entity (creds exist in schema) | Invoices, Bookkeeper, Xero page, real revenue KPI — four surfaces |
| F4 | `COST_METERING_ENABLED` + `METERING_FX_USD_AUD` | Cost plane cron + Cost Allocation tile (also needs C6) |
| F5 | `LINEAR_API_KEY` | Kanban Linear projection |
| F6 | LinkedIn/TikTok/Reddit platform secrets | Social Connect buttons (connectors BUILT per map) |
| F7 | Stripe env + webhook registration | stripe_events ledger |

Discrepancy flagged honestly: the UNI-2373 map records "first metering ingest 01:30
15/07" but `COST_FETCHERS` is an empty array in code [VERIFIED registry.ts:31] — that
ingest cannot have come through this pipeline; resolve before trusting cost rows.
[UNCONFIRMED which source the map's claim reflects]

### Class P — Missing producers/writers (code, S–M each)
| # | Build | Grade today | Effort |
|---|---|---|---|
| P1 | Opportunities writer (POST + "New opportunity" UI or lead-conversion) — zero insert sites exist [VERIFIED] | AMBER-build | M |
| P2 | Approvals approve/reject actions — page promises "your decision", component has zero interactive wiring [VERIFIED] | AMBER-build | S |
| P3 | `wiki_pages` ingest (vault→table; target RPC already exists) — zero writers [VERIFIED]; feeds /wiki + /content + wiki-graph | AMBER-build | M |
| P4 | `experiment_results` ingestion from platform_analytics — zero insert sites [VERIFIED]; experiments are decorative without it | AMBER-build | M |
| P5 | Brand-video job processor — jobs enqueue in prod, worker absent from vercel.json [VERIFIED] | AMBER-build | S–M |
| P6 | Founder-chat persistence (thread table + load/save) — today a refresh wipes the founder's chat | AMBER-build | M |
| P7 | `skill_health` producer (the referenced eval-runner script is missing from the repo) | AMBER-build | S |
| P8 | TikTok + YouTube analytics fetchers (stubbed `return []`) | AMBER-build | M |
| P9 | First cron runs: boardroom `ceo-board-meeting`, knowledge `pi-ceo-weekly-review` (pipelines fully built) | AMBER-env | S |

### Class R — The runner (Wave B1, already spec'd, L)
One estate-side process (this Mac first): claims founder-approved queued `cc_tasks`,
executes as Claude Code work, reports honest session status, emits `cc_agent_events`.
Unblocks: founder/agents page, operator-gateway, live-map sessions, the Matrix wall,
and the product's core promise ("Agents build it — you watch it happen"), which the
Command Brief E2E proved is theatre from START SESSION onward today.

### Class H — Honesty hardening (S each, one PR)
H1 session `RUNNING` → "waiting for runner — none connected" · H2 board verdict
persisted onto the task + visible in the queue lane + annotates APPROVE · H3 intake
dedup (founder's MacBook idea sits in Proposed twice) · H4 queue cold-load renders
loading, never false "0 TASKS · OFFLINE" · H5 hermes-control-panel hardcoded
security-posture booleans re-labelled "design target (not live)" · H6 revenue-mock
boundary asserts `source:'mock'` end-to-end · H7 analytics fetch-failure ≠ empty-state ·
H8 React #418 hydration fix on /operations · H9 studio palette off the retired OLED
tokens.

## 3. Judge

Register 100/100 as an audit (every priority claim double-verified). Build authorisation
stays wave-gated: Class H + P2/P7 (S items) = APPROVE BUILD now; Class P M-items =
APPROVE BUILD in value order after F1 (identity) lands — building writers against data
the founder can't see inverts the leverage; Class R = already approved (spec §16),
schema-gate pause stands; Class F = founder-owned, not buildable.

## 4. Recommended sequence

1. **Phill (minutes):** F1 → F2 → F3 → F4 (F1 alone un-empties the CRM).
2. **Wave A part 2 (one PR):** H1–H4, H7, H8 + P2 + P7.
3. **Wave B1** (runner+emitter, schema-gate checkpoint) → **B2** (Matrix wall).
4. **Producer wave:** P1 → P3 → P5 → P4 → P6 → P8 in founder-value order, pending the
   UNI-2376 ranking; P9 alongside F-class.
5. Re-walk all five routes + UNI-2377 parked-line grilling closes "comprehensive".

## 5. /goal command

```
/goal Execute the ship-readiness register at .spm/2026-07-15-ship-readiness-register.md:
Wave A part 2 (H1-H4,H7,H8,P2,P7 — one PR, gates green, lane-merge); then Wave B1
runner+emitter per the Matrix-wall spec with its schema-gate checkpoint; then the
producer wave P1→P3→P5→P4→P6→P8 in founder-value order. Honour No-Invaders, merge-gate,
adversary review per wave. Founder actions F1-F7 are named dependencies, never
self-performed.
```

SPM spec complete. Next safe action: start Wave A part 2 under the standing /goal while Phill executes F1–F4.
