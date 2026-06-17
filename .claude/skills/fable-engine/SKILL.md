---
name: fable-engine
description: Turn a plain-English vision or task into a verified, build-ready spec before any code. Locks the finish line, researches across channels, enforces the Evidence Standard, stops at the human gate. Adopted from CleanExpo/Fabel-Prompt-Engineer for the Authority-Site / Pi-CEO / Unite-Group build process.
---

# Fable Engine (Unite-Group build process)

Input: a vague idea or a non-trivial change in plain English. Output: a precise,
sourced, build-ready spec. You propose; the human decides. Pairs with
`.claude/rules/fabel-evidence-standard.md` and `.claude/FABEL_PLAYBOOK.md`.

Use it for: a new feature, a CRM/command-center workstream, a risky refactor, a
schema change, or any multi-agent fan-out. Skip it for: a one-line fix or a
conversational answer (Fabel directive 1 — act when you have enough info).

## Operating loop

### 1. Lock the finish line
Restate the task as one testable sentence: *"Done when ___."* If several finish
lines are plausible, pick the most likely, state it, list the rejected ones.
Emit: `[STATUS] finish-line: locked — <one sentence>`

### 2. Research channels (emit started/done per channel)
- **Source channel** — read the actual workspace code + `.claude/` rules +
  `CLAUDE.md` (the DB branch-first rule is load-bearing) that constrain or
  accelerate the change. Docs are stale; the source is truth.
- **Prior-work channel** — search merged PRs, `docs/margot/` operating rules and
  plans, `docs/decisions/`, memories, and open PRs for decisions and existing
  patterns (e.g. the CRM approval-lifecycle, Supabase branch validation, route
  inventory/security checks).
- **Web channel** — for external facts (API shapes, prices, library versions)
  use Context7 / web; every web finding carries its source URL. No web access →
  mark skipped, downgrade affected claims to `[UNCONFIRMED]`.

### 3. Filter through the Evidence Standard
Every finding and spec claim is tagged `[VERIFIED]` / `[INFERENCE]` /
`[UNCONFIRMED]` per `fabel-evidence-standard.md`. An untagged claim is a defect.

### 4. Synthesize, ask only what you can't infer
Draft the spec. Infer-and-tag rather than ask. Where info is genuinely missing,
list ≤5 concrete, answerable questions.

### 5. Board critique (high-stakes or on request)
Run `review-board` / `chief-reviewer` on the draft; append the combined critique
as a lens. Label it `[INFERENCE] — persona synthesis, not fact`. It feeds the
gate, never bypasses it.

### 6. Approval gate
Present the spec and stop. Nothing builds until the human approves. For the
agent fleet (Margot et al.): the spec is the contract each subagent is
dispatched against, and the prod-migration / prod-deploy gate remains the
founder's call.
Emit: `[STATUS] gate: awaiting approval`

## Spec output format
1. **Finish line** — the locked "done when" sentence.
2. **Decision up front** — recommended path in one paragraph.
3. **Goals & non-goals** — non-goals required.
4. **Approach** — plain language first.
5. **Phased plan** — smallest phase first; each phase has a definition of done;
   no later phase before the earlier DoD is met. For a fleet wave: the disjoint
   agent lanes + their file boundaries.
6. **Data model** — if it stores anything, respect the branch-first DB rule:
   prove the schema/migration on a **Supabase database branch** before
   prod (`lksfwktwtmyznckodsau`); run `npm run check:schema-drift` after.
7. **Security & cost guardrails** — secrets, org-scoping, route inventory
   (`npm run security:routes-check`), spend; structural not advisory.
8. **Risk & assumption register** — every `[UNCONFIRMED]` lands here.
9. **Open questions** — the ≤5 from step 4, if any.
10. **Verification plan** — the exact commands that will prove "done"
    (`npm run build`, `npm run type-check`, `npm test`, `npm run check:schema-drift`
    where relevant). Per Fabel directive 5, a claim isn't done until its tool
    result says so.

## Status grammar
`[STATUS] <subject>: <state>[ — detail]` — subjects: `finish-line`,
`channel:source`, `channel:prior-work`, `channel:web`, `synthesis`, `board`,
`gate`.
