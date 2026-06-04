---
type: source
title: Shape Up — fidelity, appetite, breadboarding, fat marker sketch
captured: 2026-05-26
source_url:
  - https://basecamp.com/shapeup/1.2-chapter-03
  - https://basecamp.com/shapeup/1.3-chapter-04
author: Ryan Singer (Basecamp)
purpose: Primary methodology source for the Nexus shaping workflow
---

# Shape Up — fidelity & appetite extracts

## Appetite (Ch3 — Set Boundaries)

> "Appetites start with a number and end with a design. We use the appetite as a creative constraint on the design process."

- Appetite = how much time you're willing to spend, FIXED at the outset.
- Scope is VARIABLE. The team trims scope to fit the appetite, not extends time to fit the scope.
- Standard appetites in Shape Up: small batch (1-2 weeks), big batch (6 weeks).
- For Nexus, useful appetites: 1d, 3d, 1w, 2w, 6w.

## Fidelity discipline

> "It's too early to say 'yes' or 'no' on first contact... we need to do work on the idea before it's shaped enough to bet resources on."

- Low fidelity ≠ low quality. It's the right tool for the shaping stage.
- High fidelity (wireframes, mockups, full PRDs, code) is for AFTER the pitch is approved.
- The trap: jumping to high fidelity early because it FEELS like progress.

## Breadboarding (Ch4) — for flow / sequence problems

Three elements only:

- **Places** — things you can navigate to (screens, dialogs, popups). For code: discrete states, modules, files.
- **Affordances** — things the user can act on (buttons, fields, interface copy). For code: public API surface, public functions, CLI commands.
- **Connection lines** — show how affordances take the user from place to place. For code: data/event flow.

> "We don't have to specify whether it's a separate screen or a pop up modal or what. From a what's-connected-to-what standpoint (the topology) it's all the same."

> "We'll use words for everything instead of pictures."

## Fat marker sketch (Ch4) — for spatial / layout problems

> "A sketch made with such broad strokes that adding detail is difficult or impossible."

The constraint IS the value. You physically cannot over-specify.

For a CODE module, the "fat marker" equivalent is:
- 5 lines of code max per box
- No type signatures
- No imports
- No error handling
- Words/lists/ASCII not actual implementation

## Why these techniques beat wireframes/code at the shaping stage

> "If we start with wireframes or specific visual layouts, we'll get stuck on unnecessary details and we won't be able to explore as broadly as we need to."

> "Writing out the flows confronts us with questions we didn't originally think of and stimulates design ideas without distracting us with unimportant visual choices."

The roughness IS the feature — it surfaces rabbit holes before they consume time.

## Shaped vs unshaped

A shaped pitch carries:
- A breadboard or fat marker sketch (LOW fidelity)
- Rabbit holes (known unknowns) — explicitly listed
- No-gos (excluded scope) — explicitly listed
- An appetite (time budget)

An unshaped idea has the sketch but no rabbit holes, no no-gos, and no appetite. It is not bettable.

## Application to the Nexus

For every major Nexus component, before code:

1. **Sketches/NN-<component>.md** — fat marker sketch (places + affordances + connections + provisional rabbit holes)
2. **Grills/NN-<component>.md** — one-question-at-a-time interview that resolves each branch
3. **Pitches/NN-<component>.md** — sketch + grill outcomes + final rabbit holes + final no-gos + appetite

Only then: Linear epic, first end-to-end slice PR, ship.
