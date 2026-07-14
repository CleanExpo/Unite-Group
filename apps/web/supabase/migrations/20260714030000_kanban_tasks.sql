-- Own editable Kanban board (WS2 P3).
--
-- Backs types/kanban.ts with a real table so the founder board is
-- editable/persisted — not a read-only Linear projection. founder_id-scoped
-- (single-tenant; NOT the type's legacy workspace_id, per the hard rule), RLS
-- forced. A card can link to a captured message / Margot draft (WS2). Ordering
-- uses a float `position` for O(1) fractional-index moves. Validate on a
-- Supabase DB branch; never prod-autonomous.

CREATE TABLE IF NOT EXISTS public.kanban_task (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'todo'
                      CHECK (status IN ('todo', 'in-progress', 'blocked', 'done')),
  priority          TEXT NOT NULL DEFAULT 'medium'
                      CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_type     TEXT NOT NULL DEFAULT 'self'
                      CHECK (assignee_type IN ('self', 'agent', 'staff', 'client')),
  assignee_id       TEXT,
  assignee_name     TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  due_date          DATE,
  position          DOUBLE PRECISION NOT NULL DEFAULT 1000,
  business_key      TEXT,
  source_message_id UUID,
  source_draft_id   UUID,
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kanban_task_founder_status_pos_idx
  ON public.kanban_task (founder_id, status, position);

ALTER TABLE public.kanban_task ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_task FORCE ROW LEVEL SECURITY;
CREATE POLICY kanban_task_founder_all ON public.kanban_task
  FOR ALL USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());
