# Unite-Group idea-to-DONE implementation handoff

15/10/2026 · Developer/operator handoff · Locally verified implementation; full product acceptance remains open.

The existing product is `CleanExpo/Unite-Group`, with `apps/web` as its canonical application. This increment extends its founder mission desk, task storage, intent acceptance, signed branch approval and runner. It does not build the submitted cleaning/restoration simulation. The earlier intake documents used “Nexus”; that name is historical context only.

Grounded 15/10/2026: the founder route renders the existing mission desk — `apps/web/src/app/(founder)/founder/command-centre/page.tsx:69`.

Waterline: Class 1 · Stage LOCALLY_VERIFIED (rung 3/12 Test) · AA — local checks bind the candidate file fingerprint in [VALIDATION.md](VALIDATION.md); no clean candidate commit receipt is asserted. No merge, production, customer or payment outcome is claimed here.

## Operator path

Open the authenticated `/founder/command-centre` route. Choose **New idea**, enter **Idea title** and **Rough idea**, then **Save idea for research**. Capture preserves the original input in the existing founder-scoped task queue and creates an inert research mission. It neither calls a paid model nor dispatches a builder. **Existing delivery preparation** remains available separately and uses the configured existing AI path when available; account access and allowance are not established by this handoff.

Select the saved mission and choose **Open research and outcome workbench**:

1. Record the research mandate, permitted sources/accounts, source allowance and spend limit. Save a partial, blocked or complete checkpoint with findings, next action and blockers. These are saved operator records; no automated research connection is implemented in this increment.
2. Add source provenance, limitations, reference annotations and rights status. Classify statements and retain supporting and contradictory source references. Record consequential open decisions. Saving a claim does not independently verify it.
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
| [Mission route](../../apps/web/src/app/api/command-centre/missions/route.ts), [delivery-prepare.ts](../../apps/web/src/lib/command-centre/delivery-prepare.ts) | Existing preparation/approval path and reviewed-brief projection |
| [Intent route](../../apps/web/src/app/api/command-centre/intent/route.ts), [intent.ts](../../apps/web/src/lib/command-centre/intent.ts) | Existing intent draft/accept API and deterministic research intent |
| [delivery-store.ts](../../apps/web/src/lib/command-centre/delivery-store.ts), [runner-claim.ts](../../apps/web/src/lib/command-centre/runner-claim.ts) | Existing signed consent and runner eligibility; stale/revoked research authority cannot fall back to legacy approval |
| [idea-lifecycle-observations.ts](../../apps/web/src/lib/command-centre/idea-lifecycle-observations.ts), [delivery-observations.ts](../../apps/web/src/lib/command-centre/delivery-observations.ts) | Read-only server provider observations; reuse existing GitHub and Stripe access |
| [idea-lifecycle-status.mjs](../../scripts/idea-lifecycle-status.mjs) | Compact read-only terminal view of the same authenticated service |

This increment adds no dependencies or schema migration and provides no automatic paid API fallback. It reuses existing server accessors and signing configuration. Missing access is visible; this handoff does not establish that credentials are configured or usable in any deployment. Do not put account tokens into idea text, briefs or exported prompts.

DB gate (15/10/2026): a read-only schema inspection of existing project `lksfwktwtmyznckodsau` confirmed `cc_tasks.metadata`, `external_ref`, `updated_at`, the unique `(founder_id, external_ref)` constraint, founder-scoped task/event/approval policies and compatible existing check constraints. The raw `schema-gate-receipt.json` is retained with the [local validation receipts](VALIDATION.md). This inspection changed no production data or schema and does not prove an authenticated application journey.

Proof is bound to the task, founder, brief/outcome and delivery context. A pending audit remains durable and retryable but cannot project as trusted evidence. Changed context or tampering invalidates proof. Browser commands cannot submit provider proof, actor identity or completion status.

## Terminal usage

From the repository root, with the local application already running and a valid founder session supplied through the operator-managed `UG_SESSION_COOKIE` environment variable:

```powershell
node scripts/idea-lifecycle-status.mjs --task-id <saved-task-uuid> --cookie-env UG_SESSION_COOKIE --origin http://127.0.0.1:3008 --json
```

Replace `<saved-task-uuid>` with the captured mission UUID. The CLI reads `GET /api/command-centre/missions/lifecycle?taskId=…&view=status`; it has no separate database and makes no mutations. The compact response excludes raw intake and full research/brief text while preserving revision, brief binding, checkpoint, source allowance, blockers and milestones. HTTPS is required for remote origins; redirects, credential-bearing URLs and terminal control characters are rejected or sanitised.

The CLI contract and example argument shape are covered by local mocked tests. An authenticated end-to-end invocation against a running deployment has not been verified by this documentation task.

## Acceptance boundaries

The accepted definition and AT-01–AT-20 matrix are in the originating `D:\Pi-CEO\docs\idea-to-done` bundle. Source and fixture tests support portions of that contract; they do not establish that every acceptance scenario has passed operationally.

| Contract area | Implemented local behaviour / evidence source | Remaining proof or capability |
|---|---|---|
| AT-01–AT-04: capture, shared state, evidence | Lifecycle/domain/store/API tests cover partial and domain-neutral input, preserved raw text, idempotency, owner isolation, stale edits, classifications and contradictions. | Authenticated web/terminal walkthrough and real storage recovery rehearsal |
| AT-05–AT-07: bounded research and pack | Mandate/source limits, checkpoints, explicit uncertainty and all 13 outputs are validated. | Supported automated research account connection, research scheduling/recovery, time/spend enforcement and real research findings |
| AT-08–AT-11: approval, handoff, effects | Hash/revision binding, redacted exports, revocation, existing branch approval/runner checks and audited proof are implemented. | Real harness dispatch and external synchronisation/outage reconciliation |
| AT-12–AT-13: engineering and merge | Server adapter can observe a bound PR's repository/main/head/merge identity; fixture tests reject unrelated proof. | Required-check policy and independent reviewer eligibility are deliberately unevaluated (`checksPassed` and `reviewApproved` remain false). No real merge receipt exists for this increment. |
| AT-14–AT-16: release and activation | Domain fixtures require release/merge identity, a successful core journey and defined activation. | Trusted live-journey and activation adapters; real release, recovery, onboarding and activation evidence |
| AT-17–AT-19: payment and outcomes | Read-only Stripe adapter checks account/product, captured live one-off Checkout payments, window/currency, replay and refund/dispute state. Bounded/incomplete reads fail closed. Domain fixtures retain conservative client eligibility. | Subscription renewals and mixed-product baskets are unsupported. No live provider payment, customer or commercial outcome has been proven. No new payment webhook or acquisition automation is supplied. |
| AT-20: operator usability | Component tests and isolated responsive fixture review cover local controls and rendering. | Founder UAT, full authenticated journey and proposed ten-minute review benchmark |

“Net” currently means captured amount less recorded refunds, before provider fees. Any refund or dispute excludes that payment from eligible-client counting. Customer distinctness uses Stripe customer IDs, not independently established legal buyers. Payment observations cannot produce DONE without the missing engineering, release and activation proof.

## Verification references

The documentation task ran `node --test scripts/__tests__/idea-lifecycle-status.test.mjs` under the selected Node v24.14.1 runtime: **10 passed, 0 failed** (exit 0). Tests exercise the command parser, mocked authenticated request, compact state parity, bounded response, safe error output and nonzero failures. No live cookie or provider credential was used.

The implementation's focused suites are `idea-lifecycle.test.ts`, `idea-lifecycle-store.test.ts`, `idea-lifecycle-observations.test.ts`, lifecycle API `route.test.ts`, intent API `route.test.ts`, `runner-authority-envelope.test.ts`, `MissionLifecycle.test.tsx` and `FounderDesk.test.tsx`, plus existing authority/continuation tests affected by the integration. See [validation and receipt boundaries](VALIDATION.md) for executed checks, final gate status and remaining blockers; test file presence alone is not a passing result.

The full idea-to-DONE flow remains open until real provider and customer evidence satisfies the accepted outcome contract. Local fixture success cannot substitute for main merge, release, live use or payment.
