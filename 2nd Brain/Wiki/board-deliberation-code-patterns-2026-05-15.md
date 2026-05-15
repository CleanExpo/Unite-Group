---
type: wiki
updated: 2026-05-15
---

# Board Deliberation — Code Patterns Absorption (2026-05-15)

Pi-CEO Board deliberation on the [[pm-synthesis-code-patterns-2026-05-15]] (37 patterns from Matt Pocock + Magnus Mueller). Input: 5 forks, all PM-recommended YES.

## Verdict (1 word): **SHIP-4-NOW**

Fire 4 W-NOW patterns sequentially today (single agent, PR-by-PR). F2 + F3 deferred per substrate-change discipline. F5 narrowed.

## Locked decisions

- **PR1 — P19 path-traversal regex** on slug intake (`swarm/inbox/provisioner.py` + ContextBot intake_router) — security fix, sprint-window exempt — 30 min.
- **PR2 — P6 atomic `.tmp` + `os.replace`** state writes (`~/.hermes/state/*.json` + Pilot Phase 2 stubs) — strictly safer than current truncate-then-write — 30 min.
- **PR3 — Matt #15 `as const`** on `Synthex/packages/brand-config/src/brands/*.ts` — type-narrowing-only, grep-verified no downstream mutates — 45 min.
- **PR4 — Matt utils Equal/doNotExecute type-test helper** at `Synthex/packages/brand-config/src/tests/utils.ts` — pure additive — 90 min.
- Sequential firing (Contrarian catch) — if any PR lands red, STOP and diagnose before pushing next.
- F2 (Hermes dict-lookup) — gated on shadow-dispatch ≥50 parity per `[[feedback-substrate-change-discipline]]` #1; cutover Tue 19 May+.
- F3 (frozen-core + editable-sibling into retailers) — Wave-2 per `[[board-deliberation-browser-harness-2026-05-14]]` sequencing.
- F5 NARROWED — lock only `oversized-slice` (>200 lines per SKILL.md) + `__await__-misuse` as anti-patterns in `[[feedback-tight-code]]` memory. Drop Effect-TS + ts-reset-entrypoints (no portfolio evidence).

## The single biggest risk accepted

That Matt + Magnus's patterns transfer across languages without friction. The convergence is real, but the idioms aren't 1:1. Watch-rule: if a pattern needs >50 lines of glue code to land, the convergence is too thin to chase.

## The single biggest opportunity declined

Moonshot's "ship F3 immediately" pivot — would have force-fitted the editable-sibling pattern into the swarm spine, which needs causal guarantees the pattern explicitly violates (Contrarian catch). F3 stays correctly deferred.

## 5 forks for Phill (Board-recommended locked)

| # | Question | Locked answer | Sequencing |
|---|----------|---------------|------------|
| F1 | Ship W-NOW four PRs today? | **YES** | Sequential, today, ~3.5h total |
| F2 | Hermes if-chain → dict-lookup with shadow-dispatch ≥50? | **YES** | Author harness this weekend, cutover Tue 19 May+ |
| F3 | Frozen-core + editable-sibling into agent-shopping retailers? | **YES** | Wave-2 (post autonomy-gap #1-3 close) |
| F4 | Ship `Pi-Dev-Ops/CONTEXT.md` glossary as no-code PR? | **YES** | Ship today as PR5 (no code change) |
| F5 | Lock anti-patterns into `[[feedback-tight-code]]`? | **NARROWED YES** | Lock 2 (oversized-slice + __await__); drop 2 (Effect, ts-reset) |

## Cross-refs

[[pm-synthesis-code-patterns-2026-05-15]] · [[research-mattpocock-code-patterns-2026-05-15]] · [[research-browser-use-code-patterns-2026-05-15]] · [[feedback-tight-code]] · [[feedback-substrate-change-discipline]] · [[feedback-audit-verification]] · [[feedback-quality-over-quantity]] · [[feedback-make-calls-not-questions]] · [[board-deliberation-browser-harness-2026-05-14]] · [[board-deliberation-skills-architecture-2026-05-15]] · [[skills-architecture-audit-2026-05-15]]
