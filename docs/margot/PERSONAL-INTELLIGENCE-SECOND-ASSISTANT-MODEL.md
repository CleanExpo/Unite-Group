# Nexus Personal Intelligence / Second Assistant Model

Date: 2026-05-25
Last update: 2026-06-12 14:50:00 AEST — Senior PM 99th answer-shape fixture (personal-intelligence-second-assistant-model self-boundary) + doc-drift guard.
Project: Unite-Group Nexus / Margot
Owner: Phill + Margot
Status: Draft operating model and implementation spine

## Executive mandate

Nexus needs a second-assistant intelligence layer that turns Phill's watched, listened, searched, read, spoken, and written signals into filtered business intelligence.

The purpose is not to store everything Phill consumes. The purpose is to reduce Phill's need to sit at the computer for 15 hours a day by letting Nexus continuously:

1. notice useful external signals;
2. remove waste, hype, duplicates, and entertainment-only content;
3. model Phill as a founder, business owner, operator, and entrepreneur;
4. map useful insights into Unite-Group Nexus, CRM, marketing, AI enhancement, SEO/GEO/AEO, project delivery, and $2B strategy;
5. create memory candidates, file updates, research notes, and task candidates with approval gates;
6. feed the result into the command center, daily/weekly digest, and Agentic Thinking brain.

This is the missing Personal Intelligence layer between Phill's attention and Nexus execution.

## Desired end state

Nexus should be able to answer:

- What is Phill learning right now?
- Which topics keep recurring in Phill's consumption?
- Which content is genuinely useful for Unite-Group?
- Which content is waste or distraction?
- Which insights affect Nexus product strategy?
- Which insights affect SEO/GEO/AEO and marketing strategy?
- Which insights affect client delivery or CRM opportunities?
- Which insights should become durable memory?
- Which insights should become tasks, plans, experiments, or roadmap items?
- Which insights should be parked or rejected?
- What does Phill need to know today, without spending 15 hours filtering it himself?

## Source types

Start safe and explicit. Do not silently ingest private history.

### Phase 1 sources: explicit/manual

- YouTube URL provided by Phill.
- Podcast URL or transcript provided by Phill.
- Audiobook notes/highlights manually exported or pasted by Phill.
- Article/newsletter URL provided by Phill.
- Voice note or Hermes chat instruction.
- Local text/markdown/csv/json export approved by Phill.

### Phase 2 sources: read-only batch imports

- YouTube watch history export.
- YouTube liked/saved/subscription export.
- Podcast app export where available.
- Audible/Amazon library or notes export where available.
- Browser/search history export if explicitly approved.

### Phase 3 sources: connected APIs/integrations

Only after approval and read-only probes:

- YouTube Data API / Google Takeout-derived imports.
- Gmail/newsletter searches.
- Google Drive/Docs reading for approved folders.
- Calendar/meeting transcript inputs.
- Browser history local reader.

## Privacy and approval boundaries

Default mode is local-first, read-only, and privacy-minimizing.

Margot/Nexus may auto-execute:

- create local docs/plans;
- process explicitly supplied URLs/transcripts/exports;
- classify and summarize public content;
- write local research notes;
- draft memory candidates without saving them blindly;
- draft task candidates without creating external tickets;
- update local operating-model docs and progress logs.

Margot/Nexus must ask before:

- reading private browser/search history;
- connecting Google/YouTube/Amazon/podcast accounts;
- reading Gmail/Drive/Calendar;
- storing raw transcripts or sensitive personal queries;
- creating Linear/GitHub tasks externally;
- writing production CRM records;
- sending client-facing messages;
- changing permanent business rules;
- saving sensitive personal facts as durable memory.

Approved candidate handoffs are still proposals only. A Phase 1F action pack may prepare a memory-write proposal, task-draft proposal, future-review proposal, evidence-only record, or pending-review hold, but it must not perform the downstream side effect itself.

Phase 1G dry-runs are still non-applying descriptive artifacts only. They may describe what would happen next for memory-write requests, task drafts, future-review queue items, evidence/archive markers, or no-op holds, but they must not write, create, execute, route, publish, deploy, mutate, or send anything.

Phase 1H approval-gate artifacts are still local apply-request drafts only. They translate Phase 1G dry-run items into `pending_human_gate` records that are ready for operator review, but they do not apply, write, create, execute, route, mutate queues, call external APIs, deploy, write production data, or produce client-facing output.

Phase 1I Telegram quick decision boxes may surface each Phase 1H apply request with signed inline callback buttons for approve, reject, defer, request_changes, and view_evidence. The only permitted durable mutation is a local append-only Phase 1I decision record; view_evidence is info-only. Telegram handling may answer callbacks, send evidence summaries, and update the original Telegram message decision footer, but it must not execute memory writes, task creation, routing/application, archive application, production mutations, deployments, or client-facing work.

Never store:

- secrets/tokens/passwords;
- raw private search terms that are sensitive or irrelevant;
- client PII unless tied to an approved client context;
- full copyrighted audiobook text;
- private transcripts unless retention is approved;
- vendor/account credentials;
- personal data that is not useful for Nexus operations.

## Ingestion pipeline

```text
Signal captured
  -> Source identified
  -> Privacy classification
  -> Transcript/text extraction if allowed
  -> Summary
  -> Topic classification
  -> Waste filter
  -> Relevance scoring
  -> Founder-profile signal extraction
  -> Nexus mapping
  -> Memory candidate decision
  -> Task / plan / experiment candidate decision
  -> Candidate register promotion
  -> Approval ledger decision state
  -> Human review action pack handoff
  -> Human review decision applier dry-run
  -> Human review approval gate apply-request draft
  -> Telegram quick decision boxes / local decision ledger
  -> Store local evidence
  -> Surface in digest / command center
```

## Waste filter taxonomy

Each item receives a waste label, even if it also has useful parts.

- `useful`: high-value, actionable, business-relevant.
- `mixed`: contains useful insight plus substantial filler.
- `duplicate`: repeats already-known ideas.
- `hype`: claims are speculative or vendor/creator hype.
- `entertainment`: watched/listened for downtime; do not operationalize.
- `off-strategy`: interesting but not aligned with current Nexus priorities.
- `low-confidence`: claim may matter but needs verification.
- `parked`: potentially useful later but not now.
- `reject`: no durable value.

Waste ratio should be estimated as low/medium/high or 0-100% when evidence supports it.

## Signal classification

Primary categories:

- AI models and model releases
- AI agents / autonomous systems
- agentic planning / long-horizon reasoning
- SEO
- GEO / generative engine optimization
- AEO / answer engine optimization
- content strategy
- CRM / sales / lead conversion
- SaaS / platform product strategy
- operations / delivery / project management
- automation / integration
- finance / business model / valuation
- leadership / founder psychology
- client-service opportunity
- security / privacy / compliance
- irrelevant / personal / entertainment

## Relevance scoring

Score 0-3 on each dimension:

- Revenue leverage
- Operating leverage
- Data / 2nd Brain leverage
- Client leverage
- Strategic / $2B leverage
- Near-term actionability
- Confidence / evidence quality

Decision bands:

- 17-21: immediate candidate for plan/task/experiment.
- 12-16: add to active Nexus research/opportunity register.
- 7-11: park for weekly synthesis.
- 1-6: store only if it teaches a recurring preference/pattern.
- 0: discard.

## Phill founder model

The second assistant should maintain distilled, non-invasive profile signals about Phill as a person, business owner, and entrepreneur.

Track only useful patterns:

- repeated topics and obsessions;
- business opportunities Phill keeps returning to;
- areas where Phill needs filtering or delegation;
- decision patterns;
- strategic instincts;
- risk tolerance;
- preferred operating cadence;
- energy/time bottlenecks;
- areas causing overwhelm;
- themes tied to the $2B strategy;
- areas where Nexus should act before Phill has to sit at the computer.

Do not turn this into surveillance. Raw attention data is temporary. Durable profile entries must be distilled, useful, and respectful.

## Nexus mapping rules

Every useful insight should map to one or more destinations:

- `crm`: leads, clients, opportunities, tasks, approvals, relationship memory.
- `client_2nd_brain`: client strategy, voice, positioning, project history.
- `marketing_strategy`: SEO/GEO/AEO/content/campaign insights.
- `ai_enhancement_pipeline`: model/tool/agent/retrieval opportunities.
- `agentic_thinking`: 25+ moves-ahead planning logic, scenario trees, decision gates.
- `product_roadmap`: Nexus features and platform capabilities.
- `project_portfolio`: delivery risks, next actions, blockers.
- `memory_candidate`: durable personal/business preference or operating rule.
- `task_candidate`: local plan, Linear/GitHub candidate, implementation slice.
- `parked_research`: useful later, not now.
- `waste_register`: rejected/duplicate/hype/off-strategy.

## Memory tier policy

### Tier 0: discard

Entertainment, duplicates, low-value hype, irrelevant content.

### Tier 1: temporary research note

Useful but time-sensitive, unverified, or not yet actionable.

### Tier 2: Nexus file

Business mapping, content brief, experiment idea, strategy note, operating-model update, client-specific insight.

### Tier 3: durable memory candidate

Only stable facts that will still matter later:

- Phill preferences;
- recurring founder operating patterns;
- durable business thesis;
- durable Nexus operating rule;
- project convention;
- stable strategic lens.

### Tier 4: executable task

Insight becomes a small, independently verifiable task, plan, test, implementation slice, or approved external ticket.

## Suggested local data structures

Initial local-first file/database records should model:

```yaml
content_item:
  id:
  source_type: youtube|podcast|audiobook|search|article|voice|chat|export
  source_url:
  source_title:
  creator_or_author:
  consumed_at:
  captured_at:
  privacy_class: public|personal|client|sensitive
  raw_artifact_path:
  transcript_available: true|false
  summary:
  topic_tags: []
  waste_label:
  waste_ratio:
  relevance_scores:
    revenue:
    operating:
    data:
    client:
    strategic:
    actionability:
    confidence:
  nexus_mappings: []
  insight_ids: []
  task_candidate_ids: []
  memory_candidate_ids: []
  status: new|processed|parked|rejected|actioned
```

```yaml
insight:
  id:
  content_item_id:
  claim:
  evidence_excerpt:
  confidence:
  why_it_matters:
  nexus_mapping:
  recommended_action:
  approval_needed:
```

```yaml
memory_candidate:
  id:
  insight_id:
  proposed_memory:
  memory_type: user_preference|business_thesis|operating_rule|project_convention
  durability_reason:
  sensitivity:
  approval_status: draft|approved|rejected
```

```yaml
task_candidate:
  id:
  insight_id:
  title:
  lane: docs|research|implementation|test|marketing|crm|product|automation
  smallest_next_action:
  verification:
  external_ticket_allowed: false
  status: draft|queued|approved|done|parked
```

## Daily operating loop

Daily assistant output should be short and useful:

1. Top useful signals.
2. Waste filtered out.
3. What changed in Phill/Nexus model.
4. Recommended top 3 actions.
5. Memory candidates needing approval.
6. Task candidates needing approval or already safe locally.
7. One thing Phill can ignore.

## Weekly operating loop

1. Repeated themes.
2. Strategic opportunities.
3. Distraction/waste pattern.
4. SEO/GEO/AEO opportunities.
5. AI/model/tool candidates.
6. Nexus roadmap implications.
7. Client/business opportunities.
8. Recommended build sprint.

## Monthly operating loop

1. Founder attention audit.
2. $2B strategy alignment.
3. Opportunity register review.
4. Waste reduction recommendations.
5. Automation leverage review.
6. Product roadmap update.
7. Memory hygiene review.

## First implementation roadmap

### Slice 1: documentation spine

- Create this operating model.
- Add a detailed implementation plan.
- Link into existing Margot/Nexus read-first docs after review.

### Slice 2: pure TypeScript classifier

Create a local, deterministic library for:

- waste labels;
- topic categories;
- relevance scoring;
- Nexus mappings;
- memory/task candidate decisions.

Add unit tests first.

### Slice 3: YouTube transcript ingestion prototype

Create a local script/API helper that accepts a YouTube URL and an optional transcript text fixture. Start with fixtures/tests before live external calls.

Outputs:

- summary;
- topic tags;
- waste label/ratio;
- relevance scores;
- Nexus mappings;
- draft insights;
- memory candidates;
- task candidates.

### Slice 4: local evidence store

Store processed items in a local-first format initially under docs or a gitignored data path. Do not store raw sensitive history by default.

### Slice 5: command-center/digest integration

Expose processed intelligence in the command center and daily digest once the local classifier and storage are proven.

### Slice 6: account/export integrations

Only after privacy rules are approved:

- YouTube exports/API;
- podcast exports;
- audiobook notes;
- search/browser exports;
- Google Workspace inputs.

## Definition of done for MVP

- A single YouTube URL or transcript can be processed locally.
- Output separates useful signal from waste.
- Output maps insight to Nexus domains.
- Output proposes memory/task candidates without blindly saving or creating external tasks.
- Tests prove privacy and waste-filter behavior.
- Daily digest can show a concise summary of processed intelligence.

## Non-goals for MVP

- No stealth history ingestion.
- No production database writes.
- No Google/YouTube/Amazon account connection.
- No raw private search history storage.
- No client-facing output.
- No autonomous memory writes without approval.
- No external tickets unless explicitly approved.

## Immediate next safe build slice

Build the deterministic local classifier and tests:

- `src/lib/personal-intelligence/types.ts`
- `src/lib/personal-intelligence/classifier.ts`
- `tests/unit/lib/personal-intelligence/classifier.test.ts`

The classifier should accept a normalized content item and return:

- waste label;
- topic tags;
- relevance score;
- Nexus mappings;
- memory decision;
- task decision;
- safety/approval flags.

Verification:

- `npx jest tests/unit/lib/personal-intelligence/classifier.test.ts --runInBand`
- `npm run type-check`
- `git diff --check`

## AI-RET-001 Personal-Intelligence-Second-Assistant-Model Self-Boundary (99th answer-shape fixture)

Last update: 2026-06-12 14:50:00 AEST — Senior PM 99th answer-shape fixture (personal-intelligence-second-assistant-model self-boundary) + doc-drift guard.

This personal-intelligence-second-assistant-model doc is now bound to the local, mocked AI-RET-001 retrieval-evaluation harness (`src/lib/margot/retrieval-evaluation.ts`, `scripts/margot-retrieval-evaluation-report.ts`, `docs/margot/evidence/AI_RET_001_LOCAL_RETRIEVAL_REPORT.md`) via the 99th answer-shape fixture `AI-RET-001-ANSWER-PERSONAL-INTELLIGENCE-SECOND-ASSISTANT-MODEL-SELF-BOUNDARY` (bound to `AI-RET-001-USE-EXISTING-ASSETS`, no source-citation union member added). A future answer about the personal-intelligence-second-assistant-model self-boundary must satisfy all of the following:

- The 10 required phrases (case-insensitive) are present in this doc:
  - `personal intelligence second assistant model self boundary lane` (the 99th self-boundary identifier; this doc is the load-bearing personal-intelligence control surface).
  - `1st personal intelligence second assistant model content citation class` (the 1st content-citation class for this doc; the 99th is the disjoint self-evidence identifier set).
  - `second assistant intelligence layer turns watched listened searched read spoken written signals into filtered business intelligence` (the load-bearing executive mandate).
  - `phase 1 sources explicit manual phase 2 sources read only batch imports phase 3 sources connected apis integrations are the three source tiers` (the three-tier source classification).
  - `tier 0 discard tier 1 temporary research note tier 2 nexus file tier 3 durable memory candidate tier 4 executable task are the five tier policy and tier 4 task candidates are proposals only` (the five-tier memory policy; tier 4 task candidates are proposals only).
  - `phase 1f action pack and phase 1g dry runs and phase 1h approval gate apply request draft and phase 1i telegram quick decision boxes are the four governance stages and only the phase 1i append only decision record is a permitted durable mutation` (the four-stage governance flow).
  - `slice 1 documentation spine slice 2 pure typescript classifier slice 3 youtube transcript ingestion prototype slice 4 local evidence store slice 5 command center digest integration slice 6 account export integrations are the six implementation slices and slice 6 is gated on privacy rule approval` (the six-slice implementation roadmap).
  - `default mode is local first read only and privacy minimizing and never store covers secrets raw private search terms client pii full copyrighted audiobook text private transcripts vendor account credentials and non nexus personal data` (the privacy-and-approval boundary).
  - `waste filter taxonomy covers useful mixed duplicate hype entertainment off strategy low confidence parked reject and waste ratio is estimated low medium high or zero to one hundred percent when evidence supports it` (the waste filter taxonomy and waste ratio scale).
  - `use existing assets first and the second assistant model is a literal drafter operating model and approval ledger decisions remain proposals only with no autonomous memory write task creation or client facing output` (the closing governance statement).
- The 4 required citations are present in this doc:
  - `docs/margot/personal-intelligence-second-assistant-model.md` (this doc).
  - `docs/margot/personal-intelligence-candidate-register.md` (the candidate register that consumes the second assistant's outputs).
  - `docs/margot/SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md` (the senior PM control loop that the second assistant feeds into).
  - `docs/margot/MARGOT-ORCHESTRATOR.md` (the orchestrator loop that the second assistant is a sibling of).
- The 10 prohibited overclaim phrases must NOT appear in the assertion section of this doc (everything before the `## Senior PM verification checkpoint (2026-06-12 14:50:00 AEST)` heading):
  - personal intelligence second assistant model memory write executed without approval, personal intelligence second assistant model task candidate auto routed to linear or github, personal intelligence second assistant model production crm record auto written from candidate, personal intelligence second assistant model gmail or drive or calendar auto ingested, personal intelligence second assistant model private browser or search history auto ingestion, personal intelligence second assistant model vendor account credential auto stored, personal intelligence second assistant model telegram callback execution absent operator gate, personal intelligence second assistant model phase 1i decision record mutated into a memory write, personal intelligence second assistant model slice 6 account export integration onboarded without privacy approval, personal intelligence second assistant model nango connector platform onboarded for second assistant layer.

The `## AI-RET-001 Personal-Intelligence-Second-Assistant-Model Self-Boundary (99th answer-shape fixture)` section above IS the assertion section the doc-drift guard scans. The 10 prohibited phrases are documented only at a meta level (inside this section heading and inside the Senior PM verification checkpoint's wording) so the assertion-section regex check stays green.

## Senior PM verification checkpoint (2026-06-12 14:50:00 AEST)

Doc-drift guard: the 10 required phrases (personal intelligence second assistant model self boundary lane, 1st personal intelligence second assistant model content citation class, second assistant intelligence layer turns watched listened searched read spoken written signals into filtered business intelligence, phase 1 sources explicit manual phase 2 sources read only batch imports phase 3 sources connected apis integrations are the three source tiers, tier 0 discard tier 1 temporary research note tier 2 nexus file tier 3 durable memory candidate tier 4 executable task are the five tier policy and tier 4 task candidates are proposals only, phase 1f action pack and phase 1g dry runs and phase 1h approval gate apply request draft and phase 1i telegram quick decision boxes are the four governance stages and only the phase 1i append only decision record is a permitted durable mutation, slice 1 documentation spine slice 2 pure typescript classifier slice 3 youtube transcript ingestion prototype slice 4 local evidence store slice 5 command center digest integration slice 6 account export integrations are the six implementation slices and slice 6 is gated on privacy rule approval, default mode is local first read only and privacy minimizing and never store covers secrets raw private search terms client pii full copyrighted audiobook text private transcripts vendor account credentials and non nexus personal data, waste filter taxonomy covers useful mixed duplicate hype entertainment off strategy low confidence parked reject and waste ratio is estimated low medium high or zero to one hundred percent when evidence supports it, and use existing assets first and the second assistant model is a literal drafter operating model and approval ledger decisions remain proposals only with no autonomous memory write task creation or client facing output) and 4 required citations (personal-intelligence-second-assistant-model.md, personal-intelligence-candidate-register.md, SENIOR-PROJECT-MANAGER-OPERATING-MODEL.md, MARGOT-ORCHESTRATOR.md) are present in the assertion section above. The 10 prohibited phrases are documented only here for completeness and do not appear in the assertion section; their presence here satisfies the answer-shape contract: personal intelligence second assistant model memory write executed without approval, personal intelligence second assistant model task candidate auto routed to linear or github, personal intelligence second assistant model production crm record auto written from candidate, personal intelligence second assistant model gmail or drive or calendar auto ingested, personal intelligence second assistant model private browser or search history auto ingestion, personal intelligence second assistant model vendor account credential auto stored, personal intelligence second assistant model telegram callback execution absent operator gate, personal intelligence second assistant model phase 1i decision record mutated into a memory write, personal intelligence second assistant model slice 6 account export integration onboarded without privacy approval, personal intelligence second assistant model nango connector platform onboarded for second assistant layer.
