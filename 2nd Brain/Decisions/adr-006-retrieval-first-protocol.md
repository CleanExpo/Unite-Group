---
type: decision
slug: adr-006-retrieval-first-protocol
status: ratified
created: 2026-06-04
reviewer: Phill McGurk
---

# ADR-006: Retrieval-First Protocol for All Product Work

## Context

Agent has repeated the same failure multiple times: acting before reading context, then apologising and promising to do better. Skills exist but are not loaded. Memory exists but is not consulted. The only approach not yet tested is **mechanical enforcement**.

## Decision

Every session touching ANY UGN product MUST follow this sequence. Deviation is a session abort.

```
┌─────────────────────────────────────────┐
│  STEP 1: Load 2nd-brain persona         │
│  → /Users/phillmcgurk/2nd-brain/        │
│    Personas/<product>.md                 │
├─────────────────────────────────────────┤
│  STEP 2: Load relevant skills           │
│  → skills_list + skill_view(name)       │
├─────────────────────────────────────────┤
│  STEP 3: Search prior outcomes          │
│  → search_files(2nd-brain/Outcomes/,    │
│    <product> OR <component>)            │
├─────────────────────────────────────────┤
│  STEP 4: Run pre-flight gate (if exists)│
│  → .bin/<product>-pre-flight            │
├─────────────────────────────────────────┤
│  STEP 5: Only then proceed with work    │
└─────────────────────────────────────────┘
```

## Enforcement

The pre-flight gate (`.bin/video-pre-flight` for RestoreAssist video work) is:
- A shell script, not a skill
- Executable permissions
- Returns exit code 1 on ANY failure
- Must pass before `render:tutorials`, `generate-narration`, or any video generation

Each product may have its own gate. Pattern: `.bin/<product>-<domain>-pre-flight`

## Rationale

| Alternative | Why rejected |
|-------------|------------|
| "Just remember to load skills" | Failed repeatedly — agent's context window is consumed by task urgency |
| "Write better skills" | Skills exist and are good — failure is loading, not content |
| "More memory entries" | Memory is advisory — agent can ignore it |
| "Agent promises to do better" | Proven ineffective — same apology twice for same error |
| **Mechanical gate (exit 1)** | **Only untested approach — forces hard stop, cannot be overridden** |

## Consequences

- Slight friction: every video session starts with ~30s of checks
- Prevents the 10-60min of rework from skipped context
- Creates searchable failure history in 2nd-brain/Outcomes/
- Gate scripts are product-specific and own their own checks

## Updates to skills

- `restoreassist-project-ops`: Added pre-flight checklist, voice canonical table, ffmpeg ARM64 workaround
- `app-tutorial-video-generation`: Added voice canonical table, ffmpeg installation options

## When to revisit

If the gate script is bypassed or ignored 3 times → escalate to stronger enforcement (pre-commit hook, CI gate, or agent-level hard block).
