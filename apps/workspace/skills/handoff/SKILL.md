---
name: handoff
description: Writes a structured session handoff so a fresh agent can continue without losing thread
---

# /handoff — Session Continuity Skill

## When to use

- Before ending a long coding/task session
- When switching between tasks or agents
- After reaching a natural checkpoint
- When context is approaching capacity

## What this skill does

Different from /compact (which compresses context):

- /compact: saves tokens by summarising — new agent has compressed history
- /handoff: produces a clean BRIEF for a FRESH agent — new agent starts with zero baggage but full context

## Invoke

Type: /handoff [optional: brief description of what was happening]

## Output format

The agent writes a handoff document to: ~/.hermes/handoffs/YYYY-MM-DD-HH-MM.md

Structure:

````
# Handoff — [date time AEST]

## What was being worked on
[1 paragraph — specific task, not vague]

## Current state
- What's DONE (committed/verified)
- What's IN PROGRESS (started but not committed)
- What's BLOCKED and why

## Files modified this session
[list with one-line description of change per file]

## The next agent should
[Numbered list — specific actions, not "continue the work"]

## Context the next agent needs
[Key facts, decisions made this session, any gotchas discovered]

## Commands to run first
```bash
# Verify state before continuing
[e.g. pnpm type-check, git status, etc.]
````

## What NOT to do

[Anti-patterns or dead ends discovered this session]

```

## Usage patterns

### Handing off to prototype
"I've drafted the spec, /handoff to prototype"
→ Writes handoff → prototype agent reads it → picks up from spec

### Handing off mid-feature
"/handoff — auth middleware half-done"
→ Writes handoff → fresh agent knows exact stopping point

### Cross-session (close laptop)
"/handoff end of day"
→ Writes handoff → tomorrow's agent reads it at session start

## Integration with soul.md
At session start, Hermes agents check ~/.hermes/handoffs/ for the most recent handoff.
If found (< 24 hours old), inject it alongside soul.md as Tier-0 context.
```
