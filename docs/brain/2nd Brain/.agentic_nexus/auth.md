# auth.md

## Service

Agentic Nexus Control Plane

## Purpose

This file defines how AI agents, coding agents, research agents, dashboard agents, and automation workers are allowed to authenticate with and operate inside the Agentic Nexus ecosystem.

Agentic Nexus is the internal control plane for Unite-Group Nexus. It coordinates Hermes, Obsidian, GitHub repositories, local worker computers, dashboards, project registries, task queues, evidence ledgers, and approval gates.

Obsidian is the memory layer.
Hermes is the command layer.
Agentic Nexus is the control plane.
Specialist agents are the intelligence and execution layer.

## Supported Agent Types

The following agent types may request access:

* Hermes CEO Orchestrator
* Senior Project Manager Agent
* Context Discovery Agent
* Purpose Mapping Agent
* Friction Mapping Agent
* Research Director Agent
* Evidence Validator Agent
* Principal Software Engineer Agent
* QA/Test Agent
* UI/UX Review Agent
* SEO/AEO/GEO Agent
* Marketing Strategy Agent
* Brand Authority Agent
* Business Operations Agent
* Finance Awareness Agent
* Legal/Compliance Awareness Agent
* Documentation Agent
* Dashboard Reporter Agent
* Local Build Worker
* Local Research Worker

## Authentication Model

Agents must authenticate through the Agentic Nexus control plane.

Agents are not allowed to directly access production systems, repositories, Obsidian vaults, billing systems, email systems, databases, or dashboards unless the control plane grants an approved scope.

Each agent session must include:

* agent_id
* agent_type
* assigned_project
* assigned_task
* requested_scopes
* worker_id
* session_start_time
* human_owner
* approval_status

## Permission Scopes

### Read Scopes

* read:project_registry
* read:agent_registry
* read:task_queue
* read:obsidian_memory
* read:github_repository
* read:dashboard_status
* read:evidence_ledger
* read:decision_register
* read:business_goals

### Write Scopes

* write:task_status
* write:structured_obsidian_note
* write:evidence_record
* write:gap_report
* write:decision_draft
* write:dashboard_status
* write:branch_commit
* write:pull_request_draft
* write:qa_report

### Execution Scopes

* run:lint
* run:typecheck
* run:tests
* run:build
* run:playwright
* run:local_script
* run:research_task
* run:gap_analysis
* run:shipit_readiness_check

### Restricted Scopes

The following scopes always require human approval:

* merge:pull_request
* deploy:production
* publish:public_content
* send:external_email
* modify:billing
* modify:authentication
* modify:database_policy
* modify:rls_policy
* delete:file
* delete:database_record
* access:customer_personal_data
* access:payment_data
* change:legal_or_compliance_position

## Forbidden Actions

Agents must not:

* access production secrets directly
* modify billing without approval
* change authentication logic without approval
* change RLS/database policies without approval
* delete files without approval
* merge pull requests without approval
* deploy to production without approval
* send external emails without approval
* publish public content without approval
* invent evidence
* overwrite Obsidian memory with unstructured dumps
* bypass the task queue
* bypass the evidence ledger
* bypass human approval gates

## Required Evidence

Every agent action must produce evidence appropriate to the task.

Research tasks must include:

* source links or file paths
* date gathered
* confidence score
* missing evidence notes
* contradictions found
* recommended next action

Coding tasks must include:

* files changed
* commands run
* test results
* build results
* screenshots if UI was affected
* errors encountered
* pull request or branch reference
* recommended next action

Business strategy tasks must include:

* business goal supported
* assumptions
* evidence strength
* revenue impact
* risk level
* next decision required

## Human Approval Gates

Human approval is required before:

* production deployment
* public publishing
* email sending
* billing or payment changes
* legal/compliance-sensitive outputs
* destructive actions
* database policy changes
* authentication changes
* customer-facing claims
* final ShipIt approval

## Obsidian Memory Rules

Agents may write to Obsidian only using structured templates.

Allowed Obsidian write types:

* research brief
* evidence record
* gap report
* decision draft
* implementation plan
* QA report
* project status summary
* executive briefing

Agents must not write random, duplicated, unsupported, or untraceable notes.

## Default Behaviour

If an agent is unsure whether an action is allowed, it must stop and request approval.

If a task lacks enough context, the agent must run the diagnostic layer first:

1. inspect existing assets
2. identify purpose
3. map friction
4. detect gaps
5. recommend smallest useful next action

## Owner

Human owner: Phill McGurk
Organisation: Unite-Group Nexus
System: Agentic Nexus
