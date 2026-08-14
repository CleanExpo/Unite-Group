# /minion — Bounded One-Shot Engineering Execution

> Executes a clear, bounded engineering packet through implementation, deterministic verification and **draft PR candidate creation** without routine mid-flight founder interaction.
>
> Minion is a worker protocol inside the `/spm` lifecycle. It is **not** a release authority and a draft PR is not DONE/COMPLETE.

## Usage

```text
/minion <bounded task description>
```

Use Minion for a single-domain or otherwise well-bounded implementation packet. Complex cross-domain missions belong in the Agent Harness under the same SPM mission.

## Step 0 — Resolve mission and authority

Before execution, identify:
- mission/task ID where available;
- current `/spm` lifecycle state;
- allowed and prohibited scope;
- candidate base SHA/worktree;
- required evidence;
- any real authority stop gate.

If the mission is already BUILD_AUTHORISED, do not restart a planning interview.

If material **product/business intent** is missing, return `BLOCKED_PRODUCT_DECISION` to SPM with the exact decision needed. Do not ask technical architecture questions of the founder.

## Step 1 — Cross-platform pre-hydration

Run the current-estate deterministic manifest builder:

```bash
node .claude/hooks/scripts/pre-hydration.mjs --task "$ARGUMENTS"
```

The manifest:
- resolves the current `apps/web` root on macOS, Windows or Linux;
- selects the appropriate Blueprint/toolshed from the task;
- loads current canonical control files;
- scores existing `src/`, `e2e/`, `supabase/` and `scripts/` files against the task;
- filters to paths that actually exist;
- defines a bounded read-expansion budget.

Do not use the retired PowerShell-only pre-hydration path.

Print:

```text
MINION CONTEXT LOADED
task_id: ...
blueprint: ...
toolshed: ...
initial files: ...
expansion budget: ...
```

### Bounded manifest expansion

The initial manifest is a starting set, not a blind prison.

If implementation evidence proves another file is required:
1. state the missing dependency/reference and why it is required;
2. perform a targeted filename/symbol/import search;
3. add only the specific required files to the manifest;
4. record the expansion;
5. do not exceed `read_budget.expansion_max_files` without returning `BLOCKED_TECHNICAL_DISCOVERY` to the Orchestrator/SPM.

No full-tree file dumps.

## Step 2 — Initialise bounded attempt state

Create `.claude/data/minion-state.json`:

```json
{
  "active": true,
  "task_id": "{manifest.task_id}",
  "mission_id": "{mission id if known}",
  "created": "{ISO/current local timestamp}",
  "iterations": {
    "total": 0,
    "implement": 0,
    "fix_ci": 0,
    "fix_lint": 0,
    "diagnose": 0,
    "other": 0
  },
  "technical_reroute_required": false
}
```

The wired PreToolUse Task hook enforces a maximum of **3 Task-tool calls for this Minion invocation**. This prevents one tactic from looping forever; it is not a founder-escalation count.

## Step 3 — Blueprint + minimal toolshed

Read `.claude/blueprints/{manifest.blueprint}.blueprint.md` and the current toolshed definition.

Load only the specialist capabilities relevant to this packet. Do not load dozens of skills for appearance of sophistication.

Blueprint instructions are subordinate to current `/spm`, authority and completion contracts when older wording conflicts.

## Step 4 — Execute

Implement the smallest complete change that satisfies the packet.

Rules:
- search/reuse before create;
- preserve scope and current architecture;
- no silent dependency/configuration mutation to suppress an error;
- no fake/synthetic success;
- no gate bypasses;
- technical uncertainty is resolved through repository/runtime evidence and specialists, not by asking Phill which file/table/API to use;
- maintain candidate provenance (base SHA → changed paths → candidate SHA).

## Step 5 — Verify before candidate creation

Use `/done` or the equivalent current completion baseline for the affected change.

For normal `apps/web` behavioural code this includes the current CI-equivalent lint/type/test/build baseline, meaningful regression coverage, and additional integration/security/data/Playwright/visual checks when applicable.

Any required failure means repair and re-verify. A model PASS does not override deterministic failure.

## Step 6 — Bounded technical rerouting

When the Minion Task-call budget is exhausted, the live hook blocks the over-budget Task call and marks the Minion state:

```text
MINION_TECHNICAL_REROUTE
founder_decision_required: false
```

At that point:
1. **stop this Minion invocation**;
2. preserve the branch/worktree and exact failure evidence;
3. return a technical escalation packet to the Orchestrator/SPM;
4. change strategy — e.g. alternate model/specialist, fresh worktree/environment, deeper CI/log/browser diagnosis, architecture/database/security review;
5. keep independent mission lanes moving.

Do not retry the same Minion blindly. Do not send Phill a stack trace merely because the attempt budget was exhausted.

Founder escalation is appropriate only when the remaining blocker is a genuine product/business decision, consequential authority/risk choice, or irreducible blocker with clear options.

## Step 7 — Candidate branch/commit

Create or use the mission's isolated feature branch/worktree from the current approved base.

Before commit, record the verification evidence and candidate scope.

Commit messages should identify the mission/task and evidence path where available. Do not hard-code a model/version as the author or co-author when that is not the actual execution identity.

## Step 8 — Draft PR only

Open the candidate **as a draft targeting `main`**:

```bash
gh pr create \
  --draft \
  --base main \
  --title "minion: {task summary}" \
  --body "$(cat <<'EOF'
{summary}

## Mission
{mission/task ID}

## Evidence
{verification receipts}

## Earned state
PR_OPEN

No ready-for-review, merge, deployment or production authority is implied by this draft.
EOF
)"
```

If the local authority guard rejects the GitHub command, return the exact block to SPM. Do not bypass it with raw API calls or another shell path.

## Step 9 — Return structured evidence to SPM

Do not create a competing local truth store by appending generic “completed” entries to `current-state.md` or architectural decisions.

Return:

```text
MINION RESULT
mission: [id]
task_id: [id]
blueprint: [type]
toolshed: [type]
iterations: [n]/3
candidate_sha: [sha]
pr: [draft PR URL]
verification: [evidence refs]
EARNED STATE: PR_OPEN
blocker: none | [...]
next move: independent review / CI / SPM technical reroute
founder decision: none | [genuine decision]
```

The Orchestrator/SPM persists authoritative mission/evidence state and continues the lifecycle. **PR creation is not task COMPLETE.**

## Terminal outcomes for one Minion invocation

- `PR_OPEN` — candidate produced and verified sufficiently for draft review.
- `BLOCKED_PRODUCT_DECISION` — genuine missing product/business intent.
- `BLOCKED_AUTHORITY` — next action exceeds the execution lease.
- `BLOCKED_TECHNICAL_DISCOVERY` — bounded context discovery exhausted; route specialist discovery.
- `MINION_TECHNICAL_REROUTE` — current tactic budget exhausted; outer technical rerouting required.
- `FAILED_ENVIRONMENT` — required tool/environment unavailable with evidence.

None of these except a mission-level evidence-backed `COMPLETE` should be labelled `MINION COMPLETE`.

## Requirements

- Node.js/current project toolchain;
- Git/feature worktree capability;
- GitHub CLI only where the current authority boundary permits candidate creation;
- additional Blueprint-specific tools only when actually required.

## Locale

Australian English; project date/time conventions; current evidence over stale template text.
