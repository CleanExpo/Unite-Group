---
type: operating-model
component: agentic-intelligence-layer
status: active-draft
created: 2026-06-04
owner: nexus-executive-orchestrator
links:
  - "[[AGENTIC_SYSTEM_START_HERE]]"
  - "[[SPECIALIST_AGENT_ORG_CHART]]"
  - "[[GAP_DETECTION_ENGINE]]"
  - "[[EVIDENCE_LEDGER_SCHEMA]]"
  - "[[OBSIDIAN_MEMORY_WRITE_RULES]]"
  - "[[AUTONOMOUS_RESEARCH_LOOP]]"
  - "[[DASHBOARD_COMMAND_CENTER_SPEC]]"
  - "[[IMPLEMENTATION_ROADMAP]]"
  - "[[FIRST_10_AGENTIC_WORKFLOWS]]"
evidence_paths:
  - CLAUDE.md
  - Decisions/adr-006-retrieval-first-protocol.md
  - Sketches/04-nexus-obsidian-operating-brain-v2.md
  - Outcomes/2026-06-04-nexus-kb-architecture-research.md
---

# Agentic Intelligence Layer Blueprint

## Purpose

The agentic intelligence layer sits above Obsidian, Hermes, Nexus CRM, Synthex, RestoreAssist, CARSI, Disaster Recovery QLD, CCW, and related project systems.

Obsidian is memory. It stores markdown, evidence, notes, source extracts, decisions, sketches, pitches, outcomes, and transcripts.

The intelligence layer is the active organisation that reads memory, challenges it, validates it, expands it, identifies missing pieces, and turns the strongest findings into execution.

The system is not a chatbot. It is a senior autonomous operating organisation with defined roles, evidence standards, authority limits, and delivery gates.

## Current-state evidence from audit

| Area | Evidence found | Gap |
|---|---|---|
| 2nd-brain vault | `/Users/phillmcgurk/2nd-brain`, 551 markdown files, git repo, no remote | Capture volume is high; promotion/consolidation layer is thin |
| Obsidian workflow | `CLAUDE.md`, `Sketches/04-nexus-obsidian-operating-brain-v2.md` | Needs intelligence layer above memory; no formal gap/evidence ledgers yet |
| Retrieval rule | `Decisions/adr-006-retrieval-first-protocol.md` | Needs cross-project enforcement and standard outputs |
| Pi-CEO Nexus | `swarm/nexus/*`: outcomes, audit, approvals, BRA, discovery loop, scheduler | Discovery loop exists but only one loop_kind implemented; scheduler gated/dry-run; no outbound action execution |
| Unite-Group Authority-Site | `/nexus`, `/command-center`, Hermes proxy, semantic-search scripts, cron routes | Hermes proxy is chat passthrough; Obsidian path fields exist but no sync worker; semantic search wrapper has stubs |
| Unite-Hub CRM | `.claude/agents`, `.skills/custom`, Hermes Kanban, Margot docs, Obsidian MCP config | Strong local agent library but no shared cross-ecosystem agent protocol |
| Synthex | Full Obsidian client/importer, 43 cron routes, AEO/GEO/SEO dashboards, Hermes handoff | Richest Obsidian/content intelligence stack; not yet lifted into a shared Nexus protocol |
| RestoreAssist | Mission Control, Margot proxy, Nexus context bundle, governance/QA | Light Obsidian integration; strong governance but siloed |
| Disaster Recovery QLD | Native NEXUS agent registry + trigger APIs, SEO/content crons | CLAUDE.md corruption reported; light Hermes/Obsidian integration |
| Cross-ecosystem | Portfolio registry and repo-local dashboards exist | No unified evidence ledger, gap ledger, command-center aggregator, shared agent registry, or cross-repo event bus |

## Architecture

```
                 Phill / Board Member
                         |
                         v
            Executive Orchestration Layer
                         |
       +-----------------+-----------------+
       |                 |                 |
 Strategic Board   Senior PM Office   Governance Office
       |                 |                 |
       v                 v                 v
  Research +        Gap Detection       Risk / Approval
  Evidence Team          Engine             Gates
       |                 |                 |
       +-----------------+-----------------+
                         |
                         v
              Command Layer: Hermes / Pi-CEO
                         |
        +----------------+----------------+
        |                |                |
   Memory Layer      Execution Layer   Dashboard Layer
  Obsidian/docs      code/content/QA    Nexus cockpit
        |                |                |
        +----------------+----------------+
                         |
                         v
                 Evidence Ledger
```

## Layer 1: Memory Layer

Purpose: durable, traceable context.

Sources:
- `/Users/phillmcgurk/2nd-brain/`
- repo docs: `docs/`, `.claude/`, `.skills/`, `AGENTS.md`, `CLAUDE.md`
- project reports, briefs, plans, outcomes
- transcripts, voice notes, personal intelligence notes
- source references and external research saved as markdown
- decision records and Shape Up artifacts

Rules:
- Memory does not decide.
- Memory does not execute.
- Memory must be structured enough for agents to retrieve, cite, and compare.
- Hot memory is loaded first; cold memory is searched, not dumped into context.

## Layer 2: Intelligence Layer

Purpose: read, analyse, validate, challenge, compare, research, reason, and recommend.

Core functions:
- answer “what do we know?” and “where did it come from?”
- score evidence reliability, freshness, and business relevance
- detect contradictions and stale assumptions
- create gap records
- produce recommendations linked to business goals
- hand off execution tasks through the command layer

Specialist teams:
- Executive Orchestrator
- Strategic Board
- Senior PM Office
- Evidence and Research Office
- Architecture and Engineering Office
- Product/UX/Brand/Marketing Office
- SMB Operations/Finance/Legal/Accounting Awareness Office
- QA/Risk/Governance Office
- Documentation and Knowledge Office
- Automation and Dashboard Office

## Layer 3: Command Layer

Purpose: route work, preserve priorities, coordinate agents, and maintain auditability.

Primary command layer:
- Hermes CLI / scheduled Hermes jobs
- Pi-CEO Nexus scheduler and discovery loop
- repo-local orchestration scripts and APIs
- approved cron routes and existing CI workflows

Command responsibilities:
- select correct agent or team
- enforce retrieval-first protocol
- enforce evidence requirements before recommendations
- convert approved gaps into research/build/content/doc tasks
- prevent unsafe side effects
- record outcomes back into the memory/evidence layers

## Layer 4: Execution Layer

Purpose: implement approved work.

Execution surfaces:
- software engineering PRs
- content/SEO/AEO/GEO updates
- campaign briefs and content packets
- dashboard updates
- documentation/runbooks
- QA reports and audits
- automation scripts and cron jobs
- Linear/GitHub task creation where approved

Gate sequence for build work:
1. retrieve context
2. validate evidence
3. write plan
4. implement minimal slice
5. run tests/checks
6. write QA outcome
7. update docs/evidence/gaps
8. escalate if human approval is required

## Layer 5: Evidence Layer

Purpose: convert claims into traceable records.

Every meaningful claim must carry:
- source path/URL
- date gathered
- freshness rating
- confidence score
- claim supported
- contradiction status
- business relevance
- linked project/component
- recommended action

Storage v0:
- Markdown ledgers in `2nd-brain/`
- JSONL generated by scripts when implementation begins
- future optional Supabase table after sandbox review

## Layer 6: Gap Detection Layer

Purpose: find missing pieces across strategy, product, code, content, marketing, operations, finance, legal, accounting, documentation, automation, QA, and governance.

A gap is actionable only when it has:
- category
- severity
- owner/team
- evidence status
- business impact
- next action
- approval requirement
- target artifact

## Layer 7: Governance Layer

Purpose: keep autonomy useful and safe.

Auto-allowed:
- read/search local docs and repos
- write structured Obsidian notes under approved templates
- generate local plans, gap reports, evidence reports, QA reports
- run read-only audits and local tests
- propose tasks and drafts

Approval-required:
- production DB writes
- deploys
- external client communication
- billing/legal/contract actions
- public publishing
- new vendors/accounts
- irreversible repo operations

Forbidden without explicit approval:
- Nango or third-party connector platforms
- new external services/accounts
- publishing private vault content
- fabricating evidence

## Layer 8: Dashboard Layer

Purpose: show actionable truth, not passive metrics.

The command center must show:
- active gaps by severity and owner
- evidence strength and stale assumptions
- research queue
- agent activity and blocked tasks
- build pipeline and QA status
- approvals queue
- risks and red flags
- rejected/parked ideas
- next best actions ranked by ROI x urgency x confidence

## Core operating loop

```
Inspect -> Retrieve -> Classify -> Validate -> Challenge -> Research -> Score
-> Recommend -> Assign -> Execute -> QA -> Document -> Review -> Improve
```

## First implementation spine

1. Create these operating docs in the 2nd-brain root.
2. Add machine-readable templates for gap and evidence records.
3. Build a local Source-to-Shape / Gap Detection scanner.
4. Output a daily Markdown command-center report.
5. Later wire the report into existing `/nexus` or command-center dashboards.

## Non-goals

- Do not turn Obsidian into a fake database when Markdown + frontmatter is enough.
- Do not build a vector/RAG system before metadata/search fails.
- Do not create new external vendors.
- Do not automate Board-only decisions.
- Do not write bloated notes with no action path.
