# Hermes Senior Board Continuity — Architecture and Acceptance Contract

**Date:** 24/07/2026\
**Owner:** Phill McGurk\
**Chief of Staff / architecture owner:** Margot (`default` Hermes profile)\
**Canonical repository:** `CleanExpo/Unite-Group`\
**Status:** **PROPOSED — architecture approval required before runtime code, service installation, credential migration, or live task admission**\
**Approval phrase:** `approve architecture HSBC-1`

## 1. Executive decision

Hermes becomes the senior operating board and continuity conductor. Codex and Claude remain specialist execution and independent-review runtimes. They do not become competing sources of truth and they do not autonomously converse in an unbounded loop.

The system will operate as one bounded, durable orchestra:

1. Phill gives intent to Margot/Hermes from the MacBook, Telegram, or Nexus.
2. Hermes challenges and frames the mission against the exit thesis and current operational priorities.
3. The CRM mission ledger stores the authoritative task, risk, approval state, cancellation state, and expected outcome.
4. Hermes Kanban projects the next executable work item and assigns the right profile, model family, machine, tools, and limits.
5. Claude usually builds; Codex usually reviews independently; deterministic tests outrank both.
6. Every transition writes a provider-neutral handoff and evidence receipt.
7. The Mac mini owns durable scheduling and continuation after the isolated runtime gates pass.
8. The MacBook remains Phill's cockpit and approval surface; it must not need to stay awake.
9. Merge, production, spend, credentials/privileges, external publication, and destructive actions always stop for Phill.

**Continuous means the queue and recovery mechanism remain alive. It does not mean an unbounded model conversation or unrestricted autonomy.**

## 2. Why previous connection work did not produce continuity

The current estate contains useful pieces, but they are deliberately or accidentally disconnected:

- The default Hermes gateway is healthy and launchd-managed. Its model is OpenAI Codex, but that means Codex powers Hermes reasoning; it does not join the separate ChatGPT/Codex application session.
- Hermes has a durable Kanban and dispatcher, but it currently has zero running tasks. The `empire` orchestrator profile is configured but stopped when idle. `auto_decompose` is off.
- The dedicated `ownest` profile exists as a bounded MoA configuration, but the reviewed repository explicitly blocks it from becoming a live worker until dedicated-UID isolation, brokered credentials, and independent verification exist.
- A separate `claude-continuous` LaunchAgent polls `~/2nd-brain/Decisions/continuous-work-queue.jsonl`. It invokes Claude with read-only tools against a research worktree. It is not attached to CRM task authority, Hermes Kanban, Codex, or the Mac mini. It can produce proposed review artefacts, not run the empire.
- A Codex automation periodically inspects the same research worktree. That repository's own instructions prohibit implementation and describe its architecture as research-only. The automation is therefore a peer-check loop, not an execution dispatcher.
- Codex can currently reach the Second Brain MCP. Claude's equivalent Second Brain MCP reports a failed connection. The two model lanes therefore do not receive equivalent governed context.
- Hermes, Codex, and Claude each hold separate session histories, MCP inventories, process lifecycles, and completion definitions.
- The current user-level agent processes share Phill's macOS UID. That is not a credential boundary: any autonomous child running as the same user can potentially recover user-readable browser, SSH, repository, and profile material.

The disconnect is therefore not one missing toggle. It is the absence of one approved authority model, one durable mission envelope, one dispatcher, one safe worker boundary, and one completion receipt.

## 3. North-Star test

This architecture supports the $2B acquisition path only if it does all three:

1. **Execution leverage:** routine low/medium-risk work continues without Phill repeatedly re-explaining, re-routing, or restarting it.
2. **Acquirable moat:** Unite Group can demonstrate governed multi-agent operations with audit evidence, not just a collection of subscriptions and scripts.
3. **Founder protection:** production, client, financial, credential, legal, and reputation risk remain controlled by explicit human authority.

If the system merely increases model activity, token spend, or unreadable task volume, it has failed.

## 4. Checkable win condition

The continuity system is accepted only when all of the following are proven with real receipts:

1. A founder message becomes a versioned mission ID and board packet within 60 seconds.
2. The packet contains the real objective, business target, risk, authority, non-goals, done criteria, evidence requirements, current source commit, and next 15–20 anticipated moves.
3. A repeated intake or retry resolves to the same active attempt rather than creating duplicate work.
4. Hermes assigns exactly one active owner, machine, worktree, lease, and deadline per executable step.
5. The preferred builder produces an artefact on an isolated branch/worktree and returns an exact diff plus fresh test output.
6. An independent model family reviews the frozen candidate commit without trusting the builder's summary.
7. Deterministic verification passes after the candidate is frozen. A model verdict cannot override a failing deterministic gate.
8. A completion receipt records mission, attempt, provider route, model family, machine, source commit, candidate commit, commands, exit codes, artefact digests, verifier verdict, and next action without secrets or raw private content.
9. Closing the MacBook does not stop an admitted task. The Mac mini continues it and the MacBook can recover the current state from the ledger.
10. Killing the worker mid-step causes lease expiry and safe recovery within ten minutes, with no duplicate external action.
11. Restarting the Mac mini restores queued and active state from durable storage without depending on a chat transcript.
12. A broken Claude, Codex, Second Brain, GitHub, Linear, or network route becomes a visible blocker and bounded fallback decision, not silent success.
13. Merge, deployment, production database mutation, spend, credential/privilege action, external publication, and destructive action remain impossible without the matching approval.
14. Five consecutive supervised end-to-end canaries complete with zero duplicate execution, zero missing evidence, zero policy escape, and successful stop/recovery before unattended low-risk admission is proposed.

## 5. Authority model — one truth per concern

| Concern | Authoritative system | Projection / executor | Non-negotiable rule |
|---|---|---|---|
| Exit doctrine and business knowledge | 2nd Brain / Wiki | Hermes board packet | Read before strategy; cite page IDs and revisions |
| Mission priority, risk, approval, cancellation and outcome | CRM `cc_tasks` plus task events/evidence | Hermes Kanban, Linear, GitHub | No projection may promote, reopen, or complete the mission independently |
| Executive judgement and routing | Hermes Senior Board | Margot + Empire + bounded advisory board | Must emit a five-part mission contract |
| Executable work state | Hermes Kanban | machine worker adapters | Kanban is a disposable execution projection, not business authority |
| Engineering delivery | Git branch/worktree and PR | Codex/Claude workers | One task, one branch from fresh `main`, one PR targeting `main` |
| Deterministic truth | Tests, CI, schema/policy checks and hashes | verifier service | Failed hard gate outranks every model opinion |
| Independent quality/safety opinion | Different model family and trust domain | Claude or Codex reviewer, never the generator | Generator cannot approve its own completion |
| Production authority | Phill | deployment/merge tools | Explicit typed approval only |

Linear remains an engineering projection. The Wiki remains knowledge. Neither becomes a second queue.

## 6. Senior Board roster

### 6.1 Margot — Chair and Chief of Staff (`default`)

**Inputs:** Phill's message, Wiki-first context, current mission state, live evidence.\
**Outputs:** challenged objective, decision packet, approval request where required, executive brief.\
**Authority:** frame and prioritise; create or update proposed/queued missions; pause work.\
**Must not:** merge, deploy, spend, disclose credentials, or invent evidence.\
**Escalates when:** the request is strategically unclear, consequential, contradictory, or outside standing authority.

### 6.2 Empire — Chief Operating Orchestrator (`empire`)

**Inputs:** approved mission envelope and current receipts.\
**Outputs:** dependency graph, machine and agent assignments, bounded next actions, recovery decisions.\
**Authority:** dispatch approval-free low/medium-risk work inside the mission envelope.\
**Must not:** change business priority or approval state; widen scope; self-approve completion.\
**Escalates when:** policy conflicts, retry/dead-letter limits, missing evidence, or new consequential action appear.

### 6.3 OWNEST Advisory Board (`ownest`)

**Inputs:** high-value decision packet with redacted evidence.\
**Outputs:** multi-model recommendation, dissent, assumptions, and proposed gate.\
**Authority:** advisory only until the isolated runtime is separately built and admitted.\
**Must not:** operate as a continuous same-UID service or claim that profile health proves execution capacity.\
**Escalates when:** advisors disagree materially or the evidence is insufficient.

### 6.4 Machine supervisors

- `empire-mac`: future Mac mini worker supervisor. Must have `verify_on_stop=true` before admission.
- `empire-laptop-win` and `empire-tower-win`: optional Windows capability lanes, not sources of truth.
- No machine profile may inherit broad credentials merely because it can authenticate to Hermes.

### 6.5 Specialist runtimes

**Claude — primary builder**

- Best for scoped implementation, tests, repository analysis, and repair loops.
- Receives a frozen mission pack and isolated worktree.
- Returns candidate commit, exact diff, commands, exit codes, and unresolved risks.
- Has no merge, deployment, production DB, credential, publication, or branch-protection authority.

**Codex — independent reviewer by default**

- Reviews the frozen Claude candidate from a different model family.
- Receives the original mission and evidence, not only Claude's narrative.
- Starts read-only; it may create a separate repair candidate only when explicitly reassigned.
- Cannot approve work it authored.

Roles may reverse for a task, but generator and final model reviewer must remain different families.
For Board release voting under §16, this pairing is fixed and does not reverse: Claude is bound as
builder and excluded from voting on its own work; Codex is the eligible reviewer.

### 6.6 Deterministic verifier

A non-model verifier independently reruns the pinned checks, computes artefact hashes, validates receipt structure, checks branch/base and policy gates, and produces the only machine-valid completion precondition. It cannot merge or deploy.

## 7. Machine topology

```text
Phill / MacBook cockpit / Telegram
                 |
                 v
       Hermes default — Margot Chair
                 |
                 v
        CRM authoritative mission ledger
                 |
                 v
        Hermes Empire orchestrator
                 |
       +---------+----------+
       |                    |
       v                    v
Mac mini durable host   Approval / exception queue
       |
       +--> dedicated worker identity --> Claude builder worktree
       |
       +--> separate verifier domain --> deterministic gates
       |
       +--> independent model lane ----> Codex review
       |
       +--> receipt/event reconciliation --> CRM + Wiki links
```

### MacBook

- Founder cockpit, voice/intake, review and approvals.
- May run a supervised development pilot.
- Must not be required to stay awake for admitted continuous work.

### Mac mini

- Durable gateway/dispatcher host after inventory and promotion.
- Runs heartbeat, queue reconciliation, lease recovery, bounded worker launch, and receipt collection.
- Uses a dedicated non-interactive worker identity with a sealed HOME/workspace.
- Does not receive broad user credentials or SSH agent forwarding.

### Tailscale

- Private transport and device identity only; it is not task authority.
- MacBook-to-Mac-mini administration uses named devices and least-privilege ACL/tag policy.
- No secrets in host aliases, prompts, task packets, or receipts.
- Loss of Tailscale connectivity must not corrupt local task state; it becomes a visible communication blocker.

## 8. Runtime boundary required before continuous execution

The earlier OWNEST design correctly blocked same-user launchd execution. The replacement must provide all of these controls:

1. dedicated macOS service account or equivalently strong isolated runtime identity;
2. sealed HOME and mission-scoped workspace inaccessible to unrelated user data;
3. immutable/pinned Hermes and worker executable digests;
4. fixed-argument process spawning with no shell interpolation;
5. an allowlisted tool and filesystem policy;
6. deny-by-default network egress, opened only for mission-required endpoints;
7. operation-scoped broker tokens instead of reusable Supabase service-role, GitHub PAT, browser, SSH, deployment, social, payment, or email credentials;
8. no inheritance of broad `.env` files or ambient cloud selectors;
9. route attestation for Codex ChatGPT login and Claude subscription/API billing class;
10. a separately operated verifier that the worker cannot modify or impersonate;
11. a STOP path that cancels admission, prevents new child processes, terminates descendants, expires leases, and preserves evidence;
12. a tested rollback that does not create plaintext credential backups.

A process name, profile label, environment allowlist, or `chmod 600` file under the same UID does not satisfy this boundary.

## 9. Provider-neutral mission and handoff contracts

### Mission packet

```yaml
schema: nexus.mission.v1
mission_id: uuid
idempotency_key: string
intent:
  stated_request: string
  real_objective: string
  exit_thesis_link: string
  outcome_definition: string
  non_goals: [string]
authority:
  risk: low|medium|high|critical
  allowed_mutations: [string]
  prohibited_mutations: [string]
  approval_gates: [production, spend, privilege, external, destructive, merge]
context:
  project: string
  repo: string
  base_commit: sha
  wiki_sources: [page-id@revision]
  task_sources: [uri]
work:
  owner_profile: string
  machine_role: string
  worktree_id: string
  lease_expires_at: timestamp
  max_runtime_seconds: integer
  max_iterations: integer
  anticipated_moves: [string]
verification:
  deterministic_commands: [argv-array]
  required_model_families: [openai, anthropic]
  evidence_requirements: [string]
```

### Handoff receipt

```yaml
schema: nexus.handoff.v1
mission_id: uuid
attempt_id: uuid
phase: planned|building|candidate|reviewing|verified|gated|failed
actor:
  profile: string
  machine_id: string
  provider_route: string
  model_family: string
source:
  base_commit: sha
  candidate_commit: sha|null
  diff_digest: sha256|null
evidence:
  commands: [{argv: [string], exit_code: integer, output_uri: string}]
  artefacts: [{uri: string, sha256: string}]
  tests: [{name: string, status: pass|fail|blocked, receipt_uri: string}]
verdict:
  status: continue|candidate|approved|gated|failed
  reasons: [string]
  next_action: string
security:
  redaction_passed: boolean
  policy_passed: boolean
```

Raw tokens, passwords, browser contents, private-screen captures, and unrestricted logs are prohibited.

## 10. Dispatch and recovery protocol

Each dispatcher tick is reconcile-first:

1. Read the authoritative mission and current attempt.
2. Verify cancellation, approval, risk, dependency, budget, and isolation gates.
3. Reconcile the known worker/kanban state before creating anything.
4. Renew or reclaim a valid lease with compare-and-swap semantics.
5. Resolve the machine through capability, online state, current load, and risk ceiling.
6. Create or recover the same idempotent Hermes projection.
7. Launch exactly one bounded worker in exactly one isolated worktree.
8. Record heartbeat and phase transitions only when state changes.
9. On candidate, freeze the commit and stop builder mutation.
10. Rerun deterministic checks outside the builder process.
11. Send the frozen candidate to an independent model-family reviewer.
12. Validate receipt digests and model-family separation.
13. Reconcile verified evidence to CRM and link material knowledge into the Wiki.
14. If the next action is inside authority, enqueue it; otherwise create one concise approval/blocker packet.

Crash points are expected. Repeating a tick must recover the same state, never duplicate the external action.

## 11. Safety gates

Always requires Phill's typed approval:

- merge to `main`;
- production deploy or promotion;
- production database mutation;
- payment, purchase, contract, invoice, or spend outside an approved envelope;
- credential disclosure, rotation, revocation, or privilege grant;
- customer/person-facing email, message, social publication, or legal submission;
- destructive deletion, access-control change, branch-protection change, or irreversible external action;
- widening canary concurrency, project scope, allowed tools, network endpoints, or risk class.

The global kill switch must fail closed. Routine retries do not become founder work; unresolved policy decisions do.

## 12. Eighteen-move implementation sequence

1. Ratify this architecture, acceptance criteria, migration boundary, and test strategy.
2. Freeze and record the existing MacBook services, profiles, hooks, MCPs, queues, and credential-name surfaces without reading values.
3. Discover and read-only inventory the Mac mini over Tailscale after explicit terminal approval.
4. Freeze the one-ledger rule: CRM authority, Hermes execution projection, Wiki knowledge, Git delivery, Linear engineering projection.
5. Define the Senior Board five-part contracts and routing policy in versioned configuration.
6. Repair Claude's Second Brain MCP and prove equivalent source retrieval in Hermes, Codex, and Claude.
7. Define and test the provider-neutral mission, handoff, receipt, lease, heartbeat, and machine-capability schemas.
8. Build RED continuity tests against an offline fixture: duplicate intake, crash, stale lease, malformed receipt, self-review, secret request, gated action, and unavailable route.
9. Build the deterministic local dispatcher core with fake worker adapters; no network, secrets, service, or live CRM.
10. Add Codex and Claude adapter contracts with attested billing route, fixed argv, bounded runtime, redacted output, and no merge/deploy authority.
11. Build the Mac mini dedicated worker identity, sealed workspace, pinned binaries, and deny-by-default egress/tool boundary.
12. Build the operation-scoped local broker and eliminate reliance on general service-role or broad user credentials.
13. Build the independent verifier in a separate identity/trust domain and prove the worker cannot forge completion.
14. Wire the Mac mini dispatcher as a disabled service with a tested STOP/rollback path.
15. Run one supervised offline mission through Hermes → Claude → deterministic verifier → Codex → receipt, with no external mutation.
16. Run fault injection: kill worker, duplicate tick, MacBook sleep, Tailscale loss, Mac mini restart, model outage, MCP outage, malformed evidence, and policy attack.
17. Run five supervised low-risk canaries at concurrency one; retain exact receipts and investigate every intervention.
18. Present a widening packet. Only a new typed approval may enable unattended low-risk admission; merge/deploy and all consequential gates remain manual.

## 13. Verification strategy

### Offline contract tests

- mission schema rejects missing authority, source commit, done criteria, or evidence requirements;
- deterministic idempotency returns one active attempt;
- lease compare-and-swap prevents two workers;
- stale lease recovers safely;
- cancellation stops before dispatch and propagates to descendants;
- malformed/unsigned receipt cannot complete a task;
- same-family self-review cannot approve completion;
- secret-like content is rejected/redacted;
- gated verbs remain gated even when embedded in task text;
- worker and verifier identities cannot write each other's state.

### Supervised integration tests

- Hermes creates one fixture mission and one Kanban projection;
- Claude produces a candidate commit in a disposable worktree;
- deterministic verifier reruns fresh checks;
- Codex reviews the frozen candidate independently;
- a valid receipt returns to the mission ledger;
- restarting the local dispatcher resumes from the ledger, not from chat history.

### Mac mini continuity tests

- MacBook can disconnect after admission;
- Mac mini continues the bounded task;
- Tailscale loss does not lose or corrupt state;
- Mac mini restart recovers queue and leases;
- STOP finishes within 60 seconds and leaves the ledger/evidence intact;
- no duplicate worker or external action appears after recovery.

## 14. Migration and coexistence

Until promotion:

- the current Hermes default gateway remains the founder intake edge;
- the existing `claude-continuous` research loop remains separate and must not be mistaken for the new control plane;
- the Codex peer-loop automation remains read-only and must not become a second dispatcher;
- OWNEST remains advisory/design-only;
- no new always-on worker is installed;
- no existing credential backup is copied, moved, rotated, or removed;
- no production schema or service is changed.

At cutover, the new dispatcher must first operate in observe-only mode, then shadow mode, then supervised canary. Competing queue consumers must be paused only after the new path proves equivalent state and rollback; nothing is deleted during initial cutover.

## 15. Decision required

Approval of `HSBC-1` authorises the next bounded tranche only:

1. read-only Mac mini/Tailscale inventory;
2. exact RED test creation in a fresh branch/worktree;
3. offline dispatcher and schema work with fake adapters;
4. a design for dedicated-UID isolation, brokered operations, and independent verification.

It does **not** authorise service installation, credential migration, live CRM admission, production mutation, merge, deployment, publication, spend, or widening autonomy.

## 16. Board release authority for verified PRs (founder ruling 24/07/2026)

Distinct from, and additional to, the `approve architecture HSBC-1` gate in §15. Recorded in
`docs/constitution/ADDENDUM-001-board-release-authority-for-verified-prs-v1.0.md` and linked from
EPIC-000's Amendments table.

**The ruling.** A PR that completes the full check → reject → rework process to closure, meets every
required criterion, receives 100% approval from the eligible Board roster
(`docs/constitution/board-release-roster.v1.json` — currently Margot-chair, Empire-orchestrator, and
Codex-reviewer; Claude is the builder on most PRs and cannot self-approve, OWNEST remains
advisory-only per §6.3, and the deterministic verifier is a required check rather than a vote), and
complies with the governing constitution is authorised by the founder for **automatic progression**.
Board decision authority substitutes for a blanket founder pause at this one checkpoint only.

**What does not change.** Human/founder merge remains the default (§11's `merge_to_main` and
`production_deploy` rows, the repo-wide `pr-release-gate` skill and the CLAUDE.md "Global PR release
law"). The single exception is the founder-ratified UG-AUTONOMY-001 mandate: a deterministic,
fail-closed controller may perform an automatic exact-HEAD merge for `CleanExpo/Unite-Group`,
`CleanExpo/CARSI` and `CleanExpo/RestoreAssist` only, and only after every gate passes (verified
build, standalone Codex independent review, 100% hash-bound Board approval, all required checks,
tested rollback, and the constitutional verifier). Protected and governing changes — anything
touching `docs/constitution/` or `tools/board-release-verifier/`, including this verifier candidate
itself — remain founder-manual and can never self-authorise. Five stops remain founder-only
regardless of Board approval: new direct cost, constitutional change, a missing credential or
privilege only Phill can grant, an unresolved authority conflict, and any irreversible action
without tested rollback. Deployment remains separately founder-only and is never authorised by the
controller. A `BOARD_RELEASE_READY` verdict from `tools/board-release-verifier/verifier.py` is
evidence a human merge-approver may use; `merge_authorised` is consumed only by the separate
controller inside the UG-AUTONOMY-001 scope and never authorises deployment.

**Verification.** `tools/board-release-verifier/verifier.py` validates a release receipt bound to repo,
PR, `base=main`, an exact 40-character HEAD, the constitution's SHA-256, the eligible roster's SHA-256,
exactly one `APPROVE` decision per eligible member, all required checks passed, every rejection closed
with evidence and a successor/review reference, no direct-spend or constitutional-change flag, and an
unexpired timestamp — failing closed on any missing, duplicate, unknown, dissenting, pending, stale, or
malformed input. It never calls `gh`/`git push`/merge/deploy, and its output always states that this
runtime's separate production merge/deploy control still applies.

**Scope.** This ruling does not itself authorise anything in the plan's
`promotion_policy.explicitly_not_authorised` list (service installation, credential migration, live CRM
admission, production mutation, merge, deployment, publication, spend, unattended execution) — those
remain gated exactly as before. The 18-move sequence in §12 is unchanged by this ruling.
