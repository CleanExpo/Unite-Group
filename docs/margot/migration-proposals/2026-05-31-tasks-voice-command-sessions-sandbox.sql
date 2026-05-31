-- ============================================================================
-- SANDBOX-ONLY MIGRATION PROPOSAL
-- tasks & voice_command_sessions schema reconciliation
-- ============================================================================
--
-- Status: PROPOSAL — not applied anywhere yet.
--
-- This file is a sandbox-first migration proposal for the Unite-Group CRM
-- command-center task spine and Margot voice-task pipeline. It reconciles the
-- legacy project-management `tasks` table (database/schema.sql) with the
-- richer command-center shape expected by CRM routes and daily-digest readers.
--
-- INSTRUCTIONS:
--   1. Apply to sandbox first via scripts/sandbox-wizard.sh apply <file>
--      to validate DDL, indexes, and RLS policies in a disposable environment.
--   2. After successful sandbox validation, open a review PR with evidence.
--   3. Production promotion requires fresh Board approval — do NOT apply this
--      proposal to production without explicit sign-off from the Board.
--
-- SAFETY:
--   - All DDL is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--   - Additive-only changes: no table or column removals, no destructive operations.
--   - RLS policies are documented as comments; actual CREATE POLICY statements
--     must be authored and validated in sandbox before any production run.
-- ============================================================================

-- Ensure UUID primary key generation is available across Supabase/Postgres
-- versions used by sandbox validation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TABLE: public.tasks (command-center workspace-scoped tasks)
-- ============================================================================
-- This extends the legacy tasks table with workspace isolation, assignee
-- metadata, tags, ordering position, and obsidian_path for second-brain
-- integration. Additive columns preserve backward compatibility with existing
-- project-management usage.

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'blocked', 'in_progress', 'review', 'done', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'medium', 'high', 'urgent')),
  assignee_type TEXT,
  assignee_name TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  obsidian_path TEXT,
  obsidian_synced_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  project_id UUID,
  assigned_to UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Additive columns for route-required fields (safe if table already exists
-- with legacy schema from database/schema.sql). Sandbox validation must also
-- inspect any pre-existing status/priority CHECK constraints and NOT NULL
-- requirements before promotion: legacy `project_id` and `created_by` may still
-- be required, while CRM voice/digest routes create workspace-scoped tasks that
-- do not currently provide those legacy project/profile links. Any constraint
-- relaxation must be reviewed as a separate sandbox-tested change.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_type TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_name TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS obsidian_path TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS obsidian_synced_at TIMESTAMP WITH TIME ZONE;

-- Indexes for workspace-scoped queries, status/priority filtering, and
-- daily-digest recency ordering
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON public.tasks (workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON public.tasks (updated_at DESC);

-- Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Updated-at maintenance must be verified in sandbox too. Legacy
-- database/schema.sql defines an update trigger for tasks; if sandbox does not
-- already have it, add a reviewed trigger migration before relying on
-- `updated_at` as a freshness signal.

-- RLS POLICIES (sandbox-validation required before production):
-- All policies below must be created and tested in sandbox first.
-- Example (do not apply until validated):
--   CREATE POLICY tasks_workspace_read
--     ON public.tasks FOR SELECT
--     USING (
--       workspace_id = current_setting('request.jwt.claims', true)::jsonb->>'workspace_id'
--     );
--   CREATE POLICY tasks_service_role_all
--     ON public.tasks FOR ALL
--     USING (current_setting('role', true) = 'service_role');
-- These policies control access to tasks based on workspace_id scoping.
-- Validate in sandbox before prod to ensure no cross-workspace data leakage.


-- ============================================================================
-- TABLE: public.voice_command_sessions
-- ============================================================================
-- Records Margot voice-to-task pipeline sessions from the Pi-CEO endpoint.
-- Each session captures the raw transcript, parsed intent (JSON packet),
-- and an optional FK back to the task that was created.

CREATE TABLE IF NOT EXISTS public.voice_command_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  transcript TEXT NOT NULL,
  parsed_intent JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received',
  language_code TEXT DEFAULT 'en',
  created_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for org/user lookups and temporal ordering
CREATE INDEX IF NOT EXISTS idx_voice_command_sessions_org_id ON public.voice_command_sessions (org_id);
CREATE INDEX IF NOT EXISTS idx_voice_command_sessions_user_id ON public.voice_command_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_voice_command_sessions_created_at ON public.voice_command_sessions (created_at DESC);

-- Row Level Security
ALTER TABLE public.voice_command_sessions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (sandbox-validation required before production):
-- Policies for voice_command_sessions must be authored and tested in sandbox.
-- Example (do not apply until validated):
--   CREATE POLICY voice_sessions_org_read
--     ON public.voice_command_sessions FOR SELECT
--     USING (
--       org_id = current_setting('request.jwt.claims', true)::jsonb->>'org_id'
--     );
--   CREATE POLICY voice_sessions_service_role_all
--     ON public.voice_command_sessions FOR ALL
--     USING (current_setting('role', true) = 'service_role');
-- These policies ensure voice_command_sessions data is scoped by org_id and
-- user context. Validate in sandbox before prod to prevent cross-org leakage.

-- ============================================================================
-- END OF PROPOSAL
-- Next steps: apply via scripts/sandbox-wizard.sh, collect sandbox evidence,
-- then seek Board approval for production promotion.
-- ============================================================================
