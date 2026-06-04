---
type: outcome
component: nexus-knowledge-base-architecture-research
status: complete
created: 2026-06-04
scope: research-only
---

# Agentic Knowledge-Base Architecture — Operating Brain Research

## Executive Summary

Your infrastructure already implements most canonical patterns for an Obsidian-backed
agentic knowledge base. What exists is a three-tier architecture:

1. **2nd-brain vault** — human+agent-readable markdown, git-versioned, shape-up
   workflow (Sketch → Grill → Pitch → Decision → Outcome)
2. **Pi-CEO Nexus (Python)** — event-driven outcomes ledger, BRA generator,
   approval state machine, discovery loops, audit trail
3. **Synthex Obsidian API** — runtime context assembly from vault notes via
   Obsidian Local REST API (port 27124)

The gaps are: knowledge graph linking, vector/RAG layer, memory consolidation,
and retrieval-first automation beyond the current pre-flight pattern.

---

## 1. RETRIEVAL-FIRST AGENT WORKFLOWS

### Pattern: Read-then-Act (canonical)

The retrieval-first protocol mandates agents read context before acting.
Standard implementations (LangChain, CrewAI, AutoGen) use a "retrieve →
synthesize → act" chain where every action must cite retrieved evidence.

### Your Current Implementation

**ADR-006** (2nd-brain/Decisions/adr-006-retrieval-first-protocol.md)
is already ratified. Five-step enforcement:

STEP 1: Load 2nd-brain persona (Personas/product.md)
STEP 2: Load relevant skills (skills_list + skill_view)
STEP 3: Search prior outcomes (2nd-brain/Outcomes/)
STEP 4: Run pre-flight gate (.bin/product-pre-flight)
STEP 5: Only then proceed with work

**BRA Generator** (swarm/nexus/bra.py) implements retrieval-first for
analytics: pulls outcomes → asks LLM → **validates evidence_ids anchor to
real data** → drops "unanchored" cards. This is the anti-hallucination
gate pattern — every recommendation must cite real outcome IDs.

**Per-client Knowledge Base Builder** (Synthex/lib/obsidian/
client-knowledge-base.ts) does retrieval-first for content generation:
reads context.md + business-dna.md + last 7 days research → trims to
2000 chars → injects into AI prompt.

### Source-Backed Improvements

1. **Semantic retrieval fallback**: The current protocol uses file path +
   keyword search. Add Obsidian's native search (already wired via
   searchNotes() in client.ts) as a pre-flight step for fuzzy matches
   across the entire vault before resorting to directory enumeration.

2. **Evidence citation in output**: The BRA pattern (every card cites
   evidence_ids) should extend to daily briefs and work-discovery runs.
   Currently the continuous-work-queue.jsonl items have evidence_paths
   but no cross-reference between Outcomes and the items that read them.

3. **Stale context guard**: Add mtime checks — if the persona or decision
   file is older than N days and the related loop cadence has run, flag
   staleness before retrieval.

### Risks

- **Context window overflow**: With 7 Obsidian folders × unbounded files,
  retrieval-first can exceed context limits. Your 2000-char trim in
  buildContextForGeneration is the right defense; apply same budget
  to agent session context loading (e.g., max 4000 chars per folder).
- **Retrieval-first without consolidation = retrieval-bloat**: If sources
  accumulate faster than consolidation (see §7), retrieval degrades to noise.

---

## 2. KNOWLEDGE GRAPHS

### Pattern: Linked Knowledge vs. Flat Files

Knowledge graph architectures for agent systems represent three approaches:
- **Entity extraction**: Auto-extract entities from documents, build edges
- **Frontmatter linking**: Manual/semi-manual links via YAML references
- **Obsidian backlinks**: Implicit graph via wiki-links

### Your Current Implementation

**Frontmatter graph (already in place)**:
- Pitch YAML references: list points to Decisions, Personas, Sources
- Outcomes carry persona_attribution, project_id, workspace_id
- Daily briefs reference repo paths and PR numbers
- Continuous work queue carries evidence_paths array

**Nexus type system** (swarm/nexus/types.py) defines the entity graph:
Client → Workspace → Channels, Projects, Loops, Approvals
         Workspace → Outcomes (via workspace_id + workspace_slug)
         Outcomes  → source, metric, persona_attribution, project_id
         Approvals → actor, action, reversibility, sla_expires_at
         Audit     → actor, action, workspace, client, approval_id, outcome_link

### Source-Backed Improvements

1. **Explicit graph edges via frontmatter**: Add a links: array to
   frontmatter that uses Obsidian-compatible wiki-links. This enables
   graph view, Dataview queries, and agent edge-following.

2. **Auto-entity extraction pass**: After each daily brief generation,
   a cheap-tier LLM pass (WORKING tier) could extract and backfill
   links: fields.

3. **Temporal edges**: Add preceded_by: refs to outcome frontmatter.
   Creates time-travel graph — "what led to this decision."

### Risks

- **Graph fragmentation across tools**: Supabase nexus_audit has IDs;
  Outcomes folder has files; continuous-work-queue.jsonl has IDs; Linear
  has issue numbers. None are cross-linked. A graph layer needs
  a resolver for each ID space.
- **Graph maintenance burden**: Auto-generated graphs need periodic
  pruning. Risk R-008 (low-signal noise) applies equally to graph edges.

---

## 3. MARKDOWN + FRONTMATTER

### Pattern: Structured Markdown as Agent Protocol

This is your strongest existing pattern. The 2nd-brain vault CLAUDE.md
establishes:
- Type taxonomy: sketch | grill | pitch | decision | persona | source | outcome
- Status lifecycle: draft → shaped → ratified → shipped → retired
- Appetite budgeting: 1d | 3d | 1w | 2w | 6w
- Mandatory fields: rabbit_holes, no_gos per pitch

### Your Current Implementation

Three frontmatter schemas coexist:
1. CLAUDE.md vault (type, component, status, appetite, rabbit_holes, no_gos)
2. Live-Nexus (type: live-meeting, meeting_id, timestamps, source, brand)
3. Research ingest JSONL (id, lane, status, trust_level, product_tags)

### Source-Backed Improvements

1. **Unified frontmatter schema**: Unify under a nexus_type discriminator.
   Stripe object-discriminator pattern.
2. **Frontmatter as retrieval metadata**: Obsidian Dataview queries can
   filter by status+type+component without vector search.
3. **Version tracking in frontmatter**: Add revision: N and superseded_by
   for decisions that evolve.
4. **Machine-readable outcome sections**: YAML/JSON code-fenced block
   inside markdown for programmatic parsing.

### Risks

- **Frontmatter drift**: Different field names across agents break queries.
  Extend CLAUDE.md rigor to Outcomes folder.
- **Obsidian vs agent YAML parsing**: Pin to one YAML library across
  all agents (PyYAML in Python, js-yaml in TS).

---

## 4. EVENT LOGS

### Pattern: Append-Only Structured Event Ledger

Canonical: event sourcing where every state change produces an immutable record.
Enables: audit/trail, replay, aggregation (BRA generation), attribution.

### Your Current Implementation

**Nexus Audit Ledger** (nexus/audit.py):
- HMAC-prefixed IDs (anti-tamper)
- Dual timestamps (wall-clock + monotonic for drift detection)
- Secret redaction via tmux_validator
- Policy level: auto | approval | escalation
- Cross-correlation keys: workspace_id, client_id, approval_id, outcomes_link

**Outcomes Store** (nexus/outcomes.py):
- Fire-and-forget writes (never blocks caller)
- Supabase REST with service-role key
- InMemory fallback for tests
- Idempotent via deterministic out-provider-hash IDs

**Ingest Adapters** (nexus/ingest/*.py):
One per provider (Stripe, Vercel, PostHog, Sentry, Linear).
Pure-logic: JSON body in → ParseResult out.

### Source-Backed Improvements

1. **Event replay**: Replay endpoint to reconstruct state at any point.
2. **Event correlation IDs**: Embed audit_id in outcome raw_payload for
   bidirectional linking.
3. **Event compaction**: Periodic snapshot materialization as workspace-snapshot notes.
4. **Dead-letter buffer**: Write failed outcomes to app/logs/outcomes-dead-letter.jsonl.

### Risks

- **Append-only growth**: No retention/archival policy. Add TTL-based
  archival (90d+ → cold storage).
- **Cross-platform event correlation**: 5 providers, each with own format.
- **Fire-and-forget failures**: Supabase downtime = permanent outcome loss.
  No retry queue.

---

## 5. VECTOR / RAG TRADEOFFS

### Pattern: When to Use Vector Search vs. Structured Retrieval

| Approach              | Best For                              | Worst For                              |
|-----------------------|---------------------------------------|----------------------------------------|
| Metadata/frontmatter  | Known schema, small corpus (<1000)    | Fuzzy similarity, cross-doc reasoning  |
| Keyword/fuzzy search  | Known terms, PR numbers               | Semantic meaning, paraphrased queries  |
| Vector embeddings     | Large corpus (>1000), semantic search | Fresh content, structured data         |
| Hybrid (kw + vector)  | Production recall + precision         | Simple lookups where cost unjustified  |

### Your Current Implementation

- Obsidian REST /search/simple/ (keyword-based)
- Discovery loop: structured query → format → LLM (no vector store)
- BRA generator: outcome objects → text format → LLM → evidence validation

### Source-Backed Improvements

1. **Metadata-first, vector-second**: Corpus is ~250 sources + ~30 decisions.
   Frontmatter queries + Obsidian Search beats vector on every axis.
   Only add vectors when corpus > 500 files or semantic search needed.

2. **If adding vectors, use Obsidian-native plugins**: Copilot, Smart
   Connections, or Text Generator + Ollama for local embeddings.

3. **Embedding-as-outcome**: Store embedding hashes in outcomes table as
   freshness indicators.

4. **RAG for daily brief already works**: Your current architecture IS RAG
   using structured retrieval. Every claim is traceable. Vector RAG would
   lose this traceability.

### Risks

- **Vector search destroys traceability**: BRA evidence_id validation
  works because retrieval is structured. Vector search breaks citation chains.
- **Embedding freshness**: Batch embedding job = staleness window. Only
  acceptable for historical queries.
- **Cost at current scale is unjustified**: Keyword search at $0 vs embedding
  at non-zero for a corpus where keyword search works.

---

## 6. HUMAN APPROVAL GATES

### Pattern: Bounded Autonomy with Escalation

Three-tier: Auto (reversible) | Approval (irreversible/impactful) | Escalation (critical).

### Your Current Implementation (THE MOST MATURE PATTERN)

**Approval State Machine** (nexus/approvals.py):
pending → approved/denied/auto-denied (72h SLA)

**18-Row Approval Gate Matrix**:
- Auto: client:create, workspace:create, loop:enable
- Approval: billing, contracts, refunds, first client message, legal content
- Conditional: subsequent messages (BRA ≥ 0.7), auto-merge (tests + BRA + paths)

**AGENTS.md Three-Tier Boundary Matrix**:
✅ free | ⚠️ score ≥ 8 | 🚫 human only

**ADR-006 Mechanical Enforcement**:
Shell-script pre-flight gates returning exit code 1.

### Source-Backed Improvements

1. **Approval batching**: Group similar pending approvals into single review.
2. **Confidence-based auto-approval**: After N successful approvals of same
   type, auto-approve next with audit flag.
3. **Precedence learning**: Record approved actions as precedent; future
   similar requests auto-approve with reference.
4. **Business-hours SLA**: SLA only counts during operator's working hours.

### Risks

- **Approval fatigue** (R-007): Mitigate with digest batching.
- **No-go circumvention**: Agents outside Nexus layer could bypass gates.
- **SLA gaming**: Weekend submissions guaranteeing auto-denial.

---

## 7. MEMORY CONSOLIDATION

### Pattern: From Raw Events to Distilled Knowledge

Acquisition → Encoding → Consolidation → Pruning

### Your Current Implementation

Acquisition: ✅ (5 webhook adapters + research ingest + meeting transcripts)
Encoding:    ✅ (Supabase outcomes + daily briefs + JSONL research + audit)
Consolidation: ⚠️ (Daily Hermes digest; weekly board; no deep consolidation)
Pruning:     ❌ (No retention policy, no retirement process)

### Source-Backed Improvements

1. **Periodic consolidation pass**: Weekly cheap-tier LLM pass over 7d
   outcomes → consolidation note with evidence citations.

2. **Source retirement**: Monthly pass flagging sources >60d with zero
   cross-references for operator review.

3. **Memory hierarchy (hot/warm/cold)**:
   - Hot: Today's outcomes + current decisions (retrieved first)
   - Warm: Last 30d outcomes + active pitches (on demand)
   - Cold: Historical sources + retired decisions (search only)

4. **Consolidation → Decision promotion**: Auto-generate Pitch drafts
   from recurring consolidation patterns.

### Risks

- **Consolidation hallucination**: Must cite source outcomes (BRA pattern).
- **Memory leak**: 52 consolidation notes/year × N workspaces without pruning.
- **Consolidation timing**: Race conditions at window boundaries.

---

## ARCHITECTURE GAP MATRIX

Layer                    | Exists | Where                           | Gap
-------------------------|--------|---------------------------------|---------------------------
Ingest (events)          | YES    | nexus/ingest/*.py              | None
Store (structured)       | YES    | Supabase outcomes/audit/loops  | Dead-letter queue
Store (vault)            | YES    | 2nd-brain/ (git + Obsidian)    | None
Schema (frontmatter)     | YES    | CLAUDE.md + live-nexus         | Unified discriminator
Retrieval (keyword)      | YES    | Obsidian REST search           | None
Retrieval (structured)   | YES    | Outcomes list by workspace     | None
Retrieval (vector)       | NO     | —                              | Not needed at current scale
Context assembly         | YES    | client-knowledge-base.ts       | Per-agent budget caps
Analysis (BRA)           | YES    | nexus/bra.py                   | None
Analysis (discovery)     | YES    | nexus/discovery_loop.py        | None
Approval gates           | YES    | nexus/approvals.py + matrix    | Batch approval, precedents
Enforcement              | YES    | ADR-006 pre-flight gates       | CI-level gate
Audit                    | YES    | nexus/audit.py + HMAC IDs      | Outcome correlation backfill
Knowledge graph          | PARTIAL| Implicit via frontmatter refs  | Explicit edges, cross-ID resolver
Memory consolidation     | PARTIAL| Daily digest (Hermes ingest)   | Periodic deep consolidation
Pruning/retention        | NO     | —                              | Retention policy per tier
Voice rendering          | YES    | nexus/six_pager_bra.py         | None
Cross-vault linking      | NO     | —                              | ID resolver across 5 systems

---

## RECOMMENDED NEXT ACTIONS (priority order)

1. **Add consolidation cadence** to objectives.yaml (weekly, ~1d Rana time)
2. **Add explicit frontmatter links** to CLAUDE.md convention (zero code)
3. **Add outcomes dead-letter buffer** (~30 lines in outcomes.py)
4. **Add retention policy** (hot/warm/cold tiers, automated movement)
5. **Add approval batch mode** (batch_decide() function)
6. **Skip vector/RAG** until corpus > 500 files or semantic need arises

---

## SOURCES

- Pi-CEO: swarm/nexus/ (bra.py, approvals.py, discovery_loop.py, loop_runner.py,
  outcomes.py, scheduler_daemon.py, store_factory.py, six_pager_bra.py, types.py,
  ingest/*.py, onboarding.py)
- Pi-CEO AGENTS.md boundary matrix
- Synthex: lib/obsidian/ (client.ts, client-knowledge-base.ts, business-dna-vault.ts)
- Synthex: lib/unite-hub-connector.ts
- live-nexus: lib/markdown-composer.ts
- 2nd-brain: CLAUDE.md, Decisions/adr-006, objectives.yaml, risk_register.md,
  continuous-work-queue.jsonl, Pitches/03-nexus-*.md, Outcomes/2026-06-04 brief
- pi-ceo-operator-mcp: SPEC.md
