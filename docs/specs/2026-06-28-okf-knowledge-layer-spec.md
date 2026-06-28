---
type: spec
status: in-progress
created: 2026-06-28
author: SPM (/spm + /judge)
source: "2nd Brain/Sources/Google's New Release Just Fixed AI Systems.md" (AI LABS, youtu.be/k4sMSsMzX2g)
evidence_standard: fabel — claims tagged [VERIFIED]/[INFERENCE]/[UNCONFIRMED]
---

# Nexus OKF Knowledge Layer — adopt Google's Open Knowledge Format

Make the Nexus 2nd Brain (the Agentic OS Level-2 memory layer) OKF-compliant so Mission
Control and every agent retrieve knowledge faster, cheaper (fewer tokens), without
wrong-folder/duplicate errors, and portably.

## 1. What OKF is (from the source)

Google's Open Knowledge Format — a **standard** (like MCP/skills/agents.md), built on
Karpathy's LLM Wiki pattern. Principles:
- **Concepts:** one file = one thing, with a `type` field. Mixing topics kills targeted loading.
- **YAML frontmatter** (name + description) on every file so the agent loads only what it needs (reads descriptions first, opens content second).
- **`index.md` in every folder** — the agent reads it FIRST to know the folder's contents + subfolders before opening anything. Cuts tokens + wrong-folder + duplicates.
- **Markdown over RAG:** the agent gathers context as it navigates, instead of RAG rebuilding the answer from scratch each query.
- **Separation:** knowledge is independent of the consumer (agent/human/tool) → portable bundle.
- **The critical step:** a **CLAUDE.md navigation section** — without it Claude falls back to keyword matching and ignores the structure. `[VERIFIED source 10:13-11:05]`
- **Script-first conversion:** AI Labs built a "markdown→OKF" skill (code does the work, agent only judges) with evals, because Google's official tool is BigQuery-only.

## 2. Why this matters to Nexus now `[VERIFIED this session]`

The 2nd Brain is the Level-2 layer behind Mission Control (Memory Galaxy card, `/api/knowledge`,
quick-run outputs). Current state: **78 folders, only 2 have `index.md`; CLAUDE.md has 0 OKF/index
navigation**. So agents keyword-match across a deep tree — slow, token-heavy, duplicate-prone.
This is exactly the failure OKF fixes, and our vault is already half-shaped (Wiki/index.md,
log.md, frontmatter on wiki pages).

## 3. Scope

**In:** generate `index.md` across the vault; add the CLAUDE.md OKF navigation section; make
Mission Control quick-run outputs OKF concepts (frontmatter); a re-runnable, script-first
generator. **Out:** BigQuery enrichment agent (not our stack); the HTML graph visualiser (Obsidian
already gives a graph view); splitting existing multi-topic files into single concepts (later pass).

## 4. Specialist board (15+ yr)

- **Knowledge architect:** the highest-leverage, lowest-risk move is the `index.md` layer + the
  CLAUDE.md nav section — that's where the token/latency/dedup win comes from, per the source. Don't
  rewrite existing content; index it.
- **Engineering:** script-first (Python) generator, idempotent, re-runnable; derives each file's
  description from its frontmatter (`description`/`title`/`name`) or first heading. Never edits
  `Sources/` content (immutable per vault CLAUDE.md) — only writes `index.md`.
- **Judge:** the source itself says "until OKF is a built-in standard this is an optimisation, not a
  must." So treat as an optimisation: ship the index + nav (cheap, reversible), defer the bundle
  tooling. Score 86/100 → APPROVE BUILD (index + nav slice).
- **Devil's advocate:** stale indexes are worse than none — so the generator must be re-runnable and
  wired to run after content changes (the `wiki-ingest`/quick-run write path), not one-shot.

## 5. Implementation (this slice)

1. **OKF index generator** — `apps/workspace/scripts/okf-index.py`: walks the vault, writes an
   `index.md` per folder with OKF frontmatter (`type: index`, name, description, counts) + a
   subfolder list (linked) + a concept list (name — description). Idempotent; skips `.obsidian`/`.git`.
2. **Run it** across the 78 folders.
3. **CLAUDE.md navigation section** — add an OKF block to the vault CLAUDE.md teaching agents to read
   `index.md` first, honour frontmatter, one-concept-per-file, and where things live. (The step the
   source says is essential.)
4. **Mission Control outputs as concepts** — `quick-run` writes OKF frontmatter (`type: output`,
   name, description) so generated briefs are first-class OKF concepts indexed alongside the vault.

## 6. Verification

- `index.md` count rises from 2 → ~78. `[verify: find -name index.md | wc -l]`
- A spot folder's `index.md` lists its files with descriptions + subfolders.
- vault CLAUDE.md contains the OKF navigation section.
- a new quick-run output has `type: output` + name/description frontmatter.
- `/api/knowledge/list` still serves (no regression).

## 7. /goal (follow-on)

```
/goal Wire the OKF generator into the write path: run okf-index.py after wiki-ingest and after each
quick-run so indexes never go stale; add an `okf:bundle` step that emits a portable manifest; split
the largest multi-topic vault files into single concepts. Verify index freshness + token savings.
```

## 8. Final recommendation

APPROVE BUILD — ship the index + CLAUDE.md nav + output-frontmatter slice now (cheap, reversible,
on-thesis). Defer bundle tooling/visualiser. This upgrades the whole Agentic OS memory layer that
Mission Control reads.
