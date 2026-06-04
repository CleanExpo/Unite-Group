---
type: workflow-catalog
component: agentic-intelligence-layer
status: active-draft
created: 2026-06-04
owner: nexus-executive-orchestrator
links:
  - "[[AUTONOMOUS_RESEARCH_LOOP]]"
  - "[[IMPLEMENTATION_ROADMAP]]"
---

# First 10 Agentic Workflows

## Workflow 1: Obsidian vault audit

Goal: understand memory quality and promotion bottlenecks.

Inputs:
- `2nd-brain/CLAUDE.md`
- all folder counts
- recent Sources/Outcomes
- Sketch/Grill/Pitch/Decision ratios

Output:
- `Outcomes/YYYY-MM-DD-obsidian-vault-audit.md`

Checks:
- missing frontmatter
- unlinked sources
- stale decisions
- sketches without grills
- repeated topics with no consolidation

Owner: Documentation Architect + Evidence Librarian.

## Workflow 2: Missing evidence detection

Goal: find claims/recommendations without citations.

Inputs:
- latest briefs, outcomes, plans, pitch docs
- repo docs that assert status

Output:
- gap records for weak/uncited claims
- evidence refresh tasks

Owner: Evidence Librarian + Contradiction Hunter.

## Workflow 3: Project gap analysis

Goal: create portfolio-level gaps by repo/product.

Inputs:
- repo status
- CLAUDE/AGENTS docs
- dashboards/routes/scripts/tests
- existing audit findings

Output:
- `Outcomes/YYYY-MM-DD-project-gap-analysis.md`

Projects:
- Unite-Group Authority-Site
- Unite-Hub CRM
- Synthex
- RestoreAssist
- Disaster Recovery QLD
- CARSI
- CCW

Owner: Senior PM + Principal Systems Architect.

## Workflow 4: Competitor intelligence research

Goal: compare our products/content/offers against market alternatives.

Inputs:
- product positioning docs
- target keywords/entities
- public competitor sources

Output:
- research brief with source URLs
- SEO/content/product gaps

Owner: Competitor Intelligence Agent + Marketing Strategist.

Approval: no paid tools or new vendors without approval.

## Workflow 5: SEO/AEO/GEO opportunity detection

Goal: improve search, answer-engine, and generative-engine visibility.

Inputs:
- Synthex SEO/AEO/GEO dashboards and scripts
- sitemaps, robots, llms.txt across repos
- content inventories
- current source evidence

Output:
- ranked SEO/AEO/GEO action list
- schema/content/internal-link tasks

Owner: SEO Lead + Content Intelligence Agent.

## Workflow 6: Codebase improvement scan

Goal: find engineering risks and leverage opportunities.

Inputs:
- repo status
- package scripts
- CI workflows
- tests
- known stubs and broken paths

Output:
- engineering gap report
- implementation plan candidates

Known starting gaps:
- Unite-Group personal-intelligence scripts import missing `src/lib/personal-intelligence/*`
- Unite-Group semantic search helper has stubbed embedding integration
- Synthex and DR are behind origin by 1
- RestoreAssist has active local tutorial/video changes

Owner: Principal Systems Architect + QA Lead.

## Workflow 7: Content authority improvement loop

Goal: turn stored knowledge into authority assets without slop.

Inputs:
- evidence-backed Sources
- product gaps
- SEO/AEO/GEO opportunities
- brand voice docs

Output:
- content briefs with citations
- publish approval packets
- internal queue only unless approved

Owner: Content Intelligence Agent + Brand Strategist.

## Workflow 8: Dashboard update loop

Goal: keep command center actionable.

Inputs:
- gap ledger
- evidence ledger
- agent activity
- QA/build status
- approvals

Output:
- `Outcomes/YYYY-MM-DD-agentic-command-center.md`
- future dashboard JSON feed

Owner: Dashboard Operator.

Rule: no dashboard item without owner, action, status, evidence.

## Workflow 9: Strategic board review loop

Goal: challenge direction and prevent drift.

Inputs:
- weekly gap/evidence summaries
- revenue/client/product signals
- risk register
- accepted/rejected ideas

Output:
- weekly board memo
- decisions to ratify
- parked/rejected idea log

Owner: Strategy Chair + Risk Board Agent + Board Secretary.

## Workflow 10: Weekly executive intelligence briefing

Goal: give Phill the shortest possible high-leverage brief.

Inputs:
- all workflow outputs
- active gaps
- evidence strength map
- build/QA status
- approvals

Output:
- `Outcomes/YYYY-MM-DD-weekly-executive-intelligence-brief.md`

Sections:
1. top 5 decisions/actions
2. what changed
3. strongest opportunities
4. biggest risks
5. evidence gaps
6. work to ignore
7. commands to run next

Owner: Nexus Executive Orchestrator.

## Workflow execution contract

Every workflow must produce:
- input paths/sources
- findings
- evidence status
- gaps/tasks created
- recommended next action
- owner
- approval requirement
- verification note

## First workflow to run next

Run Workflow 3 and Workflow 8 together as a local-only MVP:

- project gap analysis
- dashboard command-center digest

No external side effects.
