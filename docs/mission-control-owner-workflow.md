# Mission Control owner workflow

05/09/2026 · Local implementation candidate. This describes the current code and its operating boundary; it is not a deployment or end-to-end delivery claim.

## What Phill can ask for

Mission Control's Founder Desk accepts an idea in everyday language. Optional capability buttons add requirements and acceptance checks to a visible specification. Phill does not need command syntax, an engineering plan or a manually chosen agent roster. Saved missions show their current stage, next action, result reference and blockers. The Operations view presents the same missions and stages.

The implemented path is:

**Idea → context and questions → proposed specification and specialist roles → explicit consent for that exact branch build → existing runner → draft PR → read-only evidence observations.**

The final steps the owner requested—an SPM retaining full responsibility through independent verification, authorised release and a checked customer/internal outcome—are not yet connected in this candidate. A build assignment ends at the review handoff. The interface must keep that boundary visible.

## Actual workflow and controls

1. **Prepare.** The founder submits an idea, optional project and selected allowlisted preset IDs. Each preset contributes defined requirements/checks and dependency/readiness information. Selection does not connect an account, run code or authorise execution. Intake persists through the existing founder-scoped `cc_tasks` authority.
2. **Resolve context.** Preparation reads the project registry, up to five recent founder-scoped project tasks, and a bounded search of saved knowledge notes. It reads at most three matched notes with excerpts up to 800 characters each. Source references, read state, coverage and saved-note update times remain visible; a note's update time does not prove its underlying claims are current. Other conversations are not searched. Notes are untrusted evidence, never instructions or approval authority.
3. **Ask only needed questions.** If the project or business intent is unresolved, Margot presents specific questions. Current answers are saved before continuing. A zero-question result continues automatically. Provider failure cannot silently turn a generic fallback into a successful specification.
4. **Prepare the spec and recommendation.** The saved specification contains requirements, acceptance criteria, steps and preset choices. Recommended specialists are labelled recommendations. Board opinions are not independently running agents, owner consent or independent delivery verification.
5. **Authorise the exact build.** The authenticated founder reviews the specification and approves that version for a branch preview. A server-signed envelope binds mission, founder, revision/fingerprint, target and scope. Material revisions require a fresh decision; preparation alone grants no execution authority. The supported build target is currently `CleanExpo/Unite-Group`; other project/domain ideas remain captured with a concrete connection blocker.
6. **Run within scope.** The existing contained runner claims eligible work only after receipt validation. Its actual checkout origin must match the permitted repository. It receives the frozen requirements, checks and recommended duties. An accepted build-SPM assignment is scoped to branch work and review handoff; it is not the full-delivery SPM assignment.
7. **Hand back the PR.** A valid final PR marker is a builder-reported artifact. New software missions move to review/awaiting approval and release the claim. They do not become delivered. Build approval cannot requeue an already-built specification. Legacy/non-software completion semantics remain separate.
8. **Inspect evidence.** Refresh reads GitHub observations for the saved mission, registered repository and PR. Checks, commit statuses, reviews and deployment observations show their coverage and SHA binding. A failed commit status remains visible beside passing checks. These observations neither authorise release nor prove independent full review or an authenticated live journey.

## Existing endpoints and file map

These endpoints exist in the candidate; the exact request schema in code is authoritative.

| Endpoint | Purpose and boundary |
| --- | --- |
| `GET /api/command-centre/missions` | Authenticated saved mission projection and presets. Current list covers the latest 100 founder tasks; older missions may be absent. |
| `POST /api/command-centre/missions` | `prepare` with clientRequestId/idea/optional projectKey/presetIds; `resume` with taskId/optional answers; `approve` with taskId/specVersion. Strict request validation; the browser cannot supply authoritative stage or signature. |
| `POST /api/command-centre/missions/observations` | Read-only refresh accepting taskId only. Server resolves repository/PR; browser verdicts, arbitrary URLs and provider writes are excluded. |
| `POST /api/agents/runner/claim` and `/release` | Existing authenticated contained-runner protocol; claim release is not a product deployment. |
| Existing `/api/command-centre/queue` routes | Existing queue, task and approval surfaces. New delivery missions retain their signed exact-spec admission rules across alternate callers. |
| Existing `/api/command-centre/lanes/software/build` and `/lanes/content/build` | Preserved legacy service wrappers. |

| File group | Responsibility |
| --- | --- |
| `apps/web/src/app/(founder)/founder/command-centre/` | FounderDesk, MargotMissionConsole, MissionDetail, MissionObservations, home composition and scoped stylesheet; existing shell/navigation retained. |
| `apps/web/src/lib/command-centre/delivery-types.ts`, `delivery-presets.ts` | Validated metadata/request contract and preset catalogue. |
| `delivery-prepare.ts`, `delivery-store.ts`, `delivery-view.ts` in the same directory | Preparation phases, durable guarded persistence, signing, exact-spec checks and evidence-honest projection. |
| `delivery-observations.ts` | Bounded GitHub reads tied to saved project/PR/head; not a deployment executor or live verifier. |
| `delivery-context.ts` | Reuses knowledge search and founder-scoped note reads with explicit limits and provenance. |
| `scripts/nexus-runner/runner.mjs` and related claim/release code | Frozen-spec runner prompt, target check, scoped build assignment and PR handoff compatibility. |

## Operator contract

Keep the single existing task authority and founder scope. Preparation uses guarded revisions/leases: only a current lease may persist its accepted result. An expired in-flight model call may overlap a replacement; this is not exactly-once external provider execution. Retries must not create duplicate accepted phases or execute a revised draft under old consent.

The signature authenticates the approval envelope. It does not establish broad immunity to privileged direct-database rollback of an old same-task packet; monotonic server-owned consumption/revocation freshness is not proven by this candidate. Do not describe that threat as solved or treat database writers as untrusted browser clients with equivalent guarantees.

Do not use this guide as a command to arm a runner or modify production. Diagnose the actual target/runtime before deciding it lacks configuration. Use existing secure configuration and least-privilege account paths; never paste, print, commit or request secret values in a mission, log, screenshot or handoff. A missing signing/provider/runner connection must fail explicitly. A merge must not silently arm new execution.

All release, database application, merge and external-effect rules remain governed by their exact target and authority. Prepare concrete changes/evidence first; ask Phill only for a genuinely missing business decision or reserved authority. The delivery team owns technical troubleshooting and handoffs.

## What remains connected only in part

- **Full-delivery SPM:** the current accepted assignment is build-only. A persistent review/rework/release/recovery owner must be connected and exercised on the same mission.
- **Independent outcome reviewer:** GitHub signals and Pi static review are not a trusted acceptance review. A reviewer must bind its actual checks and verdict to the frozen spec and artifact SHA.
- **Project runners:** current build scope is Unite-Group. Other businesses require explicit permitted target mapping and a contained supported executor, not a project name interpolated into a path.
- **Release and live verification:** resolve each real project's deployment workflow/authority, then retain provider receipt and authenticated user-journey evidence. No current “shipped” label should be inferred from PR or merge.
- **History and voice:** saved-note and recent-task retrieval is bounded; comprehensive conversation retrieval remains unconnected. Existing voice intake and mission-bridge code must be integrated with this exact mission/spec identity; the composer has no microphone connection.
- **Business, campaigns and finance:** preserved links/readers require source-specific runtime verification. An authenticated page or zero total does not establish account connectivity or correct reconciled data.

Pi-Dev-Ops contains a source-level SPM/planning/build/PR-merge pipeline, but it targets its own checkout/global repository and lacks this mission's target/spec/consent/idempotency/callback contract. Its runtime is unverified. The [proposed Pi linkage](mission-control-pi-delivery-bridge.md) records the existing source and precise integration requirements. It does not authorise invoking Pi as a generic executor or activating another queue.

**Known runtime prerequisite, observed 05/09/2026:** the authenticated production [portfolio page](https://unite-group.in/founder/command-centre/portfolio) showed repository HTTP 401 responses and degraded/unreadable repository status. GitHub read access must be diagnosed and verified in that runtime before connected repository evidence can be claimed. The rejection's cause is unresolved; no credential or configuration was changed by the read-only observation. Do not infer expiry or a missing account from the response alone.

## Preview and verification boundary

The local `.mission-preview` harness renders real frontend components using sample responses. It is useful for interaction, layout, keyboard and theme checks. It is not an authenticated product session, real database write, provider call, runner execution or live delivery. Its sample rows must stay recognisable as preview data.

Use the final exact-SHA verification receipt for test counts, commands, browser results and limitations. Focused component tests and a sample preview do not replace the integrated gauntlet, authenticated runtime rehearsal or live acceptance.

Read-only authenticated navigation on 05/09/2026 reached the existing production home and Bookkeeper/Campaigns pages. This observed the old deployment, not this candidate. Bookkeeper's run state/zero totals and an empty campaign list do not establish provider connectivity or financial correctness. Candidate release needs its own deployment-specific and authenticated journey evidence.

Grounded 05/09/2026: candidate mission API validates prepare/resume/approve actions and returns founder-scoped projections — `apps/web/src/app/api/command-centre/missions/route.ts`.
Grounded 05/09/2026: full-delivery owner remains required and review needs independent release/live checks — `apps/web/src/lib/command-centre/delivery-view.ts`.
Waterline: Class 1 · Stage EXECUTING (rung 2/12 Build) · A — evidence: local code/documentation and scoped unbound test/visual receipts; integrated runtime and release acceptance remain unclaimed.
