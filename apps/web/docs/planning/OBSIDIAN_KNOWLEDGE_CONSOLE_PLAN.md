# Obsidian Knowledge Console Plan

Issue: CleanExpo/Unite-Hub#74
Date: 03/06/2026
Status: planning complete, Phase 1 shell scaffolded only

## Requirements Summary

Build a read-only, founder-facing Knowledge Console inside Unite-Hub that lets Phill inspect Obsidian-sourced project knowledge from the Nexus WebUI without exposing local vault APIs or enabling write-back. Obsidian remains the local-first Markdown vault, Supabase remains the durable system of record, Hermes remains orchestration, and AI is used for summarisation, extraction, RAG, and handoff support only after ingestion is secured.

The first implementation slice must be additive: a planning report, an architecture report, and a minimal authenticated UI shell. It must not add migrations, API routes, real vault access, local REST calls, write-back, new dependencies, or changes to auth/billing/public routes.

## Existing Repo Findings

- Root app entry redirects authenticated users to `/founder/dashboard`, so new command-centre modules should live in the founder route family, not `/dashboard/*` ([src/app/page.tsx:29](../../src/app/page.tsx)).
- Founder pages are guarded in the shared founder layout with `getUser()` and `redirect('/auth/login')`, and render inside `FounderShell` ([src/app/(founder)/layout.tsx:1](../../src/app/(founder)/layout.tsx), [src/app/(founder)/layout.tsx:9](../../src/app/(founder)/layout.tsx)).
- `FounderShell` owns the dashboard chrome, including `Sidebar`, `Topbar`, `IdeaCapture`, and `CommandBar` ([src/components/layout/FounderShell.tsx:24](../../src/components/layout/FounderShell.tsx)).
- Sidebar, command palette, and breadcrumb labels are separate registries: `NAV_ITEMS`, `NAV_COMMANDS`, and `BREADCRUMB_MAP` ([src/components/layout/SidebarNav.tsx:9](../../src/components/layout/SidebarNav.tsx), [src/components/layout/CommandBar.tsx:42](../../src/components/layout/CommandBar.tsx), [src/components/layout/Topbar.tsx:9](../../src/components/layout/Topbar.tsx)).
- Existing notes UX already uses a left file tree plus note viewer pattern under `/founder/notes` ([src/app/(founder)/founder/notes/page.tsx:1](../../src/app/(founder)/founder/notes/page.tsx), [src/components/founder/notes/NotesPageClient.tsx:25](../../src/components/founder/notes/NotesPageClient.tsx)).
- Existing Google Drive note integration looks up credentials through `credentials_vault` and scopes lookups by `founder_id` ([src/lib/integrations/google-drive.ts:63](../../src/lib/integrations/google-drive.ts), [src/lib/integrations/google-drive.ts:66](../../src/lib/integrations/google-drive.ts)).
- API route conventions require `dynamic = 'force-dynamic'`, authenticated access, and `.eq('founder_id', user.id)` for all Supabase queries ([src/app/api/CLAUDE.md:19](../../src/app/api/CLAUDE.md), [src/app/api/CLAUDE.md:22](../../src/app/api/CLAUDE.md)).
- Active RLS conventions are founder-first: base policies use `founder_id = auth.uid()` ([supabase/migrations/20260309000001_rls_policies.sql:3](../../supabase/migrations/20260309000001_rls_policies.sql)).
- The current AI memory store is already founder-scoped with RLS and composite `(founder_id, capability_id, key)` semantics ([supabase/migrations/20260325000000_ai_memories.sql:8](../../supabase/migrations/20260325000000_ai_memories.sql), [src/lib/ai/features/memory-store.ts:47](../../src/lib/ai/features/memory-store.ts)).
- There is an older RAG prototype with `document_sources`, `document_chunks`, pgvector, and `hybrid_search`, but it uses `user_id`/`project_id` and should be treated as a reference pattern, not a direct copy ([supabase/supabase/migrations/00000000000009_rag_pipeline.sql:7](../../supabase/supabase/migrations/00000000000009_rag_pipeline.sql), [supabase/supabase/migrations/00000000000009_rag_pipeline.sql:54](../../supabase/supabase/migrations/00000000000009_rag_pipeline.sql), [supabase/supabase/migrations/00000000000009_rag_pipeline.sql:200](../../supabase/supabase/migrations/00000000000009_rag_pipeline.sql)).

## Proposed Route Path

Use `/founder/knowledge-console`.

Rationale:

- It fits the current authenticated founder route family.
- It avoids the stale `/dashboard/*` route style.
- It is clearer than `/founder/vault`, which already means credentials vault.
- It keeps Obsidian-specific implementation details out of the URL while preserving the user-facing "Knowledge Console" language.

## Proposed UI Components

The MVP shell should render these read-only zones:

- Left-side project/vault navigation for RestoreAssist, Synthex, Unite-Group Nexus, CARSI, CCW, and Disaster Recovery / NRPG.
- A note preview panel with Markdown-like content, frontmatter summary, source path, and status indicators.
- A Project Knowledge Map placeholder showing note links, tags, decisions, and project associations.
- Hermes Actions placeholders for summarise note, extract actions, generate Codex task prompt, and prepare project briefing.
- Agent Handoffs placeholder showing Hermes/Codex/Rana/Margot handoff lanes.
- Research Inbox placeholder for captured research awaiting project classification.
- Action Extractor placeholder with no write-back enabled.
- Open in Obsidian URI placeholder, disabled until ingestion stores a safe vault name/path.

Use existing Scientific Luxury tokens: `#050505`, `#00F5FF`, `rounded-sm`, `var(--surface-card)`, and `var(--color-border)` ([src/app/globals.css:64](../../src/app/globals.css), [src/app/globals.css:72](../../src/app/globals.css), [src/components/ui/card.tsx:25](../../src/components/ui/card.tsx)).

## Backend Tables Needed Later

All future tables should use `founder_id` as the primary isolation key. The GitHub issue mentions `workspace_id`, but current Unite-Hub instructions and active schema require `founder_id`; adding `workspace_id` as a primary security key would violate the project rule.

Recommended additive tables:

- `vaults`: `id`, `founder_id`, `name`, `vault_key`, `source_type`, `root_hint`, `read_only`, `created_at`, `updated_at`.
- `vault_files`: `id`, `founder_id`, `vault_id`, `project_id`, `path`, `basename`, `extension`, `content_hash`, `modified_at`, `sync_status`, `frontmatter_hash`, `created_at`, `updated_at`.
- `vault_note_chunks`: `id`, `founder_id`, `vault_file_id`, `project_id`, `chunk_index`, `heading_path`, `content`, `content_hash`, `token_count`, `created_at`, `updated_at`.
- `vault_links`: `id`, `founder_id`, `vault_file_id`, `target_path`, `link_type`, `resolved_vault_file_id`, `created_at`.
- `vault_tags`: `id`, `founder_id`, `vault_file_id`, `tag`, `source`, `created_at`.
- `vault_frontmatter`: `id`, `founder_id`, `vault_file_id`, `key`, `value_json`, `created_at`, `updated_at`.
- `vault_embeddings`: `id`, `founder_id`, `vault_note_chunk_id`, `model`, `embedding`, `content_hash`, `created_at`.
- `note_project_links`: `id`, `founder_id`, `vault_file_id`, `project_key`, `confidence`, `source`, `created_at`.
- `agent_handoffs`: `id`, `founder_id`, `vault_file_id`, `agent_key`, `handoff_type`, `status`, `payload`, `created_at`, `updated_at`.
- `note_action_items`: `id`, `founder_id`, `vault_file_id`, `project_key`, `title`, `status`, `source_quote`, `created_at`, `updated_at`.

Prefer nullable `project_id`/`project_key` on note tables because inbox, research, and daily notes may not have a known project at ingestion time.

## Security And RLS Risks

- Never expose local Obsidian REST/plugin endpoints to the browser or public internet.
- Never read local filesystem paths from client input.
- Never enable write-back by default.
- Every future API route must call `getUser()` and filter every Supabase query by `.eq('founder_id', user.id)`.
- Every future table must enable RLS with `founder_id = auth.uid()` for authenticated access and explicit service-role policies only where needed.
- Service-role ingestion jobs must receive a founder actor from trusted server configuration or signed job metadata, not from an unauthenticated request body.
- Obsidian URI links should be generated server-side from stored vault/file records and treated as convenience links only.
- Markdown preview must sanitise rendered HTML if raw HTML support is ever enabled. The Phase 1 shell does not render untrusted Markdown.

## Integration Options

### Option A: Git/filesystem sync bridge

Recommended production default.

Flow: Obsidian vault -> Git/file watcher -> Markdown parser -> Supabase vault tables -> Nexus UI -> Hermes/OpenAI.

Pros: audit-friendly, reversible, no public local API, works with CI/backups, can detect conflicts before later write-back.

Cons: slower than direct local plugin actions; needs a trusted sync worker and content hashing.

### Option B: local Obsidian plugin bridge

Good for internal automation after a security review. Must never be called directly from browser routes.

### Option C: Obsidian URI links

Use only as a convenience feature. It is not ingestion, not search, not durable state, and not a permission boundary.

## Hermes And AI/RAG Considerations

- Chunk Markdown notes by headings, not arbitrary byte ranges, so source citations can include note path and heading.
- Extract YAML frontmatter into `vault_frontmatter`.
- Store source paths and content hashes on every chunk.
- Use embeddings later through `vault_embeddings`; do not make embeddings the source of truth.
- Hermes answers must cite source note paths and headings.
- Agent handoffs should store a durable `agent_handoffs` record before any external execution.
- Action extraction should write `note_action_items` only after founder approval in a later phase.
- Existing `ai_memories` remains useful for persistent preferences/outcomes, but note content belongs in vault tables, not memory rows.

## Recommended First Implementation Slice

Completed in this task:

- Create planning and architecture documents.
- Add `/founder/knowledge-console` as a read-only authenticated shell.
- Add static demo project groups and placeholder note preview.
- Add shell navigation, command palette, and breadcrumb entries.

Intentionally not included:

- Supabase migrations.
- API routes.
- Obsidian vault reads.
- Local plugin bridge.
- Git sync worker.
- RAG search.
- Write-back.
- Real action extraction.

## Acceptance Criteria

- Planning document exists at `docs/planning/OBSIDIAN_KNOWLEDGE_CONSOLE_PLAN.md`.
- Architecture document exists at `docs/architecture/OBSIDIAN_NEXUS_HERMES_ARCHITECTURE.md`.
- `/founder/knowledge-console` renders inside the authenticated founder shell.
- Sidebar and command palette expose "Knowledge Console".
- Topbar renders "Knowledge Console" for `/founder/knowledge-console`.
- UI copy makes clear that ingestion, RAG, Hermes actions, and write-back are not connected yet.
- No migrations, secrets, auth changes, billing changes, Stripe changes, onboarding changes, or public route changes are introduced.

## Verification Plan

Run:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

Manual route smoke test:

```text
1. Start pnpm dev.
2. Sign in as the founder.
3. Open /founder/knowledge-console.
4. Confirm the shell renders, project filters update the static preview, and no network call is made to Obsidian.
```

## Risks And Mitigations

- Risk: duplicated knowledge stores between existing `nexus_pages`, Google Drive notes, AI memories, and future vault tables. Mitigation: treat vault tables as source-index records and keep AI memories for preferences/outcomes only.
- Risk: issue text asks for `workspace_id`, but current repo mandates `founder_id`. Mitigation: use `founder_id` in all table/API proposals.
- Risk: local Obsidian bridge becomes an attack surface. Mitigation: keep Phase 1 read-only, use Git/filesystem ingestion first, and never call local services from browser code.
- Risk: Markdown rendering can expose unsafe HTML. Mitigation: disable raw HTML or sanitise before rendering; Phase 1 shell uses trusted static text only.
- Risk: write-back corrupts vault files. Mitigation: later write-back must require founder approval, content hash checks, audit logs, and non-destructive patches.

## Implementation Phases

1. Phase 1: Read-only shell and docs. Add UI shell with static placeholders and no data access.
2. Phase 2: Founder-scoped schema migration proposal and tests. Add vault tables, RLS, indexes, and generated types.
3. Phase 3: Ingestion worker. Implement Git/filesystem sync bridge with Markdown/frontmatter parsing and content hashes.
4. Phase 4: Search and note preview API. Add founder-scoped search, note retrieval, source citations, and UI states.
5. Phase 5: Hermes/OpenAI actions. Add summarise, action extraction, Codex handoff generation, and project briefings.
6. Phase 6: Gated write-back. Add explicit founder approval, audit log, conflict detection, and patch strategy.

