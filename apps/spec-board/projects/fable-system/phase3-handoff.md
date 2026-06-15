# Phase 3 Handoff — Ingest the 2nd Brain vault, build the board

**For the Claude session with access to BOTH repos** (`CleanExpo/Fabel-Prompt-Engineer`
and `CleanExpo/brain-1`). Read `CLAUDE.md` at the repo root first. Phases 0–2
are complete and verified; Phase 3 part 1 (the app-side vault link) is merged.

## State of the world

- **App**: live on Vercel (project `unite-group/fabel-prompt-engineer`),
  engine on OpenRouter (`nex-agi/nex-n2-pro:free` → `moonshotai/kimi-k2.6`
  fallback; switch `LLM_PROVIDER` to `anthropic` after 2026-06-22).
- **Supabase**: project ref `yhteftfnoegmdkimzzjd`. Tables: `visions`,
  `specs` (incl. `critique`, `critic_model`, `approved_at`), `findings`,
  `board_members`, `board_responses`, and `knowledge_docs` (FTS-indexed,
  currently empty).
- **The vault**: `CleanExpo/brain-1` — "Phill's 2nd Brain", Obsidian vault.
  This session could not read it (repo scope); yours can.

## Task 1 — Ingest the vault into `knowledge_docs`

1. Survey `brain-1`: count `.md` files per top-level folder.
2. Propose a filing plan to Phill (counts, what's in/out, anything that looks
   like a secret or credential gets quarantined, not ingested) and get
   approval — the `ingest` skill's rules apply.
3. On approval, insert the notes into Supabase `knowledge_docs` via the
   Supabase MCP tools (batched `insert ... on conflict (source_repo, path) do
   update`). Columns: `source_repo` = `CleanExpo/brain-1`, `path`, `title`
   (filename sans `.md`), `content`, `sha` (if known). The `fts` column is
   generated — do not write it. Skip files > 150KB.
4. Verify: `select count(*) from knowledge_docs;` and run one
   `textSearch`-style query to confirm retrieval works.

The app then uses these notes automatically: `/api/run` full-text-searches
them per vision and attaches matches as the engine's Obsidian channel.

## Task 2 — Build the advisor board

1. Search the ingested notes for advisor material. Expected seats (from the
   original build spec): IndyDevDan, Gary Vee, Perkins, Karpathy — but follow
   what's actually in the vault.
2. For each advisor with real material: create `knowledge/board/<advisor>/profile.md`
   in this repo (per `knowledge/board/README.md`) and a `board_members` row
   (`name`, `seat`, `source_links`).
3. Wire `ask-the-board` into the app: endpoint that runs each board member's
   persona critique over a spec (reuse `lib/llm.ts` chat helpers), stores
   results in `board_responses`, and a UI affordance on a finished spec.
   Clone output is a lens, never truth — label it, keep the human gate.

## Rules that bind every step

- Evidence Standard: `[VERIFIED]` / `[INFERENCE]` / `[UNCONFIRMED]` on claims.
- Human in the loop: filing plans and board seats get approved before commit.
- Don't fabricate advisor personas from thin air — no material, no seat.
- Develop on a feature branch, push, open a draft PR. Never commit secrets;
  `.env*` is gitignored.
