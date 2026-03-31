-- Description: Create geo_citation_events table for GEO Citation Baseline Monitor (dark run)
-- Author: Claude Code
-- Date: 2026-03-31
-- Linear: SYN-584
--
-- Sprint 4 dark run: service role only. No client access until Sprint 6 panel ships.
-- Phase 2 (Sprint 6): add ChatGPT Browse + Perplexity engines + client-facing panel.

BEGIN;

CREATE TABLE IF NOT EXISTS public.geo_citation_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  query_text        TEXT NOT NULL,
  search_engine     TEXT NOT NULL CHECK (search_engine IN ('google_ai_overview', 'chatgpt', 'perplexity')),
  query_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  brand_mentioned   BOOLEAN NOT NULL DEFAULT FALSE,
  raw_snippet       TEXT,        -- truncated to 500 chars
  mention_position  INTEGER,     -- ordinal position in results if detected
  query_variant     INTEGER NOT NULL CHECK (query_variant IN (1, 2, 3)),
  error_reason      TEXT,        -- populated if query failed
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_geo_citation_user_date
  ON public.geo_citation_events(user_id, query_date);

CREATE INDEX IF NOT EXISTS idx_geo_citation_engine
  ON public.geo_citation_events(search_engine);

CREATE INDEX IF NOT EXISTS idx_geo_citation_mentioned
  ON public.geo_citation_events(brand_mentioned)
  WHERE brand_mentioned = TRUE;

-- RLS: Sprint 4 — service role only. No authenticated user policy until Sprint 6.
ALTER TABLE public.geo_citation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_geo_citations" ON public.geo_citation_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny all other access in Sprint 4 (explicit deny-all for authenticated users)
-- Sprint 6: add SELECT policy for users to read their own rows:
-- CREATE POLICY "users_read_own_citations" ON public.geo_citation_events
--   FOR SELECT TO authenticated
--   USING (user_id = auth.uid());

COMMENT ON TABLE public.geo_citation_events IS
  'GEO Citation Baseline Monitor (SYN-584). Dark run Sprint 4 — service role only. '
  'Tracks business brand mentions in Google AI Overview results. '
  'Client-facing panel ships Sprint 6.';

COMMIT;
