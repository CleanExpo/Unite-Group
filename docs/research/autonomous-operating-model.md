# Autonomous Operating Model — how the system runs FOR Phill, without Phill

**2026-06-30 · the answer to "is the architecture set up correctly, and why am I still driving?"**

> Premise correction (founder, 2026-06-30): the frustration is real and the diagnosis is
> right — the system has been *reactive* (Phill pushes an input → an agent does one lookup
> → waits for the next input). The fix is not to build more; it is to **wire the autonomous
> primitives that already exist** into a closed loop that pulls its own work, decides,
> executes, reports OUT, and learns — with Phill as **recipient + approver, not driver**.
> Every component named below was verified to exist this session (file evidence in §A).

## 1. Verdict on the architecture

**The primitives are ~80% already built in Pi-Dev-Ops (`~/Pi-CEO/Pi-Dev-Ops/skills/`, 118 skills, live-counted). The gap is WIRING + a model-cost overlay + a retrieval layer — an integration problem, not a greenfield build.** Sub-agents and teams are not yet composed into a self-running loop, and nothing routinely reports findings OUT to Phill. That single missing wire is why it feels like whack-a-mole.

## 2. The components that already exist (verified — see §A for descriptions read this session)

| Layer | Existing skill(s) | Role in the loop |
|---|---|---|
| **Intake (work without Phill)** | `email-listener`, `calendar-watcher`, `intent-parser` | Gmail/Calendar/Telegram events → classified intents → sessions. Work ENTERS without Phill pushing. |
| **Plan-ahead (anti-whack-a-mole)** | `forward-planner` ("plan 15+ moves ahead, set the win condition"), `leverage-audit` | Turns a goal into a multi-move plan so agents act ahead, not per-prompt. |
| **Decision (the Board)** | `ceo-mode`, `cto`, `cfo`, `cmo-growth`, `product-manager` (+ global `ceo-board` personas) | Deliberate priorities; produce executive judgement instead of asking Phill. |
| **Spec** | `define-spec` (PITER), `product-manager`, SPM | Chosen move → build-ready spec. |
| **Orchestrate** | `dispatcher-core` (state in `.harness/dispatcher_state.json`, kill-switch/crash-safe), `cross-tool-flow` (YAML over it), `agentic-loop` (self-correcting iteration to completion) | Spawn + sequence sub-agent teams; survive restarts. |
| **Execute (sub-agent teams)** | the division model (Build/Quality/Research/etc.) as skill-bundles; `agent-workflow` (ADWs), `afk-agent` (unattended + stop guards + notifications), `piter-framework` (Prompt/Intent/Trigger/Environment/Review) | The teams that do the work, unattended, with guards. |
| **Knowledge / retrieval** | `margot-bridge` (→ Margot Gemini deep-research MCP), `margot-sandcastle-bridge` (research finding → classify → draft Linear ticket → review), OKF wiki + memory + Supabase corpus | Agents RETRIEVE context instead of re-reasoning; Margot does deep async research. |
| **Gate (quality/safety)** | `agentic-review`, `qa-lead`, `opus-adversary`, `production-gate`, `kill-switch-binding` (`/panic` halts all roles in one cycle) | Nothing ships unreviewed; Phill can halt everything instantly. |
| **Report OUT to Phill** | `daily-6-pager` (Stripe-style exec brief from CFO+CMO+CTO+CS + Margot insight), Telegram | The proactive surfacing that's currently missing in practice. |
| **Learn (knowledge↑)** | `meta-curator` (reads `.harness/lessons.jsonl` weekly + merged-PR diffs → authors new SKILL.md drafts), the self-improvement loop (UNI-2211) | The system writes its own findings back as skills/memory. |

## 3. The closed loop (the operating model)

```
        ┌─────────────────────────── PHILL (recipient + approver, NOT driver) ───────────────────────────┐
        │  receives daily-6-pager + Margot findings → approves / redirects via Telegram                   │
        │  /panic (kill-switch-binding) halts everything in one cycle                                     │
        └───────────▲─────────────────────────────────────────────────────────────────────┬─────────────┘
                    │ reports OUT                                            approve/redirect│
   ┌────────────────┴───────────────────────────────────────────────────────────────────────▼───────────┐
   │ INTAKE (no Phill)         PLAN              DECIDE            SPEC           ORCHESTRATE                │
   │ email-listener     →  forward-planner  →  Board (ceo/cto/  → define-spec → dispatcher-core             │
   │ calendar-watcher      (15 moves +         cfo/cmo/PM +       /SPM           → sub-agent TEAMS           │
   │ Linear queue          win condition)      ceo-board)                          (skill-bundles,          │
   │ intent-parser                                                                 MODEL-ROUTED)            │
   │      ▲                                                                            │                    │
   │      │                                          ┌───────── RETRIEVE ◄────────────┤ (cheap/local model  │
   │      │                                          │  memory + OKF wiki + Supabase   │  + retrieved        │
   │      │                                          │  corpus + Margot deep-research  │  context)           │
   │      │                                          └─────────────────────────────────┤                    │
   │   LEARN ◄── meta-curator ◄── self-improvement loop ◄── GATE (agentic-review →      ▼                    │
   │   (writes findings back        (UNI-2211: lessons         qa-lead → opus-adversary → production-gate)   │
   │    → richer next retrieval)     → corpus → skills)                                                      │
   └────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Phill's role inverts:** today he is the intake AND the orchestrator. In this model he is only the **approver of high-stakes decisions and the recipient of the brief**. Everything reversible runs without him (per the standing autonomy directive); only destructive/irreversible/scope-changing items escalate.

## 4. The retrieval method that reduces cost AND enhances knowledge (the "locked" answer)

This is the specific thing requested — and it is a **flywheel**, not a feature:

1. **Retrieve, don't re-reason (cost ↓).** A cheap/free/local model + *precise retrieved context* (pulled from the OKF wiki + memory + Supabase corpus + Margot's prior deep-research, via `margot-bridge`) beats an expensive model reasoning from a blank slate. You pay for a cheap retrieval + a cheap generation, not for an expensive model re-deriving what the corpus already knows. The Tier-0 lane (free OpenRouter / MiniMax-plan / local Ornith-9B) runs it.
2. **Write findings back (knowledge ↑).** Every completed task's output and lessons flow back into the same corpus via `meta-curator` + the self-improvement loop (UNI-2211). The corpus gets richer each cycle.
3. **The flywheel:** retrieve → act (cheap) → write back → next retrieval is richer → cheaper *and* smarter over time. Cost falls and knowledge compounds **in the same motion** — exactly the dual objective.

**Why this also fixes whack-a-mole:** `forward-planner` + the intake triggers mean the system generates its *own* next moves from the corpus and the queue, and `daily-6-pager` surfaces them to Phill. Phill stops being the source of every next step.

## 5. What is actually missing (the wiring backlog — small, not greenfield)

1. **Compose the loop**: connect intake-triggers → `dispatcher-core` → team spawn → gate → `daily-6-pager`, as one always-on flow (today the skills exist but run piecemeal, human-fired).
2. **Model-router overlay** (UNI-2212): make `claude-runtime`/`agentic-loop` router-aware so each team runs on the right-cost model (Tier-0 cheap/local for gathering, Claude for high-stakes). Enhance, don't replace.
3. **Retrieval layer**: stand up RAG over OKF wiki + memory + Supabase corpus (Margot is the research arm; this is the *retrieval* arm agents hit on every task) — and fix the broken corpus sync (UNI-2211) so write-back actually lands.
4. **Always-on trigger**: replace twice-weekly cron with event-driven + a cloud-resident scheduler so the loop survives the Mac sleeping (blueprint §8).
5. **The OUT channel**: wire `daily-6-pager` + Margot findings to fire to Phill on a cadence and on material events — the proactive surfacing that's the #1 felt gap.

## 6. Behaviour change I am adopting now (to stop being reactive)
- Run `forward-planner` discipline: surface the next N moves and the win condition, not one lookup per prompt.
- Report findings OUT proactively (this doc + the brief), rather than awaiting ingestion.
- Decide reversible things and act (autonomy directive), escalating only the genuinely founder-gated (e.g. the Max-token smoke test that needs a credential grant).

---

## §A. Evidence (read this session, `~/Pi-CEO/Pi-Dev-Ops/skills/`)
- `forward-planner` — "Research a project and plan 15+ moves ahead before building… Establishes the win condition (Definition of Done), reads the board (repo + PORTFOLIO registry + live…)".
- `afk-agent` — "Run agents unattended with stop guards and notifications."
- `piter-framework` — "5-pillar AFK agent setup - Prompt, Intent, Trigger, Environment, Review."
- `agent-workflow` — "ADWs - reusable workflow templates from trigger to deploy."
- `dispatcher-core` — "Cross-tool workflow primitive… state persisted to .harness/dispatcher_state.json so kill-switch + crashes…".
- `cross-tool-flow` — "Declarative YAML/JSON authoring surface over dispatcher-core… chain Linear, Gmail…".
- `agentic-loop` — "Infinite self-correcting iteration until completion criteria met."
- `intent-parser` — "Classify an inbound Telegram message into one of six intent types… route to the right role."
- `email-listener` — "Convert inbound Gmail messages into Pi-CEO sessions via webhook → intent-parser → orchestrator."
- `calendar-watcher` — "Convert calendar event creation/modification/deletion into Pi-CEO actions."
- `margot-bridge` — "Bridge from Pi-CEO orchestrator to Margot's standalone Gemini-powered research MCP server at ~/.margot/."
- `margot-sandcastle-bridge` — "After a Margot Deep Research finding completes, classify 'action-shaped vs informational'… draft a Linear ticket body, route through draft_revi[ew]".
- `meta-curator` — "Skill self-authoring agent. Reads .harness/lessons.jsonl (weekly) and merged-PR diffs (daily), proposes new SKILL.md drafts…".
- `daily-6-pager` — "Stripe-style daily executive brief assembled from CFO + CMO + CTO + CS snippets, the latest Margot deep-async insight…".
- `ceo-mode` / `cto` / `cfo` / `cmo-growth` / `product-manager` — the executive/Board layer (daily visibility + judgement).
- `define-spec` — "Spec writer… PITER classification, goals/non-goals, Given/When/Then acceptance criteria".
- `kill-switch-binding` — "Telegram /panic command + dashboard kill button. Halts every role… within one cycle."
- `leverage-audit` — "12 Leverage Points diagnostic for agent autonomy — with scoring rubrics."
- Note: `ceo-board` is the GLOBAL skill (`~/.claude/skills/ceo-board`), not in Pi-Dev-Ops; the Pi-Dev-Ops Board = ceo-mode/cto/cfo/cmo-growth/product-manager.
