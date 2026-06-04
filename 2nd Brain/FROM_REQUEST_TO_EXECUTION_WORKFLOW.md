# From Request to Execution Workflow

Status: diagnostic discovery output
Date: 2026-06-04
Scope: Unite-Group Nexus ecosystem local inspection
Evidence base: local filesystem inspection of `/Users/phillmcgurk/2nd-brain`, `/Users/phillmcgurk/Unite-Group`, `/Users/phillmcgurk/Unite-Hub`, `/Users/phillmcgurk/Synthex`, `/Users/phillmcgurk/RestoreAssist`, `/Users/phillmcgurk/Disaster-Recovery`, `/Users/phillmcgurk/Pi-CEO`; portfolio registry `/Users/phillmcgurk/Unite-Hub/.portfolio/PORTFOLIO.yaml`; selected README/CLAUDE/docs/scripts/routes/agent files.
Guardrail: this is understanding and diagnostic mapping only. No implementation, deploy, DB write, external account, or publishing action was performed.


## Workflow

| Step | Action | Owner | Output | Gate |
|---|---|---|---|---|
| 1 | Capture the request | Hermes/Margot | Raw request record | None |
| 2 | Extract intent | Context Discovery Agent | Intent summary: build/research/diagnose/decide/approve | If unclear, continue discovery before asking |
| 3 | Identify related projects | Context Discovery Agent | Project list from portfolio registry | Must read registry first |
| 4 | Search existing assets | Asset Inventory Agent | Paths for docs, scripts, agents, dashboards, routes, workflows | Read-only |
| 5 | Identify what already exists | Asset Inventory Agent | Existing assets table | Evidence paths required |
| 6 | Identify what has already been started | Technical Reality Agent | Active branches, queues, partial builds, stale tasks | git/status/log evidence |
| 7 | Determine purpose behind request | Purpose Mapping Agent | Purpose statement | Must connect to business/ops value |
| 8 | Map underlying issue | Friction Mapping Agent | Underlying problem(s) | Not only technical bugs |
| 9 | Break request into segments | Dependency Mapping Agent | Segment map | Use standard Nexus segments |
| 10 | Identify friction | Friction Mapping Agent | Friction map | Include cause/impact/reducer |
| 11 | Identify missing evidence | Research Evidence Agent | DATA_REQUIRED list | Blocks speculative auto-execution |
| 12 | Identify dependencies | Dependency Mapping Agent | Dependencies and risk notes | Secrets never printed |
| 13 | Recommend options | Prioritisation Agent | A/B/C options | Prefer evidence-backed default |
| 14 | Prioritise next actions | Business Value + Prioritisation | Priority matrix and next 10 actions | Revenue/ShipIt/friction scored |
| 15 | Ask for human approval if needed | Human Clarification Agent | Approval packet | Required for prod DB/deploy/external/billing/new vendor/destructive actions |
| 16 | Assign specialist agents | Prioritisation Agent | Agent/task assignment | Agent must have clear owner and success criteria |
| 17 | Execute safely | Specialist agents | Code/docs/tasks/artifacts | Only after gates pass |
| 18 | Validate output | Technical Reality + QA | Test/build/audit/readback results | No fabricated verification |
| 19 | Document evidence | Documentation Agent | Evidence ledger entry | Tool output/path required |
| 20 | Update dashboard | Dashboard Reporter | Status feed update | Uses canonical feed schema |
| 21 | Update Obsidian memory | Documentation Agent | Linked Outcome/Decision note | No stale trivia in memory |
| 22 | Create next action | Prioritisation Agent | Next task or decision | Must be small and owned |

## Decision rules

- If the request affects only documentation and diagnostic understanding: write local Obsidian docs, verify files, no approval needed.
- If the request affects code but not production: inspect, plan, then execute with tests after user-approved direction if risk is material.
- If the request affects production data, deploys, client comms, billing, public publishing, or new vendors: create approval packet and stop.
- If the request is broad/strategic: produce discovery report, friction map, gap matrix, next 10 actions before any implementation.

## Required request record fields

- request_id
- raw_request
- extracted_intent
- related_projects
- assets_found
- assets_started
- purpose
- underlying_friction
- gaps
- evidence_required
- recommended_options
- approval_required
- assigned_agents
- validation_plan
- dashboard_update_path
- obsidian_update_path
- next_action
