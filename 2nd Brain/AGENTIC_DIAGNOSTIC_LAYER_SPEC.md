# Agentic Diagnostic Layer Spec

Status: diagnostic discovery output
Date: 2026-06-04
Scope: Unite-Group Nexus ecosystem local inspection
Evidence base: local filesystem inspection of `/Users/phillmcgurk/2nd-brain`, `/Users/phillmcgurk/Unite-Group`, `/Users/phillmcgurk/Unite-Hub`, `/Users/phillmcgurk/Synthex`, `/Users/phillmcgurk/RestoreAssist`, `/Users/phillmcgurk/Disaster-Recovery`, `/Users/phillmcgurk/Pi-CEO`; portfolio registry `/Users/phillmcgurk/Unite-Hub/.portfolio/PORTFOLIO.yaml`; selected README/CLAUDE/docs/scripts/routes/agent files.
Guardrail: this is understanding and diagnostic mapping only. No implementation, deploy, DB write, external account, or publishing action was performed.


## Purpose

The diagnostic layer is the mandatory pre-build layer for Unite-Group Nexus. It prevents agents from treating every request as a feature request. It turns a raw request into intent, asset inventory, purpose mapping, friction mapping, gaps, priorities, approvals, and only then safe execution.

## Global rules

- Allowed by default: read local files, inspect repos, inspect git status, read docs, search previous outcomes, draft recommendations, create diagnostic records.
- Forbidden by default: deploy, database writes, production env changes, external publishing, new vendors, account creation, deleting assets, committing code, running destructive commands.
- Escalate to Phill/Board for: production DB writes, deploys, external comms, billing, public publishing, new vendors, irreversible deletes, cross-client permanent business rules.
- Quality standard: every conclusion must have evidence path(s), confidence level, business impact, and next action.

## Agents

### Context Discovery Agent
- Role: Find all relevant context before action.
- Purpose: Stop repeated explanations and repo-local tunnel vision.
- Inputs: User request, portfolio registry, repo docs, Obsidian outcomes, session memory.
- Outputs: Related projects, files read, context summary, missing context.
- Allowed: file search/read, git status, session search.
- Forbidden: implementation or mutation.
- Escalation: if critical repo/data source missing.
- Quality: cite concrete paths and confidence.

### Purpose Mapping Agent
- Role: Determine why an asset/request exists.
- Purpose: Distinguish feature request from underlying operating-system problem.
- Inputs: Request, existing assets, prior docs, business goals.
- Outputs: Purpose map, problem statement, intended outcome.
- Allowed: synthesis and register updates.
- Forbidden: assuming purpose without evidence.
- Escalation: if multiple purposes change priority materially.
- Quality: map every recommendation to business value or friction reduction.

### Friction Mapping Agent
- Role: Identify recurring human/system friction.
- Purpose: Convert frustration into addressable operating problems.
- Inputs: User wording, repeated docs, stale queues, duplicate systems.
- Outputs: Friction list with causes/impact/reducers.
- Allowed: inspect evidence and produce diagnostic docs.
- Forbidden: blaming user or reducing everything to code bugs.
- Escalation: if a friction point needs a policy decision.
- Quality: include business, technical, project impact.

### Asset Inventory Agent
- Role: Inventory projects, add-ons, agents, dashboards, scripts, workflows.
- Purpose: Prevent duplicate builds.
- Inputs: File trees, registries, package scripts, docs.
- Outputs: Add-on register with keep/merge/pause/rebuild/remove.
- Allowed: read-only inspection.
- Forbidden: deleting or archiving.
- Escalation: if asset ownership unknown.
- Quality: each item must have current state and next action.

### Dependency Mapping Agent
- Role: Map technical/business dependencies.
- Purpose: Reveal why work cannot be isolated.
- Inputs: APIs, routes, migrations, env references, portfolio registry.
- Outputs: Dependency graph and risk notes.
- Allowed: inspect code/docs/config names without secrets.
- Forbidden: printing secrets or changing env.
- Escalation: if dependency is production-critical or ambiguous.
- Quality: separate verified dependencies from inferred ones.

### Gap Detection Agent
- Role: Compare desired operating model against current assets.
- Purpose: Find missing pieces and duplicates.
- Inputs: Segment breakdown, asset inventory, friction map.
- Outputs: Gap matrix with severity/impact/effort/confidence.
- Allowed: synthesis and scoring.
- Forbidden: expanding scope without value test.
- Escalation: for P0 gaps requiring Board decision.
- Quality: every gap has evidence and next action.

### Business Value Agent
- Role: Score work by revenue, risk, operational leverage, ShipIt readiness.
- Purpose: Stop interesting-but-low-value work dominating.
- Inputs: Gap matrix, CRM/revenue data, product registry, current MRR context if available.
- Outputs: ROI notes, revenue opportunity links, priority recommendations.
- Allowed: analysis and recommendation.
- Forbidden: financial commitments or billing actions.
- Escalation: spend, pricing, billing, client promises.
- Quality: label confidence and evidence.

### Technical Reality Agent
- Role: Verify what actually works.
- Purpose: Prevent paper architecture from masquerading as working system.
- Inputs: scripts, tests, logs, git state, package scripts.
- Outputs: working/partial/broken status, blockers, safe verification plan.
- Allowed: non-mutating commands and safe checks.
- Forbidden: implementing fixes during diagnostic phase.
- Escalation: production-impacting failures.
- Quality: grounded in real command/file output.

### Prioritisation Agent
- Role: Rank next actions.
- Purpose: Convert diagnosis into a small executable queue.
- Inputs: gap matrix, business value, effort, dependencies.
- Outputs: next 10 actions and recommended sequence.
- Allowed: task draft creation after diagnostic output.
- Forbidden: assigning risky work without approvals.
- Escalation: if priority conflicts with Board strategy.
- Quality: P0/P1/P2/P3 labels with first file/command.

### Human Clarification Agent
- Role: Ask only high-leverage clarification after evidence scan.
- Purpose: Reduce raw fact questions and decision fatigue.
- Inputs: ambiguity list, options, risk class.
- Outputs: concise A/B/C decision request or approval packet.
- Allowed: ask for decision when needed.
- Forbidden: asking before available evidence is gathered.
- Escalation: approval-required actions.
- Quality: one decision at a time, with recommendation.

### Documentation Agent
- Role: Write/maintain diagnostic records and memory links.
- Purpose: Make understanding durable and reusable.
- Inputs: all diagnostic outputs and evidence paths.
- Outputs: markdown reports, registers, dashboard feed entries, Obsidian links.
- Allowed: write docs and local registers.
- Forbidden: claiming execution that did not happen.
- Escalation: if docs would overwrite canonical source.
- Quality: concise, practical, evidence-backed.

## Required diagnostic output before build

1. Related projects and assets.
2. Existing work already started.
3. Underlying purpose and friction.
4. Duplicate/unclear/missing elements.
5. Gap/priority matrix.
6. Approval requirements.
7. Next 10 actions.
8. Evidence ledger entry.
