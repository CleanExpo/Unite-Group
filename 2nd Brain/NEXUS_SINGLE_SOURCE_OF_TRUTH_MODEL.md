# Nexus Single Source of Truth Model

Status: diagnostic discovery output
Date: 2026-06-04
Scope: Unite-Group Nexus ecosystem local inspection
Evidence base: local filesystem inspection of `/Users/phillmcgurk/2nd-brain`, `/Users/phillmcgurk/Unite-Group`, `/Users/phillmcgurk/Unite-Hub`, `/Users/phillmcgurk/Synthex`, `/Users/phillmcgurk/RestoreAssist`, `/Users/phillmcgurk/Disaster-Recovery`, `/Users/phillmcgurk/Pi-CEO`; portfolio registry `/Users/phillmcgurk/Unite-Hub/.portfolio/PORTFOLIO.yaml`; selected README/CLAUDE/docs/scripts/routes/agent files.
Guardrail: this is understanding and diagnostic mapping only. No implementation, deploy, DB write, external account, or publishing action was performed.


## Purpose

Unite-Group Nexus should become the single source of truth by holding canonical registries and ledgers while allowing each product repo to remain the implementation home for its own code.

## SSOT objects

### Project registry
- Fields: project_id, canonical_name, aliases, repo, local_path, status, owner, purpose, stack, deployment, CI gates, data sources, related products.
- Current source: `/Users/phillmcgurk/Unite-Hub/.portfolio/PORTFOLIO.yaml`.
- Prevents: wrong repo, wrong name, wrong deployment target.

### Add-on registry
- Fields: add_on_id, name, category, project_id, purpose, status, business_value, inputs, outputs, dependencies, recommendation.
- Current seed: `ADD_ON_PURPOSE_REGISTER.md`.
- Prevents: disconnected add-ons and duplicate systems.

### Agent registry
- Fields: agent_id, name, role, segment_owner, allowed_actions, forbidden_actions, escalation_rules, active/archived, source_path.
- Current sources: Unite-Hub `.claude/agents`, Pi-CEO `agentskills.yaml`, 2nd-brain `.agentic_nexus/registries/agents.json`, Synthex agents.
- Prevents: unclear ownership and wrong agent assignment.

### Workflow registry
- Fields: workflow_id, trigger, steps, owner_agent, approval_class, outputs, validation, dashboard_event.
- Current sources: ShipIt, work-discovery, Synthex marketing workflow, RestoreAssist release gates, Pi-CEO Nexus loops.
- Prevents: reports without follow-through.

### Evidence ledger
- Fields: evidence_id, task_id, project_id, source_path, command/tool output, result, confidence, timestamp, related_decision.
- Current sources: `.agentic_nexus/state/evidence.jsonl`, Pi-CEO `nexus_audit`, RestoreAssist validation docs, Synthex claim ledgers.
- Prevents: fabricated or unverifiable claims.

### Decision register
- Fields: decision_id, decision, options, rationale, approver, date, rollback, affected_projects.
- Current sources: 2nd-brain `Decisions`, approvals queues, repo ADRs.
- Prevents: repeated debates and stale assumptions.

### Task queue
- Fields: task_id, source_request, segment, owner_agent, status, priority, approval_required, evidence_required, next_action.
- Current sources: work-discovery, Agentic Nexus tasks, Linear/GitHub if connected.
- Prevents: dropped work.

### Dashboard status feed
- Fields: projects, health, gaps, tasks, approvals, ShipIt, revenue opportunities, risks, last_updated.
- Current consumers: Unite-Group Command Center, Unite-Hub founder dashboard, Hermes dashboard concepts.
- Prevents: multiple dashboards answering different truths.

### Obsidian memory links
- Fields: note_path, type, project_id, entities, related_evidence, related_decisions, status.
- Current source: `/Users/phillmcgurk/2nd-brain`.
- Prevents: notes becoming unstructured storage only.

### GitHub links
- Fields: repo, branch, PR, issue, commit, CI status, related_task.
- Current source: local git and GitHub CLI where needed.
- Prevents: losing implementation state.

### Business goal links
- Fields: goal_id, metric, target, related_projects, related_tasks, status.
- Current source: Nexus North Star docs and business profile.
- Prevents: technical work detaching from company goals.

### Revenue opportunity links
- Fields: opportunity_id, source, value_estimate, project, customer/market, confidence, next_action, CRM link.
- Current sources: CRM, Synthex, DR SEO, RestoreAssist, CCW/CARSI/NRPG when available.
- Prevents: ideas not converting to pipeline.

### Risk register
- Fields: risk_id, category, severity, affected_projects, mitigation, owner, status, approval_required.
- Current sources: 2nd-brain decisions, DR compliance docs, RestoreAssist gates, security skills.
- Prevents: autonomy outrunning safety.

## How it prevents confusion

- Every request maps to existing projects/add-ons before new work starts.
- Every add-on has a purpose and keep/merge/pause/rebuild/remove recommendation.
- Every agent has an owner segment and action boundary.
- Every task has evidence and a dashboard state.
- Every decision has rationale and rollback.
- Every revenue idea links to CRM/opportunity status.
- Obsidian remains the memory layer, but Nexus provides the intelligence/index layer.
