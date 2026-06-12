# Nexus Reduce Friction Plan

Status: diagnostic discovery output
Date: 2026-06-04
Scope: Unite-Group Nexus ecosystem local inspection
Evidence base: local filesystem inspection of `/Users/phillmcgurk/2nd-brain`, `/Users/phillmcgurk/Unite-Group`, `/Users/phillmcgurk/Unite-Hub`, `/Users/phillmcgurk/Synthex`, `/Users/phillmcgurk/RestoreAssist`, `/Users/phillmcgurk/Disaster-Recovery`, `/Users/phillmcgurk/Pi-CEO`; portfolio registry `/Users/phillmcgurk/Unite-Hub/.portfolio/PORTFOLIO.yaml`; selected README/CLAUDE/docs/scripts/routes/agent files.
Guardrail: this is understanding and diagnostic mapping only. No implementation, deploy, DB write, external account, or publishing action was performed.


## Objective

Reduce the repeated friction that causes Phill to explain the same vision, agents to build disconnected add-ons, and dashboards/docs/tasks to drift apart.

## Plan

| Focus | Practical move | Benefit | Owner | First step |
|---|---|---|---|---|
| Reduce repeated explanations | Make `/Users/phillmcgurk/Unite-Hub/.portfolio/PORTFOLIO.yaml` plus this diagnostic set mandatory first-read for Nexus work | Agents start with portfolio context | Context Discovery Agent | Add “read portfolio registry” to Nexus bootstrap |
| Give agents better context | Create canonical project/add-on/agent/workflow registries | Less repo-local tunnel vision | Asset Inventory Agent | Convert ADD_ON_PURPOSE_REGISTER into machine-readable JSON later |
| Link related assets | Link Obsidian outcomes to repo paths, GitHub, dashboard routes, approvals, evidence | Faster retrieval and less duplication | Documentation Agent | Add links from each new diagnostic doc to relevant source paths |
| Improve dashboard visibility | Build one dashboard status feed before more UI | Multiple dashboards can consume same truth | Dashboard Reporter | Define JSON schema with projects/gaps/approvals/tasks/evidence |
| Make every task traceable | Use request -> diagnostic -> task -> evidence -> dashboard -> memory chain | Stops orphaned work | Prioritisation Agent | Bridge work-discovery candidates to Agentic Nexus task drafts |
| Turn notes into structured intelligence | Add entity tags: project, add-on, agent, workflow, gap, decision, evidence | Obsidian becomes queryable | Documentation Agent | Tag new docs and create index note |
| Reduce duplicate workflows | Mark each add-on keep/merge/pause/rebuild/remove | Avoid parallel systems | Purpose Mapping Agent | Review top duplicated: approvals, dashboards, agent registries, CRM ownership |
| Clarify project ownership | Treat Unite-Hub as CRM and Unite-Group as Authority/Empire unless Board changes it | Prevent wrong-repo changes | CRM Ops Agent | Produce route/schema ownership map |
| Improve decision-making | Standard A/B/C recommendations with evidence and recommendation | Phill decides faster | Human Clarification Agent | Apply to all approval-required items |
| Improve handoffs | Every task gets owner agent, expected output, evidence, first command/file | Less dropped work | Project Manager Agent | Use NEXT_10_ACTIONS format for future tasks |
| Improve ShipIt readiness | Standardise RestoreAssist-style gates across projects | No false “ready” claims | QA Agent | Extract portfolio ShipIt template from RA Phase 3 plan |
| Improve business growth execution | Link Synthex/DR SEO outputs to CRM revenue opportunities | Marketing becomes pipeline | Business Value Agent | Add revenue opportunity register |
| Make Nexus central command | SSOT model stores registries, evidence, decisions, queues, risks | One system of record | Nexus Orchestrator | Build diagnostic layer first, then feed dashboard |

## 30-day friction reduction sequence

1. Week 1: Fix diagnostic front door, canonical registries, and Margot health.
2. Week 2: Connect work-discovery -> task drafts -> approvals -> dashboard feed.
3. Week 3: Standardise ShipIt gates and evidence ledger across active repos.
4. Week 4: Connect growth/revenue loops: Synthex intelligence + DR SEO + Unite-Hub CRM.

## What not to do

- Do not build another dashboard UI before defining the status feed.
- Do not expand agent count before creating ownership/status fields.
- Do not treat Obsidian markdown volume as intelligence.
- Do not merge RestoreAssist into the CRM; keep it standalone and report into Nexus.
- Do not use new vendors or connector platforms without approval.
