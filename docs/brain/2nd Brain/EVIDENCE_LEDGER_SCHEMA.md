---
type: schema
component: agentic-nexus-evidence-ledger
status: active-draft
created: 2026-06-04
owner: evidence-validator-agent
---

# Evidence Ledger Schema

## Purpose

Every claim, recommendation, build decision, research finding, business strategy, QA result, or approval request must link to evidence.

## Evidence object

```json
{
  "evidence_id": "EVID-20260604-0001",
  "created_at": "ISO-8601",
  "linked_task": "ANX-20260604-0001",
  "linked_project": "2nd-brain",
  "source_path_or_url": ".agentic_nexus/artifacts/ANX-.../artifact.md",
  "source_type": "artifact|code|test_log|build_log|screenshot|obsidian_note|repo_doc|github|external_primary|external_secondary|user_instruction",
  "date_gathered": "2026-06-04",
  "freshness": "current|recent|aging|stale|unknown",
  "confidence_score": 0,
  "claim_supported": "exact claim",
  "contradiction_status": "none|possible|confirmed|resolved",
  "business_relevance": "critical|high|medium|low",
  "recommended_action": "imperative next action",
  "approval_required": "none|board|merge|deploy|publish|prod_db|auth|billing|legal|destructive|external_comm"
}
```

## Confidence bands

- 90-100: direct current code/test/log evidence
- 70-89: current internal docs or verified source
- 50-69: partial evidence, needs validation
- 25-49: assumption or weak secondary source
- 0-24: unsupported/rejected

## Minimum evidence rules

- Research task: citations + confidence + missing-evidence note.
- Build task: validation command output + artifact path.
- UI task: screenshot or browser evidence where possible.
- SEO/AEO/GEO task: URL/query/entity evidence.
- Business strategy: source, assumption flags, expected impact.
- Approval request: evidence summary and exact proposed action.

## Storage v0

Append-only JSONL:

`.agentic_nexus/state/evidence.jsonl`

Human-readable artifacts may duplicate evidence summaries, but JSONL is the machine feed.
