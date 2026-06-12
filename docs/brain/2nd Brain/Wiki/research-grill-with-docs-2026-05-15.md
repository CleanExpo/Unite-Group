---
type: wiki
updated: 2026-05-15
---

# /grill-with-docs — Research + Build Brief

Matt Pocock's 2026-05-15 evolution of `/grill-me`: an interview skill that grills the user against a persistent `context.md` glossary (ubiquitous-language doc) and an `adrs/` folder, so the AI and the human keep converging on the same vocabulary instead of re-explaining domain terms every session. Single highest-leverage first fire for Phill: **Pilot bot Phase 2 spec at `[[ccw-crm-discovery-audit-2026-05-14]]`** — it's the next ambiguity-heavy domain (status semantics, entity cardinality, idempotency boundaries) where shared language will compound across the swarm-dispatch refactor.

## 2. Source extraction (verbatim, line-cited)

Source: `Sources/I stopped using grill-me for coding. Here's what I use instead.md` (Matt Pocock, published 2026-05-15).

**What /grill-with-docs IS** (L74-79):
> "It is grill with docs. It has exactly the same text as grill me at the top here, but it has a couple of extra pieces. The first thing it has is the ability to look for a context.md file. This context.md file will have document all of the shared language that's inside that context." (L75)
> "[I]t's instructed to look for this existing documentation to pull in this shared language, and then during the session it's got some extra additions here to challenge uh language usage against the existing glossary, to sharpen fuzzy language, discuss concrete scenarios, cross-reference with code, and update it as you go." (L79)

**Why it replaces /grill-me** (L63-71):
> "[T]here was this piece missing from the puzzle, which is we were able to communicate about the code pretty effectively, but I would have to re-explain all of the non-obvious things about the code base and about the domain, the problem that we were solving before we could do anything productive." (L65)
> "I started to think to myself, what is the thinnest layer of documentation I could use to just give the AI a bit more of a leg up. So, I came up with this skill, the ubiquitous language skill." (L67)
> "Wouldn't it be great if I just combine the two into a new skill?" (L71)

**Bounded-context concept** (L76-78):
> "[A] bounded context in DDD is a part of the app in which you speak a shared language. So, if you have a massive mono repo, you can have a context map here and have many different contexts inside. So, that's how you would scale this to an enormous repo. But still, if you just have one pretty big repo where all the application is speaking the same language [...] then you can just use a single context.md here." (L77)

**Discovery convention** (L86-87):
> "[T]he Grill with Docs skill knows to look for this, but I also add a context pointer into, not inside that claw.md, but inside the local claw.md here. So, we have just this domain docs, a single context layout, context.md at the repo root, and you see this extra little bit of uh, documentation for more information about where this stuff is." (L87)

**ADR layer** (L91-97):
> "I wanted a layer that would explain all the non-obvious decisions that weren't able to be captured inside context.md. And so for that, I've gone with an architectural decision record." (L91)
> "You only want to create an ADR when the decision is hard to reverse [...]. And plenty of decisions in a repo are surprising without context, especially more complex ones, and the result of a real trade-off." (L93, L95-97)

**Worked example — Pitch entity** (L99-119):
> "[T]he first thing it has done is it said 'Ooh, context.md is rich. Standalone video is already defined as a video with lesson ID equals null.' And it says before going further, I want to surface attention with the glossary." (L101)
> "It says there's cardinality between pitch and standalone video. It's asking whether one pitch holds many standalone videos or one pitch corresponds to exactly one standalone video." (L103)
> "[T]here's a terminology collision with the standalone video. So it's saying that you have a standalone video that are either totally standalone or they can be related to pitches." (L103-105)
> "It's now saying, 'Okay, we need some status semantics here.' So, each pitch can be idle or scheduled or shipped here." (L107)
> "I'm just going to say, 'Could you save what we have into context.md so far?' If there's anything we haven't figured out, grill me about that before you make the adjustments." (L115)

**Benefits + verdict** (L123-137):
> "[Y]ou get [...] concise replies. The AI is able to use fewer tokens to speak to you because you have this shared language and it doesn't need to verbosely repeat everything." (L123)
> "[B]ecause the planning documents [...] are also aligned with the way the code looks as well, then you end up with easier to navigate code." (L127)
> "When you have a code base, use Grill with Docs. When you don't have a code base, use Grill me." (L137)

## 3. Comparison vs existing skills

| Skill | When to fire | What it produces |
|---|---|---|
| `/grill-with-docs` (new) | Domain entity / language ambiguity in a code-bearing repo, BEFORE planning | Updated `context.md` glossary + optional ADR(s) |
| `superpowers:writing-plans` | After language + scope are nailed, you have a spec | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` |
| `opus-adversary` / `design-pressure-test` | AFTER plan or implementation drafted | Adversarial review — finds race conditions, wrong-architecture traps |

Notes: `/goal` (per `[[research-claude-code-update-2026-05-14]]`) is a queue-and-resume primitive — orthogonal. `superpowers:brainstorming` overlaps the front of `/grill-with-docs` but does not produce a persistent `context.md` artefact. `/grill-with-docs` is the upstream feeder; `writing-plans` is the downstream consumer; `opus-adversary` is the post-hoc gate.

## 4. Portfolio fit — top 3 first-fires

1. **Pilot bot Phase 2 spec** (`[[ccw-crm-discovery-audit-2026-05-14]]` — adjacent). Status semantics + cardinality + idempotency boundaries are dense; shared language compounds across CCW + Pilot + Hour-1 provisioner.
2. **Agency Tinder game design** (`[[agency-tinder-game-design-2026-05-15]]`). Pre-implementation. New entity layer (swipe / match / brief / dispatch) — perfect language-establishment moment per Pocock L137 ("really early on a project").
3. **CARSI sprint review** (`[[carsi-discovery-audit-2026-05-14]]`). 6 P0 / 10 P1 / 8 P2 surfaced unresolved entity ambiguities — grill-with-docs would surface what `context.md` should hold before the next planning round.

Not Mon-18 CCW review (Toby on holidays per `[[project-ccw-holiday-window]]`).

## 5. Anti-scope — what `/grill-with-docs` should NOT do

- NOT a planner — does not produce task lists, file diffs, or implementation steps. Hand off to `superpowers:writing-plans`.
- NOT a code review — does not read PRs or critique architecture. Hand off to `opus-adversary` / `design-pressure-test`.
- NOT a brainstorm — assumes the user already has a feature/entity in mind. For open-ended creative work, use `superpowers:brainstorming` first.
- NOT a Board deliberation — single-thread interview, not 9-persona debate. For strategic forks, use `ceo-board`.
- NOT for non-code work — Pocock L133-137 keeps `/grill-me` alive for non-code (eulogies, life decisions). Don't conflate.
- Does NOT auto-write code. Only updates `context.md` and (when warranted) `adrs/NNN-<slug>.md`.

## 6. Cross-refs

- `[[research-claude-code-update-2026-05-14]]` — `/goal` precedent (slash-command shape)
- `[[research-mattpocock-code-patterns-2026-05-15]]` — Pocock's broader skill philosophy (one concept = one file = one sibling test)
- `[[skills-architecture-audit-2026-05-15]]` — where the new skill slots in the 76-skill ecosystem
- `[[feedback-tight-code]]` — 200-line soft cap on SKILL.md (the binding constraint)
- `[[feedback-make-calls-not-questions]]` — `/grill-with-docs` IS a question-machine, but it asks the human about domain language, NOT about implementation decisions. Distinction matters.
- `[[ccw-crm-discovery-audit-2026-05-14]]` — first-fire candidate
- `[[agency-tinder-game-design-2026-05-15]]` — second first-fire candidate

## 7. Board sanity-check (lite — 3 personas)

**Compounder (YES):** Persistent `context.md` is a compounding artefact — every grill session improves the glossary, every future session inherits sharper language. The token-cost-per-session curve trends down across the project lifetime. Net asset.

**Contrarian (YES, scoped):** Risk = bike-shedding (Pocock himself flags L119 "this might just feel like bike-shedding to you"). Mitigation: anti-scope §5 explicitly forbids drift into planning/review, so the skill exits when the human says "good enough, ship." No new substrate added — just one markdown file + an interview loop. No `[[feedback-substrate-change-discipline]]` triggers (no shadow-run needed; the artefact is human-readable text).

**Technical Architect (YES):** The skill is ~150 lines of markdown — no code, no API, no MCP wiring. Reads `context.md` if present, asks questions, writes back. Fits cleanly between `superpowers:brainstorming` (upstream) and `superpowers:writing-plans` (downstream). Does not duplicate `opus-adversary`. No rollback risk.

**Verdict: unanimous YES. Proceed to Stage 3.**

## 8. Build directives (sourced)

The SKILL.md MUST:
- Look for `context.md` at repo root (Pocock L75, L87) — fall back to `docs/context.md` if absent.
- Look for `adrs/` directory (Pocock L91-97); create on first ADR.
- Trigger phrases: "grill me", "grill with docs", `/grill-with-docs`, "ubiquitous language", "let's establish shared language".
- During the session: challenge fuzzy language against the existing glossary, sharpen with concrete scenarios, cross-reference with code, update `context.md` inline (Pocock L79).
- Create an ADR ONLY when the decision is hard to reverse (Pocock L93). Trivial / interchangeable choices stay out of the ADR layer.
- Exit when the user says "good enough, ship" / "save what we have" (Pocock L115, L121) — no infinite-loop on bike-shed.
- Single-thread the interview. ONE question at a time. Wait for the human's answer before next question.

The SKILL.md MUST NOT:
- Write production code.
- Produce a multi-task implementation plan (hand off to `superpowers:writing-plans`).
- Run an adversarial review (hand off to `opus-adversary`).
- Touch any file outside `context.md` + `adrs/`.

Hand-off contract: when the grill session closes, surface a one-line prompt suggesting `superpowers:writing-plans` as the next step.
