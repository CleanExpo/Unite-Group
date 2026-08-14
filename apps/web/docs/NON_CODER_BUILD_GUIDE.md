# Founder Build Guide — Idea to Verified Outcome

> You do not need to become the software engineer to use Nexus. Your job is to describe the outcome, set priorities and make business/authority decisions. Nexus owns the technical work required to make the outcome real.

## Your normal workflow

### 1. Describe the idea

Say, in normal language:
- what you want to happen;
- who it is for;
- why it matters;
- what the user/business should experience when it works;
- anything that must not change.

You do **not** need to name files, tables, APIs, frameworks or implementation patterns.

### 2. Let SPM establish enough truth to execute

Nexus should inspect the current estate, find existing capability, identify real gaps and define measurable success. Technical questions are routed to the relevant engineering specialist.

If Nexus genuinely needs a business/product decision from you, it should ask that decision in plain English with the relevant options/trade-offs.

### 3. Stop Planning, Build

Once the outcome and acceptance criteria are sufficient, the mission moves through `/spm build` / `Stop Planning, Build`.

Nexus then owns:
- architecture/file placement;
- implementation;
- database/API decisions derived from the current system;
- test creation and repair;
- lint/type/build failures;
- dependency compatibility;
- CI and merge-conflict repair;
- Playwright/browser verification;
- Computer Use/visual investigation where needed;
- independent technical review;
- evidence and status reporting.

### 4. Review the outcome, not the engineering homework

Nexus should present an evidence-backed status such as:

```text
MISSION: [name]
STATE: RELEASE_READY
WHAT CHANGED: [plain-English result]
WHAT WAS PROVEN: tests/build/review/Playwright/etc.
WHAT REMAINS: none | [real blocker]
FOUNDER DECISION: none | [business/authority decision]
```

You should not normally receive:
- raw stack traces asking what to do;
- “which folder should this be in?”;
- “do we need a new table/API?”;
- a checklist asking you to perform routine QA;
- a request to decide which package/version fixes a build;
- a PR that silently becomes the finish line when the intended outcome is not live/verified.

### 5. Shipping is a separate governed transition

When work is `RELEASE_READY`, Nexus should present the release state, evidence, risk/rollback and any genuine authority decision required. A PR or green CI is not automatically production.

After an authorised release, Nexus performs the applicable post-release health and user/customer-path checks before reporting `COMPLETE`.

## Your role vs Nexus role

| Phill / Founder | Nexus engineering system |
|---|---|
| Set North Star and priorities | Discover current technical reality |
| Describe product/customer outcome | Decide technical implementation within policy |
| Choose subjective product/business trade-offs | Build, test, debug and integrate |
| Set risk appetite | Diagnose and contain technical failures |
| Give consequential approval when required | Run CI, Playwright and visual verification |
| Decide commercial/brand direction | Resolve technical review findings/conflicts |
| Project-manage outcomes with Margot | Produce evidence and continuously improve the engineering system |

## If you find a technical defect first

Treat it as an **escaped Nexus defect**, not normal founder work.

Nexus should record:
1. what you discovered;
2. why existing monitoring/testing/review failed to catch it;
3. the immediate repair;
4. the permanent prevention control/test/monitor;
5. whether the same defect class exists elsewhere.

The target trend is simple: fewer technical problems should reach you first over time.

## Useful commands / phrases

- `/spm plan <goal>` — bounded discovery when a new idea genuinely needs it.
- `Stop Planning, Build` / `/spm build` — execute the current sufficiently-defined mission.
- `/spm status` — plain-English current state, evidence, blocker and next move.
- `/spm ship` — request the separately governed release transition.
- `/done` — evidence audit; this should run technical verification rather than handing QA to you.

## What success looks like

Your normal experience should increasingly be:

> “Here is the outcome I want.”

then later:

> “Here is what Nexus delivered, the proof, what it learned, and what it recommends next.”

The engineering language between those two points belongs inside the engineering system unless you explicitly want to inspect it.
