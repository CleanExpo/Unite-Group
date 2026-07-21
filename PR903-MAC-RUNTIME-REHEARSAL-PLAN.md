# PR #903 Mac post-clearance runtime rehearsal plan

Generated: 2026-07-21T19:38:07Z · Horizon: 18 moves · Current authority: L0 specification only

## Verdict

`PR903_MAC_RUNTIME_REHEARSAL_PLAN_REPAIRED`

## Win condition

- [auto] Static authorities and immutable PR/base/head/governed dependency scope are exact and supersession is resolved
- [auto] Every future runtime command has platform/shell/executable/target/order/exit/output-hash receipt binding
- [auto+human] First launch, relaunch, clean profile, failure/offline, UI/accessibility and cleanup scenarios have fail-closed acceptance
- [auto] 18-move graph is acyclic/reachable and every L1-L3 action is dominated by explicit Phill gates
- [human] PR approval, signing, notarisation, publication, merge and deployment remain detached and non-automatic

## Frozen board state

- Immutable identity: `CleanExpo/Unite-Group` PR `903`; current base `8e30cabe2811ba270777076a16dc817f6aaa3efd`; repaired exact source head `b2a283decbe69aa16b422eb4636a8ddf2d9e86ec`; governed scope exactly `PR903-MAC-RUNTIME-REHEARSAL-PLAN.md`, `apps/web/package.json`, `apps/web/pnpm-lock.yaml`, `apps/workspace/package.json`, `apps/workspace/pnpm-lock.yaml`, `packages/pi-ceo-operator-mcp/package-lock.json`, `packages/pi-ceo-operator-mcp/package.json`, `pr903-mac-command-receipt.schema.json`, `pr903-mac-rehearsal-trust-anchor.json`, `pr903-mac-runtime-rehearsal-plan.json`, `validate_pr903_mac_rehearsal_envelope.py`.
- Accepted canonical verdict is attachment 1101. Attachment 1098 is superseded and must never be used as authority.
- Portability manifest authority uses corrected attachment 1091 hash `2efbfcb2ec04090ad8e7aa37d625572eeed632337006e8eae71387a8580e0516`, not stale completion metadata.
- HARD_STOP start: present, inode 134511257, 0 bytes, mtime 1784200128, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- Business alignment: acquisition-grade repeatability/no false positives; Q2 agents-execute directive without bypassing founder gates; Nexus done means thoroughly tested, no bloat, no false positives, client-payable.

## The gap

Static evidence is accepted, but no exact-head Mac build, DMG/app identity, first launch, relaunch, clean-profile, offline/failure, operator UI/accessibility, process/log/crash, cleanup, or fresh non-author runtime envelope exists yet. This plan closes those evidence gaps only after deliberate clearance.

## Eight scenarios

- **S01 authority and identity preflight** (M01, M02, M03, M04) — Accept: exact packet/head/host; all gates present.
- **S02 DMG build and integrity** (M05, M06, M07, M08, M09, M10) — Accept: one exact unsigned arm64 DMG/app/executable; integrity and ownership proven.
- **S03 first launch** (M11) — Accept: unique owned PID, loopback readiness <=45s, route probes pass.
- **S04 relaunch** (M12) — Accept: new PID and fresh receipts; no stale state.
- **S05 clean profile** (M13) — Accept: run-owned profile only; no writes outside run root.
- **S06 offline and failure paths** (M14) — Accept: safe degraded UI/controlled 503/no secret leak; network state restored.
- **S07 gateway observation and operator accessibility** (M15, M16) — Accept: read-only gateway receipts plus keyboard/AX/visual acceptance.
- **S08 operability cleanup and review** (M17, M18) — Accept: no owned resources remain; envelope validates; non-author verdict recorded.

## The 18-move spine

1. **M01 — Revalidate accepted static authorities** (L0; gate `G-CONTRACT-AUTHORITY`) — Verify: All canonical hashes match; attachment 1098 remains explicitly superseded; no network or runtime. Planned command receipts: C01. Failure: `EVIDENCE_INCOMPLETE` absorbing, run-owned cleanup only.
2. **M02 — Verify deliberate HARD_STOP clearance** (L3_DECISION; gate `G-HARDSTOP-CLEARANCE`) — Verify: Human receipt names Phill, scope, time and exact packet; HARD_STOP is absent only after deliberate clearance. Planned command receipts: human gate only. Failure: `BLOCKED` absorbing, run-owned cleanup only.
3. **M03 — Read live PR identity and fail stale before runtime** (L0; gate `G-HARDSTOP-CLEARANCE`) — Verify: Live repository, PR, base, repaired source head and exact governed changed-path set equal immutable identity; mismatch returns STALE before checkout/install/build/mount/launch. Planned command receipts: C03. Failure: `STALE` absorbing, run-owned cleanup only.
4. **M04 — Capture Mac host and toolchain preflight** (L0; gate `G-RUNTIME-WINDOW`) — Verify: macOS version/build, arm64 architecture, free disk, shell, Node, pnpm, Git, hdiutil, codesign, spctl and capture-tool identities are recorded; unsupported host blocks. Planned command receipts: C04A, C04B, C04C, C04D. Failure: `BLOCKED` absorbing, run-owned cleanup only.
5. **M05 — Create run-owned exact-head source root and freeze source manifest** (L1; gate `G-RUNTIME-WINDOW`) — Verify: Fresh run root is owned by run_id; checkout resolves to exact head; changed-path and package manifests are hash-bound before dependencies. Planned command receipts: C05A, C05B, C05C. Failure: `BLOCKED` absorbing, run-owned cleanup only.
6. **M06 — Install frozen dependencies and run bounded prerequisites** (L1; gate `G-RUNTIME-WINDOW`) — Verify: pnpm lockfile is frozen; install, unit/type/lint/package prerequisites use declared scripts only; each step has a strict timeout and receipt. Planned command receipts: C06A, C06B. Failure: `REQUEST_CHANGES` absorbing, run-owned cleanup only.
7. **M07 — Build exactly one unsigned macOS arm64 DMG** (L1; gate `G-RUNTIME-WINDOW`) — Verify: Declared package script produces exactly one regular non-symlink DMG inside evidence root; build does not sign, notarise or publish. Planned command receipts: C07. Failure: `REQUEST_CHANGES` absorbing, run-owned cleanup only.
8. **M08 — Verify DMG identity, integrity, quarantine and pre-mount state** (L0; gate `G-RUNTIME-WINDOW`) — Verify: One contained regular non-symlink DMG has size, SHA-256, image verification, xattrs and existing-mount absence recorded; wrong/reused build fails. Planned command receipts: C08A, C08B, C08C, C08D. Failure: `REQUEST_CHANGES` absorbing, run-owned cleanup only.
9. **M09 — Mount one run-owned DMG read-only and non-browsing** (L1; gate `G-RUNTIME-WINDOW`) — Verify: hdiutil plist names one mountpoint bound to run_id; no Finder browse; ownership receipt exists before any detach can be attempted. Planned command receipts: C09. Failure: `BLOCKED` absorbing, run-owned cleanup only.
10. **M10 — Bind app, executable, signature, quarantine and architecture** (L0; gate `G-RUNTIME-WINDOW`) — Verify: Exactly one regular non-symlink .app is contained; CFBundleExecutable resolves inside it; executable hash and arm64 architecture match; codesign/spctl/xattr results are evidence, never silently treated as approval. Planned command receipts: C10A, C10B, C10C, C10D, C10E, C10F. Failure: `REQUEST_CHANGES` absorbing, run-owned cleanup only.
11. **M11 — Run first-launch scenario with bounded readiness** (L1; gate `G-RUNTIME-WINDOW`) — Verify: Executable launches from mounted app; unique PID/start identity is bound; loopback-only readiness reaches expected state inside 45 seconds or typed timeout; root/settings/ping/assets/fonts/CSS/DOM probes pass. Planned command receipts: C11A, C11B, C11C. Failure: `REQUEST_CHANGES` absorbing, run-owned cleanup only.
12. **M12 — Terminate owned PID and prove relaunch consistency** (L1; gate `G-RUNTIME-WINDOW`) — Verify: Only PID whose executable hash/start identity/run marker match is terminated; relaunch creates a new PID and preserves route, state and UI expectations without stale receipts. Planned command receipts: C12A, C12B. Failure: `REQUEST_CHANGES` absorbing, run-owned cleanup only.
13. **M13 — Run isolated clean-profile scenario** (L1; gate `G-RUNTIME-WINDOW`) — Verify: Run-owned HOME/TMPDIR/profile roots are empty before launch; app either honours isolation with no writes outside run root or returns BLOCKED; no real operator profile/config is touched. Planned command receipts: C13. Failure: `REQUEST_CHANGES` absorbing, run-owned cleanup only.
14. **M14 — Exercise offline, unavailable-gateway and no-secret-leak failure paths** (L1; gate `G-RUNTIME-WINDOW`) — Verify: C14A captures the gate-approved sole external/default-route interface and exact power/link/service/route pre-state. C14B proves transport success, exact HTTP 503, headers and frozen body schema separately. C14C isolates only the approved interface, proves all non-loopback external routes absent, observes the frozen offline UI and requires the frozen transport-failure class without relabelling HTTP 000 as 503. C14D runs from a mandatory finally path on success, failure, timeout and interruption; it restores exact captured state and requires post-state hash equality. Failure: `BLOCKED_OFFLINE_SCOPE`, `REQUEST_CHANGES` or `BLOCKED_ROLLBACK_FAILED` absorbing; no later move.
15. **M15 — Capture gateway, profile and config observations read-only** (L0; gate `G-RUNTIME-WINDOW`) — Verify: Resolved Hermes executable, default/empire gateway state, profile, board path and named config hash are receipts only; no config write, restart or dispatch occurs. Planned command receipts: C15A, C15B, C15C, C15D. Failure: `BLOCKED` absorbing, run-owned cleanup only.
16. **M16 — Verify operator UI and accessibility acceptance** (L1; gate `G-RUNTIME-WINDOW`) — Verify: Fresh route/state-bound screenshots cover first launch, relaunch, clean profile, offline and 503; keyboard-only traversal, visible focus, labels/roles, contrast, reduced motion, zoom and VoiceOver AX tree have explicit human verdicts. Planned command receipts: C16A, C16B. Failure: `REQUEST_CHANGES` absorbing, run-owned cleanup only.
17. **M17 — Freeze process, log, crash and bounded cleanup evidence** (L1; gate `G-RUNTIME-WINDOW`) — Verify: PID/start/executable/run ownership is rechecked before TERM/KILL escalation; crash reports and scoped logs are captured/redacted; only owned mount detaches; zero owned resources remain; unrelated resources unchanged. Planned command receipts: C17A, C17B, C17C, C17D. Failure: `REQUEST_CHANGES` absorbing, run-owned cleanup only.
18. **M18 — Freeze evidence envelope and obtain fresh non-author runtime verdict** (L0; gate `G-PR-APPROVAL`) — Verify: All command/gate/scenario receipts, screenshots and envelope hashes are complete; detached accepted validator passes; fresh non-author returns ACCEPTED/REQUEST_CHANGES/STALE/BLOCKED/EVIDENCE_INCOMPLETE; no PR approval/merge/deploy occurs automatically. Planned command receipts: C18A, C18B. Failure: `EVIDENCE_INCOMPLETE` absorbing, run-owned cleanup only.

## Gates and authority

- `G-HARDSTOP-CLEARANCE` — L3 · authority: Phill · automatic: false · deliberately clear HARD_STOP for this exact packet and head.
- `G-RUNTIME-WINDOW` — L3_DECISION_WITH_BOUNDED_L1_L2_EXECUTION · authority: Phill · automatic: false · approve bounded Mac build/runtime/network-isolation/cleanup window.
- `G-PR-APPROVAL` — L3 · authority: Phill plus fresh non-author runtime reviewer · automatic: false · approve PR after exact-head runtime envelope is accepted.
- `L3-SIGN` — L3 · authority: Phill · automatic: false · signing.
- `L3-NOTARISE` — L3 · authority: Phill · automatic: false · notarisation.
- `L3-PUBLISH` — L3 · authority: Phill · automatic: false · publication.
- `L3-MERGE` — L3 · authority: Phill · automatic: false · merge.
- `L3-DEPLOY` — L3 · authority: Phill · automatic: false · deployment.

The five accepted-packet release gates remain exactly signing, notarisation, publication, merge and deployment, all Phill-only and detached. HARD_STOP clearance, the bounded runtime window and PR approval are additional explicit human gates, not authority shortcuts.

## Command receipt contract

- Planned future command receipts: **45**; move success receipts: 18; absorbing failure receipts: 18; gate receipts: 8.
- Every command receipt binds macOS/version/build/arm64 host, zsh/version/UTF-8, requested and resolved executable/version/SHA-256, target kind/identity/hash, sequence and previous-receipt hash, NUL-delimited argv identity, gate approval/scope hashes, timeout/exit/signal, raw stdout/stderr byte counts and SHA-256, secret-scan count, pre/post-state hashes, owned resources and rollback receipt.
- Exit 0 proves command completion only. Each desired state is a separate predicate. Unknown/missing fields fail closed via `additionalProperties: false`.

## DMG/app and launch acceptance

- DMG: exactly one contained regular non-symlink unsigned arm64 rehearsal DMG; source-manifest bound; stat/hash/hdiutil verify/xattr; no prior mount; no signing/notarisation/publication claim.
- App: exactly one contained regular non-symlink `.app`; executable derived from Info.plist; executable contained, hash-bound and arm64; codesign, Gatekeeper and quarantine results recorded as observations against the declared unsigned expectation.
- First launch: unique run-owned PID and start identity; loopback-only listener; readiness ≤45s; root/settings/ping/assets/fonts/CSS/DOM and controlled-503 expectations.
- Relaunch: terminate only identity-bound PID; new PID and fresh receipts; no reused screenshot or route evidence.
- Clean profile: empty run-owned HOME/TMPDIR/user-data roots; any write outside run root is REQUEST_CHANGES; inability to isolate is BLOCKED rather than permission to touch real profile.

## Failure, offline and security acceptance

- Test-host network isolation requires the bounded runtime approval, captured pre-state and mandatory restoration. No production/network infrastructure is touched.
- Gateway unavailable and network offline must yield safe degraded UI/controlled 503, bounded timeout and no crash loop.
- Logs, UI, screenshots and receipts must contain zero raw credentials, tokens, cookies or secret values. Secure raw byte hashes remain authoritative; redacted derivatives are reviewable.

## Operator UI/accessibility acceptance

- State-bound screenshots: first launch, relaunch, clean profile, offline, gateway unavailable/503 and recovered state; each binds run_id, route/state, timestamp, viewport, file hash and prior receipt.
- Human checks: keyboard-only traversal, visible focus, accessible labels/roles, focus order, contrast, 200% zoom, reduced motion, error recovery and VoiceOver AX tree. Missing or stale visual evidence is REQUEST_CHANGES.

## Process/log/crash/cleanup

- Strict timeouts: host 30s; identity 60s; install/test 600s; build 900s; mount 120s; readiness 45s; route 5s; TERM 15s then owned-only force 5s; cleanup total 180s.
- Before signalling or detaching, re-prove PID/mount/run ownership. Capture scoped logs and crash reports. Unrelated processes/mounts/profiles remain untouched. Zero run-owned resources must remain.

## Branch points

- After M03: if identity mismatch → STALE terminal; else → M04.
- After M10: if signature or Gatekeeper result differs from declared unsigned expectation → REQUEST_CHANGES terminal; else → M11.
- After M13: if clean-profile isolation unsupported → BLOCKED without touching real profile; else → M14.
- After M18: if fresh non-author verdict is not ACCEPTED → absorbing typed terminal; else → await G-PR-APPROVAL.

## Red-team findings pulled forward

- stale head or changed scope → M03 returns STALE before checkout/install/build/mount/launch.
- wrong or reused DMG → M07-M10 bind source manifest, one contained DMG/app, hashes, architecture and receipt chain.
- reused screenshots or partial runtime → M16 binds run_id, state, route, capture time, viewport and prior receipt; M18 rejects missing scenarios.
- false green from exit 0 → desired-state predicates are separate from process exit and output hashes.
- PID reuse or unrelated cleanup → M12/M17 require PID start identity, executable hash and owner marker before signalling.
- secret leakage → M14/M17 require zero secret-scan matches and redacted derivatives while preserving raw hashes securely.
- offline test leaves host disconnected → pre-state receipt and restoration command are mandatory; failure becomes BLOCKED_ROLLBACK_FAILED.
- unsigned build confused with releasable artifact → M07 labels unsigned rehearsal-only; L3 sign/notarise/publish remain detached.

## Closed 45-command envelope and detached validator repair

- Exactly 45 canonical UTF-8 JSON receipts are required, with the contiguous command map frozen in `pr903-mac-rehearsal-trust-anchor.json`; no missing, duplicate, reordered or 46th member is accepted.
- Every receipt binds command, frozen plan hash, one run, move, scenario, exact repository/PR/base/head/governed-path digest, scenario target, non-null expected gate, sequence, NUL-delimited argv, timeout, exit/signal, raw byte counts/hashes and pre/post/owned/rollback state.
- Sequence 1 binds the non-null trust-anchor seed. Sequences 2–45 bind the SHA-256 of the immediately preceding complete canonical receipt bytes.
- `validate_pr903_mac_rehearsal_envelope.py` is detached and hash-bound. Its only accepted CLI is the exact ordered named-argument interface frozen in the JSON plan. It rejects unknown flags/positionals, duplicate/unknown JSON keys, wrong types, path escape, symlinks, non-regular files, trust-anchor mismatch, unexpected directory members and replay-ledger collisions.
- The trust anchor self-digest is computed over canonical JSON with `self_sha256` set to null, avoiding an impossible recursive byte hash while still freezing every trust-anchor field.

## Repaired C14 transport and restoration contract

- **C14A capture:** requires the gate-approved test interface, selected network service/device, exact current power/link state, default route, every active non-loopback interface/external route, gateway target, application route/body contract and canonical pre-state hash. If the interface is not the sole external/default-route path, return `BLOCKED_OFFLINE_SCOPE`.
- **C14B unavailable gateway:** records process exit, transport outcome, HTTP status, headers and body separately. Pass requires transport success, status exactly 503, exact frozen error schema and zero secret findings.
- **C14C approved-interface offline:** proves every non-loopback external route absent, observes the frozen offline UI and requires the frozen transport-failure class. HTTP 000 is not 503.
- **C14D restore:** mandatory finally/cleanup on success, failure, timeout and interruption; restore exact captured power/link/service/route state, re-read all fields and require post-state hash equals pre-state hash. Mismatch is `BLOCKED_ROLLBACK_FAILED` and forbids later moves.

## Current non-claims

- live GitHub identity was frozen at the authority head above; no runtime freshness is claimed after that snapshot.
- no repository checkout/install/build/test.
- no DMG mount or Electron/app launch.
- no browser/network/runtime/config/process/service mutation.
- no signing/notarisation/publication/PR approval/merge/deployment.
- no L1-L3 action.
- future commands are specifications and were not executed.

## Exact next dependency

Phill deliberately clears HARD_STOP and separately approves the bounded Mac runtime window; then an empire-mac runner executes this exact plan against a fresh live identity and a fresh non-author reviewer accepts the complete envelope before PR approval.
