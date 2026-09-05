# Proposed Pi delivery linkage

05/09/2026 · Design of the next bounded connection; not an existing API contract, implementation, permission grant or instruction to change Pi-Dev-Ops. Current work stays in the canonical Unite-Group repository. Full requested finish line remains a verified customer/internal result.

## Observed substrate and constraint

Read-only Pi revision `10ce51c2f0b0a46e1cd7532bf76f9773813731c5` has `POST /api/spec-pipeline/run` with proposal and dry_run (default true), plus list/detail. Its actual SPM produces a 19-section specification and its pipeline can proceed through Judge, Board, build, tests/static review and gated PR/merge. Sources: `app/server/routes/spec_pipeline.py`, `app/server/spec_pipeline/{__init__,spm_runner,review_runner,ship_gate}.py`.

It uses Pi's checkout and configured global GITHUB_REPO. It does not accept this product's durable mission ID, frozen spec/revision, per-request repository, signed consent, idempotency key or callback binding. The Unite-Group proxy currently permits pipeline list/run but not per-pipeline detail. Static review is not an independent acceptance verifier; merge and legacy ship timestamps are not deployed live outcomes. Runtime execution has not been established. Therefore forwarding founder ideas to the existing run endpoint is not a valid bridge.

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
| Durable status retrieval | Correlated status/artifact read that survives process restart; authenticate reads and scope to the canonical mission. Reconcile the existing proxy's detail-route gap only after the response contract is defined. |
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

Grounded 05/09/2026: current Pi request contains proposal/dry_run, not this proposed correlation contract — https://github.com/CleanExpo/Pi-Dev-Ops/blob/10ce51c2f0b0a46e1cd7532bf76f9773813731c5/app/server/routes/spec_pipeline.py#L20.
Waterline: Class 1 · Stage PLANNED (rung 1/12 Design) · A — evidence: read-only source review and proposed seam; no Pi mutation, activation or runtime success claimed.
