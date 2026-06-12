---
name: fable-prompt-engineer
description: >
  Prompt-engineering and orchestration patterns for running Fable 5 as Master
  Orchestrator over Opus/Sonnet/Haiku worker agents. Use for ANY multi-agent
  task in this repo, and ALWAYS for the Unite-Group convergence programme
  (see playbooks/convergence.md). Locale: en-AU.
version: 1.0.0
---

# Fable Prompt Engineer

Two parts: a **general core** (how to drive Fable 5 well on any task) and the
**convergence playbook** (`playbooks/convergence.md` — the specific loop that
merges the six-repo ecosystem into this one repository).

---

## Part 1 — General Fable 5 orchestration core

### 1.1 Orchestration hierarchy

| Role | Model | Responsibility |
|---|---|---|
| **Master Orchestrator** | Fable 5 | Owns the goal, decomposes the programme, dispatches and arbitrates. Never does leaf work itself; never lets a worker redefine the goal. |
| **Senior Project Manager** | Opus 4.8 | Turns each phase into a task DAG with explicit gates; reviews worker output against acceptance criteria before the orchestrator accepts it. |
| **Workers** | Haiku / Sonnet / Opus | Execute one scoped task each, then terminate. Model chosen per the routing table below. |

### 1.2 Model routing table

| Task class | Model | Examples |
|---|---|---|
| Mechanical / high-volume / low-ambiguity | Haiku | Searches, file inventories, renames, lint fixes, classification sweeps |
| Standard implementation | Sonnet | Porting a route, writing tests, adapting a component, doc drafting |
| Architecture & judgement | Opus | Schema migrations, merge-conflict resolution, security boundaries, anything touching auth or money |

Escalate UP a tier when a worker fails once at its assigned tier. Never route
auth, billing, schema, or deletion decisions below Opus.

### 1.3 Dispatch contract (every subagent prompt MUST contain)

1. **Exact scope** — which files, routes, directories. Nothing implied.
2. **Success criteria** — observable, checkable ("tests X and Y pass", not "works").
3. **File references** — paths the worker should read first.
4. **Constraints** — what NOT to touch (env, secrets, prod DB, other packages).
5. **Output shape** — what the worker must report back (diff summary, evidence, blockers).

A dispatch missing any of the five is malformed — rewrite it, don't send it.

### 1.4 Plan-then-execute

- No implementation before a written task list with gates exists.
- One phase in flight at a time; a phase closes only when its gate passes.
- Parallel dispatch only when tasks share no files, no state, and no ordering.

### 1.5 Iteration caps and escalation (adapted from minions-protocol)

| Situation | Action |
|---|---|
| Worker fails its task | One retry at a higher model tier |
| Same failure class 3× | STOP. Escalate to the human channel (PR thread) with diagnosis — do not thrash |
| Ambiguous requirement discovered mid-task | Halt that task; orchestrator resolves or asks; workers never guess intent |
| Destructive/irreversible step reached | Hard gate: requires explicit typed human approval, every time |

### 1.6 Context scoping

Give each worker ONLY the files in its scope (manifest-style allowlist).
Loading unrequested context is noise that degrades output quality. The
orchestrator holds the global picture; workers hold one slice.

### 1.7 Verification-gated completion

"Done" requires evidence: command output, passing test names, route lists,
diff stats. A green claim without pasted evidence is rejected by the PM agent.
200 ≠ real; compiled ≠ correct; merged ≠ verified.

### 1.8 Output standards

- Australian English (colour, behaviour, optimisation, licence).
- Dates DD/MM/YYYY, currency AUD, timezone AEST/AEDT.
- Lead with the outcome; evidence after; no filler.

---

## Part 2 — Convergence playbook

The full operating procedure for merging Unite-Hub, Unite-Group-Spine,
brain-1, pi-ceo-operator-mcp and hermes-workspace into THIS repo
(CleanExpo/Unite-Group) lives in:

**[`playbooks/convergence.md`](playbooks/convergence.md)**

Read it before touching any convergence task. It defines the import order,
history-preserving subtree commands, the C-then-A port list, conflict rules,
the test matrix, the route-coverage gate, and the hard-delete gate.
