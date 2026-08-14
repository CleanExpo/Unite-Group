---
name: idea-to-production
version: 2.0.0
description: Plain-English Nexus pathway from founder idea to evidence-backed production outcome
triggers:
  - idea
  - build me
  - i want to
  - let's create
  - let's build
  - can we add
  - from scratch
  - new feature
  - full pipeline
  - end to end
---

# Idea to Production

> Phill describes the outcome. Nexus owns discovery, engineering, verification and technical escalation. Production is an earned lifecycle state, not a synonym for “PR created”.

## Canonical lifecycle

Use the current `/spm` mission state rather than inventing another parallel phase tracker:

```text
IDEA
→ DISCOVERED
→ PLANNED
→ BUILD_AUTHORISED
→ EXECUTING
→ LOCALLY_VERIFIED
→ PR_OPEN
→ REVIEWING
→ CI_GREEN
→ STAGING_VERIFIED
→ RELEASE_READY
→ SHIP_AUTHORISED
→ PRODUCTION
→ POST_DEPLOY_VERIFIED
→ COMPLETE
```

A mission may skip unnecessary preparation states when current evidence already supplies them. It may **not** skip evidence/authority gates merely because the task is small.

## How founder language routes

| Founder phrase | Nexus behaviour |
|---|---|
| “I have an idea…” | Resolve existing capability/context, define outcome and bounded gaps |
| “Build me / add…” | Reuse existing mission/spec where sufficient, then enter BUILD when authorised |
| “Stop Planning, Build” | Explicit `/spm build` transition for the current sufficiently-defined mission |
| “Fix / make it work” | Root-cause → repair → regression/visual verification |
| “Is it ready?” | Audit evidence and report the strongest earned state |
| “Ship it / go live” | Resolve RELEASE_READY, then use separately governed `/spm ship` transition |
| “What does this do?” | Explain only; no execution side effects |

Do not force every new feature through a new PRD/spec interview if the existing estate and mission already make the outcome/acceptance criteria clear.

## End-to-end ownership

The SPM/Orchestrator owns movement across the whole mission. Specialists own bounded packets, not the outcome itself.

Typical execution:

1. **Discover/reuse** — inspect current repo/runtime/Linear/Second Brain; avoid duplicates.
2. **Resolve product intent** — ask Phill only genuinely missing business/product questions.
3. **Resolve technical design** — architecture/database/frontend/integration specialists derive it from the current estate.
4. **Build** — isolated branch/worktree, bounded execution lease, evidence/provenance.
5. **Verify** — deterministic baseline + integration/security/data + independent reviewer + Playwright/visual evidence as applicable.
6. **Candidate** — draft PR is `PR_OPEN`, not DONE.
7. **Repair loop** — CI/review/browser failures route back to technical owners; change strategy after bounded attempts.
8. **Release ready** — exact candidate, required evidence, rollback and authority prerequisites are proven.
9. **Ship** — separate machine-verifiable authority controls merge/deploy/promotion as the actual infrastructure requires.
10. **Post-release verify** — production runtime/customer journey is checked against the exact deployed SHA/environment.
11. **Complete** — intended customer/business outcome is proven and learning is fed back into Nexus.

## Technical escalation before founder

A failed repair budget never means “ask Phill what to do” by itself.

Before founder escalation, use appropriate routes such as:
- fresh root-cause diagnosis;
- alternate model family / independent specialist;
- fresh worktree/environment reproduction;
- CI/log/network/browser/Computer Use investigation;
- architecture/database/security review;
- SPM re-decomposition while independent work continues.

Phill receives a business/authority choice or a concise irreducible blocker with options—not ordinary software-engineering homework.

## Evidence and truth

Each transition must be backed by the relevant proof:

| State/claim | Minimum proof class |
|---|---|
| IMPLEMENTED | candidate/diff exists |
| LOCALLY_VERIFIED | required local deterministic checks passed |
| PR_OPEN | draft candidate PR tied to SHA |
| CI_GREEN | required CI for exact SHA passed |
| STAGING_VERIFIED | staging/integration/Playwright evidence passed |
| RELEASE_READY | all pre-release gates + independent review + rollback evidence |
| PRODUCTION | deployment/provider receipt tied to exact SHA/environment |
| COMPLETE | post-release/customer outcome evidence passed |

A green check, HTTP 200, file existence, PR, merge or deployment by itself never proves the stronger states above it.

## Release authority

Verification, review, merge authority and deployment authority are separate unless the **actual infrastructure and ratified authority contract** explicitly couple them.

Current live infrastructure must be checked before claiming independence between merge and deployment. If merging `main` automatically triggers production, merge is production-affecting until that coupling is deliberately changed.

Do not use PR-body prose as the sole authority boundary. Consequential transitions require the canonical machine-verifiable receipt/controller.

## Visual/customer verification

For user-facing work, Nexus performs routine QA through Playwright and visual/Computer Use lanes. Phill is not the default browser tester.

After production release, verify the critical user/customer journey against the deployed candidate before `COMPLETE`.

## Completion output

```text
MISSION: [id]
OUTCOME: [plain-English target]
CURRENT STATE: [earned state]
CANDIDATE/DEPLOYED SHA: [...]
EVIDENCE: [key receipts]
BLOCKER: none | [...]
NEXT MOVE: [...]
FOUNDER DECISION: none | [genuine product/authority decision]
```

## Canonical controls

This skill consumes rather than duplicates:
- `.claude/commands/spm.md`
- `.claude/commands/done.md`
- `.claude/AGENT_HARNESS.md`
- `.claude/agents/orchestrator/agent.md`
- `.claude/rules/verification-gate.md`

Do not reference non-existent `.claude/workflows/*` files as if the execution bridge were implemented there.

## Success condition

**The founder describes the outcome; Nexus gets it to the strongest properly-authorised, properly-verified state and continues until the intended production/customer outcome is actually proven or a real business/authority blocker exists.**
