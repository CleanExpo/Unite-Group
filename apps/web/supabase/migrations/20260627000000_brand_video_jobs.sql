-- brand_video_jobs — Brand Video Studio work queue (owner-scoped).
--
-- The Brand Video Studio dashboard POSTs a job (brand + style + topic + count);
-- the out-of-band worker (apps/web/scripts/brand-video-worker.mjs) claims queued
-- rows, runs the /brand-video pipeline (ElevenLabs TTS -> per-beat image ->
-- ffmpeg stitch) and writes back status + output_url.
--
-- Owner-scoped RLS mirrors founder_notifications: the owner reads/inserts their
-- own rows; the worker uses service_role.

CREATE TABLE IF NOT EXISTS public.brand_video_jobs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand       TEXT        NOT NULL,
  style       TEXT        NOT NULL DEFAULT 'flat-line',
  topic       TEXT        NOT NULL,
  count       INT         NOT NULL DEFAULT 1,
  status      TEXT        NOT NULL DEFAULT 'queued'
                          CHECK (status IN ('queued', 'processing', 'done', 'failed', 'needs_local_render')),
  output_url  TEXT,
  error       TEXT,
  created_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dashboard list ("my recent jobs, newest first") + worker claim ("oldest queued").
CREATE INDEX IF NOT EXISTS idx_brand_video_jobs_owner_created
  ON public.brand_video_jobs (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brand_video_jobs_status_created
  ON public.brand_video_jobs (status, created_at);

-- Auto-touch updated_at on every UPDATE so status transitions get a timestamp.
CREATE OR REPLACE FUNCTION public.brand_video_jobs_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brand_video_jobs_touch_updated_at ON public.brand_video_jobs;
CREATE TRIGGER brand_video_jobs_touch_updated_at
  BEFORE UPDATE ON public.brand_video_jobs
  FOR EACH ROW EXECUTE FUNCTION public.brand_video_jobs_touch_updated_at();

ALTER TABLE public.brand_video_jobs ENABLE ROW LEVEL SECURITY;

-- Postgres has no CREATE POLICY IF NOT EXISTS — drop first for idempotency.

-- Owner reads only their own jobs.
DROP POLICY IF EXISTS "brand_video_jobs_owner_select" ON public.brand_video_jobs;
CREATE POLICY "brand_video_jobs_owner_select" ON public.brand_video_jobs
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- Owner may only create rows owned by themselves.
DROP POLICY IF EXISTS "brand_video_jobs_owner_insert" ON public.brand_video_jobs;
CREATE POLICY "brand_video_jobs_owner_insert" ON public.brand_video_jobs
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- The worker (and other server-side generators) uses service_role for full access.
DROP POLICY IF EXISTS "brand_video_jobs_service_role" ON public.brand_video_jobs;
CREATE POLICY "brand_video_jobs_service_role" ON public.brand_video_jobs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.brand_video_jobs IS
  'Brand Video Studio work queue. One row per dashboard generation request; the brand-video worker claims queued rows and writes back status + output_url. Owner-scoped read/insert; worker uses service_role.';
COMMENT ON COLUMN public.brand_video_jobs.style IS
  'A look key from .claude/skills/brand-video/styles.json (flat-line, hand-doodle, bold-kinetic, cinematic-photoreal, minimal-corporate, retro-print).';
COMMENT ON COLUMN public.brand_video_jobs.status IS
  'queued -> processing -> done | failed | needs_local_render. needs_local_render means the per-beat image step requires the local margot MCP (no server-side IMAGE_API_URL configured).';
