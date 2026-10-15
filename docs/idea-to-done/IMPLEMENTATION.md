# Unite-Group idea-to-DONE implementation handoff

15/10/2026 · Developer/operator handoff · Current continuation locally verified; full product acceptance remains open.

The existing product is `CleanExpo/Unite-Group`, with `apps/web` as its canonical application. This increment extends its founder mission desk, task storage, intent acceptance, signed branch approval and runner. It does not build the submitted cleaning/restoration simulation.

## Accepted inputs and provenance

The [accepted product definition](PRODUCT_DEFINITION.md) and [evidence/acceptance matrix](EVIDENCE_AND_ACCEPTANCE.md) are verbatim snapshots of the 15 October 2026 inputs from the original local `D:\Pi-CEO\docs\idea-to-done` bundle. Reviewers can read the requirements and AT-01–AT-20 in this repository. The snapshots retain their original proposal/documentation-only status, historical “Nexus” naming and observations from before application discovery. They define the requested outcome; they do not establish current implementation, completed acceptance or the current product identity.

Relative references inside those snapshots preserve their original bundle meaning. The linked acceptance matrix is included here; the following supporting material remains local to the originating bundle and is not a public or committed source in this checkout:

- `SOURCE_INTAKE.txt`: the user-supplied original intake attachment.
- `NEXT_BUILD_PROMPT.md` and `DELIVERY_CHECK.md`: the original build prompt and documentation-delivery check.
- `../../SETUP.md`: the original staging workspace's setup document.
- `../nexus-command-center/NEXUS_AUTONOMOUS_COMMAND_CENTER_SPEC.md`, `AGENT_OPERATING_CONTRACT.md` and `cc_schema_apply.sql`: original proposed architecture, operating contract and schema references.

These historical supporting links require access to that original local bundle; no placeholder files, replacement source evidence or public URLs have been invented. The two committed inputs are sufficient to inspect the accepted product scope and acceptance criteria. Current implementation and proof limits are described below and in [VALIDATION.md](VALIDATION.md).

Grounded 15/10/2026: the founder route renders the existing mission desk — `apps/web/src/app/(founder)/founder/command-centre/page.tsx:69`.

Waterline: Class 1 · Stage LOCALLY_VERIFIED (rung 2/12 Build) · AA — suitable scoped candidate, bound to the final local source snapshot in [VALIDATION.md](VALIDATION.md). A candidate commit and its remote CI remain pending. No merge, production, customer or payment outcome is claimed here.

## Operator path

Open the authenticated `/founder/command-centre` route. Choose **New idea**, enter **Idea title** and **Rough idea**, then **Save idea for research**. Capture preserves the original input in the existing founder-scoped task queue and creates an inert research mission. It neither calls a paid model nor dispatches a builder. **Existing delivery preparation** remains available separately and uses the configured existing AI path when available; account access and allowance are not established by this handoff.

Select the saved mission and choose **Open research and outcome workbench**:

1. Record the research mandate, permitted sources/accounts, source allowance and spend limit. In **Request bounded research**, load the saved requests, choose allowed public domains, source-admission limit, time and turns, then explicitly **Approve and queue research**. This creates signed research-only permission for the current idea/mandate; queueing does not prove an available worker or remaining monthly allowance.
2. An opted-in registered Windows worker can execute the queued run through the supported Claude subscription CLI. Refresh research to inspect checkpoints, blockers and **Proposed findings — awaiting your review**. Use **Cancel research request** or **Retry within the approved research boundaries** where eligible. Review selected proposal items in the existing evidence ledger; proposals do not automatically change claims, approve briefs or start a build. Manual provenance, classifications, contradictions, rights and consequential decisions remain editable.
3. Propose a brief with user, payer, objective, design, acceptance criteria, target repository/main and all 13 research outputs. Each output must contain a finding or an explicit blocked/deferred/not-applicable explanation. The service hashes the complete snapshot and retains previous briefs.
4. Choose **Approve this research brief** for that exact version. Material changes invalidate the approval and draft handoff. Exported prompt/manifest remain explicitly non-executable and grant only `research_brief_only` authority.
5. Choose **Prepare reviewed brief for build**. The saved brief becomes the existing delivery specification deterministically, without a paid preparation call or invented Board verdict. Exactly one active registered project must match the approved repository. Draft and accept `intent.md` through the existing intent panel; its deterministic research path includes the brief hash and revision.
6. Use the existing **Approve this build** action for signed `branch_preview_only` consent. Research approval and intent acceptance alone do not establish runner eligibility. The existing automatic intent-to-authority path retains its admission conditions; this increment does not fabricate Board admission. Runner checks require the current reviewed brief, matching specification, accepted intent binding and valid signed approval. Merge, release, outreach and charging retain separate authority.
7. Save the commercial outcome contract, then choose **Check connected delivery and payment evidence**. Read the independent evidence milestones and blockers rather than treating task status or a draft PR as DONE.

A revised approved brief can prepare a new specification on the **same non-terminal task**, including after an earlier builder report. Preparation archives that prior report as an idempotent task event before replacing it, clears old build/assignment/approval state and requires fresh consent. Archive failure blocks replacement. A canonical `task.status === 'done'` remains terminal: material revision/preparation returns HTTP 409 and directs the operator to capture a new idea. No successor task is silently cloned. Exact approval revocation remains possible during guarded execution.

## Shared service and reuse

| Entry point or file | Responsibility |
|---|---|
| [FounderDesk.tsx](../../apps/web/src/app/(founder)/founder/command-centre/FounderDesk.tsx), [MissionDetail.tsx](../../apps/web/src/app/(founder)/founder/command-centre/MissionDetail.tsx), [MissionLifecycle.tsx](../../apps/web/src/app/(founder)/founder/command-centre/MissionLifecycle.tsx) | Existing desk entry, research capture/forms, current mission detail and evidence milestones |
| [Lifecycle route](../../apps/web/src/app/api/command-centre/missions/lifecycle/route.ts) | Authenticated `GET` and `POST` at `/api/command-centre/missions/lifecycle`; server-derived actor, bounded JSON, origin checks, conflict/error responses and `refresh_proof` |
| [idea-lifecycle.ts](../../apps/web/src/lib/command-centre/idea-lifecycle.ts) | Validated transitions, revision/hash-bound brief approval, redacted draft exports and conservative milestone calculation |
| [idea-lifecycle-store.ts](../../apps/web/src/lib/command-centre/idea-lifecycle-store.ts) | Existing `cc_tasks` metadata, request idempotency, founder scoping, compare-and-swap/read-back and signed provider proof with durable audit confirmation |
| [MissionResearch.tsx](../../apps/web/src/app/(founder)/founder/command-centre/MissionResearch.tsx), [research owner route](../../apps/web/src/app/api/command-centre/missions/research/route.ts) | Explicit research consent and founder-scoped `GET`/`POST` at `/api/command-centre/missions/research`; start/cancel/retry and proposal review |
| [idea-research.ts](../../apps/web/src/lib/command-centre/idea-research.ts), [idea-research-store.ts](../../apps/web/src/lib/command-centre/idea-research-store.ts) | Bounded signed research authority, leases, request reservations, checkpoints, cancellation, usage reconciliation and guarded task metadata |
| [Research runner route](../../apps/web/src/app/api/agents/runner/research/route.ts) | Existing shared-bearer and registered-contained-runner gate at `/api/agents/runner/research`; claim/heartbeat/checkpoint/finish/block |
| [research.mjs](../../scripts/nexus-runner/research.mjs), [research-containment.ps1](../../scripts/nexus-runner/research-containment.ps1) | Opt-in serial Windows research worker and native Job Object process broker |
| [Mission route](../../apps/web/src/app/api/command-centre/missions/route.ts), [delivery-prepare.ts](../../apps/web/src/lib/command-centre/delivery-prepare.ts) | Existing preparation/approval path and reviewed-brief projection |
| [Intent route](../../apps/web/src/app/api/command-centre/intent/route.ts), [intent.ts](../../apps/web/src/lib/command-centre/intent.ts) | Existing intent draft/accept API and deterministic research intent |
| [delivery-store.ts](../../apps/web/src/lib/command-centre/delivery-store.ts), [runner-claim.ts](../../apps/web/src/lib/command-centre/runner-claim.ts) | Existing signed consent and runner eligibility; stale/revoked research authority cannot fall back to legacy approval |
| [idea-lifecycle-observations.ts](../../apps/web/src/lib/command-centre/idea-lifecycle-observations.ts), [delivery-observations.ts](../../apps/web/src/lib/command-centre/delivery-observations.ts) | Read-only server provider observations; reuse existing GitHub and Stripe access |
| [idea-lifecycle-status.mjs](../../scripts/idea-lifecycle-status.mjs) | Compact read-only terminal view of the same authenticated service |

This increment adds no dependencies or schema migration and provides no automatic paid API fallback. It reuses existing server accessors and signing configuration. Access is runtime-specific; observed account metadata and its limits are recorded in [VALIDATION.md](VALIDATION.md). Do not put account tokens into idea text, briefs or exported prompts.

DB gate (15/10/2026): a read-only schema inspection of existing project `lksfwktwtmyznckodsau` confirmed `cc_tasks.metadata`, `external_ref`, `updated_at`, the unique `(founder_id, external_ref)` constraint, founder-scoped task/event/approval policies and compatible existing check constraints. The raw `schema-gate-receipt.json` is retained with the [local validation receipts](VALIDATION.md). This inspection changed no production data or schema and does not prove an authenticated application journey.

Proof is bound to the task, founder, brief/outcome and delivery context. A pending audit remains durable and retryable but cannot project as trusted evidence. Changed context or tampering invalidates proof. Browser commands cannot submit provider proof, actor identity or completion status.

## Bounded research operation

Research authority is separate from build authority and binds the founder, task, run, idea revision, frozen input/mandate hashes, public domains and limits. Current limits are 1–25 retained sources, 1–30 minutes, 1–12 turns and concurrency one. The source limit caps evidence admitted to findings, not page fetches or subscription consumption. Remaining monthly credits stay unknown and no paid API fallback is permitted.

The opt-in command, from the repository root on a supported Windows host, is:

```powershell
node scripts/nexus-runner/research.mjs --once --task-id $taskId --run-id $runId
```

Set `$taskId` and `$runId` to the saved mission/run UUIDs. The worker reads existing `NEXUS_APP_URL`, `AGENT_EVENTS_SECRET` and optional `RUNNER_ID`; the latter defaults to the hostname plus `-public-research`. The server also uses existing `FOUNDER_USER_ID`, `MISSION_PROVENANCE_SECRET`, `MISSION_LANE_CONTAINMENT`, `MISSION_LANE_CONTAINED_RUNNERS` and `MISSION_LANE_HARD_STOP`. These are existing configuration names, not credentials to copy into prompts. The server's contained-runner registry is an operator grant, not remote kernel attestation.

Before claiming, the worker requires Windows, a local native `claude.exe`, supported restrictive CLI flags and first-party `claude.ai` subscription login metadata. It uses a fresh temporary directory and a child environment that retains OS/keychain access while stripping inherited provider/repository configuration. Only `WebSearch` and allowed-domain `WebFetch` are offered; shell/files/build/MCP/account actions are excluded. The prompt travels through UTF-8 stdin; remaining native arguments are checked against the Windows command-line limit before creation. The native child starts suspended, is assigned to a Job Object before execution and cannot break away. Timeout, parent exit and worker stop use process-tree containment. A local `.claude/HARD_STOP` marker under the user's home is checked by presence before preparation/auth/claim and while running; its contents are not read. Unsupported hosts fail before claiming; this is not a macOS worker implementation.

The server grants a 90-second lease. The worker renews/checkpoints approximately every 20 seconds. The first claim fixes a deadline that retries cannot extend and reserves the full turn allowance until durable final provider usage is reconciled. Sequence/usage counters advance monotonically; exact checkpoint and finish replays are idempotent, while changed payloads or another lease are rejected. Recovery requires explicit owner retry, a current mandate, remaining time/turns and an expired worker lease; unknown interrupted usage blocks reuse rather than replenishing allowance. A run permits at most three claims. Cancellation clears the lease; the worker stops when its next guarded heartbeat/checkpoint is refused. Scope/revision changes also invalidate permission.

Completed results remain `untrusted_research_proposal`: claims are hypotheses/assumptions, and source/rights assertions remain unverified until reviewed. Recorded CLI tool observations distinguish a successful matching fetch from a proposed or search-discovered URL; neither proves the truth of a claim. Claude's output format can emit a reply-only `StructuredOutput` event ([official cookbook](https://platform.claude.com/cookbook/claude-agent-sdk-scheduled-repository-reviewer-scheduled-repository-reviewer)); the worker accepts its narrow configured-schema protocol and binds its payload hash to the final structured result without granting an additional operational tool. The final local worker checks and a standalone real monthly-provider smoke passed: one approved WebFetch, reply-only StructuredOutput, one proposed source and unchanged server-schema acceptance. This proves provider/formatter compatibility within that smoke; an authenticated queued application job, connected enrolled worker and complete research journey remain unproven in [VALIDATION.md](VALIDATION.md).

## GitHub check evidence

The trusted observer now reads branch protection, active rulesets, exact-head check runs and legacy statuses, then reuses the existing release-controller gate. GitHub Actions evidence additionally binds the registered CI workflow, run attempt, job, suite and head SHA. It rechecks the PR/policy/check snapshot before retaining proof; incomplete, unsupported, stale or failed coverage cannot become a passing gate. Independent review still requires a trusted exact-commit review producer with verified provenance: `reviewApproved` remains false. A green check cannot establish review, release or full product completion.

## Terminal usage

From the repository root, with the local application already running and a valid founder session supplied through the operator-managed `UG_SESSION_COOKIE` environment variable:

```powershell
node scripts/idea-lifecycle-status.mjs --task-id <saved-task-uuid> --cookie-env UG_SESSION_COOKIE --origin http://127.0.0.1:3008 --json
```

Replace `<saved-task-uuid>` with the captured mission UUID. The CLI reads `GET /api/command-centre/missions/lifecycle?taskId=…&view=status`; it has no separate database and makes no mutations. The compact response excludes raw intake and full research/brief text while preserving revision, brief binding, checkpoint, source allowance, blockers and milestones. HTTPS is required for remote origins; redirects, credential-bearing URLs and terminal control characters are rejected or sanitised.

The CLI contract and example argument shape are covered by local mocked tests. An authenticated end-to-end invocation against a running deployment has not been verified by this documentation task.

## Acceptance boundaries

The [accepted definition](PRODUCT_DEFINITION.md) and [AT-01–AT-20 matrix](EVIDENCE_AND_ACCEPTANCE.md) are included as the unchanged source inputs described above. Source and fixture tests support portions of that contract; they do not establish that every acceptance scenario has passed operationally.

| Contract area | Implemented local behaviour / evidence source | Remaining proof or capability |
|---|---|---|
| AT-01–AT-04: capture, shared state, evidence | Lifecycle/domain/store/API tests cover partial and domain-neutral input, preserved raw text, idempotency, owner isolation, stale edits, classifications and contradictions. | Authenticated web/terminal walkthrough and real storage recovery rehearsal |
| AT-05–AT-07: bounded research and pack | Explicit research consent, signed bounded runs, Windows subscription worker, leases/checkpoints/cancel/retry, untrusted proposals, source admission and all 13 brief outputs are implemented. | Authenticated queued application job, connected enrolled worker, complete research journey, reviewed evidence pack and provider allowance evidence; the standalone provider smoke is narrower and monthly credit/spend enforcement is not claimed |
| AT-08–AT-11: approval, handoff, effects | Hash/revision binding, redacted exports, revocation, existing branch approval/runner checks and audited proof are implemented. | Real harness dispatch and external synchronisation/outage reconciliation |
| AT-12–AT-13: engineering and merge | Server adapter observes a bound PR's repository/main/head/merge identity and configured exact-commit required CI with provider provenance and stale-snapshot rejection. | Trusted independent-review producer/eligibility remains unconnected (`reviewApproved` stays false). Current local gates passed; a candidate commit, matching remote CI and real main merge remain pending. |
| AT-14–AT-16: release and activation | Domain fixtures require release/merge identity, a successful core journey and defined activation. | Trusted live-journey and activation adapters; real release, recovery, onboarding and activation evidence |
| AT-17–AT-19: payment and outcomes | Read-only Stripe adapter checks account/product, captured live one-off Checkout payments, window/currency, replay and refund/dispute state. Bounded/incomplete reads fail closed. Domain fixtures retain conservative client eligibility. | Subscription renewals and mixed-product baskets are unsupported. No live provider payment, customer or commercial outcome has been proven. No new payment webhook or acquisition automation is supplied. |
| AT-20: operator usability | Component tests and isolated responsive fixture review cover local controls and rendering. | Founder UAT, full authenticated journey and proposed ten-minute review benchmark |

“Net” currently means captured amount less recorded refunds, before provider fees. Any refund or dispute excludes that payment from eligible-client counting. Customer distinctness uses Stripe customer IDs, not independently established legal buyers. Payment observations cannot produce DONE without the missing engineering, release and activation proof.

## Verification references

The documentation task ran `node --test scripts/__tests__/idea-lifecycle-status.test.mjs` under the selected Node v24.14.1 runtime: **10 passed, 0 failed** (exit 0). Tests exercise the command parser, mocked authenticated request, compact state parity, bounded response, safe error output and nonzero failures. No live cookie or provider credential was used.

The implementation's focused suites are `idea-lifecycle.test.ts`, `idea-lifecycle-store.test.ts`, `idea-lifecycle-observations.test.ts`, lifecycle API `route.test.ts`, intent API `route.test.ts`, `runner-authority-envelope.test.ts`, `MissionLifecycle.test.tsx` and `FounderDesk.test.tsx`, plus existing authority/continuation tests affected by the integration. See [validation and receipt boundaries](VALIDATION.md) for executed checks, final gate status and remaining blockers; test file presence alone is not a passing result.

The full idea-to-DONE flow remains open until real provider and customer evidence satisfies the accepted outcome contract. Local fixture success cannot substitute for main merge, release, live use or payment.
