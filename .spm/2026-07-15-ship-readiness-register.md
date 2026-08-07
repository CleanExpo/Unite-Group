# SPM Ship-Readiness Register — the whole site vs NorthStar GREEN

> ## ⚠ 15/07/2026 SNAPSHOT — ITS STATUS CLAIMS ARE STALE. READ §2a/§2b FIRST.
>
> Verified 07/08/2026: the whole P1–P8 producer wave merged · **Class R (the runner) was
> merged AND armed in prod on 16/07** (#852/#853/#854, UNI-2385) — it is NOT outstanding ·
> P9's grade was wrong (§2a) · at least two Class H items are open, one of them a false
> state rendering right now (§2b).
>
> **Method warning — the load-bearing one.** Both the original audit and a 07/08 re-audit
> established "implemented" largely by *locating symbols*. That proves presence, not
> behaviour, and it produced false GREENs in both passes. Before trusting any row here:
> for a UI claim find the render path; for a guard mutate the defect back in; for a
> "still outstanding" claim run `git merge-base --is-ancestor <sha> origin/main`.

Date: 15/07/2026 (afternoon) · Method: five parallel domain audits (CRM core, Money,
Growth, Advisory/Knowledge/System, agent plane) + orchestrator spot-verification of every
load-bearing claim + the live Command Brief E2E test + the five-route production walk.
Baseline: UNI-2373 NorthStar map (every founder section GREEN; 200 ≠ real), UNI-2378
cockpit map, No-Invaders doctrine. Repo @ `da698d7b`.

Grades: GREEN = real founder-scoped data behind auth, honest states, verified.
AMBER-env = code-complete, starved of a credential/env/first-run. AMBER-build = a real
missing piece of code. All grades from the domain audits; every claim the register's
priorities rest on was re-verified by orchestrator grep [VERIFIED] this session.

> **That sentence is historical, and its method was not sound.** "Re-verified by grep" is
> exactly what produced the false grades — P9's AMBER-env (§2a) and H1's GREEN (§2b) both
> survived it. Read every `[VERIFIED]` marker in this file as "the symbol was located",
> never as "the behaviour was checked".

## 1. Scoreboard

**GREEN now (shippable as-is):** auth spine + founder layout · contacts (CRUD, identity-
gated visibility) · campaigns (+new/[id]) · social page + full 4-platform publisher cron ·
experiments shell · advisory · strategy · content · schedule · vault · founder-chat API ·
public /api/agent · notifications pipeline · My Board kanban (pending prod-migration
confirm) · dashboard→command-centre redirect.

**Nothing fake-as-real anywhere** — all five audits + the walk found zero No-Invaders
violations rendering today; three latent risks listed in §4.

> **False as of 07/08/2026, and the §4 pointer is dangling** (§4 carries no risk list).
> At least one No-Invaders violation renders today: the QueueBoard session label asserts
> "waiting for runner — none connected" unconditionally while the runner has been armed
> in prod since 16/07 — see §2b (H1). The 16/07 break-sweep
> (`2026-07-16-break-sweep-readiness-assessment.md`) additionally documents honest-state
> defects across strategy, boardroom, kanban, bookkeeper and contacts that this
> scoreboard does not reflect.

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

#### §2b — Class H: the 07/08 re-audit was UNSOUND. Class H is NOT closed.

A 07/08 re-audit reported "H1–H8 all already done on `main`" from these citations:
`QueueBoard.tsx:517` (H1) · `:34-37`/`:356-360` (H2) · `ideas/route.ts:72-93` (H3) ·
`QueueBoard.tsx:289` (H4) · `hermes-control-panel/page.tsx:123,130` (H5) ·
`xero/client.ts:331,376` (H6) · `AnalyticsDashboard.tsx:145,300` (H7) ·
`DeckThemeShell.tsx:17-22` (H8).

**Independent review falsified that conclusion.** The audit located an honest-looking
symbol at each site and called it done; it never checked the behaviour. Known bad rows
(as of 07/08 morning):

- **H1 — was OPEN (false state).** Fixed and merged [#947](https://github.com/CleanExpo/Unite-Group/pull/947)
  (`eaf1be06`): session label now depends on a real nexus-runner heartbeat.
- **H6 — DISPUTED → closing.** Client/route already tagged `source:'mock'`; KPICard already
  rendered Demo/Live; coach prompts already labelled DEMO. Residual from the 16/07
  break-sweep: mock `lastUpdated` used `new Date()` (looked freshly live) and no UI test
  asserted the Demo badge on `source:'mock'`. Those residuals ship in the H6 PR.
- **H2–H5, H7, H8 — BEHAVIOUR-CONFIRMED GREEN (07/08 afternoon re-derive).** Not symbol
  presence — render/API paths checked:
  - H2: `board/route.ts` persists `metadata.board.verdict`; `QueueBoard` shows
    `board: {verdict}`; approve route annotates `boardVerdict`; approvals tests cover
    audit payload.
  - H3: `ideas/route.ts` dedups Proposed-lane by normalised objective; MacBook
    resubmit test returns `deduplicated: true`.
  - H4: cold load shows `Loading tasks…` when `loading && tasks.length === 0`; empty
    only after load; Offline is the realtime label, not a false task count.
  - H5: hermes panel stats/copy read `design target (not live)`.
  - H7: `AnalyticsDashboard` keeps load-failure distinct from empty-state.
  - H8: `DeckThemeShell` defers daylight preference until hydrated; guarded by
    no-invaders test.
- **H9 — MERGED** [#948](https://github.com/CleanExpo/Unite-Group/pull/948) (`a30a3976`):
  studio off retired OLED/cyan; directory-enumerated palette guard; AA contrast fixes.


#### §2a — P9 re-graded AMBER-env → AMBER-build, and the fix is NOT small

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

### Class R — The runner (Wave B1) — ✅ **BUILT AND ARMED IN PROD 16/07/2026**

> **Not outstanding. Do not plan it.** `1412b724` (B1 ingest, #852), `81f40cfa` (runner,
> #853) and `5022770f` (B2 Matrix wall, #854) are all ancestors of `origin/main`
> (`git merge-base --is-ancestor`). `scripts/nexus-runner/README.md` records the runner
> executing at the L2 ceiling (branch → gates → **draft PR**, never merge/migrate/deploy)
> with "runner E2E loop proven on local stack" (16/07, UNI-2383) and "**runner armed in
> prod and demo-proven**" (16/07, UNI-2385).
>
> The text below is the 15/07 spec, kept for provenance. Its closing claim that the loop
> "is theatre from START SESSION onward" was true on 15/07 and is **false now** — which
> is what makes H1's hardcoded "none connected" label an active lie rather than an
> honest placeholder (§2b).

*Original spec (15/07/2026):*
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

**Status 07/08/2026 afternoon: Class H nearly closed — see §2b.** H1 (#947) and H9 (#948)
merged; H2–H5/H7/H8 behaviour-confirmed GREEN; H6 residuals (fixed seed `lastUpdated` +
Demo-badge e2e assertion) ship with this register update. Next code item after H6 lands
is P9 (M–L, founder/Board-gated schema).

## 3. Judge

> **Superseded 07/08/2026.** The original judge is kept below for provenance, but its
> build authorisations are spent: Wave A part 2, P2/P7 and the whole P1–P8 producer wave
> have since merged. Its "100/100 as an audit" line is no longer true of this file —
> P9's AMBER-env grade was wrong (see the session note), so at least one priority claim
> the register rested on was not what double-verification implied.

*Original (15/07/2026):* Register 100/100 as an audit (every priority claim
double-verified). Build authorisation stays wave-gated: Class H + P2/P7 (S items) =
APPROVE BUILD now; Class P M-items = APPROVE BUILD in value order after F1 (identity)
lands — building writers against data the founder can't see inverts the leverage;
Class R = already approved (spec §16), schema-gate pause stands; Class F = founder-owned,
not buildable.

## 4. Recommended sequence

> **Superseded 07/08/2026.** Steps 2 and 4 below are DONE — following them re-plans
> merged work. Kept for provenance; the live sequence is §4a.

*Original (15/07/2026):*
1. **Phill (minutes):** F1 → F2 → F3 → F4 (F1 alone un-empties the CRM).
2. ~~**Wave A part 2 (one PR):** H1–H4, H7, H8 + P2 + P7.~~ — merged (#849)
3. **Wave B1** (runner+emitter, schema-gate checkpoint) → **B2** (Matrix wall).
4. ~~**Producer wave:** P1 → P3 → P5 → P4 → P6 → P8~~ — all merged (#940–#945)
5. Re-walk all five routes + UNI-2377 parked-line grilling closes "comprehensive".

## 4a. Live sequence — 07/08/2026 (updated afternoon)

Deliberately short. Two earlier attempts to write a confident forward plan here each
introduced a fresh false claim (P9 "founder-visible"; Class R "largest remaining item"
when it was merged and prod-armed). Only items verified outstanding this session appear.

1. **Phill (minutes, unchanged and still the highest leverage):** F1 → F2 → F3 → F4.
   F1 alone un-empties the CRM. No agent may self-perform these.
2. ~~**H1**~~ — merged [#947](https://github.com/CleanExpo/Unite-Group/pull/947).
3. ~~**H9**~~ — merged [#948](https://github.com/CleanExpo/Unite-Group/pull/948).
4. ~~**Re-derive Class H**~~ — H2–H5/H7/H8 GREEN by behaviour; **H6** closing (seed
   `lastUpdated` + Demo-badge e2e assertion).
5. **P9, re-scoped M–L** per §2a: visibility fix, write-then-confirm persistence, honest
   upstream-failure states, dormant-by-default arming, and a schema decision on the
   `board_meetings` collision. The migration is founder/Board-gated — not agent work.
6. Re-walk all five routes + UNI-2377 parked-line grilling closes "comprehensive".

**Not on this list because it is already done:** Class R / Wave B1 / B2 (merged and armed
in prod 16/07), Wave A part 2, the whole P1–P8 producer wave, H1, H9, and behaviour-
confirmed H2–H5/H7/H8.

## 5. /goal command

```
/goal Execute the ship-readiness register at .spm/2026-07-15-ship-readiness-register.md
per §4a ONLY. H1 (#947) and H9 (#948) are merged; H2–H5/H7/H8 are behaviour-confirmed
GREEN. Close H6 (mock lastUpdated seed + Demo-badge e2e), then P9 at its re-scoped M–L.
Treat every status claim in this file as presence-only evidence until re-checked: for UI
find the render path, for a guard mutate the defect back in, for "still outstanding" run
git merge-base --is-ancestor. Honour No-Invaders, dormant-by-default (merging must arm
nothing), the merge gate and independent adversary review per wave. Founder actions
F1-F7 and any prod schema migration are named dependencies, never self-performed.
```

Next safe action: land H6, then start P9 design (schema decision is founder/Board-gated)
while Phill executes F1–F4.
