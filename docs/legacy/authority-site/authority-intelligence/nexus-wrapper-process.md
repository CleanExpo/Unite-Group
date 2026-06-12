# Nexus Authority Intelligence Wrapper — Process and Mandate Pathway

**Status:** active implementation scaffold  
**Owner:** Margot / Senior PM / Senior Researchers  
**Applies to:** Nexus Command Center, board mandates, Synthex, Unite-Hub, Daily Opportunity Radar, sector-expansion research, authority content, community growth.

## Rule

Any mandate or task that touches research, sources, citations, content, social/community interaction, recommendations, industry authority, sector replication, or knowledge-base enhancement must carry the Authority Intelligence wrapper.

This is the process gate that keeps Nexus from becoming a loose collection of content tools. It makes every output behave like a professional industry association: evidence first, audience usefulness second, brand structure third, approval before public action.

## Board mandate annotation

When creating or updating `board_mandates`, use the existing `authority` column to mark whether the wrapper is required.

Recommended values:

```text
authority_required
source_intelligence_required
content_factory_required
learning_loop_required
community_approval_required
human_approval_required
not_applicable
```

If more than one applies, store a comma-separated value until the structured Authority Intelligence tables are live.

## Mandate intake checklist

Before a Senior PM dispatches work:

1. Read `exit-thesis` and `operational-priorities-q2-2026`.
2. Read the relevant business/system wiki page.
3. Classify the mandate:
   - source intelligence;
   - content factory;
   - learning loop;
   - community growth;
   - recommendation engine;
   - sector replication.
4. Attach the relevant specialist skill:
   - `nexus-authority-intelligence-wrapper` always;
   - `nexus-source-intelligence` for sources/evidence;
   - `nexus-authority-content-factory` for white papers, blogs, social, Reddit/community drafts, reports and Synthex packs;
   - `nexus-learning-skill-loop` for teach-skill/internal learning/template work.
5. Set approval gates before execution.
6. Persist evidence and outputs to the 2nd Brain and, once available, structured Authority Intelligence tables.

## Standard mandate block

Copy this into board memo / scope when the wrapper is required:

```yaml
authority_intelligence:
  wrapper_required: true
  task_class: source-intelligence | content-factory | learning-loop | community-growth | recommendation-engine | sector-replication
  exit_leverage: low | medium | high
  audience: string
  required_skills:
    - nexus-authority-intelligence-wrapper
  evidence_gate:
    facts_required: true
    assumptions_separated: true
    citations_required_for_public_claims: true
  approval_gate:
    public_publishing: human_approval_required
    community_replies: human_approval_required
    client_contact: human_approval_required
    spend: human_approval_required
    production_or_merge: human_approval_required
    legal_compliance_financial_claims: human_approval_required
  persistence:
    brain_page: Wiki/authority-intelligence/...
    structured_records: authority_signals | authority_sources | authority_assets | authority_learning_records
```

## Command Center surface

The Nexus Command Center now has an Authority Intelligence panel that reads `wiki_pages` and shows:

- wrapper status;
- material signals;
- assets awaiting review;
- source errors;
- active approval gates;
- latest Authority Intelligence knowledge objects.

This makes the wrapper visible in the operating cockpit rather than buried in notes.

## Safety gates

The wrapper may prepare drafts and recommendations, but must not directly perform:

- public publishing;
- Reddit/community replies;
- client contact;
- spend;
- legal/compliance/financial advice;
- production deployment;
- PR merges;
- CRM overwrite;
- acquisition-sensitive statements.

## Implementation progression

1. Use `board_mandates.authority` as the immediate wrapper flag.
2. Use the 2nd Brain wiki as the source of truth for source registries, evidence, assets and learning records.
3. Add structured `authority_*` tables through sandbox-first migration.
4. Update the Command Center reader to prefer structured records once tables are live, with wiki fallback.

## Done means

- The Senior PM cannot miss the wrapper on relevant work.
- Senior Researchers have source/evidence quality rules before content is drafted.
- Synthex receives governed assets rather than generic AI content.
- Human approval gates are clear before any external action.
- The 2nd Brain and Nexus remain aligned.
