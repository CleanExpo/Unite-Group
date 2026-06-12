# Omni Governed Analytics Model - 2026-05-21

## Purpose

Capture the useful parts of the Omni and Google model research packet for Unite-Group Nexus, Synthex, and future portfolio intelligence work.

This is not a decision to buy or migrate to Omni, AlloyDB Omni, Gemini Omni, or any new Google product. It is an architecture reference: use governed semantic models, permission-aware AI, traceable analysis, and model-backed creative generation instead of loose dashboard prompts over raw tables.

## Source Inputs

- `Sources/AI in Omni.md` - Omni AI grounded in a governed semantic model.
- `Sources/Welcome to the Omni docs!.md` - Omni as BI platform with shared model plus SQL flexibility.
- `Sources/From workbook to modeling Setting up Omni.md` - model developer onboarding and `llms.txt` docs index.
- `Sources/Using Excel-style functions to create table calculations.md` - spreadsheet-style calculations, quick calculations, AI-generated formulas, and promotion from workbook to shared model.
- `Sources/AlloyDB Omni documentation.md` - portable PostgreSQL-compatible database substrate with vector/embedding labs.
- `Sources/Gemini Omni.md` - multimodal video generation/editing reference with safety, SynthID, and C2PA signals.
- `Sources/Models.md`, `Sources/Research.md`, `Sources/Science.md` - Google DeepMind model and research direction notes.
- `Sources/Omni 2    Gemini API Developer Competition.md` - education/RAG example using Gemini, Flutter, Firebase, document upload, progress reports, gap detection, and targeted interventions.

## Architecture Lesson

Omni's strongest transferable pattern is not a UI feature. It is the contract that AI analysis must be grounded in a semantic model that defines metrics, relationships, permissions, synonyms, and business logic before the agent is allowed to answer.

For Unite-Group Nexus this maps directly to the Palantir-style ontology mandate:

- Raw inputs become typed objects: business, client, source, campaign, asset, channel, contractor, evidence item, risk, approval, outcome.
- Metrics are named once and reused across dashboards, agents, briefs, and board reports.
- AI tools operate through governed adapters, not direct free-form database access.
- Every answer should carry source links, confidence, permission context, and next-action state.
- Repeated ad hoc calculations that prove useful should be promoted into shared model/service logic.

## Synthex Application Implications

Synthex should continue to keep domain policy in service modules and routes thin. The Omni packet reinforces the need for:

- A shared campaign ontology before advanced dashboard AI.
- Saved metric definitions for leads, approvals, spend readiness, content throughput, asset licensing, and outcome learning.
- AI-assisted analysis that can explain which source objects and definitions were used.
- Query and report generation that respects organization, client, and user permissions.
- Draft-mode fallbacks whenever provider credentials, consent, or evidence gates are incomplete.

## Unite-Group Command Center Implications

The command center should behave more like an intelligence workspace than a pile of pages:

- Board members and operators ask questions in plain language.
- The system answers against governed objects, not scattered notes.
- Useful workbook-style explorations can become reusable dashboards or service checks.
- Source packets from Obsidian, Plaud, Linear, GitHub, Supabase, and Synthex should reconcile into one evidence graph.
- Health Loop and Close the Loop outputs should be visible as current state, blockers, confidence, owner, and next action.

## Creative / Gen Media Lesson

Gemini Omni is useful as a reference for what high-end multimodal generation is moving toward:

- Multi-turn video editing with consistent scene state.
- Reference-image and reference-video control.
- Natural language object, action, style, and camera changes.
- Text and on-screen action staying synchronized.
- Safety review, watermarking, and content credentials as first-class release signals.

For Synthex, this strengthens the Gen Media direction already captured in [[synthex-command-center-gen-media-build-2026-05-19]]: build an approval-gated campaign studio that can move from voice idea to storyboard, assets, captions, overlays, audio, and publishing package, without treating generation as a one-shot prompt.

## Vertical App Lesson

The Omni 2 competition example is useful because it shows a narrow Gemini-powered vertical app, not a generic chatbot. The transferable structure is: collect domain documents, retrieve the right evidence, generate a personalized report, detect gaps, recommend interventions, and keep the output usable for non-technical operators.

For Unite-Group businesses, this pattern should be reused for client onboarding, contractor onboarding, campaign diagnosis, restoration claim support, and board reporting. Each product should have its own domain objects and evidence model; Synthex can then provide the automation layer across them.

## Data Substrate Note

AlloyDB Omni is a portable PostgreSQL-compatible reference point. It may matter later if Unite-Group needs a local or edge analytics substrate with Postgres compatibility and vector search. It is not a near-term migration target while Synthex is already on Supabase/Postgres.

Near-term rule: improve the existing Supabase/Postgres ontology and service layer first. Consider AlloyDB Omni only if there is a documented requirement for portable self-hosted database performance, local edge execution, or Google Cloud-specific analytics.

## Operating Rules

- Do not let AI query raw tables directly for production decisions.
- Do not let a dashboard metric exist without a named definition and source.
- Do not promote a source clipping into production logic until it has evidence, owner, permission, risk, and verification state.
- Treat workbook-style experiments as draft intelligence until promoted.
- Keep creative AI outputs in review until licensing, consent, brand, factual, and platform gates pass.

## Linked Pages

- [[agentic-engineering-harness-2026-05-21]]
- [[gemini-api-platform-notes-2026-05-21]]
- [[synthex-command-center-gen-media-build-2026-05-19]]
- [[mandatory-close-the-loop-protocol]]
- [[production-readiness-checklist]]
- [[unite-group-portfolio-ops-board-v1]]
