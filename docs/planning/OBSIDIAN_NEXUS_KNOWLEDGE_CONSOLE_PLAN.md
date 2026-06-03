# OBSIDIAN_NEXUS_KNOWLEDGE_CONSOLE_PLAN.md

> Issue #74 — Codex: Design and plan Obsidian-powered Nexus Knowledge Command Center WebUI
> Repo-grounded design report for CleanExpo/Unite-Hub
> Date: 2026-06-03
> Author: Hermes Agent / Pi-CEO Board

---

## 1. Repo Findings

### 1.1 App Router Structure

```
src/app/(auth)/           ← Auth pages (login, reset, callback)
src/app/(founder)/        ← Founder dashboard (auth-guarded, iconSidebar)
src/app/(founder)/founder/
  ├── dashboard           ← KPI overview
  ├── kanban              ← Hermes Kanban board (connects to Linear)
  ├── knowledge-console   ← STATIC MOCK — hardcoded project cards 🔴
  ├── vault               ← Credentials vault (secrets/passwords) ⚠️
  ├── notes               ← Notes page (separate from knowledge)
  ├── skills              ← Skill management
  ├── strategy            ← Strategic planning
  ├── campaigns           ← Marketing campaigns
  ├── analytics           ← Data analytics
  ├── boardroom           ← Advisory/Governance
  └── ... (many more)
src/app/api/              ← API routes
  ├── vault/entries       ← Credentials vault API (POST/GET encrypted secrets)
  ├── hermes/kanban       ← Hermes Kanban sync + Linear integration
  ├── notes/content       ← Notes CRUD (separate table)
  ├── search              ← Unified search across nexus_pages, contacts, etc.
  └── ... (50+ routes)
```

### 1.2 Critical Discovery: Knowledge Console is a Static Mock

The existing `/founder/knowledge-console` page (`KnowledgeConsoleClient.tsx`) is a **UI shell with hardcoded data**:

```typescript
const PROJECTS: KnowledgeProject[] = [
  { key: 'restoreassist', label: 'RestoreAssist', path: '/02-Projects/RestoreAssist', status: 'mapped', notes: 42, tags: [...] },
  { key: 'synthex', label: 'Synthex', path: '/02-Projects/Synthex', status: 'watching', notes: 35, tags: [...] },
  // ... 4 more hardcoded projects
]
```

**It does NOT:**
- Connect to any database
- Read from the Obsidian vault
- Search across notes
- Display real note metadata

The page even includes a hardcoded markdown excerpt explaining Phase 1 should be disconnected.

### 1.3 Existing Database Tables Relevant to Knowledge

| Table | Purpose | Relation to Knowledge Console |
|-------|---------|------------------------------|
| `nexus_pages` | Notion-style block editor documents | Can be extended as knowledge pages |
| `nexus_databases` | Database views for nexus_pages | Could be used for note collections |
| `nexus_rows` | Row data for databases | Not directly applicable yet |
| `notes` | (implied from API) | Separate from knowledge vault |
| `credentials_vault` | Encrypted secrets store | **Not for knowledge** — different domain |
| `ai_generated_content` | AI output storage | Could store summaries/extractions |
| `agent_executions`, `agent_runs` | Agent telemetry | Could link to knowledge operations |

### 1.4 Authentication & Authorization

- **Pattern**: Single-tenant, `founder_id = auth.uid()` on all tables
- **RLS**: All 9 core tables have SELECT/INSERT/UPDATE/DELETE policies scoped to `founder_id`
- **Middleware**: Supabase SSR with cookie-based sessions
- **Role model**: Currently just `founder_id` — no complex RBAC for knowledge

### 1.5 Existing Patterns to Follow

| Pattern | Location | Follow for Knowledge Console |
|---------|----------|------------------------------|
| Server component auth | `src/lib/supabase/server.ts` | ✅ Use `getUser()` + `createClient()` |
| Force-dynamic pages | All founder pages | ✅ `export const dynamic = 'force-dynamic'` |
| Error + loading states | `error.tsx`, `loading.tsx` | ✅ Replicate pattern |
| API route auth | `src/app/api/.../route.ts` | ✅ Same RLS pattern |
| Component organization | `src/components/founder/` | ✅ `src/components/founder/knowledge-console/` |
| PageHeader usage | `PageHeader` component | ✅ Consistent headers |
| Tailwind + CSS vars | `globals.css` | ✅ `--surface-card`, `--color-border`, etc. |

---

## 2. Problem Statement (Repo-Grounded)

**The Knowledge Console exists as a UI shell but has no data layer.**

There are TWO separate "vault" concepts in the codebase:
1. **Credentials Vault** (`/api/vault/*`, `credentials_vault` table) — stores encrypted API keys, passwords
2. **Knowledge Vault** (`/founder/knowledge-console`, no table) — shows project knowledge (static mock)

This creates:
- **Naming confusion**: "vault" means secrets, not knowledge
- **No persistence**: Knowledge console has no database backing
- **No search**: Cannot search across project notes
- **No sync**: No way to ingest Obsidian vault content
- **No AI integration**: Cannot ask Hermes about notes

---

## 3. Recommended Module Structure

### 3.1 Rename for Clarity

**Current confusion:**
- `/api/vault/entries` → credentials/secrets
- `/founder/vault` → credentials UI
- `/founder/knowledge-console` → knowledge (static mock)

**Recommended:** Keep `vault` for credentials, use `knowledge` for the new domain.

### 3.2 Route Structure

```
# Phase 1: Read-Only Knowledge Console (MVP)
/founder/knowledge-console/          ← Overhaul existing page with real data
/founder/knowledge-console/projects  ← Project-filtered view
/founder/knowledge/search            ← Full-text search results

# Phase 1b: API Layer
/api/knowledge/notes                 ← CRUD for knowledge notes
/api/knowledge/search                ← Full-text + semantic search
/api/knowledge/projects              ← Project metadata
/api/knowledge/ingest                ← Obsidian ingestion webhook

# Phase 2: Project-scoped knowledge
/founder/[businessKey]/knowledge     ← Per-project knowledge

# Phase 3: Write-back (gated)
/api/knowledge/notes/[id]/edit       ← Controlled write-back
```

### 3.3 Component Structure

```
src/components/founder/knowledge-console/
  KnowledgeConsoleClient.tsx        ← Refactor existing (currently static)
  KnowledgeNoteViewer.tsx           ← Markdown preview with frontmatter
  KnowledgeNoteList.tsx             ← Filterable note list
  KnowledgeSearchBar.tsx            ← Search input
  KnowledgeProjectNav.tsx           ← Project sidebar
  KnowledgeEmptyState.tsx           ← No notes / loading / error
  KnowledgeNoteCard.tsx             ← Individual note preview card
  KnowledgeActionMenu.tsx           ← "Ask Hermes", "Summarize", etc.

src/components/founder/vault/       ← Leave credentials vault alone
```

---

## 4. Proposed Supabase Schema (Additive Only)

### 4.1 New Tables

```sql
-- ============================================================
-- KNOWLEDGE NOTES (mirrors Obsidian vault notes)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_key     TEXT NOT NULL,                     -- 'restoreassist', 'nexus', etc.
  vault_path      TEXT NOT NULL,                     -- e.g. '/02-Projects/RestoreAssist/ai-claim-scribe.md'
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL GENERATED ALWAYS AS (LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'))) STORED,
  content         TEXT NOT NULL DEFAULT '',          -- Full markdown content
  content_html    TEXT,                              -- Cached HTML render
  word_count      INTEGER NOT NULL DEFAULT 0,
  note_type       TEXT NOT NULL DEFAULT 'concept'
                  CHECK (note_type IN ('concept', 'entity', 'research', 'runbook', 'project', 'writing', 'meta')),
  tags            TEXT[] NOT NULL DEFAULT '{}',
  frontmatter     JSONB NOT NULL DEFAULT '{}',       -- Parsed YAML frontmatter
  sources         JSONB NOT NULL DEFAULT '[]',       -- Array of {title, url}
  confidence      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (confidence IN ('high', 'medium', 'low')),
  quality         TEXT NOT NULL DEFAULT 'draft'
                  CHECK (quality IN ('draft', 'polished', 'published')),
  ai_optimized    BOOLEAN NOT NULL DEFAULT FALSE,
  obsidian_source TEXT,                              -- Absolute path to .md file
  obsidian_mtime  TIMESTAMPTZ,                       -- Last modified in Obsidian
  ingestion_batch UUID REFERENCES knowledge_batches(id) ON DELETE SET NULL,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,    -- Soft delete
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX knowledge_notes_vault_path_idx ON knowledge_notes(founder_id, vault_path) WHERE is_deleted = FALSE;
CREATE INDEX knowledge_notes_project_idx ON knowledge_notes(founder_id, project_key) WHERE is_deleted = FALSE;
CREATE INDEX knowledge_notes_tags_idx ON knowledge_notes USING GIN(tags);
CREATE INDEX knowledge_notes_search_idx ON knowledge_notes USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- ============================================================
-- KNOWLEDGE BATCHES (ingestion runs)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_batches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type     TEXT NOT NULL DEFAULT 'git'
                  CHECK (source_type IN ('git', 'manual', 'api', 'obsidian_plugin')),
  source_path     TEXT,                              -- e.g. git repo path, Obsidian vault path
  stats           JSONB NOT NULL DEFAULT '{}',       -- { files_processed, files_added, files_updated, errors }
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ============================================================
-- KNOWLEDGE CHUNKS (for RAG / embeddings)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id         UUID NOT NULL REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  founder_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  chunk_text      TEXT NOT NULL,
  token_count     INTEGER,
  embedding       VECTOR(1536),                      -- OpenAI text-embedding-3-small
  metadata        JSONB NOT NULL DEFAULT '{}',       -- { heading, section, char_start, char_end }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX knowledge_chunks_note_idx ON knowledge_chunks(note_id);
CREATE INDEX knowledge_chunks_embedding_idx ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);

-- ============================================================
-- KNOWLEDGE LINKS (wikilinks between notes)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_note_id  UUID NOT NULL REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  target_note_id  UUID REFERENCES knowledge_notes(id) ON DELETE SET NULL,
  target_path     TEXT NOT NULL,                     -- The unresolved wikilink text
  is_broken       BOOLEAN NOT NULL DEFAULT FALSE,    -- Target doesn't exist yet
  link_type       TEXT NOT NULL DEFAULT 'mention'
                  CHECK (link_type IN ('mention', 'alias', 'embedded')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX knowledge_links_source_idx ON knowledge_links(source_note_id);
CREATE INDEX knowledge_links_target_idx ON knowledge_links(target_note_id) WHERE target_note_id IS NOT NULL;

-- ============================================================
-- KNOWLEDGE PROJECTS (canonical project registry)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,                     -- 'restoreassist', 'nexus', etc.
  label           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'watching', 'planned', 'archived')),
  note_count      INTEGER NOT NULL DEFAULT 0,
  last_ingested_at TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(founder_id, key)
);
```

### 4.2 RLS Policies

```sql
-- Enable RLS
ALTER TABLE knowledge_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_projects ENABLE ROW LEVEL SECURITY;

-- founder_id = auth.uid() pattern (matches existing conventions)
CREATE POLICY knowledge_notes_select ON knowledge_notes FOR SELECT USING (founder_id = auth.uid());
CREATE POLICY knowledge_notes_insert ON knowledge_notes FOR INSERT WITH CHECK (founder_id = auth.uid());
CREATE POLICY knowledge_notes_update ON knowledge_notes FOR UPDATE USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());

-- Same pattern for all knowledge_* tables
CREATE POLICY knowledge_projects_select ON knowledge_projects FOR SELECT USING (founder_id = auth.uid());
-- ... (replicate for all tables + CRUD operations)
```

### 4.3 Triggers

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_notes_updated_at BEFORE UPDATE ON knowledge_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER knowledge_projects_updated_at BEFORE UPDATE ON knowledge_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. Data Ingestion Strategy

### 5.1 Recommended: Option A (Git/Filesystem Sync Bridge)

```
Obsidian Vault (C:/Users/.../Documents/Obsidian Vault/)
           |
           | Git commit (or file watcher)
           v
    Git Repository (CleanExpo/unite-group-vault)
           |
           | GitHub Actions / Cron job
           v
    Ingestion Worker (Next.js API route / Edge Function)
           |
           | Parse markdown, extract frontmatter, chunk, embed
           v
    Supabase (knowledge_notes, knowledge_chunks, pgvector)
           |
           v
    Unite-Hub Knowledge Console (read-only)
```

### 5.2 Ingestion Pipeline Steps

1. **Git pull** from vault repo
2. **Walk markdown files** recursively
3. **Parse frontmatter** (YAML → JSONB)
4. **Extract wikilinks** (`[[Note Name]]`)
5. **Chunk content** (~500 tokens per chunk, split on headers)
6. **Generate embeddings** (OpenAI text-embedding-3-small, $0.02/1M tokens)
7. **Upsert to Supabase** (upsert on `vault_path` to handle updates)
8. **Update project stats** (note count, last_ingested_at)
9. **Log batch** (knowledge_batches)

### 5.3 Alternative: Option C (Obsidian URI)

```
obsidian://open?vault=Unite-Group-Vault&file=02-Projects/RestoreAssist/ai-claim-scribe
```

Use as convenience deep-link in the UI. Not a sync mechanism.

### 5.4 Rejected: Option B (Local Plugin Bridge)

Not recommended without security review. Would expose local API that could be accessed by malicious pages.

---

## 6. Hermes / OpenAI Integration Design

### 6.1 Capabilities (Planned, Not Immediate Build)

| Capability | Input | Output | Agent |
|------------|-------|--------|-------|
| Summarize note | note_id | TL;DR + key points | Pi-BRIEF |
| Extract action items | note_id | Structured todos | Pi-PLANNER |
| Ask about project | project_key + question | Contextual answer | Pi-RESEARCH |
| Generate handoff | note_ids[] | Markdown brief | Pi-HANDOFF |
| Search semantic | query + project_filter | Relevant chunks | Pi-SEARCH |
| Create briefing | date range + project | Daily digest | Pi-BRIEF |
| Classify note | content + project list | Best project match | Pi-CLASSIFY |

### 6.2 RAG Architecture

```
User Query → Embed (OpenAI) → Vector Search (pgvector) → Re-rank → LLM Answer
                ↓
          knowledge_chunks.embedding (cosine similarity)
                ↓
       Top K chunks + system prompt + user query → GPT-5.x
```

### 6.3 API Design

```
POST /api/knowledge/query
{
  "query": "How does RestoreAssist handle moisture mapping?",
  "project_key": "restoreassist",
  "mode": "rag" | "summarize" | "extract_actions"
}
```

### 6.4 Cost Controls

- Max tokens per query: 4K
- Max chunks retrieved: 5
- Cache embeddings (only re-embed on file change)
- Use `gpt-5.5` for simple tasks, `gpt-5` for complex reasoning
- Track usage in `agent_executions` table (already exists)

---

## 7. Phase Plan

### Phase 1: Read-Only MVP (Week 1-2)

**Goal**: Knowledge Console displays real notes from Supabase

- [ ] Create migration: `knowledge_notes`, `knowledge_projects`, `knowledge_batches`
- [ ] Create API: `GET /api/knowledge/notes`, `GET /api/knowledge/projects`
- [ ] Create API: `GET /api/knowledge/notes/[id]` (full note with content)
- [ ] Refactor `KnowledgeConsoleClient.tsx` to fetch real data
- [ ] Build `KnowledgeNoteViewer` component (markdown preview)
- [ ] Build `KnowledgeNoteList` with project + tag filters
- [ ] Wire up search (full-text on title/content for now)
- [ ] Empty/loading/error states
- [ ] Add RLS policies
- [ ] Seed initial projects from existing `PROJECTS` array
- [ ] Run validation: lint, type-check, test, build

**Outcomes:**
- `/knowledge-console` shows real data
- Can browse notes by project
- Can search across notes
- No Obsidian sync yet (seed manually or via script)

### Phase 2: Ingestion Pipeline (Week 3-4)

**Goal**: Automated vault → Supabase sync

- [ ] Create ingestion script: `scripts/ingest-vault.ts`
- [ ] Parse markdown + frontmatter
- [ ] Extract wikilinks
- [ ] Upsert to `knowledge_notes`
- [ ] Create `knowledge_links` entries
- [ ] Build cron API: `POST /api/cron/knowledge-ingest`
- [ ] GitHub Action for vault repo → webhook → ingest
- [ ] Add Obsidian URI deep-link buttons
- [ ] Build batch history UI

**Outcomes:**
- Obsidian changes appear in Knowledge Console within minutes
- Broken links detected automatically
- Ingestion history visible

### Phase 3: AI Integration (Week 5-6)

**Goal**: Hermes can reason over the knowledge base

- [ ] Create `knowledge_chunks` table (migrate)
- [ ] Build chunking + embedding pipeline
- [ ] Create `POST /api/knowledge/query` endpoint
- [ ] Build "Ask Hermes" UI component
- [ ] Add "Summarize" button to note viewer
- [ ] Add "Extract Actions" button
- [ ] Track agent usage in `agent_executions`

**Outcomes:**
- Ask questions about your knowledge
- Get summaries of notes
- Extract action items automatically

### Phase 4: Write-Back (TBD, Gated)

**Goal**: Controlled note creation/editing from Nexus

Requirements before building:
- [ ] Audit trail table
- [ ] Conflict detection (Obsidian mtime vs Supabase updated_at)
- [ ] User approval flow for every write
- [ ] Non-destructive patch strategy
- [ ] Rollback capability

**Not in scope for Phase 1-3.**

---

## 8. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Confusion between credentials vault and knowledge vault | High | Clear naming (`knowledge_*` tables, keep `vault` for credentials, rename UI labels) |
| Embedding costs at scale | Medium | Cache embeddings, only re-embed changed files, chunk size optimization, use `text-embedding-3-small` |
| Large vault ingestion time | Medium | Batch processing, async ingestion, progress tracking, incremental updates |
| Obsidian ↔ Nexus sync conflicts | High | **Phase 1 is read-only**, Phase 2 is append-only, Phase 4 requires explicit approval |
| RLS misconfiguration | Critical | Test with `anon` key, verify every table has policies, use existing pattern |
| Search performance with large vaults | Medium | GIN index + full-text search initially, consider pgvector for semantic search later |
| Credential vault name collision | High | Keep `credentials_vault` as-is, create NEW `knowledge_notes` table — no naming overlap |

---

## 9. Validation Plan

### Gate 1: Schema Review (Pi-CEO Board)
- Review migration SQL
- Verify no destructive changes
- Confirm RLS policies

### Gate 2: API Contract Review
- Review `/api/knowledge/*` endpoints
- Verify auth guards
- Check error handling

### Gate 3: UI Review
- Verify read-only (Phase 1)
- Check responsive layout
- Confirm no secrets in UI

### Gate 4: Build Gates
```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

### Gate 5: Integration Test
- Run ingestion script on test vault
- Verify notes appear in UI
- Check search returns correct results
- Verify RLS blocks cross-user access

---

## 10. Implementation Checklist (Phase 1 Ready)

- [ ] 1. Create migration file: `supabase/migrations/20260603000000_knowledge_schema.sql`
- [ ] 2. Generate types: `npx supabase gen types` → update `src/types/database.ts`
- [ ] 3. Create API routes: `GET /api/knowledge/notes`, `/api/knowledge/projects`
- [ ] 4. Update `KnowledgeConsoleClient.tsx` → fetch real data
- [ ] 5. Build note viewer components
- [ ] 6. Add search (full-text)
- [ ] 7. Seed `knowledge_projects` table
- [ ] 8. Run build gates
- [ ] 9. Manual QA
- [ ] 10. Pi-CEO Board review & approve

---

## 11. File Locations for New Work

| Type | Path |
|------|------|
| Migration | `supabase/migrations/20260603000000_knowledge_schema.sql` |
| Types | `src/types/database.ts` (regenerate) |
| API | `src/app/api/knowledge/notes/route.ts` |
| API | `src/app/api/knowledge/projects/route.ts` |
| API | `src/app/api/knowledge/notes/[id]/route.ts` |
| Components | `src/components/founder/knowledge-console/*.tsx` |
| Page | `src/app/(founder)/founder/knowledge-console/page.tsx` (update) |
| Scripts | `scripts/ingest-vault.ts` |
| Tests | `src/components/founder/knowledge-console/__tests__/*.test.tsx` |
| Plan | `docs/planning/OBSIDIAN_NEXUS_KNOWLEDGE_CONSOLE_PLAN.md` (this file) |

---

## 12. Related Issues & PRs

- [ ] #74 — This issue (planning)
- [ ] — Phase 1 implementation PR (TBD)
- [ ] — Phase 2 ingestion PR (TBD)
- [ ] — Phase 3 AI integration PR (TBD)

---

## 13. Appendix: Existing Credentials Vault (DO NOT TOUCH)

**Path**: `src/app/api/vault/entries/route.ts`
**Table**: `credentials_vault`
**Purpose**: Encrypted secret storage (AES-256-GCM)
**Status**: Leave untouched — completely separate domain

The credentials vault should be renamed to `secrets` or `credentials` in a future cleanup to avoid confusion, but that is OUT OF SCOPE for this issue.

---

> **Next Action**: Awaiting Pi-CEO Board approval before Phase 1 implementation begins.
