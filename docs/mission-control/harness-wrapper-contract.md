# Harness Wrapper — the three-tier routing contract

Date: 16/08/2026 · Epic: UNI-2246 (Mission Control Phase 1) · Status: contract only, arms nothing
Waterline class of this document: **Class 1 — local candidate** (documentation; merging it changes no runtime behaviour)

## 1. What this is

One front door, three exits. Every founder-facing entry point that can start work —
the workspace lanes panel, Margot voice intake, a future hotkey or heartbeat prompt —
must classify the request into exactly one of three tiers and behave as this document
specifies.

The Harness Wrapper is a **contract over surfaces that already exist**. It is not a
component, not a service, not a route, and not a screen.

## 2. What this is explicitly not

`.spm/2026-07-17-mission-control-phase1-foundation.md` §6 states, verbatim:

> No parallel executor or dashboard will be introduced.

That line governs this document. Therefore:

- **No new dashboard.** The founder surfaces are the existing workspace command centre
  (`apps/workspace/src/screens/command-center/`) and the existing web command centre.
  A "wrapper UI" is a Phase-1 violation.
- **No new executor.** Dispatch goes through the existing lane path
  (`apps/workspace/src/server/lanes/`) — `dispatcher.ts`, `lane-orchestrator.ts`,
  `cli-adapter.ts`, `task-queue.ts`. Per the `nexus-conventions` two-queues rule, no
  third job surface is created.
- **No new memory store.** See §6.
- **Nothing is armed by adopting this contract.** It describes required behaviour for
  entry points as they are built or amended; it flips no flag.

## 2a. Not to be confused with — two existing "tier" ladders

The repo already has two unrelated tiered contracts. This one is a third axis, not a
replacement or a restatement of either. All three coexist; a single request can sit on all
three at once.

| Contract | Axis it tiers | Where |
| --- | --- | --- |
| **This document** | *What kind of response a request gets* — execute / answer / dispatch | `docs/mission-control/harness-wrapper-contract.md` |
| Hermes memory retrieval | *How deep an agent reads memory* — Tier 0 injected / 1 keyword / 2 semantic | `apps/workspace/docs/memory-retrieval-contract.md` |
| Harness-pilot inference ladder | *Which model a call costs out to* — owned → free → cheap-paid → local | `tools/harness-pilot/README.md` |

When citing a tier, name the contract. Bare "Tier 1" is ambiguous in this repo.

## 3. The three tiers

A request enters the router as free text (typed, spoken, or scheduled). The router
classifies once, deterministically, and fails closed to the *lower-capability* tier when
classification is ambiguous — Tier 2 rather than Tier 3, Tier 2 rather than Tier 1.

### Tier 1 — EXECUTE

**Trigger:** the request uses an **explicit invocation form** for a known skill (a
directory under `.claude/skills/`, or a skill exposed to the surface's runtime). The
invocation form is either the slash form (`/skill-name`) or an unambiguous imperative
naming the skill ("run credential-triage", "do a credential-triage sweep").

**A bare mention is not an invocation.** "What does credential-triage do?", "credential-triage
found nothing last week", and "don't run credential-triage" all *name* a known skill and
none of them is a request to execute it. Questions, quotations, negations, and
descriptions route through normal classification — usually Tier 2. This matters most on
the voice path, where the surface cannot see punctuation or formatting: when the form is
not unmistakably an invocation, classify, do not execute.

**Behaviour:** run that skill and report the result. No planning preamble, no dispatch, no
lane. A skill invocation that itself would cross the Waterline (§5) is not exempt — the
skill's own gates still apply, and the class of the *action* governs, not the class of
"running a skill".

**Failure mode:** the named skill does not exist → do **not** guess a near-match and do
**not** silently fall through to research. Say which name was heard, say it resolved to
nothing, and offer Tier 2 or Tier 3.

### Tier 2 — ANSWER FROM RECORD

**Trigger:** the request is a question about the state of the system, the plan, or a past
decision.

**Behaviour:** answer **only** from the registers listed in §4. No fresh research, no web
call, no inference presented as fact, no invention. This tier is a lookup, not a
reasoning engine.

**Failure mode — the load-bearing rule:** if the record does not contain the answer, say
so plainly ("not in the record") and offer Tier 3. Under the NorthStar rule
(`nexus-conventions`), a missing signal degrades to an honest "unavailable"; it never
degrades to a plausible guess. An answer synthesised from outside the registers is a
defect in this tier, however correct it turns out to be.

Tier-2 answers carry Evidence Standard tags per `.claude/rules/fabel-evidence-standard.md`:
material read from a register is `[VERIFIED]` with its path; anything derived is
`[INFERENCE]` naming its source.

### Tier 3 — DISPATCH

**Trigger:** the request is deep work — build, investigate, refactor, migrate, sweep.

**Behaviour:** create a supervised lane under UNI-2246 semantics. That means the run
carries the Phase-1 contract, not a bare shell command:

- canonical run identity (`runId`, `laneId`, `machineId`, backend/tool identity);
- acknowledged controls — stop means *process-tree termination acknowledged*, then
  worktree cleanup, never the reverse;
- bounded, redacted event evidence — the envelope (size and event bounds, field
  allowlist, redaction ordering, oversized-event behaviour) is defined by the Phase-1
  evidence contract, §11 and §13 of the spec, and is enforced at the adapter/event
  boundary before persistence or transport. This contract adds no second evidence path
  and does not restate those limits; a surface claiming compliance must point at the
  spec's envelope, not at this sentence;
- truthful backend admission — a lane is refused when its backend is genuinely
  unavailable, never admitted on an `isBackendAvailable: () => true` stub;
- duplicate dispatch for one lane returns a conflict, not a second child process. The
  claim mechanism that makes this atomic — what value identifies a lane, when the claim
  is taken relative to spawn, and lease/reconciliation semantics — is owned by UNI-2403
  and UNI-2410 (spec §11, Slice B), not by this document. A surface must not treat "we
  check for a running lane before spawning" as satisfying this line: the check has to be
  atomic with the claim, or two retries can both spawn before either conflict returns.

**Authority is computed before the lane is created.** The router resolves the highest
Waterline class of any action the request contains *before* dispatch, not during the run.
Class 2 or Class 3 work is refused or held pending approval for the exact target and
effect — Class 3 requires Phill McGurk's explicit authority and neither a button press
nor a spoken command supplies it. Ambiguous, stale, or conflicting authority fails closed
to the higher class. "Migrate" and "sweep" are listed as Tier-3 triggers because they are
*shaped* like deep work, not because dispatch is pre-authorised — they routinely carry
Class 2/3 actions and are refused on that basis.

**Failure mode:** if the lane cannot be created truthfully — backend down, quota
exhausted, duplicate claim, **or missing authority for the action's class** — the surface
reports the refusal and the next safe action. It does not fall back to running the work
inline, and it does not downgrade the action's class to make the lane admissible.

## 4. The Tier-2 register set

Tier 2 may read these and nothing else. Status is recorded honestly as at 16/08/2026;
entries marked ABSENT are named here because the build order referenced them, and a
router must not be written against a register that does not exist.

| Register | Path | Status |
| --- | --- | --- |
| Repo contract and layout | `CLAUDE.md`, `SOURCE-OF-TRUTH.md`, `AGENTS.md` | PRESENT |
| Constitution incl. the Waterline gate | `docs/constitution/EPIC-000-nexus-engineering-constitution.md` | PRESENT |
| SPM specs (incl. this epic) | `.spm/*.md` | PRESENT — 10 files |
| Docs index chain (OKF) | `docs/index.md` and per-folder `index.md` | PRESENT |
| Learning signal sink | `.harness/learning/*.jsonl` | PRESENT |
| Portfolio registry SSOT | `.portfolio/PORTFOLIO.yaml` | PRESENT |
| NorthStar spec | `apps/web/docs/NORTHSTAR-SPEC.md` | PRESENT |
| Repo issues (open work) | GitHub `CleanExpo/Unite-Group` issues | PRESENT — 5 open, 4 closed |
| Root `NORTH-STAR.md` | — | **ABSENT** — no such file in this repo |
| `FOUNDER-QUEUE.md` | — | **ABSENT** — no such file in this repo |
| Standing "heartbeat issue" | — | **ABSENT** — no issue matching it exists |
| Vault wiki (`brain-1`) | `~/2nd Brain/2nd Brain` | Founder machines only — not present in remote/CI checkouts |

A Tier-2 answer that depends on an ABSENT register must say the register is absent. It
must not substitute the nearest-looking file and present the result as the record.

## 5. Waterline mapping

The Waterline classes are defined once, in the constitution
(`docs/constitution/EPIC-000-nexus-engineering-constitution.md`, "The Waterline — autonomy
gate"). This contract does not redefine them; it binds entry points to them.

| Tier | Highest class permitted from voice or a button |
| --- | --- |
| Tier 1 — execute | Class 0–1 |
| Tier 2 — answer | Class 0 |
| Tier 3 — dispatch | Class 0–1 |

- **Class 2** (external writes, credential use, spend, publication, approval-state change)
  requires explicit approval for the exact target and effect. A voice command or a panel
  button is not that approval.
- **Class 3** (production mutation, deletion, merge authority, constitutional change,
  irreversible action) requires Phill McGurk's explicit authority for the exact action.
- **L3 execution remains forbidden for the whole of Phase 1**, per the spec's Out-of-scope
  list and win condition 10 (zero unauthorised L3 action across the seven-day soak). This
  contract does not create an L3 path and must not be cited as authority for one.
- A task inherits the highest class of any action it contains. Missing, ambiguous, stale,
  or conflicting authority fails closed to the higher class.

## 6. Memory

- **Canonical memory is the `brain-1` vault** (`~/2nd Brain/2nd Brain`). It is the single
  strategic knowledge store.
- **`docs/brain/` in this repo is residual and MUST NOT grow.** It holds `NEXUS.md`,
  `Drafts/`, `index.md` and `skills-lock.json` only. New knowledge captured during work
  goes to the vault, never here. Adding files to `docs/brain/` is a defect.
- **No third memory store.** The wrapper introduces none.
- The vault is unreachable from remote/CI checkouts. Any surface that reads it degrades
  honestly ("vault unavailable on this host") rather than reporting an empty vault.
- **Writes to the vault are governed by the `brain-capture` exception** in `CLAUDE.md`
  ("Research-output contract"): founder-machine working tree only, the `brain-1` GitHub
  freeze untouched, failure reported rather than redirected to `docs/brain/`. This
  document grants no write authority of its own.

## 7. Adoption

This document is the specification an entry point is measured against; it does not
retro-certify anything. Existing surfaces — the lanes panel, mobile voice intake
(`apps/web/src/app/api/hermes/operator-gateway/mobile-voice-intake/`), Margot voice task
(`apps/web/src/app/api/pi-ceo/margot-voice/task/`) — are **not** asserted to comply today.
Compliance is claimed per surface, in the PR that makes it so, with the tests that prove
it.

## 8. Open items

| # | Item | Disposition |
| --- | --- | --- |
| 1 | `NORTH-STAR.md` and `FOUNDER-QUEUE.md` do not exist | Either create them as real registers or drop them from the Tier-2 set. Until then Tier 2 cannot cite them. |
| 2 | No standing heartbeat issue exists | A vault-growth metric has nowhere to report. See §9. |
| 3 | Per-surface compliance is unimplemented | Tracked per surface, not here. |

## 9. Vault-growth metric — not implemented, and why

The build order proposed reporting `brain-1` commits in the last 24h as a heartbeat
metric. It is not implemented:

- there is no `nexus-heartbeat.yml` (or any heartbeat workflow) in `.github/workflows/`;
- there is no standing heartbeat issue to report into;
- `brain-1` is a separate private repository, outside this repo's automation scope, and
  `CLAUDE.md` forbids writes to it.

Three missing prerequisites is not "trivially safe". Recorded here as an honest skip
rather than shipped as a workflow line that would fail closed on every run.

---

_Referenced: `.spm/2026-07-17-mission-control-phase1-foundation.md` (epic UNI-2246);
`docs/constitution/EPIC-000-nexus-engineering-constitution.md` (Waterline);
`.claude/skills/nexus-conventions/SKILL.md`; `.claude/rules/fabel-evidence-standard.md`._
