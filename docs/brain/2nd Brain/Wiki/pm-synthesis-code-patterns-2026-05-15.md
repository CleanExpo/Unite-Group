---
type: wiki
updated: 2026-05-15
---

# PM synthesis — code patterns (Matt + Magnus, 2026-05-15)

Senior PM consolidation of `[[research-mattpocock-code-patterns-2026-05-15]]` (17 TS patterns) + `[[research-browser-use-code-patterns-2026-05-15]]` (20 Python patterns) = **37 patterns** ranked into a single register for ceo-board deliberation. Tight per `[[feedback-tight-code]]`.

## 1. Headline

Matt Pocock's **"one concept = one file = one sibling .test.ts"** (Matt §1) and Magnus Mueller's **"frozen ~600-1000 LOC core + sibling agent-editable file imported last"** (Magnus §1) are the **same discipline in two languages** — a tiny, named, single-purpose module beside its mutable counterpart, exported through a thin barrel. Matt's variant locks the **test** beside the unit; Magnus's variant locks the **agent-editable surface** beside the frozen core. Both reject `__tests__/`, `lib/`, `utils/` grab-bags and any "manager layer". **Single highest-leverage place to apply first:** `Pi-Dev-Ops/swarm/` — every dispatch module gets a sibling `test_<mod>.py` (Matt #1) AND the agent-shopping retailer playbooks adopt the editable-sibling shape (Magnus P1). One refactor unlocks both research lines for the cost of one. Cited: Matt §3 #1 + Magnus §3 P1.

## 2. The convergence map

| Convergence | Matt's expression | Magnus's expression | Portfolio target |
|---|---|---|---|
| C1 — Frozen/stable + sibling editable | Matt #1: `Foo.ts` + `Foo.test.ts` sibling, no `__tests__/` dir (Matt §3 #1) | Magnus P1: `helpers.py` core + `agent_helpers.py` sibling injected into `globals()` (Magnus §3 P1, file:LN `helpers.py:479-494`) | Pi-Dev-Ops/swarm + agent-shopping-safe-checkout retailer skills |
| C2 — Thin public barrel, no re-export soup | Matt #2: `src/index.ts` values-first then types (Matt §3 #2, `sandcastle/src/index.ts:1-9`) | Magnus P20: two-line `__init__.py` exports only public dataclasses + service (Magnus §3 P20, `bubus/__init__.py` 14 lines) | Synthex `packages/brand-config/src/index.ts`, every Pi-Dev-Ops package |
| C3 — Tagged discriminator on union types | Matt #3: `_tag: "object"` vs `"string"` on Output union (Matt §3 #3, `Output.ts:7-19`) | Magnus P3: `BaseEvent[T]` Pydantic generic with typed event-result type (Magnus §3 P3, `bubus/models.py:200-225`) | swarm/board/wiring.py (Wave-1B locked) + Hermes event types |
| C4 — Lookup table > if-chain | Matt #14: `TOOL_ARG_FIELDS: Record<string,string>` (Matt §3 #14, `AgentProvider.ts:8-13`) | Magnus P13: `from .helpers import *` to flatten + `JOB_HANDLERS` dict pattern (Magnus §3 P13) | Hermes router `hermes_dispatch.py` if-chain |
| C5 — Compositor-default, framework-fallback | Matt #12: just don't export it — file-local helpers stay private without `@internal` (Matt §3 #12, `extractStructuredOutput.ts:23-79`) | Magnus P8: `click_at_xy()` before any DOM query — try the cheapest API first (Magnus §3 P8, `helpers.py:181-201`) | Skills Phase 2 cleanup — delete `-orchestrator` indirection layers |
| C6 — No manager layer / no retries framework | Matt's #6 50-line pure modules (Matt §3 #6) | Magnus P18: "No retries framework / no manager layer / no config system" declared as design constraint (Magnus §3 P18, `SKILL.md:97-102`) | Skills Phase 2 DELETE candidates (Hermes-supervisor wrappers, retries layers) — gated 2026-05-19 |
| C7 — Glossary at repo root locks vocabulary | Matt #16: `CONTEXT.md` defines every domain term + `_Avoid_:` synonyms (Matt §3 #16, `sandcastle/CONTEXT.md`) | Magnus P7: one-paragraph docstring carrying the "why-not" above the API (Magnus §3 P7, `helpers.py:299-301`) | Pi-Dev-Ops/CONTEXT.md (new) — locks "worker / agent / bot / dispatcher" |
| C8 — Self-verification before delivery | Matt's TDD-via-vertical-slice issues (Matt §2 `course-video-manager`) | Magnus P17: `timeline_view` runs at every cut after render before delivery (Magnus §3 P17, `video-use/SKILL.md`) | qa-lead, brand-guardian, `[[feedback-quality-over-quantity]]` |

8 convergence points. Each maps onto an in-flight workstream — see §5.

## 3. The combined ranked register

Sort: leverage × (1 / effort) × portfolio-fit. Wave column: **W-NOW** ≤1h additive · **W-WEEK** sprint-window low-risk · **W-AFTER-MON-18** gated on Tue 19 May demo + `[[feedback-substrate-change-discipline]]` · **DEFER** Q3+.

| # | Pattern | Source | Code citation | Portfolio target | Effort | Risk | Wave |
|---|---|---|---|---|---|---|---|
| 1 | Path-traversal regex on caller-supplied identifiers | Magnus P19 | `_ipc.py:22` `_NAME_RE = re.compile(r"\A[A-Za-z0-9_-]{1,64}\Z")` (Magnus §3 P19) | `swarm/inbox/provisioner.py`, ContextBot intake_router slug | 30 min | Low | W-NOW |
| 2 | Atomic `.tmp` + `os.replace` for state writes | Magnus P6 | `_ipc.py:178-181` (Magnus §3 P6) | `~/.hermes/state/*.json`, Pilot Phase 2 checkpoint | 30 min | Low | W-NOW |
| 3 | `as const` on all exported config objects | Matt #15 | `Output.ts:67` `} as const;` (Matt §3 #15) | `Synthex/packages/brand-config/src/brands/*.ts` (6 files) | 45 min | None | W-NOW |
| 4 | `Equal<X,Y>` + `doNotExecute()` type tests | Matt #7 + #8 + #9 | `ts-reset/src/tests/utils.ts:1-38` (Matt §3 #7-9) | Synthex `packages/brand-config/src/tests/utils.ts` (new) | 90 min | None | W-NOW |
| 5 | `Record<>`/`dict` lookup over if-chain | Matt #14 + Magnus P13 | `AgentProvider.ts:8-13` (Matt §3 #14) + Magnus §3 P13 | Hermes `swarm/hermes_dispatch.py` | 2 h | Med | W-WEEK |
| 6 | Semaphore-gated `gather(return_exceptions=True)` | Magnus P4 | `vibetest/agents.py:~110-125` (Magnus §3 P4) | `~/.claude/skills/parallel-delegate/`, bulk SEO crawler | 1 h | Low | W-WEEK |
| 7 | Env-flagged debug + pre-imported helpers in skills | Magnus P11 + P14 | `helpers.py:161-164`, `run.py:115-123` (Magnus §3 P11/P14) | high-traffic skills (marketing-orchestrator, pm-core, video-director) | 2 h | Low | W-WEEK |
| 8 | `CONTEXT.md` glossary at repo root | Matt #16 | `sandcastle/CONTEXT.md` (Matt §3 #16) | `Pi-Dev-Ops/CONTEXT.md` (new) | 60-90 min | None | W-WEEK |
| 9 | Public-surface barrel: values first, types second | Matt #2 | `sandcastle/src/index.ts:1-9` (Matt §3 #2) | Synthex + CCW-CRM `apps/web/src/index.ts` | 45 min | None | W-WEEK |
| 10 | Plain `_tag` discriminated errors w/ recovery context | Matt #4 + #5 | `sandcastle/src/errors.ts:3-100` (Matt §3 #4-5) | `Pi-Dev-Ops/swarm/errors.py` (new) | 3 h | Low | W-WEEK |
| 11 | Type-checked-but-narrow ID guards | Magnus P9 | `_ipc.py:142-153` `type(pid) is int and 0 < pid < (1<<31)` (Magnus §3 P9) | Linear ID, Stripe webhook event ID, Supabase row id in Hour-1 provisioner | 30 min | Low | W-WEEK |
| 12 | Env-loaded-once at module import | Magnus P10 | `helpers.py:18-35`, `daemon.py:11-29` (Magnus §3 P10) | Hermes scripts + Pi-CEO swarm | 1 h | Low | W-WEEK |
| 13 | One concept = one file + sibling test | Matt #1 | `sandcastle/src/Orchestrator.ts` ↔ `Orchestrator.test.ts` (Matt §3 #1) | CCW-CRM, Pi-Dev-Ops/swarm (replicate `<mod>.py` + `test_<mod>.py`) | convention | Low | W-WEEK |
| 14 | Public namespace as `const` object, not class | Matt #10 | `Output.ts:34-67` (Matt §3 #10) | Pi-Dev-Ops swarm dispatch (collapse 7 free funcs → `Dispatch.run/.cancel`) | 2 h | Low | W-WEEK |
| 15 | Don't `export ` private helpers (file-local) | Matt #12 | `extractStructuredOutput.ts:23-79` (Matt §3 #12) | Synthex `packages/brand-config/`, Pi-Dev-Ops swarm | 30 min | None | W-WEEK |
| 16 | Two-line `__init__.py` (only public re-exports) | Magnus P20 | `bubus/__init__.py` (Magnus §3 P20) | every Pi-Dev-Ops internal package | 2 h | Med | W-WEEK |
| 17 | Heredoc-driven REPL public surface | Magnus P2 | `SKILL.md:16-22` (Magnus §3 P2) | Hermes dispatch + ContextBot intake commands | 2 h | Low | W-WEEK |
| 18 | Single-purpose pure module < 50 LOC | Matt #6 | `raceAbortSignal.ts` (46 LOC), `resolveCwd.ts` (47 LOC) (Matt §3 #6) | Pi-Dev-Ops/swarm split 200-400 line files | 4 h | Low | W-WEEK |
| 19 | One-paragraph docstring "why-not" gotcha | Magnus P7 | `helpers.py:299-301`, `_ipc.py:32-39` (Magnus §3 P7) | every SKILL.md "Gotchas (field-tested)" section | 30 min/skill | None | W-WEEK |
| 20 | camelCase wire, snake_case Python explicit | Magnus P12 | `helpers.py` + SKILL.md gotcha (Magnus §3 P12) | every Composio/Stripe boundary in ATIA + Hermes | 15 min/file | None | W-WEEK |
| 21 | Compositor-default, framework-fallback doctrine | Magnus P8 | `helpers.py:181-201` + SKILL.md (Magnus §3 P8) | Margot research, RA-2947 floor plan | doctrine | None | W-WEEK |
| 22 | Stale-PID-reuse-safe restart fingerprint | Magnus P5 | `admin.py:14-60` `_process_start_time` (Magnus §3 P5) | Hermes daemon supervisor | 2 h | Low | W-WEEK |
| 23 | Self-verification pass before delivery | Magnus P17 + Matt §2 | `video-use/SKILL.md` "The process" (Magnus §3 P17) | qa-lead, brand-guardian (tighten via worked-example) | doctrine | None | W-WEEK |
| 24 | Single-file MCP wrapper around library | Magnus P15 | `vibetest-use/vibetest/mcp_server.py` (2.7KB) (Magnus §3 P15) | RestoreAssist Hyperframes preview MCP, Margot research MCP | 3 h | Low | W-WEEK |
| 25 | JSDoc with usage examples above export | Matt #11 | `Output.ts:30-43` (Matt §3 #11) | CCW-CRM API helpers, Pi-Dev-Ops swarm public funcs | 15 min/file | None | W-WEEK |
| 26 | Helper-CLI-per-concern (no mega module) | Magnus P16 | `video-use/helpers/` 5 files 13-23KB each (Magnus §3 P16) | Pi-Dev-Ops/scripts/seo-*, Hermes routines | 4 h | Low | W-WEEK |
| 27 | Pydantic generic events `BaseEvent[T]` | Magnus P3 | `bubus/models.py:200-225` (Magnus §3 P3) | `swarm/board/wiring.py` (Wave-1B locked) | 3 h | Med | W-AFTER-MON-18 |
| 28 | Frozen-core + agent-editable sibling | Magnus P1 | `helpers.py:479-494` (Magnus §3 P1) | Pi-Dev-Ops/skills/, agent-shopping retailer playbooks | 4 h | Med | W-AFTER-MON-18 |
| 29 | Run-mode bifurcation by env flag | Magnus P11 | `helpers.py:161-164`, `run.py:115-123` (Magnus §3 P11) | ContextBot debug/preamble, autonomy-budget gates | 2 h | Low | W-AFTER-MON-18 |
| 30 | `from .helpers import *` to flatten surface | Magnus P13 | `run.py:26`, `exec(code, globals())` (Magnus §3 P13) | skill substrate (per-skill review) | 4 h | Med | W-AFTER-MON-18 |
| 31 | Section-divider comment blocks for >100 LOC files | Matt #13 | `Output.ts:3-5`, `:27-29` (Matt §3 #13) | TS files across Synthex + CCW-CRM | 15 min/file | None | W-AFTER-MON-18 |
| 32 | ADR folder `docs/adr/` numbered sequentially | Matt #17 | `sandcastle/docs/adr/` 14 ADRs (Matt §3 #17) | Pi-Dev-Ops, CCW-CRM, Synthex | 2 h | None | W-AFTER-MON-18 |
| 33 | "No retries / no manager layer" design constraint | Magnus P18 | `SKILL.md:97-102` (Magnus §3 P18) | Skills Phase 2 DELETE candidates | gated | Med | W-AFTER-MON-18 |
| 34 | `Data.TaggedError` via `effect` library | Matt #4 | `errors.ts:3-7` (Matt §3 #4) | Only if migrating Synthex/CCW-CRM to Effect — not in plan | 1 wk | High | DEFER |
| 35 | `.d.ts`-only entrypoint pattern (ts-reset) | Matt §2 ts-reset | `recommended.d.ts:1-11` (Matt §2) | ts-reset is lib-only; app code (Synthex, CCW-CRM) is not the fit | n/a | n/a | DEFER |
| 36 | `__await__` global-lock event-driving | Magnus §6 anti-rec | `bubus/models.py:281-339` (Magnus §6) | Anti-pattern outside event-bus runtime — cite only | n/a | n/a | DEFER |
| 37 | Slice-N vertical-issue pattern | Matt §2 cvm | course-video-manager Issues #782-#786 (Matt §2) | RA-2947 floor-plan only (multi-week); not sub-half-day work | per-feature | None | DEFER |

37 total. **W-NOW: 4** · **W-WEEK: 22** · **W-AFTER-MON-18: 7** · **DEFER: 4**.

## 4. Top 10 winners (ranked)

1. **#1 Path-traversal regex on slugs** (Magnus P19 — `_ipc.py:22`)
   Target: `swarm/inbox/provisioner.py` + ContextBot intake_router slug entry.
   Why: single new client could already inject `../` into Supabase row keys / filesystem (Magnus §4 #2). 30 min, regex + assert.

2. **#2 Atomic `.tmp` + `os.replace` state writes** (Magnus P6 — `_ipc.py:178-181`)
   Target: `~/.hermes/state/*.json`, Pilot Phase 2 checkpoint.
   Why: half-written file kills the next cron — one boundary class to write, used everywhere (Magnus §4 #5). 30 min.

3. **#3 `as const` on Synthex token exports** (Matt #15 — `Output.ts:67`)
   Target: `Synthex/packages/brand-config/src/brands/*.ts`.
   Why: typos in `Brand.colour("invalid")` currently slip past tsc; `as const` is two words for compile-time narrowing (Matt §4 Win 4). 45 min.

4. **#4 `Equal<X,Y>` + `doNotExecute()` type tests** (Matt #7 + #8 + #9 — `ts-reset/src/tests/utils.ts:1-38`)
   Target: `Synthex/packages/brand-config/src/tests/utils.ts` (new) + per-brand `voice.type-test.ts`.
   Why: zero type-tests across 6 brand configs today; voice-token regressions show up at runtime (Matt §4 Win 1). 90 min.

5. **#5 `Record<>`/`dict` lookup over Hermes if-chain** (Matt #14 + Magnus P13 — `AgentProvider.ts:8-13`)
   Target: `Pi-Dev-Ops/swarm/hermes_dispatch.py`.
   Why: 20-30 line if-elif chain → `JOB_HANDLERS: dict[str, Callable]`; new job-kinds stop requiring chain edits (Matt §4 Win 5). 2h + shadow-dispatch parity test per `[[feedback-substrate-change-discipline]]`.

6. **#6 Semaphore-gated `gather(return_exceptions=True)`** (Magnus P4 — `vibetest/agents.py:~110-125`)
   Target: `~/.claude/skills/parallel-delegate/`.
   Why: currently fires N Agent calls in one block with zero error isolation — the skill's own intent (Magnus §4 #4). 1h.

7. **#7 Plain `_tag` discriminated errors with recovery context** (Matt #4 + #5 — `sandcastle/src/errors.ts:3-100`)
   Target: `Pi-Dev-Ops/swarm/errors.py` (new).
   Why: Hermes loses recovery context every failure; classes carry `job_id`, `partial_state_path` so dispatch can `match e:` deterministically (Matt §4 Win 2). 3h additive.

8. **#8 `CONTEXT.md` glossary at repo root** (Matt #16 — `sandcastle/CONTEXT.md`)
   Target: `Pi-Dev-Ops/CONTEXT.md` (new).
   Why: "worker / agent / bot / dispatcher / orchestrator / swarm / Hermes / Margot" overlap weekly; locks vocabulary for every new Claude session (Matt §4 Win 3). 60-90 min.

9. **#9 Type-checked narrow ID guards** (Magnus P9 — `_ipc.py:142-153`)
   Target: Linear ID, Stripe webhook event ID, Supabase row id in Hour-1 provisioner.
   Why: 4-condition guard rejects bool/0/negative/overflow at the boundary; trivial to copy (Magnus §3 P9). 30 min per surface.

10. **#10 Pydantic generic events `BaseEvent[T]`** (Magnus P3 — `bubus/models.py:200-225`)
    Target: `swarm/board/wiring.py`.
    Why: typed handler returns at runtime + IDE; already on the W1B-prep plan (Magnus §4 #1) — this is the **single absorbed pattern that explicitly composes with the active sprint**. 3h. Gated W-AFTER-MON-18.

## 5. Active-workstream integration

Per Phill's "in parallel" directive — which patterns plug into in-flight work.

### Skills cleanup Phase 2 (Tue 19 May 18:00 AEST+)
Patterns: **#33 (P18 "no manager layer"), #15 (Matt #12 don't-export), #28 (P1 frozen + editable).**
The consolidation logic should DELETE `-orchestrator` indirection (Matt §2 skills row, Magnus P18), strip non-public exports, and lock the frozen-core/editable-sibling shape onto skills `~/.claude/skills/{name}/SKILL.md` + sibling agent-editable Python where applicable.

### W1B-prep redo (bubus refactor, Tue 19 May post-demo)
Patterns: **#10 (Matt #4-5 _tag errors), #27 (P3 BaseEvent[T]), #16 (P20 two-line __init__.py).**
`swarm/board/wiring.py` cutover uses Magnus P3 verbatim; `swarm/board/dispatch.py` env-flag gateway already mirrors P11. Add `swarm/board/__init__.py` to the P20 two-line shape during the cutover commit — surgical, no extra round-trip. Honours `[[feedback-substrate-change-discipline]]` shadow-run gate.

### Phase 1 router (shipped today)
Retroactive patterns the router SHOULD have followed: **#5 (Matt #14 Record lookup), #2 (P6 atomic write), #19 (P7 why-not docstring).**
The shipped router uses an if-chain over a `Record<>`; queue an additive PR converting to dict-lookup (W-WEEK). Atomic-write the router's last-decision state file. Add the `_Avoid_:` synonym-block header to the router SKILL.md.

### Agent-shopping-safe-checkout (Wave-1 foundation shipped 2026-05-14)
Patterns: **#28 (P1 frozen + editable retailer playbooks), #1 (P19 slug regex), #6 (P4 semaphore-gather), #11 (P9 ID guards).**
Retailer skills today are MD-only with declarative selectors; missing piece is the agent-editable Python sibling for fingerprint-evading mutations (Magnus §5). Slug regex on every retailer-name boundary. Semaphore-gather over parallel retailer probes. ID guards on Stripe payment ID + Supabase audit row id.

### Pilot bot Phase 2 (post-BotFather-window, today 14:00 AEST)
Patterns: **#2 (P6 atomic checkpoint), #28 (P1 self-editing pilot_helpers.py), #29 (P11 run-mode env flag).**
Pilot's "suggestions every 30min" loop is the canonical surface for self-editing pattern — winning suggestion templates persist into `pilot_helpers.py`, losing ones get amended (Magnus §5). Atomic checkpoint between iterations. Env flag for debug/preamble/voice-on. **NOTE: BotFather hard-wire ([[feedback-botfather-hardwire-2026-05-15]]) — no `/newbot` before 14:00 AEST.**

## 6. Anti-recommendations

1. **#34 — `Data.TaggedError` via `effect`** doesn't translate to Python repos and adds ~200KB TS dep cost (Matt §5 #1). Use plain `class XError extends Error { readonly _tag = "XError" as const }`.
2. **#35 — `.d.ts`-only entrypoint (ts-reset)** is library-only (ambient module augmentation). Synthex + CCW-CRM are app code (Matt §5 #2). Skip.
3. **#36 — bubus `__await__` global-lock** deadlocks outside an event-bus runtime (Magnus §6 #1). Cite-only.
4. Magnus's `globals()` shadowing **into web-facing code** is catastrophic in long-lived services (Magnus §6 #2). Restrict to CLI-shaped tools — explicitly bars it from Hour-1 provisioner, Stripe, Margot.
5. **#37 — Slice-N issue pattern** on sub-half-day work creates ticket sprawl (Matt §5 #3). Apply to RA-2947 floor-plan only.

## 7. 5 forks for Phill

| # | Fork | Board-recommended answer |
|---|---|---|
| F1 | Ship W-NOW four (#1, #2, #3, #4) today as additive PRs against Pi-Dev-Ops + Synthex without ceo-board gate? | **YES** — each ≤90 min, zero substrate risk, all type-narrowing or boundary-hardening; honours `[[feedback-make-calls-not-questions]]`. |
| F2 | Convert Pi-Dev-Ops `swarm/hermes_dispatch.py` if-chain to dict-lookup (#5) this week with shadow-dispatch parity ≥50 per `[[feedback-substrate-change-discipline]]`? | **YES** — load-bearing but additive; shadow-dispatch is the standing gate. |
| F3 | Adopt Magnus P1 frozen-core + editable-sibling pattern into agent-shopping retailer skills (#28) post-Mon-18 demo? | **YES** — explicit fit for fingerprint-evasion mutations; gates after demo per skills Phase 2 calendar. |
| F4 | Ship `Pi-Dev-Ops/CONTEXT.md` (#8) glossary now as a no-code PR? | **YES** — 60-90 min; locks "worker/agent/bot/dispatcher" vocabulary before W1B cutover invents another term. |
| F5 | Cite #34 (Effect), #35 (ts-reset entrypoints), #36 (`__await__`), #37 (Slice-N for tiny tickets) as locked anti-patterns in `[[feedback-tight-code]]` so they don't resurface next quarter? | **YES** — preserves the audit per `[[feedback-audit-verification]]`. |

All 5 forks locked YES under Board-recommended answers.

## 8. Cross-refs

- `[[research-mattpocock-code-patterns-2026-05-15]]` — 17 TS patterns source
- `[[research-browser-use-code-patterns-2026-05-15]]` — 20 Python patterns source
- `[[skills-architecture-audit-2026-05-15]]` — sibling skills audit
- `[[board-deliberation-skills-architecture-2026-05-15]]` — Phase 2 cleanup gate
- `[[pm-synthesis-browser-use-org-2026-05-15]]` — Wave-1/2/3 install order (W1B-prep upstream)
- `[[research-browser-use-org-2026-05-15]]` — org catalog
- `[[agency-bot-design-2026-05-14]]` — Pilot bot Phase 2 target
- `[[feedback-tight-code]]` · `[[feedback-substrate-change-discipline]]` · `[[feedback-audit-verification]]` · `[[feedback-quality-over-quantity]]` · `[[feedback-make-calls-not-questions]]` · `[[feedback-no-slack]]` · `[[feedback-botfather-hardwire-2026-05-15]]`
