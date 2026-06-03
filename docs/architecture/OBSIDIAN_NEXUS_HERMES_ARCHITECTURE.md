# Obsidian Nexus Hermes Architecture

Date: 03/06/2026
Status: proposed architecture for a read-only first release

## Architecture Decision

Unite-Hub should not clone or embed Obsidian. The correct architecture is:

```text
Obsidian Vault
  -> Git/filesystem sync bridge
  -> Markdown/frontmatter parser
  -> Supabase founder-scoped vault tables
  -> Nexus Knowledge Console
  -> Hermes/OpenAI actions with source citations
```

Decision: use Option A, Git/filesystem sync bridge, as the production ingestion default. Add Obsidian URI links as a convenience feature. Defer local Obsidian plugin bridge and write-back until a later security-reviewed phase.

## Repo Integration Map

- Web route: `src/app/(founder)/founder/knowledge-console/page.tsx`.
- Shell: `src/components/layout/FounderShell.tsx`.
- Sidebar registry: `src/components/layout/SidebarNav.tsx`.
- Command palette registry: `src/components/layout/CommandBar.tsx`.
- Topbar registry: `src/components/layout/Topbar.tsx`.
- Server auth helper: `src/lib/supabase/server.ts`.
- API route rules: `src/app/api/CLAUDE.md`.
- Founder RLS pattern: `supabase/migrations/20260309000001_rls_policies.sql`.
- AI memory reference: `supabase/migrations/20260325000000_ai_memories.sql` and `src/lib/ai/features/memory-store.ts`.
- RAG reference only: `supabase/supabase/migrations/00000000000009_rag_pipeline.sql`.

## Data Boundaries

### Obsidian

Owns local editing, Markdown files, links, folders, and daily notes. It remains local-first and can be Git-backed.

### Sync Bridge

Owns controlled ingestion. It reads trusted vault files, calculates content hashes, extracts frontmatter, chunks notes, and upserts founder-scoped records. It does not serve browser requests and does not accept public traffic.

### Supabase

Owns durable records, RLS, metadata, chunks, embeddings, action records, and handoff records. Every record that contains vault knowledge must carry `founder_id`.

### Nexus WebUI

Owns inspection, filtering, preview, project grouping, and triggering future safe actions. It does not touch local filesystem or local Obsidian plugin endpoints.

### Hermes

Owns orchestration and operational handoffs. Hermes may receive selected note context from server-side APIs and must cite source paths in outputs.

### OpenAI/AI Layer

Owns summarisation, classification, embeddings, RAG, extraction, and drafting. It is not the durable system of record.

## Data Model

The future schema should be additive and founder-scoped:

```sql
vaults(founder_id, name, vault_key, source_type, read_only)
vault_files(founder_id, vault_id, project_id, path, content_hash, sync_status)
vault_note_chunks(founder_id, vault_file_id, project_id, chunk_index, heading_path, content_hash, content)
vault_links(founder_id, vault_file_id, target_path, link_type, resolved_vault_file_id)
vault_tags(founder_id, vault_file_id, tag, source)
vault_frontmatter(founder_id, vault_file_id, key, value_json)
vault_embeddings(founder_id, vault_note_chunk_id, model, embedding, content_hash)
note_project_links(founder_id, vault_file_id, project_key, confidence, source)
agent_handoffs(founder_id, vault_file_id, agent_key, handoff_type, status, payload)
note_action_items(founder_id, vault_file_id, project_key, title, status, source_quote)
```

RLS policy shape:

```sql
ALTER TABLE vault_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY vault_files_founder_access
  ON vault_files
  FOR ALL
  TO authenticated
  USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());
```

Service role policies may be added for ingestion jobs, but route handlers must still perform explicit founder scoping.

## Ingestion Contract

Each ingestion run should:

1. Resolve the trusted vault source from server configuration.
2. Read Markdown files from an allowed root only.
3. Extract YAML frontmatter.
4. Normalise note paths and reject path traversal.
5. Calculate file content hashes.
6. Upsert `vault_files`.
7. Extract links, tags, and frontmatter rows.
8. Chunk by heading structure.
9. Upsert chunks by `(founder_id, vault_file_id, chunk_index, content_hash)`.
10. Mark deleted/missing files as archived rather than hard deleting.

Write-back is excluded from this contract.

## Read-Only UI Contract

The Knowledge Console UI can read:

- Project group list.
- Vault file list.
- Selected note preview.
- Frontmatter.
- Tags.
- Linked note graph summary.
- Sync state.
- Future action readiness.

The UI must not:

- Call a local Obsidian API.
- Accept arbitrary file paths.
- Write Markdown.
- Create action items without approval.
- Send all vault content to an AI model by default.

## Hermes And OpenAI Flow

Future "Ask Hermes" flow:

```text
Founder selects project or note
  -> server verifies session
  -> query vault_files/vault_note_chunks with founder_id
  -> retrieve bounded source chunks
  -> call AI/Hermes capability with source paths
  -> return answer with citations
  -> optionally persist agent_handoff or note_action_items after approval
```

Required controls:

- Token budget and chunk count limit per request.
- Project-scoped retrieval by default.
- Source path and heading citation on every answer.
- No background write-back.
- Audit record for generated handoffs and action extraction.

## Obsidian URI Links

URI links should be generated from persisted vault metadata:

```text
obsidian://open?vault=<encoded vault name>&file=<encoded note path>
```

The UI should show "Open in Obsidian" only when:

- The vault record has an allowed vault display name.
- The file path came from ingestion, not user input.
- The link is rendered as a client-side navigation convenience.

## Future Write-Back Gate

Write-back can be considered only after read-only ingestion is proven. It must include:

- Explicit founder approval per action.
- Audit log.
- Current content hash precondition.
- Conflict detection.
- Non-destructive patch strategy.
- Dry-run diff preview.
- Rollback plan.
- Permission check by `founder_id`.

## Operational Verification

Before enabling real ingestion:

- Unit test Markdown/frontmatter parser.
- Unit test path normalisation and traversal rejection.
- Unit test RLS policies for founder isolation.
- Integration test search API with two founders.
- Smoke test `/founder/knowledge-console`.
- Verify no client request targets localhost Obsidian endpoints.
- Run `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm build`.

## Open Follow-Ups

- Decide whether `project_id` should reference `connected_projects.id` or use stable `project_key` first.
- Decide whether to migrate the old RAG prototype into the active `supabase/migrations` tree or keep vault-specific tables separate.
- Define the exact vault folder taxonomy with Phill before ingestion.
- Choose embedding model and dimension only when the OpenAI layer is wired.
- Add visual QA after the shell is reviewed.

