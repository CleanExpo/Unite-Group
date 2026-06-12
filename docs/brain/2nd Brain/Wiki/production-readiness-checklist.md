---
type: wiki
updated: 2026-05-21
---

# Production Readiness Checklist — Nexus Semantic Layer & Gamification

**Purpose**: A mandatory checklist that must be passed before any new feature, wrapper, or automation in the 2nd Brain / Nexus system is considered production-ready.

This checklist prevents the pattern of “build then forget to integrate.”

## Version History
- 2026-05-21: Initial version created as part of future-proofing initiative

## General Rules

1. No task is considered complete until all relevant items below are checked or explicitly marked as N/A with justification.
2. Margot runs this checklist weekly during the Semantic Layer Health Review.
3. Any failing item blocks promotion or broad agent usage.

---

## 1. Documentation & Knowledge

- [ ] All relevant Wiki pages have been created or updated (`schema-layer.md`, `client-user-journey.md`, `proactive-gamification-layer.md`, etc.)
- [ ] The change has been linked in `Wiki/index.md`
- [ ] `CLAUDE.md` or agent operating rules have been updated with new behaviour
- [ ] A permanent reference page (e.g. `hermes-agent-current-state-xxx.md`) exists if the change affects tool surface or models

## 2. Tool & Agent Integration

- [ ] The feature is registered as a callable tool in **Pi-CEO**
- [ ] The feature is registered as a callable tool in **Margot**
- [ ] Tool description and parameters are clear and documented
- [ ] At least one working example or self-test query exists

## 3. Ingestion & Data Flow

- [ ] New data sources (Plaud, meetings, Wiki edits) are connected to the semantic layer
- [ ] Sync process between Obsidian `Wiki/` and Supabase `document_embeddings` / `document_chunks` is defined
- [ ] Chunk coverage for new or updated pages is verified (>80% coverage target)
- [ ] Embedding model and dimensions are consistent

## 4. Production Health & Observability

- [ ] Health check or drift detection script exists
- [ ] Usage logging is enabled so we can see when agents call the feature
- [ ] Error handling and fallback behaviour is defined
- [ ] Performance benchmarks exist (target: <2s for semantic search on typical query)

## 5. Gamification & Proactive Loops (if applicable)

- [ ] The loop produces real business value first (insight before points)
- [ ] Gamification elements do not add cognitive load
- [ ] Points, streaks, badges, or levels are implemented (or explicitly deferred with plan)
- [ ] The loop is connected to the Client Journey principles

## 6. Future-Proofing

- [ ] The change has been added to the **Future-Proofing Mandate** brief (UNI-2046)
- [ ] Agents have been instructed to use the new capability as the default behaviour
- [ ] A review cadence (weekly / monthly) has been assigned

## 7. Sign-Off

- **Prepared by**: ____________________
- **Reviewed by Margot**: ____________________
- **Date**: ____________________
- **Status**: Ready for Production / Requires Work / Blocked

---

**Owner**: Margot (standing)

**Usage**: This checklist must be referenced in every new Nexus or gamification-related project.

_Last updated: 2026-05-21_