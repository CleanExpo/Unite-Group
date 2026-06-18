-- ============================================================
-- Video Production Pipeline Schema — Phase 0 (Design → Build)
-- Links knowledge_notes → video_jobs → syntax_publish_queue
-- Date: 2026-06-03
-- Author: Pi-DEV-OPS
-- ============================================================

-- ─── 1. ENUMS ───────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE video_job_status AS ENUM (
    'draft',
    'scripting',
    'audio_pending',
    'assets_pending',
    'video_pending',
    'composing',
    'queued',
    'published',
    'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE publish_platform AS ENUM ('youtube', 'facebook', 'linkedin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE publish_status AS ENUM ('pending', 'publishing', 'published', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. video_jobs TABLE ────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  founder_id UUID NOT NULL DEFAULT auth.uid(),
  source_note_id UUID REFERENCES knowledge_notes(id) ON DELETE SET NULL,
  project_key TEXT NOT NULL DEFAULT 'nexus',

  -- State machine
  status video_job_status NOT NULL DEFAULT 'draft',

  -- Script layer
  script_text TEXT,
  script_json JSONB,        -- structured: sections, timestamps, visual cues
  script_approved BOOLEAN DEFAULT FALSE,

  -- Audio layer
  audio_provider TEXT DEFAULT 'elevenlabs',
  audio_url TEXT,
  voice_id TEXT,

  -- Asset layer
  asset_urls TEXT[],        -- array of image URLs (thumbnails + B-roll)
  thumbnail_url TEXT,

  -- Video layer
  heygen_video_id TEXT,
  heygen_status TEXT,
  raw_video_url TEXT,       -- HeyGen output before FFMPEG

  -- Composition layer
  final_video_url TEXT,     -- FFMPEG output with overlays/subs
  subtitles_json JSONB,     -- Whisper-generated or manual

  -- Publishing layer
  youtube_video_id TEXT,
  facebook_post_id TEXT,
  linkedin_post_id TEXT,
  published_at TIMESTAMPTZ,

  -- Cost tracking (cents)
  cost_cents INT DEFAULT 0,
  cost_breakdown JSONB DEFAULT '{}',

  -- Quality & meta
  title TEXT,
  description TEXT,
  tags TEXT[],
  target_duration_seconds INT DEFAULT 300,  -- 5 min default

  -- Error handling
  error_step TEXT,          -- which step failed
  error_message TEXT,
  retry_count INT DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_knowledge_note
    FOREIGN KEY (source_note_id)
    REFERENCES knowledge_notes(id)
    ON DELETE SET NULL
  -- NOTE: no FK on project_key. knowledge_projects is unique on (founder_id, key),
  -- not key alone, so REFERENCES knowledge_projects(key) fails (42830). project_key
  -- is a plain string ('nexus' default) used as a soft reference.
);

-- Indexes for performance
CREATE INDEX idx_video_jobs_founder ON video_jobs(founder_id);
CREATE INDEX idx_video_jobs_status ON video_jobs(status);
CREATE INDEX idx_video_jobs_project ON video_jobs(project_key);
CREATE INDEX idx_video_jobs_note ON video_jobs(source_note_id);
CREATE INDEX idx_video_jobs_created ON video_jobs(created_at DESC);

-- ─── 3. syntax_publish_queue TABLE ──────────────────────────

CREATE TABLE IF NOT EXISTS syntax_publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  video_job_id UUID NOT NULL REFERENCES video_jobs(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL DEFAULT auth.uid(),

  platform publish_platform NOT NULL,
  scheduled_for TIMESTAMPTZ,
  status publish_status NOT NULL DEFAULT 'pending',

  platform_post_id TEXT,    -- ID returned by YT/FB/LI after publish
  publish_response JSONB,   -- full API response

  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_publish_queue_job ON syntax_publish_queue(video_job_id);
CREATE INDEX idx_publish_queue_status ON syntax_publish_queue(status);
CREATE INDEX idx_publish_queue_scheduled ON syntax_publish_queue(scheduled_for);

-- ─── 4. UPDATE TRIGGER ──────────────────────────────────────

CREATE OR REPLACE FUNCTION update_video_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_video_jobs_updated_at ON video_jobs;
CREATE TRIGGER trg_video_jobs_updated_at
  BEFORE UPDATE ON video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_video_jobs_updated_at();

-- ─── 5. RLS POLICIES ────────────────────────────────────────

ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE syntax_publish_queue ENABLE ROW LEVEL SECURITY;

-- video_jobs: founder-scoped
CREATE POLICY video_jobs_select_own
  ON video_jobs FOR SELECT
  USING (founder_id = auth.uid());

CREATE POLICY video_jobs_insert_own
  ON video_jobs FOR INSERT
  WITH CHECK (founder_id = auth.uid());

CREATE POLICY video_jobs_update_own
  ON video_jobs FOR UPDATE
  USING (founder_id = auth.uid());

CREATE POLICY video_jobs_delete_own
  ON video_jobs FOR DELETE
  USING (founder_id = auth.uid());

-- syntax_publish_queue: founder-scoped via video_jobs
CREATE POLICY publish_queue_select_own
  ON syntax_publish_queue FOR SELECT
  USING (founder_id = auth.uid());

CREATE POLICY publish_queue_insert_own
  ON syntax_publish_queue FOR INSERT
  WITH CHECK (founder_id = auth.uid());

CREATE POLICY publish_queue_update_own
  ON syntax_publish_queue FOR UPDATE
  USING (founder_id = auth.uid());

-- ─── 6. HELPER: Get Pipeline Stats ──────────────────────────

CREATE OR REPLACE FUNCTION get_video_pipeline_stats(p_founder_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_jobs', COUNT(*),
    'by_status', jsonb_object_agg(status, cnt),
    'total_cost_cents', COALESCE(SUM(cost_cents), 0),
    'avg_cost_cents', COALESCE(AVG(cost_cents), 0)::INT,
    'published_this_week', COUNT(*) FILTER (WHERE status = 'published' AND published_at > NOW() - INTERVAL '7 days'),
    'failed_this_week', COUNT(*) FILTER (WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '7 days')
  )
  INTO result
  FROM video_jobs
  WHERE founder_id = p_founder_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ─── 7. BACKFILL: knowledge_notes.video_job_id (nullable, no data yet) ──

-- Add column only if not present
DO $$ BEGIN
  ALTER TABLE knowledge_notes ADD COLUMN video_job_id UUID;
  ALTER TABLE knowledge_notes ADD CONSTRAINT fk_knowledge_notes_video_job
    FOREIGN KEY (video_job_id) REFERENCES video_jobs(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
