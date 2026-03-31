-- Description: Create recommended_actions table for AI Marketing Advisor (SYN-585)
-- Author: Claude Code
-- Date: 2026-03-31
-- Linear: SYN-585
--
-- Sprint 5 build prerequisite: table created now so Sprint 5 inference can start immediately.
-- RLS: authenticated users read their own rows; service role full access.
-- Actions stored as flat columns (action_1_*, action_2_*, action_3_*) for typed queries.

BEGIN;

CREATE TABLE IF NOT EXISTS public.recommended_actions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  week_of               DATE NOT NULL,       -- Monday of target week

  -- Action 1
  action_1_headline     TEXT NOT NULL,       -- max 12 words
  action_1_detail       TEXT NOT NULL,       -- max 30 words
  action_1_confidence   TEXT NOT NULL CHECK (action_1_confidence IN ('High','Medium','Exploratory')),
  action_1_data_source  TEXT NOT NULL,       -- e.g. "Based on 4 months of performance data"
  action_1_tap_action   TEXT CHECK (action_1_tap_action IN ('approve_post','send_review_response','view_calendar') OR action_1_tap_action IS NULL),
  action_1_tap_payload  JSONB DEFAULT NULL,

  -- Action 2
  action_2_headline     TEXT NOT NULL,
  action_2_detail       TEXT NOT NULL,
  action_2_confidence   TEXT NOT NULL CHECK (action_2_confidence IN ('High','Medium','Exploratory')),
  action_2_data_source  TEXT NOT NULL,
  action_2_tap_action   TEXT CHECK (action_2_tap_action IN ('approve_post','send_review_response','view_calendar') OR action_2_tap_action IS NULL),
  action_2_tap_payload  JSONB DEFAULT NULL,

  -- Action 3
  action_3_headline     TEXT NOT NULL,
  action_3_detail       TEXT NOT NULL,
  action_3_confidence   TEXT NOT NULL CHECK (action_3_confidence IN ('High','Medium','Exploratory')),
  action_3_data_source  TEXT NOT NULL,
  action_3_tap_action   TEXT CHECK (action_3_tap_action IN ('approve_post','send_review_response','view_calendar') OR action_3_tap_action IS NULL),
  action_3_tap_payload  JSONB DEFAULT NULL,

  -- Inference metadata
  inference_cost_usd    FLOAT,
  model_used            TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
  data_streams_used     TEXT[] NOT NULL DEFAULT '{}',
  streams_available     INTEGER NOT NULL DEFAULT 0,
  skip_reason           TEXT DEFAULT NULL    -- populated if inference was skipped

  -- CONSTRAINT: unique row per user per week
  -- (upsert by user_id + week_of in inference job)
);

CREATE INDEX IF NOT EXISTS idx_rec_actions_user_week
  ON public.recommended_actions(user_id, week_of);

CREATE INDEX IF NOT EXISTS idx_rec_actions_week
  ON public.recommended_actions(week_of);

-- RLS
ALTER TABLE public.recommended_actions ENABLE ROW LEVEL SECURITY;

-- Service role: full access (inference engine)
CREATE POLICY "service_role_all_recommended_actions" ON public.recommended_actions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: read own rows only
CREATE POLICY "users_read_own_recommended_actions" ON public.recommended_actions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.recommended_actions IS
  'AI Marketing Advisor weekly recommendations (SYN-585). '
  'One row per user per week (week_of = Monday). '
  'Populated by nightly cron Monday 06:00 AEST. '
  'Sprint 5 build: nightly inference engine reads 6 data streams and calls Claude claude-haiku-4-5.';

COMMIT;
