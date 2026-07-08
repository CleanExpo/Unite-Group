-- dashboard_health — cloud substrate for the founder OS Health tile (UNI-2229,
-- first cloud-persistence slice of UNI-2340).
--
-- The tile previously read `~/2nd-brain/.agentic_nexus/dashboard/latest_*.json`
-- from the LOCAL filesystem — permanently empty on Vercel serverless. Cron/mesh
-- writers now upsert one row per source here via service_role; the deck reads
-- with the user-scoped client (authenticated read policy below).
--
-- Row contract mirrors the tile's DashboardSummary: id/title/status/severity,
-- with reported_at driving the staleness disclosure (an old row renders as
-- "stale", never silently green).

CREATE TABLE IF NOT EXISTS public.dashboard_health (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  status      text NOT NULL,
  severity    text NOT NULL DEFAULT 'unknown',
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  reported_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_health_read_authenticated ON public.dashboard_health;
CREATE POLICY dashboard_health_read_authenticated ON public.dashboard_health
  FOR SELECT TO authenticated USING (true);
-- Writers use service_role (bypasses RLS); no user write policy by design.
