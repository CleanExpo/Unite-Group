# Break-Sweep Readiness Assessment — Unite-Group Nexus CRM

Date: 16/07/2026 (afternoon) · Method: 70-agent adversarial discovery fleet (7 finder
lenses → per-finding adversarial verification, 63 raw → 58 confirmed / 5 refuted) +
integrated-tree gate run + prod runtime-error probe (Vercel, 7-day window) + prod route
smoke + prod migration-state read. Tree: origin/main @ `5022770f`+`81f40cfa` (post
#853/#854 merges). Companion to `.spm/2026-07-15-ship-readiness-register.md` — this
sweep re-verified every register line and extends it with runtime + integration evidence.
Requested by the founder: "find, discover, break… before telling me everything is done."

## Verdict up front

**NOT-READY to be called "done and complete." Score: 62/100.**
The foundations are genuinely solid — integrated tree fully green, auth spine
fail-closed, honest dark-states real, No-Invaders held on every audited surface reaching
prod render. But 58 confirmed defects/gaps stand between today and the founder-walkable
product, and the **binding blocker is the prod credential/identity plane**: the founder
is denied by his own allow-list gate, and every external data feed (Google, Linear,
Xero) is dead or starved in prod. No amount of UI work lights the product while its
feeds are dark.

## 1. What is VERIFIED green (this session's tool results)

- **Integrated tree on main**: type-check 0 errors, lint 0, vitest **3,434/3,434**
  (553 files) — first-ever gate run on the merged #853+#854 tree. [VERIFIED]
- **Prod page shell**: all founder routes 307→`/auth/login` fail-closed unauthenticated;
  zero 500s on the route smoke; `/api/health` 200. [VERIFIED]
- **Runner plane deployed dark, degrading honestly**: `/api/agents/events` and
  `/api/agents/runner/claim` live in prod, 405 on GET / 401 on unauthenticated POST —
  no 500 despite their tables being absent. [VERIFIED]
- **Dark-state boundary confirmed**: prod migration head is `20260714023022`;
  `cc_agent_events` + `cc_tasks_claim` are repo-only. Wall/runner surfaces render
  honest dark states BY DESIGN until the UNI-2385 arming sitting. [VERIFIED]
- **Wave A part 2 (#849) fully landed**: register items H1–H4, H7, H8, P2, P7 all
  shipped-verified line-by-line on today's tree — zero over-claims in that wave.
  [VERIFIED by register-delta agent, file:line cited per item]

## 2. Prod runtime error map (7 days, Vercel — the part no code audit shows)

| Cluster | Count | Last seen | Reading |
|---|---|---|---|
| Linear API 401 (4 cron routes) | 763 | 12/07 | Prod `LINEAR_API_KEY` dead/stale — queue-health, handoff, synthex-monitor, board crons all blind |
| Google token refresh 401/400 — 6 accounts | ~130 | 13/07 | Entire Google plane (Gmail triage, contact import, Calendar, coaches) failing in prod; matches the known DB-first credential shadow + F2 |
| **[private-access] founder DENIED at /founder/wiki** | 7 | 14/07 | contact@unite-group.in not on the founder allow-list — **the founder is locked out of his own surface**; F1 flip missing or wrong. Also swallows `/_vercel/insights` (analytics dead) |
| **CEO Board cron JSON-parse fatal** | 4+ | **16/07 01:50Z — still firing** | `Expected ',' or '}' … position 4819` — LLM output parsed as JSON without repair; board meetings not generating |
| Anthropic 429 rate-limit — strategy-daily + ceo-board | ~20 | 15/07 | Prod crons burn raw API credits and hit limits (estate doctrine is Max-plan-first; these crons have no budget) |
| Bookkeeper cron timeout 300s | 2 | — | Hard Vercel runtime ceiling hit |
| PKCE code-exchange failure `/api/auth/callback` | 1 | 14/07 | Cross-device/browser auth edge |
| AuthRefreshDiscardedError `/api/command-centre/live-agent-operations` | 2 | 14/07 | Session refresh race on the ops surface |

Note: the Google/Linear clusters went **quiet 12–13/07 — quiet ≠ fixed**; either the
crons stopped attempting or the errors moved. Treat as open until a live re-auth is proven.

## 3. Confirmed findings (58) — adversarially verified, every one file:line-cited

Class key: BREAK = broken flow · DATA-GAP = surface starved/dishonest-empty ·
UX-DEBT = missing state/a11y/responsive/polish · OVER-CLAIMED = doc/board says done,
code disagrees · ASKED-NOT-BUILT = founder ask with no delivery · DARK-BY-DESIGN =
intentional, listed for completeness.

### P1 — fix-first (4)

**P1.1 · DATA-GAP · /founder/boardroom**
A failed meetings fetch renders the honest-empty 'No board meetings yet' state — error masquerades as empty, violating the repo's own No-Invaders #1 (which sibling surfaces contacts/opportunities/insights explicitly fixed)
Evidence: BoardroomClient.tsx:30-38 — res.json() called without res.ok check and `catch { // Silently retain stale data }`; on first-load failure meetings=[] and lines 111-115 render 'No board meetings yet.' with no error state. Contrast ContactsPageClient.tsx:34-37 and InsightsBoard.tsx:33-36 which set an explicit error flag for the same pattern.
Verify: Evidence reproduces exactly: apps/web/src/components/founder/boardroom/BoardroomClient.tsx:30-31 calls res.json() with no res.ok check and :34-35 has a silent catch; lines 111-115 render 'No board meetings yet' when meetings=[]. Confirmed worse than claimed: the API route (src/app/api/boardroom/meetings/route.ts:29) returns a 500 with an {error} JSON body, which the client parses without throwing, so `d.meetings ?? []` sets meetings=[] and updates lastRefresh — the catch never even fires for HTT

**P1.2 · OVER-CLAIMED · /founder/command-centre/hermes-control-panel — Security & version posture panel**
H5 still-open: security posture booleans (secret redaction / cred stripping / SSRF / CVE pinning all 'on') are hardcoded in a static registry and rendered as if live, with no 'design target (not live)' label anywhere on the page — the register's H5 relabel never shipped in any Wave.
Evidence: apps/web/src/lib/operator-gateway/control-panel.ts:66-73 (hardcoded 'on' values, source:'static_registry' at :61) + apps/web/src/app/(founder)/founder/command-centre/hermes-control-panel/page.tsx:122-132 (renders them in ok-green with zero static/design-target disclosure; grep for 'static|design target|not live' on the page = 0 hits)
Verify: Reproduced fully. control-panel.ts:66-73 hardcodes all four security-posture values as 'on' (source:'static_registry' at :61, never rendered); hermes-control-panel/page.tsx:127-130 renders them in ok-green and :93-98/:123 headline '4/4 hardenings on', with zero 'design target (not live)' disclosure anywhere in the page dir (grep exit 1). Register item H5 exists verbatim at .spm/2026-07-15-ship-readiness-register.md:67-68 demanding exactly this relabel; Wave A part 2 (26c46586/#849) shipped only 

**P1.3 · BREAK · nexus-runner harness → /api/agents/runner/release (cc_tasks lifecycle)**
runner.mjs never checks the HTTP status of any of its three release calls, so a 429/401/5xx on release leaves the task permanently stuck in status='running' with the claim held while the runner logs success and moves on — and with PR #856 unmerged, the 'ai' 5-req/min tier on /api/agents/* makes a 429 on release near-deterministic for any task that finishes within the rate window (heartbeat + claim + claimed-emit + started-emit + draft_pr_opened-emit already consume 5 slots from one IP).
Evidence: scripts/nexus-runner/runner.mjs:150-156, 159-164, 168-173 — `await api('/api/agents/runner/release', …)` result discarded, no status check, no retry; contrast claim handling at runner.mjs:190-197 which does check. Interacts with rate-limit.ts:98 (`pathname.startsWith('/api/agent')` → 'ai' tier) and the shared per-IP bucket key at rate-limit.ts:171 (`${ip}:${tier}`). proxy.ts:91-106 returns the 429. releaseClaimedTask guard (runner-claim.ts:151-157) means the stuck row can never be released later
Verify: CONFIRMED with corrections. Core defect verified: scripts/nexus-runner/runner.mjs:150-155, 159-164, 168-173 all discard the release call's HTTP status and log done/requeued/failed unconditionally, while the claim path (runner.mjs:189-197) does check status — so a 429/401/5xx on release strands the cc_tasks row in status='running' with the claim held while the runner logs success. Rate-limit interaction verified: rate-limit.ts:98 startsWith('/api/agent') → 'ai' tier at 5/min (TIER_LIMITS, rate-li

**P1.4 · BREAK · Command deck home — 1-2-3 guided steps (CommandSteps)**
All three founder-facing step cards are silent no-ops: they open a '#system-detail' <details> and scroll to targets 'idea-intake', 'task-queue', 'in-progress-prs', none of which exist on the main command-centre page after the UNI-2378 tile relocation ('task-queue'/'in-progress-prs' ids now live only on /founder/command-centre/operations; 'idea-intake' and 'system-detail' exist nowhere in src). Copy still promises 'Click any step to jump straight to it' and references a 'System detail' section that no longer exists.
Evidence: apps/web/src/app/(founder)/founder/command-centre/CommandSteps.tsx:23-35,44,62 (targets + goToStep null-safe no-op + stale copy); grep -rn 'system-detail'/'id="idea-intake"' across src returned nothing (exit 1); the ids 'task-queue' (operations/page.tsx:94) and 'in-progress-prs' (operations/page.tsx:228) render only on the operations sub-route; main page.tsx ids are command-brief/vital-signs/portfolio/capability-bus only (page.tsx:162,181,208,235)
Verify: Reproduced all cited evidence in the read-only tree. (1) CommandSteps.tsx:22-26 hardcodes targets 'idea-intake', 'task-queue', 'in-progress-prs'; goToStep (lines 28-35) does getElementById('system-detail') then getElementById(target)?.scrollIntoView — both null-safe, so a miss is a silent no-op. (2) grep across apps/web/src confirms no element anywhere renders id="idea-intake" or id="system-detail" (only comments in IdeaConsole.tsx/lib mention 'idea-intake' as a concept); id="task-queue" and id=

### P2 (30)

**UX-DEBT**
- /founder/boardroom (MeetingCard) — 'Mark as Acted' and the new→reviewing status PATCH are fire-and-forget: no res.ok check and no catch, so the UI flips status even when the server rejects; status silently reverts on reload and a network throw is an unhandled rejection (`apps/web/src/components/founder/boardroom/MeetingCard.tsx:165`)
- /founder/strategy (Deep Analysis tab) — analyze() wraps the primary 'Analyse with Opus' / pipeline call in try…finally with no catch — a thrown fetch (network failure) shows no error message; the button silently does nothing and the rejection is unhandled (`apps/web/src/components/founder/strategy/StrategyRoomClient.tsx:123`)
- Topbar notification bell (all founder pages) — Unread notification type label is styled color '#fff' inside the '#fffdf7' cream dropdown — white text on near-white background, unread item titles effectively invisible (`apps/web/src/components/founder/notifications/NotificationBell.tsx:232`)
- /founder/strategy (Insights board — Create Linear issue) — InsightIssueLink.submit uses try…finally with no catch — a network error is an unhandled rejection, no error message is set, and the form silently stays open (`apps/web/src/components/founder/strategy/InsightIssueLink.tsx:50`)
- /founder/strategy (Insight discussion) — Initial comments load swallows failure with .catch(() => {}) — a failed load is indistinguishable from 'no comments yet' (the Discussion section simply renders without any comments or error) (`apps/web/src/components/founder/strategy/InsightDiscussion.tsx:29`)
- /founder/boardroom (MeetingCard notes) — openMeeting notes load and submitNote both use try…finally without catch — a failed notes fetch or note POST gives no feedback (submitNote also drops a non-ok JSON response without message when d.note is absent) (`apps/web/src/components/founder/boardroom/MeetingCard.tsx:78`)
- Founder kanban board (/founder/kanban) — drag-to-move Linear issue — Optimistic drag move never checks res.ok on PATCH /api/linear/issues — a 4xx/5xx response leaves the card rendered in the new column as if synced to Linear (catch only fires on network throw), a dishonest synced state that persists until reload. (`apps/web/src/components/founder/kanban/KanbanBoard.tsx:188`)
- Founder bookkeeper > Reconciliation tab — reconcile/approve actions — Optimistic reconcile/approve/bulk-approve roll back correctly on failure (res.ok IS checked) but silently — the row flips to reconciled then flips back with no error message or toast, so a founder can believe an approval stuck when it did not. (`apps/web/src/components/founder/bookkeeper/tabs/ReconciliationTab.tsx:111`)
- QueueBoard session panel × Nexus runner (#853 interaction) — H1 shipped but is a hardcoded ternary: every 'running' session renders 'waiting for runner — none connected' with no code path that reverts once the #853 runner arms and actually claims tasks — the moment AGENT_EVENTS_SECRET is armed and the runner claims, cc_tasks go status='running' (real execution) while the session panel still asserts no runner is connected: honesty inverts into a new false state. The in-code comment admits the revert is manual future work. (`apps/web/src/app/(founder)/founder/command-centre/QueueBoard.tsx:517`)
- Founder revenue KPI (H6) — H6 still-open as register said, with partial mitigation already in the tree: source:'xero'|'mock' flows end-to-end and KPICard renders a Live badge for xero (else falls to a non-Live branch), but the Xero client silently substitutes hardcoded mock revenue figures whenever creds/token are absent (getMockRevenueMTD fallback at two sites) and no test asserts the mock boundary end-to-end — the register's 'assert source:mock end-to-end' hardening has not shipped. (`apps/web/src/lib/integrations/xero/client.ts:331`)
- Contacts table — row actions — Edit/Delete buttons are opacity-0 and revealed only on row hover (group-hover:opacity-100) with no focus-within or touch fallback: keyboard users tab onto invisible buttons, and on touch devices (no hover) Edit/Delete are effectively unreachable from the list. (`apps/web/src/components/founder/contacts/ContactsTable.tsx:99`)
- Contacts — filtered empty state — When search/status filter matches zero rows but contacts exist, the table renders 'No contacts yet' — misleading copy (there ARE contacts) and no 'no matches for this search' state; inconsistent with the page-level EmptyState copy used for a genuinely empty CRM. (`apps/web/src/components/founder/contacts/ContactsTable.tsx:30`)
- Contacts — add/edit modal (ContactFormModal) — Primary CRM create/edit modal has no dialog semantics or keyboard support: no role="dialog"/aria-modal, no Escape-to-close, no focus trap, no initial focus — backdrop click is the only non-submit exit; background page remains fully reachable to keyboard and screen readers. (`apps/web/src/components/founder/contacts/ContactFormModal.tsx:80`)
- Command palette (⌘K) — Result rows are plain divs with onClick carrying aria-selected without role="option"/role="listbox" (invalid ARIA), are not focusable, there is no aria-activedescendant wiring, and the dialog has no focus trap — Tab escapes behind the modal; arrow-key nav works only while focus stays in the input. Screen-reader and keyboard semantics fall well below the founder-grade bar for the deck's flagship interaction. (`apps/web/src/app/(founder)/founder/command-centre/CommandPalette.tsx:168`)
- Task Queue / approvals board (QueueBoard) — narrow viewports — The founder's primary decision surface has no responsive handling: .rowTop is flex with no flex-wrap and .rowActions is flex-shrink:0 holding up to 5 buttons (Validation/Sessions/Approve/Defer/Reject), so on narrow screens the action row crushes the task title or overflows the panel; queue-board.module.css contains zero @media rules. (`apps/web/src/app/(founder)/founder/command-centre/queue-board.module.css:160`)

**DATA-GAP**
- /founder/invoices — Page promises 'Create and manage sales invoices across your Xero accounts' but the business selector hardcodes only dr/nrpg/carsi/ccw — Unite-Group (parent), RestoreAssist, ATO and Synthex, all connectable on /founder/xero, cannot be invoiced from this surface (`apps/web/src/components/founder/invoices/InvoicesClient.tsx:8`)
- Opportunities (P1) — P1 still-open, register-accurate: zero insert/upsert sites for crm_opportunities anywhere in src/ or scripts/ — reads only (route GET, portfolio page, pipeline board). No writer, no 'New opportunity' UI, no lead conversion. (`apps/web/src/app/api/founder/opportunities/route.ts:98`)
- Founder chat (P6) — P6 still-open, register-accurate: /api/founder/chat has zero persistence — no from(), no insert of threads or messages; a refresh still wipes the founder's chat. (`apps/web/src/app/api/founder/chat/route.ts:1`)
- Social analytics fetchers (P8) — P8 still-open, register-accurate: TikTok and YouTube analytics fetchers remain stubbed 'return []' with an in-code comment naming the missing API integrations. (`apps/web/src/lib/integrations/social/analytics.ts:261`)
- Cost plane (register §2 Class-F discrepancy) — The register's honestly-flagged discrepancy is still live and unresolved: COST_FETCHERS is still an empty array while the cost-ingest cron IS scheduled — the cron fires and returns early with zero fetchers, so the UNI-2373 map's 'first metering ingest 01:30 15/07' claim still cannot have come through this pipeline; flipping F4 env alone lights nothing. (`apps/web/src/lib/metering/fetchers/registry.ts:31`)

**OVER-CLAIMED**
- Founder command-centre > Hermes Control Panel sub-console (/founder/command-centre/hermes-control-panel) — Security & version posture — H5 register item verified UNCHANGED: security-posture values are compile-time string literals ('on' x4, 'adopted') in a static registry, rendered in green as live agent status ('Secret redaction: on', stats line '4/4 hardenings on') with no probe of the actual Hermes install and no per-section provenance badge; the only mitigation is the page-level 'Read-only foundation' banner. (`apps/web/src/lib/operator-gateway/control-panel.ts:66`)
- Register P9 — pi-ceo-weekly-review cron — Register P9 grades this AMBER-env ('pipelines fully built, needs first run') but the pipeline is NOT schedulable: /api/cron/pi-ceo-weekly-review is registered in neither vercel.json crons nor any workflow, despite its own header claiming 'runs Sunday 20:00 UTC'. It can never first-run; this is a code gap (missing vercel.json entry), not an env gap — register line OVER-CLAIMED. (ceo-board-meeting half of P9 IS scheduled: vercel.json:72.) (`apps/web/vercel.json:1`)
- Linear board hygiene — UNI-2373 NorthStar marked Done — UNI-2373 ('every founder-CRM section GREEN in production') is status Done since 15/07 while its destination is demonstrably unmet (two child grills open, F1-F7 flips pending, cc_agent_events/cc_tasks_claim migrations unapplied) and unlike sibling map UNI-2379 which stays Todo until its exit artifact — a board reader sees NorthStar as achieved; this is the exact pattern UNI-2239's '201 unverified Done tickets' ledger tracks. (`n/a`)

**BREAK**
- Runner claim/release + agent-events ingest × middleware rate-limit (tracked #856 interaction) — The two NEW #853 routes (/api/agents/runner/claim, /api/agents/runner/release) and the #852 ingest (/api/agents/events) all fall inside the tracked #856 defect's blast radius: classifyTier matches pathname.startsWith('/api/agent') so the whole runner plane shares the 'ai' tier at 5 req/min per IP — one machine polling (60s), emitting event batches and releasing can exceed 5/min and 429, starving the runner loop the day the plane is armed. Dark today (secret unset → 401), but #856 must merge before arming. (`apps/web/src/lib/middleware/rate-limit.ts:98`)
- middleware auth seam — /api/agents/* reachability — The sessionless runner plane /api/agents/* is only reachable because the PUBLIC_PATHS entry '/api/agent' (added for the public site-chat agent, UNI-2359) prefix-matches it via startsWith — there is no explicit '/api/agents' public-path entry, so the runner plane's reachability rests on the exact same accidental prefix collision that PR #856 is fixing in the rate limiter; tightening the site-chat path (the natural companion fix to #856) would 307-redirect every cookie-less runner POST to /auth/login and silently brick the plane. (`apps/web/src/proxy.ts:63`)
- founder queue UI ↔ runner claim plane (two writers on cc_tasks) — Founder PATCH /api/command-centre/queue/[id] accepts all 7 statuses including 'queued' and 'running' but writes only {status}, never touching claimed_by/claimed_at — a founder setting 'running' from the UI creates a claimant-less running row that no runner can claim or release (release requires claimed_by = runnerId), and re-queueing a genuinely-running task races the still-executing runner and leaves stale claim columns; the two merged planes have different state models over the same table with no reconciliation. (`apps/web/src/app/api/command-centre/queue/[id]/route.ts:85`)

**ASKED-NOT-BUILT**
- Command-centre — Business-360 + agent-topology panels — Founder-asked business-360 and agent-topology visual panels (UNI-2287, High, 'for NorthStar all-GREEN') are not built: required libs @visx/@xyflow are absent from apps/web dependencies and no panel components exist, while parent NorthStar UNI-2373 is already marked Done. (`apps/web/package.json`)
- Mission Station — graphs/3D/voice command console — Founder's 11/06 ask 'Mission Station: visual command console (graphs/3D/voice, minimal text)' (UNI-2133) has never been scheduled or built; the UNI-2378 map explicitly parks it as unresolved fog ('Mission Station 3D/voice ambition — in or parked') and the UNI-2339 grill NO-GO'd voice/3D 'UNI-2133 separate' — so the ask has no owner on any active ticket. (`n/a`)
- Mission Control calm cockpit — Wave 2 (section ranking + parked line) — Wave 2 of the founder's Urgent 'calm cockpit' overhaul is stalled: both gating HITL grills — UNI-2376 (rank daily-use sections) and UNI-2377 (draw the comprehensive/parked line) — sit in Backlog with ZERO comments since 14/07, so 'every section GREEN' remains unbounded and the GREEN-hardening order undecided. Founder-blocked (live grill-me required), not agent-buildable. (`n/a`)
- /founder/social — social campaign composer UI — UNI-2288's 'mount or delete the unwired social campaign UI (1,709 lines dead code)' is still undone on today's main: SocialPageClient (which carries PostComposer + BrandPersonas) is imported by no route — only a test references it — and /founder/social/page.tsx renders platform connect-status only. (`apps/web/src/components/founder/social/SocialPageClient.tsx:1`)

### P3 (24)

**BREAK**
- POST /api/agents/runner/claim — Claim-leak edge: after a successful atomic claim (cc_tasks flipped to 'running'), a failure in appendTaskEvent (cc_task_events insert throws) returns 500 to the runner, which never learns it holds the claim — the row is stranded in 'running' with claimed_by set and no releaser, and requires manual status surgery to requeue. (`apps/web/src/app/api/agents/runner/claim/route.ts:70`)
- GET /api/command-centre/cost-allocation — Service-role client reads cost_source, cost_record (x2), and revenue_record with NO founder_id / business scoping on any query — bypasses the business_id→businesses.founder_id RLS the migration built and violates the repo hard rule that every query scopes founder explicitly; mitigated only by single-tenant + auth_allowlist signup gate. (`apps/web/src/app/api/command-centre/cost-allocation/route.ts:55`)

**DARK-BY-DESIGN**
- Runner plane armed-before-migration behaviour (cc_agent_events / cc_tasks_claim) — Dormant posture is honest today (AGENT_EVENTS_SECRET unset ⇒ 401 before any DB work on all three routes), but if the founder arms the secret BEFORE pushing the two founder-gated migrations, events ingest 500s on missing cc_agent_events (42P01 → generic 500) and claim 500s on missing claimed_by column (42703 → generic 500) instead of an honest not_connected — unlike the read-side wall accessor which maps 42P01 to source:'not_connected'. (`apps/web/src/app/api/agents/events/route.ts:84`)
- Founder dashboard KPI cards + Coach briefs — Xero revenue mock boundary — H6 register item verified HONEST in current state: fabricated MTD revenue figures (e.g. dr $24,750) flow to founder UI only behind an explicit source discriminator — KPICard renders a 'Demo' badge for source:'mock' and an 'Error' state on thrown fetch; CoachBriefs maps source 'mock' to a 'seed' SourceBadge. Residual: mock rows stamp lastUpdated = new Date() so demo data always looks fresh, and mock dollar figures still feed coach LLM prose (badge-covered). (`apps/web/src/lib/integrations/xero/client.ts:103`)

**DATA-GAP**
- 4 tables read/written by routes with NO migration in apps/web (telegram_messages, video_production_queue, agent_actions, agent_executions) — Four tables referenced by live routes have no migration anywhere under supabase/migrations — all four call sites were verified to degrade honestly rather than 500 (42P01 → not_connected / 501 / logged-and-continue / metrics-omitted), and each carries a TODO(convergence) marker, so this is a documented convergence data gap, not a break. (`apps/web/src/app/api/telegram/feed/route.ts:36`)
- src/lib/supabase/server.ts getUserWithRole() → profiles table — getUserWithRole() queries a 'profiles' table that no migration creates (and no prod table is expected), returning role 'CLIENT' after logging an error — but the function is dead code: no API route or page imports it (only its own test), so it is unreachable debt rather than a live gap. (`apps/web/src/lib/supabase/server.ts:197`)
- env registry — AGENT_EVENTS_SECRET — AGENT_EVENTS_SECRET — the single arming secret for the entire runner plane, referenced by all three new /api/agents routes — is absent from apps/web/.env.example (and vercel.json/turbo.json), while FOUNDER_USER_ID and every comparable secret (CRON_SECRET, webhook secrets) are documented there; the repo's own validation-gate convention treats .env.example as the env registry, so the arming step is discoverable only via scripts/nexus-runner/README.md. (`apps/web/.env.example:61`)

**OVER-CLAIMED**
- GET /api/health/connectors — connector vital-signs endpoint (founder-auth) — Obsidian/Vault connector is hardcoded configured:true + oauthConnected:true with comment 'Always available (local file system)' — false on Vercel prod where no local vault filesystem exists; it inflates the connected-count summary. No founder UI consumer found (API-only surface), which caps severity. (`apps/web/src/app/api/health/connectors/route.ts:149`)
- Register P4 — experiment_results — Register's '[VERIFIED] zero insert sites' for experiment_results is factually wrong: a founder-facing manual upsert has existed since the convergence commit (POST /api/experiments/[id]/results upserts rows on (variant_id, period_date)). The substantive gap the register meant — automated ingestion FROM platform_analytics — is confirmed still missing (no code path bridges platform_analytics → experiment_results), so P4 remains open, but the register's zero-writers verification over-claimed. (`apps/web/src/app/api/experiments/[id]/results/route.ts:179`)
- Matrix wall — Realtime claimed but not built — The cc_agent_events migration adds the table to the supabase_realtime publication 'so the wall's postgres_changes subscription receives its rows' and the ingest route says events land 'for the wall to render over Realtime', but the shipped B2 wall is a static server-component fetch (loadAgentEventsWall in operations/page.tsx) — no Realtime subscription to cc_agent_events exists anywhere in src, so the wall only updates on page load and the publication grant is dead weight. (`apps/web/supabase/migrations/20260715050000_cc_agent_events.sql:59`)

**UX-DEBT**
- Founder command-centre > Visual Campaign Studio (/founder/command-centre/studio) — H9 register item verified UNCHANGED: studio route still styled in the retired 'Scientific Luxury' OLED palette (bg #050505, cyan #00F5FF accents) instead of the ratified command-deck token register (apps/web/CLAUDE.md declares that palette retired on the deck). Behaviour itself is honest (not_connected + per-error surfacing at StudioClient.tsx:55-67). (`apps/web/src/app/(founder)/founder/command-centre/studio/StudioClient.tsx:76`)
- Founder strategy room (/founder/strategy) — research pipeline progress phases — Phase indicator 'researching' → 'analysing' is flipped by an 8-second setTimeout, not by actual pipeline state — a time-based fabricated progress signal (final output/errors are surfaced honestly, so impact is cosmetic). (`apps/web/src/components/founder/strategy/StrategyRoomClient.tsx:92`)
- Studio (/founder/command-centre/studio) — H9 — H9 still-open: StudioClient hardcodes the retired OLED register — bg-[#050505] ground and #00F5FF cyan accents — off the Daylight token system entirely. (`apps/web/src/app/(founder)/founder/command-centre/studio/StudioClient.tsx:76`)
- runner lifecycle-event taxonomy — duplicate implementations — buildRunnerStatusEvent/buildRunnerHeartbeat exported from runner-claim.ts have zero non-test consumers — the actual runner re-implements the identical UNI-2384 event shapes in plain JS (statusEvent/heartbeat in runner.mjs), so the taxonomy exists in two unlinked copies (built in separate worktrees, PR #853 vs #854 lineage) that can silently drift; the wall's verb rendering (agent-events-wall.ts eventVerb + AgentEventsWallTile VERB_COLOURS, which already lacks the 'claimed' verb) depends on the .mjs copy, not the exported TS builders. (`apps/web/src/lib/command-centre/runner-claim.ts:176`)
- Command-centre Studio route — Studio still ships the retired 'Scientific Luxury' register (OLED #050505 ground, #00F5FF cyan borders) that apps/web/CLAUDE.md declares retired in favour of the ratified Gun Metal + green deck register, making it visually alien to every sibling command-centre route; it also lacks the '← Command deck' back link every other sub-deck carries (global FounderShell sidebar is the only way back), including its no-taskId fallback screen. (`apps/web/src/app/(founder)/founder/command-centre/studio/StudioClient.tsx:78`)
- Operations deck — consolidated cc-* panels vs glass tiles — Four panels consolidated from the retired US command-center (LiveAgentOperationsMap, ActivityFeedPanel, DailyCrmDigestPanel, HermesControlPanel) render as bare full-bleed sections with their own internal headers while every sibling tile on the same page gets the glassSectionHead + glassPanel chrome — two visibly different section rhythms on one founder page. (Colour tokens ARE bridged — --cc-* aliases to deck tokens — so this is layout/chrome inconsistency only.) (`apps/web/src/app/(founder)/founder/command-centre/operations/page.tsx:119`)
- Daily CRM Digest panel (operations deck) — Duplicated chrome inside the disclosure: the DeckDetails summary row shows title 'Daily CRM Digest' + SourceBadge, then the expanded body repeats the same h2 title and the same SourceBadge again (plus an extra 'Command Center' eyebrow) — the founder sees the identical title/badge twice within one tile. (`apps/web/src/components/command-centre/digest/DailyCrmDigestPanel.tsx:150`)
- Command-centre sub-route error boundaries — Route error.tsx renders the raw error.message plus an unstyled native <button> on the otherwise fully token-styled deck — off-register recovery surface; in dev/client errors the raw message is founder-visible (Next.js redacts server-component messages in prod, so exposure is limited, but the unstyled fallback remains). (`apps/web/src/app/(founder)/founder/command-centre/operations/error.tsx:6`)
- Agent Events Wall tile (operations deck, new B2 surface) — The events table (width:100% with whiteSpace:'nowrap' on the 'when' column and unconstrained agent/target text) has no overflow-x wrapper, so on narrow viewports rows can overflow the glass panel horizontally; sibling data tiles cap or wrap their content. (`apps/web/src/app/(founder)/founder/command-centre/AgentEventsWallTile.tsx:80`)
- Command deck home — heading hierarchy — Two h1 elements on one page: HeroBand's 'Morning, Phill' h1 and CommandSteps' 'Tell it what you need' h1 — duplicate top-level headings break the document outline for assistive tech and read as two competing hero moments on the calm cockpit. (`apps/web/src/app/(founder)/founder/command-centre/CommandSteps.tsx:43`)
- Contacts surfaces — colour tokens — Hardcoded hex colours (#16a34a/#15803d action green, per-status hex map, #ef4444 danger) are inlined across ContactsPageClient, ContactsTable, and EmptyState instead of the semantic design tokens the frontend rules mandate ('bg-brand-primary not bg-blue-500'), so contacts drift from any future token change and mix with var(--color-*) usage in the same files. (`apps/web/src/components/founder/contacts/ContactsTable.tsx:6`)

**ASKED-NOT-BUILT**
- Command-centre deck — mobile/small-screen posture — Mobile posture for the founder deck is a named founder-relevant fog item in BOTH map tickets (UNI-2373 and UNI-2378) and has never been specified, ticketed, or built — no ticket on the board owns it. (`n/a`)
- Founder Xero + Email settings — orphaned MFAGate/ImapConnectForm — UNI-2290's wire-or-delete for orphaned components is undone for MFAGate.tsx and ImapConnectForm.tsx — both still have zero importers on today's main (the ticket's Settings components ARE now imported, so the ticket scope is also partly stale). (`apps/web/src/components/founder/xero/MFAGate.tsx:1`)
- Control Panel shell — hexagon marks polish + Lighthouse acceptance — UNI-2339 residue: the founder-offered '30 custom hexagon marks' polish fast-follow never landed (ui/marks.tsx still has zero importers) and acceptance criterion ③ (Lighthouse TBT vs baseline) was closed as 'not formally measured'; the ticket also sits In Progress despite its own 09/07 comment declaring both slices Done — stale either way. (`apps/web/src/components/ui/marks.tsx:1`)

## 4. Register delta (15/07 register → today)

- **Shipped-verified**: all 8 Wave-A claims (H1–H4, H7, H8, P2, P7) — no over-claims.
- **Still open**: H5 (hermes security posture hardcoded 'on' — now P1.2 above), H6
  (partial: `source:'mock'` boundary holds, Live badge only for xero), H9 (studio still
  on the retired OLED palette), P1/P3/P4/P5/P6/P8 producers, F1–F7 founder flips.
- **Register corrections found**: P4's "[VERIFIED] zero insert sites" was wrong (a
  manual upsert exists at POST /api/experiments/results since convergence); P9's
  pi-ceo-weekly-review is graded AMBER-env but is **not schedulable** (registered in
  neither vercel.json nor any cron); the cost-plane discrepancy (empty `COST_FETCHERS`
  vs a scheduled cron) is still live and unresolved.
- **Board hygiene**: UNI-2373 (NorthStar "every founder section GREEN in production")
  is marked **Done** on Linear while its destination is demonstrably unmet — two child
  grills open, F1–F7 pending, dark migrations unpushed. Re-open or re-scope it.

## 5. NOT CHECKED (honestly)

- **Authenticated founder browser walk** — Chrome extension not connected to this
  background session; no screenshot evidence of the logged-in founder experience. The
  prod error log partially substitutes (it shows what happened when the founder last
  walked: denied at /founder/wiki).
- **Prod table row-states** (empty vs populated per surface) — read-only schema
  confirmed, data volumes not sampled.
- **Whether Google/Linear creds were rotated after 13/07** — error silence is not proof.

## 6. Ordered blocker backlog

**Binding blocker — B1: the prod credential/identity plane.** F1 identity flip (the
founder's own allow-list denial), dead `LINEAR_API_KEY`, dead Google OAuth tokens for
all six accounts (check the DB-first `platformOAuthCredential` shadow rows before
re-adding Vercel env — known trap), Xero unconnected. It gates: wiki, contacts feeds,
email triage, calendar, kanban Linear projection, invoices/bookkeeper/revenue KPI,
board crons. Owner: founder (minutes, per register F1–F7) + one agent pass to purge
stale DB credential rows.

- **B2**: Runner release robustness (P1.3) + #856/#857 merges — must land BEFORE the
  UNI-2385 arming sitting, or the first armed run strands tasks in `running` and
  429-drops its own lifecycle events. Owner: agent (S). #856 merge directive: founder.
- **B3**: CEO Board cron JSON fatal (still firing) + Anthropic 429s — parse-repair the
  LLM output and put the cron on budget. Owner: agent (S).
- **B4**: Command deck 1-2-3 no-op steps (P1.4) + boardroom dishonest-empty (P1.1) +
  H5 posture relabel (P1.2) — the founder's first-screen trust surfaces. Owner: agent (S–M, one PR).
- **B5**: The P2 producer/DATA-GAP set (opportunities writer, founder-chat persistence,
  analytics fetchers, cost fetchers, invoices business list) in founder-value order
  after B1 lands — building writers against feeds the founder can't see stays inverted
  leverage. Owner: agent (M each).
- **B6**: UX-debt sweep (a11y on contacts modal/palette/queue, notification-bell
  contrast, responsive queue/wall, studio palette, error-boundary styling) — one
  consolidated polish wave against the $2B bar. Owner: agent (M).

## 7. Verdict

**NOT-READY** (as a "done and complete" claim) · confidence high · 62/100.
GREEN definition held from the register: real founder-scoped data behind real auth with
honest states, verified live. Today the auth+honesty half is genuinely strong; the
data half is starved by B1 and the trust surfaces carry 4 P1s.

**Highest-leverage next move**: the founder's F1–F7 credential sitting (B1, minutes,
nothing else unlocks more), with B2's code fix landing in parallel so the arming
sitting that follows doesn't strand its first task.

Readiness verdict: NOT-READY. Next safe action: F1–F7 credential sitting + merge
directive for #856/#857, while the B2/B3/B4 fixes are built and PR'd.
