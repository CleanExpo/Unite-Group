# SPM Spec — Daylight Totality + The Matrix Wall (wave 1)

Date: 15/07/2026 AEST · Author: SPM session (Fable 5) · Status: FOR FOUNDER APPROVAL
Repo: CleanExpo/Unite-Group `apps/web` @ `63861e53` (origin/main tip) · Ticket home: UNI-2378 (parent UNI-2373)

## 1. Task

Two founder directives from the 15/07 session: (a) live-test the new Daylight calm-cockpit
layout and close its UI/UX gaps; (b) spec the "Matrix wall" — multiple live panes on the
dashboard, each showing an agent working: who it is, which application it's on, its tool
calls, which Claude Max plan it runs on, and a whole-system pulse — "the entire system
working as 1 unit."

## 2. Project context

apps/web is the founder-only Unite-Group Nexus CRM (Next.js 16, React 19, Supabase,
Vercel). PRs #844 (calm cockpit — agent-first home + 4 sub-routes) and #845 (Daylight
default register) merged and deployed today; the founder eyeballed both live. NorthStar
doctrine binds this spec: every pane GREEN = real data + auth + founder-scope + honest
states; **No-Invaders: no fake-as-real, no invented numbers** — a Matrix wall of theatre
is explicitly out.

## 3. Problem

**Live-walk evidence (production, 15/07 13:22–13:30 AEST, five routes, screenshots on
session record; zero console errors):**

*Daylight bridge misses — dark slabs on paper ground:*
- P1 Idea Console block (home Command Brief) — full-width charcoal panel [VERIFIED live + `idea-console.module.css` owns its tokens]
- P1 Operating System Health cards ×4 (operations) — dark grey slabs
- P1 Blocked Lanes work-packet cards ×6 (operations) — dark slabs, near-unreadable titles
- P2 Recent Ships panel (operations) — grey slab

*Contrast defects on paper:*
- P1 Today's-priorities action links — washed to near-invisible
- P1 Evidence-stream event text — washed out
- P2 Morning-digest strip text + "2 tasks awaiting your decision" chip — low contrast on amber

*Truth/plumbing gaps (honest, but reading as broken):*
- P1 Hero says "5 priorities need you" while the digest strip says "0 need you" — two sources, two stories
- P2 Task Queue chip OFFLINE; Hermes control panel stuck "REQUESTING"; In-Progress PRs stuck "Loading…"; Wiki Graph 0 pages with endless spinner — perpetual-loading states where a resolved honest state should render
- P2 Providers deck ≈ blank: three "LOADING" strips forever (ingest dormant behind `COST_METERING_ENABLED` + `METERING_FX_USD_AUD` — founder-owned env atoms, not build scope)
- Evidence stream repo/ref/sha columns all "—" (ledger rows carry no git refs)

*The founder vision gap:* operations Activity Log states verbatim "This feed lights up
once a live agent-activity source is wired." **No live agent-activity source exists.**

## 4. Desired outcome

1. Daylight is total: zero dark-slab survivors, AA contrast everywhere on paper.
2. One truthful data story per number (hero and digest agree or the divergence is labelled).
3. A **Matrix wall** on the deck: a live grid where each pane is one working agent —
   identity, application/repo, activity ticker, plan chip, status — plus a system-pulse
   header, all backed by real telemetry, degrading honestly to "not connected".

## 5. Scope

**Wave A — Daylight totality + truth reconciliation (pure front-end, no new data):**
bridge the 4 missed surfaces onto `cc-daylight`; fix the 3 contrast defects; reconcile
hero/digest copy to one source of truth; convert the 4 perpetual-loading states to
resolved honest states ("not connected — needs X") after a bounded timeout.

**Wave B — Matrix wall wave 1 (new surface + the missing bridge):**
1. `cc_agent_events` table (founder-RLS, service-role writes) + `POST /api/agents/events`
   ingest (bearer-secret auth) accepting session heartbeats + redacted tool-call events.
2. Estate-side emitter: a small hook/daemon on this Mac that tails the live Claude Code
   session state and POSTs `{session_id, agent_name, repo, tool_name, target, plan_key,
   machine, ts}` — **event names and targets only, never payloads/args** (redaction rule).
   `plan_key` comes from local account identity config → real Max-plan attribution.
3. `MatrixWall` component on the command deck home (replaces nothing; sits under Vital
   Signs behind a section): grid of session panes from `cc_execution_sessions` ⋈
   `cc_agent_events` over the existing `cc:queue` Supabase Realtime channel + a new
   `cc:agent-events` channel; system-pulse header from `live-agent-operations.summary`.
   Panes without a live emitter render the honest dark-pane state: "no live feed — agent
   not reporting". Register: Daylight tokens; the wall's panes MAY use the deck-dark
   register *inside the pane viewport* (a screen-within-a-screen is diegetic, not a
   bridge miss).

**Out of scope (parked, named):** multi-machine emitter rollout (Windows/MacBook — one
command each once proven here); Codex/other-CLI emitters; cost-per-pane $ figures
(dormant until the founder's two metering vars); presence heartbeats for non-Claude
runners (UNI-2143 successor); global sidebar diet (wave-2 grilling tickets UNI-2376/77);
3D/Mission-Station ambitions (wayfinder fog).

## 6. Existing capability (do not rebuild)

`cc_tasks`/`cc_execution_sessions` control plane with Supabase Realtime channel
`cc:queue` (QueueBoard already subscribes) [VERIFIED audit]; `buildLiveAgentOperations`
15s-poll map; `operator_events`/`cc_task_events` activity rows with real writers;
evidence ledger (Supabase table + local JSONL reader); provider cockpit truth-levels;
`DegradedDataBanner` honest-state pattern; Daylight token system + `cc-daylight` marker
(PR #845). The wall composes these — it does not fork them.

## 7. Specialist board (15+ yr lenses)

- **Product**: the wall is the product's soul — "watch the system work" is the founder's
  retention loop; but panes must earn their place: a pane with no live agent is dead
  weight, so the wall must collapse to its honest minimum, never pad.
- **Architect**: do NOT poll per-pane; one Realtime channel fan-in, one reducer. The
  emitter is the only genuinely new system; keep it dumb (tail → POST, no local queue
  beyond retry buffer).
- **UX**: Matrix ≠ noise. Each pane = 4 fixed slots (identity, app, ticker, plan);
  ticker max 3 visible events, monospace, auto-fade; system pulse is ONE line. Daylight
  frame, dark pane interiors as diegetic screens. Mobbin refs: Affirm register (ratified);
  live-ops pane pattern nearest comparables are ops consoles (Vercel deploy stream,
  Linear triage) — no cached Mobbin row covers "live ops wall"; flagged for a build-time
  Mobbin pull rather than invented layout [UNSUPPORTED — Mobbin cache gap, honest].
- **Security**: ingest = bearer secret (new `AGENT_EVENTS_SECRET`), founder-RLS reads,
  service-role writes, event redaction (name+target only), rate-limit the route, no
  machine hostnames beyond a declared alias map.
- **QA**: every pane state enumerable → unit-test the reducer (live/stale/gone), route
  auth tests, RLS founder-scope test, emitter dry-run fixture; Playwright: wall renders
  honest-empty with zero events.
- **Devil's advocate**: "the wall will be empty theatre on day 1 because only ONE machine
  emits" — accepted: wave 1 ships with this Mac's emitter live so ≥1 pane is real at
  demo; the empty-grid state is designed, not accidental.

## 8. Judge challenge

- Wave A: 100/100 — APPROVE BUILD. Every defect is evidenced by a production screenshot,
  every fix is token/copy-level, gates are the standard five, rollback = revert.
- Wave B: 96/100 — APPROVE BUILD with two bound risks: (R1) emitter fidelity — tailing
  local session state is best-effort; mitigated by heartbeat-only degradation (a pane
  that stops ticking goes stale-honest at 60s); (R2) Realtime volume — tool-call bursts;
  mitigated by emitter-side 2s coalescing + event cap per minute. The remaining 4 points
  are the two parked unknowns (multi-CLI identity, multi-machine rollout) — parked ≠
  blocking; acceptance criteria below do not depend on them. Full-cinema "as in the
  Matrix" (every machine, every CLI, cost ticking live) is wave 2+; approving THAT today
  would be REDUCE SCOPE — so it is reduced.

## 9. Proposed solution (shape)

Wave A first (one PR), then Wave B as two PRs: (B1) table + ingest route + emitter
script + unit tests, dark-launched (no UI); (B2) MatrixWall UI reading real B1 data,
behind section-level presence (renders only when ≥1 session row exists — dark-by-default
by data, not flag). Each PR rides the standard adversary → lane flow.

## 10. UX specification

Home deck, under Vital Signs: section head "MATRIX · the system working as one".
Grid `repeat(auto-fit, minmax(320px, 1fr))`, max 6 panes, overflow chip "+N more →
operations". Pane anatomy (fixed 4-slot, 180px): header `AGENT · surface` + status LED
(live=green pulse ≤15s, stale=amber ≤60s, gone=quiet grey); line 2 `repo/app` +
project_key chip; ticker = last 3 events `HH:MM:SS tool → target` monospace fade;
footer = plan chip (`MAX-1/2/3` real from emitter, or "plan: not reported") + machine
alias. System pulse header: `N agents live · M tasks running · K events/min · killswitch
state`. Empty state (full-width, quiet): "No agents reporting. The wall lights when a
session emits — install the emitter on a machine to join it." Feel: Daylight frame;
pane interiors deck-dark (diegetic screens). All copy en-AU.

## 11. Technical specification

- Migration `cc_agent_events`: `id, founder_id, session_id, agent_name, surface,
  machine, repo, project_key, plan_key, event_type('heartbeat'|'tool_call'|'status'),
  tool_name, target, created_at` + index `(founder_id, created_at desc)` + RLS founder
  policies + realtime publication. Supabase branch first — schema-gate applies.
- `POST /api/agents/events`: bearer `AGENT_EVENTS_SECRET`; zod-validated batch ≤50;
  service-role insert; 429 above 120 events/min/session.
- Emitter `scripts/agent-events-emitter.ts` (estate-run, LaunchAgent template): tails
  `~/.claude` session JSONL (same family as the evidence ledger reader), coalesces 2s,
  redacts to name+target, resolves `plan_key` from local account config, POSTs batches;
  exponential backoff; zero writes anywhere else.
- `MatrixWall.tsx` + `matrix-wall.module.css`: subscribe `cc:agent-events` +
  reuse `cc:queue`; reducer keyed by session_id; stale/gone timers client-side;
  server-fallback initial load via loader `lib/command-centre/matrix-wall.ts`.
- No new deps. founder_id scoping on every query. Bundle: wall lazy-imported.

## 12. Security

Secrets: one new env (`AGENT_EVENTS_SECRET`) — Vercel + local emitter env; never logged.
Redaction is emitter-side AND ingest-side (strip any `args`/`payload` keys defensively).
RLS: founder-only reads; service-role writes; table in the realtime publication scoped
by RLS. Route rate-limited. No PII in events. gitleaks stays green (no literals).

## 13. Verification plan

Wave A: five production screenshots re-taken post-deploy; axe/contrast spot-check on the
three fixed text ramps; vitest + build + lint + type-check.
Wave B1: route auth tests (401/200/429), RLS test (second-user read = 0 rows), emitter
fixture dry-run, migration on a Supabase DB branch with `check:schema-drift`.
Wave B2: Playwright — wall honest-empty with no rows; wall renders 1 live pane from a
seeded-then-emitted real event (emitter run against preview); reducer unit tests for
live→stale→gone.

## 14. Loop + stress testing

Emitter soak: 2h run on this Mac during a real working session; assert no memory growth,
no 429s, pane stays live. Burst test: 500-event replay through ingest at 10x speed →
coalescing + cap hold. Kill test: stop emitter → pane amber at 60s, grey at 5m, wall
collapses to empty state when last session gone.

## 15. Acceptance criteria (all must hold)

A1 Zero dark-slab surfaces outside diegetic pane interiors on all five routes (screenshot diff).
A2 Hero and digest quote the same queue source or label the divergence in copy.
A3 No spinner older than 10s anywhere: every tile resolves to data or a named honest state.
B1 `cc_agent_events` live in prod via branch-merged migration; RLS founder-proven.
B2 With the emitter running on this Mac during a real Claude Code session, the wall shows
   ≥1 pane with true agent name, repo, ticking tool events, and a real `MAX-n` plan chip
   within 15s of the session starting — observed live by the founder.
B3 With the emitter stopped, the wall degrades amber→grey→honest-empty on the stated timers.
B4 No event row anywhere contains tool arguments or payload content (audit query).
B5 Standard gates green on every PR; adversary pass on B1 and B2.

## 16. /goal command

```
/goal Build the SPM spec at .spm/2026-07-15-matrix-wall-and-daylight-gaps.md in three
PRs on Unite-Group apps/web: (A) Daylight totality + truth reconciliation per §5/§10;
(B1) cc_agent_events migration on a Supabase DB branch + ingest route + this-Mac emitter
per §11/§12, dark-launched; (B2) MatrixWall UI per §10 reading only real B1 telemetry.
Honour No-Invaders (honest not-connected states), schema-gate, merge-gate, adversary
review per wave, and acceptance criteria §15 A1–B5 as the definition of done. Founder
demo checkpoint after B2: live wall with ≥1 real pane during a working session.
```

## 17. Implementation sequence

1. Wave A PR (CSS/copy only) → adversary → lane. ~9 files.
2. B1: Supabase branch migration → founder-visible branch diff → merge → route + emitter
   + tests PR → dark-launch (no UI reads yet) → soak on this Mac.
3. B2: MatrixWall UI PR → preview demo with live emitter → founder eyeball (B2 criterion)
   → lane → prod → re-walk all five routes.
4. Close UNI-2378 wave-1 comment; file wave-2 atoms (multi-machine, Codex emitter,
   cost-per-pane) on the map.

## 18. Session-handoff seed

Resume point: spec at `.spm/2026-07-15-matrix-wall-and-daylight-gaps.md`; walk evidence
= five production screenshots in session 15/07 13:22–13:30 AEST; telemetry inventory in
the audit subagent report (same session); Wave A defect list §3 is self-contained.
Founder-owned prerequisites that unblock adjacent tiles but NOT this build: identity env
flips + metering vars (UNI-2373 goal comment). First command of the build session: read
this spec, then `git checkout -b feat/daylight-totality origin/main`.

## 19. Final recommendation

APPROVE BUILD both waves at the reduced wave-1 scope above. Wave A is pure polish debt
from today's two merged PRs and removes every "still looks like Hermes" survivor. Wave B
wave-1 delivers the founder's Matrix vision honestly: one real machine emitting real
tool calls with real Max-plan attribution beats six fake screens — and the empty panes
name exactly what to install to light them, which is the recruitment loop for the rest
of the fleet.

SPM spec complete. Next safe action: on founder approval, run the §16 /goal command to start Wave A.
