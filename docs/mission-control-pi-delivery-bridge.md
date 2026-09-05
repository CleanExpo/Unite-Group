# Proposed Pi delivery linkage

05/09/2026 · Design of the next bounded connection; not an existing API contract, implementation, permission grant or instruction to change Pi-Dev-Ops. Current work stays in the canonical Unite-Group repository. Full requested finish line remains a verified customer/internal result.

## Observed substrate and constraint

Read-only Pi source review at fetched `origin/main` revision `68b3d35243bfc7e794f5048f3e8b964ee6a4271b` confirms the following capabilities. This is source evidence, not proof of the deployed revision or a successful runtime invocation.

| Existing Pi entry point | Actual contract and limit |
| --- | --- |
| `POST /api/spec-pipeline/run` | Authenticated request with `proposal` (10–8000 characters) and `dry_run` (default `true`). Returns a new pipeline ID and starts background planning. Explicit `dry_run: true` performs evidence gathering, Judge/SPM and board review, then stops before build, PR, merge or shipping. It still makes provider calls and writes filesystem artifacts/observability; Judge can block before the full SPM pass. |
| `spm_runner.run_spm(proposal, judge_report)` | Actual model call returning spec markdown and a goal-command string, without executing that command. Its prompt assumes a genuinely approved Judge report; do not fabricate approval. No standalone HTTP endpoint exposes this function. |
| `spm_runner.run_spm_gap_resolution(...)` | Actual SPM model pass accepting the current Judge gaps, board memo and gap resolutions. Returns an amendment, scope and verification packet without starting execution. No standalone HTTP endpoint exposes this function. |
| Pipeline list/detail | Backend reads persisted metadata; detail exposes a handoff-exists flag, not the generated SPM markdown. Artifacts are stored under Pi's `.harness/spec-pipelines/`; persistent deployment storage is unverified. |

Sources: Pi `app/server/routes/spec_pipeline.py:20,59`, `app/server/spec_pipeline/__init__.py:61,270`, `app/server/spec_pipeline/spm_runner.py:23,38`, `app/server/spec_pipeline/persistence.py`. The direct Python `run_pipeline` function defaults to execution enabled (`dry_run=False`), unlike the HTTP request model; callers must not confuse these defaults.

Repository context and automatic evidence gathering use Pi's checkout and its configured global `GITHUB_REPO`. The request does not accept this product's durable mission ID, frozen spec/revision, per-request repository, signed consent, idempotency key or callback binding. Naming Unite-Group in a proposal does not change that checkout. The SPM receives text; it does not independently browse the founder interface. A real Unite-Group walkthrough must supply observed routes, interactions, version and evidence.

**The proxy exists in Pi's dashboard, not Unite-Group `apps/web`.** Pi `dashboard/app/api/pi-ceo/[...path]/route.ts` forwards to its configured `PI_CEO_URL`. Its `dashboard/lib/pi-ceo-proxy-allowlist.ts` allows pipeline list/run but excludes per-pipeline detail, although `SpecPipelinePanel` tries to poll it. Pi's dashboard session and signed backend session are separate from Unite-Group founder authentication. Runtime host configuration and artifact retrieval must be verified before a bridge is claimed.

Unite-Group's existing `/api/pi/route` produces a routing packet and `/api/pi/workflows` projects manifest/evidence state; neither calls this SPM. Its `build_spm` assignment belongs to the contained branch/review runner, not full delivery ownership. Static review is not an independent acceptance verifier; merge and legacy ship timestamps are not deployed live outcomes. Therefore forwarding founder ideas to the existing run endpoint is not a valid bridge.

## Smallest safe seam

Keep `cc_tasks` as the owner of mission/spec/approval/stage/evidence. Treat Pi first as an optional **planning provider** returning an artifact to that mission, with execution disabled. This allows reuse of its SPM/Judge expertise without substituting Pi's globally targeted executor for the current contained runner. Do not add a second claim queue. Promote any execution connection only after the target and authority contract below is implemented and tested.

The following fields/behaviour are proposals, not asserted existing endpoints:

| Required addition | Contract and test |
| --- | --- |
| Mission correlation | Stable caller mission ID and invocation ID; spec revision/fingerprint and outcome class attached to every artifact/event. Reject cross-mission or stale results. |
| Frozen input | Read the exact approved requirements/checks/scope; Pi cannot silently regenerate a different executable spec. Planning changes return a new draft for the canonical revision/consent process. |
| Target binding | Registry-resolved repository/ref and isolated checkout identity; no fallback to Pi/global GITHUB_REPO. Verify actual origin before any write. Wrong/unregistered target fails before execution. |
| Scoped signed consent | Domain-separated server-verified target/spec/action envelope plus trusted issuer/expiry/revocation/consumption handling. Planning consent cannot imply build/merge/release. Explicitly address same-task old-envelope rollback; a valid signature alone is insufficient freshness. |
| Idempotency and leases | Stable mission/revision/action invocation key, durable accepted/rejected/result receipt and bounded lease recovery. Retry returns the existing invocation; stale provider output cannot commit a new phase. Do not claim exactly-once external calls. |
| Durable status retrieval | Correlated status/artifact read that survives process restart; authenticate reads and scope to the canonical mission. Reconcile Pi dashboard's detail-route gap only after the response contract is defined; Unite-Group still needs its own authenticated adapter. |
| Verified result callback | Authenticated, replay-protected event receipt bound to invocation/spec/repo/commit; canonical service validates and reads back before stage advance. Polling reconciliation repairs missed callbacks. No browser-submitted verdict or arbitrary callback destination. |
| Actual SPM continuation | Record accepted full-delivery responsibility, next action, recovery owner and timeout/escalation. After PR, use independent review and controlled rework contracts; never recycle first-build approval into a second execution. |
| Independent review | Trusted verifier records scope, reviewer identity/checklist, exact SHA/spec, failures and receipt. Keep Pi static review as its actual narrower signal. |
| Deployment and live acceptance | Separate exact-target release adapter/authority, provider deployment receipt, recovery packet and trusted authenticated outcome walk. GitHub merge is only integration evidence. |

## Proposed delivery sequence

1. Build a Unite-Group-side adapter contract and fixtures for planning-only correlation; verify Pi's exact supported read/runtime/auth path without invoking execution. Return its spec as a proposed artifact with source and limits.
2. In a separately authorised Pi change, add only the correlation/idempotency/result contract needed for that planning seam. Keep default execution off. Repo ownership rules prohibit making those edits silently from this build.
3. Exercise one correlated planning request and restart/retry recovery, then review target/consent semantics before any execution adapter. Reuse the existing Unite-Group runner if it already satisfies the build job.
4. Connect independent review and SPM continuation to the canonical mission. Exercise stopped/failed/stale states and explicit controlled rework.
5. Integrate a real project's governed release and authenticated outcome verifier. Close full acceptance only with exact-version live receipts, not a successful bridge response.

No founder engineering work is required by these steps. The delivery team resolves service compatibility and produces concrete reviewable changes. Only an actual reserved decision/authority or founder-held connection should be escalated, with evidence and plain-language next action.

The current owner walkthrough and uncompleted recovery work are recorded in [Mission Control owner walkthrough](mission-control-owner-walkthrough.md). A local SPM workflow is not an invocation of Pi's remote SPM service.

Grounded 05/09/2026: reviewed Pi source contains proposal/dry_run, not this proposed correlation contract — https://github.com/CleanExpo/Pi-Dev-Ops/blob/68b3d35243bfc7e794f5048f3e8b964ee6a4271b/app/server/routes/spec_pipeline.py#L20.
Waterline: Class 1 · Stage PLANNED (rung 1/12 Design) · A — evidence: read-only source review and proposed seam; no Pi mutation, activation or runtime success claimed.
