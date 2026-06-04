---
type: outcome
component: nexus-obsidian-operating-brain-v2
status: complete
created: 2026-06-04
scope: research-and-shaping
evidence_paths:
  - Sources/2026-06-04-obsidian-agentic-second-brain-research.md
  - Outcomes/2026-06-04-nexus-kb-architecture-research.md
  - Sketches/04-nexus-obsidian-operating-brain-v2.md
  - Pitches/03-nexus-autonomous-onboarding-and-growth-os-v1.md
  - Decisions/adr-006-retrieval-first-protocol.md
links:
  - "[[2026-06-04-obsidian-agentic-second-brain-research]]"
  - "[[04-nexus-obsidian-operating-brain-v2]]"
  - "[[03-nexus-autonomous-onboarding-and-growth-os-v1]]"
  - "[[adr-006-retrieval-first-protocol]]"
---

# Outcome — Obsidian 2nd Brain 10x Research + Shape

## What was done

- Resolved the actual Obsidian vault/source path as `/Users/phillmcgurk/2nd-brain/`.
- Checked git state and local corpus stats.
- Confirmed the vault is a git repo, but `git remote -v` has no remote configured, so there is no external source to pull from yet.
- Read the active vault rules in `CLAUDE.md` via subdirectory context.
- Loaded relevant Hermes skills: `obsidian`, `nexus-documentation`, `nexus-personal-intelligence`, `nexus-orchestrator`.
- Read the cornerstone Nexus pitch and retrieval-first ADR.
- Ran parallel research on:
  1. Obsidian current capabilities/ecosystem,
  2. execution-first PKM/second-brain models,
  3. existing Unite-Group/Pi-CEO agentic knowledge architecture.
- Wrote a source pack and a new fat-marker sketch for the next operating-brain slice.

## Files created

1. `Sources/2026-06-04-obsidian-agentic-second-brain-research.md`
   - source-backed research synthesis for Obsidian + PKM + agentic KB architecture.

2. `Sketches/04-nexus-obsidian-operating-brain-v2.md`
   - Shape Up fat-marker sketch for the 2nd-brain operating brain v2.
   - Status: draft.
   - Appetite: 2w.
   - First slice: local-only Source-to-Shape autopromoter.

3. `Outcomes/2026-06-04-obsidian-second-brain-10x-research.md`
   - this completion/evidence note.

Related research file created by subagent and already committed in the vault:

- `Outcomes/2026-06-04-nexus-kb-architecture-research.md`

## Key evidence

Current vault shape:

- 551 markdown files.
- 258 Sources.
- 2 Sketches before this work.
- 1 Grill.
- 2 Pitches.
- 3 Decisions.
- 1 Persona.
- 10 Outcomes before this note set.

Interpretation: capture is working; promotion/consolidation is the leverage gap.

## 10x recommendation

Build the 2nd brain as a governed promotion machine, not a bigger note pile.

Target loop:

```
Capture -> Router -> Cortex -> Betting Table -> Outcome Loop
   ^                                            |
   |____________________________________________|
```

Operating rules:

1. Capture stays cheap.
2. Every source/outcome gets routed within 24h.
3. Repeated signals consolidate weekly.
4. Consolidated signals become sketches.
5. Sketches are grilled with Phill.
6. Resolved grills become pitches.
7. Shipped work creates outcomes.
8. Outcomes feed daily briefs and future founder conversations.

## Highest-ROI implementation slice

Source-to-Shape autopromoter, local-only:

- Reads last 7 days of `Sources/` and `Outcomes/`.
- Detects unlinked, repeated, or high-urgency signals.
- Proposes max 3 promotions:
  - new Sketch,
  - ADR draft,
  - archive/retire,
  - ask Phill.
- Emits a Markdown report in `Outcomes/`.
- No Linear/GitHub/Supabase writes.
- Every proposal cites evidence paths and confidence.

Why first:

- Directly attacks current bottleneck: too much capture, too little compounding shape.
- Fits existing vault workflow.
- Needs no new vendor.
- Does not require production access.
- Can be verified on the current corpus immediately.

## Blockers / caveats

- No git remote exists for `/Users/phillmcgurk/2nd-brain`, so "pull latest" could only mean local refresh/read, not remote pull.
- Obsidian CLI/Bases/headless availability on this Mac was not mutated or installed; next step should detect existing install/version before relying on those features.
- Do not promote Sketch 04 into a Pitch until a Grill transcript exists, per vault hard rules.

## Verification

- Files were written under `/Users/phillmcgurk/2nd-brain/`.
- Markdown writes returned successful tool results.
- `git diff --check` passed for the three new files.
- Read-back passed for the new Sketch and Outcome notes.
