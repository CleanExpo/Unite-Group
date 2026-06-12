# Phase 3 Report — Vault ingested, board built (2026-06-12)

Executed per `phase3-handoff.md`. Filing plan and board seats approved by
Phill in-session before any writes.

## Task 1 — Vault → `knowledge_docs`

- **1,193 docs ingested** from `CleanExpo/brain-1` (≈11 MB).
  `[VERIFIED — select count(*) from knowledge_docs = 1193]`
- Approved filing plan: everything under `2nd Brain/**/*.md` plus `NEXUS.md`;
  **excluded**: hidden/system dirs (`.obsidian`, `.agentic`, `.agentic_nexus`),
  vendored `.agents`/`.claude` skill docs, 2 files >150KB
  (`How to Build Mobile Apps with Claude Code…`, `Wiki/log.md`), 3 near-empty
  files, and `Drafts/` (1 personal email — quarantined by Phill's decision).
- Secrets scan: no credential tokens found in any vault `.md`
  (`sk-*`, `ghp_`, `github_pat_`, JWTs, `AKIA*`, `xox*` patterns).
  `[VERIFIED — pattern scan over the full clone]`
- Retrieval check: `websearch_to_tsquery('agent orchestration subagents')`
  returns the IndyDevDan orchestration transcript first. `[VERIFIED]`

### How the sync works (durable mechanism)

`brain-1/.github/workflows/kd-sync.yml` + `.scripts/kd-sync.py` walk the
vault checkout in CI, apply the filing plan, and POST batches to the Supabase
Edge Function `kd-ingest-temp`, which upserts with the service role keyed on
`(source_repo, path)`. Auth: the runner's ephemeral `GITHUB_TOKEN`, verified
server-side by checking it can read the private vault repo — **no secrets
committed anywhere**. (The app's own `/api/ingest` GitHub sync also still
works, capped at 800 files.)

- RLS was enabled on `knowledge_docs` (was off — flagged by Supabase
  advisor; the app uses the service-role key, so nothing breaks). `[VERIFIED]`

## Task 2 — Advisor board

Seats with real vault material (rule: no material, no seat):

| Seat | Material | board_members id |
|---|---|---|
| IndyDevDan — Agentic Engineering | 3 authored YouTube transcripts | `c31d8b7e…` |
| Andrej Karpathy — AI/ML First Principles | No Priors transcript + 4 repo/article notes | `82d1d65d…` |
| Duncan Perkins — Distribution Partner / Client Voice | playbook, partnership deliberation, Plaud transcripts | `6955fb6f…` |

**Gary Vee: no seat.** The vault contains zero source material by/about him —
only "Gary V ×5" agent-archetype mentions in two wiki files. `[VERIFIED]`

- Profiles: `knowledge/board/<advisor>/profile.md` (lens + source links).
- App wiring: `POST /api/board` streams per-seat persona critiques over a
  saved spec (reuses the critic provider via `lib/llm.ts#runPersona`), stores
  each in `board_responses`, then emits a convergence/tensions/verdict
  synthesis labelled `[INFERENCE] — persona synthesis, not fact`.
- UI: "Ask the board" button on a finished spec, with per-seat sections
  labelled "persona critique, not the real person". The approval gate is
  untouched — board output never bypasses it.

## Assumption register

- `[UNCONFIRMED]` Vercel env still has `CRITIC_PROVIDER`/keys configured as
  at Phase 2 — `/api/board` returns a clear 500 if not.
- `[UNCONFIRMED]` Future vault syncs: the workflow currently triggers on push
  to `claude/serene-mayer-z1hpf4` and manual dispatch; after merging the
  brain-1 PR, point it at `main` pushes if continuous sync is wanted.
