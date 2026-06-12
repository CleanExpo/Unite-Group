# Purpose and Friction Map

Status: diagnostic discovery output
Date: 2026-06-04
Scope: Unite-Group Nexus ecosystem local inspection
Evidence base: local filesystem inspection of `/Users/phillmcgurk/2nd-brain`, `/Users/phillmcgurk/Unite-Group`, `/Users/phillmcgurk/Unite-Hub`, `/Users/phillmcgurk/Synthex`, `/Users/phillmcgurk/RestoreAssist`, `/Users/phillmcgurk/Disaster-Recovery`, `/Users/phillmcgurk/Pi-CEO`; portfolio registry `/Users/phillmcgurk/Unite-Hub/.portfolio/PORTFOLIO.yaml`; selected README/CLAUDE/docs/scripts/routes/agent files.
Guardrail: this is understanding and diagnostic mapping only. No implementation, deploy, DB write, external account, or publishing action was performed.


## Core pattern

Phill has repeatedly been describing an operating-system problem, not a single-feature problem. The ecosystem has many valuable pieces, but each agent/session tends to see only one file, one repo, or one task. That causes disconnected add-ons, repeated explanation, and weak follow-through.

| Friction | Underlying cause | Business impact | Technical impact | Project impact | What reduces it | Recommended owner/workflow |
|---|---|---|---|---|---|---|
| Too many disconnected systems | CRM, authority site, Pi-CEO, Obsidian, Synthex, ShipIt, dashboards and agent registries are separate | Phill spends time translating context instead of progressing revenue | Duplicated schemas, duplicated docs, unclear APIs | Work starts but does not compound | Nexus SSOT registry + diagnostic bootstrap | Context Discovery Agent + Asset Inventory Agent |
| Obsidian stores notes but does not reason | Vault is a markdown store; no entity graph, prioritisation, or auto-linking | Good ideas disappear into files | Search is manual/path-based | Agents miss previous work | Obsidian memory links + evidence ledger + diagnostic index | Documentation Agent + Dependency Mapping Agent |
| Agents do not understand whole business context | Agents load repo-local docs but not portfolio-level intent | Recommendations optimise local task, not company outcome | Changes conflict across repos | Add-ons drift from North Star | Mandatory request-to-execution workflow | Context Discovery Agent |
| Add-ons created without orchestration | Multiple attempts solve visibility/autonomy separately | More tools, more confusion | Parallel control planes | Maintenance burden | Add-on purpose register with keep/merge/pause/rebuild decisions | Purpose Mapping Agent |
| Hard to see project status | Many dashboards and status docs, no unified feed | Board cannot quickly decide priorities | Status JSON/markdown scattered | Stale approvals and ShipIt uncertainty | Dashboard status feed sourced from registries/queues | Dashboard Reporter Agent |
| Lack of autonomous follow-through | Discovery reports do not automatically become tasks; approvals stale | Opportunities remain theoretical | No bridge from candidate -> task -> approval -> execution -> evidence | ShipIt ticks can be empty | Work-discovery bridge with low-risk auto-routing | Prioritisation Agent + Task Scheduling Agent |
| Unclear task ownership | Many agents exist, but ownership/status fields missing or duplicated | Phill reassigns work manually | Agent registries fragmented | Work stalls between repos | Canonical agent registry with segment ownership | Asset Inventory Agent |
| Repeated need to explain same vision | No mandatory intake that extracts intent and maps existing assets first | High cognitive load for Phill | Agents rebuild context each session | Same files/prompts repeated | Diagnostic layer before execution | Human Clarification Agent only after evidence scan |
| Lack of evidence-backed research | Research ingest exists but source quality/backoff/claim verification inconsistent | Marketing/growth choices risk being speculative | 429s/timeouts/noisy scans | Synthex/SEO work can drift | Claim verification ledger and DATA_REQUIRED gates | Research Evidence Agent + Synthex marketing intelligence |
| Incomplete ShipIt readiness | RestoreAssist has strong gates; other projects lack standardised gates | False readiness risk | Inconsistent CI/audit/test policies | Deploy anxiety | Portfolio ShipIt template based on RestoreAssist | QA and ShipIt Agent |
| Missing dashboard visibility | Multiple UI concepts but no single data model | Hard to know what matters today | Dashboard components duplicate logic | No reliable operational cockpit | Single dashboard feed: projects, gaps, tasks, approvals, evidence | Dashboard Reporter Agent |
| Business growth execution is not connected | Synthex, DR SEO, CCW, CRM leads are not connected into one revenue loop | Revenue opportunities leak | Lead/intelligence data not routed consistently | Growth stays as content rather than pipeline | Revenue opportunity register linked to CRM | Growth/Marketing Agent + CRM Ops Agent |
| Unclear path from idea to revenue | Pitches and sketches do not always convert into prioritised experiments | Ideas do not become cashflow | No revenue-impact scoring | Product backlog bloats | Prioritisation matrix with revenue impact and effort | Business Value Agent |
| Lack of structured decision-making | Decisions exist in markdown/queues but not enforced by workflow | Repeated debates | Approval gates inconsistent | Agents guess | Decision register + standard approval object | Human Clarification Agent + Documentation Agent |
| Local computer worker coordination unclear | Pi-CEO swarm, `.agentic_nexus`, Hermes cron and local machines differ | Autonomy feels unreliable | Path hardcoding and no heartbeats | Workers not portable | Worker registry with heartbeat and capabilities | Technical Reality Agent |
| Human approval gates fragmented | Synthex, Pi-CEO, Agentic Nexus, RestoreAssist all define gates separately | Risk of unsafe actions or bottlenecks | No common state machine | Approvals stale | Standard approval matrix with low/medium/high risk classes | Human Clarification Agent |
| No clear next actions | Reports often end as markdown without task creation | Momentum loss | No bridge to queue/dashboard | Diagnostic outputs become shelfware | Every report writes next 10 actions and task candidates | Prioritisation Agent |
| CRM vs Authority-site confusion | Product names and repo names overlap; Unite-Group aliases include CRM but repo is Authority-Site | Wrong repo changes | CRM code duplicated/migrating | Migration risk | Portfolio registry first-read and route ownership map | Context Discovery Agent |
| Margot automation currently brittle | Cron/model routing issue observed; broad mandate but config mismatch | PM automation unreliable | Scheduler fires but fails | Reports stale | Fix model routing and health check before expanding | Technical Reality Agent |
| Marketing intelligence lacks live data inputs | Vault has limited SEO/AEO/GEO source signal; no GSC/GA exports found in vault | Growth strategy may be under-evidenced | DATA_REQUIRED should block auto-execution | Content actions may be low confidence | Data source registry + confidence factors | Research Evidence Agent |

## Highest-friction theme

The repeated friction is not that there are no agents. It is that agents lack a shared diagnostic memory and a shared operating model. The cure is a front-door workflow: every request enters discovery, purpose mapping, friction mapping, asset inventory, gap detection, prioritisation, and only then execution.
