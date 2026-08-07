-- 20260807010000_founder_chat_threads.sql
--
-- UNI-2373 ship-readiness P6 — founder chat persistence.
-- One active thread per founder; refresh must not wipe /founder/chat.
-- Apply on a Supabase database branch first, then prod via `supabase db push`
-- after founder review — never applied autonomously (CLAUDE.md DB rule).

CREATE TABLE IF NOT EXISTS public.founder_chat_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_key  TEXT,
  messages      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT founder_chat_threads_messages_is_array
    CHECK (jsonb_typeof(messages) = 'array'),
  CONSTRAINT founder_chat_threads_business_key_len
    CHECK (business_key IS NULL OR char_length(business_key) <= 120)
);

COMMENT ON TABLE public.founder_chat_threads IS
  'Founder CRM chat lane persistence (UNI-2373 P6) — one thread per founder';

-- One active thread per founder (single CRM chat surface).
CREATE UNIQUE INDEX IF NOT EXISTS founder_chat_threads_founder_uidx
  ON public.founder_chat_threads (founder_id);

CREATE INDEX IF NOT EXISTS founder_chat_threads_updated_idx
  ON public.founder_chat_threads (founder_id, updated_at DESC);

ALTER TABLE public.founder_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_chat_threads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS founder_chat_threads_select ON public.founder_chat_threads;
CREATE POLICY founder_chat_threads_select ON public.founder_chat_threads
  FOR SELECT USING (founder_id = auth.uid());

DROP POLICY IF EXISTS founder_chat_threads_insert ON public.founder_chat_threads;
CREATE POLICY founder_chat_threads_insert ON public.founder_chat_threads
  FOR INSERT WITH CHECK (founder_id = auth.uid());

DROP POLICY IF EXISTS founder_chat_threads_update ON public.founder_chat_threads;
CREATE POLICY founder_chat_threads_update ON public.founder_chat_threads
  FOR UPDATE
  USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());

DROP POLICY IF EXISTS founder_chat_threads_delete ON public.founder_chat_threads;
CREATE POLICY founder_chat_threads_delete ON public.founder_chat_threads
  FOR DELETE USING (founder_id = auth.uid());
