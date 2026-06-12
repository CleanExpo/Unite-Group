---
type: source
title: Matt Pocock's /grill-me skill — pattern + adaptation
captured: 2026-05-26
source_url:
  - https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md
  - https://github.com/mattpocock/skills/issues/102
author: Matt Pocock
purpose: Procedural source for the relentless-interview shaping technique
---

# /grill-me — pattern extract

## Original instruction (verbatim)

> "Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer. Ask the questions one at a time. If a question can be answered by exploring the codebase, explore the codebase instead."

## Four load-bearing rules

1. **Walk the decision tree** — not a flat checklist. Some questions gate others.
2. **Dependencies before leaves** — resolve parents before children.
3. **One question at a time** — never bundle.
4. **Recommend an answer to every question** — take a position, let the user override.

## Typical session stats (per Matt)

- 30-60 minutes elapsed
- 15-50 questions answered
- Zero lines of code written during the session
- A grill that ends in <5 Qs means the sketch wasn't abstract enough

## Open question (issue #102)

> "I would expect grill-me and to-prd to be the same conversation, and if the context gets too full /to-issues is fresh?"

The chain Matt has open-sourced is: `/grill-me` → `/to-prd` → `/to-issues`. The relationship between the three is still being negotiated. Currently:

- `/grill-me` — interview, output is a transcript
- `/to-prd` — converts a grill into a PRD document
- `/to-issues` — converts a PRD into atomic GitHub issues

## Nexus adaptation

For the Unite-Group rebuild we collapse `to-prd` into the **Pitch** stage (Shape Up vocabulary) and `to-issues` into the **Linear epic** stage. The full chain becomes:

```
Sources/        → existing material we're shaping from
    ↓
Sketches/       → fat-marker artifact (Shape Up)
    ↓
Grills/         → /grill-me transcript (Pocock)
    ↓
Pitches/        → shaped doc with rabbit holes + no-gos + appetite
    ↓
Linear epic     → atomic vertical slices
    ↓
First PR        → end-to-end vertical slice
```

The unique Nexus extension: **every grill terminates each branch into one of three explicit states (DECIDED / RABBIT HOLE / NO-GO)** so the downstream pitch document is mechanically derivable from the transcript.
