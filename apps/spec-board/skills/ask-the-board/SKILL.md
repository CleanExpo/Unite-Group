---
name: ask-the-board
description: Loop through advisor profiles in knowledge/board/ and return a combined multi-persona critique of a spec, draft, or decision.
---

# Ask the Board

Input: a spec, draft, or decision to critique. Output: one combined critique
built from every advisor in `knowledge/board/`.

## Procedure

1. List the advisor folders in `knowledge/board/`. If none have a
   `profile.md`, stop and tell the user the board is empty (board content
   arrives in Phase 3 via `ingest`) — do not improvise personas from thin air.
2. For each advisor, read `profile.md` plus any ingested source material, then
   write a critique **in that advisor's lens**: what they'd push on, what
   they'd cut, what they'd bet on. 3–6 bullets each. Ground every point in
   their ingested material where possible and cite the file.
3. Combine into one output:
   - **Per-seat critiques** — one short section per advisor, clearly labelled.
   - **Convergence** — what multiple seats agree on.
   - **Tensions** — where seats disagree, stated as a real trade-off.
   - **Board verdict** — a one-paragraph synthesis. Label it
     `[INFERENCE] — persona synthesis, not fact`.

## Rules

- Clone output is a **lens**, never truth. Every board response is labelled as
  a persona critique and feeds the human approval gate — it never bypasses it.
- If an advisor's ingested material doesn't cover the topic, say so in their
  section rather than fabricating their view.
