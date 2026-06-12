---
type: source
component: nexus-obsidian-operating-brain-v2
status: captured
created: 2026-06-04
source_kind: research-synthesis
confidence: medium-high
links:
  - "[[04-nexus-obsidian-operating-brain-v2]]"
  - "[[03-nexus-autonomous-onboarding-and-growth-os-v1]]"
  - "[[adr-006-retrieval-first-protocol]]"
---

# Obsidian Agentic 2nd Brain Research — 2026-06-04

Purpose: source pack for 10x-ing `/Users/phillmcgurk/2nd-brain` into the Unite-Group Nexus operating brain, using only existing/approved infrastructure unless later approved by Phill.

## 1. Local vault state pulled from disk

Evidence collected at 2026-06-04 15:25 AEST.

- Canonical vault: `/Users/phillmcgurk/2nd-brain/`
- Git status: local `main`; no remote configured in `git remote -v`; therefore no external `git pull` target exists.
- Dirty state before this work: `.nexus-research-ingest-state.json`, `Decisions/continuous-work-queue.jsonl`, and multiple generated `Sources/` + `Outcomes/` files from 2026-06-04 research/shipit/work-discovery loops.
- Current markdown corpus: 551 `.md` files.
- Folder counts:
  - `Sources/`: 258
  - `Sketches/`: 2
  - `Grills/`: 1
  - `Pitches/`: 2
  - `Decisions/`: 3
  - `Personas/`: 1
  - `Outcomes/`: 10 before this note set
- Existing shaped cornerstone: `Pitches/03-nexus-autonomous-onboarding-and-growth-os-v1.md`.
- Existing ratified retrieval rule: `Decisions/adr-006-retrieval-first-protocol.md`.

Interpretation: the 2nd brain already captures a lot, but the compounding loop is thin: many Sources, few Sketches/Grills/Pitches/Decisions, and no strong consolidation/retention layer yet.

## 2. Obsidian capability findings

### Obsidian CLI / headless direction

Research finding: Obsidian is moving toward first-class command-line/headless access patterns:

- Obsidian CLI can create/read/append/move/delete/search notes, operate on daily notes/tasks/properties/bases, and execute plugin commands when installed and supported.
- Obsidian Headless is intended for Sync/Publish automation without needing the full desktop app.
- Implication for Nexus: agents should keep using filesystem-first access for reliability today, but the target architecture should include a thin adapter that can switch between:
  1. filesystem Markdown reads/writes,
  2. Obsidian desktop CLI,
  3. headless sync/publish when available,
  4. Local REST API/MCP when Obsidian is actively running.

### Properties + Bases

Research finding: Obsidian Properties and Bases turn frontmatter into local database views.

Implication for Nexus:

- Every operational note should carry predictable frontmatter fields: `type`, `component`, `status`, `created`, `updated`, `links`, `evidence_paths`, `decision_refs`, `owner`, `cadence`, `next_review`.
- `.base` views should become Phill's operator dashboards:
  - active pitches awaiting grill,
  - decisions due for review,
  - hot outcomes from last 7 days,
  - stale sources with zero links,
  - approved next actions.

### Canvas / JSON Canvas

Research finding: Canvas is an open JSON-backed visual thinking layer.

Implication for Nexus:

- Use Canvas for high-level operating maps only, not as the source of truth.
- Generate `Maps/nexus-operating-brain.canvas` from frontmatter links so the diagram is derived, not hand-maintained.

### Dataview, Tasks, Templater, QuickAdd, Omnisearch

Research finding: community plugins can provide dynamic dashboards, task queries, templates, capture macros, and BM25-like search.

Implication for Nexus:

- Use plugins as optional operator UI accelerators, not as required agent dependencies.
- Agents should keep Markdown/frontmatter as canonical; plugin outputs are views.
- Templater/QuickAdd can create human capture shortcuts, while Hermes/Pi-CEO agents write the same schema directly.

### Local REST API / MCP

Research finding: Obsidian Local REST API and MCP can expose vault operations to agent tools.

Implication for Nexus:

- This is useful only if already installed/approved. Do not introduce it as a mandatory new vendor/service.
- If enabled, restrict scope to the 2nd-brain vault and prefer read/search/append/patch over broad arbitrary command execution.
- Current safe default remains file tools + git diff.

## 3. PKM operating-model findings

Execution-first second brains share one pattern: forced transformation.

Pipeline:

Capture → Triage/Decide → Distill/Connect → Express/Ship

Source models mapped:

- PARA: organize by actionability, not topic.
- CODE: capture only what resonates; express output is the point.
- GTD: inbox to zero; every item is clarified into do/defer/delegate/reference/delete.
- Zettelkasten: if a note is not linked, it does not exist operationally.
- Evergreen notes: notes should mature into reusable thinking assets, not frozen clippings.
- Progressive summarization: summarize on re-encounter, not in bulk.
- Shape Up: shape before building; pitches must be rough, solved, bounded, appetite-based.
- ADRs: decisions preserve context, alternatives, rationale, and consequences.

Implication for Nexus: the vault should not optimize for capture volume. It should optimize for promotion rate from Sources/Outcomes into Sketches, Grills, Pitches, Decisions, and shipped work.

## 4. Agentic knowledge-base architecture findings

Existing infrastructure already covers most required layers:

- Ingest: Pi-CEO Nexus event adapters + research ingest.
- Store: Supabase outcomes/audit + Markdown vault.
- Retrieval: file search, Obsidian keyword search patterns, structured outcome queries.
- Analysis: BRA generator validates `evidence_ids` after LLM output.
- Approval: approval state machine + gate matrix.
- Audit: HMAC IDs and redaction patterns in Nexus audit.

Gaps:

1. Explicit link graph is partial.
2. Outcomes lack a uniform machine-readable frontmatter schema.
3. Consolidation is daily/lightweight, not weekly/deep.
4. No retention tiers: hot/warm/cold.
5. No dead-letter buffer for failed outcome writes.
6. No cross-ID resolver across Obsidian paths, Supabase IDs, Linear issue IDs, PR URLs, Telegram messages.
7. Vector/RAG is not needed yet and may reduce traceability before corpus scale justifies it.

## 5. 10x thesis

The 10x move is not "more notes". It is a governed promotion machine:

- Raw capture stays cheap and abundant.
- Every source/outcome gets routed within 24h.
- Repeated patterns get consolidated weekly.
- Consolidated insights become sketches.
- Sketches are grilled with Phill.
- Resolved grills become shaped pitches.
- Shipped work creates outcomes.
- Outcomes feed back into the next daily brief and next founder conversation.

This closes the loop from knowledge to execution and back into knowledge.

## 6. Suggested source URLs for follow-up verification

- Obsidian Help: https://help.obsidian.md/
- Obsidian Bases docs: https://help.obsidian.md/bases
- Obsidian Properties docs: https://help.obsidian.md/properties
- Obsidian Canvas docs: https://help.obsidian.md/canvas
- JSON Canvas spec: https://jsoncanvas.org/
- Dataview plugin: https://github.com/blacksmithgu/obsidian-dataview
- Tasks plugin: https://github.com/obsidian-tasks-group/obsidian-tasks
- Templater plugin: https://github.com/SilentVoid13/Templater
- QuickAdd plugin: https://github.com/chhoumann/quickadd
- Omnisearch plugin: https://github.com/scambier/obsidian-omnisearch
- Obsidian Local REST API: https://github.com/coddingtonbear/obsidian-local-rest-api
- Shape Up: https://basecamp.com/shapeup
- PARA: https://fortelabs.com/blog/para/
- Progressive Summarization: https://fortelabs.com/blog/progressive-summarization-a-practical-technique-for-designing-discoverable-notes/
- Evergreen notes: https://notes.andymatuschak.org/Evergreen_notes
- Zettelkasten intro: https://zettelkasten.de/introduction/
- ADRs: https://adr.github.io/
