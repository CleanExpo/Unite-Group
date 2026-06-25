# Hermes Agent Memory Retrieval Contract

Date: 2026-06-20
Status: Stage 1 implementation spec
Canonical implementation: `src/server/swarm-memory.ts`

---

## Overview

Hermes agents retrieve context through a three-tier hierarchy. Each tier has a
defined cost and trigger condition. Agents declare their required depth before a
swarm starts so the orchestrator can pre-warm the correct tier without
over-fetching.

---

## 1. Three-Tier Retrieval Hierarchy

### Tier 0 — Injected context (always present, zero-cost)

**What it contains:**

- `profile` memory: `IDENTITY.md`, `MEMORY.md` (durable curated memory), `SOUL.md`, `USER.md`
- `mission` memory: active mission `SUMMARY.md` and recent `events.jsonl` lines
- `handoff` memory: latest local or shared handoff file for the agent

**How it is delivered:**

Injected directly into the agent's startup prompt by `buildSwarmStartupSnapshot`.
No search or file scan is performed at runtime. Every agent receives this
regardless of requested depth.

**When it is sufficient:**

A fresh dispatch, a simple one-shot task, or any task where the agent's objective
and role are fully specified in the mission brief and there are no ambiguous prior
decisions to resolve.

---

### Tier 1 — Episodic keyword search (on-demand, low cost)

**What it contains:**

Tier 0 plus a keyword scan of the agent's own episodic log files
(`episodes/YYYY-MM-DD.md`). Returns the 10 most-recent episodic entries for the
agent, ordered by date descending.

**How it is triggered:**

- Agent declares `depth: 1` in its retrieval contract (see §3 below).
- Orchestrator detects a resume or restart event with no active handoff.
- Agent signals `blocked` and needs to reconstruct recent decisions.

**Implementation:** `getTieredContext(agentId, { depth: 1 })` — see §4.

---

### Tier 2 — Full-text search across all memory kinds (on-demand, higher cost)

**What it contains:**

Tier 0 + Tier 1 plus all `shared` memory entries from the swarm shared memory
root (`~/.openclaw/workspace/memory/swarm/`).

**How it is triggered:**

- Agent declares `depth: 2` in its retrieval contract.
- Orchestrator is routing a cross-worker task and needs swarm-wide context.
- Agent must reconcile a decision with a prior completed mission.
- Decomposition step requires swarm-wide lessons or project-level conventions.

**Implementation:** `getTieredContext(agentId, { depth: 2 })` — see §4.

---

## 2. Invocation Rules

| Condition                                             | Tier |
| ----------------------------------------------------- | ---- |
| Fresh dispatch, objective fully specified             | 0    |
| Agent restarted or compacted with no handoff          | 1    |
| Agent blocked; needs recent decision history          | 1    |
| Cross-worker task; prior agent context relevant       | 2    |
| Decomposition or routing step needing swarm lessons   | 2    |
| Mission archive lookup or completed-mission reference | 2    |

**Default:** tier 0. Agents must opt in to tier 1 or 2 explicitly via their
retrieval contract (§3).

**Cost guidance:** tier 2 scans all shared memory files. For large swarms this
can be several hundred kilobytes. Only request tier 2 when the agent genuinely
needs swarm-wide context.

---

## 3. The Retrieval Contract

Each agent declares its retrieval needs before the swarm starts. The contract is
a small structured block included in the agent's roster entry or dispatch
envelope.

### Contract format

```yaml
retrieval:
  depth: 0 | 1 | 2 # required — see tier definitions above
  rationale: string # required — one sentence explaining why this depth is needed
  query: string | null # optional — keyword hint for tier-1/2 search
```

### Rules

- `depth` is required. An absent depth is treated as `0` by the orchestrator.
- `rationale` is required for `depth >= 1`. The orchestrator rejects contracts
  that request elevated depth without a rationale.
- `query` is optional. When supplied it is passed to the keyword search so
  results are focused rather than returning the latest N entries by date.
- The orchestrator logs the contract into the mission's `events.jsonl` under
  event type `note` before dispatching.

### Example (depth 0 — fresh task)

```yaml
retrieval:
  depth: 0
  rationale: 'Fresh build task; objective is fully specified in the mission brief.'
  query: null
```

### Example (depth 1 — resume after compaction)

```yaml
retrieval:
  depth: 1
  rationale: 'Worker restarted after compaction; need recent episodic entries to reconstruct decisions.'
  query: 'supabase migration branch'
```

### Example (depth 2 — cross-worker coordination)

```yaml
retrieval:
  depth: 2
  rationale: 'Routing a PR-review task that depends on swarm-wide lessons from prior auth hardening missions.'
  query: 'auth allowlist'
```

---

## 4. Memory Kind → Tier Mapping

The `SwarmMemoryKind` union in `swarm-memory.ts` maps to the tiers as follows:

| `SwarmMemoryKind` | Description                                                                             | Tier |
| ----------------- | --------------------------------------------------------------------------------------- | ---- |
| `profile`         | `IDENTITY.md`, `MEMORY.md`, `SOUL.md`, `USER.md` under `~/.hermes/profiles/<workerId>/` | 0    |
| `mission`         | `SUMMARY.md` + `events.jsonl` for the active mission                                    | 0    |
| `handoff`         | Latest local or shared handoff file (`<missionId>.md` / `<workerId>-latest.md`)         | 0    |
| `episodic`        | Daily `episodes/YYYY-MM-DD.md` files for the agent                                      | 1    |
| `shared`          | All files under `~/.openclaw/workspace/memory/swarm/`                                   | 2    |

### How `getTieredContext` uses these kinds

`getTieredContext(agentId, { depth })` in `swarm-memory.ts` reads kinds in this
order and concatenates them as markdown sections:

```
depth 0 → profile (IDENTITY.md + MEMORY.md) + mission SUMMARY.md + latest handoff
depth 1 → depth-0 output + last 10 episodic entries for agentId
depth 2 → depth-1 output + all shared memory entries
```

The function is read-only. It does not write any memory files and does not
modify any existing exports.

---

## 5. Integration Notes

- `buildSwarmStartupSnapshot` already delivers the full tier-0 payload as a
  rendered markdown string. Callers that only need the rendered snapshot should
  use that function directly; `getTieredContext` is intended for programmatic
  use where the caller wants a plain string to prepend to a prompt.
- `searchSwarmMemory` (scope `worker`) is the search primitive underlying tier 1.
  `getTieredContext` does not call it — instead it reads the most-recent episodic
  files directly to guarantee recency ordering without a query dependency.
- `readSwarmMemory` (kind `shared`) is the primitive underlying tier 2.
- Future semantic/vector recall (Stage 3 in the memory framework spec) will slot
  in at tier 2 without changing the contract format or the tier 0/1 behaviour.
