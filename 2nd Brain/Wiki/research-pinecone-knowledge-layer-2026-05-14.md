---
type: wiki
updated: 2026-05-14
researcher: Knowledge Layer
source: "Sources/Pinecone Just Demoted Vector Search. Here's the Knowledge Layer..md"
---

# Pinecone Demotes Vector Search — Knowledge Layer Lessons for Phill's Stack

## What's actually being said

**Pinecone-the-company** shipped Nexus + a query language called NoQL: agent retrieval should carry *intent, filters, access policy, provenance, response shape, confidence, budget* — not just similarity. They are quietly admitting vector search alone isn't enough.

**The industry shift** (Pinecone Nexus, PageIndex, SAP Dremio+Prior Labs, Microsoft GraphRAG, Cloudflare memory): chatbot-era RAG was built for "find 3 similar paragraphs". Agents need **bundles** — pre-assembled, governed, shape-appropriate context. Four shapes are emerging: prose chunks (vector), structured docs (trees/sections), tabular business data (semantic layer over warehouse), relationships (graph). Pick primitives that match the *work*, not the vendor.

The deepest line: **"rediscovery" can eat up to 85% of agent compute** — agents re-fetch, re-summarise, re-ask things the system already knew last run.

## Scored against Phill's stack

### Green — apply now

- **Phill's preamble files ARE the bundle pattern.** `swarm/inbox/preamble_trainer.py` already does exactly what the industry is converging on: pre-compile *operating context* per entity (context_id) so downstream agents don't rediscover it every run. The architecture is correct; the *shape* needs upgrading.
- **The preamble should emit STRUCTURED ENTITIES, not just narrative Markdown.** Today it produces five Markdown sections (Vocabulary / Recurring topics / Style / Active commitments / Red flags). Agents reading this still have to parse prose. Augment with a sibling `preamble.json` containing typed entities: `people[]`, `decisions[]`, `deadlines[]`, `blockers[]`, `commitments[]`, each with `{id, text, source_message_id, confirmed: bool, freshness_date}`. Narrative stays for humans; JSON feeds agents.
- **Distinguish CONFIRMED from INFERRED in the preamble.** Nate's failure mode: "the agent stores its own inference as a confirmed fact, then future runs get quietly worse." Tag every entity with `source: "user_confirmed" | "agent_inferred"`. Margot must respect the boundary.
- **Provenance on every wiki claim.** Brain-1 wiki pages already cite dates and source files inconsistently. Bake into the INGEST step: every fact carries `source: Sources/<file>` or `source: <linear-ticket>`. Already half-done in `pi-ceo-architecture.md`; make it mandatory.
- **Track rediscovery as a KPI.** Add a "preamble hit rate" metric: how often did an agent's first turn need to ask for info the preamble already had? If high, the preamble is wrong-shaped.

### Yellow — watch

- **Tabular reasoning over Supabase.** Pi-CEO has real business data in Postgres (`ccw_support_tickets`, `developer_profile`, etc). Margot today reads digests via Python scripts (correct pattern). Worth watching if Anthropic/Gemini ship table-native reasoning that beats prose digests.
- **Document trees for the wiki.** Brain-1 has ~80 Markdown pages. They are already hierarchical via `[[wiki-links]]`. A PageIndex-style hierarchical retriever could outperform "load 5 pages" if the wiki grows past ~300 pages. Not yet.
- **GraphRAG for cross-business relationships.** "Which Linear tickets reference Toby?" "Which decisions cite the $2B thesis?" Eventually relational. Today, grep + Linear search is good enough.

### Red — ignore

- **Adding Pinecone / a vector DB.** Phill has zero vector DB in production and zero retrieval problems that vector search solves better than the wiki + Linear + Supabase he already has. Do not add.
- **Switching off Markdown.** The wiki being human-readable Markdown is a *feature* — Phill reads it, edits it, ingests into it. Replacing with embeddings would lose that.
- **NoQL / vendor-specific query languages.** Premature; the contract matters, the syntax doesn't.

## Wiki + code proposals

- **`pi-ceo-architecture.md`** — add a new section `## Knowledge Layer (Bundles, not chunks)` describing the four-substrate map: Brain-1 wiki (prose), Supabase tables (tabular), preambles (per-context bundles), Linear (workflow state). Cross-ref this research page.
- **`agent-memory-patterns.md`** — append "Rediscovery audit" paragraph: bullet checklist of failure modes to scan for in Margot/Board logs (re-fetch, re-summarise, re-ask, stale-as-fresh).
- **`preamble_trainer.py` extension (one-week scope)** — extend `build_prompt` to also emit a JSON block (Gemini supports JSON output mode) with typed entities. Write `preamble.json` alongside `preamble.md`. ~40 lines, no new dependency.
- **New `swarm/knowledge/bundle_loader.py`** — helper that any agent imports to load `{preamble.md, preamble.json, last 10 Linear comments, last 5 wiki page reads}` as one structured bundle. Replaces ad-hoc per-agent context assembly.

## Single highest-leverage shift this week

**Make `preamble_trainer.py` emit `preamble.json` (typed entities, with confirmed/inferred + source provenance) alongside the existing Markdown.**

Why: it's a 40-line change, zero new dependencies, hits the exact rediscovery pain Nate describes, and turns Phill's already-correct architecture into the production-agent shape the industry is converging on. Every downstream Margot/Board/PM-Core call gets cheaper *and* more accurate.

Researcher: Knowledge Layer

Cross-ref: [[pi-ceo-architecture]] · [[agent-memory-patterns]] · [[project_contextbot_platform]] (if exists)
