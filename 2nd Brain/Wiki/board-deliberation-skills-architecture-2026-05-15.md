---
type: wiki
updated: 2026-05-15
---

# Board Deliberation — Skills Architecture Cleanup (2026-05-15)

Pi-CEO Board deliberation on the [[skills-architecture-audit-2026-05-15]] PM synthesis (76 skills vs Matt Pocock 19-skill reference). Input: 5 forks, all PM-recommended YES.

## Verdict (1 word): **SPLIT-WAVES**

W-NOW (today, no substrate touch): Forks 2 + 3 + 4 + 5 ship.
W-AFTER (Tue 19 May 18:00 AEST onwards): Fork 1 cutover with mandatory audit-verification gate.

## Locked decisions

- **Fork 3 ships first** as the highest-DX-leverage move — pure-documentation router at `~/.claude/skills/index.md`, no code-load. Linked via `~/.claude/CLAUDE.md` import hook (same pattern Phill used for `browser-harness/SKILL.md` 2026-05-14).
- **Fork 2** (rename 3 `curator-*-unknown`, flip `status: proposed` → active) — 15 min, ships today.
- **Fork 4** (200-line soft cap on SKILL.md) — warning rule in CLAUDE.md, not blocking. Ships today.
- **Fork 5** (quarterly lint cron) — schedules today, first run Sat 4-Jul-2026 03:00 AEST. Re-generates the audit page each quarter — the compounding lock.
- **Fork 1** (12 consolidations + 1 delete + 3 sunsets) — Tue 19 May 18:00 AEST onwards, AFTER mandatory `wiki/log.md` last-30-day invocation grep on every delete-list entry.

## The single biggest risk accepted

The PM audit's KEEP/CONSOLIDATE/DELETE column may have more wrong rows than just `agent-shopping-safe-checkout` (Contrarian catch). Mitigation: audit-verification rule is now MANDATORY pre-cut; any skill with ≥1 last-30-day invocation comes off the delete list and surfaces for re-review.

## The single biggest opportunity declined

Moonshot's `skills-orchestrator-of-orchestrators` meta-skill — would have been the third orchestration layer fixing the second. Tech Architect killed it; replaced with router-as-data per Moonshot's pivot. The `skills/index.md` IS the meta-orchestrator, just declared as documentation not code.

## 5 forks for Phill (Board-recommended locked)

| # | Question | Locked answer | Sequencing |
|---|----------|---------------|------------|
| F2 | Rename 3 `curator-*-unknown` skills? | **YES** | Ship today |
| F3 | Ship `~/.claude/skills/index.md` pure-doc router? | **YES** | Ship today (first) |
| F4 | 200-line soft cap on SKILL.md? | **YES** | Ship today (warn, not block) |
| F5 | Quarterly lint cron, first run Sat 4-Jul-2026? | **YES** | Schedule today, fires Sat 4-Jul 03:00 AEST |
| F1 | 12 consolidations + 1 delete + 3 sunsets? | **YES with mandatory verification** | Tue 19 May 18:00 AEST+, post-demo, post-grep |

## Pre-cut verification rule (Fork 1)

Before any skill enters the delete list:
```bash
grep -F "{skill-name}" "/Users/phill-mac/2nd Brain/2nd Brain/Wiki/log.md" | grep "2026-04-15\|2026-04-16\|...|2026-05-15"
```
≥1 last-30-day invocation → REMOVE from delete list, surface for re-review. The `agent-shopping-safe-checkout` mis-delete is the canary; treat the audit as draft, not ledger.

## Cross-refs

[[skills-architecture-audit-2026-05-15]] · [[research-agentic-os-critique-2026-05-14]] · [[feedback-tight-code]] · [[feedback-substrate-change-discipline]] · [[feedback-audit-verification]] · [[feedback-make-calls-not-questions]] · [[feedback-quality-over-quantity]] · [[feedback-no-slack]] · [[board-deliberation-browser-harness-2026-05-14]] · [[autonomy-gap-audit-2026-05-14]] · [[pi-ceo-architecture]] · [[exit-thesis]] · [[master-plan-2b-by-2028-v3]] · [[feedback-botfather-hardwire-2026-05-15]]
