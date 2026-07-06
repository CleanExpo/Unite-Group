# SPM Spec — Sidebar De-bloat & Agentic Consolidation (Command Centre left nav)

**Date:** 06/07/2026 · **Author:** Fable 5 via `/nexus` + `/spm` · **Status:** SPEC (no build authorised by this document alone)
**Scope surface:** `apps/web` — `src/components/layout/SidebarNav.tsx` and the 27 founder routes it links.

---

## 1. Task

Identify bloat in the founder left-hand sidebar, classify each section (needed / duplicated /
auto-generatable), and spec how the agent layer (runtime capability APIs, crons, Senior Agents)
can serve these functions without a human-facing nav entry — a leaner sidebar with less human
required.

## 2. Project context

- Sidebar today: **27 links in 7 groups** — `src/components/layout/SidebarNav.tsx:12-75` `[VERIFIED]`.
- All 27 routes are **real** (Supabase/Xero/Google/GitHub-wired). No fake-as-real Invaders found;
  mock markers are honest `not_connected` labels (`calendar/page.tsx:19`,
  `boardroom/gantt/route.ts:38`, `dashboard/kpi/route.ts:23`) `[VERIFIED — route audit 06/07/2026]`.
- **25 Vercel cron jobs** already auto-generate most page content headlessly (`apps/web/vercel.json`)
  `[VERIFIED]`.
- Two automation layers exist and must not be conflated: build-time Claude Code agents
  (`.claude/agents/` — 34 dirs, not 31 as CLAUDE.md says; `.skills/custom/` ~80 skills) are **not
  reachable from the running product**; the runtime layer is `src/app/api/**` +
  `src/lib/ai/capabilities/*` `[VERIFIED]`.

## 3. Problem

The bloat is **duplication, not dead weight**. Eight overlap clusters make the founder route
between near-identical surfaces, and display-only pages occupy nav slots even though crons already
generate their content:

| Cluster | Members | Nature of overlap |
|---|---|---|
| AI deliberation | advisory · strategy · boardroom | all "ask → AI deliberates → read"; differ mainly in prompt framing |
| Finance | bookkeeper · xero · invoices | xero is mostly a connect screen; invoices ⊂ bookkeeper's Xero reads |
| Knowledge | notes · wiki · knowledge-console | three capture/read stores on three backends (Drive / `wiki_pages` / `knowledge_notes`) |
| Approvals | approvals · nexus (PRs) · pi run-queue | three separate "human gates an agent action" inboxes |
| Cockpits | dashboard · command-centre | two cross-business status decks; command-centre is the superset |
| Content | social · campaigns · brand-video (· analytics) | one content-marketing workflow split across 4 nav slots |
| CRM | contacts · opportunities | people vs deals halves of one CRM |
| Google | email · calendar | shared connection layer, distinct workspaces (acceptable) |

## 4. Desired outcome

A sidebar of **≤12 items** where every entry is either a human-gated decision surface, a genuine
composition workspace, or a cockpit — and everything display-only or agent-generated is reachable
via the Command Centre deck, ⌘K, or deep link instead of a nav slot. Human touchpoints reduce to:
approve, compose, connect.

## 5. Scope (three phases — only Phase 1 is authorised by this spec's judge gate)

### Phase 1 — Nav consolidation (UI only, zero route deletion) — **BUILD-READY**
Target nav (12 items, 4 groups):

| Group | Item | Absorbs (nav entry removed; route stays live) |
|---|---|---|
| — | Command Centre | dashboard (KPI tiles fold into the deck), pi (LiveAgentOperationsMap already there), skills (health tile) |
| — | Approvals | nexus PR approvals, pi run-queue gates (unified inbox w/ type filters) |
| Money | Bookkeeper | xero (connect → Settings › Connections), invoices (tab) |
| Pipeline | Kanban · Contacts · Email · Calendar | opportunities → tab of Contacts |
| Growth | Campaigns · Analytics | social (connect → Settings; publishing queue → Campaigns tab), brand-video (Campaigns lane) |
| Advisory | Boardroom | advisory (case-debate tab), strategy (insights tab) |
| System | Knowledge · Vault · Settings | notes + wiki + knowledge-console under one Knowledge surface (read-through to all three backends — **no data migration in this phase**) |

Mechanics: edit `NAV_GROUPS` in `SidebarNav.tsx`; add tabbed shells on the absorbing pages that
**iframe-nothing, migrate-nothing** — they link/embed the existing route components; add Next
redirects for removed nav hrefs' discoverability is preserved via deep links (routes stay live, so
no redirects are strictly required — add `next.config` 308s only where a page is later folded);
update `__tests__/Sidebar.test.tsx`.

### Phase 2 — Pi dispatcher (the "less human" unlock) — **EXPERIMENT, own PR**
The measured gap `[VERIFIED]`: ⌘K `CommandBar.tsx` only navigates + captures ideas; no
natural-language route exists to the capability APIs. Add `POST /api/pi/dispatch`: intent →
existing routes (`advisory/cases/*/start`, `strategy/analyze`, `experiments/generate`,
`campaigns/scan`, `command-centre/lanes/{content,software,wiki}/*`, `command-centre/classify`).
Wire ⌘K to it. Risk taxonomy per the existing tool catalogue's `read/write-local/write-shared/
external/destructive` rails; destructive/external intents always land in the Approvals inbox,
never auto-execute. Gate design follows the `autonomy-ladder` doctrine.

### Phase 3 — Backend merges — **OUT OF SCOPE, each needs its own spec**
Knowledge-store unification (Drive/wiki_pages/knowledge_notes), advisory+strategy+boardroom
backend merge, approvals-queue schema unification. All involve data migration ⇒ Supabase branch
workflow, never bundled with UI work.

**Non-goals:** deleting any route or table; bridging `.claude/agents` into the product runtime
(they are build-time by design); changing auth/RLS; touching Vault.

## 6. Existing capability (do not rebuild)

Headless coverage already live `[VERIFIED]`: bookkeeper (nightly cron), social-publisher (15m),
engagement-monitor (30m), video-status (5m), content-engine (daily), campaign-engine (weekly),
analytics-sync (daily), email-triage (daily), strategy-daily (7 businesses), ceo-board-meeting
(daily), coaches ×4 (nightly), hub-sweep (nightly), import-contacts (weekly), overnight-digest.
Command Centre already ships CommandPalette, IdeaConsole, QueueBoard, ActionQueueTile,
LiveAgentOperationsMap, HermesControlPanel (`command-centre/page.tsx:18-35`). Telegram
approval-callback exists for remote approvals.

Gaps: **advisory and experiments have no cron** (pages only fill on manual POST) — add weekly
crons in Phase 2 so every deliberation surface self-populates like strategy/boardroom.

## 7. Specialist board (15+ yr perspectives, condensed)

- **Product Manager:** the sidebar is the founder's decision surface, not a site map. Rank by
  "does Phill *act* here?" — approvals/compose/connect earn slots; read-only reports don't.
- **Software Architect:** phase discipline is the design. Phase 1 touches one component + tab
  shells; routes and tables are immutable this phase, making rollback = revert one PR.
- **UX Reviewer:** 27 flat links exceeds scan capacity; 12 items in 4 groups fits. Keep ⌘K as the
  power path; absorbed functions must remain one interaction away (tab or deck tile), not buried.
- **Security Reviewer:** unified Approvals inbox must preserve per-type authorisation (Xero
  approve ≠ PR approve ≠ queue approve — separate API calls, separate scopes; aggregate the *list*,
  never the *grant*). Phase 2 dispatcher must never auto-execute `external`/`destructive` intents.
- **QA Lead:** verify by walking the live logged-in app (prior lesson: file-level connectivity can
  pass while the running app is broken). Gates: type-check, lint, vitest (Sidebar tests updated),
  build, plus a manual pass of all 12 nav targets and 5 absorbed deep links.
- **Devil's Advocate:** the trap is "tabs of tabs" — consolidating UIs without merging backends
  can just relocate the bloat. Mitigation: each absorbing page gets a tab bar only where the audit
  showed subset/superset overlap (invoices⊂bookkeeper, opportunities+contacts, advisory modes);
  where backends genuinely differ (Knowledge), Phase 1 is a thin unified shell and honest about it.

## 8. Judge challenge (hardline: APPROVE BUILD requires a real 100/100)

- **Phase 1 — APPROVE BUILD 100/100.** Every mandatory criterion is satisfiable and verifiable:
  no data change, no route deletion, single-component nav edit + tab shells, updated tests, full
  gate run, one-PR rollback. Nothing unresolved remains in scope.
- **Phase 2 — APPROVE EXPERIMENT (87/100).** New API surface; needs an autonomy-gate design pass
  (intent-risk classification, approval routing) before a build authorisation. Not 100 — do not build
  from this spec; produce the dispatcher spec first.
- **Phase 3 — REDUCE SCOPE (55/100).** Data migrations across three stores; requires Supabase
  branch validation and its own spec per store. Explicitly deferred.

## 9. Proposed solution (Phase 1 file plan)

1. `src/components/layout/SidebarNav.tsx` — replace `NAV_GROUPS` with the 12-item structure.
2. `src/app/(founder)/founder/bookkeeper/` — add Invoices tab (renders existing invoices page component); Xero connect card links to Settings › Connections.
3. `src/app/(founder)/founder/contacts/` — add Opportunities tab.
4. `src/app/(founder)/founder/boardroom/` — add Advisory + Strategy tabs.
5. `src/app/(founder)/founder/approvals/` — aggregate list view: approval_queue + PR approvals (nexus) + pi run-queue, each row deep-linking to its existing approve action.
6. `src/app/(founder)/founder/campaigns/` — add Social + Brand-Video tabs.
7. New thin `knowledge` shell (or promote knowledge-console) with Notes/Wiki/Console tabs.
8. Command Centre deck: add dashboard KPI tile row + skills-health tile.
9. Update `src/components/layout/__tests__/Sidebar.test.tsx`.

## 10. UX

Groups: (top-level) Command Centre, Approvals · Money · Pipeline · Growth · Advisory · System.
Active-state and collapsed-divider behaviour unchanged. Absorbed pages get a `rounded-sm` tab bar
consistent with Scientific Luxury tokens; no new dependencies (No-Invaders rule 3).

## 11. Technical

Next.js 16 App Router; tabs as route-group layouts or client tab state — prefer **URL-addressable
tabs** (`?tab=` or nested segments) so deep links and tests stay stable. No new packages. Every
route keeps its `loading.tsx`/`error.tsx`.

## 12. Security

No auth/RLS/schema change. Approvals aggregation is list-level only; each approve action posts to
its existing scoped endpoint. founder_id scoping untouched.

## 13. Verification plan

`pnpm turbo run type-check lint test && pnpm build` green, then live logged-in walkthrough:
12 nav items render; each target loads with real data; deep links `/founder/dashboard`,
`/founder/invoices`, `/founder/advisory`, `/founder/strategy`, `/founder/notes` still resolve;
approvals inbox shows all three queue types; Command Centre shows KPI + skills tiles.

## 14. Loop / stress testing

- Collapse/expand sidebar at each breakpoint; keyboard nav through 12 items.
- Approvals inbox with 0 / 1 / mixed-type / 50+ pending items (empty state honest, no fabricated rows).
- Tabbed pages with their integration disconnected (`not_connected` propagates, No-Invaders rule 1).

## 15. Acceptance criteria (all mandatory)

1. `SidebarNav.tsx` renders exactly the 12 items / 4 labelled groups above.
2. Zero routes deleted; all 27 previous URLs still resolve (direct or via tab).
3. Approvals page lists approval_queue + PR + pi run-queue items with working per-type approve.
4. Boardroom exposes Advisory + Strategy as tabs; Bookkeeper exposes Invoices; Contacts exposes Opportunities; Campaigns exposes Social + Brand-Video; Knowledge exposes Notes/Wiki/Console.
5. Command Centre deck contains dashboard KPI tiles + skills-health tile.
6. Sidebar tests updated and green; full gate run green; live walkthrough completed.
7. No schema change, no new dependency, no route/table deletion in the diff.

## 16. Goal command

```
/goal Implement Phase 1 of docs/specs/2026-07-06-sidebar-debloat-agentic-consolidation-spec.md:
consolidate the founder sidebar from 27 items to the specced 12 (nav + tab shells only, zero
route/table deletion), aggregate the Approvals inbox, fold dashboard KPI + skills tiles into the
Command Centre deck, update Sidebar tests, and stop when all 7 acceptance criteria in §15 are
verified green on a live logged-in walkthrough.
```

## 17. Implementation sequence

1. SidebarNav + tests → verify: vitest green.
2. Tab shells (bookkeeper, contacts, boardroom, campaigns, knowledge) → verify: deep links resolve.
3. Approvals aggregation → verify: three queue types listed, approve actions post to existing endpoints.
4. Command Centre tiles → verify: deck renders KPI + skills health.
5. Full gate + live walkthrough → PR into `main` (never stacked).

## 18. Session-handoff seed

Spec at `docs/specs/2026-07-06-sidebar-debloat-agentic-consolidation-spec.md`. Phase 1 judged
100/100 BUILD-READY; Phase 2 (Pi dispatcher, `POST /api/pi/dispatch` + ⌘K wiring + advisory/
experiments crons) needs its own spec incl. autonomy-gate design; Phase 3 (backend merges)
deferred pending per-store migration specs. Evidence: route audit + automation-layer recon,
06/07/2026, this session.

## 19. Final recommendation

Build Phase 1 now — it removes 15 nav slots purely by consolidation, is one-PR reversible, and
makes Approvals the founder's single mandatory touchpoint. Spec Phase 2 next; it is where "less
human required" actually lands (natural-language dispatch to the capability APIs that already
exist, plus crons for the two surfaces that still need manual POSTs).

SPM spec complete. Next safe action: open the docs PR carrying this spec, then run the §16 goal command in a fresh session to implement Phase 1.
