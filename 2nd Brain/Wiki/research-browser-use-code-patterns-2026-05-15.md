---
type: wiki
updated: 2026-05-15
---

# Browser-Use code-pattern extraction (Magnus Mueller)

Code-level idioms only. Architecture/adoption decisions are locked in [[research-browser-use-org-2026-05-15]], [[board-deliberation-browser-use-org-2026-05-15]], [[research-browser-harness-pm-synthesis-2026-05-14]], [[board-deliberation-browser-harness-2026-05-14]]. This page is the deltas.

## 1. Headline

**Magnus's single durable idiom: a frozen ~600-1000 LOC core that exposes a flat helper namespace into a `globals()` REPL, and a sibling agent-editable file the harness imports last so the agent can amend its own runtime mid-task.** Five-line proof:

```python
# browser-harness/src/browser_harness/helpers.py:480-491
def _load_agent_helpers():
    p = AGENT_WORKSPACE / "agent_helpers.py"
    if not p.exists(): return
    spec = importlib.util.spec_from_file_location(...)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    for name, value in vars(module).items():
        if name.startswith("_"): continue
        globals()[name] = value          # ← agent-written code shadows core
_load_agent_helpers()
```

The 4-file core (`run.py`, `helpers.py`, `_ipc.py`, `daemon.py` + small `admin.py`) is **immutable for the agent**; everything task-specific is appended to `agent-workspace/agent_helpers.py`, which ships empty. This bifurcation — frozen primitives + agent-editable surface — applies *directly* to Pi-Dev-Ops/skills/, the Hermes dispatcher pin, and every retailer playbook in agent-shopping-safe-checkout.

## 2. The 6 repos deep-dived

| Repo | Stars | What it is | Single most-important code pattern |
|------|-------|------------|-------------------------------------|
| **browser-harness** | 13k | Self-healing CDP harness via running Chrome | Editable `agent_helpers.py` injected into `globals()` of the core `helpers.py` — `src/browser_harness/helpers.py:479-494` |
| **bubus** | 106 | Pydantic event bus, parent-event tracking | `BaseEvent[T_EventResultType]` generic with runtime + IDE type-enforcement on handler returns — `bubus/models.py:200-225` |
| **vibetest-use** | (n) | Multi-agent QA swarm exposed as MCP server | Semaphore-gated `asyncio.gather(return_exceptions=True)` over N Playwright sessions, `min(num_agents, 10)` cap — `vibetest/agents.py:~110-125` (per WebFetch) |
| **video-use** | 7.6k | Conversational video edits via 5 stand-alone helper CLIs | "Helpers live alongside SKILL.md, resolve paths relative to it" + post-render `timeline_view` self-verification before delivery — SKILL.md |
| **cdp-use** | 290 | Generated, type-safe CDP bindings | Pure protocol-generated TypedDicts; no manager layer — only `cdp.send.Domain.method(params)` — README + browser-harness's `cdp_use.client.CDPClient` consumer |
| **bux** | 327 | 24/7 Claude Code agent over Telegram | Frozen-core (`/opt/bux/repo`) vs editable user-context (`~/.claude/projects/.../memory/`) split + worktree-only repo edits — `agent/CLAUDE.md` |

All six honour the same surface-area discipline: one import line, one example call, no class hierarchy.

## 3. The pattern register

| # | Pattern | Where in Magnus's code | Where in our portfolio | Adoption cost |
|---|---------|------------------------|------------------------|---------------|
| P1 | **Frozen core + agent-editable sibling** | `browser-harness/src/browser_harness/helpers.py:479-494` (`_load_agent_helpers`) | `Pi-Dev-Ops/skills/` (router stable, editable per-skill MDs) + agent-shopping-safe-checkout retailer playbooks | Low — already partially in place via skills/index.md router |
| P2 | **Heredoc-driven REPL** as the public surface | `browser-harness/SKILL.md:16-22` (`browser-harness <<'PY' ... PY`) | Hermes dispatch — replace argparse-leaning CLIs with `<<'PY'` shells | Low — pattern fits ContextBot intake commands |
| P3 | **Pydantic generic events** `BaseEvent[T]` for typed handler returns | `bubus/bubus/models.py:200-225`, return validation at line ~252 | swarm/board/wiring.py (currently dict-payloads), Hermes intent events | Medium — Wave-1B pilot already locked |
| P4 | **Semaphore-gated `asyncio.gather(return_exceptions=True)`** for fan-out work | `vibetest-use/vibetest/agents.py:~110-125` | swarm dispatch (currently sequential), bulk SEO crawler, parallel-delegate skill | Low — drop-in replacement for ThreadPoolExecutor patterns |
| P5 | **Stale-PID-reuse-safe restart** via process-start-time fingerprint | `browser-harness/src/browser_harness/admin.py:14-60` (`_process_start_time`) | Hermes daemon supervisor, browser_keeper-style background services | Low when needed — keep in back pocket |
| P6 | **Atomic write via `.tmp` + `os.replace`** for state files | `browser-harness/src/browser_harness/_ipc.py:178-181` (port file) | Pilot bot Phase 2 state checkpoints, Hermes cron last-run file | Low — 3 lines |
| P7 | **One-paragraph docstrings carrying the "why-not"** above the API doc | `helpers.py:299-301` (`_mark_tab` 🐴), `helpers.py:60-62` (`_js_snippet`), `_ipc.py:32-39` (BU_NAME validator) | Every skill SKILL.md — "Gotchas (field-tested)" section is the trick | Low — write only when burned |
| P8 | **Compositor-default, framework-fallback** (try the cheapest API first) | `helpers.py:181-201` (`click_at_xy` before any DOM query); SKILL.md "Coordinate clicks default" | All BH-using portfolio tasks (Margot research, RA-2947 floor plan) | Already canonical |
| P9 | **Type-checked-but-narrow PIDs / IDs** — reject bool, 0, negatives, overflow | `_ipc.py:142-153` (`type(pid) is int and 0 < pid < (1<<31)`) | Linear ID handling, Stripe webhook event IDs, Supabase row ids in Hour-1 provisioner | Low — copy the 4-condition guard |
| P10 | **Env-loaded-once at module import** (`os.environ.setdefault`) | `helpers.py:18-35`, `daemon.py:11-29` | Hermes scripts (currently `getenv` scattered), Pi-CEO swarm | Low — drop one `_load_env()` |
| P11 | **Run-mode bifurcation by env flag** (`BH_DOMAIN_SKILLS=1`, `BU_AUTOSPAWN`) | `helpers.py:161-164`, `run.py:115-123` | ContextBot debug/preamble switch, autonomy-budget gates, board "voice-on/off" | Low — pattern, not code |
| P12 | **camelCase on the wire, snake_case in Python** documented explicitly | `helpers.py` + SKILL.md gotchas ("Browser Use API is camelCase on the wire") | Every Composio/Stripe boundary inside ATIA & Hermes | Low — one gotcha line per boundary file |
| P13 | **Module-level `from .helpers import *`** to flatten the surface | `run.py:26`, then `exec(code, globals())` | Skill substrate — flatten where the agent writes one-off Python | Medium — needs review per skill |
| P14 | **Pre-imported helper list in the skill prompt** so the agent doesn't `import` | SKILL.md "Tool call shape" + run.py:111-125 | All Unite-Group skill prompts (today most still tell agent which `import` to write) | Low — prompt edit |
| P15 | **Single-file MCP wrapper** around an already-working library | `vibetest-use/vibetest/mcp_server.py` (2.7KB shim) | RestoreAssist Hyperframes preview MCP, Margot research MCP | Low — proven template |
| P16 | **Helper-CLI-per-concern** (`transcribe.py`, `render.py`, `grade.py`, `timeline_view.py`, `pack_transcripts.py`) instead of one mega module | `video-use/helpers/` (5 files, 13-23KB each) | Pi-Dev-Ops/scripts/seo-*, Hermes routines | Already partial |
| P17 | **Self-verification pass before delivery** (`timeline_view` runs at every cut after render) | `video-use/SKILL.md` "The process" | qa-lead, brand-guardian — already directionally there; tighten via worked-example | Low — already the doctrine |
| P18 | **No retries framework / no manager layer / no config system** declared as design constraint | `browser-harness/SKILL.md:97-102` ("Design constraints") | DELETE candidates in skills cleanup Phase 2 (Hermes-supervisor wrappers, retries layers) | Medium — gated 2026-05-18 |
| P19 | **Path-traversal guard regex** for any caller-supplied identifier becoming a filesystem path | `_ipc.py:22` (`_NAME_RE = re.compile(r"\A[A-Za-z0-9_-]{1,64}\Z")`) + `_check()` | ContextBot client-slug intake → portal_content row; Hour-1 provisioner slug | Low — 1 regex + 1 assert |
| P20 | **Two-line `__init__.py`** exporting only the public dataclasses + service | `bubus/bubus/__init__.py` (14 lines), `browser-harness/__init__.py` (2 lines) | Every internal package in Pi-Dev-Ops (most currently re-export half the universe) | Medium — namespace audit needed |

## 4. Top 5 immediate wins (7-14 days)

1. **P3 — Pydantic generic events in swarm dispatch.** Target: `Pi-Dev-Ops/swarm/board/wiring.py`. Current: untyped dict payloads, runtime KeyError ~weekly. After: `class DispatchEvent(BaseEvent[DispatchResult])` with typed `event_result_type`. Effort: ~3h. Risk: medium (already in Wave-1B plan per [[pm-synthesis-browser-use-org-2026-05-15]]; honours [[feedback-substrate-change-discipline]] via shadow-run gate).
2. **P19 — Path-traversal regex on every client-slug surface.** Target: `swarm/inbox/provisioner.py`, ContextBot intake_router. Current: slugs flow straight to filesystem + Supabase row keys. After: `_NAME_RE = r"\A[a-z0-9-]{1,48}\Z"` + `_check()` at the boundary. Effort: 30min. Risk: low — single new client could already inject `../`.
3. **P11/P14 — Env-flagged debug + pre-imported helpers in `~/.claude/skills/`.** Target: high-traffic skills (`marketing-orchestrator`, `pm-core`, `video-director`). Current: each skill teaches the agent how to import. After: skill loader inlines the public helpers and exposes one toggle env var (`BH_DEBUG_CLICKS` is the reference shape). Effort: 2h. Risk: low.
4. **P4 — Semaphore-gated `gather(return_exceptions=True)` in `parallel-delegate`.** Target: `~/.claude/skills/parallel-delegate/`. Current: fires N Agent calls in one block, no error isolation. After: `asyncio.Semaphore(min(N, 10))` + `return_exceptions=True` + dict result per task. Effort: 1h. Risk: low — already the design intent.
5. **P6 — Atomic `.tmp` + `os.replace` for ContextBot intake checkpoint + Hermes last-run.** Target: `~/.hermes/state/*.json`. Current: open(... "w").write(json.dumps(...)) — half-written file kills the next cron. After: 3-line atomic-write helper. Effort: 30min. Risk: low — one boundary class to write, used everywhere.

All five are aligned to [[feedback-tight-code]] (none adds more than ~50 LOC), [[feedback-substrate-change-discipline]] (P3 has the shadow-run gate from the Wave-1B plan), and [[feedback-make-calls-not-questions]] (CEO does not need to ratify any of these — they are tightening, not direction).

## 5. The self-editing skill pattern (deep section)

**What makes it possible (browser-harness):**

```python
# helpers.py:479-491  — the loader
def _load_agent_helpers():
    p = AGENT_WORKSPACE / "agent_helpers.py"
    if not p.exists(): return
    spec = importlib.util.spec_from_file_location("browser_harness_agent_helpers", p)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for name, value in vars(module).items():
        if name.startswith("_"): continue
        globals()[name] = value
_load_agent_helpers()
```

```python
# run.py:111-125  — the runtime
ensure_daemon()
exec(code, globals())   # helpers + agent_helpers are already in globals
```

```python
# agent-workspace/agent_helpers.py  — ships empty by design
"""Agent-editable browser helpers.
Add task-specific browser primitives here."""
```

**The four constraints that make it safe:**
1. **Empty by default.** No starting code = no pre-existing semantics for the agent to corrupt.
2. **Underscore-prefix is skipped.** `_load_agent_helpers` cannot shadow itself; agent cannot accidentally rebind private names.
3. **Last-write-wins into the same `globals()`.** Agent helpers shadow core helpers — but the core ships well-tested, so the only thing the agent adds is *missing* surface.
4. **AGENT_WORKSPACE is path-overridable** (`BH_AGENT_WORKSPACE` env). Per-task isolation is one env var away. Cf. `helpers.py:13-15`.

**Where else this applies in our stack:**

- **agent-shopping-safe-checkout retailer skills** — current shape (one MD per retailer with declarative selectors) is already in spirit; missing piece is the agent-editable Python sibling for fingerprint-evading mutations. Adoption: low.
- **Pilot bot Phase 2** — Pilot's "suggestions every 30min" loop is exactly the surface where the agent should write its own `pilot_helpers.py` between runs (winning suggestion templates persist; losing ones get amended). The W1B sequencing in [[pm-synthesis-browser-use-org-2026-05-15]] is the right gate.
- **Pi-CEO swarm/board** — board personas should *not* have this pattern (they need stable doctrine). Wave-5+ specialist agents (sov-board, hour-1 provisioner) are the right target.
- **DO NOT apply to:** anything money-touching (Stripe milestone invoicing, Xero sync), anything regulatory (Hour-1 provisioner SLA at [[metric_hour1_provisioner_sla]]), anything CEO-strategy (Margot, board synthesis). Editable-runtime breaks audit trail.

**The constraint browser-harness teaches that we under-honour:** the *core* never changes shape. `run.py` is 129 lines, `_ipc.py` is 197 lines, both have been stable through 13k stars. Our equivalent files (Hermes dispatch, ContextBot router) drift week-by-week. Pin once, edit the sibling forever.

## 6. Anti-recommendations

1. **Don't copy bubus's `__await__` global-lock event-driving pattern** (`models.py:281-339`) — only sane inside an event-bus runtime, deadlocks anywhere else. Cite-only.
2. **Don't copy Magnus's `globals()` shadowing into web-facing code** — fine in a CLI REPL, catastrophic in long-lived Python services. Restrict to CLI-shaped tools.
3. **Don't reach for `cdp-use` as a public API.** Browser-harness's own SKILL.md says: "cdp-use is only for CDPClient.send_raw. Prefer raw CDP strings over typed wrappers." (`SKILL.md:99`). Stay one layer up.
4. **Don't import `bux`'s telegram_bot.py shape** (314KB single file). Magnus admits it himself — bux is a personal-rig, not a library. Per [[research-browser-use-org-2026-05-15]] verdict: study, don't adopt.
5. **Don't replace Hermes/Composio with bubus event bus.** Pattern (P3 — typed events at boundaries) is portable; the runtime is not. Already rejected by Board.

## 7. Cross-refs

- [[research-browser-harness-pm-synthesis-2026-05-14]] — adoption verdict on browser-harness
- [[board-deliberation-browser-harness-2026-05-14]] — Board PILOT-ONE constraints
- [[research-browser-use-org-2026-05-15]] — 43-repo org catalog
- [[board-deliberation-browser-use-org-2026-05-15]] — Wave-1 lock (vibetest-use + bubus)
- [[pm-synthesis-browser-use-org-2026-05-15]] — Wave-1/2/3 install order
- [[skills-architecture-audit-2026-05-15]] — Matt Pocock companion audit (sibling page in Audits)
- [[feedback-tight-code]] — all 5 wins respect plan caps
- [[feedback-substrate-change-discipline]] — P3 honours shadow-run + fork-private + rollback drill
- [[agency-bot-design-2026-05-14]] — Pilot Phase 2 is the right target for the self-editing pattern (Section 5)
- [[metric_hour1_provisioner_sla]] — explicit anti-target for self-editing (Section 5 last paragraph)
