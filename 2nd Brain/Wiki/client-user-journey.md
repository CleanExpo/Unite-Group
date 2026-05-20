---
type: wiki
updated: 2026-05-20
---

# Client & User Journey — 2nd Brain + Agentic Layer

**Purpose**: Explicitly design and protect the end-to-end experience of both **external clients** and **internal users / agents** when interacting with the Unite Group system.

This page is now part of the core schema layer. Every major change (new tools, new wrappers, new ingestion) must be evaluated against how it affects the client/user journey.

## Core Journey Principles (Never Break These)

1. **Speed to Insight** — The user should receive relevant, grounded context within seconds, not minutes.
2. **One Entry Point Feel** — Whether the user speaks via Telegram, Plaud, email, meeting notes, or Command Centre, it should feel like one continuous brain.
3. **Evidence & Trust** — Every recommendation or action must surface its sources and similarity scores so the user can trust or challenge it.
4. **Human-in-the-Loop Safety** — Autonomous execution only happens after clear approval gates; the user always remains in control.
5. **Learning Loop** — Every client interaction improves the system for the next interaction.

## High-Level User Journey Map

### External Client Path (CCW, CARSI, DR-NRPG, etc.)

1. **First Contact**
   - Client submits request via website form, email, Telegram bot, or phone
   - Plaud NotePin or Hermes captures the moment

2. **Intake & Clarification (Margot)**
   - Margot receives input and cleans it up
   - Runs `margot_semantic_search` against the 2nd Brain to ground the context immediately
   - Produces clear brief + proposed next actions

3. **Grounding & Research (Semantic Layer)**
   - `semantic_search` is called with the query embedding
   - Top relevant chunks from 951+ vectors are returned with similarity scores
   - avoids outdated file reading; speed and relevance increase dramatically

4. **Command Packet Generation**
   - Research Council or Pi-CEO synthesises the grounded context
   - Produces a structured command packet (plan, media, actions, risks)

5. **Approval Gate**
   - Packet is shown to human (Phill or delegate) for review
   - Only approved packets move to execution

6. **Execution & Delivery**
   - Approved work is executed in sandbox then promoted
   - Client receives the output (report, proposal, content, onboarding, etc.)

7. **Feedback & Learning**
   - Outcome is logged back into the 2nd Brain
   - New evidence updates wiki_pages and gets re-embedded
   - Future queries become more accurate

### Internal Agent Path (Margot, Pi-CEO, Hermes operators)

1. **Input Reception**
   - Telegram / Plaud / meeting notes / board mandate / Linear ticket

2. **Instant Semantic Grounding**
   - Agent **must** call `semantic_search` or `margot_semantic_search` first
   - This replaces slow manual Wiki reads for discovery questions

3. **Synthesis & Recommendation**
   - Agent combines semantic results + file authority (when needed)
   - Produces clear, evidence-backed output

4. **Routing & Escalation**
   - Low-risk actions execute directly
   - High-risk actions go through human approval

5. **Outcome Logging**
   - Results feed back into the semantic layer for continuous improvement

## How the New Semantic Layer Improves the Journey (10x)

- **Before**: Margot had to manually read multiple Wiki pages → slow, incomplete context, risk of missing knowledge
- **After**: `semantic_search` returns the most relevant 8–12 chunks in milliseconds with similarity scores → faster, more accurate, measurable relevance

- **Before**: New meeting notes were siloed in Plaud
- **After**: Plaud ingestion → Wiki → automatic re-embedding → instantly searchable by agents

- **Before**: Agents relied on stale mental models or file-based lookup
- **After**: Every agent treats the Nexus vector layer as the primary brain surface

## Metrics We Care About (Client/User Experience)

- Time from input to first grounded answer (< 30 seconds ideal)
- Relevance score of returned chunks (target average similarity > 0.80)
- Number of human approval loops per client request (target decrease over time)
- Client repeat rate and feedback sentiment

## Proactive Optimisation Loops & Gamified Engagement (New 10x Layer)

To prevent the journey from becoming purely reactive, we introduce **structured proactive cadences** that surface high-leverage work the user may not be thinking about. These are designed to feel like a game rather than chores.

### 1. Weekly Strategic War Room (Gamified)

Every Tuesday morning (or chosen day):

- **Ritual**: 25-minute focused session called “Empire Status”
- **Gamification**: Streak counter (current streak shown in Margot brief)
- **Content generated automatically**:
  - Marketing momentum report (channels, content velocity, conversion events)
  - Fundraising readiness score (deck freshness, ask clarity, investor CRM health)
  - Data health radar (missing embeddings, stale wiki pages, knowledge gaps)
  - Opportunity radar (top 3 under-explored ideas from semantic search)
  - Quick SWOT refresh of the current portfolio

**Reward**: After completing the review, user earns “Strategist Points” visible in the Command Centre.

### 2. Marketing Strategy Optimiser

Monthly deep-dive mode:

- Runs a lightweight semantic search across past campaigns + external research
- Surfaces “untapped angles” (topics, formats, or channels the brand has not seriously used)
- Proposes 3 micro-experiments with expected impact and resource cost
- Presented as a “Mini-Campaign Generator” mini-game

Goal: Keep marketing fresh and prevent stagnation.

### 3. Fundraising Readiness Engine

Quarterly checkpoint:

- Audits the master $2B exit thesis and supporting narratives
- Flags stale sections
- Generates “Investor Question Simulator” (20 likely hard questions based on current data gaps)
- Tracks “Fundraise Health Score” (0–100)

Makes fundraising feel like levelling up a character rather than a last-minute scramble.

### 4. SWOT & Opportunity Sweeps

Automatic monthly SWOT refresh using:

- Current wiki + embedding data
- Competitor movements detected via Synthex
- New client or market signals

Presented as a “Threat & Fortify” challenge where the user can accept micro-missions to strengthen weak areas.

### 5. Data Collection & Knowledge Health

Continuous background agent that:

- Detects pages with low chunk coverage
- Flags missing evidence for key claims
- Prompts the user with simple “Evidence Quests” (“Add 3 sources for this claim to unlock more accurate answers”)

Points and visible progress bars make maintenance feel meaningful.

### 6. Overall Gamification Layer (Unified)

- **Empire Level** — Based on total Strategist Points earned across all loops
- **Streaks & Badges** — Weekly review streak, “No Blind Spots” badge, “Evidence Master” badge
- **Leaderboards** (private, internal only) — Optional friendly competition between portfolio businesses
- **Delight Moments** — Random “serendipity cards” surfaced by semantic search showing unexpected connections in the knowledge base

## Design Rules for Gamification

- Never feels like extra work — always surfaces as useful insight first
- Points and levels are secondary to actual business value
- Keeps the founder in a creative, forward-looking state rather than reactive management
- All gamification elements must support the $2B acquisition target

## Related Pages & Systems

- [[schema-layer]]
- [[hermes-agent-current-state-2026-05-20]]
- [[margot-conversation-os]]
- [[unite-autonomous-command-center-authority-2026-05-19]]
- [[pi-dev-ops]]

**Owner**: KM + PM-Synthex + Margot Core

**Status**: Incorporated as a first-class part of the journey on 2026-05-20

## Related Pages & Systems

- [[schema-layer]]
- [[hermes-agent-current-state-2026-05-20]]
- [[margot-conversation-os]]
- [[unite-autonomous-command-center-authority-2026-05-19]]
- [[pi-dev-ops]]

**Owner**: KM + PM-Synthex + Margot Core

Last major update: 2026-05-20 (included in 2nd Brain 10x Wrapper initiative)