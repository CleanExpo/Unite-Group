-- 20261019120000_cc_synthex_post_events.sql
--
-- FOUNDER-GATED (UNI-2348, Mission Control calendar). Append-only Synthex post
-- lifecycle events, one row per accepted witness event that carries a postId,
-- with or without a missionId. /founder/calendar folds them into each post's
-- latest state so the founder can read and approve every post.
--
-- Additive: one new table, no change to any existing table or row. The
-- receiver writes here only after its cc_agent_events row; until this is
-- applied it answers 201 with post: record_failed and the calendar says the
-- migration is not applied. Apply on a Supabase database branch first, then
-- prod via `supabase db push` after founder review — never autonomously.
--
-- Privacy: detail holds only the receiver's whitelisted fields (post text,
-- media/approve/post URLs, schedule, platform, business). Founder-scoped
-- reads; writes are service-role only. Not added to Realtime.
--
-- Rollback:
--   DROP TABLE IF EXISTS cc_synthex_post_events;

CREATE TABLE IF NOT EXISTS cc_synthex_post_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id     TEXT NOT NULL CHECK (char_length(post_id) BETWEEN 1 AND 128),
  -- Validated UUID from the sender; not an FK so a post outlives its mission.
  mission_id  UUID,
  event_type  TEXT NOT NULL CHECK (char_length(event_type) BETWEEN 1 AND 128),
  status      TEXT CHECK (status IN ('drafted', 'awaiting_approval', 'approved', 'scheduled', 'published', 'failed')),
  occurred_at TIMESTAMPTZ NOT NULL,
  detail      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE cc_synthex_post_events IS 'Append-only Synthex post lifecycle events for the Mission Control calendar (UNI-2348)';

CREATE INDEX IF NOT EXISTS cc_synthex_post_events_founder_occurred_idx
  ON cc_synthex_post_events (founder_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS cc_synthex_post_events_founder_post_idx
  ON cc_synthex_post_events (founder_id, post_id);

ALTER TABLE cc_synthex_post_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cc_synthex_post_events FORCE ROW LEVEL SECURITY;

-- Founder reads own rows; no client write policy (service role only).
-- Idempotent re-run: a fresh table has no policy, and CREATE POLICY has no IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cc_synthex_post_events' AND policyname = 'cc_synthex_post_events_select'
  ) THEN
    CREATE POLICY cc_synthex_post_events_select ON cc_synthex_post_events
      FOR SELECT USING (founder_id = auth.uid());
  END IF;
END $$;
