# Portfolio drift and independent-worker pilot

Grounded 06/09/2026: `origin/main` was fetched in the clean audit clone and remained `ef59907537dfec0aab83e9e6be9ba928e15452b4`. This candidate was created from that revision in a separate worktree. No dirty portfolio root was changed.

## Scope

This local candidate gives Mission Control one fail-closed read model for registered repositories and the declared MacBook, Mac Mini and PC workers. It does not reconcile Git, dispatch work, provision credentials, contact another device or mutate an external system.

The registry tracks the official names GPT-6 Astra (`gpt-6-astra`) and Claude Fable 5.1 (`claude-fable-5-1`) as `unverified` candidates with official-source references. Entitlement, cost, quota and effective runtime access remain unverified until a separately authorised non-secret probe produces reproducible evidence.

Live discovery reports secure remote routes to the Mac Mini and Windows desktop; two desktop aliases resolve to the same host and therefore represent one worker, not two. The Mac Mini's existing Pi-Dev-Ops mesh heartbeat adapter is registered only as `unverified` diagnostic evidence. Its local diagnostic may report Codex, Claude and Hermes activity, but that does not authenticate device identity, enrol the worker or authorise execution.

The narrow canonical source is `.portfolio/CONTROL-PLANE.v1.json`. It governs only repository identity, permitted worktree roles, evidence admission and device identity. `SOURCE-OF-TRUTH.md` retains product-identity precedence. The older `.portfolio/PORTFOLIO.yaml` remains a product/deployment catalogue and cannot override either source.

## Repository preflight

The local CLI accepts an untracked JSON array of explicit worktree bindings:

```json
[
  {
    "projectId": "unite-group",
    "path": "/absolute/path/to/a/worktree",
    "role": "isolated_worktree",
    "ownerId": "operator-id"
  }
]
```

Run from `apps/web`:

```bash
pnpm portfolio:drift:preflight -- --device macbook --bindings /absolute/path/to/bindings.json
```

The collector uses direct `git -C <path> <arguments>` processes with no shell. It records the observed remote, repository/worktree identity, branch, base and head revisions, upstream reference and local ref-update freshness, ahead/behind, staged/unstaged/untracked/conflicted paths, generated residue, declared ownership, and a content-manifest hash. Receipts may be written only under ignored `.nexus/runtime/portfolio-drift/`, use exclusive-create mode `0600`, reject an existing path, and are read back byte-for-byte. Standard output never reveals the absolute receipt path.

An absent device attestation binding still produces an honest local receipt, but Mission Control classifies it `unproven`; it cannot become observed. The collector never fetches, pulls, rebases, resets, stashes, cleans, pushes or edits a repository.

Every active build session keeps an ignored `nexus.execution-lead.receipt.v1` beside the local manifest. Each phase records its actual start and finish, elapsed milliseconds, produced evidence, recoverable failure, blocker class and exact next automatic safe action. Timing starts when the discipline is activated; earlier time is `unmeasured`, never estimated. Recoverable failures trigger diagnosis, repair and rerun. A protected release action becomes `approval_pending`, not blocked or done. Time targets are experiments and cannot weaken verification.

## FREEZE/BASELINE mode

A baseline is a Mission Control-signed `nexus.portfolio.freeze-baseline.v1` envelope. It binds an explicit baseline ID and timestamp to sorted envelope hashes of the exact repository observations, worktree bindings, device enrolments, heartbeats, leases, checkpoints and durable jobs that were available. The projection compares that frozen set with the current manifest; added, removed or replaced evidence invalidates the baseline. The evidence-set hash and signature make a rewritten snapshot invalid even if someone recomputes the outer manifest hash.

Baseline files are created with exclusive-create semantics, mode `0600`, and byte-for-byte read-back. Reusing the same ID with identical bytes is idempotent; different evidence under the same ID is rejected. The mutable `current.json` projection does not replace an immutable baseline receipt.

The current local slice does not claim to freeze or stop a remote process. A registered machine without a fresh, attested heartbeat and Mission Control-signed enrolment remains `unknown`, `stale` or `offline`; its last verified checkpoint and job remain visible. New-work admission is denied unless the baseline, exact device enrolment and heartbeat are all valid and current. Dispatch remains disabled even for an eligible local admission.

## Independent workers

The contract separates durable state from device health:

- device heartbeats are signed by the registered device and bind device, worker, model, harness, sequence, timestamps, current job and checkpoint;
- Mission Control signs a time-bounded enrolment receipt for the exact device, worker and harness version before that worker is eligible for new work;
- Mission Control signs durable job and fenced lease records;
- the device signs checkpoints bound to the exact job, lease, worker and fencing token;
- an offline or stale heartbeat suppresses the current-worker claim but retains a verified durable job, checkpoint evidence, blocker and next action;
- an expired lease changes the durable job projection to `paused_offline` and requires a new fenced lease before continuation.

Missing keys, unknown devices, unapproved harnesses, future/expired time windows, reused sequences with conflicting content, bad signatures, changed hashes, stale observations, duplicate repo observations, wrong repository/worktree bindings, dirty files, generated residue, missing upstream, unproven fetch freshness, divergence, detached heads, inconsistent revisions, lease mismatch and checkpoint-fence mismatch cannot become observed. There is no `green` or `safe-to-release` state in this contract.

## Founder view

The founder-allow-listed, no-store endpoint is:

`GET /api/command-centre/portfolio-control-plane-status`

The Operations page replaces the static mesh panel with one collapsed summary. It lists exceptions rather than repeating every healthy-looking row, and shows baseline state, enrolled/active/stale/offline/unknown device counts, repository state, blocker, exact next safe action, preserved unknown work and durable offline work. Raw Git errors, credentials and absolute worktree paths are not projected to the browser.

States mean:

- `observed`: a fresh signed observation passed the identity and consistency contract; it is not release-ready;
- `stale`: previously signed evidence exceeded its freshness window;
- `offline`: a registered device heartbeat exceeded the offline boundary;
- `quarantined`: malformed, conflicting, dirty, diverged, forged or otherwise unsafe evidence;
- `unproven`: required evidence or its approved key binding is absent.

## Remaining boundary

This candidate is local-only. Real worker operation still requires approved device-key provisioning, a shared durable backend, authenticated heartbeat writers, replay storage, central lease/checkpoint persistence, independent exact-version review and the governed release chain. Remote command execution and repository reconciliation remain deliberately absent.

Waterline: Class 1 · local reversible candidate · no release authority exercised.
