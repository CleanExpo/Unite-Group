# Specialist Persona Swarm & Orchestration Operating Model

**Date:** 2026-06-15  
**Owner:** Phill McGurk / Nexus Senior PM  
**Purpose:** Start using specialised Hermes personas as a production system, not as one-off assistants.

## 1. Available local swarm capacity

Discovered with `hermes profile list` and `hermes kanban --board unite-group assignees`:

| Profile | Role in swarm | Best use |
|---|---|---|
| `nexus-senior-orchestrator` | Swarm conductor / final verifier | Task graph design, parent-child dependencies, synthesis review, gates |
| `nexus-senior-pm` | Senior PM / execution planner | Roadmaps, blockers, proof ledgers, handoff docs, stakeholder-ready plans |
| `pi-dev-ops` | Engineering implementer / verifier | Code, tests, build gates, repo hygiene, safe local implementation |
| `nexus-cfo` | Commercial / ROI / risk | Revenue priority, cost/benefit, first-dollar path, downside controls |
| `default` | General operator / fallback | Miscellaneous support, broad read-only discovery, fallback worker |

Current board: `unite-group`. Gateway dispatcher is running. Existing ready item for `pi-dev-ops` means engineering work may queue; PM/CFO/orchestrator lanes can still run in parallel.

## 2. Operating principle

Every major initiative should run as **fan-out → verify → synthesize → execute next safe slice**:

1. **Fan-out:** independent specialists inspect their domain in parallel.
2. **Verifier:** orchestrator checks contradictions, missing evidence, and gate boundaries.
3. **Synthesizer:** Senior PM writes the decision/execution artifact.
4. **Implementer:** Pi-Dev-Ops takes the first safe local implementation slice.
5. **Board gates:** prod DB writes, deploys, emails, secrets, and external communications remain Phill-gated.

## 3. Default task graph for product acceleration

```text
             ┌─ PM / roadmap audit ─────────┐
             ├─ Engineering proof/gates ────┤
GOAL ────────┤─ Commercial first-dollar ────┼─ Orchestrator verifier ── Senior PM synthesis ── Pi-Dev-Ops safe slice
             └─ Security/DR risk audit ─────┘
```

## 4. First swarm batch selected

**Goal:** Convert the DR-NRPG / RestoreAssist / CARSI audit into an executable 7-day production acceleration plan with proof ledger, owner-gated decisions, and first safe local work slice.

Parallel workers:
- `nexus-senior-pm`: turn current findings into a 7-day execution board.
- `pi-dev-ops`: build local proof-ledger / verification checklist for DR-NRPG without prod writes.
- `nexus-cfo`: rank first-dollar paths and ROI for AU restoration stack.
- `nexus-senior-orchestrator`: verify swarm outputs and identify dependency/gate conflicts.

Synthesis:
- `nexus-senior-pm` produces the final 7-day plan and next execution packet.

## 5. Gate boundaries

Allowed for agents:
- Local docs, local code, local tests, static audits, draft SQL/migrations, draft emails, dry-run commands.

Blocked without Phill approval:
- Production DB writes, Supabase promote/apply, Vercel/Railway deploy, real email sends, credential rotation, 1Password mutation, client/stakeholder communication, paid spend, new vendors.

## 6. Quality multiplier rules

- Every worker must return evidence paths and exact verification commands.
- Every synthesis must name the next safe executable slice.
- Every implementation must have a reviewer or at least a verifier task before it is called done.
- No worker may mark a prod/externally-visible action complete unless it actually executed and produced proof.
- If a card blocks, it must state: blocker, owner, smallest unblock action, and fallback safe lane.
