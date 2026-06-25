---
type: wiki
project: synthex
status: planning
source_spec: /Users/phillmcgurk/Synthex/spec.md
created: 2026-06-24
---

# Synthex Productivity Intelligence Upgrade — 2026-06-24

## What is worth implementing from the latest Obsidian/YouTube files

The strongest signal is not another content generator. It is an operating upgrade for Synthex: source registry, context map, work packets, evaluator rubrics, and gated content/agent lanes.

## Highest-value implementation candidates

### 1. Source registry for Obsidian/YouTube intelligence

**Why it matters:** Synthex previously reported YouTube intelligence as `DATA_REQUIRED` because it scanned `/Users/phillmcgurk/2nd-brain/`, but the new transcript notes are actually in `/Users/phillmcgurk/Unite-Group/docs/brain/2nd Brain/Sources/Completed/`.

**Implement:** `docs/productivity/source-registry.md` in Synthex.

**Rule:** reference the imported notes in place; do not copy raw transcripts into Synthex.

**Value:** stops false-negative research scans and lets future agents pull the right source folder first.

### 2. Synthex domain context map / shared language

**Why it matters:** The Obsidian notes on `/grill-with-docs` and handoff show that agents perform better when the product has a small `context.md`/ubiquitous-language layer.

**Implement:** `docs/context/synthex-context.md`.

**Include terms:** campaign, authority packet, content lane, approval queue, publish, draft, source, citation, claim, client loop, agency task, workflow execution, governed signal, opportunity, outcome event.

**Value:** fewer repeated explanations; less agent drift; cleaner naming in future code/specs.

### 3. Synthex Work Packet template

**Why it matters:** The Anthropic long-running-agent research says planner/generator/evaluator roles need a concrete done contract before build starts. The PM review also flagged that roadmap themes are not enough to prevent done-looking work.

**Implement:** `docs/productivity/work-packet-template.md`.

**Required fields:** goal, why now, entry criteria, exit criteria, owner, dependencies, appetite/due date, no-gos, evidence, permission bucket, WIP impact, evaluator rubric, proof commands, rollback, blocked state.

**Value:** turns research/signals into small, evaluatable packets instead of broad prompts.

### 4. Adversarial evaluator rubrics

**Why it matters:** The latest research repeatedly says self-evaluation is a trap. Synthex already has proof: green tests did not prevent P0/P1 ShipIt blockers.

**Implement:** `docs/productivity/evaluator-rubrics.md`.

**Rubrics needed:** security/authz, PM completeness, evidence quality, UX/product, content originality, ops/release readiness.

**Value:** separates “built” from “good enough to ship”.

### 5. Content viewpoint / proof gate

**Why it matters:** The content-scale research says AI volume becomes noise unless anchored in human viewpoint, context, proof, and real situations.

**Implement:** add POET-style fields to Synthex content planning: proof, opinion, experience, trust.

**Default rule:** every authority/content packet must include one real customer/operator/sales moment before AI drafting.

**Value:** improves content quality and AI-citation readiness without publishing more generic AI output.

### 6. Signal intake front-half

**Why it matters:** Unite-Group already identified the same missing seam: inbound signal → proposed task. Synthex has research, cron reports, YouTube notes, and evidence docs, but no consistent normaliser that turns them into proposed, deduped work.

**Implement later:** Synthex-specific `SignalEnvelope` and proposed-task intake.

**Gate:** proposed only; no auto-execution.

**Value:** lets research and errors become PM-triaged work without manual retyping.

### 7. Read-only provider / lane health tile

**Why it matters:** provider/capacity stalls are productivity failures. Unite-Group has a multi-provider console design, but Synthex should start read-only and avoid new vendor sprawl.

**Implement later:** read-only health tile showing configured provider/lane status and pressure.

**Rule:** no Nango; no new external accounts; no token pooling.

**Value:** makes agent capacity visible without expanding blast radius.

## Board recommendation

Approve **Phase 1 only** as the next slice:

1. source registry;
2. Synthex context map;
3. Work Packet template;
4. evaluator rubrics;
5. optional patch to marketing-intelligence docs noting the actual imported YouTube source location.

Do **not** implement product automation until Synthex ShipIt P0/P1 status is rechecked.

## Stop/hold rule

Any productivity automation is `blocked-security` while a current P0/P1 security, tenant-safety, or data-integrity issue would increase its blast radius.

Current context: `/Users/phillmcgurk/Synthex/docs/production-readiness/SHIPIT-PATHWAY.md` marks Synthex RED.

## Source links

- [[synthex]]
- Source spec: `/Users/phillmcgurk/Synthex/spec.md`
- YouTube transcript folder: `/Users/phillmcgurk/Unite-Group/docs/brain/2nd Brain/Sources/Completed/`
- Synthex repo: `/Users/phillmcgurk/Synthex/`

## Related implementation patterns

- Work packets and checkpoint contracts: `/Users/phillmcgurk/Unite-Group/apps/workspace/docs/swarm/ARCHITECTURE.md`
- Signal intake proposal: `/Users/phillmcgurk/Unite-Group/docs/superpowers/specs/2026-06-23-signal-ingestion-intake-design.md`
- Content lane draft→gate→publish pattern: `/Users/phillmcgurk/Unite-Group/docs/superpowers/specs/2026-06-23-content-lane-design.md`
- Provider health/capacity pattern: `/Users/phillmcgurk/Unite-Group/docs/superpowers/specs/2026-06-23-multi-provider-console-design.md`
- Pi-Dev-Ops evaluator pattern: `/Users/phillmcgurk/Pi-Dev-Ops/docs/ship-chain/03-the-evaluator.md`
