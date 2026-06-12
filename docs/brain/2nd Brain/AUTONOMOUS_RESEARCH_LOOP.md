---
type: operating-model
component: autonomous-research-loop
status: active-draft
created: 2026-06-04
owner: research-lead
links:
  - "[[EVIDENCE_LEDGER_SCHEMA]]"
  - "[[GAP_DETECTION_ENGINE]]"
---

# Autonomous Research Loop

## Purpose

The research loop continuously inspects existing knowledge, validates it, finds missing evidence, researches deeper, and converts findings into gaps, decisions, tasks, or execution plans.

It is proactive. It does not wait for Phill to ask every question.

## Loop cadence

| Cadence | Scope | Output |
|---|---|---|
| Daily | hot Sources/Outcomes, repo status, active gaps | daily intelligence/gap digest |
| Weekly | cross-project patterns, stale assumptions, repeated signals | weekly executive intelligence brief |
| Monthly | strategy, SEO/content authority, ops, finance awareness | board review packet |
| On demand | user-directed mission | research brief + next actions |

## The 11-step loop

```
Inspect -> Classify -> Validate -> Research -> Compare -> Score
-> Recommend -> Assign -> Execute -> Document -> Review
```

## Step 1: Inspect

Inputs:
- last 7 days of `Sources/` and `Outcomes/`
- active `Sketches/`, `Pitches/`, `Decisions/`, `Personas/`
- repo `git status`, docs, package scripts, agent configs, dashboards
- existing gap/evidence records
- CI/test/cron/dashboard evidence where available

Output:
- inspected source list with paths and freshness.

## Step 2: Classify

Classify each item as:
- evidence
- assumption
- contradiction
- gap
- build candidate
- content/SEO candidate
- operational risk
- decision candidate
- archive/noise

## Step 3: Validate

For every claim:
- locate the source path/URL
- score reliability
- score freshness
- check whether current code/config contradicts docs
- mark evidence status

If evidence is missing, do not present the claim as fact.

## Step 4: Research

Research only what is needed to close a gap or improve a decision.

Approved sources first:
- existing repos and docs
- Obsidian sources/outcomes
- GitHub/Linear/Supabase/Vercel/Railway evidence available through existing tools
- existing Google integrations
- official docs or public web sources

Do not add a vendor or account. New vendor proposals are `need_approval`.

## Step 5: Compare

Compare:
- old assumption vs current evidence
- docs vs code
- product goal vs actual implementation
- competitor claim vs our capability
- dashboard metric vs underlying source
- content promise vs proof

## Step 6: Score

Score each finding:
- evidence confidence
- freshness
- business relevance
- severity
- ROI x urgency x confidence
- approval requirement

## Step 7: Recommend

Recommendations must include:
- action
- reason
- evidence
- owner/team
- severity
- expected impact
- approval requirement
- definition of done

Recommendations without evidence are labelled hypotheses.

## Step 8: Assign

Route to one of:
- Research Lead
- Senior PM
- Engineering
- Architecture
- Product/UX
- Marketing/SEO/AEO/GEO
- SMB Ops
- Finance/Legal/Accounting Awareness
- QA/Risk
- Documentation
- Dashboard/Automation
- Board approval queue

## Step 9: Execute

Allowed autonomous execution:
- local docs and structured Obsidian writes
- local scanner scripts
- read-only audits
- tests/builds/type-checks
- implementation plans
- code changes only when scope is approved and safe

Approval-required execution:
- deploys
- prod DB writes
- external comms
- billing/legal/accounting/client actions
- public publishing
- new vendors

## Step 10: Document

Write back:
- evidence records
- gap reports
- research briefs
- implementation plans
- QA reports
- outcomes
- decision drafts if required

## Step 11: Review

Review outcomes weekly:
- Did recommendations lead to action?
- Did evidence age out?
- Did gaps close?
- Did an assumption prove false?
- Did the system generate noise?
- Which loop should be changed?

## Daily loop output format

```markdown
# Daily Agentic Intelligence Digest — YYYY-MM-DD

## Top 5 next actions
| Rank | Action | Owner | Severity | Evidence | Approval |

## New gaps detected

## Evidence issues

## Stale assumptions

## Research queue

## Build/content/doc tasks proposed

## Risks / approvals

## What to ignore

## Verification log
```

## Weekly executive intelligence brief format

```markdown
# Weekly Executive Intelligence Brief — Week of YYYY-MM-DD

## Executive summary

## Strategic movements

## Project health by product

## Evidence strength map

## Gap burn-down

## Highest leverage next bets

## Risks requiring Phill

## Decisions to ratify

## Rejected / parked ideas

## Next week command plan
```

## Fail-safe rules

- If sources conflict, create contradiction gap.
- If evidence is stale, research before recommending action.
- If action is high-risk, escalate.
- If output has no owner/action, do not put it on dashboard.
- If recurring report says “all green” without investigation, reduce frequency or improve detector.
