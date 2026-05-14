-- PR-triggered Proof Video pipeline — queue + audit ledger.
--
-- When a PR is merged to main on a Unite-Group-managed client repo (e.g.
-- cleanexpo/ccw-crm, cleanexpo/dimitri-itr) AND the PR carries the
-- `client-visible=true` label, the GitHub webhook receiver at
-- /api/webhooks/github builds a `production_brief.json` matching the
-- video-director SKILL.md schema and inserts a row here.
--
-- The Pi-CEO swarm worker (~/Pi-CEO/Pi-Dev-Ops/swarm/inbox/video_orchestrator.py)
-- drains pending rows and dispatches the Video Agency pipeline via Claude
-- Code skills. On completion, fills delivered_video_url + delivered_at.

CREATE TABLE IF NOT EXISTS public.video_production_queue (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What triggered it
  trigger              TEXT NOT NULL CHECK (trigger IN ('pr-merge','manual','cron-weekly','cron-monthly')),
  source_repo          TEXT,                              -- e.g. 'cleanexpo/ccw-crm'
  source_pr_number     INT,
  source_pr_url        TEXT,
  source_pr_title      TEXT,
  source_linear_issue  TEXT,                              -- e.g. 'UNI-4180'
  source_preview_url   TEXT,                              -- Vercel preview URL

  -- Routing context
  client_slug          TEXT NOT NULL,                     -- 'dimitri-itr', 'ccw', 'bulcs-holdings', etc.
  brand_slug           TEXT NOT NULL,                     -- BrandConfig slug (drives LUT + voice + tokens)
  composition_type     TEXT NOT NULL DEFAULT 'social-hook'
                         CHECK (composition_type IN ('talking-head','b-roll-cinematic','product-demo',
                                                     'testimonial','case-study','social-hook',
                                                     'weekly-proof','day14-demo-reel')),
  channel              TEXT NOT NULL DEFAULT 'portal-embed',
  duration_seconds     INT NOT NULL DEFAULT 60,

  -- The full video-director brief (schema mirrors video-director SKILL.md)
  production_brief     JSONB NOT NULL,

  -- Lifecycle
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','dispatched','rendering','qa','delivered','failed','skipped')),
  current_phase        TEXT,                              -- 'pre-production' / 'production' / 'post-production' / 'qa-delivery'
  ratchet_count        INT NOT NULL DEFAULT 0,            -- brand-guardian FAIL → bounce count

  -- Delivery
  delivered_video_url  TEXT,
  delivered_at         TIMESTAMPTZ,
  delivery_channels    JSONB DEFAULT '[]'::jsonb,         -- which channels we shipped to

  -- Audit
  processing_error     TEXT,
  metadata             JSONB DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_production_queue_pending_idx
  ON public.video_production_queue(status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS video_production_queue_client_idx
  ON public.video_production_queue(client_slug, created_at DESC);

ALTER TABLE public.video_production_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS video_production_queue_service_all ON public.video_production_queue;
CREATE POLICY video_production_queue_service_all ON public.video_production_queue
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS video_production_queue_phill_admin_select ON public.video_production_queue;
CREATE POLICY video_production_queue_phill_admin_select ON public.video_production_queue
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email IN ('contact@unite-group.in','phill.mcgurk@gmail.com')
  ));

CREATE OR REPLACE FUNCTION public.video_production_queue_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS 'BEGIN NEW.updated_at = NOW(); RETURN NEW; END;';

DROP TRIGGER IF EXISTS video_production_queue_set_updated_at ON public.video_production_queue;
CREATE TRIGGER video_production_queue_set_updated_at
  BEFORE UPDATE ON public.video_production_queue
  FOR EACH ROW EXECUTE FUNCTION public.video_production_queue_touch_updated_at();
