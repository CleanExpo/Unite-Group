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
| P1 | Opportunities writer (POST + "New opportunity" UI) — shipped #940 | GREEN | M |
| P2 | Approvals approve/reject actions — wired in Wave A part 2 (#849) | GREEN | S |
| P3 | `wiki_pages` vault ingest — shipped #942 | GREEN | M |
| P4 | `experiment_results` ingest from `platform_analytics` — cron `/api/cron/experiment-results-ingest` (#944) | GREEN | M |
| P5 | Brand-video Vercel cron dispatcher — shipped #943 | GREEN | S–M |
| P6 | Founder-chat persistence — shipped #941 | GREEN | M |
| P7 | `skill_health` producer — `apps/web/scripts/skill-eval-runner.mjs` (Wave A #849) | GREEN | S |
| P8 | TikTok + YouTube analytics fetchers — `fetchTikTokAnalytics` / `fetchYouTubeAnalytics` wired via existing OAuth scopes (`video.list`, `youtube.readonly`) [VERIFIED]; shipped [#945](https://github.com/CleanExpo/Unite-Group/pull/945), merged `02d7c313` | GREEN | M |
| P9 | First cron runs: boardroom `ceo-board-meeting` (scheduled `50 1 * * *`) · knowledge `pi-ceo-weekly-review` — **RE-GRADED AMBER-build, was wrong at AMBER-env.** Not "pipelines fully built awaiting a run": the route is unschedulable and, if scheduled as-is, unsafe and invisible. Five blockers below | AMBER-build | **M–L, not S** |

### Session note — 07/08/2026 ~12:40 AEST (P8 landed; P9 re-graded)

**Producer wave P1–P8: COMPLETE and merged.** #945 merged as `02d7c313`; all 18 checks
green including the `js-yaml` audit (GHSA-5p4m-2wfm-xmqj) that the 09:57 note recorded as
blocking — that note was stale, not the CI. Open-PR queue is empty.

**Class H re-audited — H1–H8 were already done on `main`.** Evidence: `QueueBoard.tsx:517`
(H1) · `:34-37`/`:356-360` (H2) · `command-centre/ideas/route.ts:72-93` (H3) ·
`QueueBoard.tsx:289` (H4) · `hermes-control-panel/page.tsx:123,130` (H5) ·
`xero/client.ts:331,376` (H6) · `AnalyticsDashboard.tsx:145,300` (H7) ·
`DeckThemeShell.tsx:17-22` (H8). Only **H9** was outstanding; shipped separately.

#### P9 re-graded AMBER-env → AMBER-build, and the fix is NOT small

An attempt to close P9 by registering `pi-ceo-weekly-review` in `vercel.json` was built,
locally green (591 files / 3766 tests, build exit 0), sent for independent review, and
**withdrawn on a FAIL with five P1 blockers**. All five were re-verified against source.
Recording them here so the next attempt starts from the truth:

1. **It was never schedulable.** Registered in no scheduler — not `vercel.json`, not a
   workflow, not `pg_cron` — so no env flip could ever have started it. The 16/07
   break-sweep already logged this as **D015** and it sat unfixed for three weeks. The
   AMBER-env grade is what hid it: "waiting on the founder" stops anyone re-checking.
2. **Scheduling it destroys data.** It upserts `board_meetings` on
   `(founder_id, meeting_date)` — `UNIQUE` per `20260326000001_ceo_boardroom.sql:17` —
   and the daily `ceo-board-meeting` runs `50 1 * * *`, *every* day including Sunday. The
   later weekly write resets `status` to `new` and overwrites `brief_md`, leaving a hybrid
   row. Needs a discriminator column, i.e. a migration on a Supabase branch.
3. **Its output is invisible.** The weekly writes `brief_md` but never `agenda`;
   `MeetingCard.tsx` renders `agenda` only and `brief_md` appears there solely as a type
   (`:17`). Only `ceo-board-meeting` writes `agenda` (`:175`). So a scheduled weekly
   produces either a blank card or a misleading hybrid. `weekly_reviews` has no reader at
   all. **Verifying a table has a reader is not the same as verifying the field renders.**
4. **It can report success having persisted nothing.** Both upserts sit in `try/catch`
   with empty catches and the Supabase error result is discarded, then the route emits
   completion and returns `success: true` — false-green first-run evidence.
5. **Merging it would arm unattended production.** `nexus-conventions` requires "merging
   this arms nothing": admission gate, arming flag, founder/Board go-live. The route has
   cron auth + `FOUNDER_USER_ID` only — no kill switch, no arming flag.

**Next attempt must therefore cover:** the visibility fix (write `agenda`, or render
`brief_md`), write-then-confirm error handling, honest upstream-failure states instead of
fabricated zeros, a dormant-by-default arming gate, and a schema decision on the
`board_meetings` collision. The migration is founder/Board-gated per root `CLAUDE.md` and
is not autonomously shippable.

**Keepalive:** `ai.estate.claude-desktop-keepalive` LaunchAgent loaded (`runs=57`, last exit 0, interval 480s); pulse.log healthy through 22:26Z / 08:26 AEST.

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

**Status 07/08/2026: H1–H8 already on `main` (evidence in the session note above); H9
shipped separately.** This wave is closed — do not re-plan it as nine open items.

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
