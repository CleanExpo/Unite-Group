---
type: sketch
component: per-product-persona-template
status: draft
created: 2026-05-26
---

# Sketch 01 — Per-product persona module template

## Why this first

The RA-2026 Hermes blueprint Phase 2 needs 7 new persona modules: RestoreAssist, Disaster-Recovery, DR-NRPG, Synthex, Unite-Group, CARSI, ccw-crm. Each is ~200 lines of similar shape. If we get the **template** right once, we copy-paste 7x. If we get the template wrong, we have 7 modules to retrofit. **Highest leverage per minute of grilling.**

This sketch is for ONE template that all 7 personas instantiate. Not for any specific persona. Brand-essence content is OUT OF SCOPE here — that's `Personas/<product>.md`.

## Breadboard (Shape Up §Ch4 — flow problem)

**Places** (discrete states the persona module passes through):

```
[idle / awaiting cron]
    │ 6h cron fires
    ▼
[loading charter]                    ← reads Personas/<product>.md
    │
    ▼
[SCAN]                               ← LLM call: Gemma 4 via model_router
    │ produces signals[]
    ▼
[GAP classification]                 ← LLM call: Llama 3.3 via model_router
    │ produces gap_class + severity
    ▼
[PROPOSAL drafting]                  ← LLM call: Llama 3.3 via model_router
    │ produces Linear ticket payload
    ▼
[Brand Resonance audit]              ← calls external module (Phase 3)
    │ verdict: pass | rewrite | reject
    ▼
[Linear ticket creation]             ← writes to product's Linear team
    │
    ▼
[done — emit telemetry, log severity]
```

**Affordances** (the public API surface of one persona module):

- `class Persona` — the type
- `Persona.from_charter(path: str) -> Persona` — constructor
- `Persona.scan(now: datetime) -> list[Signal]` — fires the SCAN protocol
- `Persona.classify(signals: list[Signal]) -> list[Gap]` — fires GAP
- `Persona.propose(gap: Gap) -> LinearProposal` — fires PROPOSAL
- `Persona.run_cycle() -> CycleResult` — orchestrates scan → classify → propose for cron entry
- `Persona.brand_essence -> tuple[str, ...]` — read-only property

**Connection lines** (how data moves between modules):

- `Persona` ↔ `model_router` for all LLM calls (no direct Anthropic/OpenRouter SDK touch)
- `Persona` → `linear_tools.save_issue()` for output (no direct Linear SDK touch)
- `Persona` ← `app.server.discovery` for cron triggering (no own scheduler)
- `Persona` ← `Personas/<product>.md` for charter (frontmatter + body)
- `Persona` → `brand_resonance.audit_proposal()` (Phase 3, post-PROPOSAL gate)

## Words-not-pictures spec for ONE persona file

```
swarm/personas/<slug>.py    (~200 lines, no LLM SDKs imported)

  - dataclass Charter (loaded from Personas/<slug>.md frontmatter)
      brand_essence: tuple[str, ...]
      consumer_demand_signals: tuple[str, ...]
      linear_team_id: str
      linear_project_id: str | None
      scan_queries: tuple[str, ...]

  - dataclass Signal
      query: str
      raw_text: str
      captured_at: datetime
      source: str  # "perplexity" | "trends" | "reddit" | ...

  - dataclass Gap
      signal: Signal
      gap_class: Literal["strategic", "tactical", "demand", ...]
      severity: int  # 0-10
      rationale: str

  - dataclass LinearProposal
      title: str
      description: str
      labels: tuple[str, ...]
      gap: Gap

  - class Persona  (the entry point)
      methods listed under "Affordances" above

  - run_cycle() at module level for cron hook
```

## Provisional RABBIT HOLES (to resolve in grill)

- **R1** Where does the charter file actually live? `Personas/<slug>.md` in the 2nd-brain vault, or `swarm/personas/charters/<slug>.md` in Pi-CEO? Two-vault problem.
- **R2** Does the persona module own its own retry/backoff on LLM failure, or does `model_router` handle that?
- **R3** What's the exact `Signal.source` enum? Open-ended string, or strict literal?
- **R4** How does a persona module handle a charter that's malformed? Refuse to load? Load with defaults? Half-load?
- **R5** Does PROPOSAL drafting include Brand Resonance audit inline, or is it a separate sequential call?
- **R6** Where does telemetry go — Supabase? Stdout? `.harness/`? Linear?
- **R7** What's the test strategy? Stub `model_router` and `linear_tools`? Snapshot-test the prompts? Property-test the gap classifier?
- **R8** Does `run_cycle` short-circuit if SCAN returns no signals, or always produce a "no-ops" telemetry row?
- **R9** What happens when the persona's Linear team is misconfigured / unreachable — fail the cycle, or write to a dead-letter table?
- **R10** Is `Persona` a class or a module-level set of functions? Class gives state encapsulation; module-level is simpler to test.

## Provisional NO-GOS (excluded from this template)

- **N1** No direct LLM SDK imports inside the persona. All LLM goes through `swarm/model_router.py`.
- **N2** No Telegram outbound from a persona. Margot owns Telegram.
- **N3** No GitHub push from a persona. Autonomy poller owns push.
- **N4** No cross-persona awareness. Each persona is isolated — they don't read each other's state.
- **N5** No own scheduler. Discovery loop drives the cron.
- **N6** No charter authoring inside the persona. Charters are written by humans / Margot, persona only consumes them.
- **N7** No brand voice rewriting inside the persona. Brand Resonance is a separate module.

## Appetite (provisional — to confirm in grill)

**3 days for the template + 1 worked example (RestoreAssist), then 1 day per remaining persona = ~10 days total for Phase 2.**

## Next step

Run `/grill-me` on this sketch. Output goes to `Grills/01-per-product-persona-template.md`. Every R1-R10 must terminate into DECIDED / RABBIT HOLE / NO-GO before promotion to `Pitches/`.
