---
type: sketch
component: nexus-obsidian-operating-brain-v2
status: draft
appetite: 2w
rabbit_holes:
  - "Which Obsidian integrations are already installed locally: CLI, Bases, Dataview, Tasks, Templater, Omnisearch, Local REST API/MCP?"
  - "Should 2nd-brain remain a private local/git vault only, or later use Obsidian Sync/Publish for selected shared docs?"
  - "Where should the cross-ID resolver live: Pi-CEO, Unite-Group Nexus, or the vault scripts folder?"
no_gos:
  - "No Nango or third-party connector platform."
  - "No new external vendor/account without Phill approval."
  - "No production DB writes or deploys from this shaping work."
  - "No vector database before corpus/retrieval evidence says keyword+frontmatter is failing."
created: 2026-06-04
links:
  - "[[2026-06-04-obsidian-agentic-second-brain-research]]"
  - "[[2026-06-04-nexus-kb-architecture-research]]"
  - "[[03-nexus-autonomous-onboarding-and-growth-os-v1]]"
  - "[[adr-006-retrieval-first-protocol]]"
---

# Sketch 04 — Nexus Obsidian Operating Brain v2

## The shape

Turn the 2nd-brain from a capture vault into an operating brain with five rails:

```
[Capture] -> [Router] -> [Cortex] -> [Betting Table] -> [Outcome Loop]
     ^                                                     |
     |_____________________________________________________|
```

## 1. Capture rail: everything enters one mouth

Inputs:

- Phill voice notes / Plaud / Telegram messages
- meeting notes
- prospect/client context
- research articles
- repo/PR/CI outcomes
- Linear/GitHub/Vercel/Supabase evidence
- daily briefs and autonomous findings

Rule:

- Capture is cheap.
- Capture does not mean commitment.
- Capture must be tagged with source, product, confidence, and next routing status.

Fat-marker data:

```
Sources/<date>-x.md       raw outside material
Outcomes/<date>-x.md      what happened
Inbox/<date>-x.md         unsorted operator capture (new folder, if approved)
```

## 2. Router rail: daily forced transformation

The router asks every captured thing:

1. Is this actionable in under 2 minutes?
2. Is this a current project input?
3. Is this a decision?
4. Is this a repeated signal worth consolidation?
5. Is this a source that should stay reference-only?
6. Is this stale/noisy and safe to archive?

Outputs:

```
Action       -> Linear / continuous-work-queue / local next-action note
Decision     -> Decisions/adr-NNN-*.md draft
Idea         -> Sketches/NN-*.md
Evidence     -> linked Source/Outcome with evidence_paths
Reference    -> Resources/ or Sources/ with cold status
Trash/Archive -> Archives/ with redirect note if needed
```

No item should sit in `Sources/` forever with no links, no status, and no next review.

## 3. Cortex rail: linked knowledge, not piles

Minimum graph convention:

```
links:
  - "[[pitch-or-decision]]"
evidence_paths:
  - "Sources/yyyy-mm-dd-source.md"
decision_refs:
  - "Decisions/adr-006-retrieval-first-protocol.md"
preceded_by:
  - "Outcomes/yyyy-mm-dd-previous-signal.md"
```

Every generated recommendation must cite real paths or IDs.

Dashboards later become Obsidian Bases / Dataview views, but Markdown frontmatter remains canonical.

## 4. Betting rail: Shape Up remains the commitment gate

Promotion path:

```
Source/Outcome signal
   -> consolidation note
   -> Sketch
   -> Grill with Phill
   -> Pitch
   -> Linear epic / Rana queue
   -> PR / shipped slice
   -> Outcome
```

This prevents research from becoming a backlog landfill.

## 5. Outcome loop: every shipped thing teaches the brain

After a PR, campaign, onboarding flow, or client action ships:

- write an Outcome note,
- attach evidence paths/IDs,
- score signal quality,
- link to the pitch/decision that predicted it,
- feed it to the next daily brief,
- if repeated 2+ times, consolidate into a reusable decision/pattern.

## The 10x features

### A. Source-to-Shape autopromoter

Daily job scans hot Sources/Outcomes and proposes:

- `keep`: linked to an active component,
- `sketch`: deserves a new Sketch,
- `decision`: demands an ADR draft,
- `archive`: stale or low-signal,
- `ask_phill`: needs Board call.

It writes proposals only. No external side effects.

### B. Evidence-locked daily brief

Daily brief sections require citations:

- claim,
- evidence path or outcome ID,
- confidence,
- action recommendation,
- approval requirement.

If no evidence, the claim is dropped or labelled hypothesis.

### C. Obsidian Bases as operator cockpit

Create `.base` views for:

- Hot Sources: status=captured and next_review<=today
- Active Sketches: type=sketch status=draft
- Needs Grill: Sketches with no matching Grill
- Ready to Pitch: Grills status=resolved and no matching Pitch
- Decisions Due: status=ratified and next_review<=today
- Outcome Signals: last 7d high ROI × urgency

### D. Weekly consolidation ritual

Every week:

- read last 7d Outcomes + hot Sources,
- cluster by component/product,
- identify repeated signals,
- write one consolidation note,
- propose at most 3 Sketch/Decision promotions,
- archive low-signal noise.

### E. Hot / warm / cold memory tiers

```
Hot  = today + active Decisions/Pitches/Personas + last 7d Outcomes
Warm = last 30d Outcomes + shaped Pitches + active Resources
Cold = older Sources/Outcomes; search-only unless linked by Hot/Warm
```

Retrieval-first agents load Hot first, Warm on demand, Cold by search.

### F. Cross-ID resolver

A resolver maps:

- Obsidian path
- wiki link
- Linear issue ID
- GitHub PR URL
- Supabase outcome ID
- Telegram message/thread ID
- Vercel deploy ID

This makes every brief traceable from recommendation -> evidence -> shipped artifact -> outcome.

### G. Dead-letter + retry for knowledge writes

Any failed outcome/audit/vault write goes to:

```
app/logs/outcomes-dead-letter.jsonl
2nd-brain/Outcomes/dead-letter/<date>.md
```

The operating brain should fail visible, not silently.

## Appetite

2 weeks for v2 shaping/implementation slice:

- 1d schema/frontmatter convention update
- 2d dashboard/base prototypes
- 2d source-to-shape autopromoter script
- 2d weekly consolidation report generator
- 2d cross-ID resolver v0
- 1d verification, docs, and backfill on newest 50 notes

## No-gos

- Do not make the vault dependent on a paid external service.
- Do not start with vector DB/RAG.
- Do not automate Board decisions.
- Do not publish private vault content.
- Do not mutate production systems.
- Do not skip Grill before Pitch.

## Rabbit holes

- Obsidian CLI/headless availability on this Mac and exact version.
- Whether `.base` files should be hand-authored now or generated only after confirming Obsidian version supports Bases locally.
- How much of this belongs in Pi-CEO versus Unite-Group repo versus vault scripts.
- Whether weekly consolidation should be Hermes cron, Pi-CEO daemon, or both.

## First slice

Build the local-only Source-to-Shape autopromoter:

- reads last 7 days of `Sources/` and `Outcomes/`,
- checks links/frontmatter/status,
- outputs `Outcomes/<date>-source-to-shape-proposals.md`,
- proposes max 3 promotions,
- never writes Linear/GitHub/Supabase,
- includes citations and confidence.

Success means Phill gets fewer piles and better shaped options.
