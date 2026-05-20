---
type: wiki
updated: 2026-05-21
linear: UNI-2046
---

# Mandatory Close the Loop Protocol

**Purpose**: Convert a founder idea into a finished, production-ready product without losing the thread between idea, research, build, test, release, learning, and follow-up.

Source: Linear `UNI-2046` — Production Readiness & Future-Proofing Mandate, Nexus Semantic Layer.

This protocol exists because partial delivery is the main failure mode. A feature can be planned, coded, or documented and still not be usable. Work is not complete until the loop is closed.

## Plain-English Rule

An idea is only finished when all of this is true:

1. The idea has been captured and grounded in the Wiki/semantic layer.
2. The work has a Linear issue or linked controller issue.
3. The design explains what will change and how success will be proven.
4. The implementation is integrated into the real product or agent workflow.
5. The relevant agents/tools know how to use it.
6. Tests, build checks, and a human-facing smoke check have passed.
7. Production/preview status is known, not guessed.
8. Linear, Wiki, and the handoff state are updated before the session ends.

If any item is missing, the task is not done. It is `Blocked`, `In Review`, or `Ready for Next Pass`.

## Mandatory Workflow

### 1. Capture

- Capture the raw idea from chat, Obsidian, Plaud, Telegram, meeting notes, or Linear.
- Link the input to the relevant business, product, client, and project.
- Keep secrets out of Wiki, Linear, PRs, screenshots, and docs.

Exit gate: the source exists and the next worker can find the original intent without asking Phill to repeat it.

### 2. Ground

- Search the Wiki/semantic layer first when available.
- Read the named Linear issue and referenced Wiki pages.
- For `UNI-2046`, always check [[client-user-journey]], [[proactive-gamification-layer]], and [[production-readiness-checklist]].
- Pull current repo state before deciding the build path.

Exit gate: the task has evidence links, current repo truth, risk state, and a clear owner surface.

### 3. Translate

Every meaningful task must produce:

- User intent: what Phill is trying to achieve in business language.
- Product outcome: what the user/client will actually be able to do.
- Architecture target: presentation, service, repository, provider adapter, agent skill, Wiki, or Linear.
- Integration requirement: where it must appear so it is actually usable.
- Verification path: exact checks that prove it works.

Exit gate: the task is small enough to build and verify, or split into linked Linear children.

### 4. Build

- Keep business rules in services/skills, not buried inside UI or provider code.
- Keep provider mechanics behind adapters.
- Register new tools, routes, skills, or prompts where agents can actually call them.
- Do not create orphan code, orphan docs, or unregistered workflows.

Exit gate: the change is wired into the product, agent, or operating workflow that will use it.

### 5. Verify

Minimum verification depends on the work type:

- Code: type-check, targeted tests, lint, build, and route/browser smoke where relevant.
- UI/UX: desktop and mobile layout check, no overlap, no unreadable text, no hidden primary action.
- Agent/tooling: callable registration, example invocation, fallback behaviour, and permission/credential gate.
- Content/media: evidence, consent, licensing, brand, QA, and approval gates.
- Production deployment: preview/live URL, CI status, logs if needed, and rollback awareness.

Exit gate: checks pass, or failures are documented as blockers with the next exact action.

### 6. Promote

- Local sandbox proves implementation.
- PR proves reviewable change.
- CI and preview prove release candidate.
- Production only follows after required checks are green and publish/spend gates remain controlled.

Exit gate: deployment state is `Sandbox only`, `Preview ready`, `Production ready`, `Production live`, or `Blocked`.

### 7. Register

- Register new capabilities in the relevant agent/skill/tool registry.
- Update Wiki pages and backlinks.
- Update Linear with files changed, verification evidence, PR/deploy URL, and remaining blockers.
- If a new recurring behaviour exists, add it to the health review cadence.

Exit gate: the next agent knows the capability exists and how to use it.

### 8. Observe

- Add or confirm logs, metrics, health checks, or usage signals.
- Track whether the feature improves client journey, speed to insight, conversion, retention, ROI, or operating clarity.
- Feed outcomes back into Wiki/semantic layer.

Exit gate: the loop has a measurable signal or a scheduled review to collect one.

### 9. Close

Before stopping:

- Linear issue updated.
- Wiki updated.
- PR merged or left with a clear blocker.
- `main` synced when merges happened.
- Local worktree clean or intentionally documented.
- Next task identified by issue ID.
- Handoff/manifest updated if the work spans sessions.

Exit gate: a new worker can continue without reconstructing context from chat.

## Completion States

- `Captured`: idea exists, not yet grounded.
- `Grounded`: Wiki/Linear/repo context checked.
- `Designed`: implementation path and verification path defined.
- `Built`: implementation exists.
- `Integrated`: product/agent can actually use it.
- `Verified`: required checks passed.
- `Preview Ready`: ready for stakeholder review.
- `Production Ready`: safe to promote.
- `Production Live`: live and confirmed.
- `Observed`: usage or health signal captured.
- `Closed`: Linear/Wiki/handoff complete.
- `Blocked`: cannot proceed without named missing input, credential, approval, or failing check.

## Non-Negotiable Gates

- No code is complete without integration.
- No integration is complete without registration.
- No registration is complete without verification.
- No verification is complete without evidence.
- No production claim is valid without CI/build/deploy proof.
- No session is complete until Linear and Wiki are updated.
- No client-facing output ships without evidence, consent, licensing, brand, QA, and approval gates.
- No publishing or ad spend occurs without explicit approval flags.

## Linear Close Comment Template

```md
Close the Loop update:

State: <Captured | Grounded | Designed | Built | Integrated | Verified | Preview Ready | Production Ready | Production Live | Observed | Closed | Blocked>

What changed:
- <plain-English outcome>

Evidence:
- PR: <url or N/A>
- Commit: <sha or N/A>
- Preview/production: <url or N/A>
- Wiki: <links>

Verification:
- <command/check>: <pass/fail/N/A>
- <browser/route check>: <pass/fail/N/A>
- <agent/tool registration>: <pass/fail/N/A>

Remaining blockers:
- <none or exact blocker>

Next issue:
- <Linear ID or none>
```

## Weekly Health Review

Margot/Hermes should review the following weekly:

- Open Linear issues marked production-ready but not closed.
- Built features with no agent/tool registration.
- Wiki pages updated but not embedded or linked.
- PRs merged without Linear close comments.
- Features with no usage or health signal.
- Semantic layer stale pages and low-coverage knowledge areas.

Output: one short “Close the Loop Exceptions” brief with blockers and owners.

## Related

- [[client-user-journey]]
- [[proactive-gamification-layer]]
- [[production-readiness-checklist]]
- [[schema-layer]]
- [[unite-autonomous-command-center-authority-2026-05-19]]
