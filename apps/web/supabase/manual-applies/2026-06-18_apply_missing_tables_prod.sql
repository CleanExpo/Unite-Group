-- ============================================================================
-- MANUAL PROD APPLY — apps/web missing tables (curated, idempotent)
-- Target: prod lksfwktwtmyznckodsau  ·  Date: 18/06/2026  ·  en-AU
--
-- WHY THIS FILE EXISTS
-- The Supabase branch-promote workflow is broken for this project (prod's 96-entry
-- migration history fails to replay at migration ~13). So schema must be applied as
-- DIRECT DDL to prod. This script is the curated, prod-safe form of the 9-file
-- runbook in docs/SCHEMA-AUDIT-2026-06-18.md §3.
--
-- IT DELIBERATELY EXCLUDES objects that ALREADY EXIST or CONFLICT on prod (verified 18/06/2026):
--   • team_members  (already exists — only board_meetings/notes/ceo_decisions here)
--   • campaigns + campaign_assets (§3 — MOVED to the campaigns reconciliation: prod's
--                    legacy campaigns is workspace-scoped, same conflict as drip)
--   • drip_*        (BLOCKED §8 — prod's legacy drip_campaigns lacks founder_id, so the
--                    repo's composite-key drip model is incompatible; needs reconciliation)
--
-- CREATES 10 tables: user_settings, brand_profiles, email_triage_results, ai_memories,
-- board_meetings, board_meeting_notes, ceo_decisions, video_jobs, syntax_publish_queue,
-- weekly_reviews.  (campaigns/campaign_assets → campaigns_reconciliation.sql; drip → §8)
--
-- SAFE TO RE-RUN: every object is guarded (IF NOT EXISTS / DROP POLICY IF EXISTS /
-- guarded constraints + triggers). It only CREATES; it never DROPs prod data or
-- prod's existing policies. Review before running. A final SELECT verifies results.
-- ============================================================================

BEGIN;

-- ── Preamble: dependencies (defensive; CREATE OR REPLACE / IF NOT EXISTS) ──────
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Shared trigger fn used by user_settings + drip_* (defensive — likely already present)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. user_settings
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text DEFAULT 'Australia/Sydney',
  locale text DEFAULT 'en-AU',
  notification_digest boolean DEFAULT true,
  notification_alerts boolean DEFAULT true,
  notification_cases boolean DEFAULT true,
  google_drive_vault_folder_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own settings" ON public.user_settings;
CREATE POLICY "Users can read own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role full access" ON public.user_settings;
CREATE POLICY "Service role full access" ON public.user_settings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS user_settings_updated_at ON public.user_settings;
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ════════════════════════════════════════════════════════════════════════════
-- 2. brand_profiles
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_key TEXT NULL,
  client_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  logo_url TEXT NULL,
  colours JSONB NOT NULL DEFAULT '{"primary":"#000000","secondary":"#ffffff","accent":"#0000ff","neutrals":[]}',
  fonts JSONB NOT NULL DEFAULT '{"heading":"sans-serif","body":"sans-serif","accent":null}',
  tone_of_voice TEXT NULL,
  brand_values TEXT[] NOT NULL DEFAULT '{}',
  tagline TEXT NULL,
  target_audience TEXT NULL,
  industry TEXT NULL,
  imagery_style TEXT NULL,
  reference_images TEXT[] NOT NULL DEFAULT '{}',
  raw_scrape JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scanning' CHECK (status IN ('scanning', 'ready', 'failed')),
  scan_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE public.brand_profiles ADD CONSTRAINT brand_profiles_founder_url_unique UNIQUE (founder_id, website_url);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS brand_profiles_founder_status_idx ON public.brand_profiles (founder_id, status);
CREATE INDEX IF NOT EXISTS brand_profiles_founder_business_idx ON public.brand_profiles (founder_id, business_key) WHERE business_key IS NOT NULL;
DROP TRIGGER IF EXISTS set_brand_profiles_updated_at ON public.brand_profiles;
CREATE TRIGGER set_brand_profiles_updated_at BEFORE UPDATE ON public.brand_profiles
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_profiles_select_own" ON public.brand_profiles;
CREATE POLICY "brand_profiles_select_own" ON public.brand_profiles FOR SELECT TO authenticated USING (founder_id = auth.uid());
DROP POLICY IF EXISTS "brand_profiles_insert_own" ON public.brand_profiles;
CREATE POLICY "brand_profiles_insert_own" ON public.brand_profiles FOR INSERT TO authenticated WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS "brand_profiles_update_own" ON public.brand_profiles;
CREATE POLICY "brand_profiles_update_own" ON public.brand_profiles FOR UPDATE TO authenticated USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS "brand_profiles_delete_own" ON public.brand_profiles;
CREATE POLICY "brand_profiles_delete_own" ON public.brand_profiles FOR DELETE TO authenticated USING (founder_id = auth.uid());
DROP POLICY IF EXISTS "brand_profiles_service_role" ON public.brand_profiles;
CREATE POLICY "brand_profiles_service_role" ON public.brand_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. campaign_assets  —  ⚠️ MOVED to 2026-06-18_campaigns_reconciliation.sql
-- ────────────────────────────────────────────────────────────────────────────
-- REMOVED from this apply. Verified 18/06/2026: prod's `campaigns` is ALSO a dead
-- workspace-era table (workspace_id-scoped, 0 rows) — same conflict as drip. The
-- founder-scoped campaigns + campaign_assets are created together in
-- 2026-06-18_campaigns_reconciliation.sql (gated rename). Creating campaign_assets
-- here would FK it to the WRONG (legacy workspace) campaigns. Apply this file first
-- (for brand_profiles), then the campaigns reconciliation.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- 4. email_triage_results
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.email_triage_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_email TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  subject TEXT,
  from_email TEXT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  priority INTEGER DEFAULT 3,
  reason TEXT,
  linear_issue_id TEXT,
  auto_applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (founder_id, account_email, thread_id)
);
CREATE INDEX IF NOT EXISTS idx_email_triage_founder ON public.email_triage_results(founder_id);
CREATE INDEX IF NOT EXISTS idx_email_triage_account ON public.email_triage_results(account_email);
CREATE INDEX IF NOT EXISTS idx_email_triage_created ON public.email_triage_results(created_at DESC);
ALTER TABLE public.email_triage_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder_only" ON public.email_triage_results;
CREATE POLICY "founder_only" ON public.email_triage_results USING (founder_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 5. ai_memories
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ai_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capability_id TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('fact', 'preference', 'outcome', 'pattern')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ai_memories_upsert_key ON public.ai_memories (founder_id, capability_id, key);
CREATE INDEX IF NOT EXISTS ai_memories_recall_idx ON public.ai_memories (founder_id, capability_id, memory_type, updated_at DESC);
CREATE OR REPLACE FUNCTION public.update_ai_memories_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS ai_memories_updated_at ON public.ai_memories;
CREATE TRIGGER ai_memories_updated_at BEFORE UPDATE ON public.ai_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_ai_memories_updated_at();
ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founders_own_memories" ON public.ai_memories;
CREATE POLICY "founders_own_memories" ON public.ai_memories FOR ALL TO authenticated USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS "service_role_full_access" ON public.ai_memories;
CREATE POLICY "service_role_full_access" ON public.ai_memories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. board_meetings / board_meeting_notes / ceo_decisions
--    (team_members ALREADY EXISTS on prod — excluded)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.board_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','acted','archived')),
  agenda jsonb NOT NULL DEFAULT '{}',
  brief_md text NOT NULL DEFAULT '',
  github_data jsonb DEFAULT '{}',
  linear_data jsonb DEFAULT '{}',
  xero_data jsonb DEFAULT '{}',
  metrics jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (founder_id, meeting_date)
);
CREATE TABLE IF NOT EXISTS public.board_meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.board_meetings(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ceo_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('strategic','budget','timeline','shipping','hiring')),
  rationale text,
  amount_aud numeric(12,2),
  deadline date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','decided','completed','cancelled')),
  business_key text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS board_meetings_founder_date_idx ON public.board_meetings (founder_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS board_meeting_notes_meeting_idx ON public.board_meeting_notes (meeting_id, created_at);
CREATE INDEX IF NOT EXISTS ceo_decisions_founder_status_idx ON public.ceo_decisions (founder_id, status, deadline);
ALTER TABLE public.board_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ceo_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "founder owns board_meetings" ON public.board_meetings;
CREATE POLICY "founder owns board_meetings" ON public.board_meetings FOR ALL USING (founder_id = auth.uid());
DROP POLICY IF EXISTS "founder owns board_meeting_notes" ON public.board_meeting_notes;
CREATE POLICY "founder owns board_meeting_notes" ON public.board_meeting_notes FOR ALL USING (meeting_id IN (SELECT id FROM public.board_meetings WHERE founder_id = auth.uid()));
DROP POLICY IF EXISTS "founder owns ceo_decisions" ON public.ceo_decisions;
CREATE POLICY "founder owns ceo_decisions" ON public.ceo_decisions FOR ALL USING (founder_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════════════
-- 7. video_jobs + syntax_publish_queue + get_video_pipeline_stats
-- ════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE TYPE video_job_status AS ENUM ('draft','scripting','audio_pending','assets_pending','video_pending','composing','queued','published','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE publish_platform AS ENUM ('youtube','facebook','linkedin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE publish_status AS ENUM ('pending','publishing','published','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL DEFAULT auth.uid(),
  source_note_id UUID REFERENCES public.knowledge_notes(id) ON DELETE SET NULL,
  project_key TEXT NOT NULL DEFAULT 'nexus',
  status video_job_status NOT NULL DEFAULT 'draft',
  script_text TEXT,
  script_json JSONB,
  script_approved BOOLEAN DEFAULT FALSE,
  audio_provider TEXT DEFAULT 'elevenlabs',
  audio_url TEXT,
  voice_id TEXT,
  asset_urls TEXT[],
  thumbnail_url TEXT,
  heygen_video_id TEXT,
  heygen_status TEXT,
  raw_video_url TEXT,
  final_video_url TEXT,
  subtitles_json JSONB,
  youtube_video_id TEXT,
  facebook_post_id TEXT,
  linkedin_post_id TEXT,
  published_at TIMESTAMPTZ,
  cost_cents INT DEFAULT 0,
  cost_breakdown JSONB DEFAULT '{}',
  title TEXT,
  description TEXT,
  tags TEXT[],
  target_duration_seconds INT DEFAULT 300,
  error_step TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_knowledge_project FOREIGN KEY (project_key) REFERENCES public.knowledge_projects(key) ON DELETE SET DEFAULT
);
CREATE INDEX IF NOT EXISTS idx_video_jobs_founder ON public.video_jobs(founder_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON public.video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_project ON public.video_jobs(project_key);
CREATE INDEX IF NOT EXISTS idx_video_jobs_note ON public.video_jobs(source_note_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created ON public.video_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.syntax_publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_job_id UUID NOT NULL REFERENCES public.video_jobs(id) ON DELETE CASCADE,
  founder_id UUID NOT NULL DEFAULT auth.uid(),
  platform publish_platform NOT NULL,
  scheduled_for TIMESTAMPTZ,
  status publish_status NOT NULL DEFAULT 'pending',
  platform_post_id TEXT,
  publish_response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_publish_queue_job ON public.syntax_publish_queue(video_job_id);
CREATE INDEX IF NOT EXISTS idx_publish_queue_status ON public.syntax_publish_queue(status);
CREATE INDEX IF NOT EXISTS idx_publish_queue_scheduled ON public.syntax_publish_queue(scheduled_for);

CREATE OR REPLACE FUNCTION public.update_video_jobs_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_video_jobs_updated_at ON public.video_jobs;
CREATE TRIGGER trg_video_jobs_updated_at BEFORE UPDATE ON public.video_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_video_jobs_updated_at();

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syntax_publish_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS video_jobs_select_own ON public.video_jobs;
CREATE POLICY video_jobs_select_own ON public.video_jobs FOR SELECT USING (founder_id = auth.uid());
DROP POLICY IF EXISTS video_jobs_insert_own ON public.video_jobs;
CREATE POLICY video_jobs_insert_own ON public.video_jobs FOR INSERT WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS video_jobs_update_own ON public.video_jobs;
CREATE POLICY video_jobs_update_own ON public.video_jobs FOR UPDATE USING (founder_id = auth.uid());
DROP POLICY IF EXISTS video_jobs_delete_own ON public.video_jobs;
CREATE POLICY video_jobs_delete_own ON public.video_jobs FOR DELETE USING (founder_id = auth.uid());
DROP POLICY IF EXISTS publish_queue_select_own ON public.syntax_publish_queue;
CREATE POLICY publish_queue_select_own ON public.syntax_publish_queue FOR SELECT USING (founder_id = auth.uid());
DROP POLICY IF EXISTS publish_queue_insert_own ON public.syntax_publish_queue;
CREATE POLICY publish_queue_insert_own ON public.syntax_publish_queue FOR INSERT WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS publish_queue_update_own ON public.syntax_publish_queue;
CREATE POLICY publish_queue_update_own ON public.syntax_publish_queue FOR UPDATE USING (founder_id = auth.uid());

-- Reproduced verbatim from 20260603000001_video_jobs_schema.sql. NOTE: the original
-- references an undefined `cnt` in by_status, so it errors at call time — the
-- pi-ceo-weekly-review cron already wraps the rpc call in `.catch(() => ({data:null}))`.
-- Left as-is to match the repo migration; fix separately if by_status is needed.
CREATE OR REPLACE FUNCTION public.get_video_pipeline_stats(p_founder_id UUID)
RETURNS JSONB AS $$
DECLARE result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_jobs', COUNT(*),
    'by_status', jsonb_object_agg(status, cnt),
    'total_cost_cents', COALESCE(SUM(cost_cents), 0),
    'avg_cost_cents', COALESCE(AVG(cost_cents), 0)::INT,
    'published_this_week', COUNT(*) FILTER (WHERE status = 'published' AND published_at > NOW() - INTERVAL '7 days'),
    'failed_this_week', COUNT(*) FILTER (WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '7 days')
  ) INTO result
  FROM public.video_jobs
  WHERE founder_id = p_founder_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- knowledge_notes.video_job_id link (guarded)
DO $$ BEGIN
  ALTER TABLE public.knowledge_notes ADD COLUMN video_job_id UUID;
  ALTER TABLE public.knowledge_notes ADD CONSTRAINT fk_knowledge_notes_video_job FOREIGN KEY (video_job_id) REFERENCES public.video_jobs(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. drip_steps / drip_enrollments / drip_events  —  ⚠️ EXCLUDED (schema conflict)
-- ────────────────────────────────────────────────────────────────────────────
-- BLOCKED, do NOT apply here. Verified 18/06/2026: prod's existing `drip_campaigns`
-- (from legacy migration 008) has NO `founder_id` column, but
-- drip_lifecycle_schema.sql expects a `drip_campaigns(id, founder_id)` composite
-- key for the child FKs. The two `drip_campaigns` are incompatible schemas sharing
-- a name. Applying the drip block would fail (ADD CONSTRAINT on a missing column /
-- FK to a non-existent composite key).
--
-- RESOLUTION (separate task, needs a decision): reconcile the legacy drip_campaigns
-- with the repo model — either migrate/rename the legacy table and add founder_id,
-- or repoint drip_lifecycle_schema.sql at the legacy schema. The `contacts(id,
-- founder_id)` composite key the drip FKs also need is likewise deferred to that task.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- 9. weekly_reviews
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_period_start DATE NOT NULL,
  headline TEXT NOT NULL,
  brief_md TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  decisions_queue JSONB NOT NULL DEFAULT '[]',
  next_priorities JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(founder_id, review_period_start)
);
CREATE INDEX IF NOT EXISTS weekly_reviews_founder_period_idx ON public.weekly_reviews(founder_id, review_period_start DESC);
ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS weekly_reviews_select ON public.weekly_reviews;
CREATE POLICY weekly_reviews_select ON public.weekly_reviews FOR SELECT USING (founder_id = auth.uid());
DROP POLICY IF EXISTS weekly_reviews_insert ON public.weekly_reviews;
CREATE POLICY weekly_reviews_insert ON public.weekly_reviews FOR INSERT WITH CHECK (founder_id = auth.uid());
DROP POLICY IF EXISTS weekly_reviews_update ON public.weekly_reviews;
CREATE POLICY weekly_reviews_update ON public.weekly_reviews FOR UPDATE USING (founder_id = auth.uid()) WITH CHECK (founder_id = auth.uid());
CREATE OR REPLACE FUNCTION public.weekly_reviews_update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS weekly_reviews_updated_at ON public.weekly_reviews;
CREATE TRIGGER weekly_reviews_updated_at BEFORE UPDATE ON public.weekly_reviews
  FOR EACH ROW EXECUTE FUNCTION public.weekly_reviews_update_updated_at();

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION — all should return a non-null regclass
-- ════════════════════════════════════════════════════════════════════════════
SELECT
  to_regclass('public.user_settings')        AS user_settings,
  to_regclass('public.brand_profiles')       AS brand_profiles,
  to_regclass('public.email_triage_results') AS email_triage_results,
  to_regclass('public.ai_memories')          AS ai_memories,
  to_regclass('public.board_meetings')       AS board_meetings,
  to_regclass('public.board_meeting_notes')  AS board_meeting_notes,
  to_regclass('public.ceo_decisions')        AS ceo_decisions,
  to_regclass('public.video_jobs')           AS video_jobs,
  to_regclass('public.syntax_publish_queue') AS syntax_publish_queue,
  to_regclass('public.weekly_reviews')       AS weekly_reviews;
-- (drip_steps / drip_enrollments / drip_events intentionally excluded — see §8)
